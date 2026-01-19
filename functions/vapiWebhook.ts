import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MAKE_WEBHOOK_SECRET = Deno.env.get('MAKE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    // Verify webhook secret (passed as query param or header)
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    
    if (secret !== MAKE_WEBHOOK_SECRET) {
      console.error('[VapiWebhook] Invalid webhook secret');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    
    console.log('[VapiWebhook] Received payload:', JSON.stringify(payload, null, 2));

    // Extract data from Make.com/VAPI payload
    const {
      call_id,
      callId,
      status,
      ended_reason,
      endedReason,
      transcript,
      duration,
      candidate_name,
      candidateName,
      company_name,
      companyName,
      verification_result,
      verificationResult,
      summary,
      phone_number,
      phoneNumber,
      unique_candidate_id,
      uniqueCandidateId
    } = payload;

    // Normalize field names (Make.com may use snake_case or camelCase)
    const normalizedData = {
      callId: call_id || callId,
      status: status || 'unknown',
      endedReason: ended_reason || endedReason,
      transcript: transcript || '',
      duration: duration || 0,
      candidateName: candidate_name || candidateName,
      companyName: company_name || companyName,
      verificationResult: verification_result || verificationResult || 'INCONCLUSIVE',
      summary: summary || '',
      phoneNumber: phone_number || phoneNumber,
      uniqueCandidateId: unique_candidate_id || uniqueCandidateId,
      receivedAt: new Date().toISOString()
    };

    console.log('[VapiWebhook] Normalized data:', normalizedData);

    // Parse verification result from transcript if not provided
    if (normalizedData.verificationResult === 'INCONCLUSIVE' && normalizedData.transcript) {
      const transcriptLower = normalizedData.transcript.toLowerCase();
      
      if (transcriptLower.includes('yes') && 
          (transcriptLower.includes('employed') || transcriptLower.includes('worked') || transcriptLower.includes('confirm'))) {
        normalizedData.verificationResult = 'YES';
      } else if (transcriptLower.includes('no') && 
          (transcriptLower.includes('record') || transcriptLower.includes('not employed') || transcriptLower.includes('never worked'))) {
        normalizedData.verificationResult = 'NO';
      } else if (transcriptLower.includes('cannot') || transcriptLower.includes('policy') || 
                 transcriptLower.includes('not allowed') || transcriptLower.includes('refuse')) {
        normalizedData.verificationResult = 'REFUSE_TO_DISCLOSE';
      }
    }

    // Optionally store result in database
    if (normalizedData.candidateName && normalizedData.companyName) {
      try {
        const base44 = createClientFromRequest(req);
        
        // Update VerifiedEmployment record with call result
        const candidateNorm = normalizedData.candidateName.toLowerCase().trim();
        const companyNorm = normalizedData.companyName.toLowerCase().trim();
        
        const existing = await base44.asServiceRole.entities.VerifiedEmployment.filter({
          candidate_name_normalized: candidateNorm,
          employer_name_normalized: companyNorm
        });

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.VerifiedEmployment.update(existing[0].id, {
            phone_verification_result: normalizedData.verificationResult,
            phone_verification_transcript: normalizedData.transcript.substring(0, 1000),
            phone_verification_date: normalizedData.receivedAt
          });
          console.log(`[VapiWebhook] Updated VerifiedEmployment record for ${normalizedData.candidateName} at ${normalizedData.companyName}`);
        }

        // Also update UniqueCandidate with call verification result
        const existingCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
        const matchingCandidate = existingCandidates.find(c => 
          c.name?.toLowerCase().trim() === candidateNorm
        );
        
        if (matchingCandidate) {
          const existingEmployers = matchingCandidate.employers || [];
          const employerIndex = existingEmployers.findIndex(e => 
            e.employer_name?.toLowerCase().trim() === companyNorm
          );
          
          if (employerIndex >= 0) {
            // Map verification result to call status
            let callStatus = 'inconclusive';
            if (normalizedData.verificationResult === 'YES') callStatus = 'yes';
            else if (normalizedData.verificationResult === 'NO') callStatus = 'no';
            else if (normalizedData.verificationResult === 'REFUSE_TO_DISCLOSE') callStatus = 'refused_to_disclose';
            
            const updatedEmployers = [...existingEmployers];
            updatedEmployers[employerIndex] = {
              ...updatedEmployers[employerIndex],
              call_verification_status: callStatus,
              call_verified_date: normalizedData.receivedAt
            };
            
            await base44.asServiceRole.entities.UniqueCandidate.update(matchingCandidate.id, {
              employers: updatedEmployers
            });
            console.log(`[VapiWebhook] Updated UniqueCandidate call verification for ${normalizedData.candidateName} at ${normalizedData.companyName}: ${callStatus}`);
          }
        }
      } catch (dbError) {
        console.error('[VapiWebhook] Database update error:', dbError.message);
        // Continue - don't fail webhook because of DB error
      }
    }

    // Create blockchain attestation if we have enough data
    let attestationResult = null;
    if (normalizedData.uniqueCandidateId && normalizedData.companyName && normalizedData.verificationResult !== 'INCONCLUSIVE') {
      try {
        const base44 = createClientFromRequest(req);
        
        // Map verification result to outcome code
        let verificationOutcome = 0; // inconclusive
        if (normalizedData.verificationResult === 'YES') verificationOutcome = 1;
        else if (normalizedData.verificationResult === 'NO') verificationOutcome = 2;
        else if (normalizedData.verificationResult === 'REFUSE_TO_DISCLOSE') verificationOutcome = 3;

        // Extract company domain from company name
        const companyDomain = normalizedData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

        console.log(`[VapiWebhook] Creating attestation with params:`, {
          uniqueCandidateId: normalizedData.uniqueCandidateId,
          companyDomain,
          verificationType: 'phone_call',
          verificationOutcome
        });

        const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
          uniqueCandidateId: normalizedData.uniqueCandidateId,
          companyDomain: companyDomain,
          verificationType: 'phone_call',
          verificationOutcome: verificationOutcome,
          verificationReason: normalizedData.summary || `Phone verification result: ${normalizedData.verificationResult}`
        });

        console.log(`[VapiWebhook] Attestation response:`, JSON.stringify(attestationResponse.data || attestationResponse, null, 2));

        // Handle both nested response and direct response formats
        const attestationData = attestationResponse.data || attestationResponse;
        
        if (attestationData?.attestationUID) {
          attestationResult = {
            attestationUID: attestationData.attestationUID,
            transactionHash: attestationData.transactionHash
          };
          console.log(`[VapiWebhook] Created attestation: ${attestationResult.attestationUID}`);
          
          // Also update the UniqueCandidate employer with attestation UID
          try {
            const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: normalizedData.uniqueCandidateId });
            if (candidates && candidates.length > 0) {
              const candidate = candidates[0];
              const companyNorm = normalizedData.companyName.toLowerCase().trim();
              const updatedEmployers = [...(candidate.employers || [])];
              
              const empIdx = updatedEmployers.findIndex(e => 
                e.employer_name?.toLowerCase().trim() === companyNorm ||
                e.employer_name?.toLowerCase().includes(companyNorm) ||
                companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
              );
              
              if (empIdx >= 0) {
                updatedEmployers[empIdx].attestation_uid = attestationData.attestationUID;
              }
              
              await base44.asServiceRole.entities.UniqueCandidate.update(normalizedData.uniqueCandidateId, {
                employers: updatedEmployers,
                attestation_uid: attestationData.attestationUID,
                attestation_date: new Date().toISOString()
              });
              console.log(`[VapiWebhook] Saved attestation UID to UniqueCandidate`);
            }
          } catch (updateErr) {
            console.error(`[VapiWebhook] Failed to update UniqueCandidate with attestation:`, updateErr.message);
          }
        } else if (attestationData?.error) {
          console.error(`[VapiWebhook] Attestation returned error: ${attestationData.error}`);
        }
      } catch (attestError) {
        console.error('[VapiWebhook] Attestation error:', attestError.message);
        console.error('[VapiWebhook] Attestation error stack:', attestError.stack);
      }
    }

    // Return success with processed data (Make.com can use this response)
    return Response.json({
      success: true,
      message: 'Webhook received successfully',
      data: normalizedData,
      attestation: attestationResult
    });

  } catch (error) {
    console.error('[VapiWebhook] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});