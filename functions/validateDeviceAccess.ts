import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await req.json();

    // Enterprise users can access from multiple devices
    if (user.subscription_tier === 'enterprise') {
      return Response.json({ allowed: true });
    }

    // For non-enterprise users, check if this is the active device
    const devices = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      is_active: true
    });

    // Find the current device
    const currentDevice = devices.find(d => d.device_id === deviceId);

    if (!currentDevice) {
      // Device not found or not active
      return Response.json({ allowed: false, reason: 'device_not_found' });
    }

    // Check if any other device has been active in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const recentDevices = devices.filter(d => 
      d.device_id !== deviceId && 
      new Date(d.last_active) > new Date(twoMinutesAgo)
    );

    if (recentDevices.length > 0) {
      // Another device was recently active, deactivate this one
      await base44.asServiceRole.entities.Device.update(currentDevice.id, {
        is_active: false
      });
      return Response.json({ 
        allowed: false, 
        reason: 'concurrent_session_detected',
        otherDeviceType: recentDevices[0].device_type,
        otherDeviceLastActive: recentDevices[0].last_active
      });
    }

    return Response.json({ allowed: true });
  } catch (error) {
    console.error('Device validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});