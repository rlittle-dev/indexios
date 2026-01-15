import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send verification email to company HR
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { verificationId, emailAddress, candidateName, companyName, jobTitle } = await req.json();

    if (!verificationId || !emailAddress || !candidateName || !companyName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[HREmail] Sending to ${emailAddress} for ${candidateName} at ${companyName}`);

    const emailBody = `Dear HR Team,

We are conducting an employment verification for the following individual:

Name: ${candidateName}
Position: ${jobTitle || 'Not specified'}
Company: ${companyName}

Could you please confirm whether this individual was employed at ${companyName}${jobTitle ? ` in the role of ${jobTitle}` : ''}?

Please reply to this email with:
- YES (confirmed employment)
- NO (no record of employment)
- Or provide additional context

This verification is part of a standard background check process.

To respond, simply reply to this email.

Thank you for your assistance.

Best regards,
Indexios Verification Team

---
Verification ID: ${verificationId}`;

    try {
      await base44.integrations.Core.SendEmail({
        to: emailAddress,
        subject: `Employment Verification Request - ${candidateName}`,
        body: emailBody
      });

      // Store email data
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        email_data: {
          sent_to: emailAddress,
          sent_at: new Date().toISOString(),
          response_received: false
        }
      });

      console.log(`✅ [HREmail] Email sent to ${emailAddress}`);

      return Response.json({
        success: true,
        message: 'Email sent to HR'
      });

    } catch (error) {
      console.error('[HREmail] Send failed:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

  } catch (error) {
    console.error('[HREmail] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});