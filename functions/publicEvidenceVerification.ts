import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Public Evidence Verification - Multi-Employer
 * Searches for public evidence across ALL employers for a candidate
 * Returns evidence mapped to each employer
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

async function searchPublicEvidenceMultiEmployer(base44, candidateName, employers) {
  console.log(`[Public Evidence] Searching for: ${candidateName} across ${employers.length} employers`);

  const employerNames = employers.map(e => e.name).join(', ');

  try {
    // STEP 1: Find relevant URLs - COMPREHENSIVE SEARCH
    // Multiple search attempts to ensure consistency
    let allUrls = [];
    
    // Search 1: General employment history
    const searchPrompt1 = `Search for pages mentioning "${candidateName}" in a professional context.

Find MULTIPLE sources for: ${employerNames}

Priority sources:
1. Company websites (about us, leadership, team, executives, board members)
2. SEC filings and regulatory documents
3. News articles (Bloomberg, Reuters, WSJ, Forbes, Business Insider)
4. Press releases and announcements
5. Company blogs and official publications

Return at least 10-15 relevant URLs.`;

    try {
      const searchResult1 = await base44.integrations.Core.InvokeLLM({
        prompt: searchPrompt1,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            urls: { type: "array", items: { type: "string" } }
          }
        }
      });
      allUrls.push(...(searchResult1.urls || []));
    } catch (error) {
      console.log(`[Public Evidence] Search 1 failed: ${error.message}`);
    }

    // Search 2: Company-specific searches for each employer
    for (const employer of employers) {
      const searchPrompt2 = `Find pages showing "${candidateName}" worked at ${employer.name}.

Search for:
- ${employer.name} leadership/team pages
- ${employer.name} press releases mentioning ${candidateName}
- News about ${candidateName} at ${employer.name}
- SEC filings for ${employer.name} (if public company)

Return relevant URLs.`;

      try {
        const searchResult2 = await base44.integrations.Core.InvokeLLM({
          prompt: searchPrompt2,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        allUrls.push(...(searchResult2.urls || []));
      } catch (error) {
        console.log(`[Public Evidence] Search 2 for ${employer.name} failed: ${error.message}`);
      }
    }

    // Deduplicate URLs
    const searchUrls = [...new Set(allUrls)];
    console.log(`[Public Evidence] Found ${searchUrls.length} total URLs from comprehensive search`);

    // STEP 2: Validate employment at each company - THOROUGH VALIDATION
    const validationPrompt = `You are conducting a COMPREHENSIVE employment verification for "${candidateName}".

CRITICAL VERIFICATION RULES:
1. FULL NAME MATCH REQUIRED: "${candidateName}" must appear with both first AND last name
2. NO PARTIAL MATCHES: Reject last name only or first name only
3. BANNED SOURCES: LinkedIn, Twitter, Facebook, Instagram, Wikipedia, personal blogs
4. TRUSTED SOURCES ONLY: Company websites, SEC filings, news (Bloomberg, Reuters, WSJ, Forbes, Business Insider), official press releases

COMPANIES TO VERIFY: ${employerNames}

AVAILABLE SOURCES (use ALL relevant):
${searchUrls.length > 0 ? searchUrls.map((u, i) => `${i + 1}. ${u}`).join('\n') : 'No specific URLs provided - use web search'}

VERIFICATION PROCESS:
For EACH company, you must:
1. Search thoroughly for "${candidateName}" + company name
2. Look for MULTIPLE sources (don't stop at one)
3. Check company official pages, press releases, SEC filings
4. Verify full name appears in context of employment/role
5. Note the specific role/title if mentioned

QUALITY STANDARDS:
- HIGH CONFIDENCE (0.85-1.0): 
  * Company website/SEC filing explicitly lists them, OR
  * 2+ credible news sources confirm employment, OR
  * Official press release names them in a role
  
- MEDIUM CONFIDENCE (0.6-0.84): 
  * Single credible news article with full name, OR
  * Company blog post mentioning them
  
- LOW CONFIDENCE (0.3-0.59): 
  * Ambiguous mentions
  * Weak sources
  
- NO EVIDENCE (0-0.29): 
  * No full name match found
  * Only social media mentions

IMPORTANT: If one source (like SEC filing) mentions multiple employers, apply that evidence to ALL relevant companies.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company_name: { type: "string" },
                found: { type: "boolean" },
                confidence: { type: "number" },
                full_name_matched: { type: "boolean" },
                role_mentioned: { type: "string" },
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
                reasoning: { type: "string" },
                search_depth: { type: "string" }
              }
            }
          }
        }
      }
    });

    console.log(`[Public Evidence] Comprehensive validation complete:`);
    console.log(`- Total companies checked: ${result.companies?.length || 0}`);
    console.log(`- Evidence found for: ${result.companies?.filter(c => c.found).length || 0} companies`);
    console.log(`- Total sources discovered: ${result.companies?.reduce((sum, c) => sum + (c.sources?.length || 0), 0)}`);

    // Map results back to employer names
    const evidenceByEmployer = {};
    
    for (const employer of employers) {
      const match = result.companies?.find(c => 
        c.company_name.toLowerCase().includes(employer.name.toLowerCase()) ||
        employer.name.toLowerCase().includes(c.company_name.toLowerCase())
      );

      if (match && match.full_name_matched && match.sources && match.sources.length > 0) {
        // Filter out social media
        const validSources = match.sources.filter(s => 
          !s.url.toLowerCase().includes('linkedin.com') &&
          !s.url.toLowerCase().includes('twitter.com') &&
          !s.url.toLowerCase().includes('facebook.com') &&
          !s.url.toLowerCase().includes('instagram.com')
        );

        evidenceByEmployer[employer.name] = {
          found: match.found,
          confidence: match.confidence,
          sources: validSources,
          reasoning: match.reasoning,
          roleMentioned: match.role_mentioned
        };
      } else {
        evidenceByEmployer[employer.name] = {
          found: false,
          confidence: 0.1,
          sources: [],
          reasoning: match?.reasoning || `No full name match found for ${candidateName} at ${employer.name}`
        };
      }
    }

    return evidenceByEmployer;

  } catch (error) {
    console.error('[Public Evidence] Search error:', error);
    const errorResult = {};
    for (const employer of employers) {
      errorResult[employer.name] = {
        found: false,
        confidence: 0,
        sources: [],
        reasoning: `Error during search: ${error.message}`
      };
    }
    return errorResult;
  }
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
        error: 'Missing required fields: candidateName, employers (array)' 
      }, { status: 400 });
    }

    const evidenceByEmployer = await searchPublicEvidenceMultiEmployer(base44, candidateName, employers);

    // Build response with artifacts for each employer
    const results = {};
    
    for (const employer of employers) {
      const evidence = evidenceByEmployer[employer.name];
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

      // Determine outcome
      let outcome, isVerified, status;
      const hasCredibleSources = evidence.sources && evidence.sources.length > 0;
      
      if (evidence.found && hasCredibleSources && evidence.confidence >= 0.85) {
        outcome = 'verified_public_evidence';
        isVerified = true;
        status = 'completed';
      } else if (evidence.found && hasCredibleSources && evidence.confidence >= 0.6) {
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
        reasoning: evidence.reasoning
      };
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Public evidence verification error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});