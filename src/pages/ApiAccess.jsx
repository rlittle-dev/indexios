import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Key, Copy, RefreshCw, Lock, ArrowLeft, CheckCircle2, Zap } from 'lucide-react';
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
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-8 text-center"
           >
             <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4 mx-auto">
               <Lock className="w-8 h-8 text-emerald-400" />
             </div>
              <h3 className="text-white text-2xl font-bold mb-2">API Access Required</h3>
              <p className="text-white/60 mb-6">
                Upgrade to Professional or Enterprise to access the API
              </p>
              <Link to={createPageUrl('Pricing')}>
                <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                  View Pricing Plans
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-green-400" />
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
                    <h3 className="text-white font-semibold mb-2">Base URL</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-green-400">
                      https://api.indexios.com/v1
                    </code>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Analyze Resume</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-green-400">
                      POST /analyze
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
                    <h3 className="text-white font-semibold mb-2">Response Example</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white whitespace-pre">
                  {`{
                  "candidate_name": "John Doe",
                  "candidate_email": "john@example.com",
                  "legitimacy_score": 78,
                  "consistency_score": 80,
                  "consistency_details": "...",
                  "experience_verification": 75,
                  "experience_details": "...",
                  "education_verification": 82,
                  "education_details": "...",
                  "skills_alignment": 72,
                  "skills_details": "...",
                  "red_flags": [
                  "Generic achievement descriptions",
                  "Minor 2-month employment gap"
                  ],
                  "green_flags": [
                  "Consistent employment at recognized companies",
                  "Relevant degree"
                  ],
                  "summary": "Generally credible candidate with room for verification"
                  }`}
                    </code>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Rate Limits</h3>
                    <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white/80 space-y-1">
                      <p>• <strong>Professional:</strong> 200 scans/month</p>
                      <p>• <strong>Enterprise:</strong> Unlimited scans</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-semibold mb-2">Error Handling</h3>
                    <code className="block bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white whitespace-pre">
                  {`401 Unauthorized - Invalid or missing API key
                  403 Forbidden - Insufficient permissions
                  400 Bad Request - Invalid file format or size
                  429 Too Many Requests - Rate limit exceeded
                  500 Server Error - Try again later`}
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