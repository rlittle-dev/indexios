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
    return {
      method: policy.recommendedMethod,
      outcome: policy.isNetworkOnly ? 'network_required' : 'policy_identified',
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
      method: 'network',
      outcome: 'network_required',
      proofArtifacts: [{
        type: 'policy_discovery',
        value: 'The Work Number',
        label: 'Known network-only employer'
      }]
    };
  }

  // Check if verification vendor mentioned in name
  const vendor = VERIFICATION_VENDORS.find(v => employerName.toLowerCase().includes(v));
  if (vendor) {
    return {
      method: 'network',
      outcome: 'network_required',
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
      method: 'contact_enrichment',
      outcome: 'contact_identified',
      proofArtifacts: [{
        type: 'contact_info',
        value: employerPhone,
        label: 'Contact information found (phone number)'
      }]
    };
  }

  // No contact info or policy found
  return {
    method: 'contact_enrichment',
    outcome: 'unable_to_verify',
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

      // Determine verification method
      const { method, outcome, proofArtifacts } = await determineVerificationMethod(base44, name, phone);

      // Create verification record
      const verification = await base44.entities.EmployerVerification.create({
        candidateId,
        employerName: name,
        employerDomain: normalizeEmployerDomain(name),
        employerPhone: phone || '',
        status: 'completed', // For now, complete immediately with policy discovery
        outcome,
        method,
        proofArtifacts,
        completedAt: new Date().toISOString()
      });

      console.log(`Created verification for ${name}: ${method} -> ${outcome}`);
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