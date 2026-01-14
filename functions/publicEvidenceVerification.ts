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

Search for:
- Company websites: about us, leadership, team pages, executive bios, board members
- Company press releases and announcements
- SEC filings (10-K, 8-K, proxy statements, DEF 14A)
- News articles from business publications (Bloomberg, Reuters, WSJ, Forbes, Business Insider, TechCrunch)
- Industry publications and trade journals
- Conference speaker pages and event listings
- Patent filings and research publications

Return ALL relevant URLs.`,

      // Secondary search - news and media
      `Search news articles and media coverage mentioning "${candidateName}" in connection with any of: ${employerNames}

Include:
- Press releases from PR Newswire, Business Wire, GlobeNewswire
- Industry news sites and trade publications
- Local business journals
- Professional association announcements
- Award announcements and recognition
- Speaking engagements and conference materials

Return URLs to articles and news sources.`,

      // Tertiary search - professional context
      `Find professional mentions of "${candidateName}" related to work at: ${employerNames}

Look for:
- Company blog posts and case studies
- Podcast transcripts and video descriptions
- Webinar speaker bios
- Corporate social responsibility reports
- Annual reports and sustainability reports
- Acquisition and merger announcements
- Product launch announcements

Return URLs that show professional activity.`
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
3. EXCLUDE LinkedIn, Twitter, Facebook, Instagram, Wikipedia, personal blogs
4. ONLY use: company websites, SEC filings, reputable news outlets, press releases, industry publications

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

CONFIDENCE SCORING:
- HIGH (0.85-1.0): Multiple high-quality sources (company website + news, or SEC filing + press release, or 3+ news articles)
- MEDIUM (0.6-0.84): Single high-quality source (company website OR reputable news article with full name and role)
- LOW (0.3-0.59): Weak or ambiguous sources (brief mentions, unclear context)
- NONE (0-0.29): No full name matches or credible sources found

Be thorough - spend time analyzing all sources for lower-profile candidates.`;

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