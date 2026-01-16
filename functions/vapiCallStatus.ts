import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await req.json();

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

    const callData = await response.json();

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

    return Response.json({
      success: true,
      callId,
      status: callData.status, // 'queued', 'ringing', 'in-progress', 'forwarding', 'ended'
      endedReason: callData.endedReason,
      duration: callData.duration,
      verificationResult,
      transcript: transcript.substring(0, 500), // Truncate for response
      summary: analysis.summary || null
    });

  } catch (error) {
    console.error('[VapiCallStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});