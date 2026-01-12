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

    // Get the device
    const devices = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      device_id: deviceId
    });

    if (devices.length === 0) {
      return Response.json({ error: 'Device not found' }, { status: 404 });
    }

    const device = devices[0];

    // Update last active time
    await base44.asServiceRole.entities.Device.update(device.id, {
      last_active: new Date().toISOString()
    });

    // Check if this device should still be active
    const activeDevices = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      is_active: true
    });

    if (!device.is_active || !activeDevices.find(d => d.device_id === deviceId)) {
      return Response.json({ 
        stillActive: false,
        reason: 'device_deactivated'
      });
    }

    return Response.json({ 
      stillActive: true
    });
  } catch (error) {
    console.error('Update device activity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});