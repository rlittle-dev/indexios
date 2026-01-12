import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PricingCard({ 
  tier, 
  name, 
  price, 
  scans, 
  features, 
  popular, 
  currentTier,
  onSubscribe,
  loading,
  delay = 0 
}) {
  const isCurrent = currentTier === tier;
  const isFree = tier === 'free';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border-2 transition-all hover:scale-105",
        popular ? "border-white shadow-2xl shadow-white/10" : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full text-sm font-bold">
          Most Popular
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-black text-white">${price}</span>
          {!isFree && <span className="text-white/50">/month</span>}
        </div>
        <p className="text-white/60 mt-2">{scans} scans per month</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="mt-0.5 p-1 rounded-full bg-white/10">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-white/80 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onSubscribe(tier)}
        disabled={isCurrent || loading}
        className={cn(
          "w-full font-semibold",
          isCurrent 
            ? "bg-zinc-800 text-white/50 cursor-not-allowed" 
            : popular
            ? "bg-white hover:bg-gray-100 text-black"
            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isCurrent ? (
          'Current Plan'
        ) : isFree ? (
          'Get Started Free'
        ) : (
          'Subscribe'
        )}
      </Button>
    </motion.div>
  );
}