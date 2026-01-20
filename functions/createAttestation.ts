import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { ethers } from 'npm:ethers@6.11.1';

// Base Sepolia EAS Contract
const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
const SCHEMA_UID = '0x3e2ce91ecbf1c3dd061c6a09e5c4f8a56404b80836f8ab0381c26add9b674af7';

// EAS ABI (minimal for attest function)
const EAS_ABI = [
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data)) external payable returns (bytes32)'
];

// Schema: bytes32 candidateHash, string companyDomain, string verificationType, uint8 verificationOutcome, string verificationReason, uint64 verifiedAt
function encodeAttestationData(candidateHash, companyDomain, verificationType, verificationOutcome, verificationReason, verifiedAt) {
  const abiCoder = new ethers.AbiCoder();
  return abiCoder.encode(
    ['bytes32', 'string', 'string', 'uint8', 'string', 'uint64'],
    [candidateHash, companyDomain, verificationType, verificationOutcome, verificationReason, verifiedAt]
  );
}

// Generate a deterministic hash from UniqueCandidate ID
function generateCandidateHash(uniqueCandidateId) {
  return ethers.keccak256(ethers.toUtf8Bytes(uniqueCandidateId));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body first to check for internal flag
    const body = await req.json();
    const { 
      uniqueCandidateId,
      companyDomain,
      verificationType,
      verificationOutcome,
      verificationReason,
      _internal // Flag to skip tier check when called from other backend functions
    } = body;
    
    // Check if called by service role (from another backend function) or by user
    let isServiceCall = _internal === true;
    
    if (!isServiceCall) {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const user = await base44.auth.me();
          if (user) {
            // Called by user - check tier
            const userTier = user.subscription_tier || 'free';
            if (userTier !== 'professional' && userTier !== 'enterprise') {
              return Response.json({ 
                error: 'Attestations require Professional or Enterprise plan' 
              }, { status: 403 });
            }
          }
        } else {
          // No user auth - likely called via service role from another function
          isServiceCall = true;
          console.log('[Attestation] Called via service role (no user auth)');
        }
      } catch (authError) {
        // Auth check failed - likely called via service role from another function
        isServiceCall = true;
        console.log('[Attestation] Called via service role:', authError.message);
      }
    } else {
      console.log('[Attestation] Called internally from another function');
    }

    // Body already parsed above

    if (!uniqueCandidateId || !companyDomain || verificationType === undefined || verificationOutcome === undefined) {
      return Response.json({ 
        error: 'Missing required fields: uniqueCandidateId, companyDomain, verificationType, verificationOutcome' 
      }, { status: 400 });
    }

    // Get private key from environment
    const privateKey = Deno.env.get('ATTESTATION_PRIVATE_KEY');
    if (!privateKey) {
      return Response.json({ error: 'Attestation signer not configured' }, { status: 500 });
    }

    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new ethers.Wallet(privateKey, provider);
    const easContract = new ethers.Contract(EAS_CONTRACT_ADDRESS, EAS_ABI, wallet);

    // Generate candidate hash from UniqueCandidate ID
    const candidateHash = generateCandidateHash(uniqueCandidateId);
    const verifiedAt = BigInt(Math.floor(Date.now() / 1000));

    // Encode attestation data
    const encodedData = encodeAttestationData(
      candidateHash,
      companyDomain,
      verificationType,
      verificationOutcome,
      verificationReason || '',
      verifiedAt
    );

    console.log(`[Attestation] Creating attestation for UniqueCandidate ${uniqueCandidateId} at ${companyDomain}`);
    console.log(`[Attestation] Candidate hash: ${candidateHash}`);
    console.log(`[Attestation] Outcome: ${verificationOutcome}, Type: ${verificationType}`);

    // Create attestation
    const attestationRequest = {
      schema: SCHEMA_UID,
      data: {
        recipient: ethers.ZeroAddress, // No specific recipient
        expirationTime: 0n, // No expiration
        revocable: true,
        refUID: ethers.ZeroHash, // No reference
        data: encodedData,
        value: 0n
      }
    };

    const tx = await easContract.attest(attestationRequest);
    console.log(`[Attestation] Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Attestation] Transaction confirmed in block ${receipt.blockNumber}`);

    // Extract attestation UID from logs
    // The EAS contract emits an "Attested" event with the attestation UID
    // Event signature: Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)
    // The UID is the 3rd topic (index 2) in older versions or can be in data
    let attestationUID = null;
    
    console.log(`[Attestation] Processing ${receipt.logs.length} logs`);
    
    for (const log of receipt.logs) {
      console.log(`[Attestation] Log address: ${log.address}, topics: ${log.topics.length}`);
      
      // Look for the Attested event from EAS contract
      if (log.address.toLowerCase() === EAS_CONTRACT_ADDRESS.toLowerCase()) {
        // The Attested event has 4 topics: event sig, recipient (indexed), attester (indexed), schemaUID (indexed)
        // The UID is typically in the data field or as a non-indexed return
        if (log.topics.length >= 1) {
          // Try to decode the log data - the UID is often the first 32 bytes of data
          if (log.data && log.data.length >= 66) {
            // Data starts with 0x, then the UID is the first 32 bytes (64 hex chars)
            attestationUID = '0x' + log.data.slice(2, 66);
            console.log(`[Attestation] Extracted UID from data: ${attestationUID}`);
            break;
          }
          // Fallback: try topics[1] if it looks like a valid UID
          if (log.topics[1] && log.topics[1] !== ethers.ZeroHash) {
            attestationUID = log.topics[1];
            console.log(`[Attestation] Extracted UID from topics[1]: ${attestationUID}`);
            break;
          }
        }
      }
    }

    // If still no UID, try parsing the transaction return value
    if (!attestationUID || attestationUID === ethers.ZeroHash) {
      // The attest function returns the UID directly, try to get it from the transaction
      try {
        // Re-fetch transaction receipt and look for return data
        const txResponse = await provider.getTransaction(tx.hash);
        console.log(`[Attestation] Transaction nonce: ${txResponse?.nonce}`);
      } catch (e) {
        console.log(`[Attestation] Could not get additional tx data: ${e.message}`);
      }
    }

    console.log(`[Attestation] Final attestation UID: ${attestationUID}`);

    // Update UniqueCandidate with attestation info
    if (attestationUID) {
      try {
        await base44.asServiceRole.entities.UniqueCandidate.update(uniqueCandidateId, {
          attestation_uid: attestationUID,
          attestation_date: new Date().toISOString()
        });
        console.log(`[Attestation] Updated UniqueCandidate ${uniqueCandidateId} with attestation`);
      } catch (updateError) {
        console.error(`[Attestation] UniqueCandidate update error:`, updateError.message);
      }
    }

    return Response.json({
      success: true,
      attestationUID,
      transactionHash: tx.hash,
      candidateHash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error('[Attestation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});