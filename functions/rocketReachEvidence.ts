import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RocketReach Evidence Lookup
 * Searches for candidate on RocketReach using web search (no API key required)
 * Returns employment history and matches against resume claims
 */

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

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

async function searchRocketReachProfile(base44, candidateName, employers = []) {
  console.log(`[RocketReach] Searching for ${candidateName}`);

  try {
    // Use LLM to find RocketReach profile via web search
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for RocketReach profile or LinkedIn profile for "${candidateName}". 
      Return their employment history with company names, job titles, and timeframes if available.
      Format: JSON with {profile_url, employment_history: [{company, title, dates}]}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          profile_url: { type: 'string' },
          found: { type: 'boolean' },
          employment_history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' },
                title: { type: 'string' },
                dates: { type: 'string' },
                summary: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (!result.found || !result.employment_history) {
      return { found: false, matches: [], debug: 'No profile found' };
    }

    console.log(`✅ [RocketReach] Found profile with ${result.employment_history.length} positions`);

    // Match resume employers against RocketReach employment history
    const matches = [];

    for (const employer of employers) {
      const normEmployer = normalizeText(employer.name);
      
      for (const rrEntry of result.employment_history) {
        const normRrCompany = normalizeText(rrEntry.company || '');
        
        // Check for company match
        if (normEmployer === normRrCompany || normRrCompany.includes(normEmployer) || normEmployer.includes(normRrCompany)) {
          let quality = 'medium'; // Company match
          let matchedFields = { company: rrEntry.company };
          
          // Upgrade to strong if role also matches
          if (employer.jobTitle && rrEntry.title) {
            const normTitle = normalizeText(employer.jobTitle);
            const normRrTitle = normalizeText(rrEntry.title);
            if (normTitle === normRrTitle || normRrTitle.includes(normTitle)) {
              quality = 'strong';
              matchedFields.title = rrEntry.title;
            }
          }
          
          // Add dates if available
          if (rrEntry.dates) {
            matchedFields.dates = rrEntry.dates;
          }
          
          matches.push({
            employerName: employer.name,
            quality,
            matchedFields,
            rrEntry,
            confidence: quality === 'strong' ? 92 : 80
          });
          
          break; // Only one match per employer
        }
      }
    }

    return {
      found: true,
      profileUrl: result.profile_url,
      matches,
      debug: `Matched ${matches.length}/${employers.length} employers`
    };

  } catch (error) {
    console.error('[RocketReach] Error:', error.message);
    return { found: false, matches: [], debug: error.message };
  }
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
      return Response.json({
        error: 'Missing: candidateName, employers (array with {name, jobTitle})'
      }, { status: 400 });
    }

    const result = await searchRocketReachProfile(base44, candidateName, employers);

    // Build artifacts for each matched employer
    const artifacts = {};

    for (const match of result.matches) {
      const artifact = {
        type: 'rocketreach',
        value: result.profileUrl || '',
        label: `RocketReach match (${match.quality}): ${match.rrEntry.company}${match.rrEntry.title ? ' - ' + match.rrEntry.title : ''}`,
        snippet: cleanSnippet(`${match.rrEntry.company}${match.rrEntry.title ? ', ' + match.rrEntry.title : ''}${match.rrEntry.dates ? ' (' + match.rrEntry.dates + ')' : ''}`),
        matchedFields: match.matchedFields,
        timestamp: new Date().toISOString()
      };

      artifacts[match.employerName] = {
        found: true,
        quality: match.quality,
        confidence: match.confidence,
        artifacts: [artifact],
        debug: `RocketReach ${match.quality} match: ${JSON.stringify(match.matchedFields)}`
      };
    }

    // Mark unmatched employers as not found
    for (const employer of employers) {
      if (!artifacts[employer.name]) {
        artifacts[employer.name] = {
          found: false,
          quality: 'not_found',
          confidence: 10,
          artifacts: [],
          debug: 'No RocketReach match found'
        };
      }
    }

    return Response.json({
      success: true,
      results: artifacts,
      summary: {
        found_count: result.matches.length,
        total_count: employers.length
      }
    });

  } catch (error) {
    console.error('[RocketReach] Endpoint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});