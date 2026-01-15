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

    if (targetVerification.candidate_approved) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Already Approved</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>✓ Already Approved</h1>
          <p>You have already approved this verification request.</p>
          <p>The employer has been contacted.</p>
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

    // Send email to company
    const companyResponseUrl = `${new URL(req.url).origin}/api/functions/companyEmploymentResponse?token=${token}`;
    
    await base44.integrations.Core.SendEmail({
      to: targetVerification.company_email,
      subject: `Employment Verification Request for ${targetCandidate.name}`,
      body: `Dear ${targetVerification.company_name} HR Team,

We are contacting you on behalf of Indexios Resume Verification Platform to verify the employment of:

Candidate Name: ${targetCandidate.name}
Requested by: ${targetVerification.requester_email}

The candidate has authorized this verification request.

Please confirm whether ${targetCandidate.name} was employed at your organization by clicking one of the links below:

YES - Confirm Employment:
${companyResponseUrl}&response=yes

NO - Not Employed:
${companyResponseUrl}&response=no

WILL NOT CONFIRM - Policy Restriction:
${companyResponseUrl}&response=will_not_confirm

UNVERIFIABLE - Cannot Verify:
${companyResponseUrl}&response=unverifiable

This is a standard employment verification process. Your response will be shared with ${targetVerification.requester_email} who initiated this verification.

Thank you for your cooperation.

---
Indexios Resume Verification Platform
https://indexios.me`
    });

    console.log(`✅ Company verification email sent to ${targetVerification.company_email}`);

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
          <div class="success-icon">✓</div>
          <h1>Verification Approved!</h1>
          <p>Thank you for approving this verification request.</p>
          <p><strong>${targetVerification.company_name}</strong> has been contacted at <strong>${targetVerification.company_email}</strong> to verify your employment.</p>
          <p>You will be notified once they respond.</p>
          <br>
          <p style="font-size: 14px; color: #9ca3af;">You can safely close this window.</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[approveCandidateVerification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});