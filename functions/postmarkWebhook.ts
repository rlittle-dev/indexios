import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const POSTMARK_WEBHOOK_SECRET = Deno.env.get('POSTMARK_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    // Verify webhook secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== POSTMARK_WEBHOOK_SECRET) {
      console.error('[PostmarkWebhook] Invalid webhook secret');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    
    console.log('[PostmarkWebhook] Received inbound email:', JSON.stringify(payload, null, 2));

    // Extract the verification token from the To address
    // Format: verify+TOKEN@inbound.postmarkapp.com
    const toAddress = payload.ToFull?.[0]?.Email || payload.To || '';
    const tokenMatch = toAddress.match(/verify\+([^@]+)@/);
    
    if (!tokenMatch) {
      console.log('[PostmarkWebhook] No verification token found in To address:', toAddress);
      return Response.json({ success: true, message: 'No verification token - ignoring' });
    }

    const verificationToken = tokenMatch[1];
    console.log(`[PostmarkWebhook] Verification token: ${verificationToken}`);

    // Parse token: uniqueCandidateId_companyName_timestamp
    const tokenParts = verificationToken.split('_');
    if (tokenParts.length < 3) {
      console.error('[PostmarkWebhook] Invalid token format:', verificationToken);
      return Response.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const uniqueCandidateId = tokenParts[0];
    const companyNameFromToken = tokenParts[1];

    // Get email content
    const emailBody = payload.TextBody || payload.StrippedTextReply || '';
    const fromEmail = payload.FromFull?.Email || payload.From || '';
    const subject = payload.Subject || '';

    console.log(`[PostmarkWebhook] Email from: ${fromEmail}`);
    console.log(`[PostmarkWebhook] Subject: ${subject}`);
    console.log(`[PostmarkWebhook] Body preview: ${emailBody.substring(0, 200)}`);

    // Analyze the response to determine verification result
    const bodyLower = emailBody.toLowerCase();
    const subjectLower = subject.toLowerCase();
    const combinedText = bodyLower + ' ' + subjectLower;

    let verificationResult = 'INCONCLUSIVE';

    // Check for positive confirmation
    if (
      combinedText.includes('yes') ||
      combinedText.includes('confirmed') ||
      combinedText.includes('confirm') ||
      combinedText.includes('verify') ||
      combinedText.includes('was employed') ||
      combinedText.includes('did work') ||
      combinedText.includes('worked here') ||
      combinedText.includes('employment confirmed')
    ) {
      // Make sure it's not a negative
      if (!combinedText.includes('not employed') && 
          !combinedText.includes('no record') && 
          !combinedText.includes('never worked') &&
          !combinedText.includes('cannot confirm')) {
        verificationResult = 'YES';
      }
    }

    // Check for negative response
    if (
      combinedText.includes('no record') ||
      combinedText.includes('not employed') ||
      combinedText.includes('never worked') ||
      combinedText.includes('no employment') ||
      combinedText.includes('was not employed') ||
      combinedText.includes('did not work')
    ) {
      verificationResult = 'NO';
    }

    // Check for refusal to disclose
    if (
      combinedText.includes('unable to disclose') ||
      combinedText.includes('cannot disclose') ||
      combinedText.includes('policy') ||
      combinedText.includes('not allowed') ||
      combinedText.includes('cannot confirm or deny') ||
      combinedText.includes('refuse')
    ) {
      verificationResult = 'REFUSE_TO_DISCLOSE';
    }

    console.log(`[PostmarkWebhook] Determined verification result: ${verificationResult}`);

    // Update UniqueCandidate with the result
    const base44 = createClientFromRequest(req);
    
    try {
      const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
      
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        const existingEmployers = candidate.employers || [];
        
        // Find employer by token or company name
        const employerIndex = existingEmployers.findIndex(e => 
          e.email_verification_token === verificationToken ||
          e.employer_name?.toLowerCase().replace(/[^a-z0-9]/g, '') === companyNameFromToken.toLowerCase()
        );

        if (employerIndex >= 0) {
          // Map verification result to status
          let emailStatus = 'inconclusive';
          if (verificationResult === 'YES') emailStatus = 'yes';
          else if (verificationResult === 'NO') emailStatus = 'no';
          else if (verificationResult === 'REFUSE_TO_DISCLOSE') emailStatus = 'refused_to_disclose';

          const updatedEmployers = [...existingEmployers];
          updatedEmployers[employerIndex] = {
            ...updatedEmployers[employerIndex],
            email_verification_status: emailStatus,
            email_verified_date: new Date().toISOString(),
            email_response_from: fromEmail,
            email_response_preview: emailBody.substring(0, 200)
          };

          await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
            employers: updatedEmployers
          });

          console.log(`[PostmarkWebhook] Updated UniqueCandidate ${uniqueCandidateId} with email verification: ${emailStatus}`);

          // Create attestation for conclusive results
          if (verificationResult !== 'INCONCLUSIVE') {
            try {
              let verificationOutcome = 0;
              if (verificationResult === 'YES') verificationOutcome = 1;
              else if (verificationResult === 'NO') verificationOutcome = 2;
              else if (verificationResult === 'REFUSE_TO_DISCLOSE') verificationOutcome = 3;

              const companyName = updatedEmployers[employerIndex].employer_name || companyNameFromToken;
              const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

              const attestationResponse = await base44.asServiceRole.functions.invoke('createAttestation', {
                uniqueCandidateId: uniqueCandidateId,
                companyDomain: companyDomain,
                verificationType: 'email',
                verificationOutcome: verificationOutcome,
                verificationReason: `Email verification from ${fromEmail}: ${verificationResult}`
              });

              if (attestationResponse.data?.attestationUID) {
                const attestationUID = attestationResponse.data.attestationUID;
                console.log(`[PostmarkWebhook] Created attestation: ${attestationUID}`);

                // Update employer with attestation UID
                const finalEmployers = [...updatedEmployers];
                finalEmployers[employerIndex].attestation_uid = attestationUID;
                finalEmployers[employerIndex].email_attestation_uid = attestationUID;

                await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
                  employers: finalEmployers,
                  attestation_uid: attestationUID,
                  attestation_date: new Date().toISOString()
                });
                
                // Boost the Candidate scan's legitimacy score if verification was positive
                if (verificationResult === 'YES') {
                  try {
                    // Find the original Candidate scan that matches this candidate
                    const candidateScans = await base44.asServiceRole.entities.Candidate.filter({});
                    const matchingScan = candidateScans.find(scan => {
                      const scanNameNorm = (scan.name || '').toLowerCase().trim();
                      const candNameNorm = (candidate.name || '').toLowerCase().trim();
                      return scanNameNorm === candNameNorm || 
                             (candidate.email && scan.email === candidate.email);
                    });
                    
                    if (matchingScan && matchingScan.legitimacy_score) {
                      // Calculate boost: +7 points per verified company (max 100)
                      const boostAmount = 7;
                      const newScore = Math.min(100, matchingScan.legitimacy_score + boostAmount);
                      
                      // Also boost experience verification score
                      const currentExpScore = matchingScan.analysis?.experience_verification || 0;
                      const newExpScore = Math.min(100, currentExpScore + 10);
                      
                      const companyName = finalEmployers[employerIndex].employer_name || companyNameFromToken;
                      
                      await base44.asServiceRole.entities.Candidate.update(matchingScan.id, {
                        legitimacy_score: newScore,
                        analysis: {
                          ...matchingScan.analysis,
                          experience_verification: newExpScore,
                          experience_details: (matchingScan.analysis?.experience_details || '') + 
                            `\n\n✓ Employment at ${companyName} verified via email on ${new Date().toLocaleDateString()}.`
                        }
                      });
                      console.log(`[PostmarkWebhook] Boosted Candidate ${matchingScan.id} legitimacy score: ${matchingScan.legitimacy_score} -> ${newScore}`);
                    }
                  } catch (boostErr) {
                    console.error(`[PostmarkWebhook] Failed to boost legitimacy score:`, boostErr.message);
                  }
                }
              }
            } catch (attestError) {
              console.error('[PostmarkWebhook] Attestation error:', attestError.message);
            }
          }
        } else {
          console.error(`[PostmarkWebhook] Could not find employer for token: ${verificationToken}`);
        }
      } else {
        console.error(`[PostmarkWebhook] UniqueCandidate not found: ${uniqueCandidateId}`);
      }
    } catch (dbError) {
      console.error('[PostmarkWebhook] Database error:', dbError.message);
    }

    return Response.json({
      success: true,
      verificationResult,
      uniqueCandidateId,
      message: 'Email processed successfully'
    });

  } catch (error) {
    console.error('[PostmarkWebhook] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});