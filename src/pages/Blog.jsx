import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const BLOG_POSTS = [
  {
    id: 1,
    title: 'The Rise of Resume Fraud: What Hiring Teams Need to Know',
    excerpt: 'Resume fraud has increased 25% since 2020. Learn how to protect your organization from fraudulent candidates and the red flags to watch for.',
    author: 'Indexios Team',
    date: '2024-01-15',
    readTime: '5 min read',
    category: 'Industry Insights',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop'
  },
  {
    id: 2,
    title: 'How Blockchain is Revolutionizing Employment Verification',
    excerpt: 'Discover how blockchain technology creates tamper-proof employment records and why this matters for the future of hiring.',
    author: 'Indexios Team',
    date: '2024-01-10',
    readTime: '7 min read',
    category: 'Technology',
    image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&auto=format&fit=crop'
  },
  {
    id: 3,
    title: '10 Interview Questions to Verify Resume Claims',
    excerpt: 'Practical questions you can ask to verify the achievements and experience candidates claim on their resumes.',
    author: 'Indexios Team',
    date: '2024-01-05',
    readTime: '4 min read',
    category: 'Best Practices',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop'
  },
  {
    id: 4,
    title: 'Understanding Legitimacy Scores: A Complete Guide',
    excerpt: 'Learn what goes into our legitimacy scoring algorithm and how to interpret results for better hiring decisions.',
    author: 'Indexios Team',
    date: '2023-12-28',
    readTime: '6 min read',
    category: 'Product',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop'
  },
  {
    id: 5,
    title: 'The Cost of a Bad Hire: Why Verification Matters',
    excerpt: 'A bad hire can cost 30% of their annual salary. See how proper verification reduces this risk and improves hiring outcomes.',
    author: 'Indexios Team',
    date: '2023-12-20',
    readTime: '5 min read',
    category: 'Industry Insights',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop'
  },
  {
    id: 6,
    title: 'GDPR and Resume Verification: Staying Compliant',
    excerpt: 'Navigate the complexities of GDPR compliance when verifying candidate information across international borders.',
    author: 'Indexios Team',
    date: '2023-12-15',
    readTime: '8 min read',
    category: 'Compliance',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop'
  }
];

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog - Indexios Resume Verification Insights</title>
        <meta name="description" content="Insights on resume verification, employment background checks, hiring best practices, and industry trends from the Indexios team." />
        <link rel="canonical" href="https://indexios.me/Blog" />
      </Helmet>
      
      <section className="relative bg-[#0a0a0a] min-h-screen">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Blog</span>
            <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight mb-4">
              Insights &<span className="font-medium"> Resources</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              Stay updated on resume verification, hiring best practices, and industry trends.
            </p>
          </motion.div>

          {/* Featured Post */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-video md:aspect-auto">
                  <img 
                    src={BLOG_POSTS[0].image} 
                    alt={BLOG_POSTS[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <span className="text-purple-400 text-sm font-medium mb-3">{BLOG_POSTS[0].category}</span>
                  <h2 className="text-2xl md:text-3xl font-medium text-white mb-4 group-hover:text-purple-400 transition-colors">
                    {BLOG_POSTS[0].title}
                  </h2>
                  <p className="text-white/50 mb-6">{BLOG_POSTS[0].excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {BLOG_POSTS[0].author}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {BLOG_POSTS[0].readTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Post Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.slice(1).map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <span className="text-purple-400 text-xs font-medium mb-2 block">{post.category}</span>
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-white/50 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-20 pt-16 border-t border-white/[0.06]"
          >
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
              Ready to<span className="font-medium"> get started?</span>
            </h2>
            <p className="text-white/50 mb-8">Try Indexios free and see the difference verification makes.</p>
            <Link to={createPageUrl('Scan')}>
              <Button className="group inline-flex items-center gap-2 px-7 py-5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 hover:scale-[1.02] transition-all">
                Start Free Scan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}