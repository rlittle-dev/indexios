import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Smartphone, Laptop, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const getDeviceIcon = (type) => {
  if (type === 'Mobile') return <Smartphone className="w-5 h-5" />;
  return <Laptop className="w-5 h-5" />;
};

export default function ManageDevices() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Fetch devices from backend
        const allDevices = await base44.entities.Device.filter(
          { user_email: currentUser.email },
          '-last_active'
        );

        setDevices(allDevices);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const currentDeviceId = localStorage.getItem('deviceId');

  const handleRemoveDevice = (deviceKey, deviceId) => {
    if (
      confirm(
        'Are you sure you want to logout this device? You will need to sign in again.'
      )
    ) {
      localStorage.removeItem(deviceKey);

      if (deviceId === currentDeviceId) {
        // Logout current device
        base44.auth.logout(createPageUrl('Home'));
      } else {
        // Just update the list
        setDevices(devices.filter((d) => d.storageKey !== deviceKey));
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link to={createPageUrl('MyAccount')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Manage Devices</h1>
            <p className="text-white/60">
              View your active devices and manage your login sessions
            </p>
          </div>

          {devices.length === 0 ? (
            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-8 border border-zinc-800 text-center">
              <Smartphone className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">No devices found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device, index) => {
                const isCurrentDevice = device.id === currentDeviceId;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-lg bg-white/5">
                          {getDeviceIcon(device.type || 'Desktop')}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold">
                              {device.type || 'Desktop'}
                            </h3>
                            {isCurrentDevice && (
                              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm mb-2">
                            {device.userAgent ||
                              'Browser information not available'}
                          </p>
                          <p className="text-white/40 text-xs">
                            Last active: {formatTime(device.lastActiveTime)}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() =>
                          handleRemoveDevice(device.storageKey, device.id)
                        }
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {isCurrentDevice ? (
                          <>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-zinc-800">
            <h3 className="text-white font-semibold mb-2">Security Tip</h3>
            <p className="text-white/70 text-sm">
              Regularly review your active devices and remove any that you
              don't recognize. If you suspect unauthorized access, log out all
              other devices immediately.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}