import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Web Evidence Lookup (Fallback)
 * Searches the web for candidate + employer mentions
 * Only called if RocketReach did not confirm
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

function extractSnippet(pageText, personName, companyName) {
  if (!pageText) return '';
  
  // Find location of person name
  const personIdx = pageText.toLowerCase().indexOf(personName.toLowerCase());
  if (personIdx === -1) return '';
  
  // Extract sentence around match (up to 200 chars)
  const start = Math.max(0, personIdx - 50);
  const end = Math.min(pageText.length, personIdx + personName.length + 150);
  return pageText.substring(start, end).trim();
}

async function searchWebEvidence(base44, candidateName, employers) {
  console.log(`[WebEvidence] Searching for ${candidateName} across ${employers.length} employers`);

  const results = {};

  for (const employer of employers) {
    console.log(`[WebEvidence] Searching: ${candidateName} + ${employer.name}`);

    try {
      // Search for candidate + employer mentions on the web
      const searchResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Find web pages mentioning "${candidateName}" and "${employer.name}" in an employment context.
        Return top 3 URLs with snippets showing the employment connection.
        Format: JSON with {urls: [{url, snippet, quality: "high"|"medium"|"low"}]}`,
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
                  quality: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (searchResult.urls && searchResult.urls.length > 0) {
        // Verify each URL by fetching
        const artifacts = [];

        for (const urlData of searchResult.urls.slice(0, 2)) {
          try {
            const response = await fetch(urlData.url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
              const pageText = await response.text();
              
              // Verify both candidate name and employer are on the page
              if (pageText.toLowerCase().includes(candidateName.toLowerCase()) &&
                  pageText.toLowerCase().includes(employer.name.toLowerCase())) {
                
                const snippet = extractSnippet(pageText, candidateName, employer.name);
                
                artifacts.push({
                  type: 'web',
                  value: urlData.url,
                  label: `Web evidence (${urlData.quality}): ${new URL(urlData.url).hostname}`,
                  snippet: cleanSnippet(snippet || urlData.snippet),
                  matchedFields: { company: employer.name, url: urlData.url },
                  timestamp: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            console.log(`[WebEvidence] Failed to verify ${urlData.url}: ${e.message}`);
          }
        }

        if (artifacts.length > 0) {
          // Determine quality based on source
          let quality = 'low';
          let confidence = 60;
          const hostname = new URL(artifacts[0].value).hostname.toLowerCase();
          
          if (hostname.includes(employer.name.toLowerCase()) || 
              hostname.includes('press') || 
              hostname.includes('news')) {
            quality = 'high';
            confidence = 85;
          } else if (hostname.includes('linkedin.com') || 
                     hostname.includes('bloomberg') ||
                     hostname.includes('reuters')) {
            quality = 'medium';
            confidence = 75;
          }

          results[employer.name] = {
            found: true,
            quality,
            confidence,
            artifacts,
            debug: `Web ${quality} match: ${artifacts.length} source(s)`
          };
        } else {
          results[employer.name] = {
            found: false,
            quality: 'not_found',
            confidence: 20,
            artifacts: [],
            debug: 'No verifiable web evidence found'
          };
        }
      } else {
        results[employer.name] = {
          found: false,
          quality: 'not_found',
          confidence: 10,
          artifacts: [],
          debug: 'No web results found'
        };
      }
    } catch (error) {
      console.error(`[WebEvidence] Error for ${employer.name}:`, error.message);
      results[employer.name] = {
        found: false,
        quality: 'not_found',
        confidence: 0,
        artifacts: [],
        debug: `Error: ${error.message}`
      };
    }
  }

  return results;
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
        error: 'Missing: candidateName, employers (array)'
      }, { status: 400 });
    }

    const results = await searchWebEvidence(base44, candidateName, employers);

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('[WebEvidence] Endpoint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});