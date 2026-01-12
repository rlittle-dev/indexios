import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get client IP from request headers
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    
    // Check existing scan count for this IP
    const existingScans = await base44.asServiceRole.entities.AnonymousScan.filter({ ip_address: ip });
    
    if (existingScans.length > 0) {
      return Response.json({ scansUsed: existingScans[0].scans_used });
    }
    
    return Response.json({ scansUsed: 0 });
  } catch (error) {
    console.error('Error getting anonymous scans:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});