import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { verificationId, action } = await req.json();

    if (!verificationId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const verification = await base44.asServiceRole.entities.Verification.get(verificationId);

    if (!verification) {
      return Response.json({ error: 'Verification not found' }, { status: 404 });
    }

    if (verification.consent_status !== 'PENDING') {
      return Response.json({ error: 'Consent already processed' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (action === 'reject') {
      // Candidate rejected - stop immediately
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        consent_status: 'REJECTED',
        consent_rejected_at: now,
        status: 'COMPLETED',
        final_result: 'INCONCLUSIVE',
        final_reason: 'CANDIDATE_REJECTED_SEARCH',
        progress: {
          ...verification.progress,
          consent_response: {
            status: 'FAILED',
            message: 'Candidate rejected search',
            timestamp: now
          },
          final_outcome: {
            status: 'SUCCESS',
            message: 'Verification stopped: candidate rejected search',
            timestamp: now
          }
        }
      });

      return Response.json({
        success: true,
        message: 'Consent rejected. No verification will be performed.'
      });
    }

    // Candidate approved - proceed to web scan
    await base44.asServiceRole.entities.Verification.update(verificationId, {
      consent_status: 'APPROVED',
      consent_approved_at: now,
      status: 'CONSENT_APPROVED',
      progress: {
        ...verification.progress,
        consent_response: {
          status: 'SUCCESS',
          message: 'Candidate approved verification',
          timestamp: now
        }
      }
    });

    // Trigger verification workflow
    try {
      await base44.asServiceRole.functions.invoke('runVerification', { verificationId });
    } catch (error) {
      console.error('[HandleConsent] Failed to trigger verification:', error);
    }

    return Response.json({
      success: true,
      message: 'Consent approved. Verification started.'
    });

  } catch (error) {
    console.error('[HandleConsent] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});