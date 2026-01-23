import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, action } = await req.json();

    if (!token || !action) {
      return Response.json({ error: 'Token and action are required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'deny') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Find user with this pending verification token
    const allUsers = await base44.asServiceRole.entities.User.filter({});
    const user = allUsers.find(u => 
      u.pending_workplace_verification?.token === token &&
      u.pending_workplace_verification?.status === 'pending'
    );

    if (!user) {
      return Response.json({ 
        error: 'Invalid or expired verification token',
        expired: true 
      }, { status: 404 });
    }

    const pending = user.pending_workplace_verification;

    if (action === 'approve') {
      // Approve - set verified_workplace and clear pending
      await base44.asServiceRole.entities.User.update(user.id, {
        verified_workplace: {
          company: pending.company,
          domain: pending.domain,
          verified_date: new Date().toISOString(),
          verified_by_email: pending.company_email
        },
        pending_workplace_verification: null
      });

      return Response.json({
        success: true,
        action: 'approved',
        company: pending.company,
        userName: user.full_name || user.email
      });
    } else {
      // Deny - clear pending verification
      await base44.asServiceRole.entities.User.update(user.id, {
        pending_workplace_verification: {
          ...pending,
          status: 'denied',
          denied_date: new Date().toISOString()
        }
      });

      return Response.json({
        success: true,
        action: 'denied',
        company: pending.company
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});