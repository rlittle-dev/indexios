import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const POSTMARK_API_KEY = Deno.env.get('POSTMARK_API_KEY');
const POSTMARK_INBOUND_ADDRESS = Deno.env.get('POSTMARK_INBOUND_ADDRESS');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tier access
    const userTier = user.subscription_tier || 'free';
    if (userTier !== 'professional' && userTier !== 'enterprise') {
      return Response.json({ 
        error: 'Email verification requires Professional or Enterprise plan' 
      }, { status: 403 });
    }

    const { hrEmail, companyName, candidateName, uniqueCandidateId } = await req.json();

    if (!hrEmail || !companyName || !candidateName) {
      return Response.json({ 
        error: 'Missing required fields: hrEmail, companyName, candidateName' 
      }, { status: 400 });
    }

    if (!uniqueCandidateId) {
      return Response.json({ 
        error: 'Missing uniqueCandidateId - candidate must be linked first' 
      }, { status: 400 });
    }

    // Create a verification token to track the request
    const verificationToken = `${uniqueCandidateId}_${companyName.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
    
    // Construct reply-to address with token for tracking
    // Format: verify+TOKEN@inbound.postmarkapp.com
    const inboundDomain = POSTMARK_INBOUND_ADDRESS.split('@')[1];
    const replyToAddress = `verify+${verificationToken}@${inboundDomain}`;

    console.log(`[SendVerificationEmail] Sending to ${hrEmail} for ${candidateName} at ${companyName}`);
    console.log(`[SendVerificationEmail] Reply-to: ${replyToAddress}`);

    // Send email via Postmark
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_API_KEY
      },
      body: JSON.stringify({
        From: 'verify@indexios.me', // Must be a verified sender in Postmark
        To: hrEmail,
        ReplyTo: replyToAddress,
        Subject: `Employment Verification Request - ${candidateName}`,
        TextBody: `Hello,

We are conducting an employment verification on behalf of a prospective employer.

Could you please confirm if the following individual was employed at ${companyName}?

Candidate Name: ${candidateName}

Please reply to this email with one of the following responses:
- "YES" or "CONFIRMED" if this person was employed at ${companyName}
- "NO" or "NOT EMPLOYED" if this person was never employed at ${companyName}
- "UNABLE TO DISCLOSE" if company policy prevents you from confirming

This is an automated verification request from Indexios (https://indexios.me).

Thank you for your time.

Best regards,
Indexios Employment Verification Team`,
        HtmlBody: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Employment Verification Request</h2>
  
  <p>Hello,</p>
  
  <p>We are conducting an employment verification on behalf of a prospective employer.</p>
  
  <p>Could you please confirm if the following individual was employed at <strong>${companyName}</strong>?</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Candidate Name:</strong> ${candidateName}</p>
  </div>
  
  <p>Please reply to this email with one of the following responses:</p>
  <ul>
    <li><strong>"YES"</strong> or <strong>"CONFIRMED"</strong> if this person was employed at ${companyName}</li>
    <li><strong>"NO"</strong> or <strong>"NOT EMPLOYED"</strong> if this person was never employed at ${companyName}</li>
    <li><strong>"UNABLE TO DISCLOSE"</strong> if company policy prevents you from confirming</li>
  </ul>
  
  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    This is an automated verification request from <a href="https://indexios.me">Indexios</a>.
  </p>
  
  <p>Thank you for your time.</p>
  
  <p>Best regards,<br>Indexios Employment Verification Team</p>
</div>
`,
        Tag: 'employment-verification',
        Metadata: {
          uniqueCandidateId,
          companyName,
          candidateName,
          verificationToken
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SendVerificationEmail] Postmark error:', result);
      return Response.json({ 
        error: 'Failed to send email',
        details: result.Message 
      }, { status: 500 });
    }

    console.log(`[SendVerificationEmail] Email sent successfully. MessageID: ${result.MessageID}`);

    // Update UniqueCandidate to mark email as pending
    try {
      const candidates = await base44.asServiceRole.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        const existingEmployers = candidate.employers || [];
        const companyNorm = companyName.toLowerCase().trim();
        
        const employerIndex = existingEmployers.findIndex(e => 
          e.employer_name?.toLowerCase().trim() === companyNorm ||
          e.employer_name?.toLowerCase().includes(companyNorm) ||
          companyNorm.includes(e.employer_name?.toLowerCase().trim() || '')
        );

        const updatedEmployers = [...existingEmployers];
        
        if (employerIndex >= 0) {
          updatedEmployers[employerIndex] = {
            ...updatedEmployers[employerIndex],
            email_verification_status: 'pending',
            email_verification_token: verificationToken,
            email_sent_date: new Date().toISOString(),
            email_sent_to: hrEmail
          };
        } else {
          updatedEmployers.push({
            employer_name: companyName,
            web_evidence_status: 'no',
            call_verification_status: 'not_called',
            email_verification_status: 'pending',
            email_verification_token: verificationToken,
            email_sent_date: new Date().toISOString(),
            email_sent_to: hrEmail,
            evidence_count: 0
          });
        }

        await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
          employers: updatedEmployers
        });
        console.log(`[SendVerificationEmail] Updated UniqueCandidate with pending email status`);
      }
    } catch (updateError) {
      console.error('[SendVerificationEmail] UniqueCandidate update error:', updateError.message);
    }

    return Response.json({
      success: true,
      messageId: result.MessageID,
      status: 'pending',
      message: 'Verification email sent successfully. Results will update when HR responds.'
    });

  } catch (error) {
    console.error('[SendVerificationEmail] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});