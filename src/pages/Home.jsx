import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Phone, Link2, CheckCircle, FileText, Zap, Target, Check, ChevronDown, Users, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

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

  const handleSubscribe = async (tier) => {
    if (tier === 'free') {
      window.location.href = createPageUrl('Scan');
      return;
    }
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl('Home'));
      return;
    }
    const tierLevels = { free: 0, starter: 1, professional: 2, enterprise: 3 };
    if (tierLevels[tier] < tierLevels[user?.subscription_tier || 'free']) {
      alert('Please use My Account to manage your subscription.');
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
          <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
        </div>

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
                  <Link to={createPageUrl('Scan')}>
                    <Button className="group inline-flex items-center gap-2 px-7 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]">
                      Get Started
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Docs')}>
                    <Button variant="ghost" className="inline-flex items-center gap-2 px-6 py-6 text-sm text-white/60 hover:text-white transition-all duration-200 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                      Read the Docs
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
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

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16 md:mb-20">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">How It Works</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Verification that<span className="font-medium"> actually works.</span></h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Shield, color: 'purple', title: 'Fraud Detection', description: 'Advanced AI identifies inconsistencies, fabricated credentials, and inflated claims.' },
              { icon: Phone, color: 'emerald', title: 'Automated Phone Verification', description: 'AI-powered calls to HR departments verify employment history automatically.' },
              { icon: Link2, color: 'blue', title: 'Blockchain Attestations', description: 'Verified records are recorded on-chain for tamper-proof credentials.' },
              { icon: Zap, color: 'amber', title: 'Instant Results', description: 'Get comprehensive verification reports in seconds, not days.' },
              { icon: Target, color: 'rose', title: 'Actionable Insights', description: 'Receive tailored interview questions based on each profile.' },
              { icon: FileText, color: 'cyan', title: 'Detailed Reports', description: 'Download and share comprehensive reports with your team.' }
            ].map((feature, index) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="group p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                <div className={`inline-flex p-3 rounded-xl bg-${feature.color}-500/10 mb-5`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== STATS SECTION ==================== */}
      <section className="relative bg-[#0a0a0a] py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Resumes Verified' },
              { value: '99.2%', label: 'Accuracy Rate' },
              { value: '<30s', label: 'Analysis Time' },
              { value: '500+', label: 'Companies Trust Us' }
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-white/40 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== USE CASES ==================== */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
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

      {/* ==================== PRICING SECTION ==================== */}
      <section id="pricing" className="relative bg-[#0a0a0a] py-24 md:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Pricing</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Simple,<span className="font-medium"> transparent pricing.</span></h2>
            <p className="text-lg text-white/50 mt-4 max-w-xl mx-auto">Start free. Upgrade when you need more.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier, index) => (
              <motion.div key={tier.tier} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className={`relative rounded-2xl p-6 ${tier.popular ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/5 border-2 border-purple-500/40' : 'bg-white/[0.02] border border-white/[0.06]'} hover:border-white/[0.15] transition-all`}>
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
                <Button onClick={() => handleSubscribe(tier.tier)} disabled={loading && processingTier === tier.tier} className={`w-full rounded-full py-5 font-semibold ${tier.popular ? 'bg-white text-black hover:bg-white/90' : user?.subscription_tier === tier.tier ? 'bg-white/10 text-white/50 cursor-default' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>
                  {loading && processingTier === tier.tier ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : user?.subscription_tier === tier.tier ? 'Current Plan' : tier.tier === 'free' ? 'Get Started' : 'Subscribe'}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight">Frequently asked<span className="font-medium"> questions.</span></h2>
          </motion.div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-white/[0.06] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="text-white font-medium">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-5 text-white/60 leading-relaxed">{faq.a}</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/[0.05] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">Ready to hire with<span className="font-medium"> confidence?</span></h2>
            <p className="text-lg text-white/50 max-w-lg mx-auto">Join hundreds of teams who trust Indexios to make smarter, safer hiring decisions.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to={createPageUrl('Scan')}>
                <Button className="group inline-flex items-center gap-2 px-8 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02]">
                  Start Free Scan
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
              <Link to={createPageUrl('Contact')}>
                <Button variant="ghost" className="inline-flex items-center gap-2 px-7 py-6 text-sm text-white/60 hover:text-white rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 mt-24 pt-8 border-t border-white/[0.06] max-w-[1400px] mx-auto px-4">
          <p className="text-center text-white/30 text-sm">© {new Date().getFullYear()} Indexios LLC. All rights reserved.</p>
        </div>
      </section>
    </>
  );
}