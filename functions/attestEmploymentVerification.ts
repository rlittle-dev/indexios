import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { EAS, SchemaEncoder } from 'npm:@ethereum-attestation-service/eas-sdk@2.5.0';
import { ethers } from 'npm:ethers@6.10.0';

// Schema: bytes32 candidateHash,string companyDomain,string verificationType,bool verificationResult,uint64 verifiedAt
const SCHEMA_STRING = 'bytes32 candidateHash,string companyDomain,string verificationType,bool verificationResult,uint64 verifiedAt';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      candidateHash,
      companyDomain,
      verificationType = 'PHONE',
      verificationResult,
      verifiedAt
    } = body;

    // Validate inputs
    if (!candidateHash || !companyDomain || verificationResult === undefined || !verifiedAt) {
      return Response.json({ 
        error: 'Missing required fields: candidateHash, companyDomain, verificationResult, verifiedAt' 
      }, { status: 400 });
    }

    // Validate candidateHash is bytes32
    if (!candidateHash.startsWith('0x') || candidateHash.length !== 66) {
      return Response.json({ error: 'candidateHash must be a valid bytes32 (0x...)' }, { status: 400 });
    }

    // Get environment variables
    const rpcUrl = Deno.env.get('EVM_RPC_URL');
    const privateKey = Deno.env.get('ATTESTER_PRIVATE_KEY');
    const easAddress = Deno.env.get('EAS_CONTRACT_ADDRESS');
    const schemaUID = Deno.env.get('EMPLOYMENT_SCHEMA_UID');

    if (!rpcUrl || !privateKey || !easAddress || !schemaUID) {
      throw new Error('Missing required environment variables (EVM_RPC_URL, ATTESTER_PRIVATE_KEY, EAS_CONTRACT_ADDRESS, EMPLOYMENT_SCHEMA_UID)');
    }

    console.log('Creating attestation:', {
      candidateHash,
      companyDomain,
      verificationType,
      verificationResult,
      verifiedAt,
      schemaUID
    });

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`, provider);

    // Initialize EAS
    const eas = new EAS(easAddress);
    eas.connect(signer);

    // Encode attestation data
    const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
    const encodedData = schemaEncoder.encodeData([
      { name: 'candidateHash', value: candidateHash, type: 'bytes32' },
      { name: 'companyDomain', value: companyDomain, type: 'string' },
      { name: 'verificationType', value: verificationType, type: 'string' },
      { name: 'verificationResult', value: verificationResult, type: 'bool' },
      { name: 'verifiedAt', value: BigInt(verifiedAt), type: 'uint64' }
    ]);

    console.log('Encoded attestation data, submitting to Base Sepolia...');

    // Create attestation on-chain
    const tx = await eas.attest({
      schema: schemaUID,
      data: {
        recipient: ethers.ZeroAddress, // Privacy: no recipient address
        expirationTime: BigInt(0), // No expiration
        revocable: true, // Allow revocation if needed
        data: encodedData,
      },
    });

    console.log('Transaction submitted:', tx.tx.hash);

    const newAttestationUID = await tx.wait();
    
    // Get block number from receipt
    const receipt = await provider.getTransactionReceipt(tx.tx.hash);
    const blockNumber = receipt ? receipt.blockNumber : null;

    console.log('Attestation created:', {
      attestationUID: newAttestationUID,
      txHash: tx.tx.hash,
      blockNumber
    });

    return Response.json({
      success: true,
      attestationUID: newAttestationUID,
      txHash: tx.tx.hash,
      blockNumber,
      explorerUrl: `https://base-sepolia.blockscout.com/tx/${tx.tx.hash}`
    });

  } catch (error) {
    console.error('Attestation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});