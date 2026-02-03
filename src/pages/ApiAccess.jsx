import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Key, Copy, RefreshCw, Lock, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ApiAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.api_key) {
        setApiKey(currentUser.api_key);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const generateApiKey = async () => {
    setGenerating(true);
    const newKey = `ixs_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    await base44.auth.updateMe({ api_key: newKey });
    setApiKey(newKey);
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasApiAccess = user?.subscription_tier === 'enterprise';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <Key className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Developer Access</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">API</span>
            <span className="text-white font-medium"> Access</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">Integrate Indexios verification into your applications</p>
        </motion.div>

        {!hasApiAccess ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-purple-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Access Required</span>
              </div>
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 mb-6">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white text-2xl font-medium mb-3">Enterprise Feature</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">
                  API access is available on Enterprise plans. Contact us to discuss your needs.
                </p>
                <Link to={createPageUrl('Contact')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* API Key Box */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Your API Key</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-0">Active</Badge>
                </div>
                <div className="p-6 space-y-4">
                  {apiKey ? (
                    <>
                      <div className="flex gap-3">
                        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-4 font-mono text-sm text-white/80 break-all">
                          {apiKey}
                        </div>
                        <Button
                          onClick={copyToClipboard}
                          variant="outline"
                          className="border-white/10 bg-white/5 text-white hover:text-white hover:bg-white/10 rounded-xl"
                        >
                          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button
                        onClick={generateApiKey}
                        disabled={generating}
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:text-white hover:bg-white/10 rounded-xl"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                        Regenerate Key
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={generateApiKey}
                      disabled={generating}
                      className="bg-white hover:bg-white/90 text-black font-medium rounded-full"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Generate API Key
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Documentation Box */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">API Documentation</span>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-3">Base URL</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-x-auto">
                      <code className="text-sm text-emerald-400 font-mono">https://api.indexios.me/v1</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Verify Employment</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-x-auto">
                      <code className="text-sm text-emerald-400 font-mono">POST /verify</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Headers</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-sm text-white/70 font-mono">{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Request Body</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-sm text-white/70 font-mono">{`{
  "resume_url": "https://...",
  "candidate_name": "Jane Smith",
  "employers": ["TechCorp", "StartupXYZ"]
}`}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Response Example</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs text-white/70 font-mono leading-relaxed">{`{
  "candidate_name": "Jane Smith",
  "employers": [
    {
      "name": "TechCorp",
      "web_evidence_found": true,
      "evidence_count": 5,
      "hr_phone": "+1-555-0123",
      "verification_status": "verified"
    }
  ],
  "timeline_overlaps": [],
  "attestation_uid": "0x7f3k...9a2c"
}`}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Rate Limits</h3>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm text-white/60 space-y-1">
                      <p>• <span className="text-white">Enterprise:</span> 1,000 API requests/hour</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}