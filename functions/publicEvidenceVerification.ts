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

  try {
    // STEP 1: First, do a targeted search to find relevant pages
    const searchPrompt = `Find web pages that mention "${candidateName}" working at "${employerName}"${jobTitle ? ` as ${jobTitle}` : ''}.

Search specifically for:
- Company website pages (about, leadership, team, executives)
- Press releases from the company
- News articles from business publications
- SEC filings if this is a public company

Return URLs of pages that likely contain employment verification information.`;

    let searchUrls = [];
    try {
      const searchResult = await base44.integrations.Core.InvokeLLM({
        prompt: searchPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            urls: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      searchUrls = searchResult.urls || [];
      console.log(`[Public Evidence] Found ${searchUrls.length} candidate URLs`);
    } catch (error) {
      console.log(`[Public Evidence] URL search failed: ${error.message}`);
    }

    // STEP 2: Now validate with the full name and strict criteria
    const validationPrompt = `You are a rigorous fact-checking assistant. Validate this EXACT employment claim:

CRITICAL NAME MATCHING RULE: The person's FULL NAME must match EXACTLY. Do NOT accept partial name matches.
- If searching for "Rod Little", then "John Little" or "Little & Associates" does NOT count
- BOTH first name AND last name must appear together in the source

Person: ${candidateName} (FULL NAME REQUIRED - both "${candidateName.split(' ')[0]}" and "${candidateName.split(' ').slice(-1)[0]}" must appear)
Company: ${employerName}
${jobTitle ? `Title/Role: ${jobTitle}` : ''}

${searchUrls.length > 0 ? `Priority URLs to check:\n${searchUrls.slice(0, 5).map(u => `- ${u}`).join('\n')}\n\n` : ''}

Search for evidence from CREDIBLE sources ONLY:
1. ✅ Official company website (leadership, team, about, executive bios, press releases)
2. ✅ SEC filings (10-K, 8-K, proxy statements, DEF 14A) - search for executive compensation tables
3. ✅ Reputable news (Bloomberg, Reuters, WSJ, Forbes, Business Insider, industry trade publications)
4. ✅ Company investor relations / annual reports
5. ❌ EXCLUDE LinkedIn - people fabricate profiles
6. ❌ EXCLUDE Twitter/Facebook/Instagram - unreliable
7. ❌ EXCLUDE Wikipedia - can be edited

STRICT VALIDATION RULES:
1. Full name "${candidateName}" must appear in the source (not just last name)
2. The source must clearly link this person to "${employerName}"
3. If no sources mention the full name, return found=false with confidence=0.1

Evidence Quality:
- HIGH (0.85-1.0): Company website/SEC filing shows full name, OR 2+ news articles with full name
- MEDIUM (0.6-0.84): Single reputable news article with full name matching role
- LOW (0.3-0.59): Ambiguous or weak source
- NONE (0-0.29): No full name matches found

Be honest: if you cannot find the full name "${candidateName}" in credible sources, say found=false.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          found: { type: "boolean" },
          confidence: { type: "number" },
          full_name_matched: { 
            type: "boolean",
            description: "True only if FULL name was found in sources, not just last name"
          },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                type: { type: "string" },
                quality: { type: "string" },
                snippet: { type: "string" },
                name_match_quality: {
                  type: "string",
                  description: "full_name, last_name_only, or none"
                }
              }
            }
          },
          reasoning: { type: "string" }
        }
      }
    });

    // CRITICAL: Reject if only last name matched
    if (!result.full_name_matched) {
      console.log(`[Public Evidence] ❌ REJECTED - Full name not matched for ${candidateName}`);
      return {
        found: false,
        confidence: 0.1,
        sources: [],
        reasoning: `Only partial/last name matches found - full name "${candidateName}" not confirmed in sources`
      };
    }

    // Filter out any LinkedIn sources that slipped through
    if (result.sources) {
      result.sources = result.sources.filter(s => 
        !s.url.toLowerCase().includes('linkedin.com') &&
        !s.url.toLowerCase().includes('twitter.com') &&
        !s.url.toLowerCase().includes('facebook.com') &&
        !s.url.toLowerCase().includes('instagram.com')
      );
    }

    console.log(`[Public Evidence] ✅ Found: ${result.found}, Confidence: ${result.confidence}, Sources: ${result.sources?.length || 0}`);

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
    // CRITICAL: Only verify if we actually found credible sources
    let outcome, isVerified, status;
    
    const hasCredibleSources = evidence.sources && evidence.sources.length > 0;
    
    if (evidence.found && hasCredibleSources && evidence.confidence >= 0.85) {
      // High confidence public evidence = verified
      outcome = 'verified_public_evidence';
      isVerified = true;
      status = 'completed';
    } else if (evidence.found && hasCredibleSources && evidence.confidence >= 0.6) {
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