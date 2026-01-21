import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hrEmail, companyName, candidateName, uniqueCandidateId } = await req.json();

    if (!hrEmail || !companyName || !candidateName || !uniqueCandidateId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique verification token
    const verificationToken = crypto.randomUUID();
    
    // Get the app URL for the verification link
    const appUrl = req.headers.get('origin') || 'https://indexios.me';
    const verifyUrl = `${appUrl}/EmailVerificationResponse?token=${verificationToken}`;

    // Update UniqueCandidate with pending email verification
    const candidates = await base44.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
    if (candidates.length === 0) {
      return Response.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidates[0];
    const employers = candidate.employers || [];
    
    // Find the employer and update with email verification token
    const employerIndex = employers.findIndex(emp => {
      const empName = (emp.employer_name || '').toLowerCase().trim();
      const searchName = companyName.toLowerCase().trim();
      return empName === searchName || empName.includes(searchName) || searchName.includes(empName);
    });

    if (employerIndex >= 0) {
      employers[employerIndex] = {
        ...employers[employerIndex],
        email_verification_status: 'pending',
        email_verification_token: verificationToken,
        email_sent_date: new Date().toISOString(),
        email_sent_to: hrEmail
      };
    } else {
      employers.push({
        employer_name: companyName,
        email_verification_status: 'pending',
        email_verification_token: verificationToken,
        email_sent_date: new Date().toISOString(),
        email_sent_to: hrEmail
      });
    }

    await base44.entities.UniqueCandidate.update(uniqueCandidateId, { employers });

    // Send email via SendGrid
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Employment Verification Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="color: #a855f7; font-size: 28px; font-weight: 800; margin: 0;">Indexios</h1>
              <p style="color: #a1a1aa; font-size: 14px; margin: 10px 0 0 0;">Employment Verification Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 40px 40px;">
              <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 20px 0;">Employment Verification Request</h2>
              
              <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A candidate has listed <strong style="color: #ffffff;">${companyName}</strong> as a former employer on their resume. We are requesting verification of their employment.
              </p>
              
              <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin: 20px 0;">
                <p style="color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Candidate Name</p>
                <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">${candidateName}</p>
              </div>
              
              <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Please confirm or deny whether this individual has been employed at your organization:
              </p>
              
              <!-- Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding-right: 10px;">
                    <a href="${verifyUrl}&response=yes" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ✓ Confirm Employment
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 15px;">
                    <a href="${verifyUrl}&response=no" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ✗ Deny Employment
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 15px;">
                    <a href="${verifyUrl}&response=refuse" style="display: inline-block; background-color: #71717a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                      Cannot Disclose
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #71717a; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #3f3f46; padding-top: 20px;">
                This verification is being conducted through Indexios, an employment verification platform. Your response will be recorded on-chain as a permanent, tamper-proof attestation. If you have questions, please contact support@indexios.me.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: hrEmail }]
        }],
        from: {
          email: 'verify@indexios.me',
          name: 'Indexios Verification'
        },
        subject: `Employment Verification Request for ${candidateName}`,
        content: [{
          type: 'text/html',
          value: emailHtml
        }]
      })
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('SendGrid error:', errorText);
      return Response.json({ error: 'Failed to send email', details: errorText }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: 'Verification email sent',
      sentTo: hrEmail 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});