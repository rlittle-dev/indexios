import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Save, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFullName(currentUser.full_name || '');
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
      await base44.auth.updateMe({ full_name: fullName });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    }
    
    setSaving(false);
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
      
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">My Account</h1>
          <p className="text-white/60">Manage your profile and account settings</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">Email Address</label>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                  <Mail className="w-4 h-4 text-white/40" />
                  <span className="text-white/60 text-sm">{user?.email}</span>
                  <span className="ml-auto text-xs text-white/40">Cannot be changed</span>
                </div>
              </div>

              <div>
                <label className="text-white/70 text-sm mb-2 block">Role</label>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                  <Shield className="w-4 h-4 text-white/40" />
                  <span className="text-white/60 text-sm capitalize">{user?.role || 'User'}</span>
                </div>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${
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
                className="bg-white hover:bg-gray-100 text-black font-medium"
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
          </motion.div>

          {/* Subscription Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Subscription
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div>
                  <p className="text-white font-medium capitalize">
                    {user?.subscription_tier || 'Free'} Plan
                  </p>
                  <p className="text-white/50 text-sm">
                    {user?.scans_used || 0} scans used
                  </p>
                </div>
                <div className="flex gap-2">
                  {user?.subscription_tier !== 'free' && (
                    <Button
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
                          try {
                            const response = await base44.functions.invoke('cancelSubscription');
                            if (response.data.success) {
                              alert('Subscription cancelled. You will retain access until the end of your billing period.');
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Cancellation error:', error);
                            alert('Failed to cancel subscription');
                          }
                        }
                      }}
                      variant="outline"
                      className="border-red-500/50 bg-transparent text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                  <Link to={createPageUrl('Pricing')}>
                    <Button variant="outline" className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10">
                      {user?.subscription_tier === 'free' ? 'Upgrade' : 'View Plans'}
                    </Button>
                  </Link>
                </div>
              </div>

              {user?.subscription_tier && user.subscription_tier !== 'free' && (
                <p className="text-white/50 text-sm">
                  To manage your billing and payment methods, please contact support.
                </p>
              )}
            </div>
          </motion.div>

          {/* Account Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Account Statistics</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-white/50 text-sm mb-1">Total Scans</p>
                <p className="text-2xl font-bold text-white">{user?.scans_used || 0}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-white/50 text-sm mb-1">Member Since</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(user?.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}