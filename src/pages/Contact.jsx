import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Mail, Instagram, MessageCircle, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import GradientBackground from '@/components/ui/GradientBackground';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Contact() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl('Contact'));
      return;
    }

    if (user.role === 'admin') {
      alert('As an admin, please use the Support Tickets section to manage tickets.');
      return;
    }

    setLoading(true);

    try {
      await base44.functions.invoke('sendSupportEmail', formData);
      setSubmitted(true);
      setFormData({ subject: '', message: '' });
      
      setTimeout(() => {
        alert('Support ticket created! Check "My Tickets" for updates.');
      }, 500);
      
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    }

    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Contact Indexios Support - Get Help with Resume Verification</title>
        <meta name="description" content="Contact Indexios for support, questions, or inquiries about our resume verification platform." />
        <link rel="canonical" href="https://indexios.me/Contact" />
        <meta property="og:title" content="Contact Indexios Support" />
        <meta property="og:description" content="Get help with resume verification and platform support." />
        <meta property="og:url" content="https://www.indexios.me/Contact" />
      </Helmet>
      
      <GradientBackground>
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-8 text-white/60 hover:text-white hover:bg-white/5 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <SectionHeader
            badge="Get in Touch"
            title="Contact Us"
            subtitle="We'd love to hear from you"
            className="mb-12"
          />

          <GlassCard className="p-8 mb-6" delay={0.1}>
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">Send us a Message</h2>
                <p className="text-white/40 text-sm">
                  Have questions about Indexios? Want to learn more about our enterprise plans?
                </p>
              </div>
            </div>

            {!user ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-white/50 mb-4">Please sign in to send us a message.</p>
                <Button
                  onClick={() => base44.auth.redirectToLogin(createPageUrl('Contact'))}
                  className="bg-white hover:bg-white/90 text-black font-medium rounded-xl"
                >
                  Sign In
                </Button>
              </motion.div>
            ) : user.role === 'admin' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-white/50 mb-4">As an admin, please use the Support Tickets section.</p>
                <Link to={createPageUrl('Tickets')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-xl">
                    Go to Support Tickets
                  </Button>
                </Link>
              </motion.div>
            ) : submitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Ticket Created!</h3>
                <p className="text-white/40 text-sm">Check "My Tickets" for updates.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Subject</label>
                  <Input
                    type="text"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-purple-500/50"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">Message</label>
                  <textarea
                    placeholder="Tell us more..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows="5"
                    className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-white/90 text-black font-medium h-11 rounded-xl"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}
          </GlassCard>

          <div className="space-y-4 mb-8">
            <motion.a
              href="https://www.instagram.com/indexios"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                <Instagram className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Follow us on Instagram</h3>
                <p className="text-white/40 text-xs">@indexios</p>
              </div>
            </motion.a>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Email Support</h3>
                <p className="text-white/40 text-xs">support@indexios.me</p>
              </div>
            </motion.div>
          </div>

          <GlassCard className="p-8 text-center" gradient delay={0.3}>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">Ready to Get Started?</h2>
            <p className="text-white/40 text-sm mb-6">
              Join teams already using Indexios
            </p>
            <Link to={createPageUrl('Pricing')}>
              <Button className="bg-white hover:bg-white/90 text-black font-semibold px-6 h-11 rounded-xl">
                View Pricing Plans
              </Button>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    </>
  );
}