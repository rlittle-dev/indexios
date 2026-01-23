import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Find HR or employment verification email for a company using LLM web search
 */
async function findCompanyHREmail(base44, companyName, companyDomain) {
  try {
    console.log(`[WorkplaceVerification] Looking up HR email for ${companyName}`);
    
    const emailResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the HR or employment verification EMAIL ADDRESS for ${companyName}.

Search specifically for:
- HR department email (e.g., hr@company.com, humanresources@company.com)
- Employment verification email (e.g., employment.verification@company.com, verification@company.com)
- People operations email (e.g., people@company.com, peopleops@company.com)
- General corporate contact email that could handle HR inquiries
- Recruiting/talent email (e.g., careers@company.com, recruiting@company.com)

Many companies list HR emails on their careers page, contact page, or in job postings.
Check ${companyName}'s official website, LinkedIn company page, and job boards.
The company domain is ${companyDomain}.

If you cannot find a specific HR email, suggest the most likely HR email format for this company (e.g., hr${companyDomain}, careers${companyDomain}).

Return the best email address found for contacting HR.
Format: JSON {email: string, source: string, confidence: "high" | "medium" | "low"}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          source: { type: 'string' },
          confidence: { type: 'string' }
        }
      }
    });

    if (emailResult?.email) {
      console.log(`[WorkplaceVerification] Found email: ${emailResult.email} (${emailResult.confidence})`);
      return {
        email: emailResult.email,
        source: emailResult.source || 'Web search',
        confidence: emailResult.confidence || 'medium'
      };
    }
    
    // Fallback to hr@domain if LLM couldn't find anything
    console.log(`[WorkplaceVerification] No email found, using fallback: hr${companyDomain}`);
    return {
      email: `hr${companyDomain}`,
      source: 'Default fallback',
      confidence: 'low'
    };
  } catch (error) {
    console.error(`[WorkplaceVerification] Email lookup error:`, error.message);
    // Fallback to hr@domain on error
    return {
      email: `hr${companyDomain}`,
      source: 'Fallback (lookup failed)',
      confidence: 'low'
    };
  }
}

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

    const { companyName, companyDomain, companyEmail } = await req.json();

    if (!companyName || !companyDomain || !companyEmail) {
      return Response.json({ error: 'Company name, domain, and email are required' }, { status: 400 });
    }
    
    console.log(`[WorkplaceVerification] Using email: ${companyEmail} (provided by user)`)

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Store pending verification on user
    await base44.asServiceRole.entities.User.update(user.id, {
      pending_workplace_verification: {
        company: companyName,
        domain: companyDomain,
        company_email: companyEmail,
        token: verificationToken,
        requested_date: new Date().toISOString(),
        status: 'pending'
      }
    });

    // Build verification URL
    const verifyUrl = `https://indexios.me/AttestationPortal?verify_token=${verificationToken}&action=approve`;
    const denyUrl = `https://indexios.me/AttestationPortal?verify_token=${verificationToken}&action=deny`;

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
                Workplace Verification Request
              </h1>
              
              <!-- Content -->
              <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  <strong style="color: #ffffff;">${user.full_name || user.email}</strong> is requesting authorization to represent <strong style="color: #ffffff;">${companyName}</strong> on the Indexios employment attestation platform.
                </p>
                
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0;">
                  If approved, this person will be able to:
                </p>
                <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; margin: 12px 0 0 0; padding-left: 20px;">
                  <li>Create on-chain employment attestations for ${companyName}</li>
                  <li>Verify employment history of candidates who worked at ${companyName}</li>
                  <li>Manage attestation records associated with your company</li>
                </ul>
              </div>
              
              <div style="background-color: #1e3a5f; border: 1px solid #3b82f6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #93c5fd; font-size: 14px; margin: 0;">
                  <strong>What is Indexios?</strong><br>
                  Indexios is an automated resume verification platform that creates tamper-proof, blockchain-backed employment records. Verified attestations help candidates prove their work history and help employers verify credentials instantly.
                </p>
              </div>
              
              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      ✓ Approve Authorization
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${denyUrl}" style="display: inline-block; background-color: transparent; color: #ef4444; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 24px; border: 1px solid #ef4444; border-radius: 8px;">
                      Deny Request
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a; text-align: center;">
                <p style="color: #71717a; font-size: 12px; margin: 0;">
                  If you didn't expect this request or have concerns, you can safely ignore this email or contact us at support@indexios.me
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
          to: [{ email: companyEmail }]
        }],
        from: {
          email: 'verify@indexios.me',
          name: 'Indexios Verification'
        },
        subject: `Workplace Authorization Request - ${user.full_name || user.email} wants to represent ${companyName}`,
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

    return Response.json({
      success: true,
      message: 'Verification email sent',
      sentTo: companyEmail,
      emailSource: hrEmailResult.source,
      emailConfidence: hrEmailResult.confidence
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});