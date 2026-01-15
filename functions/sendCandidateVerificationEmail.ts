import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, candidateEmail, candidateName, companyName, companyEmail } = await req.json();

    if (!candidateId || !candidateEmail || !companyName || !companyEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Get or create employment_verifications array
    const candidate = await base44.asServiceRole.entities.Candidate.get(candidateId);
    const verifications = candidate.employment_verifications || [];

    // Add new verification request
    verifications.push({
      company_name: companyName,
      company_email: companyEmail,
      requester_email: user.email,
      candidate_approved: false,
      verification_token: verificationToken,
      status: 'pending_candidate',
      company_response: 'pending'
    });

    // Update candidate
    await base44.asServiceRole.entities.Candidate.update(candidateId, {
      employment_verifications: verifications
    });

    // Send email to candidate
    const verifyUrl = `${new URL(req.url).origin}/api/functions/approveCandidateVerification?token=${verificationToken}`;
    
    await base44.integrations.Core.SendEmail({
      to: candidateEmail,
      subject: 'Employment Verification Request - Action Required',
      body: `Hi ${candidateName || 'there'},

${user.email} is requesting to verify your employment at ${companyName} through Indexios Resume Verification Platform.

By clicking the button below, you authorize Indexios to contact ${companyName} at ${companyEmail} to verify your employment history.

This is a standard verification process used by hiring teams to confirm resume accuracy.

Click here to approve this verification request:
${verifyUrl}

Why we need your permission:
- We respect your privacy and require consent before contacting employers
- This verification helps build trust in your professional background
- The employer will only be asked to confirm if you worked there

If you did not apply for a position or do not wish to verify this employment, you can safely ignore this email.

---
Indexios Resume Verification Platform
https://indexios.me`
    });

    console.log(`✅ Candidate verification email sent to ${candidateEmail}`);

    return Response.json({
      success: true,
      message: 'Verification email sent to candidate',
      verification_token: verificationToken
    });

  } catch (error) {
    console.error('[sendCandidateVerificationEmail] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});