import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Save, Shield, Bell, Smartphone, Laptop, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Switch } from '@/components/ui/switch';
import GradientBackground from '@/components/ui/GradientBackground';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';

const getDeviceIcon = (type) => {
  if (type === 'Mobile') return <Smartphone className="w-5 h-5" />;
  return <Laptop className="w-5 h-5" />;
};

export default function MyAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [message, setMessage] = useState('');
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFullName(currentUser.full_name || '');
        setEmailNotifications(currentUser.email_notifications_enabled !== false);

        // Fetch devices
        const allDevices = await base44.entities.Device.filter(
          { user_email: currentUser.email },
          '-last_active'
        );
        
        // Deduplicate devices by user_agent, keeping the most recent one
        const seenUserAgents = new Set();
        const uniqueDevices = allDevices.filter(device => {
          if (seenUserAgents.has(device.user_agent)) {
            return false;
          }
          seenUserAgents.add(device.user_agent);
          return true;
        });
        
        setDevices(uniqueDevices);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      await base44.auth.updateMe({ 
        full_name: fullName,
        email_notifications_enabled: emailNotifications
      });
      
      // Refetch user data to ensure state is synced
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setFullName(updatedUser.full_name || '');
      
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage('Failed to update settings');
    }
    
    setSaving(false);
  };

  const currentDeviceId = localStorage.getItem('deviceId');

  const handleRemoveDevice = async (deviceId, isCurrentDevice) => {
    if (confirm('Are you sure you want to logout this device?')) {
      try {
        const device = devices.find(d => d.device_id === deviceId);
        if (device) {
          await base44.entities.Device.delete(device.id);
        }

        if (isCurrentDevice) {
          localStorage.removeItem('deviceId');
          await base44.auth.logout(createPageUrl('Home'));
        } else {
          setDevices(devices.filter((d) => d.device_id !== deviceId));
        }
      } catch (error) {
        console.error('Error removing device:', error);
        alert('Failed to remove device');
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
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
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <SectionHeader
          title="My Account"
          subtitle="Manage your profile and account settings"
          centered={false}
          className="mb-8"
        />

        <div className="space-y-6">
          {/* Profile Information */}
          <GlassCard className="p-6" delay={0.1}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 tracking-tight">
              <User className="w-5 h-5 text-purple-400" />
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-sm mb-2 block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 block">Email Address</label>
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Mail className="w-4 h-4 text-white/30" />
                  <span className="text-white/50 text-sm">{user?.email}</span>
                  <span className="ml-auto text-xs text-white/30">Cannot be changed</span>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 block">Role</label>
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Shield className="w-4 h-4 text-white/30" />
                  <span className="text-white/50 text-sm capitalize">{user?.role || 'User'}</span>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Email Notifications
                </label>
                <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <span className="text-white/50 text-sm">Notify me when analysis is complete</span>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl text-sm ${
                    message.includes('success')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {message}
                </motion.div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || !fullName.trim()}
                className="bg-white hover:bg-white/90 text-black font-medium rounded-xl"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          {/* Subscription Information */}
          <GlassCard className="p-6" delay={0.15}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 tracking-tight">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Subscription
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div>
                  <p className="text-white font-medium capitalize">
                    {user?.subscription_tier || 'Free'} Plan
                  </p>
                  <p className="text-white/40 text-sm">
                    {user?.scans_used || 0} scans used
                  </p>
                </div>
                <Link to={createPageUrl('Pricing')}>
                  <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 rounded-xl">
                    {user?.subscription_tier === 'free' ? 'Upgrade' : 'View Plans'}
                  </Button>
                </Link>
              </div>

              {user?.subscription_tier && user.subscription_tier !== 'free' && (
                <p className="text-white/40 text-sm">
                  To manage billing, please contact support.
                </p>
              )}
            </div>
          </GlassCard>

          {/* Account Statistics */}
          <GlassCard className="p-6" delay={0.2}>
            <h2 className="text-lg font-semibold text-white mb-4 tracking-tight">Account Statistics</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-white/40 text-sm mb-1">Total Scans</p>
                <p className="text-2xl font-bold text-white">{user?.scans_used || 0}</p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-white/40 text-sm mb-1">Member Since</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(user?.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Active Devices */}
          <GlassCard className="p-6" delay={0.25}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 tracking-tight">
              <Smartphone className="w-5 h-5 text-purple-400" />
              Active Devices
            </h2>

            {devices.length === 0 ? (
              <p className="text-white/40 text-sm">No devices found</p>
            ) : (
              <div className="space-y-3">
                {devices.map((device, index) => {
                  const isCurrentDevice = device.device_id === currentDeviceId;
                  return (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-xl bg-white/[0.03]">
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm">
                              {device.device_type}
                            </p>
                            {isCurrentDevice && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-white/40 text-xs">
                            {device.user_agent || `${device.device_type} device`}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            Last active: {formatTime(device.last_active)}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.device_id, isCurrentDevice)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                      >
                        {isCurrentDevice ? <LogOut className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </GradientBackground>
  );
}