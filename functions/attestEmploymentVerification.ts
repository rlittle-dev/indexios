import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { EAS, SchemaEncoder } from 'npm:@ethereum-attestation-service/eas-sdk@2.5.0';
import { ethers } from 'npm:ethers@6.10.0';

// Employment verification schema definition
const SCHEMA_STRING = 'bytes32 subjectIdHash,bytes32 companyIdHash,string verificationId,string result,uint8 confidence,bytes32 evidenceHash,uint64 validUntil';

async function createAttestation(subjectIdHash, companyIdHash, verificationId, result, confidence, evidenceHash, validUntil) {
  const rpcUrl = Deno.env.get('EVM_RPC_URL');
  const privateKey = Deno.env.get('ATTESTER_PRIVATE_KEY');
  const easAddress = Deno.env.get('EAS_CONTRACT_ADDRESS');
  const schemaUID = Deno.env.get('EMPLOYMENT_SCHEMA_UID');

  if (!rpcUrl || !privateKey || !easAddress || !schemaUID) {
    throw new Error('Missing required environment variables');
  }

  // Initialize provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  // Initialize EAS
  const eas = new EAS(easAddress);
  eas.connect(signer);

  // Encode attestation data
  const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
  const encodedData = schemaEncoder.encodeData([
    { name: 'subjectIdHash', value: subjectIdHash, type: 'bytes32' },
    { name: 'companyIdHash', value: companyIdHash, type: 'bytes32' },
    { name: 'verificationId', value: verificationId, type: 'string' },
    { name: 'result', value: result, type: 'string' },
    { name: 'confidence', value: confidence, type: 'uint8' },
    { name: 'evidenceHash', value: evidenceHash, type: 'bytes32' },
    { name: 'validUntil', value: validUntil, type: 'uint64' }
  ]);

  // Create attestation - recipient is derived from subjectIdHash or can be zero address
  const tx = await eas.attest({
    schema: schemaUID,
    data: {
      recipient: ethers.ZeroAddress, // Privacy: no recipient address needed
      expirationTime: BigInt(0), // No expiration
      revocable: true, // Allow revocation if needed
      data: encodedData,
    },
  });

  const attestationUID = await tx.wait();

  return {
    txHash: tx.tx.hash,
    attestationUID: attestationUID,
  };
}

function hashString(str) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      subjectId, 
      companyId, 
      verificationId, 
      result, 
      confidence = 100, 
      evidenceData = {},
      validUntilTimestamp 
    } = body;

    if (!subjectId || !companyId || !verificationId || !result) {
      return Response.json({ 
        error: 'Missing required fields: subjectId, companyId, verificationId, result' 
      }, { status: 400 });
    }

    // Validate result enum
    if (!['YES', 'NO', 'UNABLE'].includes(result)) {
      return Response.json({ 
        error: 'Invalid result. Must be YES, NO, or UNABLE' 
      }, { status: 400 });
    }

    // Hash PII for on-chain privacy
    const subjectIdHash = hashString(subjectId);
    const companyIdHash = hashString(companyId);
    const evidenceHash = hashString(JSON.stringify(evidenceData));

    // Default valid until: 2 years from now
    const validUntil = validUntilTimestamp || Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60);

    console.log('Creating attestation:', {
      subjectIdHash,
      companyIdHash,
      verificationId,
      result,
      confidence,
      validUntil
    });

    const attestationResult = await createAttestation(
      subjectIdHash,
      companyIdHash,
      verificationId,
      result,
      confidence,
      evidenceHash,
      BigInt(validUntil)
    );

    // Store attestation reference in verification record
    try {
      const verifications = await base44.asServiceRole.entities.Verification.filter({ 
        id: verificationId 
      });
      
      if (verifications.length > 0) {
        await base44.asServiceRole.entities.Verification.update(verificationId, {
          attestation_uid: attestationResult.attestationUID,
          attestation_tx_hash: attestationResult.txHash
        });
      }
    } catch (err) {
      console.warn('Failed to update verification with attestation data:', err);
    }

    return Response.json({
      success: true,
      txHash: attestationResult.txHash,
      attestationUID: attestationResult.attestationUID,
      subjectIdHash,
      companyIdHash,
      evidenceHash
    });

  } catch (error) {
    console.error('Attestation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});