import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeEmployerDomain(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

async function orchestrateVerificationFlow(base44, employerName, employerPhone, candidateName = '', jobTitle = '', publicEvidenceResult = null) {
  // Call the verification orchestrator with pre-computed evidence
  const response = await base44.functions.invoke('verificationOrchestrator', {
    employerName,
    employerPhone,
    candidateName,
    jobTitle,
    publicEvidenceResult
  });

  if (!response.data.success) {
    throw new Error('Orchestrator failed');
  }

  return response.data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, employers } = await req.json();

    if (!candidateId || !employers || !Array.isArray(employers)) {
      return Response.json({ 
        error: 'Missing required fields: candidateId, employers (array)' 
      }, { status: 400 });
    }

    console.log(`Starting verification for ${employers.length} employers on candidate ${candidateId}`);

    // Get candidate info for public evidence matching
    const candidates = await base44.entities.Candidate.filter({ id: candidateId });
    const candidate = candidates.length > 0 ? candidates[0] : null;
    const candidateName = candidate?.name || '';

    // STEP 1: Run public evidence verification ONCE for ALL employers
    let publicEvidenceResults = {};
    if (candidateName && employers.length > 0) {
      console.log(`🔍 Running batch public evidence verification for ${candidateName} across ${employers.length} employers`);
      
      try {
        const evidenceResponse = await base44.functions.invoke('publicEvidenceVerification', {
          candidateName,
          employers: employers.map(e => ({ name: e.name, jobTitle: e.jobTitle }))
        });

        if (evidenceResponse.data.success) {
          publicEvidenceResults = evidenceResponse.data.results;
          console.log(`✅ Public evidence batch complete - found evidence for ${Object.keys(publicEvidenceResults).length} employers`);
        }
      } catch (error) {
        console.error('⚠️ Public evidence batch failed:', error);
      }
    }

    // STEP 2: Create verification records for each employer
    const verificationRecords = [];

    for (const employer of employers) {
      const { name, phone, jobTitle } = employer;
      if (!name) continue;

      // Check if verification already exists
      const existing = await base44.entities.EmployerVerification.filter({
        candidateId,
        employerName: name
      });

      if (existing.length > 0) {
        console.log(`Verification already exists for ${name}, skipping`);
        verificationRecords.push(existing[0]);
        continue;
      }

      // Get pre-computed public evidence for this employer (deep copy to avoid mutations)
      const publicEvidence = publicEvidenceResults[name] 
        ? JSON.parse(JSON.stringify(publicEvidenceResults[name])) 
        : null;

      console.log(`[Verification] Evidence for ${name}: found=${publicEvidence?.found}, confidence=${publicEvidence?.confidence}`);

      // Run orchestrator with pre-computed evidence
      const result = await orchestrateVerificationFlow(base44, name, phone, candidateName, jobTitle, publicEvidence);

      // Create verification record (deep copy artifacts to ensure isolation)
      const verificationData = {
        candidateId,
        employerName: name, // SCOPING: Unique key with candidateId
        employerDomain: normalizeEmployerDomain(name),
        employerPhone: phone || '',
        candidateName,
        candidateJobTitle: jobTitle || '',
        stage: result.stage,
        stageHistory: result.stageHistory,
        status: result.status,
        outcome: result.outcome,
        method: result.method,
        confidence: result.confidence,
        isVerified: result.isVerified,
        nextSteps: result.nextSteps,
        proofArtifacts: JSON.parse(JSON.stringify(result.proofArtifacts || [])) // Deep copy
      };

      // Only set completedAt if status is completed
      if (result.status === 'completed') {
        verificationData.completedAt = new Date().toISOString();
      }

      const verification = await base44.entities.EmployerVerification.create(verificationData);

      console.log(`✅ ${name}: stage=${result.stage}, status=${result.status}, outcome=${result.outcome}`);
      verificationRecords.push(verification);
    }

    return Response.json({
      success: true,
      verifications: verificationRecords,
      count: verificationRecords.length
    });

  } catch (error) {
    console.error('Start verification error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});