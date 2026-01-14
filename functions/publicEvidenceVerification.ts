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

/**
 * Calculate confidence score for public evidence
 * Rules:
 * - Base 0.50 if any evidence exists
 * - +0.30 for employer domain or SEC filing
 * - +0.20 for second independent reputable source
 * - +0.10 for exact role match in snippet
 * - Cap at 0.95
 */
function calculateConfidence(sources, employerName, candidateName, roleMentioned) {
  if (!sources || sources.length === 0) return 0.1;

  let confidence = 0.50; // Base confidence

  // Normalize employer domain for matching
  const employerDomain = employerName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,&]/g, '')
    .replace(/inc|corp|llc|ltd|limited|company|co$/g, '')
    .trim();

  // Check for primary source (employer domain or SEC)
  const hasPrimarySource = sources.some(s => {
    const url = s.url.toLowerCase();
    return url.includes(employerDomain) || 
           url.includes('sec.gov') ||
           s.type.toLowerCase().includes('sec') ||
           s.type.toLowerCase().includes('company website');
  });

  if (hasPrimarySource) {
    confidence += 0.30;
  }

  // Check for independent reputable sources (news, Equilar, Bloomberg, Reuters, etc.)
  const reputableDomains = ['equilar.com', 'bloomberg.com', 'reuters.com', 'wsj.com', 
                             'forbes.com', 'businessinsider.com', 'marketwatch.com',
                             'cnbc.com', 'ft.com'];
  const hasIndependentSource = sources.some(s => 
    reputableDomains.some(domain => s.url.toLowerCase().includes(domain)) ||
    (s.quality === 'HIGH' && !s.url.toLowerCase().includes(employerDomain))
  );

  if (hasIndependentSource && sources.length >= 2) {
    confidence += 0.20;
  }

  // Check for exact role match in snippets
  if (roleMentioned) {
    const roleInSnippet = sources.some(s => {
      const snippet = s.snippet?.toLowerCase() || '';
      const role = roleMentioned.toLowerCase();
      const name = candidateName.toLowerCase();
      // Check if snippet contains both name and role close together
      return snippet.includes(name) && snippet.includes(role);
    });
    
    if (roleInSnippet) {
      confidence += 0.10;
    }
  }

  // Cap at 0.95
  return Math.min(confidence, 0.95);
}

async function searchPublicEvidenceMultiEmployer(base44, candidateName, employers) {
  console.log(`[Public Evidence] Searching for: ${candidateName} across ${employers.length} employers`);

  const employerNames = employers.map(e => e.name).join(', ');

  try {
    // STEP 1: Find relevant URLs
    const searchPrompt = `Find web pages that mention "${candidateName}" and their work history.

Look for pages that show employment at any of these companies: ${employerNames}

Search for:
- Company websites (about, leadership, team, executives, press releases)
- News articles from business publications
- SEC filings if these are public companies
- Press releases and announcements

Return URLs that likely contain career/employment information.`;

    let searchUrls = [];
    try {
      const searchResult = await base44.integrations.Core.InvokeLLM({
        prompt: searchPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            urls: { type: "array", items: { type: "string" } }
          }
        }
      });
      searchUrls = searchResult.urls || [];
      console.log(`[Public Evidence] Found ${searchUrls.length} candidate URLs`);
    } catch (error) {
      console.log(`[Public Evidence] URL search failed: ${error.message}`);
    }

    // STEP 2: Validate employment at each company
    const validationPrompt = `You are verifying employment history for "${candidateName}".

CRITICAL RULES:
1. Full name "${candidateName}" must appear (both first and last name together)
2. Do NOT accept just last name matches
3. EXCLUDE LinkedIn, Twitter, Facebook, Instagram, Wikipedia
4. ONLY use: company websites, SEC filings, reputable news (Bloomberg, Reuters, WSJ, Forbes, Business Insider), press releases

Companies to check: ${employerNames}

${searchUrls.length > 0 ? `Priority sources:\n${searchUrls.slice(0, 8).map(u => `- ${u}`).join('\n')}\n\n` : ''}

For EACH company, determine:
- Did you find the full name "${candidateName}" associated with this company?
- What credible sources confirm this?
- What was their role (if mentioned)?

Return results for each company separately, even if one source mentions multiple employers.

Quality levels:
- HIGH (0.85-1.0): Company website/SEC filing with full name, OR 2+ news sources
- MEDIUM (0.6-0.84): Single news article with full name
- LOW (0.3-0.59): Weak/ambiguous sources
- NONE (0-0.29): No full name matches`;

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

    // Map results back to employer names with proper confidence scoring
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

        // Calculate confidence using new rules
        const confidence = calculateConfidence(validSources, employer.name, candidateName, match.role_mentioned);

        evidenceByEmployer[employer.name] = {
          found: match.found && validSources.length > 0,
          confidence: confidence,
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
      
      let verificationSummary = '';
      
      if (evidence.found && evidence.sources.length > 0) {
        evidence.sources.forEach(source => {
          artifacts.push(addArtifact(
            `${source.quality.toUpperCase()} quality source: ${source.type}`,
            'public_evidence',
            source.url,
            source.snippet
          ));
        });

        // Build verification summary
        const sourceTypes = [...new Set(evidence.sources.map(s => s.type))];
        verificationSummary = `Verified via ${sourceTypes.join(' and ')} - ${evidence.sources.length} independent source${evidence.sources.length > 1 ? 's' : ''} confirm employment${evidence.roleMentioned ? ` as ${evidence.roleMentioned}` : ''}.`;
      } else {
        artifacts.push(addArtifact(
          'No strong public evidence found',
          'public_evidence',
          '',
          evidence.reasoning
        ));
        verificationSummary = 'No public evidence found - manual verification required.';
      }

      // Determine outcome based on confidence thresholds
      let outcome, isVerified, status;
      const hasCredibleSources = evidence.sources && evidence.sources.length > 0;
      
      // High confidence (>= 0.80) = verified
      if (evidence.found && hasCredibleSources && evidence.confidence >= 0.80) {
        outcome = 'verified_public_evidence';
        isVerified = true;
        status = 'completed';
      } 
      // Medium confidence (0.60-0.79) = helpful but not conclusive
      else if (evidence.found && hasCredibleSources && evidence.confidence >= 0.60) {
        outcome = 'policy_identified';
        isVerified = false;
        status = 'action_required';
        verificationSummary = `Partial evidence found (${Math.round(evidence.confidence * 100)}% confidence) - additional verification recommended.`;
      } 
      // Low confidence = didn't help
      else {
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
        reasoning: evidence.reasoning,
        verificationSummary
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