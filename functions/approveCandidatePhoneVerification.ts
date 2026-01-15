import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Invalid Request</h1>
          <p>Verification token is missing.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      });
    }

    // Find candidate with this verification token
    const candidates = await base44.asServiceRole.entities.Candidate.filter({});
    
    let targetCandidate = null;
    let targetVerification = null;

    for (const candidate of candidates) {
      if (!candidate.employment_verifications) continue;
      
      const verification = candidate.employment_verifications.find(
        v => v.verification_token === token && v.verification_type === 'phone'
      );
      
      if (verification) {
        targetCandidate = candidate;
        targetVerification = verification;
        break;
      }
    }

    if (!targetCandidate || !targetVerification) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Not Found</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Verification Not Found</h1>
          <p>This verification request does not exist or has expired.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 404
      });
    }

    if (targetVerification.candidate_approved) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Already Approved</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>✓ Already Approved</h1>
          <p>You have already approved this verification request.</p>
          <p>The AI agent has been scheduled to call the employer.</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Update verification status
    const updatedVerifications = targetCandidate.employment_verifications.map(v => 
      v.verification_token === token
        ? {
            ...v,
            candidate_approved: true,
            candidate_approved_at: new Date().toISOString(),
            status: 'pending_company'
          }
        : v
    );

    await base44.asServiceRole.entities.Candidate.update(targetCandidate.id, {
      employment_verifications: updatedVerifications
    });

    // Initiate VAPI call
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    const vapiAssistantId = Deno.env.get('VAPI_ASSISTANT_ID');

    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: vapiAssistantId,
        customer: {
          number: targetVerification.company_phone
        },
        assistantOverrides: {
          variableValues: {
            candidate_name: targetCandidate.name,
            company_name: targetVerification.company_name
          },
          firstMessage: `Hello, I'm calling from Indexios Resume Verification Platform. We're conducting an employment verification for ${targetCandidate.name}. Can you confirm whether ${targetCandidate.name} was employed at ${targetVerification.company_name}?`
        },
        metadata: {
          verification_token: token,
          candidate_id: targetCandidate.id,
          candidate_name: targetCandidate.name,
          company_name: targetVerification.company_name
        }
      })
    });

    const vapiData = await vapiResponse.json();
    console.log(`✅ VAPI call initiated for ${targetCandidate.name} at ${targetVerification.company_name}`, vapiData);

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Approved</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a0a0a; color: white; }
          .container { max-width: 600px; margin: 50px auto; padding: 40px; background: #1a1a1a; border-radius: 12px; text-align: center; }
          h1 { color: #10b981; margin-bottom: 20px; }
          p { line-height: 1.6; color: #d1d5db; }
          .success-icon { font-size: 60px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">📞</div>
          <h1>Phone Verification Approved!</h1>
          <p>Thank you for approving this verification request.</p>
          <p>Our AI agent will call <strong>${targetVerification.company_name}</strong> at <strong>${targetVerification.company_phone}</strong> to verify your employment.</p>
          <p>You will be notified once the call is complete.</p>
          <br>
          <p style="font-size: 14px; color: #9ca3af;">You can safely close this window.</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[approveCandidatePhoneVerification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});