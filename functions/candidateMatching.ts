import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Candidate Matching Utility
 * Implements 5 matching methods:
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
  if (!employers1?.length || !employers2?.length) return { overlap: false, count: 0, matches: [] };
  
  const matches = [];
  for (const emp1 of employers1) {
    const name1 = normalize(emp1.employer_name || emp1.name || '');
    if (!name1) continue;
    
    for (const emp2 of employers2) {
      const name2 = normalize(emp2.employer_name || emp2.name || '');
      if (!name2) continue;
      
      // Check for exact match or high similarity
      if (name1 === name2 || similarityRatio(name1, name2) > 0.85) {
        matches.push({ emp1: emp1.employer_name || emp1.name, emp2: emp2.employer_name || emp2.name });
      }
    }
  }
  
  return { overlap: matches.length > 0, count: matches.length, matches };
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
  
  // Name similarity
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
  
  // Employer history overlap: +15 points per matching employer (up to 30)
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
  const enriched = { ...existingCandidate };
  let enrichedFields = [];
  
  // Fill in missing fields
  if (!enriched.email && newData.email) {
    enriched.email = newData.email;
    enrichedFields.push('email');
  }
  if (!enriched.phone && newData.phone) {
    enriched.phone = newData.phone;
    enrichedFields.push('phone');
  }
  if (!enriched.linkedin_url && newData.linkedin_url) {
    enriched.linkedin_url = newData.linkedin_url;
    enrichedFields.push('linkedin_url');
  }
  if (!enriched.city && newData.city) {
    enriched.city = newData.city;
    enrichedFields.push('city');
  }
  if (!enriched.state && newData.state) {
    enriched.state = newData.state;
    enrichedFields.push('state');
  }
  
  // Merge employers (add new ones that don't exist)
  if (newData.employers?.length) {
    const existingEmployers = enriched.employers || [];
    
    for (const newEmp of newData.employers) {
      const newEmpName = normalize(newEmp.employer_name || newEmp.name || '');
      if (!newEmpName) continue;
      
      const alreadyExists = existingEmployers.some(existing => {
        const existingName = normalize(existing.employer_name || '');
        return existingName === newEmpName || similarityRatio(existingName, newEmpName) > 0.85;
      });
      
      if (!alreadyExists) {
        existingEmployers.push(newEmp);
        enrichedFields.push(`employer:${newEmp.employer_name || newEmp.name}`);
      }
    }
    
    enriched.employers = existingEmployers;
  }
  
  return { enriched, enrichedFields };
}

// Main matching function
async function findBestMatch(base44, inputData, threshold = 60) {
  console.log(`[CandidateMatching] Searching for match: ${inputData.name}`);
  
  // Fetch all candidates (in production, you'd want to filter more efficiently)
  const allCandidates = await base44.asServiceRole.entities.UniqueCandidate.list();
  
  if (!allCandidates?.length) {
    console.log('[CandidateMatching] No existing candidates found');
    return { match: null, confidence: 0, details: [], allMatches: [] };
  }
  
  const scoredMatches = [];
  
  for (const candidate of allCandidates) {
    const { score, details } = calculateConfidenceScore(candidate, inputData);
    
    if (score > 0) {
      scoredMatches.push({
        candidate,
        score,
        details
      });
    }
  }
  
  // Sort by score descending
  scoredMatches.sort((a, b) => b.score - a.score);
  
  console.log(`[CandidateMatching] Found ${scoredMatches.length} potential matches`);
  
  if (scoredMatches.length > 0) {
    const best = scoredMatches[0];
    console.log(`[CandidateMatching] Best match: ${best.candidate.name} (score: ${best.score}, details: ${best.details.join(', ')})`);
    
    if (best.score >= threshold) {
      return {
        match: best.candidate,
        confidence: best.score,
        details: best.details,
        allMatches: scoredMatches.slice(0, 5) // Return top 5 for review
      };
    }
  }
  
  return { match: null, confidence: 0, details: [], allMatches: scoredMatches.slice(0, 5) };
}

// HTTP endpoint for testing/direct use
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { action, inputData, threshold } = body;
    
    if (action === 'findMatch') {
      const result = await findBestMatch(base44, inputData, threshold || 60);
      return Response.json({ success: true, ...result });
    }
    
    if (action === 'calculateScore') {
      const { candidate } = body;
      const { score, details } = calculateConfidenceScore(candidate, inputData);
      return Response.json({ success: true, score, details });
    }
    
    if (action === 'enrichData') {
      const { existingCandidate, newData } = body;
      const { enriched, enrichedFields } = enrichCandidateData(existingCandidate, newData);
      return Response.json({ success: true, enriched, enrichedFields });
    }
    
    return Response.json({ error: 'Invalid action. Use: findMatch, calculateScore, enrichData' }, { status: 400 });
    
  } catch (error) {
    console.error('[CandidateMatching] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Export functions for use by other backend functions
export { findBestMatch, calculateConfidenceScore, enrichCandidateData, similarityRatio, hasEmployerOverlap };