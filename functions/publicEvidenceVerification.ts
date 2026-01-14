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
    // STEP 1: Comprehensive URL discovery - search multiple angles
    const searchPrompts = [
      // Primary search - direct career mentions
      `Find web pages that mention "${candidateName}" and their work history at: ${employerNames}

Search BROADLY across:
- Company websites: about us, leadership, team pages, executive bios, board members, employee spotlights
- Company press releases and announcements (any PR service)
- SEC filings (10-K, 8-K, proxy statements, DEF 14A) for public companies
- News articles from ANY publication (major national news, regional/local news, industry trade journals, online publications)
- Business journals and local business news
- Industry-specific publications and newsletters
- Conference speaker pages, event listings, webinar descriptions
- Patent filings and research publications
- Award announcements and professional recognition
- Podcast transcripts and video descriptions

Return ALL relevant URLs - cast a very wide net.`,

      // Secondary search - news and media
      `Search for ANY news articles, blog posts, or media mentions of "${candidateName}" connected to: ${employerNames}

Include EVERYTHING:
- Press releases from any PR service (PR Newswire, Business Wire, GlobeNewswire, etc.)
- Industry news sites and trade publications (any publication)
- Local business journals and regional news
- Company blogs and employee spotlight posts
- Professional association announcements
- Award announcements and recognition (any level)
- Speaking engagements and conference materials
- Podcast episodes and video content
- Newsletter mentions and email archives
- University/alumni publications
- Chamber of commerce announcements

Return ALL URLs that mention the person - be very broad.`,

      // Tertiary search - any professional context
      `Find ANY professional mentions of "${candidateName}" related to: ${employerNames}

Look EVERYWHERE:
- Company blog posts, case studies, customer stories
- Podcast transcripts, video descriptions, YouTube content
- Webinar speaker bios and virtual event materials
- Corporate reports (CSR, annual, sustainability, diversity)
- Acquisition and merger announcements
- Product launch announcements and marketing materials
- Grant announcements and funding news
- Community involvement and volunteer activities
- Professional certifications and credentials
- Expert commentary and quotes in articles
- Guest articles or contributed content
- Panel discussions and roundtables

Return ALL URLs with any professional mention - leave no stone unturned.`
    ];

    let allUrls = [];
    for (const prompt of searchPrompts) {
      try {
        const searchResult = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        if (searchResult.urls && searchResult.urls.length > 0) {
          allUrls = allUrls.concat(searchResult.urls);
        }
      } catch (error) {
        console.log(`[Public Evidence] Search round failed: ${error.message}`);
      }
    }
    
    // ADDITIONAL SEARCH: Direct name + company queries for each employer
    for (const employer of employers) {
      try {
        const directSearch = await base44.integrations.Core.InvokeLLM({
          prompt: `Find ANY articles or web pages mentioning "${candidateName}" and "${employer.name}" together.

Search for:
- "${candidateName}" AND "${employer.name}"
- "${candidateName}" + role/title at "${employer.name}"
- News about "${candidateName}" at "${employer.name}"
- "${employer.name}" + employee/staff/team + "${candidateName}"

Return ALL URLs found, no matter how small the publication.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        
        if (directSearch.urls && directSearch.urls.length > 0) {
          allUrls = allUrls.concat(directSearch.urls);
          console.log(`[Public Evidence] Direct search for ${candidateName} + ${employer.name}: found ${directSearch.urls.length} URLs`);
        }
      } catch (error) {
        console.log(`[Public Evidence] Direct search failed for ${employer.name}: ${error.message}`);
      }
    }

    // Deduplicate URLs
    const searchUrls = [...new Set(allUrls)];
    console.log(`[Public Evidence] Found ${searchUrls.length} unique candidate URLs`);
    
    if (searchUrls.length === 0) {
      console.log(`[Public Evidence] No URLs found, may indicate low public profile`);
    }

    // STEP 2: Deep validation across all discovered sources
    const validationPrompt = `You are conducting a COMPREHENSIVE employment verification for "${candidateName}".

SEARCH EVERYWHERE - BE EXTREMELY THOROUGH:
1. Company websites (any page mentioning employees)
2. ALL news articles (major outlets, local news, trade publications, blogs)
3. Press releases (any service)
4. SEC filings for public companies
5. Conference speaker lists
6. Award announcements
7. Podcast transcripts
8. Company social media posts (non-personal accounts)
9. Business directories
10. Industry reports

Companies to verify: ${employerNames}

${searchUrls.length > 0 ? `ANALYZE THESE SOURCES (${searchUrls.length} total):\n${searchUrls.slice(0, 20).map(u => `- ${u}`).join('\n')}\n\n` : ''}

MATCHING RULES (be FLEXIBLE):
- ACCEPT: Full name "${candidateName}" with company name
- ACCEPT: First name + last name separately if context is clear (e.g., "Janet" in article about "The Little Plucky" leadership)
- ACCEPT: Last name with clear role/title at the company (if unambiguous)
- ACCEPT: Variations like nicknames if context confirms (e.g., "Jan Little" for "Janet Little")
- EXCLUDE ONLY: Different people with same name (check context carefully)

For EACH company:
1. Search AGGRESSIVELY - use company name variations, nicknames, common misspellings
2. Report ANY article, press release, or mention found
3. Include context that confirms this is the right person
4. If you find partial matches (just last name), explain what you found

CONFIDENCE SCORING (be GENEROUS):
- HIGH (0.85-1.0): ANY credible article or company website mention with clear employment context, OR multiple weak mentions
- MEDIUM (0.6-0.84): Single mention with some ambiguity, OR partial name match with strong context
- LOW (0.3-0.59): Very brief mention or uncertain context
- NONE (0-0.29): Literally nothing found after exhaustive search

CRITICAL: If information exists online, YOU MUST FIND IT. Search multiple times with different query approaches. Accept almost any credible source.`;

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