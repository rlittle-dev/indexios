import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    // Hash the token
    const tokenYesHash = createHash('sha256').update(token).digest('hex');

    // Find employer email verification by token hash
    const verifications = await base44.asServiceRole.entities.EmployerEmailVerification.filter({ tokenYesHash });
    
    if (verifications.length === 0) {
      return new Response('Invalid or expired token', { status: 404 });
    }

    const emailVerif = verifications[0];

    // Check if already used
    if (emailVerif.status !== 'SENT') {
      return new Response('Token already used', { status: 400 });
    }

    // Update email verification
    await base44.asServiceRole.entities.EmployerEmailVerification.update(emailVerif.id, {
      status: 'YES',
      respondedAt: new Date().toISOString()
    });

    // Update verification - mark as completed with YES result
    await base44.asServiceRole.entities.Verification.update(emailVerif.verificationId, {
      status: 'COMPLETED',
      finalResult: 'YES',
      finalReason: 'EMAIL_YES'
    });

    // Redirect to success page
    return Response.redirect(`${url.origin}/employer-verified`, 302);
  } catch (error) {
    console.error('Verify employment yes error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});