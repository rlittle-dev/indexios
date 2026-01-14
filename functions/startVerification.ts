import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Known network-only employers
const NETWORK_ONLY_EMPLOYERS = [
  'amazon', 'walmart', 'target', 'homedepot', 'lowes',
  'bestbuy', 'costco', 'kroger', 'walgreens', 'cvs'
];

// Known verification vendors/networks
const VERIFICATION_VENDORS = [
  'the work number', 'equifax', 'truework', 'hireright', 
  'sterling', 'checkr', 'adp verification'
];

// Keywords that indicate explicit verification policy
const VERIFICATION_POLICY_KEYWORDS = [
  'employment verification', 'verify employment', 
  'verification request', 'verification portal',
  'send verification requests to', 'hr verification',
  'background check verification'
];

function normalizeEmployerDomain(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

async function determineVerificationMethod(base44, employerName, employerPhone) {
  const domain = normalizeEmployerDomain(employerName);
  
  // Check cache for existing policy
  const policies = await base44.entities.EmployerVerificationPolicy.filter({ employerDomain: domain });
  if (policies.length > 0) {
    const policy = policies[0];
    
    if (policy.isNetworkOnly) {
      // Definitive: Network required
      return {
        status: 'completed',
        outcome: 'network_required',
        method: 'network',
        confidence: 0.95,
        isVerified: false,
        nextSteps: [{
          action: 'start_network_verification',
          label: `Start verification via ${policy.verificationVendor || 'verification network'}`,
          enabled: false // Not implemented yet
        }],
        proofArtifacts: [{
          type: 'policy_cache',
          value: policy.verificationVendor || 'Verification network',
          label: `Cached employer policy: ${policy.policyNotes}`
        }]
      };
    }

    // Policy identified but not definitive
    return {
      status: 'action_required',
      outcome: 'policy_identified',
      method: 'policy_discovery',
      confidence: 0.7,
      isVerified: false,
      nextSteps: [{
        action: 'send_email_request',
        label: 'Send verification request email',
        enabled: false
      }],
      proofArtifacts: [{
        type: 'policy_cache',
        value: policy.id,
        label: 'Cached employer policy'
      }]
    };
  }

  // Check if known network-only employer
  if (NETWORK_ONLY_EMPLOYERS.some(e => domain.includes(e))) {
    // Cache this policy
    await base44.entities.EmployerVerificationPolicy.create({
      employerDomain: domain,
      employerName,
      recommendedMethod: 'network',
      isNetworkOnly: true,
      verificationVendor: 'The Work Number',
      policyNotes: 'Large employer - verifies through The Work Number only',
      lastChecked: new Date().toISOString()
    });

    return {
      status: 'completed',
      outcome: 'network_required',
      method: 'network',
      confidence: 0.95,
      isVerified: false,
      nextSteps: [{
        action: 'start_network_verification',
        label: 'Start verification via The Work Number',
        enabled: false // Not implemented yet
      }],
      proofArtifacts: [{
        type: 'policy_discovery',
        value: 'The Work Number',
        label: 'Known network-only employer - requires The Work Number'
      }]
    };
  }

  // Check if verification vendor mentioned in name
  const vendor = VERIFICATION_VENDORS.find(v => employerName.toLowerCase().includes(v));
  if (vendor) {
    return {
      status: 'completed',
      outcome: 'network_required',
      method: 'network',
      confidence: 0.9,
      isVerified: false,
      nextSteps: [{
        action: 'start_network_verification',
        label: `Start verification via ${vendor}`,
        enabled: false
      }],
      proofArtifacts: [{
        type: 'vendor_identified',
        value: vendor,
        label: `Verification vendor identified: ${vendor}`
      }]
    };
  }

  // If we only have contact info (phone/email) but no explicit verification policy
  if (employerPhone) {
    return {
      status: 'action_required',
      outcome: 'contact_identified',
      method: 'contact_enrichment',
      confidence: 0.3,
      isVerified: false,
      nextSteps: [
        {
          action: 'start_policy_identification_call',
          label: 'Start policy identification (AI call)',
          enabled: false // Coming soon
        },
        {
          action: 'mark_unable_to_verify',
          label: 'Mark as unable to verify',
          enabled: true
        }
      ],
      proofArtifacts: [{
        type: 'contact_info',
        value: employerPhone,
        label: 'Contact information found (phone number)'
      }]
    };
  }

  // No contact info or policy found - definitive dead end
  return {
    status: 'completed',
    outcome: 'unable_to_verify',
    method: 'contact_enrichment',
    confidence: 0.1,
    isVerified: false,
    nextSteps: [],
    proofArtifacts: [{
      type: 'no_contact',
      value: '',
      label: 'No contact information or verification policy found'
    }]
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, employers } = await req.json();

    if (!candidateId || !employers || !Array.isArray(employers)) {
      return Response.json({ 
        error: 'Missing required fields: candidateId, employers (array)' 
      }, { status: 400 });
    }

    console.log(`Starting verification for ${employers.length} employers on candidate ${candidateId}`);

    const verificationRecords = [];

    for (const employer of employers) {
      const { name, phone } = employer;
      if (!name) continue;

      // Check if verification already exists
      const existing = await base44.entities.EmployerVerification.filter({
        candidateId,
        employerName: name
      });

      if (existing.length > 0) {
        console.log(`Verification already exists for ${name}, skipping`);
        verificationRecords.push(existing[0]);
        continue;
      }

      // Determine verification method and status
      const result = await determineVerificationMethod(base44, name, phone);

      // Create verification record
      const verificationData = {
        candidateId,
        employerName: name,
        employerDomain: normalizeEmployerDomain(name),
        employerPhone: phone || '',
        status: result.status,
        outcome: result.outcome,
        method: result.method,
        confidence: result.confidence,
        isVerified: result.isVerified,
        nextSteps: result.nextSteps,
        proofArtifacts: result.proofArtifacts
      };

      // Only set completedAt if status is completed
      if (result.status === 'completed') {
        verificationData.completedAt = new Date().toISOString();
      }

      const verification = await base44.entities.EmployerVerification.create(verificationData);

      console.log(`Created verification for ${name}: ${result.status} / ${result.outcome} (confidence: ${result.confidence})`);
      verificationRecords.push(verification);
    }

    return Response.json({
      success: true,
      verifications: verificationRecords,
      count: verificationRecords.length
    });

  } catch (error) {
    console.error('Start verification error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});