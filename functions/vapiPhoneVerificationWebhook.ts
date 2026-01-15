import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    console.log('[VAPI Webhook] Received:', JSON.stringify(payload, null, 2));

    // Handle call ended event
    if (payload.message?.type === 'end-of-call-report') {
      const metadata = payload.message.call?.metadata;
      const transcript = payload.message.transcript || '';
      const verificationToken = metadata?.verification_token;

      if (!verificationToken) {
        console.error('[VAPI Webhook] No verification token in metadata');
        return Response.json({ error: 'No verification token' }, { status: 400 });
      }

      // Find candidate with this verification token
      const candidates = await base44.asServiceRole.entities.Candidate.filter({});
      
      let targetCandidate = null;
      let targetVerification = null;

      for (const candidate of candidates) {
        if (!candidate.employment_verifications) continue;
        
        const verification = candidate.employment_verifications.find(
          v => v.verification_token === verificationToken
        );
        
        if (verification) {
          targetCandidate = candidate;
          targetVerification = verification;
          break;
        }
      }

      if (!targetCandidate || !targetVerification) {
        console.error('[VAPI Webhook] Verification not found for token:', verificationToken);
        return Response.json({ error: 'Verification not found' }, { status: 404 });
      }

      // Analyze transcript with LLM to determine response
      const analysisPrompt = `Analyze this employment verification phone call transcript and determine the company's response.

Transcript:
${transcript}

Determine if the company:
- Confirmed employment (yes)
- Denied employment (no)
- Refused to confirm due to policy (will_not_confirm)
- Could not verify or provided unclear response (unverifiable)

Return ONLY one of these exact values: "yes", "no", "will_not_confirm", or "unverifiable"`;

      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            response: { 
              type: "string",
              enum: ["yes", "no", "will_not_confirm", "unverifiable"]
            },
            reasoning: { type: "string" }
          }
        }
      });

      const companyResponse = analysis.response || 'unverifiable';

      // Update verification with call results
      const updatedVerifications = targetCandidate.employment_verifications.map(v => 
        v.verification_token === verificationToken
          ? {
              ...v,
              company_response: companyResponse,
              company_responded_at: new Date().toISOString(),
              status: 'completed',
              call_transcript: transcript,
              call_analysis: analysis.reasoning
            }
          : v
      );

      await base44.asServiceRole.entities.Candidate.update(targetCandidate.id, {
        employment_verifications: updatedVerifications
      });

      // Send notification email to requester
      const responseLabels = {
        yes: 'CONFIRMED - Employment Verified via Phone',
        no: 'NOT EMPLOYED - No Record Found via Phone',
        will_not_confirm: 'WILL NOT CONFIRM - Policy Restriction (Phone)',
        unverifiable: 'UNVERIFIABLE - Unclear Response (Phone)'
      };

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: targetVerification.requester_email,
        subject: `Phone Verification Complete: ${targetCandidate.name} at ${targetVerification.company_name}`,
        body: `Employment phone verification completed for ${targetCandidate.name}:

Company: ${targetVerification.company_name}
Phone: ${targetVerification.company_phone}
Status: ${responseLabels[companyResponse]}

Analysis: ${analysis.reasoning}

Log in to Indexios to view the full verification details and call transcript.

---
Indexios Resume Verification Platform
https://indexios.me`
      });

      console.log(`✅ VAPI call processed: ${companyResponse} for ${targetCandidate.name} at ${targetVerification.company_name}`);

      return Response.json({ success: true, response: companyResponse });
    }

    return Response.json({ success: true, message: 'Webhook received' });

  } catch (error) {
    console.error('[VAPI Webhook] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});