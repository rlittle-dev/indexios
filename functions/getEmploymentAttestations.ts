import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { EAS, SchemaEncoder } from 'npm:@ethereum-attestation-service/eas-sdk@2.5.0';
import { ethers } from 'npm:ethers@6.10.0';

const SCHEMA_STRING = 'bytes32 subjectIdHash,bytes32 companyIdHash,string verificationId,string result,uint8 confidence,bytes32 evidenceHash,uint64 validUntil';

function hashString(str) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

async function getAttestations(subjectIdHash) {
  const rpcUrl = Deno.env.get('EVM_RPC_URL');
  const easAddress = Deno.env.get('EAS_CONTRACT_ADDRESS');
  const schemaUID = Deno.env.get('EMPLOYMENT_SCHEMA_UID');

  if (!rpcUrl || !easAddress || !schemaUID) {
    throw new Error('Missing required environment variables');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const eas = new EAS(easAddress);
  eas.connect(provider);

  // Query attestations via GraphQL endpoint (EAS provides this)
  // For now, we'll return a simplified version that requires the GraphQL endpoint
  // In production, you'd use EAS's GraphQL API: https://base.easscan.org/graphql
  
  // Alternative: Read events from contract directly
  const easContract = new ethers.Contract(
    easAddress,
    [
      'event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)'
    ],
    provider
  );

  // Query past events for our schema
  const filter = easContract.filters.Attested(null, null, null, schemaUID);
  const events = await easContract.queryFilter(filter, -10000); // Last ~10k blocks

  const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
  const attestations = [];

  for (const event of events) {
    try {
      const attestationData = await eas.getAttestation(event.args.uid);
      
      // Decode the attestation data
      const decodedData = schemaEncoder.decodeData(attestationData.data);
      const decoded = {};
      decodedData.forEach(item => {
        decoded[item.name] = item.value.value || item.value;
      });

      // Filter by subjectIdHash
      if (decoded.subjectIdHash === subjectIdHash) {
        attestations.push({
          uid: event.args.uid,
          attester: attestationData.attester,
          recipient: attestationData.recipient,
          time: Number(attestationData.time),
          expirationTime: Number(attestationData.expirationTime),
          revocationTime: Number(attestationData.revocationTime),
          revoked: attestationData.revocationTime > 0,
          subjectIdHash: decoded.subjectIdHash,
          companyIdHash: decoded.companyIdHash,
          verificationId: decoded.verificationId,
          result: decoded.result,
          confidence: Number(decoded.confidence),
          evidenceHash: decoded.evidenceHash,
          validUntil: Number(decoded.validUntil)
        });
      }
    } catch (err) {
      console.warn('Failed to decode attestation:', event.args.uid, err);
    }
  }

  return attestations.sort((a, b) => b.time - a.time);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId } = body;

    if (!subjectId) {
      return Response.json({ error: 'Missing subjectId' }, { status: 400 });
    }

    const subjectIdHash = hashString(subjectId);
    const attestations = await getAttestations(subjectIdHash);

    return Response.json({
      success: true,
      subjectIdHash,
      attestations,
      count: attestations.length
    });

  } catch (error) {
    console.error('Get attestations error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});