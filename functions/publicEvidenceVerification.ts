import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public Evidence Verification - Multi-Employer
 * Robust matching with normalization and multiple query strategies
 */

function addArtifact(label, type, value = '', snippet = '') {
  return {
    type,
    value,
    label,
    snippet,
    timestamp: new Date().toISOString()
  };
}

/**
 * Normalize text for matching
 * - lowercase, trim, collapse whitespace
 * - remove punctuation
 * - normalize company suffixes
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[&,.']/g, '')
    .replace(/\b(co|co\.|company|inc|corp|corporation|ltd|llc)\b/g, '');
}

/**
 * Extract last name from full name
 */
function getLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * Check if person-employer match exists
 * Returns: { found, quality, excerpt }
 */
function checkMatch(pageText, personName, employerName, personLastName) {
  if (!pageText) return { found: false, quality: 'none', excerpt: '' };

  const normPage = normalizeText(pageText);
  const normPerson = normalizeText(personName);
  const normLast = normalizeText(personLastName);
  const normEmployer = normalizeText(employerName);

  // Strategy 1: Full name + normalized employer (anywhere in page)
  if (normPage.includes(normPerson) && normPage.includes(normEmployer)) {
    // Try to find a short excerpt with both
    const personIdx = pageText.toLowerCase().indexOf(personName.toLowerCase());
    if (personIdx > -1) {
      const start = Math.max(0, personIdx - 50);
      const end = Math.min(pageText.length, personIdx + personName.length + 100);
      const excerpt = pageText.substring(start, end);
      return { found: true, quality: 'high', excerpt };
    }
    return { found: true, quality: 'high', excerpt: `${personName} at ${employerName}` };
  }

  // Strategy 2: Last name + strong role phrase (CEO, President, CFO, etc.)
  const seniorRoles = ['ceo', 'chief executive', 'president', 'cfo', 'chief financial', 
                       'coo', 'chief operating', 'cto', 'chief technology',
                       'board', 'director', 'executive vice president', 'evp'];
  const hasRole = seniorRoles.some(role => normPage.includes(role));

  if (hasRole && normPage.includes(normLast) && normPage.includes(normEmployer)) {
    const lastIdx = pageText.toLowerCase().indexOf(personLastName.toLowerCase());
    if (lastIdx > -1) {
      const start = Math.max(0, lastIdx - 50);
      const end = Math.min(pageText.length, lastIdx + personLastName.length + 150);
      const excerpt = pageText.substring(start, end);
      return { found: true, quality: 'medium', excerpt };
    }
    return { found: true, quality: 'medium', excerpt: `${personLastName} in ${employerName}` };
  }

  return { found: false, quality: 'none', excerpt: '' };
}

/**
 * Calculate confidence score
 */
function calculateConfidence(sources, employerName, candidateName, roleMentioned) {
  if (!sources || sources.length === 0) return 0.1;

  let confidence = 0.50; // Base

  const employerDomain = normalizeText(employerName);
  
  // Primary source bonus
  const hasPrimarySource = sources.some(s => {
    const url = s.url.toLowerCase();
    return url.includes(employerDomain) || 
           url.includes('sec.gov') ||
           s.type?.toLowerCase().includes('sec');
  });
  if (hasPrimarySource) confidence += 0.30;

  // Independent source bonus (2+ sources)
  const reputableDomains = ['equilar.com', 'bloomberg.com', 'reuters.com', 'wsj.com',
                             'forbes.com', 'businessinsider.com', 'cnbc.com'];
  const hasIndependentSource = sources.some(s =>
    reputableDomains.some(d => s.url.toLowerCase().includes(d))
  );
  if (hasIndependentSource && sources.length >= 2) confidence += 0.20;

  // Role match bonus
  if (roleMentioned && sources.some(s => 
    (s.snippet || '').toLowerCase().includes(roleMentioned.toLowerCase())
  )) {
    confidence += 0.10;
  }

  return Math.min(confidence, 0.95);
}

/**
 * Fetch page content
 */
async function fetchPageContent(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(8000)
    });
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (error) {
    console.log(`[Evidence] Fetch failed for ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Search with multiple query variants
 */
async function searchWithVariants(base44, candidateName, employerName) {
  const queries = [
    `${candidateName} ${employerName} CEO`,
    `${candidateName} ${employerName}`,
    `${candidateName} site:${employerName.toLowerCase().replace(/\s+/g, '')}.com`,
  ];

  const allUrls = new Set();

  for (const query of queries) {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find top 5 URLs mentioning "${query}". Prefer official company domains, Equilar, SEC, news. Return as JSON array of URLs.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: { urls: { type: 'array', items: { type: 'string' } } }
        }
      });
      if (result.urls) {
        result.urls.forEach(u => allUrls.add(u));
      }
    } catch (e) {
      console.log(`[Evidence] Query failed: ${query}`);
    }
  }

  return Array.from(allUrls).slice(0, 10);
}

async function searchPublicEvidenceMultiEmployer(base44, candidateName, employers) {
  console.log(`[Evidence] Searching: ${candidateName} across ${employers.length} employers`);

  const evidenceByEmployer = {};
  const lastNamePerson = getLastName(candidateName);

  for (const employer of employers) {
    console.log(`[Evidence] Processing ${candidateName} @ ${employer.name}...`);

    const debug = {
      normalized_person: normalizeText(candidateName),
      normalized_employer: normalizeText(employer.name),
      queries_used: [],
      fetched_urls: [],
      matches_found: []
    };

    try {
      // Search with variants
      const urls = await searchWithVariants(base44, candidateName, employer.name);
      debug.queries_used = urls.slice(0, 3);

      const sources = [];

      // Fetch and check each URL
      for (const url of urls) {
        const pageContent = await fetchPageContent(url);
        if (!pageContent) continue;

        const match = checkMatch(pageContent, candidateName, employer.name, lastNamePerson);
        
        if (match.found) {
          debug.fetched_urls.push({ url, match_found: true });
          debug.matches_found.push({ url, quality: match.quality, excerpt: match.excerpt });

          // Determine source type/quality
          let sourceType = 'news';
          let quality = match.quality === 'high' ? 'HIGH' : 'MEDIUM';

          if (url.toLowerCase().includes('equilar')) {
            sourceType = 'Equilar (exec database)';
            quality = 'HIGH';
          } else if (url.toLowerCase().includes('sec.gov')) {
            sourceType = 'SEC filing';
            quality = 'HIGH';
          } else if (employer.name.toLowerCase().split(' ').some(w => url.includes(w))) {
            sourceType = 'Company website';
            quality = 'HIGH';
          }

          sources.push({
            url,
            type: sourceType,
            quality,
            snippet: match.excerpt
          });
        } else {
          debug.fetched_urls.push({ url, match_found: false });
        }
      }

      if (sources.length > 0) {
        const confidence = calculateConfidence(sources, employer.name, candidateName, employer.jobTitle);
        
        evidenceByEmployer[employer.name] = {
          found: true,
          confidence,
          sources,
          debug
        };

        console.log(`✅ [Evidence] Found ${sources.length} sources for ${candidateName} @ ${employer.name} (${confidence.toFixed(2)} confidence)`);
      } else {
        evidenceByEmployer[employer.name] = {
          found: false,
          confidence: 0.1,
          sources: [],
          debug
        };

        console.log(`⚠️ [Evidence] No sources found for ${candidateName} @ ${employer.name}`);
      }
    } catch (error) {
      console.error(`[Evidence] Error processing ${employer.name}:`, error.message);
      evidenceByEmployer[employer.name] = {
        found: false,
        confidence: 0,
        sources: [],
        debug: { error: error.message }
      };
    }
  }

  return evidenceByEmployer;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, employers } = await req.json();

    if (!candidateName || !employers || !Array.isArray(employers)) {
      return Response.json({
        error: 'Missing: candidateName, employers (array)'
      }, { status: 400 });
    }

    const evidenceByEmployer = await searchPublicEvidenceMultiEmployer(base44, candidateName, employers);

    // Build response
    const results = {};

    for (const employer of employers) {
      const evidence = evidenceByEmployer[employer.name];
      const artifacts = [];

      let verificationSummary = '';

      if (evidence.found && evidence.sources.length > 0) {
        evidence.sources.forEach(source => {
          artifacts.push(addArtifact(
            `${source.quality} quality source: ${source.type}`,
            'public_evidence',
            source.url,
            source.snippet
          ));
        });

        const sourceTypes = [...new Set(evidence.sources.map(s => s.type))];
        verificationSummary = `Verified via ${sourceTypes.join(' and ')} - ${evidence.sources.length} source${evidence.sources.length > 1 ? 's' : ''} confirm employment.`;
      } else {
        artifacts.push(addArtifact(
          'No public evidence found',
          'public_evidence',
          '',
          'No credible sources found'
        ));
        verificationSummary = 'No public evidence found - manual verification required.';
      }

      // Outcome determination
      let outcome, isVerified, status;
      const hasCredibleSources = evidence.sources && evidence.sources.length > 0;

      if (evidence.found && hasCredibleSources && evidence.confidence >= 0.80) {
        outcome = 'verified_public_evidence';
        isVerified = true;
        status = 'completed';
      } else if (evidence.found && hasCredibleSources && evidence.confidence >= 0.60) {
        outcome = 'policy_identified';
        isVerified = false;
        status = 'action_required';
      } else {
        outcome = 'contact_identified';
        isVerified = false;
        status = 'action_required';
      }

      results[employer.name] = {
        found: evidence.found,
        confidence: evidence.confidence,
        outcome,
        isVerified,
        status,
        artifacts,
        verificationSummary,
        debug: evidence.debug
      };
    }

    return Response.json({ success: true, results });

  } catch (error) {
    console.error('[Evidence] Error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});