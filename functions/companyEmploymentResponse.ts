import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const response = url.searchParams.get('response');

    const validResponses = ['yes', 'no', 'will_not_confirm', 'unverifiable'];

    if (!token || !response || !validResponses.includes(response)) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Invalid Request</h1>
          <p>Missing or invalid parameters.</p>
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
        v => v.verification_token === token
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

    if (targetVerification.company_response !== 'pending') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Already Responded</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Response Already Recorded</h1>
          <p>You have already responded to this verification request.</p>
          <p>Previous response: <strong>${targetVerification.company_response}</strong></p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Update verification with company response
    const updatedVerifications = targetCandidate.employment_verifications.map(v => 
      v.verification_token === token
        ? {
            ...v,
            company_response: response,
            company_responded_at: new Date().toISOString(),
            status: 'completed'
          }
        : v
    );

    await base44.asServiceRole.entities.Candidate.update(targetCandidate.id, {
      employment_verifications: updatedVerifications
    });

    // Send notification email to requester
    const responseLabels = {
      yes: 'CONFIRMED - Employment Verified',
      no: 'NOT EMPLOYED - No Record Found',
      will_not_confirm: 'WILL NOT CONFIRM - Policy Restriction',
      unverifiable: 'UNVERIFIABLE - Cannot Verify'
    };

    await base44.integrations.Core.SendEmail({
      to: targetVerification.requester_email,
      subject: `Employment Verification Response: ${targetCandidate.name} at ${targetVerification.company_name}`,
      body: `Employment verification update for ${targetCandidate.name}:

Company: ${targetVerification.company_name}
Status: ${responseLabels[response]}

Log in to Indexios to view the full verification details.

---
Indexios Resume Verification Platform
https://indexios.me`
    });

    console.log(`✅ Company response recorded: ${response} for ${targetCandidate.name} at ${targetVerification.company_name}`);

    const responseMessages = {
      yes: {
        icon: '✓',
        title: 'Employment Confirmed',
        message: `Thank you for confirming that ${targetCandidate.name} was employed at your organization.`,
        color: '#10b981'
      },
      no: {
        icon: '✗',
        title: 'No Employment Record',
        message: `Thank you for confirming that ${targetCandidate.name} was not employed at your organization.`,
        color: '#ef4444'
      },
      will_not_confirm: {
        icon: '⚠',
        title: 'Cannot Confirm - Policy',
        message: 'Thank you for your response. We understand your policy restrictions.',
        color: '#f59e0b'
      },
      unverifiable: {
        icon: '?',
        title: 'Unable to Verify',
        message: 'Thank you for letting us know this employment cannot be verified.',
        color: '#6b7280'
      }
    };

    const responseData = responseMessages[response];

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Response Recorded</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a0a0a; color: white; }
          .container { max-width: 600px; margin: 50px auto; padding: 40px; background: #1a1a1a; border-radius: 12px; text-align: center; }
          h1 { color: ${responseData.color}; margin-bottom: 20px; }
          p { line-height: 1.6; color: #d1d5db; }
          .icon { font-size: 60px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${responseData.icon}</div>
          <h1>${responseData.title}</h1>
          <p>${responseData.message}</p>
          <p>The requester has been notified of your response.</p>
          <br>
          <p style="font-size: 14px; color: #9ca3af;">You can safely close this window.</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[companyEmploymentResponse] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});