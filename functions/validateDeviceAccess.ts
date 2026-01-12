import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deviceId } = body;

    // Get user subscription tier
    const userData = await base44.auth.me();
    const isEnterprise = userData.subscription_tier === 'Enterprise';

    // Get all active devices
    const devices = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      is_active: true
    });

    // Find current device
    const currentDevice = devices.find(d => d.device_id === deviceId);

    if (!currentDevice) {
      // Device not found or not active
      return Response.json({ 
        allowed: false, 
        reason: 'device_not_found'
      });
    }

    // For non-enterprise: only one device can be active
    if (!isEnterprise) {
      // Check if there's another active device
      const otherDevices = devices.filter(d => d.device_id !== deviceId);
      
      if (otherDevices.length > 0) {
        // Deactivate the other device(s)
        for (const otherDevice of otherDevices) {
          await base44.asServiceRole.entities.Device.update(otherDevice.id, {
            is_active: false
          });
        }
        
        return Response.json({ 
          allowed: false, 
          reason: 'concurrent_session_detected',
          otherDeviceType: otherDevices[0].device_type,
          otherDeviceLastActive: otherDevices[0].last_active
        });
      }
    }

    return Response.json({ allowed: true });
  } catch (error) {
    console.error('Validate device access error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});