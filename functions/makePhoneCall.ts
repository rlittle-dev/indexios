import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Make phone call using VAPI to verify employment
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { verificationId, phoneNumber, candidateName, companyName, jobTitle } = await req.json();

    if (!verificationId || !phoneNumber || !candidateName || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');

    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
      return Response.json({ error: 'VAPI credentials not configured' }, { status: 500 });
    }

    console.log(`[PhoneCall] Calling ${phoneNumber} for ${candidateName} at ${companyName}`);

    // Create VAPI call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: null, // Use default
        customer: {
          number: phoneNumber
        },
        assistantOverrides: {
          variableValues: {
            candidateName,
            companyName,
            jobTitle: jobTitle || 'employee'
          },
          firstMessage: `Hello, I'm calling from an employment verification service. I need to verify that ${candidateName} ${jobTitle ? `worked as ${jobTitle}` : 'was employed'} at ${companyName}. Can you help me with this verification?`
        }
      })
    });

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text();
      console.error('[PhoneCall] VAPI error:', error);
      return Response.json({ error: 'Phone call failed', details: error }, { status: 500 });
    }

    const callData = await vapiResponse.json();
    console.log(`[PhoneCall] VAPI call created: ${callData.id}`);

    // Store call ID in verification
    await base44.asServiceRole.entities.Verification.update(verificationId, {
      phone_call_data: {
        call_id: callData.id,
        result: 'PENDING'
      }
    });

    // Poll for call completion (simplified - in production use webhooks)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    let finalResult = 'INCONCLUSIVE';

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://api.vapi.ai/call/${callData.id}`, {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`
        }
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();

        if (status.status === 'ended') {
          // Analyze transcript
          const transcript = status.transcript || '';
          
          // Simple keyword analysis (in production, use LLM)
          if (transcript.toLowerCase().includes('yes') || transcript.toLowerCase().includes('confirm') || transcript.toLowerCase().includes('verified')) {
            finalResult = 'YES';
          } else if (transcript.toLowerCase().includes('no') || transcript.toLowerCase().includes('never') || transcript.toLowerCase().includes('not employed')) {
            finalResult = 'NO';
          } else {
            finalResult = 'INCONCLUSIVE';
          }

          // Update verification with call result
          await base44.asServiceRole.entities.Verification.update(verificationId, {
            phone_call_data: {
              call_id: callData.id,
              transcript: transcript,
              result: finalResult,
              duration_seconds: status.duration || 0
            }
          });

          break;
        }
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      finalResult = 'NO_ANSWER';
    }

    return Response.json({
      success: true,
      call_id: callData.id,
      result: finalResult
    });

  } catch (error) {
    console.error('[PhoneCall] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});