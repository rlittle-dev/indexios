import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to normalize names for matching
function normalizeName(name) {
  return name?.toLowerCase().trim().replace(/[^a-z\s]/g, '') || '';
}

// Helper to check if two candidates might be the same person
function isSameCandidate(existing, newData) {
  const existingName = normalizeName(existing.name);
  const newName = normalizeName(`${newData.firstName} ${newData.lastName}`);
  
  // Name must match
  if (existingName !== newName) return false;
  
  // If we have additional data, check for overlap
  if (newData.state && existing.state) {
    if (existing.state.toLowerCase() !== newData.state.toLowerCase()) return false;
  }
  
  if (newData.email && existing.email) {
    if (existing.email.toLowerCase() === newData.email.toLowerCase()) return true;
  }
  
  if (newData.phone && existing.phone) {
    const cleanPhone = (p) => p.replace(/\D/g, '');
    if (cleanPhone(existing.phone) === cleanPhone(newData.phone)) return true;
  }
  
  // Name and state match is good enough
  if (newData.state && existing.state) {
    return true;
  }
  
  // Just name match - still consider a potential match
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check enterprise tier
    if (user.subscription_tier !== 'enterprise') {
      return Response.json({ error: 'Enterprise subscription required' }, { status: 403 });
    }

    // Check verified workplace
    if (!user.verified_workplace) {
      return Response.json({ error: 'Workplace verification required' }, { status: 403 });
    }

    const { candidateData, employmentData, companyName, companyDomain } = await req.json();

    if (!candidateData?.firstName || !candidateData?.lastName || !candidateData?.state) {
      return Response.json({ error: 'First name, last name, and state are required' }, { status: 400 });
    }

    const fullName = `${candidateData.firstName} ${candidateData.lastName}`;
    const normalizedName = normalizeName(fullName);

    // Search for existing candidates with similar name
    const allCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
    
    let matchedCandidate = null;
    for (const candidate of allCandidates) {
      if (isSameCandidate(candidate, candidateData)) {
        matchedCandidate = candidate;
        break;
      }
    }

    let uniqueCandidateId;
    let employers = [];

    if (matchedCandidate) {
      // Update existing candidate
      uniqueCandidateId = matchedCandidate.id;
      employers = matchedCandidate.employers || [];
      
      // Update candidate data if we have new info
      const updateData = {};
      if (candidateData.email && !matchedCandidate.email) updateData.email = candidateData.email;
      if (candidateData.phone && !matchedCandidate.phone) updateData.phone = candidateData.phone;
      if (candidateData.linkedinUrl && !matchedCandidate.linkedin_url) updateData.linkedin_url = candidateData.linkedinUrl;
      if (candidateData.state && !matchedCandidate.state) updateData.state = candidateData.state;
      if (candidateData.city && !matchedCandidate.city) updateData.city = candidateData.city;
      
      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, updateData);
      }
      
      console.log(`Found existing candidate: ${matchedCandidate.name} (${uniqueCandidateId})`);
    } else {
      // Create new UniqueCandidate
      const newCandidate = await base44.asServiceRole.entities.UniqueCandidate.create({
        name: fullName,
        email: candidateData.email || null,
        phone: candidateData.phone || null,
        linkedin_url: candidateData.linkedinUrl || null,
        state: candidateData.state,
        city: candidateData.city || null,
        employers: []
      });
      uniqueCandidateId = newCandidate.id;
      console.log(`Created new candidate: ${fullName} (${uniqueCandidateId})`);
    }

    // Create attestation on-chain
    let attestationUID = null;
    try {
      const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
        uniqueCandidateId,
        companyDomain: companyDomain?.replace('@', '') || companyName,
        verificationType: 'manual_employer',
        verificationOutcome: 1, // YES
        verificationReason: `Manual employer attestation by ${user.email} from ${companyName}`,
        _internal: true
      });

      if (attestationResponse.data?.success) {
        attestationUID = attestationResponse.data.attestationUID;
        console.log('Attestation created:', attestationUID);
      } else {
        console.error('Attestation response:', attestationResponse.data);
      }
    } catch (attestationError) {
      console.error('Attestation error:', attestationError);
      // Continue even if attestation fails
    }

    // Find or create employer entry
    const companyNameLower = companyName.toLowerCase().trim();
    let employerIndex = employers.findIndex(emp => {
      const empName = (emp.employer_name || '').toLowerCase().trim();
      return empName === companyNameLower || empName.includes(companyNameLower) || companyNameLower.includes(empName);
    });

    const manualAttestation = {
      status: 'verified',
      attested_by_email: user.email,
      attested_by_company: companyName,
      attested_date: new Date().toISOString(),
      attestation_uid: attestationUID,
      job_title: employmentData?.jobTitle || null,
      start_date: employmentData?.startDate || null,
      end_date: employmentData?.endDate || null,
      notes: employmentData?.notes || null
    };

    if (employerIndex >= 0) {
      // Update existing employer entry
      employers[employerIndex] = {
        ...employers[employerIndex],
        manual_employer_attestation: manualAttestation
      };
    } else {
      // Add new employer entry
      employers.push({
        employer_name: companyName,
        web_evidence_status: 'no',
        call_verification_status: 'not_called',
        email_verification_status: 'not_sent',
        manual_employer_attestation: manualAttestation
      });
    }

    // Update candidate with employer info
    await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
      employers
    });

    return Response.json({
      success: true,
      uniqueCandidateId,
      candidateName: fullName,
      isNewCandidate: !matchedCandidate,
      attestationUID,
      message: matchedCandidate 
        ? `Updated existing candidate "${fullName}" with manual attestation`
        : `Created new candidate "${fullName}" with manual attestation`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});