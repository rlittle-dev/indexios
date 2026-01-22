import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Enhanced Candidate Matching with:
 * 1. High-confidence matches (email, phone, LinkedIn)
 * 2. Fuzzy name matching (Levenshtein distance)
 * 3. Cross-reference employer history
 * 4. Data enrichment on match
 * 5. Confidence scoring
 */

// Normalize strings for comparison
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[s2.length][s1.length];
}

// Calculate similarity ratio (0-1)
function similarityRatio(str1, str2) {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

// Check if employers overlap
function hasEmployerOverlap(employers1, employers2) {
  if (!employers1?.length || !employers2?.length) return { overlap: false, count: 0 };
  
  let count = 0;
  for (const emp1 of employers1) {
    const name1 = normalize(emp1.employer_name || emp1.name || '');
    if (!name1) continue;
    
    for (const emp2 of employers2) {
      const name2 = normalize(emp2.employer_name || emp2.name || '');
      if (!name2) continue;
      
      if (name1 === name2 || similarityRatio(name1, name2) > 0.85) {
        count++;
        break;
      }
    }
  }
  
  return { overlap: count > 0, count };
}

// Calculate match confidence score (0-100)
function calculateConfidenceScore(candidate, inputData) {
  let score = 0;
  const details = [];
  
  // Exact email match: +40 points (highest confidence)
  if (inputData.email && candidate.email) {
    if (normalize(inputData.email) === normalize(candidate.email)) {
      score += 40;
      details.push('email_exact_match');
    }
  }
  
  // Exact phone match: +35 points
  if (inputData.phone && candidate.phone) {
    const phone1 = normalize(inputData.phone);
    const phone2 = normalize(candidate.phone);
    if (phone1 === phone2 || phone1.includes(phone2) || phone2.includes(phone1)) {
      score += 35;
      details.push('phone_exact_match');
    }
  }
  
  // LinkedIn URL match: +40 points
  if (inputData.linkedin_url && candidate.linkedin_url) {
    const li1 = normalize(inputData.linkedin_url);
    const li2 = normalize(candidate.linkedin_url);
    if (li1 === li2 || li1.includes(li2) || li2.includes(li1)) {
      score += 40;
      details.push('linkedin_match');
    }
  }
  
  // Name similarity (fuzzy matching)
  const nameSimilarity = similarityRatio(inputData.name, candidate.name);
  if (nameSimilarity === 1) {
    score += 25;
    details.push('name_exact_match');
  } else if (nameSimilarity >= 0.9) {
    score += 20;
    details.push('name_high_similarity');
  } else if (nameSimilarity >= 0.8) {
    score += 15;
    details.push('name_medium_similarity');
  } else if (nameSimilarity >= 0.7) {
    score += 8;
    details.push('name_low_similarity');
  }
  
  // State match: +10 points
  if (inputData.state && candidate.state) {
    if (normalize(inputData.state) === normalize(candidate.state)) {
      score += 10;
      details.push('state_match');
    }
  }
  
  // City match: +8 points
  if (inputData.city && candidate.city) {
    if (normalize(inputData.city) === normalize(candidate.city)) {
      score += 8;
      details.push('city_match');
    }
  }
  
  // Employer history overlap: +15 points per match (up to 30)
  const employerOverlap = hasEmployerOverlap(inputData.employers, candidate.employers);
  if (employerOverlap.overlap) {
    const employerScore = Math.min(employerOverlap.count * 15, 30);
    score += employerScore;
    details.push(`employer_overlap_${employerOverlap.count}`);
  }
  
  return { score: Math.min(score, 100), details };
}

// Enrich existing candidate with new data
function enrichCandidateData(existingCandidate, newData) {
  const enriched = {};
  const enrichedFields = [];
  
  if (!existingCandidate.email && newData.email) {
    enriched.email = newData.email;
    enrichedFields.push('email');
  }
  if (!existingCandidate.phone && newData.phone) {
    enriched.phone = newData.phone;
    enrichedFields.push('phone');
  }
  if (!existingCandidate.linkedin_url && newData.linkedin_url) {
    enriched.linkedin_url = newData.linkedin_url;
    enrichedFields.push('linkedin_url');
  }
  if (!existingCandidate.city && newData.city) {
    enriched.city = newData.city;
    enrichedFields.push('city');
  }
  if (!existingCandidate.state && newData.state) {
    enriched.state = newData.state;
    enrichedFields.push('state');
  }
  
  return { enriched, enrichedFields };
}

// Find best matching candidate with confidence scoring
async function findBestMatch(base44, inputData, threshold = 60) {
  console.log(`[CandidateMatching] Searching for match: ${inputData.name}`);
  
  const allCandidates = await base44.asServiceRole.entities.UniqueCandidate.list();
  
  if (!allCandidates?.length) {
    console.log('[CandidateMatching] No existing candidates found');
    return { match: null, confidence: 0, details: [] };
  }
  
  const scoredMatches = [];
  
  for (const candidate of allCandidates) {
    const { score, details } = calculateConfidenceScore(candidate, inputData);
    
    if (score > 0) {
      scoredMatches.push({ candidate, score, details });
    }
  }
  
  scoredMatches.sort((a, b) => b.score - a.score);
  
  console.log(`[CandidateMatching] Found ${scoredMatches.length} potential matches`);
  
  if (scoredMatches.length > 0) {
    const best = scoredMatches[0];
    console.log(`[CandidateMatching] Best match: ${best.candidate.name} (score: ${best.score}, details: ${best.details.join(', ')})`);
    
    if (best.score >= threshold) {
      return {
        match: best.candidate,
        confidence: best.score,
        details: best.details
      };
    }
  }
  
  return { match: null, confidence: 0, details: [] };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check enterprise tier
    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Enterprise subscription required' }, { status: 403 });
    }

    // Check verified workplace
    if (!user.verified_workplace) {
      return Response.json({ error: 'Workplace verification required' }, { status: 403 });
    }

    const { candidateData, employmentData, companyName, companyDomain } = await req.json();

    if (!candidateData?.firstName || !candidateData?.lastName || !candidateData?.state) {
      return Response.json({ error: 'First name, last name, and state are required' }, { status: 400 });
    }

    const fullName = `${candidateData.firstName} ${candidateData.lastName}`;

    // Prepare input data for matching
    const inputData = {
      name: fullName,
      email: candidateData.email || null,
      phone: candidateData.phone || null,
      linkedin_url: candidateData.linkedinUrl || null,
      state: candidateData.state || null,
      city: candidateData.city || null,
      employers: companyName ? [{ employer_name: companyName }] : []
    };

    // Use enhanced matching with confidence scoring (threshold: 60)
    const matchResult = await findBestMatch(base44, inputData, 60);
    
    let matchedCandidate = matchResult.match;
    let matchConfidence = matchResult.confidence;
    let matchDetails = matchResult.details;
    
    console.log(`[ManualAttestation] Match result: ${matchedCandidate ? matchedCandidate.name : 'none'} (confidence: ${matchConfidence}, details: ${matchDetails.join(', ')})`);

    let uniqueCandidateId;
    let employers = [];

    if (matchedCandidate) {
      // Update existing candidate with enriched data
      uniqueCandidateId = matchedCandidate.id;
      employers = matchedCandidate.employers || [];
      
      // Use data enrichment to fill missing fields
      const { enriched, enrichedFields } = enrichCandidateData(matchedCandidate, inputData);
      
      if (Object.keys(enriched).length > 0) {
        await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, enriched);
        console.log(`[ManualAttestation] Enriched candidate with: ${enrichedFields.join(', ')}`);
      }
      
      console.log(`[ManualAttestation] Found existing candidate: ${matchedCandidate.name} (${uniqueCandidateId}) with confidence ${matchConfidence}`);
    } else {
      // Create new UniqueCandidate
      const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
        name: fullName,
        email: candidateData.email || null,
        phone: candidateData.phone || null,
        linkedin_url: candidateData.linkedinUrl || null,
        state: candidateData.state,
        city: candidateData.city || null,
        employers: []
      });
      uniqueCandidateId = newCandidate.id;
      console.log(`[ManualAttestation] Created new candidate: ${fullName} (${uniqueCandidateId})`);
    }

    // Create attestation on-chain
    let attestationUID = null;
    try {
      const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
        uniqueCandidateId,
        companyDomain: companyDomain?.replace('@', '') || companyName,
        verificationType: 'manual_employer',
        verificationOutcome: 1, // YES
        verificationReason: `Manual employer attestation by ${user.email} from ${companyName}`,
        _internal: true
      });

      if (attestationResponse.data?.success) {
        attestationUID = attestationResponse.data.attestationUID;
        console.log('Attestation created:', attestationUID);
      } else {
        console.error('Attestation response:', attestationResponse.data);
      }
    } catch (attestationError) {
      console.error('Attestation error:', attestationError);
      // Continue even if attestation fails
    }

    // Find or create employer entry
    const companyNameLower = companyName.toLowerCase().trim();
    let employerIndex = employers.findIndex(emp => {
      const empName = (emp.employer_name || '').toLowerCase().trim();
      return empName === companyNameLower || empName.includes(companyNameLower) || companyNameLower.includes(empName);
    });

    const manualAttestation = {
      status: 'verified',
      attested_by_email: user.email,
      attested_by_company: companyName,
      attested_date: new Date().toISOString(),
      attestation_uid: attestationUID,
      job_title: employmentData?.jobTitle || null,
      start_date: employmentData?.startDate || null,
      end_date: employmentData?.endDate || null,
      notes: employmentData?.notes || null
    };

    if (employerIndex >= 0) {
      // Update existing employer entry
      employers[employerIndex] = {
        ...employers[employerIndex],
        manual_employer_attestation: manualAttestation
      };
    } else {
      // Add new employer entry
      employers.push({
        employer_name: companyName,
        web_evidence_status: 'no',
        call_verification_status: 'not_called',
        email_verification_status: 'not_sent',
        manual_employer_attestation: manualAttestation
      });
    }

    // Update candidate with employer info
    await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
      employers
    });

    return Response.json({
      success: true,
      uniqueCandidateId,
      candidateName: fullName,
      isNewCandidate: !matchedCandidate,
      matchConfidence: matchedCandidate ? matchConfidence : null,
      matchDetails: matchedCandidate ? matchDetails : [],
      attestationUID,
      message: matchedCandidate 
        ? `Updated existing candidate "${fullName}" with manual attestation (confidence: ${matchConfidence}%)`
        : `Created new candidate "${fullName}" with manual attestation`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});