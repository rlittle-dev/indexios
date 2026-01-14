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
  console.log(`[Public Evidence] AGGRESSIVE SEARCH for: ${candidateName} across ${employers.length} employers`);

  try {
    // STEP 1: Multi-round comprehensive search
    let allUrls = [];
    
    // Round 1: Direct searches for each employer individually (MOST EFFECTIVE)
    console.log(`[Public Evidence] Round 1: Direct employer searches...`);
    for (const employer of employers) {
      const directPrompt = `Search the internet for "${candidateName}" at "${employer.name}".

Find ANYTHING that mentions both:
- The name "${candidateName}" (or variations like first name only + last name separately)
- The company "${employer.name}"

Include:
- Company website pages (about, team, leadership, employees, staff)
- Any news articles (major or local)
- Press releases
- Business directories
- Conference materials
- Social media posts (company accounts, not personal)
- Blog posts
- ANY other source

Return EVERY URL that might mention this person at this company.`;

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: directPrompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        
        if (result.urls && result.urls.length > 0) {
          allUrls = allUrls.concat(result.urls);
          console.log(`[Public Evidence] Found ${result.urls.length} URLs for ${candidateName} + ${employer.name}`);
        }
      } catch (error) {
        console.log(`[Public Evidence] Direct search failed for ${employer.name}: ${error.message}`);
      }
    }

    // Round 2: Broad career history search
    console.log(`[Public Evidence] Round 2: Broad career search...`);
    const employerList = employers.map(e => e.name).join(', ');
    const broadPrompt = `Find any web pages about "${candidateName}" career, work history, or professional background.

Companies of interest: ${employerList}

Search for:
- Professional biography or profile pages
- Company "about us" or "team" pages
- News articles mentioning career moves
- Press releases about hiring or promotions
- Industry publication profiles
- Conference speaker bios
- Award or recognition announcements

Return all relevant URLs.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: broadPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            urls: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      if (result.urls && result.urls.length > 0) {
        allUrls = allUrls.concat(result.urls);
        console.log(`[Public Evidence] Broad search found ${result.urls.length} URLs`);
      }
    } catch (error) {
      console.log(`[Public Evidence] Broad search failed: ${error.message}`);
    }

    // Round 3: Company-specific searches (team pages, about pages)
    console.log(`[Public Evidence] Round 3: Company team/about pages...`);
    for (const employer of employers) {
      const companyPrompt = `Find the team page, about page, leadership page, or employee directory for "${employer.name}".

We're looking for pages that list employees or staff members.

Return URLs to:
- Team page
- About us page
- Leadership page
- Staff directory
- Employee profiles`;

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: companyPrompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        
        if (result.urls && result.urls.length > 0) {
          allUrls = allUrls.concat(result.urls);
          console.log(`[Public Evidence] Company pages for ${employer.name}: ${result.urls.length} URLs`);
        }
      } catch (error) {
        console.log(`[Public Evidence] Company page search failed for ${employer.name}: ${error.message}`);
      }
    }

    // Deduplicate URLs
    const searchUrls = [...new Set(allUrls)];
    console.log(`[Public Evidence] ✅ Total unique URLs found: ${searchUrls.length}`);
    
    if (searchUrls.length === 0) {
      console.log(`[Public Evidence] ⚠️ WARNING: No URLs found after 3 search rounds`);
    }

    // STEP 2: Aggressive validation with multiple passes
    console.log(`[Public Evidence] Step 2: Analyzing sources for each employer...`);
    
    const employerNames = employers.map(e => e.name).join(', ');
    
    const validationPrompt = `YOU ARE A GENEROUS EMPLOYMENT VERIFIER. Find evidence for "${candidateName}" at these companies.

COMPANIES: ${employerNames}

${searchUrls.length > 0 ? `ANALYZE ALL ${searchUrls.length} URLS:\n${searchUrls.map(u => `- ${u}`).join('\n')}\n\n` : ''}

ACCEPTANCE CRITERIA (VERY LOW BAR):
✅ ACCEPT ANY OF THESE:
- Full name "${candidateName}" anywhere on company website or in article
- First name OR last name on company team/about page
- Name variation (Jan, Janet, J. Little, etc.) with company context
- Company website mentioning them as staff/employee/founder/owner
- Any article mentioning them with the company
- Bio, profile, or description linking them to company
- Press release, announcement, or news with their name + company

❌ ONLY REJECT IF:
- Zero mention of the name at all
- Clearly a different person (wrong gender, age, location if stated)

CONFIDENCE SCORING (BE GENEROUS):
- 0.85-1.0 = Company website lists them OR 2+ sources
- 0.6-0.84 = Any article mentions them OR single company page mention  
- 0.4-0.59 = Partial name match with reasonable context
- 0.3-0.39 = Very weak/ambiguous mention
- 0.0-0.29 = Nothing found

For EACH company, return:
- found: true/false
- confidence: 0.0 to 1.0
- sources: array of {url, description}
- reasoning: what you found and why confidence level

BE GENEROUS: If you see the name and company together, that's a FIND. Default to found=true unless you're certain it's wrong.`;

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
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    console.log(`[Public Evidence] Validation complete for ${result.companies?.length || 0} companies`);

    // Map results back to employer names
    const evidenceByEmployer = {};
    
    for (const employer of employers) {
      const match = result.companies?.find(c => 
        c.company_name.toLowerCase().includes(employer.name.toLowerCase()) ||
        employer.name.toLowerCase().includes(c.company_name.toLowerCase())
      );

      // LOWERED BAR: Accept if found=true OR has sources, don't require full_name_matched
      if (match && (match.found || (match.sources && match.sources.length > 0))) {
        // Filter out personal social media only
        const validSources = (match.sources || []).filter(s => 
          !s.url.toLowerCase().includes('linkedin.com/in/') &&
          !s.url.toLowerCase().includes('twitter.com/') &&
          !s.url.toLowerCase().includes('facebook.com/') &&
          !s.url.toLowerCase().includes('instagram.com/')
        );

        // If we have sources, boost confidence even if full_name_matched is false
        const adjustedConfidence = validSources.length > 0 
          ? Math.max(match.confidence || 0.5, 0.5) // Minimum 0.5 if we have sources
          : (match.confidence || 0.3);

        evidenceByEmployer[employer.name] = {
          found: validSources.length > 0,
          confidence: adjustedConfidence,
          sources: validSources.map(s => ({
            url: s.url,
            description: s.snippet || s.type || 'Source found',
            type: s.type,
            quality: s.quality
          })),
          reasoning: match.reasoning || 'Employment mention found',
          roleMentioned: match.role_mentioned
        };
      } else {
        evidenceByEmployer[employer.name] = {
          found: false,
          confidence: 0.1,
          sources: [],
          reasoning: match?.reasoning || `No credible sources found for ${candidateName} at ${employer.name}`
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
      
      console.log(`[Public Evidence] Building result for ${employer.name}:`);
      console.log(`  Found: ${evidence.found}, Confidence: ${evidence.confidence}`);
      console.log(`  Sources: ${evidence.sources?.length || 0}`);
      
      if (evidence.found && evidence.sources && evidence.sources.length > 0) {
        evidence.sources.forEach((source, idx) => {
          const label = source.description || `Source ${idx + 1}: ${source.type || 'web page'}`;
          artifacts.push(addArtifact(
            label,
            'public_evidence',
            source.url || '',
            evidence.reasoning
          ));
          console.log(`    Source ${idx + 1}: ${source.url}`);
        });
      } else {
        artifacts.push(addArtifact(
          'No public evidence found',
          'public_evidence',
          '',
          evidence.reasoning
        ));
      }

      // Determine outcome - LOWERED THRESHOLDS
      let outcome, isVerified, status;
      const hasCredibleSources = evidence.sources && evidence.sources.length > 0;
      
      // 0.4+ with sources = verified
      if (evidence.found && hasCredibleSources && evidence.confidence >= 0.4) {
        outcome = 'verified_public_evidence';
        isVerified = evidence.confidence >= 0.7; // Only mark fully verified if 0.7+
        status = 'completed';
      } else if (evidence.found) {
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
      
      console.log(`  Final outcome: ${outcome}, verified: ${isVerified}`);
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