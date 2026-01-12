import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User, Key, Folder, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ChatBot from '@/components/chat/ChatBot';
import ConcurrentSessionAlert from '@/components/paywall/ConcurrentSessionAlert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

const generateDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `${getDeviceType()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConcurrentAlert, setShowConcurrentAlert] = useState(false);
  const [conflictingDeviceType, setConflictingDeviceType] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser && currentUser.email) {
          // First time device registration or update
          const deviceId = generateDeviceId();
          const deviceType = getDeviceType();

          // Register device
          const response = await base44.functions.invoke('registerDevice', {
            deviceType,
            userAgent: navigator.userAgent
          });

          localStorage.setItem('deviceId', response.data.deviceId);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  // Continuous device validation - check every 5 seconds
  useEffect(() => {
    if (!user || !user.email) return;

    const validateInterval = setInterval(async () => {
      try {
        const deviceId = localStorage.getItem('deviceId');
        if (!deviceId) return;

        const response = await base44.functions.invoke('validateDeviceAccess', {
          deviceId
        });

        if (!response.data.allowed) {
          // Device is no longer active
          if (response.data.reason === 'concurrent_session_detected') {
            setConflictingDeviceType(response.data.otherDeviceType);
            setShowConcurrentAlert(true);
            localStorage.removeItem('deviceId');
          }
        } else {
          // Update activity
          await base44.functions.invoke('updateDeviceActivity', {
            deviceId
          });
        }
      } catch (e) {
        console.error('Device validation error:', e);
      }
    }, 5000);

    return () => clearInterval(validateInterval);
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    localStorage.removeItem('deviceId');
    await base44.auth.logout(createPageUrl('Home'));
  };

  const handleDismissConcurrentAlert = () => {
    setShowConcurrentAlert(false);
    localStorage.removeItem('deviceId');
    window.location.href = createPageUrl('Home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent"
        >
          Indexios
        </motion.div>
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Concurrent Session Alert */}
      <AnimatePresence>
        {showConcurrentAlert && (
          <ConcurrentSessionAlert
            deviceType={conflictingDeviceType}
            onDismiss={handleDismissConcurrentAlert}
          />
        )}
      </AnimatePresence>

      {/* Chat Bot for authenticated users */}
      {user && !showConcurrentAlert && (
        <ChatBot user={user} />
      )}

      {/* Header with navigation */}
      {user && !showConcurrentAlert && (
        <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <motion.div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent">
                Indexios
              </motion.div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex gap-8">
              <Link to={createPageUrl('Home')} className="text-white/70 hover:text-white transition">
                Home
              </Link>
              <Link to={createPageUrl('Pricing')} className="text-white/70 hover:text-white transition">
                Pricing
              </Link>
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
                <DropdownMenuItem disabled className="text-xs text-white/60 py-2">
                  {user.email}
                </DropdownMenuItem>
                <Link to={createPageUrl('Account')}>
                  <DropdownMenuItem className="text-white cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Account Settings
                  </DropdownMenuItem>
                </Link>
                <Link to={createPageUrl('ManageDevices')}>
                  <DropdownMenuItem className="text-white cursor-pointer">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Manage Devices
                  </DropdownMenuItem>
                </Link>
                <Link to={createPageUrl('Billing')}>
                  <DropdownMenuItem className="text-white cursor-pointer">
                    <Key className="w-4 h-4 mr-2" />
                    Billing
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={user && !showConcurrentAlert ? '' : ''}>
        {children}
      </main>
    </div>
  );
}