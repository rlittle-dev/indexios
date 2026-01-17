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
      phoneNumber
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

    // Return success with processed data (Make.com can use this response)
    return Response.json({
      success: true,
      message: 'Webhook received successfully',
      data: normalizedData
    });

  } catch (error) {
    console.error('[VapiWebhook] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});