import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PricingCard from '@/components/paywall/PricingCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <Link to={createPageUrl('Home')}>
          <Button
            variant="ghost"
            className="mb-8 text-white hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Start with 3 free scans, then upgrade for unlimited access to resume verification and advanced fraud detection
          </p>
        </motion.div>

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
          className="mt-16 max-w-6xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Plan Comparison</h2>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900">
                    <th className="text-left px-6 py-3 text-white font-semibold">Feature</th>
                    <th className="text-center px-6 py-3 text-white font-semibold">Free</th>
                    <th className="text-center px-6 py-3 text-white font-semibold">Starter</th>
                    <th className="text-center px-6 py-3 text-white font-semibold">Professional</th>
                    <th className="text-center px-6 py-3 text-white font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Monthly Scans</td>
                    <td className="text-center px-6 py-3 text-white font-semibold">3</td>
                    <td className="text-center px-6 py-3 text-white font-semibold">50</td>
                    <td className="text-center px-6 py-3 text-white font-semibold">200</td>
                    <td className="text-center px-6 py-3 text-purple-400 font-semibold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Advanced Analysis</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Analysis Breakdown</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Next Steps & Questions</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Scan History</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Save Candidates</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Share & Download</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Bulk Upload</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">API Access</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                    <td className="text-center px-6 py-3 text-purple-400">✓</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Team Collaboration</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-purple-400 font-semibold">Up to 5 members</td>
                  </tr>
                  <tr className="border-b border-zinc-700/50">
                    <td className="px-6 py-3 text-white/80">Support</td>
                    <td className="text-center px-6 py-3 text-white/50">—</td>
                    <td className="text-center px-6 py-3 text-white">Priority</td>
                    <td className="text-center px-6 py-3 text-white">Priority</td>
                    <td className="text-center px-6 py-3 text-purple-400 font-semibold">Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center space-y-4"
        >
          {user?.subscription_tier && user.subscription_tier !== 'free' && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-white/70 text-sm">
                Need to cancel your subscription? Go to My Account to manage your subscription.
              </p>
            </div>
          )}
          <p className="text-white/50 text-sm">
            All plans include secure data handling and GDPR compliance
          </p>
        </motion.div>
      </div>
    </div>
  );
}