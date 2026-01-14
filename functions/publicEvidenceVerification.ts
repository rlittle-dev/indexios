import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public Evidence Verification
 * Searches for public evidence of employment using web sources
 * Returns proof artifacts and confidence score
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

async function searchPublicEvidence(base44, candidateName, employerName, jobTitle) {
  console.log(`[Public Evidence] Searching for: ${candidateName} at ${employerName} as ${jobTitle || 'employee'}`);

  // Build search query
  const searchQuery = jobTitle 
    ? `"${candidateName}" "${employerName}" "${jobTitle}"`
    : `"${candidateName}" "${employerName}" employment`;

  try {
    // Use LLM with web context to find and validate evidence
    const prompt = `You are a fact-checking assistant. Search for public evidence that validates the following employment claim:

Person: ${candidateName}
Company: ${employerName}
${jobTitle ? `Title: ${jobTitle}` : ''}

Look for evidence from:
1. Company website (leadership pages, team pages, about pages)
2. Press releases or news articles from reputable sources
3. LinkedIn profiles (if publicly visible)
4. SEC filings if relevant (10-K, 8-K, proxy statements for executive roles)
5. Industry publications

Evaluate the evidence quality:
- HIGH quality: Official company sources (website, SEC filings), multiple reputable news sources
- MEDIUM quality: Single reputable news source, industry publications
- LOW quality: Social media mentions, unverified sources

Return your findings in this format:
- found: boolean (true if credible evidence exists)
- confidence: number 0-1 (how confident you are in the match)
- sources: array of objects with {url, type, quality, snippet}
- reasoning: brief explanation of your confidence level`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          found: { type: "boolean" },
          confidence: { type: "number" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                type: { type: "string" },
                quality: { type: "string" },
                snippet: { type: "string" }
              }
            }
          },
          reasoning: { type: "string" }
        }
      }
    });

    console.log(`[Public Evidence] Found: ${result.found}, Confidence: ${result.confidence}`);

    return {
      found: result.found,
      confidence: result.confidence,
      sources: result.sources || [],
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('[Public Evidence] Search error:', error);
    return {
      found: false,
      confidence: 0,
      sources: [],
      reasoning: `Error during search: ${error.message}`
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, employerName, jobTitle } = await req.json();

    if (!candidateName || !employerName) {
      return Response.json({ 
        error: 'Missing required fields: candidateName, employerName' 
      }, { status: 400 });
    }

    const evidence = await searchPublicEvidence(base44, candidateName, employerName, jobTitle);

    // Build proof artifacts from sources
    const artifacts = [];
    
    if (evidence.found && evidence.sources.length > 0) {
      evidence.sources.forEach(source => {
        artifacts.push(addArtifact(
          `${source.quality.toUpperCase()} quality source: ${source.type}`,
          'public_evidence',
          source.url,
          source.snippet
        ));
      });
    } else {
      artifacts.push(addArtifact(
        'No strong public evidence found',
        'public_evidence',
        '',
        evidence.reasoning
      ));
    }

    // Determine outcome based on evidence quality
    let outcome, isVerified, status;
    
    if (evidence.confidence >= 0.85) {
      // High confidence public evidence = verified
      outcome = 'verified_public_evidence';
      isVerified = true;
      status = 'completed';
    } else if (evidence.confidence >= 0.6) {
      // Medium confidence = helpful but not conclusive
      outcome = 'policy_identified';
      isVerified = false;
      status = 'action_required';
    } else {
      // Low/no confidence = didn't help
      outcome = 'contact_identified';
      isVerified = false;
      status = 'action_required';
    }

    return Response.json({
      success: true,
      found: evidence.found,
      confidence: evidence.confidence,
      outcome,
      isVerified,
      status,
      artifacts,
      reasoning: evidence.reasoning
    });

  } catch (error) {
    console.error('Public evidence verification error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});