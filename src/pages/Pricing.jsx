import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TIERS = [
  {
    tier: 'personal',
    name: 'Personal',
    price: 30,
    scans: 25,
    popular: true,
    features: ['25 verifications/month', 'Web evidence search', 'Phone & email verification', 'Blockchain attestations', 'Scan history']
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: null,
    scans: 'Custom',
    features: ['Unlimited verifications', 'Custom integrations', 'Priority support', 'Dedicated account manager', 'SLA guarantee'],
    contact: true
  }
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingTier, setProcessingTier] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleSubscribe = async (tier) => {
    if (tier === 'free') return;

    if (!user) {
      base44.auth.redirectToLogin(createPageUrl('Pricing'));
      return;
    }

    const tierLevels = { free: 0, personal: 1, enterprise: 2 };
    const currentLevel = tierLevels[user?.subscription_tier || 'free'];
    const targetLevel = tierLevels[tier];

    if (targetLevel < currentLevel) {
      alert('Please use the Manage Subscription option to downgrade your plan.');
      return;
    }

    setProcessingTier(tier);
    setLoading(true);

    try {
      const response = await base44.functions.invoke('createCheckoutSession', { tier });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
      setLoading(false);
      setProcessingTier(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pricing Plans - Employment Verification Starting at $30/month | Indexios</title>
        <meta name="description" content="Choose the perfect Indexios plan for your hiring needs. Personal at $30/mo with 25 verifications, or Enterprise for unlimited verifications." />
        <link rel="canonical" href="https://indexios.me/Pricing" />
        <meta property="og:title" content="Indexios Pricing - Resume Verification Plans" />
        <meta property="og:url" content="https://indexios.me/Pricing" />
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative bg-[#0a0a0a] overflow-hidden py-20 md:py-28">
        {/* Background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2232&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.12
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        </div>

        {/* Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
              <span className="text-sm font-medium text-purple-300">Simple Pricing</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-4">
              <span className="text-white/60">Choose your</span>
              <span className="text-white font-medium"> plan.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto">
              Start verifying employment today with our simple pricing plans.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {TIERS.map((tierData, index) => (
              <motion.div
                key={tierData.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-6 ${
                  tierData.popular 
                    ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/5 border-2 border-purple-500/40' 
                    : 'bg-white/[0.02] border border-white/[0.06]'
                } hover:border-white/[0.15] transition-all duration-300`}
              >
                {tierData.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-medium text-white mb-2">{tierData.name}</h3>
                  <div className="flex items-baseline gap-1">
                    {tierData.price === null ? (
                      <span className="text-4xl font-bold text-white">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">${tierData.price}</span>
                        {tierData.price > 0 && <span className="text-white/40">/mo</span>}
                      </>
                    )}
                  </div>
                  <p className="text-white/40 text-sm mt-2">
                    {typeof tierData.scans === 'number' ? `${tierData.scans} scans/month` : tierData.scans}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {tierData.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tierData.contact ? (
                  <Link to={createPageUrl('Contact')}>
                    <Button className="w-full rounded-full py-5 font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90">
                      Contact Sales
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(tierData.tier)}
                    disabled={loading && processingTier === tierData.tier}
                    className={`w-full rounded-full py-5 font-semibold transition-all duration-200 ${
                      tierData.popular
                        ? 'bg-white text-black hover:bg-white/90'
                        : user?.subscription_tier === tierData.tier
                        ? 'bg-white/10 text-white/50 cursor-default'
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {loading && processingTier === tierData.tier ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : user?.subscription_tier === tierData.tier ? (
                      'Current Plan'
                    ) : tierData.tier === 'free' ? (
                      'Get Started'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="relative bg-[#0a0a0a] py-20">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-light text-white">
              Plan<span className="font-medium"> Comparison</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-6 py-4 text-white font-medium">Feature</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Personal</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly Verifications', personal: '25', enterprise: 'Unlimited' },
                    { feature: 'Web Evidence Search', personal: true, enterprise: true },
                    { feature: 'Phone Verification', personal: true, enterprise: true },
                    { feature: 'Email Verification', personal: true, enterprise: true },
                    { feature: 'Blockchain Attestations', personal: true, enterprise: true },
                    { feature: 'Scan History', personal: true, enterprise: true },
                    { feature: 'Custom Integrations', personal: false, enterprise: true },
                    { feature: 'Dedicated Account Manager', personal: false, enterprise: true },
                    { feature: 'Support', personal: 'Standard', enterprise: 'Priority + SLA' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      <td className="px-6 py-4 text-white/70">{row.feature}</td>
                      <td className="text-center px-6 py-4">
                        {typeof row.personal === 'boolean' ? (
                          row.personal ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/30">—</span>
                        ) : (
                          <span className={row.personal === 'Unlimited' ? 'text-purple-400 font-medium' : 'text-white/70'}>{row.personal}</span>
                        )}
                      </td>
                      <td className="text-center px-6 py-4">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/30">—</span>
                        ) : (
                          <span className={row.enterprise === 'Unlimited' || row.enterprise === 'Priority + SLA' ? 'text-purple-400 font-medium' : 'text-white/70'}>{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {user?.subscription_tier && user.subscription_tier !== 'free' && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center"
            >
              <p className="text-white/40 text-sm">
                Need to cancel? Go to My Account to manage your subscription.
              </p>
            </motion.div>
          )}
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
              Questions?<span className="font-medium"> Let's talk.</span>
            </h2>
            <p className="text-white/50">
              Not sure which plan is right for you? We're happy to help.
            </p>
            <Link to={createPageUrl('Contact')}>
              <Button className="group inline-flex items-center gap-2 px-7 py-5 bg-white text-black text-sm font-semibold rounded-full transition-all duration-200 hover:bg-white/90 hover:scale-[1.02]">
                Contact Us
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="relative z-10 mt-16 pt-8 border-t border-white/[0.06] max-w-[1200px] mx-auto px-4">
          <p className="text-center text-white/30 text-sm">
            © {new Date().getFullYear()} Indexios LLC. All rights reserved. • All plans include secure data handling and GDPR compliance.
          </p>
        </div>
      </section>
    </>
  );
}