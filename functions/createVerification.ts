import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash, randomBytes } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, candidateEmail, companyName, companyPhone, employerEmail, jobTitle, employmentDates } = await req.json();

    if (!candidateName || !candidateEmail || !companyName || !companyPhone) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create verification record
    const verification = await base44.entities.Verification.create({
      candidateName,
      candidateEmail,
      companyName,
      companyPhone,
      employerEmail: employerEmail || '',
      jobTitle: jobTitle || '',
      employmentDates: employmentDates || '',
      status: 'PENDING_CONSENT'
    });

    // Generate consent token (7 days expiry)
    const consentToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(consentToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create consent record
    await base44.asServiceRole.entities.Consent.create({
      verificationId: verification.id,
      tokenHash,
      status: 'PENDING',
      expiresAt
    });

    // Send consent email to candidate
    const approveUrl = `${req.headers.get('origin')}/consent/approve?token=${consentToken}`;
    const denyUrl = `${req.headers.get('origin')}/consent/deny?token=${consentToken}`;

    await base44.integrations.Core.SendEmail({
      to: candidateEmail,
      subject: 'Action Required: Approve Employment Verification',
      body: `Dear ${candidateName},

We are conducting an employment verification check with ${companyName}.

WHAT WE'RE VERIFYING:
We will contact ${companyName} to confirm your employment status only. No salary, performance, or personal details will be discussed.

${jobTitle ? `Position: ${jobTitle}` : ''}
${employmentDates ? `Employment Dates: ${employmentDates}` : ''}

YOUR ACTION REQUIRED:
Please approve or deny this verification request within 7 days.

Approve Verification: ${approveUrl}

Deny Verification: ${denyUrl}

This link expires in 7 days. If you deny or do not respond, the verification will not proceed.

Questions? Reply to this email.

Best regards,
Indexios Verification Team`
    });

    return Response.json({ 
      success: true, 
      verificationId: verification.id,
      message: 'Consent request sent to candidate'
    });
  } catch (error) {
    console.error('Create verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});