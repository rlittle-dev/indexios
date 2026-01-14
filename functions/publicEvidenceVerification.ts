import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * People Evidence Verification - Multi-Employer
 * Confirms PERSON ↔ COMPANY ↔ ROLE links using credible sources
 * Priority: 1) RocketReach, 2) Company site, 3) Press/News
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
    
    // Round 0: RocketReach profile search (HIGHEST PRIORITY)
    console.log(`[People Evidence] Round 0: RocketReach profile search (PRIMARY SOURCE)...`);
    const employerList = employers.map(e => e.name).join(' OR ');
    const rocketReachPrompt = `Search Google for: "${candidateName} RocketReach ${employerList}"

Find the RocketReach profile page (rocketreach.co) for this person that shows their career history.

Return ONLY the RocketReach profile URL (must contain rocketreach.co).`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: rocketReachPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            urls: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      if (result.urls && result.urls.length > 0) {
        const rocketReachUrls = result.urls.filter(u => u.includes('rocketreach.co'));
        if (rocketReachUrls.length > 0) {
          allUrls = allUrls.concat(rocketReachUrls);
          console.log(`[People Evidence] 🚀 RocketReach: ${rocketReachUrls.length} profile(s) found`);
        }
      } else {
        console.log(`[People Evidence] ⚠️ No RocketReach profile found`);
      }
    } catch (error) {
      console.log(`[People Evidence] RocketReach search failed: ${error.message}`);
    }
    
    // Round 1: Direct searches for each employer individually
    console.log(`[Public Evidence] Round 1: Direct employer searches...`);
    for (const employer of employers) {
      // Search 1a: Current/general mention
      const directPrompt = `Search for "${candidateName}" "${employer.name}"

Find ANY web pages mentioning both the person and company:
- Company website (team, about, staff pages)
- News articles or press releases
- Professional bios or profiles
- Conference materials
- ANY article or page mentioning both

Return ALL URLs found.`;

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
          console.log(`[Public Evidence] Direct search: ${result.urls.length} URLs for ${candidateName} + ${employer.name}`);
        }
      } catch (error) {
        console.log(`[Public Evidence] Direct search failed: ${error.message}`);
      }

      // Search 1b: Past employment/career history
      const careerPrompt = `Find articles about "${candidateName}" career history that mention past work at "${employer.name}"

Include:
- Career profiles or bios mentioning past employment
- News about job changes ("previously at", "formerly with")
- Alumni pages or directories
- Professional history summaries
- ANY mention of past work experience

Return ALL URLs.`;

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: careerPrompt,
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
          console.log(`[Public Evidence] Career history search: ${result.urls.length} URLs for ${candidateName}`);
        }
      } catch (error) {
        console.log(`[Public Evidence] Career search failed: ${error.message}`);
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
    console.log(`[Public Evidence] Round 4: Company team/about pages...`);
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
    
    const validationPrompt = `YOU ARE A PEOPLE EVIDENCE VERIFIER. Confirm employment for "${candidateName}" at these companies.

COMPANIES: ${employerNames}

${searchUrls.length > 0 ? `ANALYZE ALL ${searchUrls.length} URLS:\n${searchUrls.map(u => `- ${u}`).join('\n')}\n\n` : ''}

SOURCE PRIORITY (analyze in this order):
1. **ROCKETREACH** (rocketreach.co) - Shows current/past positions and career history
   - If found: extract role, company, time period from the profile
   - Confidence 0.85+ if company matches
   - Return snippet: "{role} at {company} (dates if shown)"
2. **Company website** - Staff directory, team page, about page
   - Confidence 0.8+ if name appears on company site
3. **Press/News** - Articles mentioning the person's role at the company
   - Confidence 0.6+ for credible news sources

ACCEPTANCE RULES:
✅ ACCEPT if:
- RocketReach shows company in current or past positions
- Company website lists them as staff/employee
- News article mentions their role at the company
- Name appears with role/title connected to company

❌ REJECT if:
- No mention at all
- Different person (wrong industry/location)
- Personal social media only (LinkedIn/Twitter/Facebook profiles)

For EACH company, return:
- found: true/false
- confidence: 0.0 to 1.0
- source_type: "rocketreach" | "company_site" | "press" | "other"
- sources: array of {url, description, snippet}
  - snippet should be 1-2 lines showing the match (e.g., "Software Engineer at Company X (2020-2023)")
- reasoning: brief explanation

CRITICAL: Prioritize RocketReach results and extract specific role/dates from the profile!`;

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
                source_type: { 
                  type: "string",
                  enum: ["rocketreach", "company_site", "press", "other"]
                },
                role_mentioned: { type: "string" },
                time_period: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      description: { type: "string" },
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

      if (match && (match.found || (match.sources && match.sources.length > 0))) {
        // Filter out personal social media
        const validSources = (match.sources || []).filter(s => 
          !s.url.toLowerCase().includes('linkedin.com/in/') &&
          !s.url.toLowerCase().includes('twitter.com/') &&
          !s.url.toLowerCase().includes('facebook.com/') &&
          !s.url.toLowerCase().includes('instagram.com/')
        );

        const adjustedConfidence = match.confidence || (validSources.length > 0 ? 0.5 : 0.3);

        evidenceByEmployer[employer.name] = {
          found: validSources.length > 0,
          confidence: adjustedConfidence,
          sourceType: match.source_type || 'other',
          sources: validSources.map(s => ({
            url: s.url,
            description: s.description || s.snippet || 'Source found',
            snippet: s.snippet || ''
          })),
          reasoning: match.reasoning || 'Employment evidence found',
          roleMentioned: match.role_mentioned,
          timePeriod: match.time_period
        };
      } else {
        evidenceByEmployer[employer.name] = {
          found: false,
          confidence: 0.1,
          sourceType: 'none',
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

    const { candidateName, employers, candidateId } = await req.json();

    if (!candidateName || !employers || !Array.isArray(employers)) {
      return Response.json({ 
        error: 'Missing required fields: candidateName, employers (array)' 
      }, { status: 400 });
    }

    // Check cache for existing verified evidence (per employer)
    const cachedResults = {};
    if (candidateId) {
      for (const employer of employers) {
        const cached = await base44.asServiceRole.entities.EmployerVerification.filter({
          candidateId,
          employerName: employer.name,
          outcome: 'verified_public_evidence',
          status: 'completed'
        }, '-created_date', 1);

        if (cached.length > 0) {
          const cachedVerif = cached[0];
          console.log(`[Public Evidence] ✅ CACHE HIT for ${candidateName} at ${employer.name}`);
          
          cachedResults[employer.name] = {
            found: true,
            confidence: cachedVerif.confidence || 0.8,
            outcome: cachedVerif.outcome,
            isVerified: cachedVerif.isVerified,
            status: cachedVerif.status,
            artifacts: cachedVerif.proofArtifacts || [],
            reasoning: `Cached verification result from ${new Date(cachedVerif.created_date).toLocaleDateString()}`
          };
        }
      }
    }

    // Only search for employers not in cache
    const employersToSearch = employers.filter(e => !cachedResults[e.name]);
    console.log(`[Public Evidence] Cache: ${Object.keys(cachedResults).length} found, searching ${employersToSearch.length} employers`);

    let evidenceByEmployer = {};
    if (employersToSearch.length > 0) {
      evidenceByEmployer = await searchPublicEvidenceMultiEmployer(base44, candidateName, employersToSearch);
    }

    // Build response with artifacts for each employer
    const results = {};
    
    for (const employer of employers) {
      // Use cached result if available
      if (cachedResults[employer.name]) {
        results[employer.name] = cachedResults[employer.name];
        console.log(`[Public Evidence] Using cached result for ${employer.name}`);
        continue;
      }

      const evidence = evidenceByEmployer[employer.name];
      const artifacts = [];
      
      console.log(`[Public Evidence] Building result for ${employer.name}:`);
      console.log(`  Found: ${evidence.found}, Confidence: ${evidence.confidence}`);
      console.log(`  Sources: ${evidence.sources?.length || 0}`);
      
      if (evidence.found && evidence.sources && evidence.sources.length > 0) {
        evidence.sources.forEach((source, idx) => {
          const isRocketReach = evidence.sourceType === 'rocketreach';
          const label = isRocketReach 
            ? `RocketReach: ${evidence.roleMentioned || 'Employment'} at ${employer.name}${evidence.timePeriod ? ` (${evidence.timePeriod})` : ''}`
            : (source.description || `Source ${idx + 1}: ${evidence.sourceType}`);
          
          artifacts.push(addArtifact(
            label,
            'people_evidence',
            source.url || '',
            source.snippet || evidence.reasoning
          ));
          console.log(`    [${evidence.sourceType}] ${source.url}`);
        });
      } else {
        artifacts.push(addArtifact(
          'No people evidence found',
          'people_evidence',
          '',
          evidence.reasoning
        ));
      }

      // Determine outcome based on evidence type and confidence
      let outcome, isVerified, status;
      const hasCredibleSources = evidence.sources && evidence.sources.length > 0;
      const isRocketReach = evidence.sourceType === 'rocketreach';
      
      if (evidence.found && hasCredibleSources) {
        if (isRocketReach && evidence.confidence >= 0.75) {
          outcome = 'people_evidence_found';
          isVerified = true;
          status = 'completed';
        } else if (evidence.confidence >= 0.7) {
          outcome = 'people_evidence_found';
          isVerified = true;
          status = 'completed';
        } else if (evidence.confidence >= 0.4) {
          outcome = 'people_evidence_found';
          isVerified = false;
          status = 'action_required'; // Weak evidence, may need follow-up
        } else {
          outcome = 'contact_identified';
          isVerified = false;
          status = 'action_required';
        }
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