import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User, Key, Folder, Users, MessageCircle, Menu, X } from 'lucide-react';
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

  useEffect(() => {
    // Add Google site verification meta tag
    const metaTag = document.createElement('meta');
    metaTag.name = 'google-site-verification';
    metaTag.content = 'google1e7857b3c358e30d';
    document.head.appendChild(metaTag);

    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
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
      
      {/* Upgrade Banner for Free/Signed-Out Users */}
      {(user?.subscription_tier !== 'starter' && user?.subscription_tier !== 'professional' && user?.subscription_tier !== 'enterprise') && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-600 to-orange-600 text-white text-center py-2 px-4 text-sm font-medium">
          <span>Upgrade to unlock full features including scan history, saved candidates, API access, and more. </span>
          <Link to={createPageUrl('Pricing')} className="underline font-bold hover:text-white/90">
            View Plans
          </Link>
        </div>
      )}
      
      {/* Header */}
      <header className={`fixed left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800 ${(user?.subscription_tier !== 'starter' && user?.subscription_tier !== 'professional' && user?.subscription_tier !== 'enterprise') ? 'top-10' : 'top-0'}`}>
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

          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

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
                  <Link to={createPageUrl('Team')}>
                    <DropdownMenuItem 
                      className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Team
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
                  <Link to={createPageUrl('Tickets')}>
                    <DropdownMenuItem 
                      className="text-white hover:text-white focus:text-white focus:bg-zinc-800 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {user.role === 'admin' ? 'Support Tickets' : 'My Tickets'}
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
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800 md:hidden ${(!user || user.subscription_tier === 'free') ? 'top-[104px]' : 'top-16'}`}
          >
            <div className="px-4 py-4 space-y-2">
              <Link to={createPageUrl('Pricing')} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                  Plans
                </Button>
              </Link>
              <Link to={createPageUrl('About')} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
                  About
                </Button>
              </Link>
              <Link to={createPageUrl('Contact')} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-white/10">
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
    </div>
  );
}