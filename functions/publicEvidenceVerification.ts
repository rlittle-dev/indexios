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

    // Deduplicate URLs
    const searchUrls = [...new Set(allUrls)];
    console.log(`[Public Evidence] Found ${searchUrls.length} unique candidate URLs`);
    
    if (searchUrls.length === 0) {
      console.log(`[Public Evidence] No URLs found, may indicate low public profile`);
    }

    // STEP 2: Deep validation across all discovered sources
    const validationPrompt = `You are conducting a comprehensive employment verification for "${candidateName}".

CRITICAL VERIFICATION RULES:
1. Full name "${candidateName}" must appear (both first and last name together)
2. Do NOT accept just last name matches or similar names
3. EXCLUDE ONLY: LinkedIn, Twitter, Facebook, Instagram, Wikipedia (personal social media)
4. ACCEPT ANY credible sources including: company websites, SEC filings, ANY news outlets (major or local), press releases, industry publications, trade journals, local business news, company blogs, professional podcasts, conference materials, patents, research papers, awards/recognition announcements, speaking engagements

BE BROAD: Accept any professional mention that confirms employment, even from smaller publications or local news

Companies to verify: ${employerNames}

${searchUrls.length > 0 ? `SOURCES TO ANALYZE (${searchUrls.length} total):\n${searchUrls.slice(0, 20).map(u => `- ${u}`).join('\n')}\n\n` : ''}

THOROUGH ANALYSIS REQUIRED:
For EACH company, perform comprehensive search:
- Check company website (about, team, leadership, press releases)
- Review SEC filings (10-K, 8-K, proxy statements for executive mentions)
- Search news archives (Bloomberg, Reuters, WSJ, Forbes, Business Insider, TechCrunch)
- Check press release databases (PR Newswire, Business Wire)
- Review industry publications and trade journals
- Look for conference speaker listings and event participation
- Check patent filings and research publications

For EACH company, determine:
- Did you find the full name "${candidateName}" explicitly mentioned with this company?
- What specific sources confirm this employment?
- What was their role/title (if mentioned)?
- What dates or timeframe (if mentioned)?
- What context provides confidence this is the correct person?

Return results for each company separately, even if one source mentions multiple employers.

CONFIDENCE SCORING (be generous for confirmable employment):
- HIGH (0.85-1.0): Multiple sources (company website + any article, OR 2+ articles from any publications, OR SEC filing)
- MEDIUM (0.6-0.84): Single credible source (company website OR any news article OR press release with full name and employment context)
- LOW (0.3-0.59): Brief or ambiguous mentions (unclear context, partial information)
- NONE (0-0.29): No full name matches or credible sources found

IMPORTANT: Be thorough and BROAD - analyze ALL available sources. Accept evidence from any credible publication (major or local). For lower-profile candidates, a single solid article or company website mention should score MEDIUM (0.6-0.7). Multiple mentions from any sources should score HIGH.`;

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