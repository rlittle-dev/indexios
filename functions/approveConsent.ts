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
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Find consent by token hash
    const consents = await base44.asServiceRole.entities.Consent.filter({ tokenHash });
    
    if (consents.length === 0) {
      return new Response('Invalid or expired token', { status: 404 });
    }

    const consent = consents[0];

    // Check expiration
    if (new Date(consent.expiresAt) < new Date()) {
      await base44.asServiceRole.entities.Consent.update(consent.id, {
        status: 'EXPIRED'
      });
      return new Response('Token has expired', { status: 400 });
    }

    // Check if already used
    if (consent.status !== 'PENDING') {
      return new Response('Token already used', { status: 400 });
    }

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Update consent
    await base44.asServiceRole.entities.Consent.update(consent.id, {
      status: 'APPROVED',
      actedAt: new Date().toISOString(),
      ipAddress,
      userAgent
    });

    // Update verification status
    await base44.asServiceRole.entities.Verification.update(consent.verificationId, {
      status: 'CONSENT_APPROVED'
    });

    // Trigger phone call
    const callResponse = await fetch(`${url.origin}/api/verifications/${consent.verificationId}/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ internal: true })
    });

    // Redirect to success page
    return Response.redirect(`${url.origin}/consent-success`, 302);
  } catch (error) {
    console.error('Approve consent error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});