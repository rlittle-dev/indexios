import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, response } = await req.json();

    if (!token || !response) {
      return Response.json({ error: 'Missing token or response' }, { status: 400 });
    }

    // Find the UniqueCandidate with this verification token
    const allCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
    
    let targetCandidate = null;
    let targetEmployerIndex = -1;
    let targetEmployer = null;

    for (const candidate of allCandidates) {
      if (candidate.employers) {
        const empIndex = candidate.employers.findIndex(emp => emp.email_verification_token === token);
        if (empIndex >= 0) {
          targetCandidate = candidate;
          targetEmployerIndex = empIndex;
          targetEmployer = candidate.employers[empIndex];
          break;
        }
      }
    }

    if (!targetCandidate || targetEmployerIndex < 0) {
      return Response.json({ error: 'Verification token not found or expired' }, { status: 404 });
    }

    // Check if already processed
    if (targetEmployer.email_verification_status !== 'pending') {
      return Response.json({ already_processed: true });
    }

    // Map response to verification status
    let verificationStatus;
    let attestationStatus;
    switch (response) {
      case 'yes':
        verificationStatus = 'yes';
        attestationStatus = 'YES';
        break;
      case 'no':
        verificationStatus = 'no';
        attestationStatus = 'NO';
        break;
      case 'refuse':
        verificationStatus = 'refused_to_disclose';
        attestationStatus = 'REFUSE_TO_DISCLOSE';
        break;
      default:
        verificationStatus = 'inconclusive';
        attestationStatus = 'INCONCLUSIVE';
    }

    // Update the employer record
    const updatedEmployers = [...targetCandidate.employers];
    updatedEmployers[targetEmployerIndex] = {
      ...targetEmployer,
      email_verification_status: verificationStatus,
      email_verified_date: new Date().toISOString(),
      email_verification_token: null // Clear token after use
    };

    // Create on-chain attestation
    let attestationUID = null;
    try {
      // Extract company domain from email
      const sentToEmail = targetEmployer.email_sent_to || '';
      const companyDomain = sentToEmail.split('@')[1] || '';

      const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
        uniqueCandidateId: targetCandidate.id,
        companyDomain: companyDomain,
        verificationResult: attestationStatus,
        verificationType: 'email',
        isInternalCall: true
      });

      if (attestationResponse.data?.success) {
        attestationUID = attestationResponse.data.attestationUID;
        updatedEmployers[targetEmployerIndex].attestation_uid = attestationUID;
        console.log('Attestation created:', attestationUID);
      }
    } catch (attestationError) {
      console.error('Failed to create attestation:', attestationError);
      // Continue even if attestation fails - we still want to record the response
    }

    // Save updated candidate
    await base44.asServiceRole.entities.UniqueCandidate.update(targetCandidate.id, {
      employers: updatedEmployers,
      ...(attestationUID && !targetCandidate.attestation_uid ? {
        attestation_uid: attestationUID,
        attestation_date: new Date().toISOString()
      } : {})
    });

    return Response.json({
      success: true,
      verificationStatus,
      attestationUID,
      candidateName: targetCandidate.name,
      companyName: targetEmployer.employer_name
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});