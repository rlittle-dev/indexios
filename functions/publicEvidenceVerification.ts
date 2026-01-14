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
    
    const validationPrompt = `CRITICAL MISSION: Find employment evidence for "${candidateName}".

TARGET COMPANIES: ${employerNames}

YOU HAVE ${searchUrls.length} URLS TO ANALYZE. Your job is to find ANY mention of "${candidateName}" working at these companies.

${searchUrls.length > 0 ? `URLS TO CHECK:\n${searchUrls.map(u => `- ${u}`).join('\n')}\n\n` : ''}

SEARCH RULES (VERY FLEXIBLE):
✅ ACCEPT if you find:
- Full name "${candidateName}" + company name together
- First and last name separately on same page with company context
- Last name + clear job title at the company
- Any name variation (nicknames, shortened names) with company
- Professional bio mentioning the company
- Company page listing them as employee/team member
- Any article mentioning them in context of the company

❌ ONLY REJECT if:
- Completely different person (wrong industry/location/context)
- No connection to the company at all

For EACH company, you MUST:
1. Check ALL provided URLs thoroughly
2. Use the company website domain if found in URLs
3. Report EVERYTHING you find, even weak/ambiguous mentions
4. If found on company website = HIGH confidence (0.85+)
5. If found in any article = MEDIUM confidence (0.65+)
6. If partial/unclear = LOW confidence (0.4+)

RESPOND WITH: For each company, state found/not found, list sources with URLs, and assign confidence.

IF YOU DON'T FIND ANYTHING: Double-check you analyzed all URLs. This person likely HAS public information.`;

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