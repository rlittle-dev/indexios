import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Instagram, MessageCircle, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.functions.invoke('sendSupportEmail', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send message. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
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
              Contact Us
            </h1>
            <p className="text-xl text-white/70">
              We'd love to hear from you
            </p>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
            <div className="flex items-start gap-4 mb-6">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Get in Touch</h2>
                <p className="text-white/70">
                  Have questions about Indexios? Want to learn more about our enterprise plans? We're here to help.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <motion.a
                href="https://www.instagram.com/indexios"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all group"
              >
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                  <Instagram className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Follow us on Instagram</h3>
                  <p className="text-white/60 text-sm">@indexios</p>
                </div>
              </motion.a>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700"
              >
                <div className="inline-flex p-3 rounded-xl bg-emerald-500/10">
                  <Mail className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Email Support</h3>
                  <p className="text-white/60 text-sm">Reach out through Instagram DMs for inquiries</p>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Get Started?</h2>
            <p className="text-white/80 mb-6">
              Join teams already using Indexios to make better hiring decisions
            </p>
            <Link to={createPageUrl('Pricing')}>
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                View Pricing Plans
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}