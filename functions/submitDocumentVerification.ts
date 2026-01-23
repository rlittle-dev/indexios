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

    const { companyName, companyDomain, documentUrl, documentName } = await req.json();

    if (!companyName || !companyDomain || !documentUrl) {
      return Response.json({ error: 'Company name, domain, and document are required' }, { status: 400 });
    }

    console.log(`[DocumentVerification] Received document from ${user.email} for ${companyName}`);

    // Generate verification token for admin to process
    const verificationToken = crypto.randomUUID();

    // Store pending verification on user
    await base44.asServiceRole.entities.User.update(user.id, {
      pending_workplace_verification: {
        company: companyName,
        domain: companyDomain,
        token: verificationToken,
        requested_date: new Date().toISOString(),
        status: 'pending',
        method: 'document_review',
        document_url: documentUrl,
        document_name: documentName
      }
    });

    // Send notification email to admin for review
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const ADMIN_EMAIL = 'support@indexios.me';

    const approveUrl = `https://indexios.me/AttestationPortal?verify_token=${verificationToken}&action=approve`;
    const denyUrl = `https://indexios.me/AttestationPortal?verify_token=${verificationToken}&action=deny`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h1 style="color: #333; margin-bottom: 20px;">Document Verification Request</h1>
    
    <p><strong>User:</strong> ${user.full_name || user.email}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Domain:</strong> ${companyDomain}</p>
    <p><strong>Document:</strong> <a href="${documentUrl}">${documentName}</a></p>
    <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
    
    <div style="margin-top: 30px;">
      <a href="${approveUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Approve</a>
      <a href="${denyUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Deny</a>
    </div>
    
    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      Please review the uploaded document before approving.
    </p>
  </div>
</body>
</html>
    `;

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: ADMIN_EMAIL }]
        }],
        from: {
          email: 'verify@indexios.me',
          name: 'Indexios System'
        },
        subject: `[Review Required] Document Verification - ${companyName}`,
        content: [{
          type: 'text/html',
          value: emailHtml
        }]
      })
    });

    console.log(`[DocumentVerification] Admin notified for review`);

    return Response.json({
      success: true,
      message: 'Document submitted for review'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});