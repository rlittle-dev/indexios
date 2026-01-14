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

/**
 * Collect global web evidence pool using LLM web search
 * Multiple query patterns to maximize coverage
 */
async function collectWebEvidence(base44, candidateName) {
  console.log(`[EmploymentConfirmation:Web] Collecting evidence for "${candidateName}"`);

  const queries = [
    `"${candidateName}"`,
    `${candidateName} career experience`,
    `${candidateName} professional background`,
    `${candidateName} appointed`,
    `${candidateName} joined`,
    `${candidateName} executive`,
  ];

  const allSources = [];
  const seenUrls = new Set();
  const webQueryResults = [];

  for (const query of queries) {
    try {
      console.log(`[EmploymentConfirmation:Web] Running query: "${query}"`);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find webpages about "${candidateName}". 
Search for professional background, career history, company associations.
Return top 3–5 URLs with clean snippets (max 2 sentences each).
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
        webQueryResults.push(query);

        for (const item of result.results) {
          if (!item.url || seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);

          allSources.push({
            type: 'web',
            url: item.url,
            title: item.title || '',
            text: cleanSnippet(item.snippet || ''),
            full_text: item.snippet || '',
            source: new URL(item.url).hostname
          });

          console.log(`✅ [EmploymentConfirmation:Web] Added: ${item.url}`);
        }
      } else {
        console.log(`[EmploymentConfirmation:Web] Query returned no results or unexpected format`);
      }

    } catch (error) {
      console.error(`[EmploymentConfirmation:Web] Query error: ${error.message}`);
    }
  }

  console.log(`[EmploymentConfirmation:Web] Total sources collected: ${allSources.length}`);
  return {
    sources: allSources,
    queries_run: webQueryResults,
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

    // Collect global web evidence pool
    const webResult = await collectWebEvidence(base44, candidateName);
    const webSources = webResult.sources || [];
    const webError = webResult.error;

    console.log(`[EmploymentConfirmation] Web sources: ${webSources.length}, error: ${webError || 'none'}`);

    // If no evidence and error exists, return early
    if (webSources.length === 0 && webError) {
      console.error(`[EmploymentConfirmation] ${webError}`);
      return Response.json({
        success: false,
        error: webError,
        debug_global: {
          web_queries_run: webResult.queries_run || [],
          urls_returned: 0,
          snippets_returned: 0
        }
      });
    }

    // DEBUG LOGGING
    console.log(`[EmploymentConfirmation DEBUG] webSources.length: ${webSources.length}`);
    if (webSources.length > 0) {
      const firstSnippet = (webSources[0].full_text || webSources[0].text || '').substring(0, 200);
      console.log(`[EmploymentConfirmation DEBUG] first web snippet (200 chars): "${firstSnippet}"`);
    }
    const normalizedEmployers = employers.map(e => normalize(e.name));
    console.log(`[EmploymentConfirmation DEBUG] normalized employers: ${JSON.stringify(normalizedEmployers)}`);

    // Verify each employer against web sources
    const results = {};

    for (const employer of employers) {
      const snippets = extractSnippets(candidateName, employer.name, webSources);
      
      results[employer.name] = {
        status: snippets.length > 0 ? 'verified' : 'not_found',
        evidence_count: snippets.length,
        sources: snippets,
        has_evidence: webSources.length > 0,
        debug: snippets.length > 0 
          ? `${snippets.length} source(s) matched`
          : (webSources.length === 0 ? 'No evidence collected' : 'No match in evidence')
      };
    }

    const verifiedCount = Object.values(results).filter(r => r.status === 'verified').length;
    console.log(`[EmploymentConfirmation] Final: ${verifiedCount}/${employers.length} verified`);

    return Response.json({
      success: true,
      results,
      debug_global: {
        web_queries_run: webResult.queries_run || [],
        urls_returned: webSources.length,
        snippets_returned: webSources.length
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