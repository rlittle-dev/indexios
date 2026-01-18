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
 * Normalize company name for matching
 */
function normalizeCompany(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(inc|co|company|corp|corporation|ltd|llc|plc|limited)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate overlap between two arrays of employers
 * Returns ratio of matching employers (0-1)
 */
function calculateEmployerOverlap(employers1, employers2) {
  if (!employers1?.length || !employers2?.length) return 0;
  
  const normalized1 = employers1.map(e => normalizeCompany(typeof e === 'string' ? e : e.employer_name || e.name));
  const normalized2 = employers2.map(e => normalizeCompany(typeof e === 'string' ? e : e.employer_name || e.name));
  
  let matches = 0;
  for (const emp1 of normalized1) {
    if (!emp1) continue;
    for (const emp2 of normalized2) {
      if (!emp2) continue;
      // Check for exact match or significant substring match
      if (emp1 === emp2 || emp1.includes(emp2) || emp2.includes(emp1)) {
        matches++;
        break;
      }
    }
  }
  
  // Return overlap ratio based on the smaller list
  const minLength = Math.min(normalized1.length, normalized2.length);
  return matches / minLength;
}

/**
 * Find or create a UniqueCandidate based on identifying info
 * Priority: email > (name + employer overlap)
 */
async function findOrCreateUniqueCandidate(base44, candidateData, scanEmployers = []) {
  const { name, email } = candidateData || {};
  const normalizedName = normalizeName(name);
  
  // 1. Try to match by email first (most reliable)
  if (email) {
    const byEmail = await base44.asServiceRole.entities.UniqueCandidate.filter({ email });
    if (byEmail && byEmail.length > 0) {
      console.log(`[LinkScan] Found existing candidate by email: ${email}`);
      return { candidate: byEmail[0], isNew: false, matchType: 'email' };
    }
  }
  
  // 2. Try to match by name + employer overlap (to catch duplicates without email)
  if (normalizedName && scanEmployers.length > 0) {
    // Get all candidates and check for name + employer overlap
    const allCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
    
    for (const existing of allCandidates) {
      const existingNormalizedName = normalizeName(existing.name);
      
      // Name must match exactly (normalized)
      if (existingNormalizedName !== normalizedName) continue;
      
      // Calculate employer overlap
      const existingEmployers = existing.employers || [];
      const overlap = calculateEmployerOverlap(scanEmployers, existingEmployers);
      
      console.log(`[LinkScan] Name match "${name}" with existing "${existing.name}", employer overlap: ${(overlap * 100).toFixed(0)}%`);
      
      // Require at least 50% employer overlap to consider it the same person
      // This prevents false positives from people with the same name
      if (overlap >= 0.5) {
        console.log(`[LinkScan] Found existing candidate by name + employer overlap: ${existing.id}`);
        return { candidate: existing, isNew: false, matchType: 'name_employer_overlap' };
      }
    }
    
    console.log(`[LinkScan] No name + employer match found for "${name}"`);
  }
  
  // 3. No match found - create new UniqueCandidate
  console.log(`[LinkScan] Creating new UniqueCandidate: ${name}`);
  const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
    name: name || 'Unknown',
    email: email || null,
    employers: []
  });
  
  return { candidate: newCandidate, isNew: true, matchType: 'new' };
}

/**
 * Merge new employers into existing employers list
 */
function mergeEmployers(existingEmployers, newEmployers) {
  const merged = [...(existingEmployers || [])];
  
  for (const newEmp of newEmployers) {
    const empName = typeof newEmp === 'string' ? newEmp : newEmp.employer_name || newEmp.name;
    const newNormalized = normalizeCompany(empName);
    if (!newNormalized || !empName) continue;
    
    // Check if this employer already exists
    const exists = merged.some(existing => {
      const existingNormalized = normalizeCompany(existing.employer_name);
      return existingNormalized === newNormalized || 
             existingNormalized?.includes(newNormalized) || 
             newNormalized?.includes(existingNormalized);
    });
    
    if (!exists) {
      // Add new employer with default verification status
      merged.push({
        employer_name: empName,
        web_evidence_status: 'no',
        call_verification_status: 'not_called',
        evidence_count: 0
      });
      console.log(`[LinkScan] Added new employer: ${empName}`);
    }
  }
  
  return merged;
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
    
    // Extract employers from the scan analysis - handle both array formats
    // IMPORTANT: Check company_names first as it's more reliably populated, 
    // then fall back to companies array
    let scanEmployers = [];
    
    if (candidate.analysis?.company_names && Array.isArray(candidate.analysis.company_names) && candidate.analysis.company_names.length > 0) {
      scanEmployers = candidate.analysis.company_names.map(n => ({ name: n }));
      console.log(`[LinkScan] Using company_names array: ${candidate.analysis.company_names.join(', ')}`);
    } else if (candidate.analysis?.companies && Array.isArray(candidate.analysis.companies) && candidate.analysis.companies.length > 0) {
      scanEmployers = candidate.analysis.companies;
      console.log(`[LinkScan] Using companies array`);
    }
    
    console.log(`[LinkScan] Processing candidate "${candidate.name}" with ${scanEmployers.length} employers`);
    console.log(`[LinkScan] Employers found:`, scanEmployers.map(e => typeof e === 'string' ? e : e.name || e.employer_name));
    
    // Find or create UniqueCandidate
    const { candidate: uniqueCandidate, isNew, matchType } = await findOrCreateUniqueCandidate(base44, {
      name: candidate.name,
      email: candidate.email
    }, scanEmployers);
    
    console.log(`[LinkScan] Linked scan ${candidateId} -> UniqueCandidate ${uniqueCandidate.id} (${matchType})`);
    
    // Merge employers from the new scan into the UniqueCandidate
    const mergedEmployers = mergeEmployers(uniqueCandidate.employers, scanEmployers);
    
    // Update UniqueCandidate with merged employers and potentially new email
    const updateData = { employers: mergedEmployers };
    
    // Update email if we didn't have one before
    if (!uniqueCandidate.email && candidate.email) {
      updateData.email = candidate.email;
      console.log(`[LinkScan] Updated email to: ${candidate.email}`);
    }
    
    // Update phone if we didn't have one before
    if (!uniqueCandidate.phone && candidate.phone) {
      updateData.phone = candidate.phone;
    }
    
    // Update LinkedIn if we didn't have one before
    if (!uniqueCandidate.linkedin_url && candidate.linkedin_url) {
      updateData.linkedin_url = candidate.linkedin_url;
    }
    
    // Always update name if candidate has one
    if (candidate.name && candidate.name !== 'Unknown') {
      updateData.name = candidate.name;
    }
    
    console.log(`[LinkScan] Updating UniqueCandidate ${uniqueCandidate.id} with:`, JSON.stringify(updateData, null, 2));
    await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidate.id, updateData);
    
    // If no attestation exists, ensure all employers have call_verification_status = 'not_called'
    if (!uniqueCandidate.attestation_uid && uniqueCandidate.employers && uniqueCandidate.employers.length > 0) {
      const updatedEmployers = uniqueCandidate.employers.map(emp => ({
        ...emp,
        call_verification_status: emp.call_verification_status || 'not_called',
        call_verified_date: emp.call_verified_date || null
      }));
      
      await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidate.id, {
        employers: updatedEmployers
      });
    }
    
    return Response.json({
      success: true,
      uniqueCandidateId: uniqueCandidate.id,
      isNewCandidate: isNew,
      matchType: matchType
    });
    
  } catch (error) {
    console.error('[LinkScan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});