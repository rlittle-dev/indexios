import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

function cleanSnippet(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 400);
}

/**
 * Fetch RocketReach API for candidate profile summary
 */
async function fetchRocketReachEvidence(candidateName) {
  const apiKey = Deno.env.get('ROCKETREACH_API_KEY');
  
  if (!apiKey) {
    console.error('[EmploymentConfirmation:RocketReach] API key not configured');
    return { evidence: [], error: 'API key not configured' };
  }

  try {
    console.log(`[EmploymentConfirmation:RocketReach] Searching for ${candidateName}`);
    
    const nameParts = candidateName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName) {
      return { evidence: [], error: 'Invalid name format' };
    }

    // Search RocketReach API
    const searchResponse = await fetch('https://api.rocketreach.co/v2/person/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        limit: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!searchResponse.ok) {
      const errMsg = `Search failed: HTTP ${searchResponse.status}`;
      console.error(`[EmploymentConfirmation:RocketReach] ${errMsg}`);
      return { evidence: [], error: errMsg };
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      console.log('[EmploymentConfirmation:RocketReach] No profile found');
      return { evidence: [], error: null };
    }

    const personId = searchData.data[0].id;

    // Fetch full profile
    const profileResponse = await fetch(`https://api.rocketreach.co/v2/person/${personId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!profileResponse.ok) {
      const errMsg = `Profile fetch failed: HTTP ${profileResponse.status}`;
      console.error(`[EmploymentConfirmation:RocketReach] ${errMsg}`);
      return { evidence: [], error: errMsg };
    }

    const profileData = await profileResponse.json();
    const profile = profileData.data;

    if (!profile) {
      return { evidence: [], error: null };
    }

    const bio = profile.bio || '';
    const evidence = [];
    
    if (bio) {
      evidence.push({
        type: 'rocketreach_summary',
        source: 'RocketReach',
        url: `https://rocketreach.com/profile/${personId}`,
        text: cleanSnippet(bio),
        full_text: bio,
      });
      console.log(`✅ [EmploymentConfirmation:RocketReach] Found profile with bio (${bio.length} chars)`);
    }

    return { evidence, error: null };

  } catch (error) {
    const errMsg = `Exception: ${error.message}`;
    console.error(`[EmploymentConfirmation:RocketReach] ${errMsg}`);
    return { evidence: [], error: errMsg };
  }
}

/**
 * Fetch web evidence using LLM web search
 */
async function fetchWebEvidence(base44, candidateName) {
  try {
    console.log(`[EmploymentConfirmation:Web] Searching web for "${candidateName}"`);

    const searchResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find webpages mentioning "${candidateName}".
Prefer high-quality sources: company websites, press releases, news, executive databases.
Return top 5-10 URLs with clean text snippets.
Format: JSON {urls: [{url, snippet, source_quality: "high"|"medium"|"low"}]}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                snippet: { type: 'string' },
                source_quality: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (!searchResult.urls || searchResult.urls.length === 0) {
      console.log('[EmploymentConfirmation:Web] No search results');
      return { evidence: [], error: null };
    }

    console.log(`[EmploymentConfirmation:Web] Found ${searchResult.urls.length} potential pages`);

    const evidence = [];
    const seenUrls = new Set();

    for (const urlData of searchResult.urls.slice(0, 8)) {
      if (seenUrls.has(urlData.url)) continue;
      seenUrls.add(urlData.url);

      try {
        const pageResponse = await fetch(urlData.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(8000)
        });

        if (!pageResponse.ok) {
          console.log(`[EmploymentConfirmation:Web] Skipped ${urlData.url} (${pageResponse.status})`);
          continue;
        }

        const pageText = await pageResponse.text();
        
        if (pageText.length < 100) {
          console.log(`[EmploymentConfirmation:Web] Skipped ${urlData.url} (too short)`);
          continue;
        }

        evidence.push({
          type: 'web',
          source: new URL(urlData.url).hostname,
          url: urlData.url,
          text: cleanSnippet(urlData.snippet || pageText.substring(0, 300)),
          full_text: pageText,
        });

        console.log(`✅ [EmploymentConfirmation:Web] Fetched ${new URL(urlData.url).hostname}`);

      } catch (error) {
        console.log(`[EmploymentConfirmation:Web] Error fetching ${urlData.url}: ${error.message}`);
      }
    }

    console.log(`[EmploymentConfirmation:Web] Collected ${evidence.length} verified page(s)`);
    return { evidence, error: null };

  } catch (error) {
    const errMsg = `Exception: ${error.message}`;
    console.error(`[EmploymentConfirmation:Web] ${errMsg}`);
    return { evidence: [], error: errMsg };
  }
}

/**
 * Extract evidence snippets matching candidate + employer
 */
function extractSnippets(candidateName, employerName, candidateEvidence) {
  const candidateNormName = candidateName.toLowerCase();
  const employerNorm = normalize(employerName);
  const snippets = [];

  for (const evidence of candidateEvidence) {
    const fullText = evidence.full_text || evidence.text;
    const textLower = fullText.toLowerCase();
    
    // Must contain candidate name (first + last)
    const nameParts = candidateNormName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    const hasFirstName = textLower.includes(firstName);
    const hasLastName = lastName ? textLower.includes(lastName) : true;
    
    if (!hasFirstName || !hasLastName) {
      continue;
    }
    
    // Must contain employer name (normalized)
    const textNorm = normalize(fullText);
    let foundEmployer = false;
    
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

    // STEP 1: Fetch RocketReach evidence
    const rrResult = await fetchRocketReachEvidence(candidateName);
    const rrEvidence = rrResult.evidence || [];
    const rrError = rrResult.error;
    
    console.log(`[EmploymentConfirmation] RocketReach: ${rrEvidence.length} item(s), error: ${rrError || 'none'}`);

    // STEP 2: Fetch web evidence
    const webResult = await fetchWebEvidence(base44, candidateName);
    const webEvidence = webResult.evidence || [];
    const webError = webResult.error;
    
    console.log(`[EmploymentConfirmation] Web: ${webEvidence.length} item(s), error: ${webError || 'none'}`);

    // Build global evidence pool
    const candidateEvidence = [...rrEvidence, ...webEvidence];
    const totalEvidence = candidateEvidence.length;

    // DEBUG LOGGING
    console.log(`[EmploymentConfirmation DEBUG] candidateEvidence.length: ${totalEvidence}`);
    if (totalEvidence > 0) {
      const firstText = (candidateEvidence[0].full_text || candidateEvidence[0].text || '').substring(0, 200);
      console.log(`[EmploymentConfirmation DEBUG] first evidence text (200 chars): "${firstText}"`);
    }
    const normalizedEmployers = employers.map(e => normalize(e.name));
    console.log(`[EmploymentConfirmation DEBUG] normalized employers: ${JSON.stringify(normalizedEmployers)}`);

    // STEP 3: Verify each employer
    const results = {};

    for (const employer of employers) {
      const snippets = extractSnippets(candidateName, employer.name, candidateEvidence);
      
      results[employer.name] = {
        status: snippets.length > 0 ? 'verified' : 'not_found',
        evidence_count: snippets.length,
        sources: snippets,
        has_evidence: totalEvidence > 0,
        debug: snippets.length > 0 
          ? `${snippets.length} source(s) matched`
          : (totalEvidence === 0 ? 'No evidence collected' : 'No match in evidence')
      };
    }

    const verifiedCount = Object.values(results).filter(r => r.status === 'verified').length;
    console.log(`[EmploymentConfirmation] Final: ${verifiedCount}/${employers.length} verified`);

    return Response.json({
      success: true,
      results,
      evidence_summary: {
        attempted_rocketreach: true,
        attempted_web: true,
        rocketreach_error: rrError,
        web_error: webError,
        rocketreach_text_length: rrEvidence.length > 0 ? (rrEvidence[0].full_text || '').length : 0,
        web_docs_count: webEvidence.length,
        total_evidence: totalEvidence
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