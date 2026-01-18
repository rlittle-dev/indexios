import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID');
const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');

console.log('[VapiCall] Has API key:', !!VAPI_API_KEY);
console.log('[VapiCall] Has assistant ID:', !!VAPI_ASSISTANT_ID);
console.log('[VapiCall] Has phone ID:', !!VAPI_PHONE_NUMBER_ID);


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

    if (!companyName || !candidateName) {
      return Response.json({ 
        error: 'Missing required fields: companyName, candidateName' 
      }, { status: 400 });
    }

    // Determine the phone number to call - use provided or fetch from UniqueCandidate
    let hrPhoneNumber = phoneNumber;

    if (!hrPhoneNumber && uniqueCandidateId) {
      // Fetch phone number from UniqueCandidate employers
      try {
        const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
        if (candidates && candidates.length > 0) {
          const candidate = candidates[0];
          const employer = candidate.employers?.find(e => 
            e.employer_name?.toLowerCase().trim() === companyName.toLowerCase().trim()
          );
          if (employer?.hr_phone?.number) {
            hrPhoneNumber = employer.hr_phone.number;
            console.log(`[VapiCall] Found phone from UniqueCandidate: ${hrPhoneNumber}`);
          }
        }
      } catch (fetchError) {
        console.error('[VapiCall] Error fetching UniqueCandidate:', fetchError.message);
      }
    }

    if (!hrPhoneNumber) {
      return Response.json({ 
        error: 'No HR phone number available for this company' 
      }, { status: 400 });
    }

    // Normalize phone number to E.164 format
    let normalized = String(hrPhoneNumber).replace(/[^\d+]/g, '').trim();
    
    // If no + prefix, assume US number and add +1
    if (!normalized.startsWith('+')) {
      // Remove leading 1 if present (e.g., 12035551212 -> 2035551212)
      if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = normalized.substring(1);
      }
      // Add +1 for US numbers
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    // Validate E.164 format
    if (normalized.length < 11 || normalized.length > 15) {
      console.error(`[VapiCall] Invalid phone format: ${hrPhoneNumber} -> ${normalized}`);
      return Response.json({ 
        error: `Invalid HR phone number format. Got "${hrPhoneNumber}", needs E.164 format like +12035551212.` 
      }, { status: 400 });
    }

    hrPhoneNumber = normalized;
    console.log(`[VapiCall] Initiating call to ${hrPhoneNumber} for ${candidateName} at ${companyName}`);

    // Validate Vapi configuration
    if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
      console.error('[VapiCall] Missing Vapi configuration');
      return Response.json({ 
        error: 'Vapi not configured properly' 
      }, { status: 500 });
    }

    // Create outbound call via VAPI
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: hrPhoneNumber  // This is the company's HR phone number to dial
        },
        assistantOverrides: {
          variableValues: {
            candidateName: candidateName,
            companyName: companyName,
            uniqueCandidateId: uniqueCandidateId || ''
          },
          firstMessage: `Hello, I'm calling to verify employment for ${candidateName}. Can you confirm if they were employed at ${companyName}?`
        }
      })
    });

    const callData = await response.json();

    if (!response.ok) {
      console.error('[VapiCall] VAPI error:', JSON.stringify(callData, null, 2));
      console.error('[VapiCall] Request details:', {
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        assistantId: VAPI_ASSISTANT_ID,
        customerNumber: hrPhoneNumber,
        candidateName,
        companyName,
        uniqueCandidateId
      });
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
    console.error('[VapiCall] Caught error:', error);
    console.error('[VapiCall] Error stack:', error.stack);
    console.error('[VapiCall] Error name:', error.name);
    return Response.json({ error: error.message }, { status: 500 });
  }
});