import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Employment Confirmation (Simplified)
 * 
 * Pipeline:
 * 1) Collect RocketReach summary
 * 2) Collect web evidence
 * 3) For each resume employer, check if ANY evidence mentions candidate name + employer name (normalized)
 * 4) VERIFIED if match found, NOT FOUND otherwise
 */

const ALIASES = {
  'procter and gamble': ['p&g', 'pg'],
  'victorias secret': ['victorias secret and co'],
  'united states air force': ['us air force', 'usaf'],
};

function normalize(text) {
  if (!text) return '';
  let norm = text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/['`]/g, '')
    .replace(/[.,!?;:()\[\]]/g, '')
    .replace(/\b(inc|co|company|corp|corporation|ltd|llc|plc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return norm;
}

function matchesCompanyName(resumeName, evidenceName) {
  const normResume = normalize(resumeName);
  const normEvidence = normalize(evidenceName);
  
  if (normResume === normEvidence) return true;
  
  for (const [base, aliases] of Object.entries(ALIASES)) {
    const normBase = normalize(base);
    const normAliases = aliases.map(a => normalize(a));
    
    if (normResume === normBase && normAliases.includes(normEvidence)) return true;
    if (normResume === normalize(aliases[0]) && normEvidence === normBase) return true;
    const resumeIdx = normAliases.indexOf(normResume);
    const evidenceIdx = normAliases.indexOf(normEvidence);
    if (resumeIdx >= 0 && evidenceIdx >= 0) return true;
  }
  
  if (normEvidence.includes(normResume) || normResume.includes(normEvidence)) {
    return true;
  }
  
  return false;
}

function extractSnippets(candidateName, employerName, evidencePool) {
  const candidateNormName = candidateName.toLowerCase();
  const employerNorm = normalize(employerName);
  const snippets = [];

  for (const evidence of evidencePool) {
    const fullText = evidence.full_text || evidence.text;
    const textLower = fullText.toLowerCase();
    
    // Must contain candidate name AND employer name (after normalization)
    if (!textLower.includes(candidateNormName.split(/\s+/)[0]) ||
        !textLower.includes(candidateNormName.split(/\s+/).pop())) {
      continue;
    }
    
    // Check for employer match (normalized)
    let foundEmployer = false;
    const textNorm = normalize(fullText);
    
    if (textNorm.includes(employerNorm)) {
      foundEmployer = true;
    } else {
      // Check aliases
      const aliases = ALIASES[employerNorm] || [];
      for (const alias of aliases) {
        if (textNorm.includes(normalize(alias))) {
          foundEmployer = true;
          break;
        }
      }
    }
    
    if (foundEmployer) {
      snippets.push({
        source: evidence.source,
        url: evidence.url,
        text: evidence.text,
        type: evidence.type
      });
    }
  }
  
  return snippets;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, employers } = await req.json();

    if (!candidateName || !Array.isArray(employers)) {
      return Response.json({ error: 'Missing: candidateName, employers' }, { status: 400 });
    }

    console.log(`[EmploymentConfirmation] Starting for ${candidateName}, ${employers.length} employers`);

    // STEP 1 & 2: Collect RocketReach + Web evidence in parallel
    const [rrResponse, webResponse] = await Promise.all([
      base44.functions.invoke('rocketReachEvidence', { candidateName })
        .catch(e => {
          console.error('[EmploymentConfirmation] RocketReach error:', e.message);
          return { data: { evidence_pool: [] } };
        }),
      base44.functions.invoke('webEvidenceEmployer', { candidateName })
        .catch(e => {
          console.error('[EmploymentConfirmation] Web error:', e.message);
          return { data: { evidence_pool: [] } };
        })
    ]);

    const rrEvidence = rrResponse?.data?.evidence_pool || [];
    const webEvidence = webResponse?.data?.evidence_pool || [];

    // Build single global evidence pool
    const candidateEvidence = [...rrEvidence, ...webEvidence];

    // DEBUG LOGGING
    console.log(`[EmploymentConfirmation DEBUG] candidateEvidence.length: ${candidateEvidence.length}`);
    if (candidateEvidence.length > 0) {
      const firstText = (candidateEvidence[0].full_text || candidateEvidence[0].text || '').substring(0, 200);
      console.log(`[EmploymentConfirmation DEBUG] first evidence text (200 chars): "${firstText}"`);
    }
    const normalizedEmployers = employers.map(e => normalize(e.name));
    console.log(`[EmploymentConfirmation DEBUG] normalized employers: ${JSON.stringify(normalizedEmployers)}`);

    console.log(`[EmploymentConfirmation] RocketReach: ${rrEvidence.length}, Web: ${webEvidence.length}, Total: ${candidateEvidence.length}`);

    // STEP 3: Verify each employer against global evidence pool
    const results = {};

    for (const employer of employers) {
      const snippets = extractSnippets(candidateName, employer.name, candidateEvidence);
      
      results[employer.name] = {
        status: snippets.length > 0 ? 'verified' : 'not_found',
        evidence_count: snippets.length,
        sources: snippets,
        debug: snippets.length > 0 
          ? `${snippets.length} source(s) matched`
          : (candidateEvidence.length === 0 ? 'No evidence collected' : 'No match in evidence'),
        has_evidence: candidateEvidence.length > 0
      };
    }

    const verifiedCount = Object.values(results).filter(r => r.status === 'verified').length;
    console.log(`[EmploymentConfirmation] Final: ${verifiedCount}/${employers.length} verified`);

    return Response.json({
      success: true,
      results,
      evidence_summary: {
        rocketreach_count: rrEvidence.length,
        web_count: webEvidence.length,
        total_evidence: candidateEvidence.length
      },
      summary: {
        verified_count: verifiedCount,
        total_count: employers.length
      }
    });

  } catch (error) {
    console.error('[EmploymentConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});