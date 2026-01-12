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
      // Create a support ticket
      console.log('Creating support ticket for:', user.email);
      const ticket = await base44.entities.Ticket.create({
        subject,
        message,
        user_email: user.email,
        status: 'open',
        priority: 'medium'
      });
      console.log('Support ticket created successfully:', ticket.id);

      return Response.json({ success: true, message: 'Thank you! Your support ticket has been created.', ticketId: ticket.id });
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