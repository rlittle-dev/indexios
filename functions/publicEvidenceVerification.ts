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
  console.log(`[Public Evidence] THOROUGH SEARCH for: ${candidateName} across ${employers.length} employers`);

  const employerNames = employers.map(e => e.name).join(', ');
  const allUrls = new Set();

  try {
    // STEP 1: Multiple comprehensive URL discovery passes
    console.log('[Public Evidence] Starting multi-pass URL discovery...');
    
    // Pass 1: General career/employment search
    const searchPrompts = [
      `Search exhaustively for "${candidateName}" employment history and career information.

Find ALL pages mentioning their work at: ${employerNames}

Search for:
1. Company websites: About, Leadership, Team, Board of Directors, Executives, Management
2. SEC filings (10-K, 8-K, proxy statements, DEF 14A)
3. Press releases from companies or PR Newswire
4. News articles from: Bloomberg, Reuters, WSJ, Forbes, Business Insider, Fortune, CNBC
5. Company annual reports and investor relations
6. Industry publications and trade journals
7. Professional association websites
8. University/alumni pages if applicable

Be thorough - return 15-20 URLs minimum.`,

      `Find specific evidence of "${candidateName}" working at these companies: ${employerNames}

Focus on:
- Executive announcements and appointments
- Company press releases about personnel
- SEC proxy statements (executives and compensation)
- Earnings calls transcripts mentioning leadership
- Merger/acquisition announcements with leadership teams
- Board member lists and bios
- Company history/timeline pages

Return all relevant URLs found.`,

      `Search for "${candidateName}" in official company documentation:

Companies: ${employerNames}

Look for:
- Official company biographies
- Annual reports (PDF and web versions)
- Investor presentations
- Corporate governance documents
- Press room archives
- Leadership team pages
- Historical company records

Find as many sources as possible.`
    ];

    // Execute all search passes
    for (let i = 0; i < searchPrompts.length; i++) {
      console.log(`[Public Evidence] URL discovery pass ${i + 1}/${searchPrompts.length}...`);
      try {
        const searchResult = await base44.integrations.Core.InvokeLLM({
          prompt: searchPrompts[i],
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              urls: { type: "array", items: { type: "string" } }
            }
          }
        });
        (searchResult.urls || []).forEach(url => allUrls.add(url));
        console.log(`[Public Evidence] Pass ${i + 1}: Found ${searchResult.urls?.length || 0} URLs (total unique: ${allUrls.size})`);
      } catch (error) {
        console.log(`[Public Evidence] Pass ${i + 1} failed: ${error.message}`);
      }
    }

    const searchUrls = Array.from(allUrls);
    console.log(`[Public Evidence] ✅ URL discovery complete: ${searchUrls.length} unique URLs found`);

    // STEP 2: Comprehensive validation with multiple evidence gathering passes
    console.log('[Public Evidence] Starting thorough evidence validation...');
    
    const validationPrompt = `COMPREHENSIVE EMPLOYMENT VERIFICATION for "${candidateName}"

You have access to ${searchUrls.length} potential sources. Be EXTREMELY thorough.

CRITICAL VERIFICATION RULES:
1. Full name "${candidateName}" MUST appear (first AND last name together)
2. REJECT: LinkedIn, Twitter, Facebook, Instagram, Wikipedia, personal blogs
3. ACCEPT ONLY: Company websites, SEC filings, reputable news outlets, official press releases
4. CHECK EVERY SOURCE - don't stop at first match

COMPANIES TO VERIFY: ${employerNames}

Priority sources (${Math.min(searchUrls.length, 20)} most relevant):
${searchUrls.slice(0, 20).map((u, i) => `${i + 1}. ${u}`).join('\n')}

For EACH company:
1. Search ALL available sources thoroughly
2. Verify full name appears with company association
3. Extract job title/role if mentioned
4. Note all credible sources found
5. Assess overall confidence based on source quality and quantity

CONFIDENCE SCORING:
- 0.95-1.0: Multiple high-quality sources (SEC filings + company site, OR 3+ news articles)
- 0.85-0.94: Company website OR SEC filing with clear mention, OR 2 news sources
- 0.70-0.84: Single reputable news article with full name
- 0.50-0.69: Weak single source or ambiguous mention
- 0.0-0.49: No credible evidence found

Return results for EACH company separately. If one source mentions multiple companies, list it for each relevant company.`;

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

    console.log(`[Public Evidence] ✅ Validation complete for ${result.companies?.length || 0} companies`);

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