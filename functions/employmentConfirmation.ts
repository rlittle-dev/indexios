import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Employment Confirmation Orchestrator
 * Runs RocketReach first, falls back to web evidence if no RocketReach match
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

    // STEP 1: RocketReach (priority)
    let rrResult = {};
    try {
      const rrResponse = await base44.functions.invoke('rocketReachEvidence', {
        candidateName,
        employers
      });
      rrResult = rrResponse.data.results || {};
      console.log(`✅ [EmploymentConfirmation] RocketReach complete: ${Object.keys(rrResult).length} employers processed`);
    } catch (error) {
      console.error('[EmploymentConfirmation] RocketReach error:', error.message);
      // Initialize empty results for all employers
      for (const emp of employers) {
        rrResult[emp.name] = { found: false, quality: 'not_found', confidence: 0, artifacts: [] };
      }
    }

    // STEP 2: Web evidence (fallback for unconfirmed)
    const unconfirmedEmployers = employers.filter(e => !rrResult[e.name]?.found);
    let webResult = {};

    if (unconfirmedEmployers.length > 0) {
      console.log(`[EmploymentConfirmation] Running web evidence for ${unconfirmedEmployers.length} unconfirmed employers`);
      try {
        const webResponse = await base44.functions.invoke('webEvidence', {
          candidateName,
          employers: unconfirmedEmployers
        });
        webResult = webResponse.data.results || {};
        console.log(`✅ [EmploymentConfirmation] Web evidence complete`);
      } catch (error) {
        console.error('[EmploymentConfirmation] Web evidence error:', error.message);
      }
    }

    // STEP 3: Merge results (RocketReach takes precedence)
    const finalResults = {};

    for (const employer of employers) {
      const empName = employer.name;
      
      // Use RocketReach if found, otherwise use web result
      if (rrResult[empName]?.found) {
        finalResults[empName] = {
          ...rrResult[empName],
          source: 'rocketreach',
          status: rrResult[empName].quality === 'strong' ? 'confirmed' : 'partial'
        };
      } else if (webResult[empName]?.found) {
        finalResults[empName] = {
          ...webResult[empName],
          source: 'web',
          status: webResult[empName].quality === 'high' ? 'confirmed' : 'partial'
        };
      } else {
        finalResults[empName] = {
          found: false,
          quality: 'not_found',
          confidence: 0,
          artifacts: [],
          source: 'none',
          status: 'not_found',
          debug: 'No evidence found (RocketReach + web)'
        };
      }
    }

    // Summary stats
    const confirmed = Object.values(finalResults).filter(r => r.status === 'confirmed').length;
    const partial = Object.values(finalResults).filter(r => r.status === 'partial').length;
    const notFound = Object.values(finalResults).filter(r => r.status === 'not_found').length;

    console.log(`[EmploymentConfirmation] Complete: ${confirmed} confirmed, ${partial} partial, ${notFound} not found`);

    return Response.json({
      success: true,
      results: finalResults,
      summary: {
        confirmed_count: confirmed,
        partial_count: partial,
        not_found_count: notFound,
        total_count: employers.length
      }
    });

  } catch (error) {
    console.error('[EmploymentConfirmation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});