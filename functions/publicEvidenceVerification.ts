import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public Evidence Verification - Multi-Employer
 * Robust matching with normalization and multiple query strategies
 */

/**
 * Clean snippet: strip HTML, decode entities, collapse whitespace
 */
function cleanSnippet(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (m, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300); // Cap at 300 chars
}

function addArtifact(label, type, value = '', snippet = '', sourceType = '') {
  return {
    type,
    value,
    label,
    snippet: cleanSnippet(snippet),
    sourceType,
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
 * Extract matched sentence(s) from page text
 * Finds the sentence containing personName, limited context
 */
function extractMatchedSentence(pageText, personName) {
  if (!pageText || !personName) return '';
  
  const idx = pageText.toLowerCase().indexOf(personName.toLowerCase());
  if (idx === -1) return '';
  
  // Find sentence boundaries (. ! ? or newline)
  let start = idx;
  let end = idx + personName.length;
  
  // Expand to sentence start
  while (start > 0 && !/[.!?\n]/.test(pageText[start - 1])) {
    start--;
  }
  
  // Expand to sentence end
  while (end < pageText.length && !/[.!?\n]/.test(pageText[end])) {
    end++;
  }
  
  return pageText.substring(start, end).trim();
}

/**
 * Check if person-employer match exists in page text
 * EMPLOYER MATCH IS REQUIRED - only return true if employer is found on page
 */
function checkMatch(pageText, personName, employerName, personLastName) {
  if (!pageText) return { found: false, quality: 'none', excerpt: '' };

  const normPage = normalizeText(pageText);
  const normPerson = normalizeText(personName);
  const normLast = normalizeText(personLastName);
  const normEmployer = normalizeText(employerName);

  // CRITICAL: Employer must be on the page (otherwise it's contamination)
  if (!normPage.includes(normEmployer)) {
    return { found: false, quality: 'none', excerpt: 'employer_not_on_page' };
  }

  // Strategy 1: Full name + employer found on same page
  if (normPage.includes(normPerson)) {
    const excerpt = extractMatchedSentence(pageText, personName);
    return { found: true, quality: 'high', excerpt };
  }

  // Strategy 2: Last name + senior role phrase
  const seniorRoles = ['ceo', 'chief executive', 'president', 'cfo', 'chief financial', 
                       'coo', 'chief operating', 'cto', 'chief technology',
                       'board', 'director', 'executive vice president', 'evp'];
  const hasRole = seniorRoles.some(role => normPage.includes(role));

  if (hasRole && normPage.includes(normLast)) {
    const excerpt = extractMatchedSentence(pageText, personLastName);
    return { found: true, quality: 'medium', excerpt };
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
    // SCOPING: Each employer gets its own isolated evidence record
    const employerKey = employer.name; // Use full name as key (should be unique per verification)
    
    console.log(`[Evidence] Processing ${candidateName} @ ${employerKey}...`);

    const debug = {
      normalized_person: normalizeText(candidateName),
      normalized_employer: normalizeText(employer.name),
      employer_match_required: true,
      queries_used: [],
      fetched_urls: [],
      matches_found: [],
      employer_mismatch_rejected: []
    };

    try {
      // Search with variants
      const urls = await searchWithVariants(base44, candidateName, employer.name);
      debug.queries_used = urls.slice(0, 3);

      const sources = []; // SCOPING: Fresh sources array per employer

      // Fetch and check each URL
      for (const url of urls) {
        const pageContent = await fetchPageContent(url);
        if (!pageContent) continue;

        const match = checkMatch(pageContent, candidateName, employer.name, lastNamePerson);
        
        // Reject if employer not found on page (prevents contamination)
        if (match.excerpt === 'employer_not_on_page') {
          debug.employer_mismatch_rejected.push({ url, reason: 'employer_not_on_page' });
          continue;
        }
        
        if (match.found) {
          debug.fetched_urls.push({ url, match_found: true, quality: match.quality });
          debug.matches_found.push({ url, quality: match.quality, excerpt: match.excerpt.substring(0, 100) });

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

          // Create new source object (avoid mutations)
          sources.push({
            url,
            type: sourceType,
            quality,
            snippet: match.excerpt,
            snippetClean: cleanSnippet(match.excerpt)
          });
        } else {
          debug.fetched_urls.push({ url, match_found: false });
        }
      }

      // SCOPING: Each employer record is independent
      if (sources.length > 0) {
        const confidence = calculateConfidence(sources, employer.name, candidateName, employer.jobTitle);
        
        evidenceByEmployer[employerKey] = {
          found: true,
          confidence,
          sources: JSON.parse(JSON.stringify(sources)), // Deep copy to prevent mutations
          debug
        };

        console.log(`✅ [Evidence] Found ${sources.length} sources for ${candidateName} @ ${employerKey} (${confidence.toFixed(2)} confidence)`);
      } else {
        evidenceByEmployer[employerKey] = {
          found: false,
          confidence: 0.1,
          sources: [],
          debug
        };

        console.log(`⚠️ [Evidence] No sources found for ${candidateName} @ ${employerKey}`);
      }
    } catch (error) {
      console.error(`[Evidence] Error processing ${employerKey}:`, error.message);
      evidenceByEmployer[employerKey] = {
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

    // Build response - each employer gets isolated results
    const results = {};

    for (const employer of employers) {
      const evidence = evidenceByEmployer[employer.name] || {
        found: false,
        confidence: 0,
        sources: [],
        debug: {}
      };
      
      const artifacts = []; // Fresh artifacts array per employer

      let verificationSummary = '';

      if (evidence.found && evidence.sources.length > 0) {
        // Attach artifacts only to this employer
        evidence.sources.forEach(source => {
          artifacts.push(addArtifact(
            `${source.quality} quality source: ${source.type}`,
            'public_evidence',
            source.url,
            source.snippetClean || source.snippet,
            source.type
          ));
        });

        const sourceTypes = [...new Set(evidence.sources.map(s => s.type))];
        verificationSummary = `Verified via ${sourceTypes.join(' and ')} - ${evidence.sources.length} source${evidence.sources.length > 1 ? 's' : ''} confirm employment.`;
      } else {
        artifacts.push(addArtifact(
          'No public evidence found',
          'public_evidence',
          '',
          'No credible sources found for this employer'
        ));
        verificationSummary = 'No public evidence found - manual verification required.';
      }

      // Outcome determination (per-employer)
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

      // SCOPING: Each employer has isolated result
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