import React, { useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User, Key, Folder, Users, MessageCircle, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ChatBot from '@/components/chat/ChatBot';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Generate or retrieve device ID
  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // Detect device type
  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
  };

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Register device on login
        const deviceId = getOrCreateDeviceId();
        const deviceType = getDeviceType();
        try {
          await base44.functions.invoke('registerDevice', { deviceId, deviceType });
        } catch (error) {
          console.error('Device registration error:', error);
        }
      } else {
        // Explicitly set user to indicate logged out state
        setUser({ subscription_tier: 'free', isAnonymous: true });
      }
      setLoading(false);
    };
    checkAuth();

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
    };
  }, []);

    // Live polling for device activity and validation every 30 seconds
    useEffect(() => {
      if (!user || user.isAnonymous) return;

      const deviceId = localStorage.getItem('deviceId');
      if (!deviceId) return;

      const updateAndValidateDevice = async () => {
        try {
          // First check if still authenticated
          const isAuth = await base44.auth.isAuthenticated();
          if (!isAuth) {
            // User logged themselves out, just clean up localStorage
            localStorage.removeItem('deviceId');
            return;
          }

          const response = await base44.functions.invoke('updateDeviceActivity', { deviceId });
          // If device was logged out remotely (by another session), redirect
          if (response.data?.loggedOut) {
            localStorage.removeItem('deviceId');
            window.location.href = createPageUrl('Home');
          }
        } catch (error) {
          // Silently fail - not critical
        }
      };

      // Update immediately on mount
      updateAndValidateDevice();

      // Then poll every 30 seconds
      const interval = setInterval(updateAndValidateDevice, 30000);

      return () => clearInterval(interval);
    }, [user]);

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
    <HelmetProvider>
      <Helmet>
        <title>Indexios - Resume Verification Platform | Employment Background Checks</title>
                  <meta name="description" content="Indexios helps hiring teams verify resumes, detect fraud, and confirm employment history. Get legitimacy scores, credential verification, and detailed candidate analysis for confident hiring decisions." />
                  <meta property="og:title" content="Indexios - Resume Verification & Employment Background Checks" />
                  <meta property="og:description" content="Verify resume legitimacy with fraud detection and credential verification. Trusted by hiring teams worldwide." />
                  <link rel="icon" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6964cbdc0ce57ade9d4f4028/79fcbc9eb_ChatGPTImageJan16202602_05_15PM.png" sizes="any" />
                      <link rel="icon" type="image/png" sizes="32x32" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6964cbdc0ce57ade9d4f4028/79fcbc9eb_ChatGPTImageJan16202602_05_15PM.png" />
                      <link rel="icon" type="image/png" sizes="48x48" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6964cbdc0ce57ade9d4f4028/79fcbc9eb_ChatGPTImageJan16202602_05_15PM.png" />
                      <link rel="apple-touch-icon" sizes="180x180" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6964cbdc0ce57ade9d4f4028/79fcbc9eb_ChatGPTImageJan16202602_05_15PM.png" />
        <link rel="canonical" href="https://indexios.me/" />
        <meta name="robots" content="index,follow" />
        <meta name="google-site-verification" content="e391aWsYBlZXbrEFC9-2VR5VbK6DLCyvc3ELRd2lD9Y" />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Chat Bot for all users */}
        {user && (
          <ChatBot user={user} />
        )}

      {/* Upgrade Banner for Free/Signed-Out Users */}
      {(user?.subscription_tier !== 'starter' && user?.subscription_tier !== 'professional' && user?.subscription_tier !== 'enterprise') && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-sm text-white text-center py-2 px-4 text-sm font-medium border-b border-white/10">
          <span className="opacity-90">Upgrade to unlock full features </span>
          <a href={createPageUrl('Pricing')} className="underline font-semibold hover:opacity-80 transition-opacity">
            View Plans →
          </a>
        </div>
      )}

      {/* Header */}
      <header className={`fixed left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] ${(user?.subscription_tier !== 'starter' && user?.subscription_tier !== 'professional' && user?.subscription_tier !== 'enterprise') ? 'top-10' : 'top-0'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={createPageUrl('Home')}>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent tracking-tight cursor-pointer hover:opacity-80 transition-opacity pr-1">
                    Indexios
                  </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
                  <Link to={createPageUrl('Docs')}>
                    <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium rounded-lg px-4">
                      Docs
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Blog')}>
                    <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium rounded-lg px-4">
                      Blog
                    </Button>
                  </Link>
                  <Link to={createPageUrl('AttestationPortal')}>
                    <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 text-sm font-medium rounded-lg px-4">
                      Attestations
                    </Button>
                  </Link>
                </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white/60 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {user && !user.isAnonymous ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 gap-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-white/70" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{user.full_name || user.email?.split('@')[0]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#141419] border-white/[0.08] rounded-xl p-1 min-w-[180px]">
                  <Link to={createPageUrl('MyAccount')}>
                    <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer rounded-lg">
                      <User className="w-4 h-4 mr-2.5 text-white/40" />
                      My Account
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('SavedCandidates')}>
                    <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer rounded-lg">
                      <Folder className="w-4 h-4 mr-2.5 text-white/40" />
                      Saved Candidates
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('Team')}>
                    <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer rounded-lg">
                      <Users className="w-4 h-4 mr-2.5 text-white/40" />
                      Team
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('ApiAccess')}>
                    <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer rounded-lg">
                      <Key className="w-4 h-4 mr-2.5 text-white/40" />
                      API Access
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('Tickets')}>
                    <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer rounded-lg">
                      <MessageCircle className="w-4 h-4 mr-2.5 text-white/40" />
                      {user.role === 'admin' ? 'Support Tickets' : 'My Tickets'}
                    </DropdownMenuItem>
                  </Link>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400/80 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer rounded-lg"
                  >
                    <LogOut className="w-4 h-4 mr-2.5" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleLoginRedirect}
                className="bg-white hover:bg-white/90 text-black font-medium text-sm px-5 h-9 rounded-lg"
              >
                Sign In
              </Button>
            )}
          </div>
          </div>
          </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed left-0 right-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] md:hidden ${(!user || user.subscription_tier === 'free') ? 'top-[104px]' : 'top-16'}`}
          >
            <div className="px-4 py-3 space-y-1">
                <Link to={createPageUrl('Scan')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Scan Resume
                  </Button>
                </Link>
                <Link to={createPageUrl('Docs')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Docs
                  </Button>
                </Link>
                <Link to={createPageUrl('Blog')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Blog
                  </Button>
                </Link>
                <Link to={createPageUrl('AttestationPortal')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Attestations
                  </Button>
                </Link>
                <Link to={createPageUrl('Contact')} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Contact
                  </Button>
                </Link>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content with padding for fixed header */}
      <main className={(user?.subscription_tier !== 'starter' && user?.subscription_tier !== 'professional' && user?.subscription_tier !== 'enterprise') ? 'pt-[104px]' : 'pt-16'}>
        {children}
      </main>

      {/* Global Footer - only shown on pages that don't have their own */}
      </div>
      </HelmetProvider>
      );
      }