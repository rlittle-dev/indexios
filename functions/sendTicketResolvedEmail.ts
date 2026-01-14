import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await req.json();

    if (!ticketId) {
      return Response.json({ error: 'Missing ticketId' }, { status: 400 });
    }

    // Fetch ticket
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticketId });
    if (tickets.length === 0) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = tickets[0];

    // Build transcript
    let transcript = `SUPPORT TICKET TRANSCRIPT\n`;
    transcript += `========================\n\n`;
    transcript += `Ticket ID: ${ticket.id}\n`;
    transcript += `Subject: ${ticket.subject}\n`;
    transcript += `Status: ${ticket.status}\n`;
    transcript += `Created: ${new Date(ticket.created_date).toLocaleString()}\n\n`;
    transcript += `ORIGINAL MESSAGE:\n${ticket.message}\n\n`;

    if (ticket.responses && ticket.responses.length > 0) {
      transcript += `CONVERSATION:\n`;
      transcript += `-------------\n\n`;
      ticket.responses.forEach((response, idx) => {
        transcript += `[${idx + 1}] ${response.responder_email}\n`;
        transcript += `${new Date(response.timestamp).toLocaleString()}\n`;
        transcript += `${response.message}\n\n`;
      });
    }

    transcript += `\nThis ticket has been resolved and closed.\n`;
    transcript += `Thank you for contacting Indexios support.\n`;

    // Send email with transcript
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ticket.user_email,
      subject: `Ticket Resolved: ${ticket.subject}`,
      body: transcript
    });

    console.log(`Sent ticket transcript to ${ticket.user_email}`);

    return Response.json({
      success: true,
      message: 'Transcript email sent'
    });

  } catch (error) {
    console.error('Send ticket email error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});