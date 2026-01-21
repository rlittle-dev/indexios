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
    let verificationOutcome; // 1=YES, 2=NO, 3=REFUSE_TO_DISCLOSE, 0=INCONCLUSIVE
    switch (response) {
      case 'yes':
        verificationStatus = 'yes';
        verificationOutcome = 1;
        break;
      case 'no':
        verificationStatus = 'no';
        verificationOutcome = 2;
        break;
      case 'refuse':
        verificationStatus = 'refused_to_disclose';
        verificationOutcome = 3;
        break;
      default:
        verificationStatus = 'inconclusive';
        verificationOutcome = 0;
    }

    // Update the employer record first with verification status
    const updatedEmployers = [...targetCandidate.employers];
    updatedEmployers[targetEmployerIndex] = {
      ...targetEmployer,
      email_verification_status: verificationStatus,
      email_verified_date: new Date().toISOString(),
      email_verification_token: null // Clear token after use
    };

    // Create on-chain attestation
    let attestationUID = null;
    if (verificationStatus !== 'inconclusive') {
      try {
        // Extract company domain from email
        const sentToEmail = targetEmployer.email_sent_to || '';
        const companyDomain = sentToEmail.split('@')[1] || '';
        
        console.log('Creating email attestation for:', {
          candidateId: targetCandidate.id,
          companyDomain,
          verificationResult: attestationStatus,
          verificationType: 'email'
        });

        const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
          uniqueCandidateId: targetCandidate.id,
          companyDomain: companyDomain,
          verificationResult: attestationStatus,
          verificationType: 'email',
          isInternalCall: true
        });

        console.log('Attestation response:', attestationResponse.data);

        if (attestationResponse.data?.success && attestationResponse.data?.attestationUID) {
          attestationUID = attestationResponse.data.attestationUID;
          // Store in email_attestation_uid specifically
          updatedEmployers[targetEmployerIndex].email_attestation_uid = attestationUID;
          console.log('Email attestation created:', attestationUID);
        } else {
          console.error('Attestation creation returned:', attestationResponse.data);
        }
      } catch (attestationError) {
        console.error('Failed to create email attestation:', attestationError);
        // Continue even if attestation fails - we still want to record the response
      }
    }

    // Save updated candidate
    await base44.asServiceRole.entities.UniqueCandidate.update(targetCandidate.id, {
      employers: updatedEmployers
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