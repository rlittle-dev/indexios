import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId } = await req.json();

    if (!candidateId) {
      return Response.json({ error: 'Missing candidateId' }, { status: 400 });
    }

    // Fetch all verification records for this candidate
    const verifications = await base44.entities.EmployerVerification.filter({
      candidateId
    }, '-updated_date');

    // Calculate summary stats
    const summary = {
      total: verifications.length,
      not_started: 0,
      queued: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      verified: 0,
      policy_identified: 0,
      network_required: 0,
      unable_to_verify: 0
    };

    verifications.forEach(v => {
      summary[v.status]++;
      if (v.outcome) {
        summary[v.outcome]++;
      }
    });

    return Response.json({
      success: true,
      verifications,
      summary
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});