import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Target, Users, Zap, ArrowLeft, Phone, Link2 } from 'lucide-react';
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
        <meta name="twitter:title" content="About Indexios" />
        <meta name="twitter:description" content="Resume verification and employment background check platform." />
      </Helmet>
      
      <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent mb-4">
              About Indexios
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              The modern resume verification platform for smart hiring decisions
            </p>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Indexios empowers hiring teams to make confident decisions by combining advanced resume analysis, automated employment verification phone calls, and blockchain-backed attestations. We help you identify the best candidates while protecting your organization from fraudulent applications with verifiable, tamper-proof records.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Advanced Analysis</h3>
              <p className="text-white/70">
                Deep analysis of resumes to detect inconsistencies, verify credentials, and assess candidate legitimacy with precision.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-green-500/10 mb-4">
                <Phone className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Phone Verification</h3>
              <p className="text-white/70">
                Automated calls to HR departments verify employment history and discover company verification policies.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-blue-500/10 mb-4">
                <Link2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Blockchain Attestations</h3>
              <p className="text-white/70">
                Verified employment records are permanently recorded on-chain, creating tamper-proof, portable credentials for candidates.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-indigo-500/10 mb-4">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Results</h3>
              <p className="text-white/70">
                Get comprehensive verification reports in seconds, not days. Speed up your hiring process without sacrificing accuracy.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Actionable Insights</h3>
              <p className="text-white/70">
                Receive detailed recommendations and interview questions tailored to each candidate for more effective evaluations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <div className="inline-flex p-3 rounded-xl bg-yellow-500/10 mb-4">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Team Collaboration</h3>
              <p className="text-white/70">
                Share reports with your team, collaborate on candidate evaluations, and streamline your hiring workflow.
              </p>
            </motion.div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Trusted by Hiring Teams</h2>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              From startups to enterprises, organizations rely on Indexios to make smarter, safer hiring decisions.
            </p>
            <Link to={createPageUrl('Pricing')}>
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                Get Started Today
              </Button>
            </Link>
          </div>

          <div className="text-center pt-8 border-t border-zinc-800">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Indexios LLC. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}