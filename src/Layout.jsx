import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User, Key, Folder, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ChatBot from '@/components/chat/ChatBot';
import ConcurrentSessionAlert from '@/components/paywall/ConcurrentSessionAlert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const [showConcurrentAlert, setShowConcurrentAlert] = useState(false);
  const [conflictingDeviceType, setConflictingDeviceType] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // For non-enterprise users, enforce single device login
      if (currentUser?.subscription_tier !== 'enterprise') {
        const deviceId = localStorage.getItem('deviceId');
        
        if (!deviceId) {
          // First time on this device - register it
          const newDeviceId = 'device_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('deviceId', newDeviceId);
          
          try {
            await base44.functions.invoke('registerDevice', {
              deviceId: newDeviceId,
              deviceType: /mobile|android|iphone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
            });
          } catch (e) {
            console.error('Error registering device:', e);
          }
        } else {
          // Check if this device is still the active one
          try {
            const response = await base44.functions.invoke('validateDeviceAccess', {
              deviceId
            });
            
            if (!response.data.allowed) {
              // Another device is active
              setConflictingDeviceType(response.data.otherDeviceType);
              setShowConcurrentAlert(true);
              localStorage.removeItem('deviceId');
              return;
            }
          } catch (e) {
            console.error('Error validating device:', e);
          }
        }
      }
    }
    setLoading(false);
    };
    checkAuth();

    // Update device activity periodically
    const activeInterval = setInterval(async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      const currentUser = await base44.auth.me();
      
      if (isAuthenticated && currentUser?.subscription_tier !== 'enterprise') {
        const deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
          try {
            await base44.functions.invoke('updateDeviceActivity', { deviceId });
          } catch (e) {
            console.error('Error updating device activity:', e);
          }
        }
      }
    }, 30000); // Update every 30 seconds

    // Refetch user data when window regains focus to sync profile changes
    const handleFocus = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(activeInterval);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await base44.auth.logout(createPageUrl('Home'));
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = createPageUrl('Home');
    }
  };

  const handleLoginRedirect = () => {
    base44.auth.redirectToLogin(createPageUrl('Home'));
  };

  if (loading || isRedirectingToLogin) {
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
      {/* Chat Bot for all users */}
      {user && (
        <ChatBot user={user} />
      )}
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={createPageUrl('Home')}>
              <span className="text-xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent tracking-tight cursor-pointer">
                Indexios
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link to={createPageUrl('Pricing')}>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm">
                  Plans
                </Button>
              </Link>
              <Link to={createPageUrl('About')}>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm">
                  About
                </Button>
              </Link>
              <Link to={createPageUrl('Contact')}>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm">
                  Contact
                </Button>
              </Link>
            </div>
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:inline">{user.full_name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <Link to={createPageUrl('MyAccount')}>
                  <DropdownMenuItem 
                    className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Account
                  </DropdownMenuItem>
                </Link>
                <Link to={createPageUrl('SavedCandidates')}>
                  <DropdownMenuItem 
                    className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    Saved Candidates
                  </DropdownMenuItem>
                </Link>
                <Link to={createPageUrl('ApiAccess')}>
                  <DropdownMenuItem 
                    className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    API Access
                  </DropdownMenuItem>
                </Link>
                <Link to={createPageUrl('ManageDevices')}>
                  <DropdownMenuItem 
                    className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Manage Devices
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={handleLoginRedirect}
              className="bg-white hover:bg-gray-100 text-black font-medium"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main content with padding for fixed header */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}