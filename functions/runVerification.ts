import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Main verification workflow orchestrator
 * Runs after consent is approved
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { verificationId } = await req.json();

    if (!verificationId) {
      return Response.json({ error: 'Missing verificationId' }, { status: 400 });
    }

    const verification = await base44.asServiceRole.entities.Verification.get(verificationId);

    if (!verification || verification.consent_status !== 'APPROVED') {
      return Response.json({ error: 'Invalid verification state' }, { status: 400 });
    }

    console.log(`[RunVerification] Starting workflow for ${verification.id}`);

    // Step 1: Web Scan (run employmentConfirmation)
    await base44.asServiceRole.entities.Verification.update(verificationId, {
      status: 'WEB_RUNNING',
      'progress.web_scan': {
        status: 'RUNNING',
        message: 'Scanning web for employment evidence',
        timestamp: new Date().toISOString()
      }
    });

    let webResult;
    try {
      const webResponse = await base44.asServiceRole.functions.invoke('employmentConfirmation', {
        candidateName: verification.candidate_name,
        employers: [{ name: verification.company_name }]
      });

      webResult = webResponse.data.results[verification.company_name];

      if (webResult?.status === 'verified') {
        // Web evidence conclusive - DONE
        await base44.asServiceRole.entities.Verification.update(verificationId, {
          status: 'COMPLETED',
          final_result: 'YES',
          final_reason: 'WEB_YES',
          web_evidence: webResult.sources || [],
          'progress.web_scan': {
            status: 'SUCCESS',
            message: `Found ${webResult.evidence_count} web sources`,
            timestamp: new Date().toISOString()
          },
          'progress.final_outcome': {
            status: 'SUCCESS',
            message: 'Employment verified via web evidence',
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({ success: true, result: 'WEB_YES' });
      }

      // Web inconclusive - proceed to contact discovery
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        'progress.web_scan': {
          status: 'SUCCESS',
          message: 'Web scan complete - no conclusive evidence',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[RunVerification] Web scan error:', error);
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        'progress.web_scan': {
          status: 'FAILED',
          message: `Web scan failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Step 2: Contact Discovery
    await base44.asServiceRole.entities.Verification.update(verificationId, {
      status: 'CONTACT_DISCOVERY_RUNNING',
      'progress.contact_discovery': {
        status: 'RUNNING',
        message: 'Discovering company contact information',
        timestamp: new Date().toISOString()
      }
    });

    let contactData;
    try {
      const contactResponse = await base44.asServiceRole.functions.invoke('contactDiscovery', {
        companyName: verification.company_name,
        companyDomain: verification.company_domain
      });

      contactData = contactResponse.data;

      await base44.asServiceRole.entities.Verification.update(verificationId, {
        contact_data: {
          phone: contactData.phone,
          email: contactData.email,
          notes: contactData.notes
        },
        'progress.contact_discovery': {
          status: 'SUCCESS',
          message: `Phone: ${contactData.phone.confidence}, Email: ${contactData.email.confidence}`,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[RunVerification] Contact discovery error:', error);
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        'progress.contact_discovery': {
          status: 'FAILED',
          message: `Contact discovery failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      });
      contactData = { phone: { confidence: 'NOT_FOUND' }, email: { confidence: 'NOT_FOUND' } };
    }

    // Step 3: Phone Call (if phone available)
    if (contactData.phone.confidence === 'HIGH') {
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        status: 'PHONE_RUNNING',
        'progress.phone_call': {
          status: 'RUNNING',
          message: 'Initiating phone verification',
          timestamp: new Date().toISOString()
        }
      });

      try {
        const phoneResponse = await base44.asServiceRole.functions.invoke('makePhoneCall', {
          verificationId,
          phoneNumber: contactData.phone.value,
          candidateName: verification.candidate_name,
          companyName: verification.company_name,
          jobTitle: verification.job_title
        });

        const phoneResult = phoneResponse.data.result;

        if (phoneResult === 'YES') {
          // Phone confirmed YES - DONE
          await base44.asServiceRole.entities.Verification.update(verificationId, {
            status: 'COMPLETED',
            final_result: 'YES',
            final_reason: 'PHONE_YES',
            'progress.phone_call': {
              status: 'SUCCESS',
              message: 'Employment confirmed via phone',
              timestamp: new Date().toISOString()
            },
            'progress.final_outcome': {
              status: 'SUCCESS',
              message: 'Employment verified via phone call',
              timestamp: new Date().toISOString()
            }
          });

          return Response.json({ success: true, result: 'PHONE_YES' });
        } else if (phoneResult === 'NO') {
          // Phone confirmed NO - DONE
          await base44.asServiceRole.entities.Verification.update(verificationId, {
            status: 'COMPLETED',
            final_result: 'NO',
            final_reason: 'PHONE_NO',
            'progress.phone_call': {
              status: 'SUCCESS',
              message: 'Employment denied via phone',
              timestamp: new Date().toISOString()
            },
            'progress.final_outcome': {
              status: 'SUCCESS',
              message: 'Employment verification failed via phone call',
              timestamp: new Date().toISOString()
            }
          });

          return Response.json({ success: true, result: 'PHONE_NO' });
        } else {
          // Phone inconclusive - try email
          await base44.asServiceRole.entities.Verification.update(verificationId, {
            'progress.phone_call': {
              status: 'SUCCESS',
              message: `Phone result: ${phoneResult}`,
              timestamp: new Date().toISOString()
            }
          });
        }

      } catch (error) {
        console.error('[RunVerification] Phone call error:', error);
        await base44.asServiceRole.entities.Verification.update(verificationId, {
          'progress.phone_call': {
            status: 'FAILED',
            message: `Phone call failed: ${error.message}`,
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      // No phone available - skip to email
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        'progress.phone_call': {
          status: 'SKIPPED',
          message: 'No high-confidence phone number found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Step 4: Email Outreach (if email available and phone was inconclusive)
    if (contactData.email.confidence === 'HIGH') {
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        status: 'EMAIL_SENT',
        'progress.email_outreach': {
          status: 'RUNNING',
          message: 'Email sent to HR - awaiting response',
          timestamp: new Date().toISOString()
        }
      });

      try {
        await base44.asServiceRole.functions.invoke('sendHREmail', {
          verificationId,
          emailAddress: contactData.email.value,
          candidateName: verification.candidate_name,
          companyName: verification.company_name,
          jobTitle: verification.job_title
        });

        await base44.asServiceRole.entities.Verification.update(verificationId, {
          'progress.email_outreach': {
            status: 'SUCCESS',
            message: 'Email sent - pending response',
            timestamp: new Date().toISOString()
          },
          'progress.final_outcome': {
            status: 'RUNNING',
            message: 'Awaiting email response (7 day window)',
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('[RunVerification] Email send error:', error);
      }
    } else {
      // No email available - verification inconclusive
      await base44.asServiceRole.entities.Verification.update(verificationId, {
        status: 'COMPLETED',
        final_result: 'INCONCLUSIVE',
        final_reason: 'NO_PHONE_NO_EMAIL',
        'progress.email_outreach': {
          status: 'SKIPPED',
          message: 'No high-confidence email found',
          timestamp: new Date().toISOString()
        },
        'progress.final_outcome': {
          status: 'SUCCESS',
          message: 'No reliable contact information found',
          timestamp: new Date().toISOString()
        }
      });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('[RunVerification] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});