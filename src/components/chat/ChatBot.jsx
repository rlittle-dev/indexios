import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ChatBot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const isPaidUser = user?.subscription_tier && user.subscription_tier !== 'free';
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: isPaidUser 
        ? 'Hi! I\'m the Indexios support assistant. As a valued member, you have access to priority support and can ask detailed questions about your account and scans. How can I help you today?'
        : 'Hi! I\'m the Indexios support assistant. I can help you with questions about how our platform works and how to contact support. How can I help you today?',
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user'
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = isPaidUser
        ? `You are a priority support assistant for Indexios, a resume verification platform. This is a PAID MEMBER with ${user?.subscription_tier} plan.

You can answer questions about:
- Resume scanning and legitimacy scoring (0-100 based on consistency, experience, education, skills)
- Analysis categories: Consistency Score, Experience Verification, Education Verification, Skills Alignment
- Red flags and green flags detection
- Next steps recommendations and interview question generation
- Saved candidates and folder organization
- Team collaboration features (up to 5 members for Enterprise)
- API access and integration (Professional+ tier)
- Subscription plans and features
- Account management, device management, and settings
- How to use the platform effectively
- Best practices for candidate evaluation
- Contact support for billing or complex issues

IMPORTANT RULES:
- Do NOT provide any information about the database, backend, API details, internal workings, or sensitive information
- Do NOT make up information - if you don't know something, say so and suggest contacting support
- Keep responses concise (2-3 sentences max)
- For paid members, provide detailed explanations and advanced guidance
- Be friendly and professional
- Mention priority support availability when relevant

User question: ${input}`
        : `You are a helpful support assistant for Indexios, a resume verification platform. This is a FREE user.

You can only answer questions about:
- How resume scanning works (legitimacy score, red/green flags)
- Basic analysis features available on free tier
- Subscription plans and what each tier offers
- How to upgrade to paid plans
- General platform usage
- How to contact support

IMPORTANT RULES:
- Do NOT provide any information about the database, backend, API details, internal workings, or sensitive information
- Do NOT make up information - if you don't know something, say so and suggest contacting support
- Keep responses concise (2-3 sentences max)
- Be friendly and professional
- For advanced features or complex issues, encourage upgrading or contacting support

User question: ${input}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt
      });

      const botMessage = {
        id: messages.length + 2,
        text: response,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: 'Sorry, I encountered an error. Please try again or contact support at support@indexios.com',
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[70] bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[70] w-96 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-96 max-h-[calc(100vh-8rem)]"
          >
            {/* Header */}
            <div className={`${isPaidUser ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-purple-600'} px-6 py-4 rounded-t-2xl`}>
              <h3 className="text-white font-semibold">Support Assistant</h3>
              <p className="text-purple-100 text-xs">
                {isPaidUser ? '⭐ Priority Support • Available 24/7' : 'Available 24/7'}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-white/80'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-white/80 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-purple-500"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}