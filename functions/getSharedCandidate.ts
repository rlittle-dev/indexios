import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { candidateId } = await req.json();

    if (!candidateId) {
      return Response.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    // Use service role to fetch candidate (no auth needed for shared reports)
    const candidates = await base44.asServiceRole.entities.Candidate.filter({ id: candidateId });
    
    if (!candidates || candidates.length === 0) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    const candidate = candidates[0];

    // Return the candidate data
    return Response.json({ candidate });
  } catch (error) {
    console.error('Error fetching shared candidate:', error);
    return Response.json({ error: 'Failed to load report' }, { status: 500 });
  }
});