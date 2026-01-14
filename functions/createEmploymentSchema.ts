import { SchemaRegistry } from 'npm:@ethereum-attestation-service/eas-sdk@2.5.0';
import { ethers } from 'npm:ethers@6.10.0';

const SCHEMA_STRING = 'bytes32 subjectIdHash,bytes32 companyIdHash,string verificationId,string result,uint8 confidence,bytes32 evidenceHash,uint64 validUntil';

Deno.serve(async (req) => {
  try {
    const rpcUrl = Deno.env.get('EVM_RPC_URL');
    const privateKey = Deno.env.get('ATTESTER_PRIVATE_KEY');
    const registryAddress = Deno.env.get('SCHEMA_REGISTRY_ADDRESS');

    if (!rpcUrl || !privateKey || !registryAddress) {
      return Response.json({ 
        error: 'Missing environment variables: EVM_RPC_URL, ATTESTER_PRIVATE_KEY, or SCHEMA_REGISTRY_ADDRESS' 
      }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const schemaRegistry = new SchemaRegistry(registryAddress);
    schemaRegistry.connect(signer);

    console.log('Registering schema:', SCHEMA_STRING);

    const tx = await schemaRegistry.register({
      schema: SCHEMA_STRING,
      resolverAddress: ethers.ZeroAddress, // No custom resolver
      revocable: true,
    });

    const schemaUID = await tx.wait();

    console.log('Schema created with UID:', schemaUID);

    return Response.json({
      success: true,
      schemaUID,
      schemaString: SCHEMA_STRING,
      txHash: tx.tx.hash,
      message: 'Schema created successfully. Add this UID to EMPLOYMENT_SCHEMA_UID secret.'
    });

  } catch (error) {
    console.error('Schema creation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});