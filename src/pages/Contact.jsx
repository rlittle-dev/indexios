import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Mail, Instagram, MessageCircle, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

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
        alert('Support ticket created! You can check the status and see replies in your "My Tickets" section.');
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
        <meta name="description" content="Contact Indexios for support with resume verification, employment background checks, and hiring tools." />
        <link rel="canonical" href="https://indexios.me/Contact" />
        <meta property="og:title" content="Contact Indexios Support" />
        <meta property="og:url" content="https://indexios.me/Contact" />
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        </div>

        {/* Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{
            background: 'radial-gradient(70% 50%, transparent 0%, rgba(10, 10, 10, 0.5) 60%, rgba(10, 10, 10, 0.98) 100%)'
          }}
        />

        {/* Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-20 md:py-28 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              
              {/* Left Column - Header */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="space-y-5"
                >
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Get in Touch</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1]">
                    <span className="text-white/60 block">We're here to</span>
                    <span className="text-white block mt-2 font-medium">help you.</span>
                  </h1>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-lg md:text-xl text-white/50 max-w-md leading-relaxed"
                >
                  Have questions about Indexios? Want to learn more about our enterprise plans? We'd love to hear from you.
                </motion.p>

                {/* Contact Info Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="space-y-4 pt-4"
                >
                  <a
                    href="https://www.instagram.com/indexios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <Instagram className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Follow us on Instagram</p>
                      <p className="text-white/40 text-sm">@indexios</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="inline-flex p-3 rounded-xl bg-emerald-500/10">
                      <Mail className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Email Support</p>
                      <p className="text-white/40 text-sm">support@indexios.me</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Form */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-medium text-white/70">Send us a Message</span>
                  </div>
                  
                  <div className="p-6">
                    {!user ? (
                      <div className="text-center py-8">
                        <p className="text-white/60 mb-4">Please sign in to send us a message.</p>
                        <Button
                          onClick={() => base44.auth.redirectToLogin(createPageUrl('Contact'))}
                          className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-6"
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : user.role === 'admin' ? (
                      <div className="text-center py-8">
                        <p className="text-white/60 mb-4">As an admin, please use the Support Tickets section.</p>
                        <Link to={createPageUrl('Tickets')}>
                          <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-6">
                            Go to Support Tickets
                          </Button>
                        </Link>
                      </div>
                    ) : submitted ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="text-white font-semibold mb-2">Ticket created!</h3>
                        <p className="text-white/50 text-sm">Check "My Tickets" for updates.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="text-white/60 text-sm mb-2 block">Subject</label>
                          <Input
                            type="text"
                            placeholder="How can we help?"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            required
                            className="bg-white/[0.03] border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
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
                            className="w-full bg-white/[0.03] border border-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-white hover:bg-white/90 text-black font-semibold rounded-full py-5"
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
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-[#0a0a0a] py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-[700px] mx-auto px-4 sm:px-6 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              Ready to<span className="font-medium"> get started?</span>
            </h2>
            <p className="text-white/50">
              Join teams already using Indexios to make better hiring decisions.
            </p>
            <Link to={createPageUrl('Pricing')}>
              <Button className="group inline-flex items-center gap-2 px-7 py-5 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02]">
                View Pricing Plans
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="relative z-10 mt-16 pt-8 border-t border-white/[0.06] max-w-[1200px] mx-auto px-4">
          <p className="text-center text-white/30 text-sm">
            © {new Date().getFullYear()} Indexios LLC. All rights reserved.
          </p>
        </div>
      </section>
    </>
  );
}