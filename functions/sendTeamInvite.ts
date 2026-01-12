import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Enterprise plan required' }, { status: 403 });
    }

    const { email, teamId, teamName } = await req.json();

    // Generate invite token (simple base64 encoding of team ID + email + timestamp)
    const token = btoa(`${teamId}:${email}:${Date.now()}`);
    const joinLink = `${Deno.env.get('APP_URL')}/team-join?token=${token}`;

    // Send invite email
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `You're invited to join ${teamName} on Indexios`,
      body: `You've been invited to join the team "${teamName}" on Indexios for collaborative resume verification.\n\nClick the link below to join:\n${joinLink}\n\nThis invite will expire in 7 days.`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending team invite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});