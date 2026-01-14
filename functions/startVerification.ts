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

    // STEP 1: Check cache for each employer FIRST
    const cachedVerifications = [];
    const employersNeedingVerification = [];
    
    for (const employer of employers) {
      if (!employer.name) continue;
      
      // Look for existing verification with this candidate name + employer name (global cache)
      const existingVerifications = await base44.entities.EmployerVerification.filter({
        candidateName,
        employerName: employer.name
      });

      // Find cached verification with public evidence
      const cachedVerification = existingVerifications.find(v => 
        v.outcome === 'verified_public_evidence' && 
        v.confidence >= 0.4 &&
        v.proofArtifacts && 
        v.proofArtifacts.some(a => a.type === 'public_evidence' && a.value)
      );

      if (cachedVerification) {
        console.log(`✅ CACHE HIT: ${employer.name} (confidence: ${cachedVerification.confidence})`);
        cachedVerifications.push({ employer, cachedVerification });
      } else {
        employersNeedingVerification.push(employer);
      }
    }

    // STEP 2: Run public evidence verification ONLY for uncached employers
    let publicEvidenceResults = {};
    if (candidateName && employersNeedingVerification.length > 0) {
      console.log(`🔍 Running batch public evidence verification for ${candidateName} across ${employersNeedingVerification.length} employers (${cachedVerifications.length} cached)`);
      
      try {
        const evidenceResponse = await base44.functions.invoke('publicEvidenceVerification', {
          candidateName,
          employers: employersNeedingVerification.map(e => ({ name: e.name, jobTitle: e.jobTitle }))
        });

        if (evidenceResponse.data.success) {
          publicEvidenceResults = evidenceResponse.data.results;
          console.log(`✅ Public evidence batch complete - found evidence for ${Object.keys(publicEvidenceResults).length} employers`);
        }
      } catch (error) {
        console.error('⚠️ Public evidence batch failed:', error);
      }
    }

    // STEP 3: Process cached verifications first
    const verificationRecords = [];
    
    for (const { employer, cachedVerification } of cachedVerifications) {
      // Check if verification already exists for THIS candidate scan
      const existing = await base44.entities.EmployerVerification.filter({
        candidateId,
        employerName: employer.name
      });

      if (existing.length > 0) {
        console.log(`Verification already exists for this scan: ${employer.name}, skipping`);
        verificationRecords.push(existing[0]);
        continue;
      }

      // Create new record with cached data
      const verificationData = {
        candidateId,
        employerName: employer.name,
        employerDomain: normalizeEmployerDomain(employer.name),
        employerPhone: employer.phone || cachedVerification.employerPhone || '',
        candidateName,
        candidateJobTitle: employer.jobTitle || cachedVerification.candidateJobTitle || '',
        stage: cachedVerification.stage,
        stageHistory: cachedVerification.stageHistory,
        status: cachedVerification.status,
        outcome: cachedVerification.outcome,
        method: cachedVerification.method,
        confidence: cachedVerification.confidence,
        isVerified: cachedVerification.isVerified,
        nextSteps: cachedVerification.nextSteps || [],
        proofArtifacts: cachedVerification.proofArtifacts || [],
        completedAt: cachedVerification.completedAt
      };

      const verification = await base44.entities.EmployerVerification.create(verificationData);
      console.log(`✅ CACHED: ${employer.name} (confidence: ${cachedVerification.confidence})`);
      verificationRecords.push(verification);
    }

    // STEP 4: Create verification records for uncached employers
    for (const employer of employersNeedingVerification) {
      const { name, phone, jobTitle } = employer;
      if (!name) continue;

      // Check if verification already exists for THIS candidate scan
      const existing = await base44.entities.EmployerVerification.filter({
        candidateId,
        employerName: name
      });

      if (existing.length > 0) {
        console.log(`Verification already exists for this scan: ${name}, skipping`);
        verificationRecords.push(existing[0]);
        continue;
      }

      // Get pre-computed public evidence for this employer
      const publicEvidence = publicEvidenceResults[name] || null;

      // Run orchestrator with pre-computed evidence
      const result = await orchestrateVerificationFlow(base44, name, phone, candidateName, jobTitle, publicEvidence);

      // Create verification record
      const verificationData = {
        candidateId,
        employerName: name,
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
        proofArtifacts: result.proofArtifacts
      };

      // Only set completedAt if status is completed
      if (result.status === 'completed') {
        verificationData.completedAt = new Date().toISOString();
      }

      const verification = await base44.entities.EmployerVerification.create(verificationData);

      console.log(`✅ NEW: ${name}: stage=${result.stage}, status=${result.status}, outcome=${result.outcome}`);
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