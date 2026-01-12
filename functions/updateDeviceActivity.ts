import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await req.json();

    // Update the device's last active time
    const devices = await base44.asServiceRole.entities.Device.filter({
      user_email: user.email,
      device_id: deviceId
    });

    if (devices.length > 0) {
      await base44.asServiceRole.entities.Device.update(devices[0].id, {
        last_active: new Date().toISOString()
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Device activity update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});