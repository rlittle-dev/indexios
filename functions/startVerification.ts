import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeEmployerDomain(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

async function orchestrateVerificationFlow(base44, employerName, employerPhone, candidateName = '', jobTitle = '') {
  // Call the verification orchestrator
  const response = await base44.functions.invoke('verificationOrchestrator', {
    employerName,
    employerPhone,
    candidateName,
    jobTitle
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

      // Run orchestrator with candidate info for public evidence
      const result = await orchestrateVerificationFlow(base44, name, phone, candidateName, jobTitle);

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