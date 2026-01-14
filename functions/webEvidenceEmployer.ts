import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Web Evidence Lookup (Employer-Specific Fallback)
 * Only called for employers NOT confirmed by RocketReach
 * Ensures no cross-company leakage: evidence is scoped per employer
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
    .substring(0, 350);
}

/**
 * Search web for candidate + employer mention
 * Returns top sources with cleaned snippets
 */
async function searchWebForEmployer(base44, candidateName, employer) {
  console.log(`[WebEvidence] Searching: "${candidateName}" + "${employer.name}"`);

  try {
    // Build multi-query search prompt
    const queries = [
      `"${candidateName}" "${employer.name}"`,
      ...(employer.jobTitle ? [`"${candidateName}" "${employer.name}" "${employer.jobTitle}"`] : []),
      `"${candidateName}" appointed "${employer.name}"`,
      `"${candidateName}" joined "${employer.name}"`,
    ];

    const searchResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find webpages mentioning "${candidateName}" in connection with "${employer.name}".
      Prefer high-quality sources: company websites, press releases, SEC filings, executive databases, news outlets.
      Return the top 3-5 URLs with snippet showing the employment connection.
      Format: JSON {urls: [{url, snippet, source_domain, source_quality: "high"|"medium"|"low"}]}`,
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
                source_domain: { type: 'string' },
                source_quality: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (!searchResult.urls || searchResult.urls.length === 0) {
      console.log(`[WebEvidence] No search results for ${employer.name}`);
      return { found: false, artifacts: [], debug: 'No web results found' };
    }

    console.log(`[WebEvidence] Found ${searchResult.urls.length} potential results for ${employer.name}`);

    // Verify URLs and extract clean snippets
    const artifacts = [];
    const seenUrls = new Set();

    for (const urlData of searchResult.urls.slice(0, 3)) {
      if (seenUrls.has(urlData.url)) continue;
      seenUrls.add(urlData.url);

      try {
        const pageResponse = await fetch(urlData.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000)
        });

        if (!pageResponse.ok) {
          console.log(`[WebEvidence] Page ${urlData.url} returned ${pageResponse.status}`);
          continue;
        }

        const pageText = await pageResponse.text();
        const pageTextLower = pageText.toLowerCase();
        const candidateNameLower = candidateName.toLowerCase();
        const employerNameLower = employer.name.toLowerCase();

        // Verify BOTH candidate name AND employer name are on the page
        if (!pageTextLower.includes(candidateNameLower) || 
            !pageTextLower.includes(employerNameLower)) {
          console.log(`[WebEvidence] Page missing name or employer match: ${urlData.url}`);
          continue;
        }

        console.log(`✅ [WebEvidence] Verified: ${urlData.source_domain}`);

        // Determine quality based on source domain
        let quality = urlData.source_quality || 'low';
        let confidence = 60;

        const domain = urlData.source_domain?.toLowerCase() || '';
        if (domain.includes(employer.name.toLowerCase().replace(/\s+/g, '')) ||
            domain.includes('press') ||
            domain.includes('news') ||
            domain.includes('investor')) {
          quality = 'high';
          confidence = 90;
        } else if (domain.includes('linkedin') ||
                   domain.includes('bloomberg') ||
                   domain.includes('crunchbase') ||
                   domain.includes('sec.gov')) {
          quality = 'high';
          confidence = 88;
        } else if (domain.includes('wikipedia') ||
                   domain.includes('indeed')) {
          quality = 'medium';
          confidence = 75;
        }

        const artifact = {
          type: 'web_evidence',
          value: urlData.url,
          label: `Web (${quality}): ${new URL(urlData.url).hostname}`,
          snippet: cleanSnippet(urlData.snippet || pageText.substring(0, 300)),
          source_quality: quality,
          matched_fields: {
            company: employer.name,
            name: candidateName,
            ...(employer.jobTitle && { title: employer.jobTitle })
          },
          timestamp: new Date().toISOString()
        };

        artifacts.push({
          artifact,
          confidence,
          quality
        });

      } catch (error) {
        console.log(`[WebEvidence] Error fetching ${urlData.url}: ${error.message}`);
      }
    }

    if (artifacts.length === 0) {
      console.log(`[WebEvidence] No verified sources for ${employer.name}`);
      return { found: false, artifacts: [], debug: 'No verifiable sources found' };
    }

    // Sort by confidence and take top 2
    artifacts.sort((a, b) => b.confidence - a.confidence);
    const topArtifacts = artifacts.slice(0, 2).map(a => a.artifact);
    const avgConfidence = Math.round(artifacts.reduce((sum, a) => sum + a.confidence, 0) / artifacts.length);

    console.log(`[WebEvidence] Confirmed ${employer.name} with ${topArtifacts.length} source(s), confidence ${avgConfidence}%`);

    return {
      found: true,
      quality: artifacts[0].quality || 'medium',
      confidence: Math.min(avgConfidence, 88), // Cap web evidence below RocketReach
      artifacts: topArtifacts,
      debug: `Web ${artifacts[0].quality}: ${topArtifacts.length} source(s)`
    };

  } catch (error) {
    console.error(`[WebEvidence] Error for ${employer.name}:`, error.message);
    return { found: false, artifacts: [], debug: `Error: ${error.message}` };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, unconfirmedEmployers } = await req.json();

    if (!candidateName || !Array.isArray(unconfirmedEmployers)) {
      return Response.json({
        error: 'Missing: candidateName, unconfirmedEmployers (array)'
      }, { status: 400 });
    }

    console.log(`[WebEvidence] Processing ${unconfirmedEmployers.length} unconfirmed employers`);

    const results = {};

    // Search web for each unconfirmed employer (employer-specific, no cross-leakage)
    for (const employer of unconfirmedEmployers) {
      const webResult = await searchWebForEmployer(base44, candidateName, employer);
      results[employer.name] = webResult;
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('[WebEvidence] Endpoint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});