import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Normalize name for matching
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find or create a UniqueCandidate based on identifying info
 * Priority: email > name
 */
async function findOrCreateUniqueCandidate(base44, candidateData) {
  const { name, email } = candidateData || {};
  const normalizedName = normalizeName(name);
  
  // 1. Try to match by email first (most reliable)
  if (email) {
    const byEmail = await base44.asServiceRole.entities.UniqueCandidate.filter({ email });
    if (byEmail && byEmail.length > 0) {
      console.log(`[LinkScan] Found existing candidate by email: ${email}`);
      return { candidate: byEmail[0], isNew: false };
    }
  }
  
  // 2. No match found - create new UniqueCandidate
  console.log(`[LinkScan] Creating new UniqueCandidate: ${name}`);
  const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
    name: name || 'Unknown',
    email: email || null,
    verified_employers: [],
    total_verifications: 0
  });
  
  return { candidate: newCandidate, isNew: true };
}

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
    
    // Fetch the original Candidate scan record
    const candidates = await base44.asServiceRole.entities.Candidate.filter({ id: candidateId });
    if (!candidates || candidates.length === 0) {
      return Response.json({ error: 'Candidate not found' }, { status: 404 });
    }
    
    const candidate = candidates[0];
    
    // Find or create UniqueCandidate
    const { candidate: uniqueCandidate, isNew } = await findOrCreateUniqueCandidate(base44, {
      name: candidate.name,
      email: candidate.email
    });
    
    console.log(`[LinkScan] Linked scan ${candidateId} -> UniqueCandidate ${uniqueCandidate.id}`);
    
    // If no attestation exists, ensure all employers have call_verification_status = 'not_called'
    if (!uniqueCandidate.attestation_uid && uniqueCandidate.employers && uniqueCandidate.employers.length > 0) {
      const updatedEmployers = uniqueCandidate.employers.map(emp => ({
        ...emp,
        call_verification_status: 'not_called',
        call_verified_date: null
      }));
      
      await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidate.id, {
        employers: updatedEmployers
      });
      console.log(`[LinkScan] Reset call_verification_status to not_called for ${updatedEmployers.length} employers (no attestation)`);
    }
    
    return Response.json({
      success: true,
      uniqueCandidateId: uniqueCandidate.id,
      isNewCandidate: isNew
    });
    
  } catch (error) {
    console.error('[LinkScan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});