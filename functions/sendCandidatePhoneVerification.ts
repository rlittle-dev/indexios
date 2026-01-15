import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, candidateEmail, candidateName, companyName, companyPhone } = await req.json();

    if (!candidateId || !candidateEmail || !companyName || !companyPhone) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Get or create employment_verifications array
    const candidate = await base44.asServiceRole.entities.Candidate.get(candidateId);
    const verifications = candidate.employment_verifications || [];

    // Add new phone verification request
    verifications.push({
      company_name: companyName,
      company_phone: companyPhone,
      requester_email: user.email,
      candidate_approved: false,
      verification_token: verificationToken,
      verification_type: 'phone',
      status: 'pending_candidate',
      company_response: 'pending'
    });

    // Update candidate
    await base44.asServiceRole.entities.Candidate.update(candidateId, {
      employment_verifications: verifications
    });

    // Send email to candidate
    const verifyUrl = `${new URL(req.url).origin}/api/functions/approveCandidatePhoneVerification?token=${verificationToken}`;
    
    await base44.integrations.Core.SendEmail({
      to: candidateEmail,
      subject: 'Phone Verification Request - Action Required',
      body: `Hi ${candidateName || 'there'},

${user.email} is requesting to verify your employment at ${companyName} through an AI phone call via Indexios Resume Verification Platform.

By clicking the button below, you authorize Indexios to call ${companyName} at ${companyPhone} with an AI agent to verify your employment history.

This is a standard verification process used by hiring teams to confirm resume accuracy.

Click here to approve this phone verification request:
${verifyUrl}

Why we need your permission:
- We respect your privacy and require consent before contacting employers
- An AI agent will make a professional call to verify your employment
- This verification helps build trust in your professional background
- The employer will only be asked to confirm if you worked there

If you did not apply for a position or do not wish to verify this employment, you can safely ignore this email.

---
Indexios Resume Verification Platform
https://indexios.me`
    });

    console.log(`✅ Candidate phone verification email sent to ${candidateEmail}`);

    return Response.json({
      success: true,
      message: 'Phone verification email sent to candidate',
      verification_token: verificationToken
    });

  } catch (error) {
    console.error('[sendCandidatePhoneVerification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});