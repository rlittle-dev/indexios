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

    // Admins should not create tickets from contact page
    if (user.role === 'admin') {
      alert('As an admin, please use the Support Tickets section to manage tickets.');
      return;
    }

    setLoading(true);

    try {
      await base44.functions.invoke('sendSupportEmail', formData);
      setSubmitted(true);
      setFormData({ subject: '', message: '' });
      
      // Alert user about My Tickets tab
      setTimeout(() => {
        alert('Support ticket created! You can check the status and see replies in your "My Tickets" section (click your name in the top right).');
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
        <title>Contact Indexios Support - Resume Verification Help</title>
        <meta name="description" content="Contact Indexios for support with resume verification, employment background checks, and hiring tools. Our team is ready to help." />
        <link rel="canonical" href="https://indexios.me/Contact" />
        <meta property="og:title" content="Contact Indexios Support" />
        <meta property="og:description" content="Get help with resume verification, employment checks, and platform support." />
        <meta property="og:url" content="https://indexios.me/Contact" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      
      <GradientBackground variant="purple">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <SectionHeader
            title="Contact Us"
            subtitle="We'd love to hear from you"
            centered
            className="mb-12"
          />

          <div className="space-y-8">
            <GlassCard className="p-8" gradient>
            <div className="flex items-start gap-4 mb-8">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Send us a Message</h2>
                <p className="text-white/70">
                  Have questions about Indexios? Want to learn more about our enterprise plans? Fill out the form below.
                </p>
              </div>
            </div>

            {!user ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-white/70 mb-4">Please sign in to send us a message.</p>
                <Button
                  onClick={() => base44.auth.redirectToLogin(createPageUrl('Contact'))}
                  className="bg-white hover:bg-gray-100 text-black font-medium"
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
                <p className="text-white/70 mb-4">As an admin, please use the Support Tickets section to manage tickets.</p>
                <Link to={createPageUrl('Tickets')}>
                  <Button className="bg-white hover:bg-gray-100 text-black font-medium">
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
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Support ticket created!</h3>
                <p className="text-white/60 text-sm">Check your "My Tickets" section for updates and replies.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Subject</label>
                  <Input
                    type="text"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-2 block">Message</label>
                  <textarea
                    placeholder="Tell us more..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows="5"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 text-black font-medium"
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

            <div className="space-y-4">
              <GlassCard className="p-4" delay={0.1} hover>
                <a
                  href="https://www.instagram.com/indexios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4"
                >
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Instagram className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Follow us on Instagram</h3>
                    <p className="text-white/60 text-sm">@indexios</p>
                  </div>
                </a>
              </GlassCard>

              <GlassCard className="p-4" delay={0.2}>
                <div className="flex items-center gap-4">
                  <div className="inline-flex p-3 rounded-xl bg-emerald-500/10">
                    <Mail className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email Support</h3>
                    <p className="text-white/60 text-sm">support@indexios.me</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-8 text-center" gradient delay={0.3}>
              <h2 className="text-2xl font-bold text-white mb-3">Ready to Get Started?</h2>
              <p className="text-white/80 mb-6">
                Join teams already using Indexios to make better hiring decisions
              </p>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                  View Pricing Plans
                </Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </GradientBackground>
    </>
  );
}