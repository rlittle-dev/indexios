import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tier access
    const userTier = user.subscription_tier || 'free';
    if (userTier !== 'professional' && userTier !== 'enterprise') {
      return Response.json({ 
        error: 'Phone verification requires Professional or Enterprise plan' 
      }, { status: 403 });
    }

    const { phoneNumber, companyName, candidateName, uniqueCandidateId } = await req.json();

    if (!phoneNumber || !companyName || !candidateName) {
      return Response.json({ 
        error: 'Missing required fields: phoneNumber, companyName, candidateName' 
      }, { status: 400 });
    }

    console.log(`[VapiCall] Initiating call to ${phoneNumber} for ${candidateName} at ${companyName}`);

    // Create outbound call via VAPI
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: phoneNumber,
        customer: {
          number: phoneNumber
        },
        assistantOverrides: {
          variableValues: {
            candidateName: candidateName,
            companyName: companyName
          },
          firstMessage: `Hello, I'm calling to verify employment for ${candidateName}. Can you confirm if they were employed at ${companyName}?`
        }
      })
    });

    const callData = await response.json();

    if (!response.ok) {
      console.error('[VapiCall] VAPI error:', callData);
      return Response.json({ 
        error: 'Failed to initiate call',
        details: callData 
      }, { status: 500 });
    }

    console.log(`[VapiCall] Call initiated: ${callData.id}`);

    return Response.json({
      success: true,
      callId: callData.id,
      status: 'initiated',
      message: 'Call initiated successfully. Results will be available shortly.'
    });

  } catch (error) {
    console.error('[VapiCall] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});