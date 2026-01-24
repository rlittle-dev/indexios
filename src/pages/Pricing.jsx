import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PricingCard from '@/components/paywall/PricingCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GradientBackground from '@/components/ui/GradientBackground';
import SectionHeader from '@/components/ui/SectionHeader';
import GlassCard from '@/components/ui/GlassCard';

const TIERS = [
        {
          tier: 'free',
          name: 'Free',
          price: 0,
          scans: 3,
          features: [
            '3 resume scans per month',
            'Advanced analysis for all resumes',
            'Red & green flags detection'
          ]
        },
        {
          tier: 'starter',
          name: 'Starter',
          price: 29,
          scans: 50,
          popular: true,
          features: [
            'All Free features, plus:',
            '50 resume scans per month',
            'Detailed analysis breakdown',
            'Scan history',
            'Share & download scans',
            'Priority support'
          ]
        },
        {
          tier: 'professional',
          name: 'Professional',
          price: 99,
          scans: 200,
          features: [
            'All Starter features, plus:',
            '200 resume scans per month',
            'Next steps recommendations',
            'Interview question generation',
            '15 employment verifications/month',
            'Save candidates to folders',
            'API access'
          ]
        },
        {
          tier: 'enterprise',
          name: 'Enterprise',
          price: 299,
          scans: 'Unlimited',
          features: [
            'All Professional features, plus:',
            'Unlimited resume scans',
            'Unlimited employment verifications',
            'Bulk upload',
            'Team collaboration (up to 5 members)',
            'Dedicated support',
            'Custom integrations'
          ]
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

        // Check if user is logged in
        if (!user) {
          base44.auth.redirectToLogin(createPageUrl('Pricing'));
          return;
        }

        // Prevent downgrades
        const tierLevels = { free: 0, starter: 1, professional: 2, enterprise: 3 };
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
        <title>Pricing Plans - Resume Verification Starting at $29/month | Indexios</title>
        <meta name="description" content="Choose the perfect Indexios plan for your hiring needs. Free tier with 3 scans, Starter at $29/mo (50 scans), Professional at $99/mo (200 scans), or Enterprise for unlimited scans and team collaboration." />
        <link rel="canonical" href="https://indexios.me/Pricing" />
        <meta property="og:title" content="Indexios Pricing Plans - Resume Verification" />
        <meta property="og:description" content="Affordable resume verification plans starting at $29/month. Free tier available with 3 scans." />
        <meta property="og:url" content="https://www.indexios.me/Pricing" />
      </Helmet>
      
      <GradientBackground>
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-8 text-white/60 hover:text-white hover:bg-white/5 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <SectionHeader
            badge="Pricing"
            title="Choose Your Plan"
            subtitle="Start with 3 free scans, then upgrade for unlimited access to advanced fraud detection"
            className="mb-12"
          />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tierData, index) => (
            <PricingCard
              key={tierData.tier}
              {...tierData}
              currentTier={user?.subscription_tier || 'free'}
              onSubscribe={handleSubscribe}
              loading={loading && processingTier === tierData.tier}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-semibold text-white mb-8 text-center tracking-tight">Plan Comparison</h2>
          <GlassCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="text-left px-6 py-4 text-white font-medium">Feature</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Free</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Starter</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Professional</th>
                    <th className="text-center px-6 py-4 text-white font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Monthly Scans', free: '3', starter: '50', pro: '200', enterprise: 'Unlimited', enterpriseHighlight: true },
                    { feature: 'Advanced Analysis', free: true, starter: true, pro: true, enterprise: true },
                    { feature: 'Analysis Breakdown', free: false, starter: true, pro: true, enterprise: true },
                    { feature: 'Next Steps & Questions', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'Employment Verification', free: false, starter: false, pro: '15/month', enterprise: 'Unlimited', enterpriseHighlight: true },
                    { feature: 'Scan History', free: false, starter: true, pro: true, enterprise: true },
                    { feature: 'Save Candidates', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'Share & Download', free: false, starter: true, pro: true, enterprise: true },
                    { feature: 'Bulk Upload', free: false, starter: false, pro: false, enterprise: true },
                    { feature: 'API Access', free: false, starter: false, pro: true, enterprise: true },
                    { feature: 'Team Collaboration', free: false, starter: false, pro: false, enterprise: 'Up to 5', enterpriseHighlight: true },
                    { feature: 'Support', free: '—', starter: 'Priority', pro: 'Priority', enterprise: 'Dedicated', enterpriseHighlight: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-6 py-3.5 text-white/60">{row.feature}</td>
                      <td className="text-center px-6 py-3.5">
                        {typeof row.free === 'boolean' ? (row.free ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/20">—</span>) : <span className="text-white/80">{row.free}</span>}
                      </td>
                      <td className="text-center px-6 py-3.5">
                        {typeof row.starter === 'boolean' ? (row.starter ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/20">—</span>) : <span className="text-white/80">{row.starter}</span>}
                      </td>
                      <td className="text-center px-6 py-3.5">
                        {typeof row.pro === 'boolean' ? (row.pro ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/20">—</span>) : <span className="text-white/80">{row.pro}</span>}
                      </td>
                      <td className="text-center px-6 py-3.5">
                        {typeof row.enterprise === 'boolean' ? (row.enterprise ? <Check className="w-4 h-4 text-purple-400 mx-auto" /> : <span className="text-white/20">—</span>) : <span className={row.enterpriseHighlight ? 'text-purple-400 font-medium' : 'text-white/80'}>{row.enterprise}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center space-y-4"
        >
          {user?.subscription_tier && user.subscription_tier !== 'free' && (
            <GlassCard className="p-4 max-w-2xl mx-auto">
              <p className="text-white/50 text-sm">
                Need to cancel? Go to My Account to manage your subscription.
              </p>
            </GlassCard>
          )}
          <p className="text-white/30 text-sm">
            All plans include secure data handling and GDPR compliance
          </p>
        </motion.div>
        </div>
      </GradientBackground>
    </>
  );
}