import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, email, subject, message } = body;

    console.log('Support email request:', { name, email, subject });

    if (!name || !email || !subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email to support inbox
    console.log('Sending email to support...');
    await base44.integrations.Core.SendEmail({
      to: 'support@indexios.me',
      subject: `Support Request: ${subject}`,
      from_name: 'Indexios Support',
      body: `New support request from ${name}\n\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
    });

    // Send confirmation email to user
    console.log('Sending confirmation email to user...');
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'We received your message',
      from_name: 'Indexios Support',
      body: `Hi ${name},\n\nThank you for reaching out to Indexios support. We've received your message and will get back to you as soon as possible.\n\nBest regards,\nIndexios Team`
    });

    console.log('Emails sent successfully');
    return Response.json({ success: true });
  } catch (error) {
    console.error('Support email error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
});