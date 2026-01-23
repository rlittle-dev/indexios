import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Enterprise subscription required' }, { status: 403 });
    }

    const { companyName, companyDomain, workEmail } = await req.json();

    if (!companyName || !companyDomain || !workEmail) {
      return Response.json({ error: 'Company name, domain, and work email are required' }, { status: 400 });
    }

    // Validate email matches company domain
    const emailDomain = '@' + workEmail.split('@')[1]?.toLowerCase();
    if (emailDomain !== companyDomain.toLowerCase()) {
      return Response.json({ error: `Email must be from ${companyDomain}` }, { status: 400 });
    }

    console.log(`[WorkEmailVerification] Sending verification to ${workEmail} for ${companyName}`);

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Store pending verification on user
    await base44.asServiceRole.entities.User.update(user.id, {
      pending_workplace_verification: {
        company: companyName,
        domain: companyDomain,
        company_email: workEmail,
        token: verificationToken,
        requested_date: new Date().toISOString(),
        status: 'pending',
        method: 'work_email'
      }
    });

    // Build verification URL
    const verifyUrl = `https://indexios.me/AttestationPortal?verify_token=${verificationToken}&action=approve`;

    // Send email via SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <tr>
            <td style="padding: 40px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 28px; font-weight: 900; background: linear-gradient(to right, #a855f7, #ffffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Indexios</span>
              </div>
              
              <!-- Header -->
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 20px;">
                Verify Your Workplace
              </h1>
              
              <!-- Content -->
              <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Hi! Click the button below to verify that you work at <strong style="color: #ffffff;">${companyName}</strong> and gain access to the Indexios Attestation Portal.
                </p>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0;">
                  Once verified, you'll be able to:
                </p>
                <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; margin: 12px 0 0 0; padding-left: 20px;">
                  <li>Create on-chain employment attestations</li>
                  <li>Verify employment history of candidates</li>
                  <li>Manage attestation records for ${companyName}</li>
                </ul>
              </div>
              
              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      ✓ Verify My Workplace
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a; text-align: center;">
                <p style="color: #71717a; font-size: 12px; margin: 0;">
                  If you didn't request this, you can safely ignore this email.
                </p>
                <p style="color: #52525b; font-size: 11px; margin: 16px 0 0;">
                  © ${new Date().getFullYear()} Indexios LLC. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: workEmail }]
        }],
        from: {
          email: 'verify@indexios.me',
          name: 'Indexios Verification'
        },
        subject: `Verify your workplace at ${companyName} - Indexios`,
        content: [{
          type: 'text/html',
          value: emailHtml
        }]
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('SendGrid error:', errorText);
      return Response.json({ error: 'Failed to send verification email' }, { status: 500 });
    }

    console.log(`[WorkEmailVerification] Email sent to ${workEmail}`);

    return Response.json({
      success: true,
      message: 'Verification email sent',
      sentTo: workEmail
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});