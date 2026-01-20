import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, candidateName: inputCandidateName, companyName: inputCompanyName, uniqueCandidateId: inputUniqueCandidateId } = await req.json();

    if (!callId) {
      return Response.json({ error: 'Missing callId' }, { status: 400 });
    }

    console.log(`[VapiCallStatus] Checking status for call: ${callId}`);

    // Get call details from VAPI
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log(`[VapiCallStatus] Raw VAPI response (${response.status}):`, responseText.substring(0, 500));
    
    let callData;
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

    if (callData.status === 'ended') {
      // Log the full call data to debug metadata extraction
      console.log(`[VapiCallStatus] Full call data keys:`, Object.keys(callData));
      console.log(`[VapiCallStatus] assistantOverrides:`, JSON.stringify(callData.assistantOverrides, null, 2));
      console.log(`[VapiCallStatus] metadata:`, JSON.stringify(callData.metadata, null, 2));
      
      // Get candidate info from call metadata OR from input params (fallback)
      const candidateName = callData.assistantOverrides?.variableValues?.candidateName || 
                           callData.metadata?.candidateName ||
                           callData.assistant?.variableValues?.candidateName ||
                           inputCandidateName;
      const companyName = callData.assistantOverrides?.variableValues?.companyName || 
                         callData.metadata?.companyName ||
                         callData.assistant?.variableValues?.companyName ||
                         inputCompanyName;
      const uniqueCandidateId = callData.assistantOverrides?.variableValues?.uniqueCandidateId || 
                               callData.metadata?.uniqueCandidateId ||
                               callData.assistant?.variableValues?.uniqueCandidateId ||
                               inputUniqueCandidateId;

      console.log(`[VapiCallStatus] Call ended for candidate: ${candidateName}, company: ${companyName}, uniqueId: ${uniqueCandidateId}`);

      // Update UniqueCandidate with call result (only create attestation for non-INCONCLUSIVE results)
      const shouldCreateAttestation = verificationResult !== 'INCONCLUSIVE';
      console.log(`[VapiCallStatus] shouldCreateAttestation=${shouldCreateAttestation}, uniqueCandidateId=${uniqueCandidateId}, companyName=${companyName}`);
      
      if (uniqueCandidateId && companyName) {
        try {
          console.log(`[VapiCallStatus] Fetching UniqueCandidate...`);
          const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
          console.log(`[VapiCallStatus] Found ${candidates?.length || 0} candidates`);
          
          if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            console.log(`[VapiCallStatus] Found candidate:`, candidate.id);
            const existingEmployers = candidate.employers || [];
            console.log(`[VapiCallStatus] Existing employers count: ${existingEmployers.length}`);
            const companyNorm = companyName.toLowerCase().trim();
            
            const employerIndex = existingEmployers.findIndex(e => 
              e.employer_name?.toLowerCase().trim() === companyNorm ||
              e.employer_name?.toLowerCase().includes(companyNorm) ||
              companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
            );
            console.log(`[VapiCallStatus] Employer index found: ${employerIndex}`);

            // Map verification result to call status
            let callStatus = 'inconclusive';
            if (verificationResult === 'YES') callStatus = 'yes';
            else if (verificationResult === 'NO') callStatus = 'no';
            else if (verificationResult === 'REFUSE_TO_DISCLOSE') callStatus = 'refused_to_disclose';
            console.log(`[VapiCallStatus] Mapped callStatus: ${callStatus}`);

            const updatedEmployers = [...existingEmployers];
            
            if (employerIndex >= 0) {
              // Check if already verified - skip if already has attestation
              const existingStatus = updatedEmployers[employerIndex].call_verification_status;
              console.log(`[VapiCallStatus] Employer ${companyName} existing status: ${existingStatus}, attestation_uid: ${updatedEmployers[employerIndex].attestation_uid}`);
              
              // IMPORTANT: Check if status is already 'yes' - if so, skip to avoid re-processing
              if (existingStatus === 'yes' && !updatedEmployers[employerIndex].attestation_uid) {
                console.log(`[VapiCallStatus] Status already 'yes' but no attestation - will create attestation`);
              }
              
              if (updatedEmployers[employerIndex].attestation_uid) {
                console.log(`[VapiCallStatus] Employer ${companyName} already has attestation, skipping`);
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
                  attestationUID: updatedEmployers[employerIndex].attestation_uid,
                  message: 'Employer already has attestation'
                });
              }
              
              updatedEmployers[employerIndex] = {
                ...updatedEmployers[employerIndex],
                call_verification_status: callStatus,
                call_verified_date: new Date().toISOString()
              };
            } else {
              // Add employer if not found
              updatedEmployers.push({
                employer_name: companyName,
                web_evidence_status: 'no',
                call_verification_status: callStatus,
                call_verified_date: new Date().toISOString(),
                evidence_count: 0
              });
            }

            console.log(`[VapiCallStatus] About to update UniqueCandidate...`);
            await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
              employers: updatedEmployers
            });
            console.log(`[VapiCallStatus] Updated UniqueCandidate - now checking attestation`);

            // Create blockchain attestation (only for non-INCONCLUSIVE results)
            console.log(`[VapiCallStatus] shouldCreateAttestation=${shouldCreateAttestation}, verificationResult=${verificationResult}`);
            
            if (!shouldCreateAttestation) {
              console.log(`[VapiCallStatus] Skipping attestation - result is INCONCLUSIVE`);
            } else {
              console.log(`[VapiCallStatus] Will create attestation now`);
              
              // Map verification result to outcome code
              let verificationOutcome = 0; // inconclusive
              if (verificationResult === 'YES') verificationOutcome = 1;
              else if (verificationResult === 'NO') verificationOutcome = 2;
              else if (verificationResult === 'REFUSE_TO_DISCLOSE') verificationOutcome = 3;

              const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

              console.log(`[VapiCallStatus] Attestation params: uniqueCandidateId=${uniqueCandidateId}, companyDomain=${companyDomain}, verificationOutcome=${verificationOutcome}`);

              try {
                console.log(`[VapiCallStatus] Calling createAttestation via SDK...`);
                
                const attestationResult = await base44.asServiceRole.functions.invoke('createAttestation', {
                  uniqueCandidateId: uniqueCandidateId,
                  companyDomain: companyDomain,
                  verificationType: 'phone_call',
                  verificationOutcome: verificationOutcome,
                  verificationReason: analysis.summary || `Phone verification result: ${verificationResult}`,
                  _internal: true
                });
                
                console.log(`[VapiCallStatus] createAttestation SDK response:`, JSON.stringify(attestationResult, null, 2));

                // attestationResult is already the parsed response from SDK
                const attestationData = attestationResult?.data || attestationResult;
                
                if (attestationData?.attestationUID) {
                  attestationUID = attestationData.attestationUID;
                  attestationCreated = true;
                  console.log(`[VapiCallStatus] Created attestation: ${attestationUID}`);
                  
                  // Update the employer with attestation UID
                  const finalEmployers = [...updatedEmployers];
                  const empIdx = finalEmployers.findIndex(e => 
                    e.employer_name?.toLowerCase().trim() === companyNorm ||
                    e.employer_name?.toLowerCase().includes(companyNorm) ||
                    companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
                  );
                  if (empIdx >= 0) {
                    finalEmployers[empIdx].attestation_uid = attestationUID;
                  }
                  
                  await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
                    employers: finalEmployers,
                    attestation_uid: attestationUID,
                    attestation_date: new Date().toISOString()
                  });
                  console.log(`[VapiCallStatus] Saved attestation UID to UniqueCandidate`);
                } else if (attestationData?.error) {
                  console.error(`[VapiCallStatus] Attestation returned error: ${attestationData.error}`);
                } else {
                  console.error(`[VapiCallStatus] Attestation response missing UID:`, attestationData);
                }
              } catch (attestError) {
                console.error('[VapiCallStatus] Attestation error:', attestError.message);
                console.error('[VapiCallStatus] Attestation error stack:', attestError.stack);
              }
            } else {
              console.log(`[VapiCallStatus] Skipping attestation for INCONCLUSIVE result`);
            }
          }
        } catch (updateError) {
          console.error('[VapiCallStatus] UniqueCandidate update error:', updateError.message);
        }
      }
    }

    return Response.json({
      success: true,
      callId,
      status: callData.status, // 'queued', 'ringing', 'in-progress', 'forwarding', 'ended'
      endedReason: callData.endedReason,
      duration: callData.duration,
      verificationResult,
      transcript: transcript.substring(0, 500), // Truncate for response
      summary: analysis.summary || null,
      attestationCreated,
      attestationUID
    });

  } catch (error) {
    console.error('[VapiCallStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});