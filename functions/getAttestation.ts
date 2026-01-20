import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { ethers } from 'npm:ethers@6.11.1';

// Base Mainnet EAS GraphQL endpoint
const EAS_GRAPHQL_URL = 'https://base.easscan.org/graphql';
const SCHEMA_UID = '0x3e2ce91ecbf1c3dd061c6a09e5c4f8a56404b80836f8ab0381c26add9b674af7';

// Generate candidate hash (same as createAttestation)
function generateCandidateHash(uniqueCandidateId) {
  return ethers.keccak256(ethers.toUtf8Bytes(uniqueCandidateId));
}

// Decode attestation data
function decodeAttestationData(data) {
  const abiCoder = new ethers.AbiCoder();
  const decoded = abiCoder.decode(
    ['bytes32', 'string', 'string', 'uint8', 'string', 'uint64'],
    data
  );
  return {
    candidateHash: decoded[0],
    companyDomain: decoded[1],
    verificationType: decoded[2],
    verificationOutcome: Number(decoded[3]),
    verificationReason: decoded[4],
    verifiedAt: Number(decoded[5])
  };
}

// Map outcome code to status string
function outcomeToStatus(outcome) {
  switch (outcome) {
    case 1: return 'YES';
    case 2: return 'NO';
    case 3: return 'REFUSE_TO_DISCLOSE';
    default: return 'INCONCLUSIVE';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { uniqueCandidateId, attestationUID } = await req.json();

    if (!uniqueCandidateId && !attestationUID) {
      return Response.json({ 
        error: 'Missing required field: uniqueCandidateId or attestationUID' 
      }, { status: 400 });
    }

    let attestations = [];

    if (attestationUID) {
      // Fetch specific attestation by UID
      console.log(`[getAttestation] Fetching attestation by UID: ${attestationUID}`);
      
      const query = `
        query GetAttestation($uid: String!) {
          attestation(where: { id: $uid }) {
            id
            attester
            recipient
            time
            revoked
            data
            txid
          }
        }
      `;

      const response = await fetch(EAS_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { uid: attestationUID }
        })
      });

      const result = await response.json();
      
      if (result.data?.attestation) {
        const att = result.data.attestation;
        try {
          const decoded = decodeAttestationData(att.data);
          attestations.push({
            uid: att.id,
            attester: att.attester,
            timestamp: att.time,
            revoked: att.revoked,
            txHash: att.txid,
            ...decoded,
            status: outcomeToStatus(decoded.verificationOutcome),
            explorerUrl: `https://base.easscan.org/attestation/view/${att.id}`
          });
        } catch (decodeError) {
          console.error('[getAttestation] Decode error:', decodeError);
        }
      }
    } else {
      // Search for attestations by candidate hash
      const candidateHash = generateCandidateHash(uniqueCandidateId);
      console.log(`[getAttestation] Searching for candidateHash: ${candidateHash}`);

      // Query EAS GraphQL for attestations with this schema
      const query = `
        query GetAttestations($schemaId: String!) {
          attestations(
            where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
            orderBy: [{ time: desc }]
            take: 50
          ) {
            id
            attester
            recipient
            time
            revoked
            data
            txid
          }
        }
      `;

      const response = await fetch(EAS_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { schemaId: SCHEMA_UID }
        })
      });

      const result = await response.json();
      console.log(`[getAttestation] Found ${result.data?.attestations?.length || 0} attestations for schema`);

      if (result.data?.attestations) {
        for (const att of result.data.attestations) {
          try {
            const decoded = decodeAttestationData(att.data);
            
            // Match by candidate hash
            if (decoded.candidateHash.toLowerCase() === candidateHash.toLowerCase()) {
              attestations.push({
                uid: att.id,
                attester: att.attester,
                timestamp: att.time,
                revoked: att.revoked,
                txHash: att.txid,
                ...decoded,
                status: outcomeToStatus(decoded.verificationOutcome),
                explorerUrl: `https://base.easscan.org/attestation/view/${att.id}`
              });
            }
          } catch (decodeError) {
            // Skip attestations that can't be decoded
            continue;
          }
        }
      }
    }

    console.log(`[getAttestation] Returning ${attestations.length} attestations`);

    return Response.json({
      success: true,
      attestations,
      candidateHash: uniqueCandidateId ? generateCandidateHash(uniqueCandidateId) : null
    });

  } catch (error) {
    console.error('[getAttestation] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});