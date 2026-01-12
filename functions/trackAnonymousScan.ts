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
      const scanRecord = existingScans[0];
      
      // Check if limit reached (3 scans for anonymous)
      if (scanRecord.scans_used >= 3) {
        return Response.json({ 
          allowed: false, 
          scansUsed: scanRecord.scans_used,
          message: 'Free scan limit reached. Please sign up to continue.'
        }, { status: 403 });
      }
      
      // Increment scan count
      await base44.asServiceRole.entities.AnonymousScan.update(scanRecord.id, {
        scans_used: scanRecord.scans_used + 1
      });
      
      return Response.json({ 
        allowed: true, 
        scansUsed: scanRecord.scans_used + 1 
      });
    } else {
      // Create new record
      await base44.asServiceRole.entities.AnonymousScan.create({
        ip_address: ip,
        scans_used: 1
      });
      
      return Response.json({ 
        allowed: true, 
        scansUsed: 1 
      });
    }
  } catch (error) {
    console.error('Error tracking anonymous scan:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});