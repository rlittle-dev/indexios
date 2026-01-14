import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Employment Confirmation Orchestrator (RocketReach-First + Web Fallback)
 * 
 * Pipeline:
 * 1) RocketReach search (primary)
 * 2) For each unconfirmed employer, run targeted web search (employer-specific, no cross-leakage)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateName, employers } = await req.json();

    if (!candidateName || !Array.isArray(employers)) {
      return Response.json({
        error: 'Missing: candidateName, employers'
      }, { status: 400 });
    }

    console.log(`[EmploymentConfirmation] Starting for ${candidateName}, ${employers.length} employers`);

    // STEP 1: RocketReach (primary)
    let rrData = { results: {}, unconfirmed: [], profile_url: null };

    try {
      const rrResponse = await base44.functions.invoke('rocketReachEvidence', {
        candidateName,
        employers
      });
      rrData = rrResponse.data;
      console.log(`✅ [EmploymentConfirmation] RocketReach: ${Object.keys(rrData.results).length} employers processed, ${rrData.unconfirmed.length} unconfirmed`);
    } catch (error) {
      console.error('[EmploymentConfirmation] RocketReach error:', error.message);
      // Initialize empty results
      for (const emp of employers) {
        rrData.results[emp.name] = { 
          found: false, 
          source: 'none', 
          confidence: 0, 
          artifacts: [],
          needsWebSearch: true,
          debug: `RocketReach failed: ${error.message}`
        };
      }
      rrData.unconfirmed = employers.map(e => e.name);
    }

    // STEP 2: Web evidence fallback (employer-specific, only for unconfirmed)
    let webData = { results: {} };

    if (rrData.unconfirmed && rrData.unconfirmed.length > 0) {
      const unconfirmedEmployers = employers.filter(e => rrData.unconfirmed.includes(e.name));
      
      console.log(`[EmploymentConfirmation] Running web evidence for ${unconfirmedEmployers.length} unconfirmed employers`);
      
      try {
        const webResponse = await base44.functions.invoke('webEvidenceEmployer', {
          candidateName,
          unconfirmedEmployers
        });
        webData = webResponse.data;
        console.log(`✅ [EmploymentConfirmation] Web evidence: ${Object.values(webData.results).filter(r => r.found).length} confirmed`);
      } catch (error) {
        console.error('[EmploymentConfirmation] Web evidence error:', error.message);
      }
    }

    // STEP 3: Merge results (RocketReach takes precedence, web is fallback)
    const finalResults = {};

    for (const employer of employers) {
      const empName = employer.name;
      const rrResult = rrData.results[empName] || {};
      const webResult = webData.results[empName];

      if (rrResult.found) {
        // RocketReach confirmed
        finalResults[empName] = {
          status: 'confirmed',
          confidence: rrResult.confidence || 98,
          source: 'rocketreach',
          artifacts: rrResult.artifact ? [rrResult.artifact] : [],
          matched_fields: rrResult.matchedFields,
          debug: `RocketReach ${rrResult.source}: ${rrResult.snippet}`,
        };
      } else if (webResult?.found) {
        // Web fallback
        finalResults[empName] = {
          status: 'confirmed',
          confidence: webResult.confidence || 85,
          source: 'web',
          artifacts: webResult.artifacts || [],
          matched_fields: webResult.matchedFields,
          debug: `Web ${webResult.quality}: ${webResult.artifacts?.length || 0} source(s)`,
        };
      } else {
        // Not found
        finalResults[empName] = {
          status: 'not_found',
          confidence: 0,
          source: 'none',
          artifacts: [],
          matched_fields: {},
          debug: 'No evidence found (RocketReach + web)'
        };
      }
    }

    // Summary stats
    const confirmed = Object.values(finalResults).filter(r => r.status === 'confirmed').length;
    const notFound = Object.values(finalResults).filter(r => r.status === 'not_found').length;

    console.log(`[EmploymentConfirmation] Final: ${confirmed} confirmed, ${notFound} not found`);

    return Response.json({
      success: true,
      results: finalResults,
      summary: {
        confirmed_count: confirmed,
        not_found_count: notFound,
        total_count: employers.length
      }
    });

  } catch (error) {
    console.error('[EmploymentConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});