import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Please log in to send support emails' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message } = body;

    console.log('Support email request from:', user.email);

    if (!subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      // Send email to support inbox
      console.log('Attempting to send email to support@indexios.me...');
      await base44.integrations.Core.SendEmail({
        to: 'support@indexios.me',
        subject: `Support Request: ${subject}`,
        from_name: 'Indexios Support',
        body: `New support request from ${name}\n\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
      });
      console.log('Support email sent successfully');

      // Send confirmation email to user
      console.log('Attempting to send confirmation email to user...');
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'We received your message',
        from_name: 'Indexios Support',
        body: `Hi ${name},\n\nThank you for reaching out to Indexios support. We've received your message and will get back to you as soon as possible.\n\nBest regards,\nIndexios Team`
      });
      console.log('Confirmation email sent successfully');

      return Response.json({ success: true, message: 'Email sent successfully' });
    } catch (emailError) {
      console.error('Email integration error:', emailError.message);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }
  } catch (error) {
    console.error('Support email function error:', error.message);
    console.error('Error details:', error);
    return Response.json({ 
      error: error.message || 'Failed to process request',
      details: error.toString()
    }, { status: 500 });
  }
});