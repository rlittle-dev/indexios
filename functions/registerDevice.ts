import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId, deviceType } = await req.json();

    // For non-enterprise users, deactivate all other devices
    if (user.subscription_tier !== 'enterprise') {
      const existingDevices = await base44.asServiceRole.entities.Device.filter({
        user_email: user.email,
        is_active: true
      });

      // Deactivate all other devices
      for (const device of existingDevices) {
        if (device.device_id !== deviceId) {
          await base44.asServiceRole.entities.Device.update(device.id, {
            is_active: false
          });
        }
      }
    }

    // Register or update this device
    const existingDevice = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      device_id: deviceId
    });

    if (existingDevice.length > 0) {
      await base44.asServiceRole.entities.Device.update(existingDevice[0].id, {
        last_active: new Date().toISOString(),
        is_active: true,
        user_agent: req.headers.get('user-agent') || '',
        device_type: deviceType
      });
    } else {
      await base44.asServiceRole.entities.Device.create({
        user_email: user.email,
        device_id: deviceId,
        device_type: deviceType,
        user_agent: req.headers.get('user-agent') || '',
        last_active: new Date().toISOString(),
        is_active: true
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Device registration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});