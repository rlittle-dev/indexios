import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, Users, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GradientBackground from '@/components/ui/GradientBackground';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';
import FeatureCard from '@/components/ui/FeatureCard';

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Indexios - AI Resume Verification Platform</title>
        <meta name="description" content="Learn about Indexios, the AI-powered resume verification platform helping hiring teams detect fraudulent resumes and make confident decisions." />
        <link rel="canonical" href="https://indexios.me/About" />
        <meta property="og:title" content="About Indexios - Resume Verification" />
        <meta property="og:description" content="AI-powered fraud detection for hiring teams." />
        <meta property="og:url" content="https://www.indexios.me/About" />
      </Helmet>
      
      <GradientBackground>
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-8 text-white/60 hover:text-white hover:bg-white/5 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <SectionHeader
            badge="About Us"
            title="Built for Modern Hiring"
            subtitle="We're on a mission to bring trust and transparency to the hiring process through advanced verification technology."
            className="mb-16"
          />

          {/* Mission Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <GlassCard className="p-8 md:p-12" gradient>
              <div className="flex items-start gap-6">
                <div className="hidden md:flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                  <Shield className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight">Our Mission</h2>
                  <p className="text-white/50 leading-relaxed mb-4">
                    In today's competitive job market, resume fraud has become increasingly sophisticated. 
                    We built Indexios to give hiring teams the tools they need to verify candidates quickly 
                    and accurately, without the manual burden of traditional background checks.
                  </p>
                  <p className="text-white/50 leading-relaxed">
                    Our AI-powered platform analyzes resumes for consistency, verifies employment through 
                    automated phone calls, and creates permanent blockchain attestations for verified credentials.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Values Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-semibold text-white mb-8 text-center tracking-tight">What We Offer</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <FeatureCard
                icon={Zap}
                title="Instant Analysis"
                description="Get comprehensive resume verification in seconds, not days. Our AI processes and analyzes credentials in real-time."
                color="purple"
                delay={0.1}
              />
              <FeatureCard
                icon={Target}
                title="Actionable Insights"
                description="Receive specific recommendations and tailored interview questions based on each candidate's profile."
                color="green"
                delay={0.15}
              />
              <FeatureCard
                icon={Shield}
                title="Blockchain Verified"
                description="Permanent, tamper-proof records on the Base blockchain provide irrefutable proof of verification."
                color="blue"
                delay={0.2}
              />
              <FeatureCard
                icon={Users}
                title="Team Collaboration"
                description="Enterprise plans include team features for seamless collaboration on candidate verification."
                color="orange"
                delay={0.25}
              />
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <GlassCard className="p-8">
              <h3 className="text-xl font-semibold text-white mb-6 text-center tracking-tight">Why Teams Trust Indexios</h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  "AI-powered fraud detection",
                  "Automated phone verification",
                  "Blockchain attestations",
                  "Enterprise-grade security",
                  "GDPR compliant",
                  "24/7 support for enterprise"
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-10 text-center" gradient>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                Ready to Get Started?
              </h2>
              <p className="text-white/40 mb-8 max-w-lg mx-auto">
                Try Indexios free with 3 resume scans. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl('Scan')}>
                  <Button size="lg" className="bg-white hover:bg-white/90 text-black font-semibold px-8 h-12 rounded-xl">
                    Start Scanning
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to={createPageUrl('Pricing')}>
                  <Button size="lg" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 font-medium px-8 h-12 rounded-xl">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12 text-white/30 text-sm"
          >
            © {new Date().getFullYear()} Indexios LLC. All rights reserved.
          </motion.div>
        </div>
      </GradientBackground>
    </>
  );
}