import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RocketReach Evidence Lookup
 * Uses official RocketReach API to search for candidate employment history
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

async function searchRocketReachAPI(candidateName, employers = []) {
  const apiKey = Deno.env.get('ROCKETREACH_API_KEY');
  if (!apiKey) {
    console.error('[RocketReach] Missing API key');
    return { found: false, matches: [], debug: 'API key not configured' };
  }

  console.log(`[RocketReach API] Searching for ${candidateName}`);

  try {
    // Parse name into parts
    const nameParts = candidateName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Search for person by name
    const searchResponse = await fetch('https://api.rocketreach.co/rest/v2/person.search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        limit: 5,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`RocketReach API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.people || searchData.people.length === 0) {
      return { found: false, matches: [], debug: 'No person found' };
    }

    // Get the top match
    const person = searchData.people[0];
    console.log(`✅ [RocketReach API] Found ${person.name || candidateName}`);

    // Fetch detailed profile
    const detailResponse = await fetch(
      `https://api.rocketreach.co/rest/v2/person/${person.id}`,
      {
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );

    if (!detailResponse.ok) {
      throw new Error(`Failed to fetch person details: ${detailResponse.status}`);
    }

    const personDetail = await detailResponse.json();

    // Extract employment history
    const employmentHistory = personDetail.profiles?.map(p => ({
      company: p.company_name || '',
      title: p.job_title || '',
      dates: p.time_period || '',
      summary: p.job_title ? `${p.job_title} at ${p.company_name}` : '',
    })) || [];

    console.log(`[RocketReach API] Found ${employmentHistory.length} employment records`);

    // Match resume employers
    const matches = [];

    for (const employer of employers) {
      const normEmployer = normalizeText(employer.name);

      for (const empRecord of employmentHistory) {
        const normCompany = normalizeText(empRecord.company);

        if (normEmployer === normCompany || normCompany.includes(normEmployer) || normEmployer.includes(normCompany)) {
          let quality = 'medium';
          let matchedFields = { company: empRecord.company };

          if (employer.jobTitle && empRecord.title) {
            const normTitle = normalizeText(employer.jobTitle);
            const normRecordTitle = normalizeText(empRecord.title);
            if (normTitle === normRecordTitle || normRecordTitle.includes(normTitle)) {
              quality = 'strong';
              matchedFields.title = empRecord.title;
            }
          }

          if (empRecord.dates) {
            matchedFields.dates = empRecord.dates;
          }

          matches.push({
            employerName: employer.name,
            quality,
            matchedFields,
            empRecord,
            confidence: quality === 'strong' ? 92 : 80,
          });

          break;
        }
      }
    }

    return {
      found: true,
      profileUrl: `https://rocketreach.co/p/${person.id || ''}`,
      matches,
      debug: `Matched ${matches.length}/${employers.length} employers`,
    };

  } catch (error) {
    console.error('[RocketReach API] Error:', error.message);
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