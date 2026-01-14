import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Company Name Normalization + Alias Matching
 * Handles punctuation, suffixes, unicode, and common aliases
 */

const ALIAS_RULES = {
  'united states air force': ['us air force', 'u.s. air force', 'usaf', 'air force'],
  'procter and gamble': ['p&g', 'procter & gamble'],
  'victoria secret': ['victorias secret', "victoria's secret"],
};

function normalizeCompanyName(name) {
  if (!name) return '';
  
  let normalized = name
    .toLowerCase()
    .trim()
    // Remove common suffixes (co, co., inc, corp, etc.)
    .replace(/\b(co|co\.|company|inc|inc\.|corp|corporation|ltd|ltd\.|llc|llc\.|plc|plc\.)$/g, '')
    // Remove punctuation except spaces
    .replace(/[&.,'"]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

function createNormalizedKey(name) {
  // Create a searchable key for aliases
  const base = normalizeCompanyName(name);
  const key = base.replace(/\s+/g, '');
  return key;
}

function matchesCompanyName(resumeName, rrName) {
  const resumeNorm = normalizeCompanyName(resumeName);
  const rrNorm = normalizeCompanyName(rrName);
  
  if (resumeNorm === rrNorm) {
    return true;
  }
  
  // Check alias rules
  for (const [base, aliases] of Object.entries(ALIAS_RULES)) {
    const baseKey = createNormalizedKey(base);
    const resumeKey = createNormalizedKey(resumeNorm);
    const rrKey = createNormalizedKey(rrNorm);
    
    if (baseKey === resumeKey && aliases.some(a => createNormalizedKey(a) === rrKey)) {
      return true;
    }
    if (baseKey === rrKey && aliases.some(a => createNormalizedKey(a) === resumeKey)) {
      return true;
    }
  }
  
  // Fuzzy match on key parts (at least 4 chars)
  const resumeParts = resumeNorm.split(/\s+/).filter(p => p.length >= 4);
  const rrParts = rrNorm.split(/\s+/).filter(p => p.length >= 4);
  
  const matchedParts = resumeParts.filter(p => rrParts.includes(p));
  if (matchedParts.length > 0 && matchedParts.length === Math.min(resumeParts.length, rrParts.length)) {
    return true;
  }
  
  return false;
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
 * Search RocketReach API for candidate profile
 * Extract Work entries and Summary section
 */
async function searchRocketReachAPI(candidateName) {
  const apiKey = Deno.env.get('ROCKETREACH_API_KEY');
  
  if (!apiKey) {
    console.error('[RocketReach] ROCKETREACH_API_KEY not set');
    return { found: false, profile: null, debug: 'API key not configured' };
  }

  console.log(`[RocketReach] Searching API for ${candidateName}`);

  try {
    // Parse candidate name
    const nameParts = candidateName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName) {
      return { found: false, profile: null, debug: 'Invalid candidate name format' };
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
    });

    if (!searchResponse.ok) {
      console.error(`[RocketReach] Search failed: ${searchResponse.status}`);
      return { found: false, profile: null, debug: `API error: ${searchResponse.status}` };
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      console.log('[RocketReach] No search results found');
      return { found: false, profile: null, debug: 'No search results' };
    }

    const personId = searchData.data[0].id;
    console.log(`[RocketReach] Found person ID: ${personId}`);

    // Fetch full profile details
    const profileResponse = await fetch(`https://api.rocketreach.co/v2/person/${personId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      console.error(`[RocketReach] Profile fetch failed: ${profileResponse.status}`);
      return { found: false, profile: null, debug: `Profile fetch failed: ${profileResponse.status}` };
    }

    const profileData = await profileResponse.json();
    const profile = profileData.data;

    if (!profile) {
      return { found: false, profile: null, debug: 'No profile data returned' };
    }

    console.log(`✅ [RocketReach] Profile loaded: ${profile.first_name} ${profile.last_name}`);

    return {
      found: true,
      profile: {
        name: `${profile.first_name} ${profile.last_name}`,
        summary: profile.bio || '',
        work_history: profile.work_history || [],
        profile_url: profile.profile_url || `https://rocketreach.com/profile/${personId}`,
      },
      debug: `Found profile with ${(profile.work_history || []).length} work entries`
    };

  } catch (error) {
    console.error('[RocketReach] API error:', error.message);
    return { found: false, profile: null, debug: error.message };
  }
}

/**
 * Match resume employers against RocketReach Work + Summary
 */
function matchEmployersToRocketReach(profile, resumeEmployers) {
  const matches = {};
  const unconfirmed = [];

  for (const employer of resumeEmployers) {
    const employerName = employer.name;
    let foundMatch = null;
    let matchSource = null;
    let matchedFields = {};

    // Check Work history first (highest priority)
    if (profile.work_history && Array.isArray(profile.work_history)) {
      for (const entry of profile.work_history) {
        if (matchesCompanyName(employerName, entry.company || '')) {
          foundMatch = {
            company: entry.company,
            title: entry.title,
            dates: entry.date_range || '',
            source: 'work',
          };
          matchSource = 'work';
          matchedFields = {
            company: entry.company,
            ...(entry.title && { title: entry.title }),
            ...(entry.date_range && { dates: entry.date_range }),
          };
          break;
        }
      }
    }

    // Check Summary if not found in Work (extract "experience from... Company1, Company2, ...")
    if (!foundMatch && profile.summary) {
      const summary = profile.summary.toLowerCase();
      const employerNormalized = normalizeCompanyName(employerName).toLowerCase();
      
      if (summary.includes(employerNormalized)) {
        // Extract the sentence or fragment containing the employer
        const summaryLines = profile.summary.split(/[.!?]+/);
        for (const line of summaryLines) {
          if (normalizeCompanyName(line).toLowerCase().includes(employerNormalized)) {
            foundMatch = {
              company: employerName,
              source: 'summary',
              snippet: cleanSnippet(line.trim()),
            };
            matchSource = 'summary';
            matchedFields = { company: employerName };
            break;
          }
        }
      }
    }

    if (foundMatch) {
      matches[employerName] = {
        found: true,
        source: matchSource,
        confidence: matchSource === 'work' ? 98 : 95, // Work is highest confidence
        matchedFields,
        snippet: foundMatch.snippet || 
                 `${foundMatch.company}${foundMatch.title ? ' - ' + foundMatch.title : ''}${foundMatch.dates ? ' (' + foundMatch.dates + ')' : ''}`,
        artifact: {
          type: 'rocketreach',
          label: matchSource === 'work' 
            ? `RocketReach Work: ${foundMatch.company}${foundMatch.title ? ' - ' + foundMatch.title : ''}`
            : `RocketReach Summary: ${employerName}`,
          snippet: cleanSnippet(foundMatch.snippet || 
                    `${foundMatch.company}${foundMatch.title ? ', ' + foundMatch.title : ''}${foundMatch.dates ? ' (' + foundMatch.dates + ')' : ''}`),
          matched_fields: matchedFields,
          source: matchSource,
        }
      };
    } else {
      unconfirmed.push(employerName);
      matches[employerName] = {
        found: false,
        source: 'none',
        confidence: 10,
        matchedFields: {},
        artifact: null,
        needsWebSearch: true,
      };
    }
  }

  return { matches, unconfirmed };
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

    // Fetch RocketReach profile
    const rrResult = await searchRocketReachAPI(candidateName);

    if (!rrResult.found || !rrResult.profile) {
      // Return unconfirmed for all employers if no profile found
      const results = {};
      const unconfirmed = [];
      for (const emp of employers) {
        results[emp.name] = {
          found: false,
          source: 'none',
          confidence: 5,
          matchedFields: {},
          artifact: null,
          needsWebSearch: true,
          debug: 'No RocketReach profile found',
        };
        unconfirmed.push(emp.name);
      }
      return Response.json({
        success: true,
        results,
        unconfirmed,
        summary: { found_count: 0, total_count: employers.length }
      });
    }

    // Match employers
    const { matches, unconfirmed } = matchEmployersToRocketReach(rrResult.profile, employers);

    // Build final results
    const results = {};
    for (const [empName, match] of Object.entries(matches)) {
      results[empName] = match;
    }

    console.log(`[RocketReach] Complete: ${Object.values(matches).filter(m => m.found).length} confirmed, ${unconfirmed.length} unconfirmed`);

    return Response.json({
      success: true,
      results,
      unconfirmed,
      profile_url: rrResult.profile.profile_url,
      summary: {
        found_count: Object.values(matches).filter(m => m.found).length,
        total_count: employers.length,
      }
    });

  } catch (error) {
    console.error('[RocketReach] Endpoint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});