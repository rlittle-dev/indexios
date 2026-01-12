import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuid } from 'npm:uuid@9.0.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deviceType, userAgent } = body;

    // Get user's subscription tier
    const userData = await base44.auth.me();
    const isEnterprise = userData.subscription_tier === 'Enterprise';

    // If not enterprise, deactivate all other active devices
    if (!isEnterprise) {
      const existingDevices = await base44.asServiceRole.entities.Device.filter({
        user_email: user.email,
        is_active: true
      });

      // Deactivate all existing devices
      for (const device of existingDevices) {
        await base44.asServiceRole.entities.Device.update(device.id, {
          is_active: false
        });
      }
    }

    // Create new device
    const deviceId = uuid();
    const newDevice = await base44.asServiceRole.entities.Device.create({
      user_email: user.email,
      device_id: deviceId,
      device_type: deviceType,
      user_agent: userAgent,
      last_active: new Date().toISOString(),
      is_active: true
    });

    return Response.json({
      deviceId,
      device: newDevice
    });
  } catch (error) {
    console.error('Register device error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});