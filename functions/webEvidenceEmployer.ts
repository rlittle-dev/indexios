import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Web Evidence Collection (Global Pool)
 * Searches the web for pages mentioning candidate
 * All results added to global evidence pool (no per-employer scoping)
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
    .substring(0, 400);
}

/**
 * Collect web evidence mentioning candidate name
 */
async function collectWebEvidence(base44, candidateName) {
  console.log(`[WebEvidence] Searching web for "${candidateName}"`);

  try {
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
      console.log('[WebEvidence] No search results');
      return [];
    }

    console.log(`[WebEvidence] Found ${searchResult.urls.length} potential pages`);

    // Verify URLs and extract text
    const evidencePool = [];
    const seenUrls = new Set();

    for (const urlData of searchResult.urls.slice(0, 8)) {
      if (seenUrls.has(urlData.url)) continue;
      seenUrls.add(urlData.url);

      try {
        const pageResponse = await fetch(urlData.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(8000)
        });

        if (!pageResponse.ok) continue;

        const pageText = await pageResponse.text();
        
        if (pageText.length < 100) continue;

        console.log(`✅ [WebEvidence] Verified: ${new URL(urlData.url).hostname}`);

        evidencePool.push({
          type: 'web',
          source: new URL(urlData.url).hostname,
          url: urlData.url,
          text: cleanSnippet(urlData.snippet || pageText.substring(0, 300)),
          full_text: pageText,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.log(`[WebEvidence] Error fetching ${urlData.url}: ${error.message}`);
      }
    }

    console.log(`[WebEvidence] Collected ${evidencePool.length} verified page(s)`);
    return evidencePool;

  } catch (error) {
    console.error('[WebEvidence] Error:', error.message);
    return [];
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

    const evidencePool = await collectWebEvidence(base44, candidateName);

    return Response.json({
      success: true,
      evidence_pool: evidencePool
    });

  } catch (error) {
    console.error('[WebEvidence] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});