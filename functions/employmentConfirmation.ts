import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALIASES = {
  'procter and gamble': ['p&g', 'pg'],
  'victorias secret': ['victorias secret and co'],
  'united states air force': ['us air force', 'usaf'],
};

function normalize(text) {
  if (!text) return '';
  let norm = text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/['`]/g, '')
    .replace(/[.,!?;:()\[\]]/g, '')
    .replace(/\b(inc|co|company|corp|corporation|ltd|llc|plc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return norm;
}

function cleanSnippet(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return '';
  }
}

function isDomainPreferred(domain) {
  const preferred = [
    'prnewswire.com',
    'globenewswire.com',
    'businesswire.com',
    'sec.gov',
  ];
  return preferred.some(p => domain.includes(p));
}

/**
 * Run a single web search query via LLM
 */
async function runWebQuery(base44, query) {
  try {
    console.log(`[EmploymentConfirmation:Web] Query: "${query}"`);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for webpages related to: "${query}"
Return professional sources: company pages, press releases, news, executive bios.
Extract clean snippets (max 2–3 sentences).
Format: JSON {results: [{url, title, snippet}]}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                snippet: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (result?.results && Array.isArray(result.results)) {
      console.log(`[EmploymentConfirmation:Web] Query returned ${result.results.length} result(s)`);
      return result.results;
    }

    return [];

  } catch (error) {
    console.error(`[EmploymentConfirmation:Web] Query error: ${error.message}`);
    return [];
  }
}

/**
 * Collect global web evidence pool using generic + employer-specific queries
 */
async function collectWebEvidence(base44, candidateName, employers) {
  console.log(`[EmploymentConfirmation:Web] Collecting evidence for "${candidateName}"`);

  const allSources = [];
  const seenUrls = new Set();
  const queriesRun = [];
  const domainCounts = {};

  // GENERIC QUERIES
  const genericQueries = [
    `"${candidateName}"`,
    `${candidateName} career`,
    `${candidateName} executive`,
  ];

  // EMPLOYER-SPECIFIC QUERIES
  const employerQueries = [];
  for (const employer of employers) {
    employerQueries.push(
      `"${candidateName}" "${employer.name}"`,
      `${candidateName} ${employer.name}`,
      `${candidateName} ${employer.name} press release`,
      `${candidateName} joined ${employer.name}`,
      `${candidateName} appointed ${employer.name}`
    );
  }

  const allQueries = [...genericQueries, ...employerQueries];

  for (const query of allQueries) {
    const results = await runWebQuery(base44, query);
    
    if (results && results.length > 0) {
      queriesRun.push(query);

      for (const item of results) {
        if (!item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        const domain = getDomain(item.url);
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;

        allSources.push({
          type: 'web',
          url: item.url,
          title: item.title || '',
          text: cleanSnippet(item.snippet || ''),
          full_text: item.snippet || '',
          source: domain
        });

        console.log(`✅ [EmploymentConfirmation:Web] Added: ${item.url}`);

        // Stop if we have enough evidence
        if (allSources.length >= 25) break;
      }

      if (allSources.length >= 25) break;
    }
  }

  console.log(`[EmploymentConfirmation:Web] Total sources: ${allSources.length}`);

  return {
    sources: allSources,
    queries_run: queriesRun,
    domain_counts: domainCounts,
    error: allSources.length === 0 ? 'Web evidence collection returned empty' : null
  };
}

/**
 * Get company HR or employment verification phone number and email
 */
async function getCompanyContact(base44, companyName) {
  try {
    console.log(`[EmploymentConfirmation:Contact] Looking up phone & email for ${companyName}`);
    
    // First search for phone
    const phoneResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the HR department or employment verification PHONE NUMBER for ${companyName}.

Search for:
- HR department phone number
- Employment verification hotline  
- Third-party verification service (e.g., The Work Number, Equifax Workforce Solutions)
- Human Resources contact line
- Corporate HR phone

Return the most relevant phone number for verifying past employment.
Format: JSON {phone_number: string or null, phone_source: string, phone_notes: string}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          phone_number: { type: ['string', 'null'] },
          phone_source: { type: 'string' },
          phone_notes: { type: 'string' }
        }
      }
    });

    // Second search specifically for email
    const emailResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the HR or employment verification EMAIL ADDRESS for ${companyName}.

Search specifically for:
- HR department email (e.g., hr@company.com, humanresources@company.com)
- Employment verification email (e.g., employment.verification@company.com, verification@company.com)
- Background check email (e.g., backgroundcheck@company.com)
- Recruiting/talent email (e.g., careers@company.com, recruiting@company.com, talent@company.com)
- General corporate contact email that could handle HR inquiries
- Any publicly listed email for the company's HR or people operations team

Many companies list HR emails on their careers page, contact page, or in job postings.
Check ${companyName}'s official website, LinkedIn company page, and job boards.

Return the best email address found for contacting HR about employment verification.
Format: JSON {email: string or null, email_source: string, email_notes: string}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          email: { type: ['string', 'null'] },
          email_source: { type: 'string' },
          email_notes: { type: 'string' }
        }
      }
    });

    const contactInfo = {};
    
    if (phoneResult?.phone_number) {
      console.log(`[EmploymentConfirmation:Contact] Found phone: ${phoneResult.phone_number}`);
      contactInfo.phone = {
        number: phoneResult.phone_number,
        source: phoneResult.phone_source || 'Web search',
        notes: phoneResult.phone_notes || ''
      };
    }
    
    if (emailResult?.email) {
      console.log(`[EmploymentConfirmation:Contact] Found email: ${emailResult.email}`);
      contactInfo.email = {
        address: emailResult.email,
        source: emailResult.email_source || 'Web search',
        notes: emailResult.email_notes || ''
      };
    }
    
    return Object.keys(contactInfo).length > 0 ? contactInfo : null;
  } catch (error) {
    console.error(`[EmploymentConfirmation:Contact] Error for ${companyName}:`, error.message);
    return null;
  }
}

/**
 * Extract evidence snippets matching candidate + employer
 */
function extractSnippets(candidateName, employerName, webSources) {
  const candidateNormName = normalize(candidateName);
  const employerNorm = normalize(employerName);
  const snippets = [];

  for (const source of webSources) {
    const snippetText = source.full_text || source.text;
    if (!snippetText) continue;

    const textNorm = normalize(snippetText);
    
    // Must contain normalized candidate name
    if (!textNorm.includes(candidateNormName)) {
      continue;
    }
    
    // Must contain normalized employer name
    let foundEmployer = false;
    
    if (textNorm.includes(employerNorm)) {
      foundEmployer = true;
    } else {
      // Check aliases
      const aliases = ALIASES[employerNorm] || [];
      for (const alias of aliases) {
        if (textNorm.includes(normalize(alias))) {
          foundEmployer = true;
          break;
        }
      }
    }
    
    if (foundEmployer) {
      snippets.push({
        source: source.source,
        url: source.url,
        title: source.title,
        text: source.text,
        type: 'web'
      });
    }
  }
  
  return snippets;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check usage limits based on tier - all tiers can now use employment verification
    const userTier = user.subscription_tier || 'free';
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const resetMonth = user.employment_verifications_reset_month;
    let verificationsUsed = user.employment_verifications_used || 0;

    // Reset counter if new month
    if (resetMonth !== currentMonth) {
      verificationsUsed = 0;
      await base44.auth.updateMe({
        employment_verifications_used: 0,
        employment_verifications_reset_month: currentMonth
      });
    }

    // Define limits per tier: free=3, starter=5, professional=15, enterprise=unlimited
    const tierLimits = {
      free: 3,
      starter: 5,
      professional: 15,
      enterprise: 999999
    };
    const limit = tierLimits[userTier] || 3;

    if (verificationsUsed >= limit) {
      return Response.json({
        error: `Monthly employment verification limit reached (${verificationsUsed}/${limit} used). Upgrade your plan for more verifications.`,
        limit_reached: true
      }, { status: 429 });
    }

    const { candidateName, employers, uniqueCandidateId } = await req.json();

    if (!candidateName || !Array.isArray(employers)) {
      return Response.json({ error: 'Missing: candidateName, employers' }, { status: 400 });
    }

    console.log(`[EmploymentConfirmation] Starting for ${candidateName}, ${employers.length} employers, uniqueCandidateId: ${uniqueCandidateId}`);

    const candidateNorm = normalize(candidateName);
    const results = {};
    const employersToVerify = [];
    let cachedCount = 0;
    
    // Store reference to UniqueCandidate for updates
    let targetUniqueCandidate = null;
    if (uniqueCandidateId) {
      try {
        const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
        if (candidates && candidates.length > 0) {
          targetUniqueCandidate = candidates[0];
          console.log(`[EmploymentConfirmation] Found UniqueCandidate: ${targetUniqueCandidate.id}`);
        }
      } catch (err) {
        console.error(`[EmploymentConfirmation] Error fetching UniqueCandidate:`, err.message);
      }
    }

    // Check database for previously verified employment
    for (const employer of employers) {
      const employerNorm = normalize(employer.name);
      
      try {
        const existing = await base44.asServiceRole.entities.VerifiedEmployment.filter({
          candidate_name_normalized: candidateNorm,
          employer_name_normalized: employerNorm
        });

        if (existing && existing.length > 0) {
          const cached = existing[0];
          console.log(`[EmploymentConfirmation] Cache HIT: ${employer.name}`);
          
          results[employer.name] = {
            status: cached.status,
            evidence_count: cached.sources?.length || 0,
            sources: cached.sources || [],
            has_evidence: true,
            phone: cached.phone || null,
            email: cached.email || null,
            cached: true,
            debug: `cached from ${cached.verified_date}`
          };
          cachedCount++;
          
          // Also update UniqueCandidate with cached data if not already populated
          if (targetUniqueCandidate && (cached.phone || cached.email)) {
            const existingEmployers = targetUniqueCandidate.employers || [];
            const employerIndex = existingEmployers.findIndex(e => 
              normalize(e.employer_name) === normalize(employer.name)
            );
            
            if (employerIndex >= 0) {
              const emp = existingEmployers[employerIndex];
              // Only update if hr_phone/hr_email are missing
              if (!emp.hr_phone && cached.phone) {
                existingEmployers[employerIndex].hr_phone = cached.phone;
              }
              if (!emp.hr_email && cached.email) {
                existingEmployers[employerIndex].hr_email = cached.email;
              }
              targetUniqueCandidate.employers = existingEmployers;
            }
          }
        } else {
          employersToVerify.push(employer);
        }
      } catch (error) {
        console.error(`[EmploymentConfirmation] Cache check error for ${employer.name}:`, error.message);
        employersToVerify.push(employer);
      }
    }

    console.log(`[EmploymentConfirmation] Cached: ${cachedCount}, To verify: ${employersToVerify.length}`);

    // Only run web evidence collection if we have employers to verify
    let webSources = [];
    let webResult = { queries_run: [], domain_counts: {} };

    if (employersToVerify.length > 0) {
      webResult = await collectWebEvidence(base44, candidateName, employersToVerify);
      webSources = webResult.sources || [];
      const webError = webResult.error;

      console.log(`[EmploymentConfirmation] Web sources: ${webSources.length}, queries: ${webResult.queries_run.length}`);

      // If no evidence and error exists, return early
      if (webSources.length === 0 && webError) {
        console.error(`[EmploymentConfirmation] ${webError}`);
        return Response.json({
          success: false,
          error: webError,
          debug_global: {
            web_queries_run: webResult.queries_run || [],
            urls_returned: 0,
            snippets_returned: 0,
            top_domains: {},
            cached_count: cachedCount
          }
        });
      }

      // Verify each employer against web sources and get phone numbers
      for (const employer of employersToVerify) {
        const snippets = extractSnippets(candidateName, employer.name, webSources);
        const status = snippets.length > 0 ? 'verified' : 'not_found';

        // Get HR/verification phone number and email
        const contactInfo = await getCompanyContact(base44, employer.name);

        results[employer.name] = {
          status,
          evidence_count: snippets.length,
          sources: snippets,
          has_evidence: webSources.length > 0,
          phone: contactInfo?.phone || null,
          email: contactInfo?.email || null,
          cached: false,
          debug: snippets.length > 0 
            ? `matched on ${snippets.length} source(s)`
            : (webSources.length === 0 ? 'No evidence collected' : 'no snippet contained employer string')
        };

        // Save to VerifiedEmployment cache
        try {
          await base44.asServiceRole.entities.VerifiedEmployment.create({
            candidate_name: candidateName,
            candidate_name_normalized: normalize(candidateName),
            employer_name: employer.name,
            employer_name_normalized: normalize(employer.name),
            status,
            sources: snippets,
            phone: contactInfo?.phone || null,
            email: contactInfo?.email || null,
            verified_date: new Date().toISOString()
          });
          console.log(`[EmploymentConfirmation] Saved to cache: ${employer.name}`);
        } catch (error) {
          console.error(`[EmploymentConfirmation] Cache save error for ${employer.name}:`, error.message);
        }

        // Update UniqueCandidate with employer verification data (phone, email, evidence)
        // Use the passed uniqueCandidateId first, otherwise fall back to name matching
        try {
          let matchingCandidate = targetUniqueCandidate;
          
          if (!matchingCandidate) {
            const existingCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
            matchingCandidate = existingCandidates.find(c => 
              normalize(c.name) === normalize(candidateName)
            );
          }

          if (matchingCandidate) {
            const existingEmployers = matchingCandidate.employers || [];
            const employerIndex = existingEmployers.findIndex(e => 
              normalize(e.employer_name) === normalize(employer.name)
            );

            let updatedEmployers = [...existingEmployers];

            if (employerIndex >= 0) {
              // Update existing employer record with new verification data
              updatedEmployers[employerIndex] = {
                ...updatedEmployers[employerIndex],
                employer_name: employer.name,
                web_evidence_status: status === 'verified' ? 'yes' : 'no',
                evidence_count: snippets.length,
                hr_phone: contactInfo?.phone || updatedEmployers[employerIndex].hr_phone || null,
                hr_email: contactInfo?.email || updatedEmployers[employerIndex].hr_email || null,
                web_verified_date: new Date().toISOString()
              };
              console.log(`[EmploymentConfirmation] Updated employer ${employer.name} with phone: ${contactInfo?.phone?.number}, email: ${contactInfo?.email?.address}`);
            } else {
              // Add new employer record
              updatedEmployers.push({
                employer_name: employer.name,
                web_evidence_status: status === 'verified' ? 'yes' : 'no',
                call_verification_status: 'not_called',
                evidence_count: snippets.length,
                hr_phone: contactInfo?.phone || null,
                hr_email: contactInfo?.email || null,
                web_verified_date: new Date().toISOString(),
                call_verified_date: null
              });
              console.log(`[EmploymentConfirmation] Added new employer ${employer.name} with phone: ${contactInfo?.phone?.number}, email: ${contactInfo?.email?.address}`);
            }

            await base44.asServiceRole.entities.UniqueCandidate.update(matchingCandidate.id, {
              employers: updatedEmployers
            });
            
            // Update the cached reference so subsequent employers use the latest data
            targetUniqueCandidate = { ...matchingCandidate, employers: updatedEmployers };
            
            console.log(`[EmploymentConfirmation] Updated UniqueCandidate ${matchingCandidate.id} with ${updatedEmployers.length} employers`);
          } else {
            // Create new UniqueCandidate with this employer
            const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
              name: candidateName,
              employers: [{
                employer_name: employer.name,
                web_evidence_status: status === 'verified' ? 'yes' : 'no',
                call_verification_status: 'not_called',
                evidence_count: snippets.length,
                hr_phone: contactInfo?.phone || null,
                hr_email: contactInfo?.email || null,
                web_verified_date: new Date().toISOString(),
                call_verified_date: null
              }]
            });
            targetUniqueCandidate = newCandidate;
            console.log(`[EmploymentConfirmation] Created UniqueCandidate ${newCandidate.id} for ${candidateName}`);
          }
        } catch (ucError) {
          console.error(`[EmploymentConfirmation] UniqueCandidate update error:`, ucError.message);
        }
      }
    }

    const verifiedCount = Object.values(results).filter(r => r.status === 'verified').length;
    console.log(`[EmploymentConfirmation] Final: ${verifiedCount}/${employers.length} verified (${cachedCount} from cache)`);

    // Final update to UniqueCandidate with all employer data (including cached results)
    if (targetUniqueCandidate) {
      try {
        await base44.asServiceRole.entities.UniqueCandidate.update(targetUniqueCandidate.id, {
          employers: targetUniqueCandidate.employers
        });
        console.log(`[EmploymentConfirmation] Final UniqueCandidate update with ${targetUniqueCandidate.employers?.length || 0} employers`);
      } catch (finalErr) {
        console.error(`[EmploymentConfirmation] Final update error:`, finalErr.message);
      }
    }

    // Increment usage counter
    await base44.auth.updateMe({
      employment_verifications_used: verificationsUsed + 1,
      employment_verifications_reset_month: currentMonth
    });

    return Response.json({
      success: true,
      results,
      debug_global: {
        web_queries_run: webResult.queries_run || [],
        urls_returned: webSources.length,
        snippets_returned: webSources.length,
        top_domains: webResult.domain_counts || {},
        cached_count: cachedCount
      },
      summary: {
        verified_count: verifiedCount,
        total_count: employers.length,
        cached_count: cachedCount
      }
    });

  } catch (error) {
    console.error('[EmploymentConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});