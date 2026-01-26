import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, ArrowRight, Phone, Link2, CheckCircle, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Indexios - Resume Verification & Employment Background Checks</title>
        <meta name="description" content="Learn how Indexios helps detect resume fraud and verify credentials. Our platform helps hiring teams make confident decisions with instant, actionable insights." />
        <meta name="keywords" content="resume verification, employment verification, background check, hiring platform, credential verification" />
        <link rel="canonical" href="https://indexios.me/About" />
        <meta property="og:title" content="About Indexios - Resume Verification Platform" />
        <meta property="og:description" content="Advanced resume fraud detection and credential verification for hiring teams." />
        <meta property="og:url" content="https://indexios.me/About" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      
      {/* Hero Section - Sentrial-inspired */}
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]" />
        </div>

        {/* Radial Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{
            background: 'radial-gradient(70% 50%, transparent 0%, rgba(10, 10, 10, 0.5) 60%, rgba(10, 10, 10, 0.98) 100%)'
          }}
        />

        {/* Floating Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-20 md:py-28 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              
              {/* Left Column - Text */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="space-y-5"
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-sm font-medium text-purple-300">Trusted by Hiring Teams</span>
                  </div>

                  {/* Headline */}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1]">
                    <span className="text-white/60 block">Don't just trust.</span>
                    <span className="text-white block mt-2 font-medium">Verify it.</span>
                  </h1>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-lg md:text-xl lg:text-[1.35rem] text-white/50 max-w-xl leading-relaxed"
                >
                  Indexios detects resume fraud in real-time and automatically verifies employment through phone calls and blockchain attestations.
                  <span className="text-white/80"> Stop guessing. Start verifying.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex flex-wrap items-center gap-4"
                >
                  <Link to={createPageUrl('Scan')}>
                    <Button className="group inline-flex items-center gap-2 px-7 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]">
                      Start Scanning
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Pricing')}>
                    <Button variant="ghost" className="inline-flex items-center gap-2 px-6 py-6 text-sm text-white/60 hover:text-white transition-all duration-200 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                      View Pricing
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>

                {/* Install Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="pt-4"
                >
                  <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/10">
                    <div className="relative w-4 h-4">
                      <div className="absolute inset-0 rounded-full border border-white/30 border-t-emerald-400 animate-spin" style={{ animationDuration: '1.5s' }} />
                    </div>
                    <code className="text-sm font-mono text-white/50">Try free • No credit card</code>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Visual */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex justify-center lg:justify-end"
              >
                <div className="w-full max-w-[550px]">
                  <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                    {/* Terminal Header */}
                    <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Live Verification</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">session_ix92kf</span>
                    </div>
                    
                    {/* Terminal Content */}
                    <div className="p-6 space-y-4">
                      {/* Verification Steps */}
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
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            step.status === 'active' 
                              ? 'bg-purple-500/10 border border-purple-500/20' 
                              : step.status === 'complete'
                              ? 'bg-white/[0.02]'
                              : 'bg-white/[0.01] opacity-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.status === 'complete' 
                              ? 'bg-emerald-500/20' 
                              : step.status === 'active'
                              ? 'bg-purple-500/20'
                              : 'bg-white/5'
                          }`}>
                            {step.status === 'complete' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : step.status === 'active' ? (
                              <div className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-white/20" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              step.status === 'pending' ? 'text-white/40' : 'text-white/80'
                            }`}>{step.label}</p>
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

      {/* Features Section */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">How It Works</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">
              Verification that<span className="font-medium"> actually works.</span>
            </h2>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: Shield,
                color: 'purple',
                title: 'Fraud Detection',
                description: 'Advanced AI analysis identifies inconsistencies, fabricated credentials, and inflated claims with surgical precision.'
              },
              {
                icon: Phone,
                color: 'emerald',
                title: 'Automated Phone Verification',
                description: 'AI-powered calls to HR departments verify employment history and discover company verification policies.'
              },
              {
                icon: Link2,
                color: 'blue',
                title: 'Blockchain Attestations',
                description: 'Verified records are permanently recorded on-chain, creating tamper-proof, portable credentials.'
              },
              {
                icon: Zap,
                color: 'amber',
                title: 'Instant Results',
                description: 'Get comprehensive verification reports in seconds, not days. Speed without sacrificing accuracy.'
              },
              {
                icon: Target,
                color: 'rose',
                title: 'Actionable Insights',
                description: 'Receive tailored interview questions and next steps based on each candidate\'s unique profile.'
              },
              {
                icon: Users,
                color: 'cyan',
                title: 'Team Collaboration',
                description: 'Share reports, collaborate on evaluations, and streamline your entire hiring workflow.'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
              >
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

      {/* CTA Section */}
      <section className="relative bg-[#0a0a0a] py-24 md:py-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/[0.05] rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-tight">
              Ready to hire with<span className="font-medium"> confidence?</span>
            </h2>
            <p className="text-lg text-white/50 max-w-lg mx-auto">
              Join hundreds of teams who trust Indexios to make smarter, safer hiring decisions every day.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to={createPageUrl('Scan')}>
                <Button className="group inline-flex items-center gap-2 px-8 py-6 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]">
                  Start Free Scan
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
              <Link to={createPageUrl('Contact')}>
                <Button variant="ghost" className="inline-flex items-center gap-2 px-7 py-6 text-sm text-white/60 hover:text-white transition-all duration-200 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5">
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-24 pt-8 border-t border-white/[0.06] max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <p className="text-center text-white/30 text-sm">
            © {new Date().getFullYear()} Indexios LLC. All rights reserved.
          </p>
        </div>
      </section>
    </>
  );
}