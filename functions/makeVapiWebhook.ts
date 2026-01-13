import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Verify Make webhook secret
    const makeSecret = req.headers.get('x-make-secret');
    const expectedSecret = Deno.env.get('MAKE_WEBHOOK_SECRET');

    if (!makeSecret || makeSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('Make webhook payload:', JSON.stringify(payload, null, 2));

    // Extract data from Vapi webhook payload
    const { message, call } = payload;

    if (!call || !call.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Find call by vapiCallId
    const calls = await base44.asServiceRole.entities.Call.filter({ vapiCallId: call.id });
    
    if (calls.length === 0) {
      console.log('Call not found for vapiCallId:', call.id);
      return Response.json({ success: true, message: 'Call not found, ignoring' });
    }

    const callRecord = calls[0];

    // Handle different message types
    if (message?.type === 'end-of-call-report') {
      // Call ended - process result
      const transcript = message.transcript || call.transcript || '';
      const recordingUrl = call.recordingUrl || message.recordingUrl || '';
      const analysis = message.analysis || {};
      const structuredData = analysis.structuredData || {};

      // Determine result from structured data or transcript
      let result = null;
      let failureReason = null;

      // Check if DTMF was captured
      if (structuredData.dtmf_response === '1' || structuredData.verification_result === 'YES') {
        result = 'YES';
      } else if (structuredData.dtmf_response === '2' || structuredData.verification_result === 'NO') {
        result = 'NO';
        failureReason = structuredData.failure_reason || 'REFUSED';
      } else {
        // Analyze transcript with LLM
        const transcriptAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this employment verification call transcript and determine if employment was CONFIRMED.

Transcript:
${transcript}

Rules:
- Return YES ONLY if there is EXPLICIT, UNAMBIGUOUS confirmation that the candidate IS CURRENTLY EMPLOYED
- Return NO for ANY of: refusal to verify, uncertain response, cannot confirm, not authorized to share info, no answer, voicemail, hung up, gatekept, wrong department, after hours, or any ambiguity
- If the transcript mentions "press 1 for yes" or "press 2 for no" but no response was captured, return NO with reason UNCLEAR

Return your analysis.`,
          response_json_schema: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['YES', 'NO'] },
              failure_reason: { type: 'string', enum: ['REFUSED', 'UNCLEAR', 'NO_ANSWER', 'VOICEMAIL', 'GATEKEPT', 'WRONG_DEPT', 'HUNG_UP', 'AFTER_HOURS', 'OTHER'] },
              reasoning: { type: 'string' }
            }
          }
        });

        result = transcriptAnalysis.result;
        if (result === 'NO') {
          failureReason = transcriptAnalysis.failure_reason || 'UNCLEAR';
        }
      }

      // Update call record
      await base44.asServiceRole.entities.Call.update(callRecord.id, {
        status: 'ENDED',
        result,
        failureReason,
        transcript,
        recordingUrl,
        endedAt: new Date().toISOString()
      });

      // Get verification
      const verification = await base44.asServiceRole.entities.Verification.filter({ id: callRecord.verificationId });
      const verif = verification[0];

      if (result === 'YES') {
        // Success - mark verification complete
        await base44.asServiceRole.entities.Verification.update(verif.id, {
          status: 'COMPLETED',
          finalResult: 'YES',
          finalReason: 'PHONE_YES'
        });
      } else {
        // Failed - mark phone completed and trigger email fallback
        await base44.asServiceRole.entities.Verification.update(verif.id, {
          status: 'PHONE_COMPLETED'
        });

        // Trigger employer email if employer email is provided
        if (verif.employerEmail) {
          const origin = req.headers.get('origin') || 'https://your-domain.com';
          await fetch(`${origin}/api/verifications/${verif.id}/employer-email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ internal: true })
          });
        } else {
          // No employer email - mark as final NO
          await base44.asServiceRole.entities.Verification.update(verif.id, {
            status: 'COMPLETED',
            finalResult: 'NO',
            finalReason: `PHONE_${failureReason}`
          });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Make webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});