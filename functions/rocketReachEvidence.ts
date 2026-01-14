import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Company Name Normalization + Alias Matching
 */

const ALIASES = {
  'procter and gamble': ['p&g', 'pg'],
  'victorias secret': ['victorias secret and co'],
  'united states air force': ['us air force', 'usaf'],
};

function normalizeCompanyName(name) {
  if (!name) return '';
  let norm = name
    .toLowerCase()
    .trim()
    // Replace & with 'and'
    .replace(/&/g, 'and')
    // Remove apostrophes
    .replace(/['`]/g, '')
    // Remove punctuation
    .replace(/[.,!?;:()\[\]]/g, '')
    // Remove company suffixes
    .replace(/\b(inc|co|company|corp|corporation|ltd|llc|plc)\b/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return norm;
}

function normalize(text) {
  return normalizeCompanyName(text);
}

function matchesCompanyName(resumeName, evidenceName) {
  const normResume = normalize(resumeName);
  const normEvidence = normalize(evidenceName);
  
  // Exact match
  if (normResume === normEvidence) return true;
  
  // Check aliases
  for (const [base, aliases] of Object.entries(ALIASES)) {
    const normBase = normalize(base);
    const normAliases = aliases.map(a => normalize(a));
    
    // If resume is base and evidence is alias
    if (normResume === normBase && normAliases.includes(normEvidence)) return true;
    // If resume is alias and evidence is base
    if (normResume === normalize(aliases[0]) && normEvidence === normBase) return true;
    // If both are aliases of same base
    const resumeIdx = normAliases.indexOf(normResume);
    const evidenceIdx = normAliases.indexOf(normEvidence);
    if (resumeIdx >= 0 && evidenceIdx >= 0) return true;
  }
  
  // Substring match after normalization
  if (normEvidence.includes(normResume) || normResume.includes(normEvidence)) {
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
 * Return profile data + summary text as evidence
 */
async function searchRocketReachAPI(candidateName) {
  const apiKey = Deno.env.get('ROCKETREACH_API_KEY');
  
  if (!apiKey) {
    console.error('[RocketReach] API key not set');
    return { found: false, profile: null, debug: 'API key not configured' };
  }

  console.log(`[RocketReach] Searching API for ${candidateName}`);

  try {
    const nameParts = candidateName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName || !lastName) {
      return { found: false, profile: null, debug: 'Invalid name format' };
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
      console.log('[RocketReach] No results');
      return { found: false, profile: null, debug: 'No results' };
    }

    const personId = searchData.data[0].id;

    // Fetch full profile
    const profileResponse = await fetch(`https://api.rocketreach.co/v2/person/${personId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      return { found: false, profile: null, debug: `Profile fetch failed: ${profileResponse.status}` };
    }

    const profileData = await profileResponse.json();
    const profile = profileData.data;

    if (!profile) {
      return { found: false, profile: null, debug: 'No profile data' };
    }

    console.log(`✅ [RocketReach] Found: ${profile.first_name} ${profile.last_name}`);

    return {
      found: true,
      profile: {
        name: `${profile.first_name} ${profile.last_name}`,
        summary: profile.bio || '',
        profile_url: profile.profile_url || `https://rocketreach.com/profile/${personId}`,
      },
      debug: 'Profile loaded'
    };

  } catch (error) {
    console.error('[RocketReach] Error:', error.message);
    return { found: false, profile: null, debug: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName } = await req.json();

    if (!candidateName) {
      return Response.json({ error: 'Missing: candidateName' }, { status: 400 });
    }

    // Fetch RocketReach profile
    const rrResult = await searchRocketReachAPI(candidateName);

    if (!rrResult.found || !rrResult.profile) {
      return Response.json({
        success: true,
        evidence_pool: [],
        debug: 'No RocketReach profile found'
      });
    }

    // Parse summary text as evidence
    const evidencePool = [];

    if (rrResult.profile.summary) {
      evidencePool.push({
        type: 'rocketreach_summary',
        source: 'RocketReach Profile',
        url: rrResult.profile.profile_url,
        text: cleanSnippet(rrResult.profile.summary),
        full_text: rrResult.profile.summary,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[RocketReach] Evidence pool: ${evidencePool.length} item(s)`);

    return Response.json({
      success: true,
      evidence_pool: evidencePool,
      profile_url: rrResult.profile.profile_url,
      debug: 'Profile loaded and parsed'
    });

  } catch (error) {
    console.error('[RocketReach] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});