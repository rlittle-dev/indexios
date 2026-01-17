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
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only professional+ users can create attestations
    const userTier = user.subscription_tier || 'free';
    if (userTier !== 'professional' && userTier !== 'enterprise') {
      return Response.json({ 
        error: 'Attestations require Professional or Enterprise plan' 
      }, { status: 403 });
    }

    const { 
      uniqueCandidateId,
      companyDomain,
      verificationType, // 'web_evidence' or 'phone_call'
      verificationOutcome, // 0=inconclusive, 1=yes, 2=no, 3=refused_to_disclose
      verificationReason
    } = await req.json();

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
    const attestedLog = receipt.logs.find(log => log.topics.length > 1);
    const attestationUID = attestedLog?.topics[1] || null;

    console.log(`[Attestation] Attestation UID: ${attestationUID}`);

    // Update UniqueCandidate with attestation info
    if (attestationUID) {
      try {
        const existingCandidates = await base44.asServiceRole.entities.UniqueCandidate.filter({});
        const normalizedName = candidateName.toLowerCase().trim();
        const matchingCandidate = existingCandidates.find(c => 
          c.name?.toLowerCase().trim() === normalizedName ||
          (candidateEmail && c.email?.toLowerCase().trim() === candidateEmail.toLowerCase().trim())
        );

        if (matchingCandidate) {
          await base44.asServiceRole.entities.UniqueCandidate.update(matchingCandidate.id, {
            attestation_uid: attestationUID,
            attestation_date: new Date().toISOString()
          });
          console.log(`[Attestation] Updated UniqueCandidate ${matchingCandidate.id} with attestation`);
        }
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