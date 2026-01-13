import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const verificationId = url.pathname.split('/')[3];

    if (!verificationId) {
      return Response.json({ error: 'Missing verification ID' }, { status: 400 });
    }

    // Get verification
    const verification = await base44.asServiceRole.entities.Verification.filter({ id: verificationId });
    
    if (verification.length === 0) {
      return Response.json({ error: 'Verification not found' }, { status: 404 });
    }

    const verif = verification[0];

    // Check status
    if (verif.status !== 'CONSENT_APPROVED') {
      return Response.json({ error: 'Consent not approved' }, { status: 400 });
    }

    // Get Vapi credentials
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    const assistantId = Deno.env.get('VAPI_ASSISTANT_ID');

    if (!vapiApiKey || !assistantId) {
      return Response.json({ error: 'Vapi credentials not configured' }, { status: 500 });
    }

    // Make Vapi call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: assistantId,
        phoneNumberId: null, // Use default
        customer: {
          number: verif.companyPhone
        },
        assistantOverrides: {
          variableValues: {
            candidateName: verif.candidateName,
            companyName: verif.companyName,
            jobTitle: verif.jobTitle || 'an employee',
            verificationId: verif.id
          }
        }
      })
    });

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text();
      console.error('Vapi error:', error);
      return Response.json({ error: 'Failed to start call' }, { status: 500 });
    }

    const vapiData = await vapiResponse.json();

    // Create call record
    const call = await base44.asServiceRole.entities.Call.create({
      verificationId: verif.id,
      provider: 'vapi',
      vapiCallId: vapiData.id,
      toPhone: verif.companyPhone,
      status: 'STARTED',
      startedAt: new Date().toISOString()
    });

    // Update verification status
    await base44.asServiceRole.entities.Verification.update(verif.id, {
      status: 'CALL_IN_PROGRESS'
    });

    return Response.json({ 
      success: true, 
      callId: call.id,
      vapiCallId: vapiData.id 
    });
  } catch (error) {
    console.error('Start call error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});