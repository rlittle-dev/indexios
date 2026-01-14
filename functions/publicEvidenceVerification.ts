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
    // Use LLM with web context to find and validate evidence
    const prompt = `You are a rigorous fact-checking assistant. Validate this EXACT employment claim:

CRITICAL NAME MATCHING RULE: The person's FULL NAME must match EXACTLY. Do NOT accept partial name matches (e.g., if searching for "Rod Little", "John Little" or "Little Company" does NOT count).

Person: ${candidateName} (FULL NAME REQUIRED)
Company: ${employerName}
${jobTitle ? `Title/Role: ${jobTitle}` : ''}

Search for evidence from CREDIBLE sources ONLY:
1. ✅ Official company website (leadership pages, team pages, about us, executive bios)
2. ✅ Company press releases / investor relations / news room
3. ✅ SEC filings (10-K, 8-K, proxy statements, DEF 14A) - excellent for executives
4. ✅ Reputable news articles (Bloomberg, Reuters, WSJ, Forbes, industry publications)
5. ✅ Company blog posts or official announcements
6. ❌ EXCLUDE LinkedIn - people can fabricate profiles
7. ❌ EXCLUDE social media (Twitter, Facebook, Instagram) - unreliable
8. ❌ EXCLUDE Wikipedia - can be edited by anyone

VALIDATION CHECKLIST:
- Does the source mention the FULL name "${candidateName}" (not just last name)?
- Does it clearly associate this person with "${employerName}"?
- Is the source from an official/credible channel?
${jobTitle ? `- Does it mention their role as "${jobTitle}" or similar?` : ''}

Evidence Quality Scoring:
- HIGH (0.85-1.0): Official company source + full name match, OR multiple reputable news sources, OR SEC filing with full name
- MEDIUM (0.6-0.84): Single reputable news article with full name, OR company source with partial role match
- LOW (0.3-0.59): Weak sources, partial matches, or ambiguous references
- REJECT (0-0.29): Only last name matches, LinkedIn/social media, or no credible sources

Return your findings:`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
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