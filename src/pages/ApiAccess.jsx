import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Key, Copy, RefreshCw, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      
      // Load existing API key if available
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

  const hasApiAccess = user?.subscription_tier === 'professional' || user?.subscription_tier === 'enterprise';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">API Access</h1>
            <p className="text-white/60">Integrate Indexios verification into your applications</p>
          </div>

          {!hasApiAccess ? (
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="text-center">
                <div className="inline-flex p-4 rounded-full bg-yellow-500/10 mb-4 mx-auto">
                  <Lock className="w-8 h-8 text-yellow-400" />
                </div>
                <CardTitle className="text-white text-2xl">API Access Required</CardTitle>
                <CardDescription className="text-white/60">
                  Upgrade to Professional or Enterprise to access the API
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link to={createPageUrl('Pricing')}>
                  <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                    View Pricing Plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-400" />
                    Your API Key
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Use this key to authenticate API requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {apiKey ? (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg p-3 font-mono text-sm text-white break-all">
                          {apiKey}
                        </div>
                        <Button
                          onClick={copyToClipboard}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800 text-white hover:text-white hover:bg-zinc-700"
                        >
                          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        </div>
                        <Button
                        onClick={generateApiKey}
                        disabled={generating}
                        variant="outline"
                        className="border-zinc-700 bg-zinc-800 text-white hover:text-white hover:bg-zinc-700"
                        >
                        <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                        Regenerate Key
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={generateApiKey}
                      disabled={generating}
                      className="bg-white hover:bg-gray-100 text-black font-medium"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Generate API Key
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">API Documentation</CardTitle>
                  <CardDescription className="text-white/60">
                    How to use the Indexios API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold mb-2">Endpoint</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-emerald-400">
                      POST https://api.indexios.com/verify
                    </code>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-semibold mb-2">Headers</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white whitespace-pre">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data`}
                    </code>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Request Body</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white">
                      file: (binary) - Resume PDF file
                    </code>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Response</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white whitespace-pre">
{`{
  "candidate_name": "John Doe",
  "legitimacy_score": 85,
  "analysis": {
    "consistency_score": 90,
    "experience_verification": 85,
    "education_verification": 80,
    "skills_alignment": 85,
    "red_flags": [...],
    "green_flags": [...],
    "summary": "..."
  }
}`}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}