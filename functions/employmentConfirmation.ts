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
    .substring(0, 300);
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return '';
  }
}

function isDomainPreferred(domain) {
  const preferred = [
    'prnewswire.com',
    'globenewswire.com',
    'businesswire.com',
    'sec.gov',
  ];
  return preferred.some(p => domain.includes(p));
}

/**
 * Run a single web search query via LLM
 */
async function runWebQuery(base44, query) {
  try {
    console.log(`[EmploymentConfirmation:Web] Query: "${query}"`);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for webpages related to: "${query}"
Return professional sources: company pages, press releases, news, executive bios.
Extract clean snippets (max 2–3 sentences).
Format: JSON {results: [{url, title, snippet}]}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                snippet: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (result?.results && Array.isArray(result.results)) {
      console.log(`[EmploymentConfirmation:Web] Query returned ${result.results.length} result(s)`);
      return result.results;
    }

    return [];

  } catch (error) {
    console.error(`[EmploymentConfirmation:Web] Query error: ${error.message}`);
    return [];
  }
}

/**
 * Collect global web evidence pool using generic + employer-specific queries
 */
async function collectWebEvidence(base44, candidateName, employers) {
  console.log(`[EmploymentConfirmation:Web] Collecting evidence for "${candidateName}"`);

  const allSources = [];
  const seenUrls = new Set();
  const queriesRun = [];
  const domainCounts = {};

  // GENERIC QUERIES
  const genericQueries = [
    `"${candidateName}"`,
    `${candidateName} career`,
    `${candidateName} executive`,
  ];

  // EMPLOYER-SPECIFIC QUERIES
  const employerQueries = [];
  for (const employer of employers) {
    employerQueries.push(
      `"${candidateName}" "${employer.name}"`,
      `${candidateName} ${employer.name}`,
      `${candidateName} ${employer.name} press release`,
      `${candidateName} joined ${employer.name}`,
      `${candidateName} appointed ${employer.name}`
    );
  }

  const allQueries = [...genericQueries, ...employerQueries];

  for (const query of allQueries) {
    const results = await runWebQuery(base44, query);
    
    if (results && results.length > 0) {
      queriesRun.push(query);

      for (const item of results) {
        if (!item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        const domain = getDomain(item.url);
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;

        allSources.push({
          type: 'web',
          url: item.url,
          title: item.title || '',
          text: cleanSnippet(item.snippet || ''),
          full_text: item.snippet || '',
          source: domain
        });

        console.log(`✅ [EmploymentConfirmation:Web] Added: ${item.url}`);

        // Stop if we have enough evidence
        if (allSources.length >= 25) break;
      }

      if (allSources.length >= 25) break;
    }
  }

  console.log(`[EmploymentConfirmation:Web] Total sources: ${allSources.length}`);

  return {
    sources: allSources,
    queries_run: queriesRun,
    domain_counts: domainCounts,
    error: allSources.length === 0 ? 'Web evidence collection returned empty' : null
  };
}

/**
 * Extract evidence snippets matching candidate + employer
 */
function extractSnippets(candidateName, employerName, webSources) {
  const candidateNormName = normalize(candidateName);
  const employerNorm = normalize(employerName);
  const snippets = [];

  for (const source of webSources) {
    const snippetText = source.full_text || source.text;
    if (!snippetText) continue;

    const textNorm = normalize(snippetText);
    
    // Must contain normalized candidate name
    if (!textNorm.includes(candidateNormName)) {
      continue;
    }
    
    // Must contain normalized employer name
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
        source: source.source,
        url: source.url,
        title: source.title,
        text: source.text,
        type: 'web'
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

    const candidateNorm = normalize(candidateName);
    const results = {};
    const employersToVerify = [];
    let cachedCount = 0;

    // Check database for previously verified employment
    for (const employer of employers) {
      const employerNorm = normalize(employer.name);
      
      try {
        const existing = await base44.asServiceRole.entities.VerifiedEmployment.filter({
          candidate_name_normalized: candidateNorm,
          employer_name_normalized: employerNorm
        });

        if (existing && existing.length > 0) {
          const cached = existing[0];
          console.log(`[EmploymentConfirmation] Cache HIT: ${employer.name}`);
          
          results[employer.name] = {
            status: cached.status,
            evidence_count: cached.sources?.length || 0,
            sources: cached.sources || [],
            has_evidence: true,
            cached: true,
            debug: `cached from ${cached.verified_date}`
          };
          cachedCount++;
        } else {
          employersToVerify.push(employer);
        }
      } catch (error) {
        console.error(`[EmploymentConfirmation] Cache check error for ${employer.name}:`, error.message);
        employersToVerify.push(employer);
      }
    }

    console.log(`[EmploymentConfirmation] Cached: ${cachedCount}, To verify: ${employersToVerify.length}`);

    // Only run web evidence collection if we have employers to verify
    let webSources = [];
    let webResult = { queries_run: [], domain_counts: {} };

    if (employersToVerify.length > 0) {
      webResult = await collectWebEvidence(base44, candidateName, employersToVerify);
      webSources = webResult.sources || [];
      const webError = webResult.error;

      console.log(`[EmploymentConfirmation] Web sources: ${webSources.length}, queries: ${webResult.queries_run.length}`);

      // If no evidence and error exists, return early
      if (webSources.length === 0 && webError) {
        console.error(`[EmploymentConfirmation] ${webError}`);
        return Response.json({
          success: false,
          error: webError,
          debug_global: {
            web_queries_run: webResult.queries_run || [],
            urls_returned: 0,
            snippets_returned: 0,
            top_domains: {},
            cached_count: cachedCount
          }
        });
      }

      // Verify each employer against web sources
      for (const employer of employersToVerify) {
        const snippets = extractSnippets(candidateName, employer.name, webSources);
        const status = snippets.length > 0 ? 'verified' : 'not_found';
        
        results[employer.name] = {
          status,
          evidence_count: snippets.length,
          sources: snippets,
          has_evidence: webSources.length > 0,
          cached: false,
          debug: snippets.length > 0 
            ? `matched on ${snippets.length} source(s)`
            : (webSources.length === 0 ? 'No evidence collected' : 'no snippet contained employer string')
        };

        // Save to database for future use
        try {
          await base44.asServiceRole.entities.VerifiedEmployment.create({
            candidate_name: candidateName,
            candidate_name_normalized: normalize(candidateName),
            employer_name: employer.name,
            employer_name_normalized: normalize(employer.name),
            status,
            sources: snippets,
            verified_date: new Date().toISOString()
          });
          console.log(`[EmploymentConfirmation] Saved to cache: ${employer.name}`);
        } catch (error) {
          console.error(`[EmploymentConfirmation] Cache save error for ${employer.name}:`, error.message);
        }
      }
    }

    const verifiedCount = Object.values(results).filter(r => r.status === 'verified').length;
    console.log(`[EmploymentConfirmation] Final: ${verifiedCount}/${employers.length} verified (${cachedCount} from cache)`);

    return Response.json({
      success: true,
      results,
      debug_global: {
        web_queries_run: webResult.queries_run || [],
        urls_returned: webSources.length,
        snippets_returned: webSources.length,
        top_domains: webResult.domain_counts || {},
        cached_count: cachedCount
      },
      summary: {
        verified_count: verifiedCount,
        total_count: employers.length,
        cached_count: cachedCount
      }
    });

  } catch (error) {
    console.error('[EmploymentConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});