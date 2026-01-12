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
      'Basic legitimacy scoring',
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
      '50 resume scans per month',
      'Advanced legitimacy scoring',
      'Detailed analysis breakdown',
      'Red & green flags detection',
      'Scan history',
      'Priority support'
    ]
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: 99,
    scans: 200,
    features: [
      '200 resume scans per month',
      'Advanced legitimacy scoring',
      'Detailed analysis breakdown',
      'Red & green flags detection',
      'Unlimited scan history',
      'API access',
      'Priority support',
      'Custom integrations'
    ]
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 299,
    scans: 'Unlimited',
    features: [
      'Unlimited resume scans',
      'Advanced legitimacy scoring',
      'Detailed analysis breakdown',
      'Red & green flags detection',
      'Unlimited scan history',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'Team collaboration',
      'Custom AI training'
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
            Start with 3 free scans, then upgrade for unlimited access to AI-powered resume verification
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-white/50 text-sm">
            All plans include secure data handling and GDPR compliance
          </p>
        </motion.div>
      </div>
    </div>
  );
}