import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate a simple hash from resume content/URL for deduplication
 */
function generateResumeHash(resumeUrl, extractedData) {
  // Combine URL and key extracted data for a unique hash
  const content = [
    resumeUrl,
    extractedData?.name || '',
    extractedData?.email || '',
    (extractedData?.companies || []).map(c => c.name).join(','),
    (extractedData?.education || []).map(e => e.institution).join(',')
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

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
 * Priority: email > (name + resume_hash) > (name + companies)
 */
async function findOrCreateUniqueCandidate(base44, extractedData, resumeHash) {
  const { name, email, phone, linkedin } = extractedData || {};
  const normalizedName = normalizeName(name);
  
  // 1. Try to match by email first (most reliable)
  if (email) {
    const byEmail = await base44.asServiceRole.entities.UniqueCandidate.filter({ email });
    if (byEmail && byEmail.length > 0) {
      console.log(`[LinkScan] Found existing candidate by email: ${email}`);
      return { candidate: byEmail[0], isNew: false };
    }
  }
  
  // 2. Try to match by name + resume hash (same resume = same person)
  if (normalizedName && resumeHash) {
    const byNameAndHash = await base44.asServiceRole.entities.UniqueCandidate.filter({ 
      resume_hash: resumeHash 
    });
    if (byNameAndHash && byNameAndHash.length > 0) {
      // Verify name similarity
      for (const candidate of byNameAndHash) {
        if (normalizeName(candidate.name) === normalizedName) {
          console.log(`[LinkScan] Found existing candidate by resume hash: ${candidate.name}`);
          return { candidate, isNew: false };
        }
      }
    }
  }
  
  // 3. Try to match by LinkedIn (very reliable if available)
  if (linkedin) {
    const byLinkedIn = await base44.asServiceRole.entities.UniqueCandidate.filter({ 
      linkedin_url: linkedin 
    });
    if (byLinkedIn && byLinkedIn.length > 0) {
      console.log(`[LinkScan] Found existing candidate by LinkedIn: ${linkedin}`);
      return { candidate: byLinkedIn[0], isNew: false };
    }
  }
  
  // 4. No match found - create new UniqueCandidate
  console.log(`[LinkScan] Creating new UniqueCandidate: ${name}`);
  const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
    name: name || 'Unknown',
    email: email || null,
    phone: phone || null,
    linkedin_url: linkedin || null,
    resume_hash: resumeHash,
    total_scans: 0,
    latest_legitimacy_score: null,
    average_legitimacy_score: null
  });
  
  return { candidate: newCandidate, isNew: true };
}

/**
 * Find or create a Resume record
 */
async function findOrCreateResume(base44, resumeUrl, resumeHash, extractedData, uniqueCandidateId) {
  // Check if this exact resume already exists
  const existing = await base44.asServiceRole.entities.Resume.filter({ resume_hash: resumeHash });
  
  if (existing && existing.length > 0) {
    console.log(`[LinkScan] Found existing resume by hash`);
    return { resume: existing[0], isNew: false };
  }
  
  // Create new resume record
  console.log(`[LinkScan] Creating new Resume record`);
  const newResume = await base44.asServiceRole.entities.Resume.create({
    unique_candidate_id: uniqueCandidateId,
    resume_url: resumeUrl,
    resume_hash: resumeHash,
    extracted_data: extractedData
  });
  
  return { resume: newResume, isNew: true };
}

/**
 * Update UniqueCandidate stats after a new scan
 */
async function updateCandidateStats(base44, uniqueCandidateId, newScore) {
  const candidate = await base44.asServiceRole.entities.UniqueCandidate.filter({ 
    id: uniqueCandidateId 
  });
  
  if (!candidate || candidate.length === 0) return;
  
  const current = candidate[0];
  const totalScans = (current.total_scans || 0) + 1;
  const currentAvg = current.average_legitimacy_score || newScore;
  const newAvg = ((currentAvg * (totalScans - 1)) + newScore) / totalScans;
  
  await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
    total_scans: totalScans,
    latest_legitimacy_score: newScore,
    average_legitimacy_score: Math.round(newAvg * 10) / 10
  });
  
  console.log(`[LinkScan] Updated candidate stats: ${totalScans} scans, avg score: ${newAvg.toFixed(1)}`);
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
    const resumeUrl = candidate.resume_url;
    const analysis = candidate.analysis || {};
    
    // Extract identifying data from the scan
    const extractedData = {
      name: candidate.name,
      email: candidate.email,
      phone: null, // Could be extracted from resume in future
      linkedin: null, // Could be extracted from resume in future
      companies: analysis.companies || [],
      education: [], // Could be extracted from resume in future
      skills: []
    };
    
    // Generate resume hash
    const resumeHash = generateResumeHash(resumeUrl, extractedData);
    
    // Find or create UniqueCandidate
    const { candidate: uniqueCandidate, isNew: isNewCandidate } = 
      await findOrCreateUniqueCandidate(base44, extractedData, resumeHash);
    
    // Find or create Resume
    const { resume, isNew: isNewResume } = 
      await findOrCreateResume(base44, resumeUrl, resumeHash, extractedData, uniqueCandidate.id);
    
    // Create CandidateScan record (always new for each scan)
    const scanRecord = await base44.asServiceRole.entities.CandidateScan.create({
      unique_candidate_id: uniqueCandidate.id,
      resume_id: resume.id,
      candidate_id: candidateId,
      scanned_by_email: user.email,
      scanned_by_team_id: candidate.team_id || null,
      legitimacy_score: candidate.legitimacy_score,
      scan_date: new Date().toISOString()
    });
    
    // Update candidate stats
    if (candidate.legitimacy_score) {
      await updateCandidateStats(base44, uniqueCandidate.id, candidate.legitimacy_score);
    }
    
    console.log(`[LinkScan] Linked scan ${candidateId} -> UniqueCandidate ${uniqueCandidate.id}, Resume ${resume.id}`);
    
    return Response.json({
      success: true,
      uniqueCandidateId: uniqueCandidate.id,
      resumeId: resume.id,
      scanId: scanRecord.id,
      isNewCandidate,
      isNewResume,
      totalScans: (uniqueCandidate.total_scans || 0) + 1
    });
    
  } catch (error) {
    console.error('[LinkScan] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});