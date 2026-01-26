import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Phone, Link2, CheckCircle, FileText, Zap, Target, Check, ChevronDown, Users, Lock, Globe, AlertTriangle, Clock, Search, PhoneCall, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

// Animated button wrapper with circling outline on hover
const AnimatedButton = ({ children, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const uniqueId = useState(() => Math.random().toString(36).substr(2, 9))[0];
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Circling border animation */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
        style={{ 
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <div 
          className="absolute inset-[-2px] rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, #a855f7, #3b82f6, #a855f7, transparent)`,
            animation: isHovered ? 'spin 1.5s linear infinite' : 'none',
          }}
        />
        <div className="absolute inset-[2px] rounded-full bg-[#0a0a0a]" />
      </div>
      <div className="relative">{children}</div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Floating particles component
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.5, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

const TIERS = [
  { tier: 'free', name: 'Free', price: 0, scans: 1, features: ['1 resume scan', 'Advanced analysis', 'Red & green flags detection'] },
  { tier: 'starter', name: 'Starter', price: 29, scans: 50, popular: true, features: ['All Free features', '50 scans/month', 'Detailed breakdown', 'Scan history', 'Share & download'] },
  { tier: 'professional', name: 'Professional', price: 99, scans: 200, features: ['All Starter features', '200 scans/month', 'Interview questions', '15 verifications/mo', 'API access'] },
  { tier: 'enterprise', name: 'Enterprise', price: 299, scans: 'Unlimited', features: ['All Pro features', 'Unlimited scans', 'Unlimited verifications', 'Team collaboration', 'Dedicated support'] }
];

const FAQS = [
  { q: 'How does resume verification work?', a: 'Our AI analyzes resumes for consistency, verifies employment through automated HR calls, and records verified claims on the blockchain for tamper-proof records.' },
  { q: 'What is blockchain attestation?', a: 'When employment is verified, we create an immutable record on the Base blockchain. This creates a portable, verifiable credential that candidates can share with future employers.' },
  { q: 'How accurate is the fraud detection?', a: 'Our system analyzes timeline consistency, credential verification, skill alignment, and cross-references claims with public data. Most verified resumes score 70-90% legitimacy.' },
  { q: 'Can I verify international candidates?', a: 'Yes, our system works globally. Phone verification is available for US companies, with email verification available worldwide.' },
  { q: 'How do automated phone calls work?', a: 'Our AI calls company HR departments to verify employment dates and titles. Calls are recorded and transcribed, with results available in your dashboard.' },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingTier, setProcessingTier] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [tabProgress, setTabProgress] = useState(0);
  const TAB_DURATION = 10000; // 10 seconds

  // Auto-cycle tabs with progress bar
  useEffect(() => {
    const tabs = ['scan', 'verify', 'attest'];
    let startTime = Date.now();
    let animationFrame;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / TAB_DURATION) * 100, 100);
      setTabProgress(progress);

      if (elapsed >= TAB_DURATION) {
        // Switch to next tab
        setActiveTab(prev => {
          const currentIndex = tabs.indexOf(prev);
          return tabs[(currentIndex + 1) % tabs.length];
        });
        startTime = Date.now();
        setTabProgress(0);
      }

      animationFrame = requestAnimationFrame(updateProgress);
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Reset progress when tab is manually changed
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setTabProgress(0);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const tierLevels = { free: 0, starter: 1, professional: 2, enterprise: 3 };
  
  const canSelectTier = (tier) => {
    const currentTierLevel = tierLevels[user?.subscription_tier || 'free'];
    const targetTierLevel = tierLevels[tier];
    // Can only upgrade (target must be higher than current)
    return targetTierLevel > currentTierLevel;
  };

  const handleSubscribe = async (tier) => {
    if (!canSelectTier(tier)) {
      return;
    }
    if (tier === 'free') {
      window.location.href = createPageUrl('Scan');
      return;
    }
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl('Home'));
      return;
    }
    setProcessingTier(tier);
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createCheckoutSession', { tier });
      if (response.data.url) window.location.href = response.data.url;
    } catch (error) {
      alert('Failed to start subscription. Please try again.');
      setLoading(false);
      setProcessingTier(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Indexios - Resume Verification & Employment Background Check Platform</title>
        <meta name="description" content="Verify resume authenticity and employment history with Indexios. Detect fraudulent resumes, confirm credentials, and make confident hiring decisions." />
        <link rel="canonical" href="https://indexios.me/" />
        <meta property="og:title" content="Indexios - Resume Verification & Employment Background Checks" />
        <meta property="og:url" content="https://indexios.me/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Indexios",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Resume verification and employment background check platform",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
          })}
        </script>
      </Helmet>
      
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]" />
        </div>

        <div className="absolute inset-0 pointer-events-none z-[2]" style={{ background: 'radial-gradient(70% 50%, transparent 0%, rgba(10, 10, 10, 0.5) 60%, rgba(10, 10, 10, 0.98) 100%)' }} />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-purple-500/[0.05] rounded-full blur-[150px]"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.05] rounded-full blur-[120px]"
            animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <FloatingParticles />

        <div className="relative z-10 min-h-screen flex items-center">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-20 md:py-28 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-5">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-sm font-medium text-purple-300">Advanced Resume Verification</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1]">
                    <span className="text-white/60 block">Don't just trust.</span>
                    <span className="text-white block mt-2 font-medium">Verify it.</span>
                  </h1>
                </motion.div>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-lg md:text-xl lg:text-[1.35rem] text-white/50 max-w-xl leading-relaxed">
                  Indexios detects resume fraud in real-time and automatically verifies employment through phone calls and blockchain attestations.
                  <span className="text-white/80"> Stop guessing. Start verifying.</span>
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-wrap items-center gap-4">
                  <AnimatedButton>
                    <Link to={createPageUrl('Scan')}>
                      <Button className="group inline-flex items-center gap-2 px-7 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]">
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </Button>
                    </Link>
                  </AnimatedButton>
                  <AnimatedButton>
                    <Link to={createPageUrl('Docs')}>
                      <Button variant="ghost" className="inline-flex items-center gap-2 px-6 py-6 text-sm text-white/60 hover:text-white transition-all duration-200 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                        Read the Docs
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </AnimatedButton>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="pt-4">
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/10">
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 rounded-full border border-white/30 border-t-emerald-400 animate-spin" style={{ animationDuration: '1.5s' }} />
                    </div>
                    <code className="text-sm font-mono text-white/50">Free scan • No login required</code>
                  </div>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex justify-center lg:justify-end">
                <div className="w-full max-w-[550px]">
                  <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Live Verification</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">session_ix92kf</span>
                    </div>
                    <div className="p-6 space-y-4">
                      {[
                        { label: 'Resume Analysis', status: 'complete', score: '87%' },
                        { label: 'Employment Verification', status: 'complete', company: 'TechCorp' },
                        { label: 'HR Phone Call', status: 'active', duration: '0:42' },
                        { label: 'Blockchain Attestation', status: 'pending' },
                      ].map((step, index) => (
                        <motion.div
                          key={step.label}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.8 + index * 0.15 }}
                          className={`flex items-center gap-4 p-3 rounded-lg ${step.status === 'active' ? 'bg-purple-500/10 border border-purple-500/20' : step.status === 'complete' ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.status === 'complete' ? 'bg-emerald-500/20' : step.status === 'active' ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                            {step.status === 'complete' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : step.status === 'active' ? <div className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-white/40' : 'text-white/80'}`}>{step.label}</p>
                            {step.score && <p className="text-xs text-emerald-400/80">Score: {step.score}</p>}
                            {step.company && <p className="text-xs text-white/40">Verified: {step.company}</p>}
                            {step.duration && <p className="text-xs text-purple-400/80">Call duration: {step.duration}</p>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Continuous flowing gradient background for all sections */}
      <div className="relative bg-[#0a0a0a]">
        {/* Global animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-[10%] left-[20%] w-[800px] h-[800px] bg-purple-500/[0.04] rounded-full blur-[200px]"
            animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-[30%] right-[10%] w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[180px]"
            animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-[60%] left-[30%] w-[700px] h-[700px] bg-purple-500/[0.03] rounded-full blur-[200px]"
            animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-[80%] right-[20%] w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[150px]"
            animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* ==================== STATS SECTION ==================== */}
        <section className="relative py-16 md:py-20 overflow-hidden">
          <div className="relative z-10 max-w-[1000px] mx-auto px-4 sm:px-6 md:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { value: '10K+', label: 'Resumes Verified' },
                { value: '99.2%', label: 'Accuracy Rate' },
                { value: '<30s', label: 'Analysis Time' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-white/40 text-sm">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

      {/* ==================== TABBED VISUAL SECTION ==================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Platform Overview</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">See how it<span className="font-medium"> works.</span></h2>
          </motion.div>

          {/* Tabs with progress indicator */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="inline-flex p-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
                {[
                  { id: 'scan', label: 'Scan' },
                  { id: 'verify', label: 'Verify' },
                  { id: 'attest', label: 'Attest' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.id ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  style={{ width: `${tabProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'scan' && (
              <motion.div key="scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-light text-white">Instant <span className="font-medium">fraud detection</span></h3>
                  <p className="text-white/50 leading-relaxed">Upload any resume and get a comprehensive legitimacy score within seconds. Our AI analyzes consistency, experience claims, education credentials, and skills alignment.</p>
                  <ul className="space-y-3">
                    {['Real-time analysis engine', 'Red & green flag detection', 'Detailed breakdown by category'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/70"><CheckCircle className="w-4 h-4 text-emerald-400" />{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Analysis Complete</span></div>
                    <span className="text-[10px] font-mono text-white/40">scan_7k3f2m</span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-emerald-400" /><span className="text-white font-medium">Legitimacy Score</span></div>
                      <span className="text-2xl font-bold text-emerald-400">87%</span>
                    </div>
                    {[{ label: 'Consistency', score: 92 }, { label: 'Experience', score: 84 }, { label: 'Education', score: 88 }, { label: 'Skills', score: 79 }].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2">
                        <span className="text-white/60 text-sm">{item.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${item.score}%` }} /></div>
                          <span className="text-white/80 text-sm w-8">{item.score}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-amber-400/80 text-xs">Gap in employment 2019-2020</span></div>
                      <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span className="text-emerald-400/80 text-xs">Education verified via LinkedIn</span></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-light text-white">Automated <span className="font-medium">employment verification</span></h3>
                  <p className="text-white/50 leading-relaxed">Our AI-powered system contacts HR departments directly via phone and email to verify employment claims. No more manual calls or waiting for callbacks.</p>
                  <ul className="space-y-3">
                    {['AI phone calls to HR', 'Email verification requests', 'Web evidence discovery'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/70"><CheckCircle className="w-4 h-4 text-emerald-400" />{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /><span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Verification In Progress</span></div>
                    <span className="text-[10px] font-mono text-white/40">verify_9x2k1p</span>
                  </div>
                  <div className="p-6 space-y-4">
                    {[{ company: 'TechCorp Inc.', status: 'verified', method: 'Phone Call', icon: PhoneCall }, { company: 'DataSystems LLC', status: 'pending', method: 'Email Sent', icon: Clock }, { company: 'StartupXYZ', status: 'verified', method: 'Web Evidence', icon: Search }].map((item) => (
                      <div key={item.company} className={`flex items-center gap-4 p-4 rounded-xl ${item.status === 'pending' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/[0.02]'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'verified' ? 'bg-emerald-500/20' : 'bg-purple-500/20'}`}>
                          {item.status === 'verified' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.company}</p>
                          <div className="flex items-center gap-2 mt-1"><item.icon className="w-3 h-3 text-white/40" /><span className="text-white/40 text-xs">{item.method}</span></div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>{item.status === 'verified' ? 'Verified' : 'Pending'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'attest' && (
              <motion.div key="attest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-light text-white">Blockchain <span className="font-medium">attestations</span></h3>
                  <p className="text-white/50 leading-relaxed">Verified employment records are permanently recorded on the blockchain. Create tamper-proof, portable credentials that candidates can share with future employers.</p>
                  <ul className="space-y-3">
                    {['Immutable on-chain records', 'Portable credentials', 'Instant verification'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-white/70"><CheckCircle className="w-4 h-4 text-emerald-400" />{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">On-Chain Attestation</span></div>
                    <span className="text-[10px] font-mono text-white/40">base_sepolia</span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-3"><Link2 className="w-5 h-5 text-blue-400" /><span className="text-white font-medium">Attestation Created</span></div>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between"><span className="text-white/40">UID</span><span className="text-white/70">0x7f3k...9a2c</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Schema</span><span className="text-white/70">Employment Verification</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Network</span><span className="text-white/70">Base Sepolia</span></div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] space-y-3">
                      <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-white/40" /><span className="text-white/70 text-sm">TechCorp Inc.</span></div>
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-white/40" /><span className="text-white/70 text-sm">Software Engineer</span></div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white/40" /><span className="text-white/70 text-sm">Jan 2021 - Present</span></div>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 text-sm font-medium">Permanently Recorded</span></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ==================== USE CASES ==================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Use Cases</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Built for<span className="font-medium"> every team.</span></h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'HR Teams', description: 'Streamline your hiring process with automated verification and reduce time-to-hire by 60%.' },
              { icon: Lock, title: 'Compliance', description: 'Meet regulatory requirements with blockchain-verified employment records and audit trails.' },
              { icon: Globe, title: 'Staffing Agencies', description: 'Verify candidates at scale with bulk upload and team collaboration features.' }
            ].map((useCase, i) => (
              <motion.div key={useCase.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06]">
                <useCase.icon className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-medium text-white mb-3">{useCase.title}</h3>
                <p className="text-white/50">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight">Frequently asked<span className="font-medium"> questions.</span></h2>
          </motion.div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="text-white font-medium">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-white/60 leading-relaxed">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CONNECT WITH US ==================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Connect With Us</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Have questions?<span className="font-medium"> Let's talk.</span></h2>
            <p className="text-lg text-white/50 mt-4 max-w-xl mx-auto">Reach out for support, partnerships, or just to say hello.</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <AnimatedButton>
                <Link to={createPageUrl('Contact')}>
                  <Button className="group inline-flex items-center gap-2 px-7 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]">
                    <FileText className="w-4 h-4" />
                    Create a Ticket
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </AnimatedButton>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <motion.a 
              href="https://www.instagram.com/indexios" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group flex items-center gap-3 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
              <span className="text-white/70 group-hover:text-white transition-colors font-medium">Instagram</span>
            </motion.a>

            <motion.a 
              href="https://www.linkedin.com/company/indexios/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group flex items-center gap-3 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-all">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
              <span className="text-white/70 group-hover:text-white transition-colors font-medium">LinkedIn</span>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Pricing</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Simple,<span className="font-medium"> transparent pricing.</span></h2>
            <p className="text-lg text-white/50 mt-4 max-w-xl mx-auto">Start free. Upgrade when you need more.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier, index) => (
              <motion.div key={tier.tier} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -5 }} className={`relative rounded-2xl p-6 ${tier.popular ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/5 border-2 border-purple-500/40' : 'bg-white/[0.02] border border-white/[0.06]'} hover:border-white/[0.15] transition-all`}>
                {tier.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-semibold">Most Popular</div>}
                <div className="mb-6">
                  <h3 className="text-xl font-medium text-white mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    {tier.price > 0 && <span className="text-white/40">/mo</span>}
                  </div>
                  <p className="text-white/40 text-sm mt-2">{typeof tier.scans === 'number' ? `${tier.scans} scans/month` : tier.scans}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>
                <AnimatedButton>
                  <Button 
                    onClick={() => handleSubscribe(tier.tier)} 
                    disabled={(loading && processingTier === tier.tier) || !canSelectTier(tier.tier)} 
                    className={`w-full rounded-full py-5 font-semibold ${
                      user?.subscription_tier === tier.tier 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' 
                        : !canSelectTier(tier.tier)
                          ? 'bg-white/5 text-white/30 cursor-not-allowed'
                          : tier.popular 
                            ? 'bg-white text-black hover:bg-white/90' 
                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {loading && processingTier === tier.tier 
                      ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> 
                      : user?.subscription_tier === tier.tier 
                        ? 'Current Plan' 
                        : !canSelectTier(tier.tier)
                          ? 'Included'
                          : 'Upgrade'}
                  </Button>
                </AnimatedButton>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Ready to hire with<span className="font-medium"> confidence?</span></h2>
            <p className="text-lg text-white/50 max-w-lg mx-auto">Join hundreds of teams who trust Indexios to make smarter, safer hiring decisions.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatedButton>
                <Link to={createPageUrl('Scan')}>
                  <Button className="group inline-flex items-center gap-2 px-8 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02]">
                    Start Free Scan
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </AnimatedButton>
              <AnimatedButton>
                <Link to={createPageUrl('Contact')}>
                  <Button variant="ghost" className="inline-flex items-center gap-2 px-7 py-6 text-sm text-white/60 hover:text-white rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                    Contact Sales
                  </Button>
                </Link>
              </AnimatedButton>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 mt-24 pt-8 border-t border-white/[0.06] max-w-[1400px] mx-auto px-4">
          <p className="text-center text-white/30 text-sm">© {new Date().getFullYear()} Indexios LLC. All rights reserved.</p>
        </div>
      </section>
      </div>
    </>
  );
}