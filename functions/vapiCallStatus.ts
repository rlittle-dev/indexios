import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

async function processRequest(req) {
  console.log(`[VapiCallStatus] === Function invoked ===`);
  
  let base44;
  let user;
  let body;
  
  try {
    base44 = createClientFromRequest(req);
    console.log(`[VapiCallStatus] Created base44 client`);
    
    user = await base44.auth.me();
    console.log(`[VapiCallStatus] User auth result: ${user ? user.email : 'null'}`);

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await req.json();
    console.log(`[VapiCallStatus] Request body:`, JSON.stringify(body));
  } catch (initError) {
    console.error(`[VapiCallStatus] Init error:`, initError.message);
    return Response.json({ error: initError.message }, { status: 500 });
  }
  
  const { callId, candidateName: inputCandidateName, companyName: inputCompanyName, uniqueCandidateId: inputUniqueCandidateId } = body;

  if (!callId) {
    return Response.json({ error: 'Missing callId' }, { status: 400 });
  }

  console.log(`[VapiCallStatus] Checking status for call: ${callId}`);
  console.log(`[VapiCallStatus] Input params - candidateName: ${inputCandidateName}, companyName: ${inputCompanyName}, uniqueCandidateId: ${inputUniqueCandidateId}`);

  // Get call details from VAPI
  let callData;
  try {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log(`[VapiCallStatus] Raw VAPI response (${response.status}):`, responseText.substring(0, 500));
    
    try {
      callData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[VapiCallStatus] Failed to parse VAPI response:', responseText);
      return Response.json({ 
        error: 'Invalid response from VAPI API',
        details: responseText.substring(0, 200)
      }, { status: 502 });
    }

    if (!response.ok) {
      console.error('[VapiCallStatus] VAPI error:', callData);
      return Response.json({ 
        error: 'Failed to get call status',
        details: callData 
      }, { status: 500 });
    }
  } catch (vapiError) {
    console.error('[VapiCallStatus] VAPI fetch error:', vapiError.message);
    return Response.json({ error: vapiError.message }, { status: 500 });
  }

  // Parse the call result to determine verification outcome
  let verificationResult = 'INCONCLUSIVE';
  const transcript = callData.transcript || '';
  const analysis = callData.analysis || {};
  
  // Check for structured data from assistant
  if (analysis.structuredData?.verificationResult) {
    verificationResult = analysis.structuredData.verificationResult;
  } else if (transcript) {
    // Fallback: analyze transcript for keywords
    const transcriptLower = transcript.toLowerCase();
    
    if (transcriptLower.includes('yes') && 
        (transcriptLower.includes('employed') || transcriptLower.includes('worked') || transcriptLower.includes('confirm'))) {
      verificationResult = 'YES';
    } else if (transcriptLower.includes('no') && 
        (transcriptLower.includes('record') || transcriptLower.includes('not employed') || transcriptLower.includes('never worked'))) {
      verificationResult = 'NO';
    } else if (transcriptLower.includes('cannot') || transcriptLower.includes('policy') || 
               transcriptLower.includes('not allowed') || transcriptLower.includes('refuse')) {
      verificationResult = 'REFUSE_TO_DISCLOSE';
    }
  }

  console.log(`[VapiCallStatus] Call ${callId} status: ${callData.status}, result: ${verificationResult}`);

  // If call ended, update UniqueCandidate and create attestation
  let attestationCreated = false;
  let attestationUID = null;

  console.log(`[VapiCallStatus] Call status from VAPI: "${callData.status}"`);
  
  if (callData.status === 'ended') {
    console.log(`[VapiCallStatus] === Call has ended, processing ===`);
    
    // Get candidate info from call metadata OR from input params (fallback)
    const candidateName = callData.assistantOverrides?.variableValues?.candidateName || 
                         callData.metadata?.candidateName ||
                         inputCandidateName;
    const companyName = callData.assistantOverrides?.variableValues?.companyName || 
                       callData.metadata?.companyName ||
                       inputCompanyName;
    const uniqueCandidateId = callData.assistantOverrides?.variableValues?.uniqueCandidateId || 
                             callData.metadata?.uniqueCandidateId ||
                             inputUniqueCandidateId;

    console.log(`[VapiCallStatus] Call ended for candidate: ${candidateName}, company: ${companyName}, uniqueId: ${uniqueCandidateId}`);

    // Update UniqueCandidate with call result (only create attestation for non-INCONCLUSIVE results)
    const shouldCreateAttestation = verificationResult !== 'INCONCLUSIVE';
    console.log(`[VapiCallStatus] shouldCreateAttestation=${shouldCreateAttestation}`);
    
    if (uniqueCandidateId && companyName) {
      console.log(`[VapiCallStatus] === Starting UniqueCandidate update flow ===`);
      
      let candidates;
      try {
        console.log(`[VapiCallStatus] Fetching UniqueCandidate...`);
        candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
        console.log(`[VapiCallStatus] Found ${candidates?.length || 0} candidates`);
      } catch (fetchError) {
        console.error(`[VapiCallStatus] Error fetching candidate:`, fetchError.message);
        candidates = [];
      }
      
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        const existingEmployers = candidate.employers || [];
        const companyNorm = companyName.toLowerCase().trim();
        
        const employerIndex = existingEmployers.findIndex(e => 
          e.employer_name?.toLowerCase().trim() === companyNorm ||
          e.employer_name?.toLowerCase().includes(companyNorm) ||
          companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
        );
        
        console.log(`[VapiCallStatus] Employer index: ${employerIndex}`);

        // Check for existing attestation
        if (employerIndex >= 0 && existingEmployers[employerIndex].attestation_uid) {
          console.log(`[VapiCallStatus] Employer already has attestation, skipping`);
          return Response.json({
            success: true,
            callId,
            status: callData.status,
            endedReason: callData.endedReason,
            duration: callData.duration,
            verificationResult,
            transcript: transcript.substring(0, 500),
            summary: analysis.summary || null,
            attestationCreated: false,
            attestationUID: existingEmployers[employerIndex].attestation_uid,
            message: 'Employer already has attestation'
          });
        }

        // Map verification result to call status
        let callStatus = 'inconclusive';
        if (verificationResult === 'YES') callStatus = 'yes';
        else if (verificationResult === 'NO') callStatus = 'no';
        else if (verificationResult === 'REFUSE_TO_DISCLOSE') callStatus = 'refused_to_disclose';
        
        console.log(`[VapiCallStatus] Call status mapped: ${callStatus}`);

        const updatedEmployers = [...existingEmployers];
        
        if (employerIndex >= 0) {
          updatedEmployers[employerIndex] = {
            ...updatedEmployers[employerIndex],
            call_verification_status: callStatus,
            call_verified_date: new Date().toISOString()
          };
        } else {
          updatedEmployers.push({
            employer_name: companyName,
            web_evidence_status: 'no',
            call_verification_status: callStatus,
            call_verified_date: new Date().toISOString(),
            evidence_count: 0
          });
        }

        // Update UniqueCandidate
        try {
          console.log(`[VapiCallStatus] Updating UniqueCandidate employers...`);
          await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
            employers: updatedEmployers
          });
          console.log(`[VapiCallStatus] UniqueCandidate updated successfully`);
        } catch (updateErr) {
          console.error(`[VapiCallStatus] Failed to update UniqueCandidate:`, updateErr.message);
        }

        // Create blockchain attestation
        console.log(`[VapiCallStatus] === Attestation check: shouldCreateAttestation=${shouldCreateAttestation} ===`);
        
        if (shouldCreateAttestation) {
          console.log(`[VapiCallStatus] === Creating attestation ===`);
          
          let verificationOutcome = 0;
          if (verificationResult === 'YES') verificationOutcome = 1;
          else if (verificationResult === 'NO') verificationOutcome = 2;
          else if (verificationResult === 'REFUSE_TO_DISCLOSE') verificationOutcome = 3;

          const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

          console.log(`[VapiCallStatus] Attestation params:`, {
            uniqueCandidateId,
            companyDomain,
            verificationType: 'phone_call',
            verificationOutcome
          });

          try {
            const functionBaseUrl = req.url.replace(/\/vapiCallStatus.*$/, '').replace(/\/$/, '');
            const attestationUrl = `${functionBaseUrl}/createAttestation`;
            console.log(`[VapiCallStatus] Calling: ${attestationUrl}`);

            const attestationResponse = await fetch(attestationUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
              },
              body: JSON.stringify({
                uniqueCandidateId,
                companyDomain,
                verificationType: 'phone_call',
                verificationOutcome,
                verificationReason: analysis.summary || `Phone verification result: ${verificationResult}`,
                _internal: true
              })
            });

            console.log(`[VapiCallStatus] Attestation HTTP status: ${attestationResponse.status}`);
            const attestationText = await attestationResponse.text();
            console.log(`[VapiCallStatus] Attestation response: ${attestationText.substring(0, 500)}`);

            let attestationData;
            try {
              attestationData = JSON.parse(attestationText);
            } catch (parseErr) {
              console.error(`[VapiCallStatus] Failed to parse attestation response`);
              attestationData = { error: 'Invalid JSON response' };
            }
            
            if (attestationData?.attestationUID) {
              attestationUID = attestationData.attestationUID;
              attestationCreated = true;
              console.log(`[VapiCallStatus] Attestation created: ${attestationUID}`);
              
              // Save attestation UID
              const finalEmployers = [...updatedEmployers];
              const empIdx = finalEmployers.findIndex(e => 
                e.employer_name?.toLowerCase().trim() === companyNorm ||
                e.employer_name?.toLowerCase().includes(companyNorm) ||
                companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
              );
              if (empIdx >= 0) {
                finalEmployers[empIdx].attestation_uid = attestationUID;
              }
              
              try {
                await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
                  employers: finalEmployers,
                  attestation_uid: attestationUID,
                  attestation_date: new Date().toISOString()
                });
                console.log(`[VapiCallStatus] Saved attestation UID to UniqueCandidate`);
              } catch (saveErr) {
                console.error(`[VapiCallStatus] Failed to save attestation UID:`, saveErr.message);
              }
            } else {
              console.error(`[VapiCallStatus] Attestation error:`, attestationData?.error || 'No UID returned');
            }
          } catch (attestError) {
            console.error('[VapiCallStatus] Attestation error:', attestError.message);
          }
        } else {
          console.log(`[VapiCallStatus] Skipping attestation (result is INCONCLUSIVE)`);
        }
      }
    } else {
      console.log(`[VapiCallStatus] Missing uniqueCandidateId or companyName, skipping update`);
    }
  }

  console.log(`[VapiCallStatus] === Returning response - attestationCreated: ${attestationCreated}, attestationUID: ${attestationUID} ===`);
  
  return Response.json({
    success: true,
    callId,
    status: callData.status,
    endedReason: callData.endedReason,
    duration: callData.duration,
    verificationResult,
    transcript: transcript.substring(0, 500),
    summary: analysis.summary || null,
    attestationCreated,
    attestationUID
  });
}

Deno.serve(async (req) => {
  try {
    return await processRequest(req);
  } catch (fatalError) {
    console.error(`[VapiCallStatus] FATAL ERROR:`, fatalError.message);
    console.error(`[VapiCallStatus] Stack:`, fatalError.stack);
    return Response.json({ error: fatalError.message }, { status: 500 });
  }
});