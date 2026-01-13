import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash, randomBytes } from 'node:crypto';

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

    if (!verif.employerEmail) {
      return Response.json({ error: 'No employer email provided' }, { status: 400 });
    }

    // Generate tokens for YES and NO responses
    const tokenYes = randomBytes(32).toString('hex');
    const tokenNo = randomBytes(32).toString('hex');
    const tokenYesHash = createHash('sha256').update(tokenYes).digest('hex');
    const tokenNoHash = createHash('sha256').update(tokenNo).digest('hex');

    // Create employer email verification record
    await base44.asServiceRole.entities.EmployerEmailVerification.create({
      verificationId: verif.id,
      employerEmail: verif.employerEmail,
      tokenYesHash,
      tokenNoHash,
      status: 'SENT',
      sentAt: new Date().toISOString()
    });

    // Update verification status
    await base44.asServiceRole.entities.Verification.update(verif.id, {
      status: 'EMPLOYER_EMAIL_SENT',
      finalReason: 'PHONE_FAILED_EMAIL_SENT'
    });

    // Send email to employer
    const origin = req.headers.get('origin') || url.origin;
    const yesUrl = `${origin}/verify-employment/yes?token=${tokenYes}`;
    const noUrl = `${origin}/verify-employment/no?token=${tokenNo}`;

    await base44.integrations.Core.SendEmail({
      to: verif.employerEmail,
      subject: 'Employment Verification Request (Yes/No)',
      body: `Dear HR Representative,

We are conducting an employment verification check and need your assistance.

CANDIDATE INFORMATION:
Name: ${verif.candidateName}
${verif.jobTitle ? `Position: ${verif.jobTitle}` : ''}
${verif.employmentDates ? `Employment Dates: ${verif.employmentDates}` : ''}

QUESTION:
Can you confirm whether ${verif.candidateName} is or was employed at ${verif.companyName}?

Please respond by clicking one of the links below:

YES - Confirm Employment: ${yesUrl}

NO - Cannot Confirm: ${noUrl}

Note: If you are unable to verify this information or are not authorized to respond, please click NO.

This is a one-time verification request. Your response will be recorded securely.

Questions? Contact: support@indexios.me

Thank you,
Indexios Verification Team`
    });

    return Response.json({ 
      success: true, 
      message: 'Employer email sent' 
    });
  } catch (error) {
    console.error('Send employer email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});