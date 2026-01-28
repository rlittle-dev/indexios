import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Save, Shield, Bell, Smartphone, Laptop, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Switch } from '@/components/ui/switch';

const getDeviceIcon = (type) => type === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />;

export default function MyAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [message, setMessage] = useState('');
  const [devices, setDevices] = useState([]);

  const fetchDevices = async (userEmail) => {
    try {
      const allDevices = await base44.entities.Device.filter({ user_email: userEmail, is_active: true }, '-last_active');
      const deviceMap = new Map();
      allDevices.forEach(device => {
        if (!deviceMap.has(device.device_id) || new Date(device.last_active) > new Date(deviceMap.get(device.device_id).last_active)) {
          deviceMap.set(device.device_id, device);
        }
      });
      setDevices(Array.from(deviceMap.values()));
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFullName(currentUser.full_name || '');
        setEmailNotifications(currentUser.email_notifications_enabled !== false);
        await fetchDevices(currentUser.email);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(() => fetchDevices(user.email), 10000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await base44.auth.updateMe({ full_name: fullName, email_notifications_enabled: emailNotifications });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setFullName(updatedUser.full_name || '');
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update settings');
    }
    setSaving(false);
  };

  const currentDeviceId = localStorage.getItem('deviceId');

  const handleRemoveDevice = async (deviceId, isCurrentDevice) => {
    if (confirm('Are you sure you want to logout this device?')) {
      try {
        const device = devices.find(d => d.device_id === deviceId);
        if (device) await base44.entities.Device.update(device.id, { is_active: false });
        if (isCurrentDevice) {
          localStorage.removeItem('deviceId');
          await base44.auth.logout(createPageUrl('Home'));
        } else {
          setDevices(devices.filter((d) => d.device_id !== deviceId));
        }
      } catch (error) {
        alert('Failed to remove device');
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    if (confirm('Are you sure you want to logout all devices?')) {
      try {
        await Promise.all(devices.map(device => base44.entities.Device.update(device.id, { is_active: false })));
        localStorage.removeItem('deviceId');
        await base44.auth.logout(createPageUrl('Home'));
      } catch (error) {
        alert('Failed to logout all devices');
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
      const diffMins = Math.floor((new Date() - date) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch { return 'Unknown'; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <User className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Account Settings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">My</span>
            <span className="text-white font-medium"> Account</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">Manage your profile and settings</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Information */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Profile Information</span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Full Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" className="bg-white/[0.02] border-white/10 text-white rounded-xl" />
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Email Address</label>
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                    <Mail className="w-4 h-4 text-white/40" />
                    <span className="text-white/60 text-sm">{user?.email}</span>
                    <span className="ml-auto text-xs text-white/40">Cannot be changed</span>
                  </div>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Role</label>
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                    <Shield className="w-4 h-4 text-white/40" />
                    <span className="text-white/60 text-sm capitalize">{user?.role || 'User'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-white/70 text-sm mb-2 flex items-center gap-2"><Bell className="w-4 h-4" />Email Notifications</label>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                    <span className="text-white/60 text-sm">Notify me when analysis is complete</span>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                </div>
                {message && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl text-sm ${message.includes('success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message}
                  </motion.div>
                )}
                <Button onClick={handleSave} disabled={saving || !fullName.trim()} className="bg-white hover:bg-white/90 text-black font-medium rounded-full">
                  {saving ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Subscription */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Subscription</span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                  <div>
                    <p className="text-white font-medium capitalize">{user?.subscription_tier || 'Free'} Plan</p>
                    <p className="text-white/50 text-sm">{user?.scans_used || 0} verifications used</p>
                  </div>
                  <Link to={createPageUrl('Pricing')}>
                    <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:text-white hover:bg-white/10 rounded-xl">
                      {user?.subscription_tier === 'free' ? 'Upgrade' : 'View Plans'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Statistics</span>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                  <p className="text-white/50 text-sm mb-1">Total Verifications</p>
                  <p className="text-2xl font-bold text-white">{user?.scans_used || 0}</p>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                  <p className="text-white/50 text-sm mb-1">Member Since</p>
                  <p className="text-lg font-semibold text-white">{new Date(user?.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active Devices */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Active Devices</span>
                </div>
                {devices.length > 1 && (
                  <Button onClick={handleLogoutAllDevices} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <LogOut className="w-4 h-4 mr-1" /> Logout All
                  </Button>
                )}
              </div>
              <div className="p-6 space-y-3">
                {devices.length === 0 ? (
                  <p className="text-white/60 text-sm">No devices found</p>
                ) : (
                  devices.map((device, index) => {
                    const isCurrentDevice = device.device_id === currentDeviceId;
                    return (
                      <motion.div key={device.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-white/5">{getDeviceIcon(device.device_type)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium text-sm">{device.device_type}</p>
                              {isCurrentDevice && <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">This Device</Badge>}
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">Last active: {formatTime(device.last_active)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveDevice(device.device_id, isCurrentDevice)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          {isCurrentDevice ? <LogOut className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}