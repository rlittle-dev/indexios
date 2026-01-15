import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, candidateName, candidateEmail, companyName, companyDomain, jobTitle } = await req.json();

    if (!candidateId || !candidateName || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[CreateVerification] Starting for ${candidateName} at ${companyName}`);

    // Create verification record
    const verification = await base44.entities.Verification.create({
      candidate_id: candidateId,
      candidate_name: candidateName,
      candidate_email: candidateEmail || '',
      company_name: companyName,
      company_domain: companyDomain || '',
      job_title: jobTitle || '',
      status: 'CONSENT_PENDING',
      consent_status: 'PENDING',
      progress: {
        consent_requested: {
          status: 'SUCCESS',
          message: 'Consent request sent to candidate',
          timestamp: new Date().toISOString()
        },
        consent_response: {
          status: 'RUNNING',
          message: 'Waiting for candidate response',
          timestamp: new Date().toISOString()
        },
        web_scan: { status: 'PENDING', message: '', timestamp: '' },
        contact_discovery: { status: 'PENDING', message: '', timestamp: '' },
        phone_call: { status: 'PENDING', message: '', timestamp: '' },
        email_outreach: { status: 'PENDING', message: '', timestamp: '' },
        final_outcome: { status: 'PENDING', message: '', timestamp: '' }
      }
    });

    // Send consent request email if candidate email provided
    if (candidateEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: candidateEmail,
          subject: `Employment Verification Request - ${companyName}`,
          body: `Hi ${candidateName},

We need to verify your employment at ${companyName} as part of a background verification process.

This verification will include:
• Web-based public record search
• Phone call to company HR (if available)
• Email to company HR (as fallback)

To proceed with this verification, please approve or reject this request:

Approve: ${window.location.origin}/VerificationConsent?id=${verification.id}&action=approve
Reject: ${window.location.origin}/VerificationConsent?id=${verification.id}&action=reject

If you reject, no contact discovery or outreach will be performed.

Thank you,
Indexios Verification Team`
        });
      } catch (error) {
        console.error('[CreateVerification] Failed to send consent email:', error);
      }
    }

    console.log(`[CreateVerification] Created verification ${verification.id}`);

    return Response.json({
      success: true,
      verification_id: verification.id,
      status: verification.status
    });

  } catch (error) {
    console.error('[CreateVerification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});