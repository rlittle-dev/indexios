import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, candidateName: inputCandidateName, companyName: inputCompanyName, uniqueCandidateId: inputUniqueCandidateId, companyDomain: inputCompanyDomain } = await req.json();

    if (!callId) {
      return Response.json({ error: 'Missing callId' }, { status: 400 });
    }

    console.log(`[VapiCallStatus] Checking status for call: ${callId}`);

    // Get call details from VAPI with safe response parsing
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
        details: responseText.substring(0, 200),
        rawResponse: responseText
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
    const structuredOutputs = callData.structuredOutputs || {};
    
    // Debug log structured outputs
    console.log(`[VapiCallStatus] structuredOutputs keys:`, Object.keys(structuredOutputs));
    console.log(`[VapiCallStatus] structuredOutputs:`, JSON.stringify(structuredOutputs, null, 2));
    
    // Primary: Check for direct verification_result in structured outputs
    if (structuredOutputs.verification_result?.result) {
      const directResult = structuredOutputs.verification_result.result.toUpperCase();
      if (['YES', 'NO', 'REFUSE_TO_DISCLOSE', 'INCONCLUSIVE'].includes(directResult)) {
        verificationResult = directResult;
        console.log(`[VapiCallStatus] Got verification_result from structuredOutputs: ${verificationResult}`);
      }
    }
    // Secondary: Map boolean structured outputs
    else if (structuredOutputs.worked_there !== undefined || structuredOutputs.refuse_to_disclose !== undefined) {
      const workedThere = structuredOutputs.worked_there?.result;
      const refuseToDisclose = structuredOutputs.refuse_to_disclose?.result;
      const verificationMethod = structuredOutputs.verification_method?.result;
      
      console.log(`[VapiCallStatus] Mapping booleans - workedThere: ${workedThere}, refuseToDisclose: ${refuseToDisclose}, verificationMethod: ${verificationMethod}`);
      
      if (refuseToDisclose === true) {
        verificationResult = 'REFUSE_TO_DISCLOSE';
      } else if (workedThere === true) {
        verificationResult = 'YES';
      } else if (workedThere === false) {
        // Check if it was no answer/voicemail - treat as inconclusive
        if (verificationMethod === 'no_answer_or_voicemail') {
          verificationResult = 'INCONCLUSIVE';
        } else {
          verificationResult = 'NO';
        }
      }
      console.log(`[VapiCallStatus] Mapped boolean result: ${verificationResult}`);
    }
    // Legacy: Check analysis.structuredData
    else if (analysis.structuredData?.verificationResult) {
      verificationResult = analysis.structuredData.verificationResult;
      console.log(`[VapiCallStatus] Got verificationResult from analysis.structuredData: ${verificationResult}`);
    }
    // Fallback: Analyze transcript for keywords
    else if (transcript) {
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
      console.log(`[VapiCallStatus] Fallback transcript analysis result: ${verificationResult}`);
    }

    console.log(`[VapiCallStatus] Call ${callId} status: ${callData.status}, final verificationResult: ${verificationResult}`);

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
      
      // Get company domain from metadata/variableValues - DO NOT fabricate
      const companyDomain = callData.assistantOverrides?.variableValues?.companyDomain || 
                           callData.metadata?.companyDomain ||
                           callData.assistant?.variableValues?.companyDomain ||
                           inputCompanyDomain;

      console.log(`[VapiCallStatus] Call ended for candidate: ${candidateName}, company: ${companyName}, uniqueId: ${uniqueCandidateId}, domain: ${companyDomain}`);

      // Update UniqueCandidate with call result (only create attestation for non-INCONCLUSIVE results)
      const shouldCreateAttestation = verificationResult !== 'INCONCLUSIVE';
      console.log(`[VapiCallStatus] shouldCreateAttestation=${shouldCreateAttestation}, uniqueCandidateId=${uniqueCandidateId}, companyName=${companyName}, companyDomain=${companyDomain}`);
      
      if (uniqueCandidateId && companyName) {
        try {
          console.log(`[VapiCallStatus] Fetching UniqueCandidate...`);
          const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
          console.log(`[VapiCallStatus] Found ${candidates?.length || 0} candidates`);
          
          if (candidates && candidates.length > 0) {
            const candidate = candidates[0];
            console.log(`[VapiCallStatus] Processing candidate:`, candidate.id);
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
            
            // Try to get domain from employer's hr_phone source if not provided
            let resolvedDomain = companyDomain;
            if (!resolvedDomain && employerIndex >= 0 && existingEmployers[employerIndex]?.hr_phone?.source) {
              resolvedDomain = existingEmployers[employerIndex].hr_phone.source;
              console.log(`[VapiCallStatus] Resolved domain from hr_phone.source: ${resolvedDomain}`);
            }
            
            if (employerIndex >= 0) {
              // Check if already verified - skip if already has attestation
              const existingStatus = updatedEmployers[employerIndex].call_verification_status;
              console.log(`[VapiCallStatus] Employer ${companyName} existing status: ${existingStatus}, attestation_uid: ${updatedEmployers[employerIndex].attestation_uid}`);
              
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
            console.log(`[VapiCallStatus] Updated UniqueCandidate ${uniqueCandidateId} employer ${companyName} with status: ${callStatus}`);

            // Create blockchain attestation (only for non-INCONCLUSIVE results)
            console.log(`[VapiCallStatus] Checking attestation condition: shouldCreateAttestation=${shouldCreateAttestation}, resolvedDomain=${resolvedDomain}`);
            if (shouldCreateAttestation) {
              // Check if we have a valid domain - DO NOT fabricate
              if (!resolvedDomain) {
                console.log(`[VapiCallStatus] SKIPPING attestation - no valid company domain available. Cannot fabricate domain from company name.`);
              } else {
                console.log(`[VapiCallStatus] ENTERING attestation block with domain: ${resolvedDomain}`);
                try {
                  console.log(`[VapiCallStatus] Inside try block for attestation`);
                  // Map verification result to outcome code
                  let verificationOutcome = 0; // inconclusive
                  if (verificationResult === 'YES') verificationOutcome = 1;
                  else if (verificationResult === 'NO') verificationOutcome = 2;
                  else if (verificationResult === 'REFUSE_TO_DISCLOSE') verificationOutcome = 3;

                  console.log(`[VapiCallStatus] Creating attestation with params:`, {
                    uniqueCandidateId,
                    companyDomain: resolvedDomain,
                    verificationType: 'phone_call',
                    verificationOutcome
                  });

                  // Call createAttestation via service role
                  console.log(`[vapiCallStatus] invoking createAttestation internal`);
                  
                  const attestationResult = await base44.asServiceRole.functions.invoke('createAttestation', {
                    uniqueCandidateId: uniqueCandidateId,
                    companyDomain: resolvedDomain,
                    verificationType: 'phone_call',
                    verificationOutcome: verificationOutcome,
                    verificationReason: analysis.summary || `Phone verification result: ${verificationResult}`,
                    _internal: true
                  });
                  
                  const attestationData = attestationResult?.data || attestationResult;
                  console.log(`[VapiCallStatus] createAttestation response:`, JSON.stringify(attestationData, null, 2));
                  
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
                  console.error('[VapiCallStatus] Attestation error (full):', attestError);
                }
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