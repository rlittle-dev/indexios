import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store support request in database
    const supportRequest = await base44.entities.SupportRequest.create({
      subject,
      message,
      status: 'new'
    });

    // Send confirmation email to user
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'We received your message',
      from_name: 'Indexios Support',
      body: `Hi ${user.full_name},\n\nThank you for reaching out to Indexios support. We've received your message about "${subject}" and will get back to you as soon as possible.\n\nBest regards,\nIndexios Team`
    });

    return Response.json({ success: true, message: 'Support request submitted' });
  } catch (error) {
    console.error('Support request error:', error);
    return Response.json({ error: error.message || 'Failed to submit request' }, { status: 500 });
  }
});