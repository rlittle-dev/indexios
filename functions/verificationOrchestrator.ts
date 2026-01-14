import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Known network-only employers (extended list)
const NETWORK_ONLY_EMPLOYERS = [
  'amazon', 'walmart', 'target', 'homedepot', 'lowes',
  'bestbuy', 'costco', 'kroger', 'walgreens', 'cvs',
  'mcdonalds', 'starbucks', 'chipotle', 'panera', 'subway'
];

// Known verification vendors/networks
const VERIFICATION_VENDORS = [
  { name: 'the work number', vendor: 'Equifax Work Number' },
  { name: 'equifax', vendor: 'Equifax' },
  { name: 'truework', vendor: 'Truework' },
  { name: 'hireright', vendor: 'HireRight' },
  { name: 'sterling', vendor: 'Sterling' },
  { name: 'checkr', vendor: 'Checkr' },
  { name: 'adp verification', vendor: 'ADP' }
];

// Policy keywords that indicate explicit verification info
const VERIFICATION_POLICY_KEYWORDS = [
  'employment verification',
  'verify employment',
  'verification request',
  'verification portal',
  'send verification requests to',
  'hr verification',
  'background check verification',
  'do not verify employment'
];

function normalizeEmployerDomain(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function addArtifact(label, type, value = '') {
  return {
    type,
    value,
    label,
    timestamp: new Date().toISOString()
  };
}

/**
 * Web-based policy discovery
 * Simulates checking employer website/public info for verification instructions
 */
async function runWebPolicyDiscovery(base44, employerName, employerDomain) {
  console.log(`[Policy Discovery] Running web-based discovery for ${employerName}`);

  const artifacts = [];
  
  // Check cache first
  const cachedPolicies = await base44.entities.EmployerVerificationPolicy.filter({ 
    employerDomain 
  });
  
  if (cachedPolicies.length > 0) {
    const policy = cachedPolicies[0];
    console.log(`[Policy Discovery] Cache hit for ${employerName}: ${policy.recommendedMethod}`);
    
    artifacts.push(addArtifact(
      `Cached policy: ${policy.policyNotes}`,
      'policy_cache',
      policy.id
    ));

    if (policy.isNetworkOnly) {
      return {
        policyFound: true,
        recommendedMethod: 'network',
        verificationVendor: policy.verificationVendor,
        policyNotes: policy.policyNotes,
        artifacts
      };
    }

    return {
      policyFound: true,
      recommendedMethod: policy.recommendedMethod,
      policyNotes: policy.policyNotes,
      artifacts
    };
  }

  // Simulate web search/scraping (in production, this would call an LLM or scraper)
  // For now, use heuristics

  // Check if known network-only employer
  if (NETWORK_ONLY_EMPLOYERS.some(e => employerDomain.includes(e))) {
    const policy = {
      employerDomain,
      employerName,
      recommendedMethod: 'network',
      isNetworkOnly: true,
      verificationVendor: 'The Work Number',
      policyNotes: 'Large enterprise - employment verification via The Work Number only',
      lastChecked: new Date().toISOString()
    };

    await base44.entities.EmployerVerificationPolicy.create(policy);
    
    artifacts.push(addArtifact(
      'Known network-only employer - requires The Work Number',
      'policy_discovery',
      'The Work Number'
    ));

    console.log(`[Policy Discovery] ${employerName} is network-only`);

    return {
      policyFound: true,
      recommendedMethod: 'network',
      verificationVendor: 'The Work Number',
      policyNotes: policy.policyNotes,
      artifacts
    };
  }

  // Check if verification vendor in name
  const vendorMatch = VERIFICATION_VENDORS.find(v => 
    employerName.toLowerCase().includes(v.name)
  );
  
  if (vendorMatch) {
    artifacts.push(addArtifact(
      `Verification vendor identified: ${vendorMatch.vendor}`,
      'vendor_identified',
      vendorMatch.vendor
    ));

    console.log(`[Policy Discovery] ${employerName} uses vendor: ${vendorMatch.vendor}`);

    return {
      policyFound: true,
      recommendedMethod: 'network',
      verificationVendor: vendorMatch.vendor,
      policyNotes: `Employment verification handled by ${vendorMatch.vendor}`,
      artifacts
    };
  }

  // No policy found via web
  console.log(`[Policy Discovery] No web-based policy found for ${employerName}`);
  
  artifacts.push(addArtifact(
    'Web-based policy discovery completed - no explicit policy found',
    'policy_discovery',
    'none'
  ));

  return {
    policyFound: false,
    artifacts
  };
}

/**
 * Main orchestrator: determines stages, next steps, and routes
 * NOTE: This is called per employer, but public evidence is now batch-processed
 */
export async function orchestrateVerification(base44, employerName, employerPhone, candidateName = '', jobTitle = '', publicEvidenceResult = null) {
  const employerDomain = normalizeEmployerDomain(employerName);
  const artifacts = [];
  let stage = 'contact_enrichment';
  let stageHistory = [{ stage: 'contact_enrichment', timestamp: new Date().toISOString() }];

  console.log(`[Orchestrator] Starting verification for ${candidateName || 'unknown'} at ${employerName}`);

  // STAGE 1: Contact Enrichment
  if (employerPhone) {
    artifacts.push(addArtifact(
      'Contact information found (phone number)',
      'contact_info',
      employerPhone
    ));
    console.log(`[Orchestrator] Contact enrichment complete: phone found`);
  } else {
    artifacts.push(addArtifact(
      'No phone number available',
      'contact_info',
      'none'
    ));
    console.log(`[Orchestrator] Contact enrichment: no phone found`);
  }

  // STAGE 2: Policy Discovery (automatic)
  stage = 'policy_discovery';
  stageHistory.push({ stage: 'policy_discovery', timestamp: new Date().toISOString() });

  const policyResult = await runWebPolicyDiscovery(base44, employerName, employerDomain);
  artifacts.push(...policyResult.artifacts);

  // Decision tree based on discovery results
  if (policyResult.policyFound) {
    if (policyResult.recommendedMethod === 'network') {
      // Network required - this is a completion state
      stage = 'completion';
      stageHistory.push({ stage: 'completion', timestamp: new Date().toISOString() });

      return {
        stage,
        stageHistory,
        status: 'completed',
        outcome: 'network_required',
        method: 'network',
        confidence: 0.95,
        isVerified: false,
        nextSteps: [{
          action: 'start_network_verification',
          label: `Verify via ${policyResult.verificationVendor || 'verification network'}`,
          enabled: false,
          priority: 1
        }],
        proofArtifacts: artifacts
      };
    }
  }

  // STAGE 3: Public Evidence Verification (automatic, runs for all non-network cases)
  // NOTE: Evidence is now passed in from batch processing
  if (publicEvidenceResult) {
    stage = 'public_evidence_verification';
    stageHistory.push({ stage: 'public_evidence_verification', timestamp: new Date().toISOString() });

    console.log(`[Orchestrator] Using public evidence result for ${employerName}`);

    artifacts.push(...publicEvidenceResult.artifacts);

    // If high confidence public evidence found, mark as verified
    if (publicEvidenceResult.isVerified && publicEvidenceResult.confidence >= 0.85) {
      stage = 'completion';
      stageHistory.push({ stage: 'completion', timestamp: new Date().toISOString() });

      console.log(`[Orchestrator] ✅ Verified via public evidence (${publicEvidenceResult.confidence})`);

      return {
        stage,
        stageHistory,
        status: 'completed',
        outcome: 'verified_public_evidence',
        method: 'public_evidence',
        confidence: publicEvidenceResult.confidence,
        isVerified: true,
        nextSteps: [],
        proofArtifacts: artifacts
      };
    }

    // Medium confidence - public evidence helps but not conclusive
    if (publicEvidenceResult.confidence >= 0.6) {
      console.log(`[Orchestrator] Partial public evidence found (${publicEvidenceResult.confidence})`);
      
      // If we also have a policy, combine them
      if (policyResult.policyFound) {
        return {
          stage,
          stageHistory,
          status: 'action_required',
          outcome: 'policy_identified',
          method: 'policy_discovery',
          confidence: Math.max(0.7, publicEvidenceResult.confidence),
          isVerified: false,
          nextSteps: [
            {
              action: 'send_email_request',
              label: 'Send verification request email',
              enabled: false,
              priority: 1
            },
            {
              action: 'start_ai_policy_call',
              label: 'Start AI call for detailed policy',
              enabled: false,
              priority: 2
            }
          ],
          proofArtifacts: artifacts
        };
      }
    }
  }

  // If policy found but no strong public evidence
  if (policyResult.policyFound) {
    return {
      stage: 'policy_discovery',
      stageHistory,
      status: 'action_required',
      outcome: 'policy_identified',
      method: 'policy_discovery',
      confidence: 0.7,
      isVerified: false,
      nextSteps: [
        {
          action: 'send_email_request',
          label: 'Send verification request email',
          enabled: false,
          priority: 1
        },
        {
          action: 'start_ai_policy_call',
          label: 'Start AI call for detailed policy',
          enabled: false,
          priority: 2
        }
      ],
      proofArtifacts: artifacts
    };
  }

  // No policy or strong evidence - determine next steps based on contact info
  if (employerPhone) {
    // Have phone but no policy/evidence - AI call is needed
    return {
      stage: stage === 'public_evidence_verification' ? stage : 'policy_discovery',
      stageHistory,
      status: 'action_required',
      outcome: 'contact_identified',
      method: 'contact_enrichment',
      confidence: 0.3,
      isVerified: false,
      nextSteps: [
        {
          action: 'start_ai_policy_call',
          label: 'Run AI call for policy discovery',
          enabled: false,
          priority: 1
        },
        {
          action: 'mark_unable_to_verify',
          label: 'Mark as unable to verify',
          enabled: true,
          priority: 3
        }
      ],
      proofArtifacts: artifacts
    };
  }

  // No phone, no policy - dead end
  stage = 'completion';
  stageHistory.push({ stage: 'completion', timestamp: new Date().toISOString() });

  return {
    stage,
    stageHistory,
    status: 'completed',
    outcome: 'unable_to_verify',
    method: 'contact_enrichment',
    confidence: 0.1,
    isVerified: false,
    nextSteps: [],
    proofArtifacts: artifacts
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employerName, employerPhone, candidateName, jobTitle, publicEvidenceResult } = await req.json();

    if (!employerName) {
      return Response.json({ error: 'Missing employerName' }, { status: 400 });
    }

    const result = await orchestrateVerification(base44, employerName, employerPhone, candidateName, jobTitle, publicEvidenceResult);

    return Response.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Orchestrator error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});