import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, User, Plus, X, Edit, Trash2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Blog() {
  const [user, setUser] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '', category: '', image_url: '', read_time: '5 min read' });
  const [selectedPost, setSelectedPost] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) setUser(await base44.auth.me());
    };
    checkAuth();
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.filter({ published: true }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BlogPost.create({ ...data, published: true, slug: data.title.toLowerCase().replace(/\s+/g, '-') }),
    onSuccess: () => { queryClient.invalidateQueries(['blogPosts']); setShowEditor(false); resetForm(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BlogPost.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['blogPosts']); setShowEditor(false); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['blogPosts'])
  });

  const resetForm = () => {
    setFormData({ title: '', excerpt: '', content: '', category: '', image_url: '', read_time: '5 min read' });
    setEditingPost(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({ title: post.title, excerpt: post.excerpt || '', content: post.content, category: post.category || '', image_url: post.image_url || '', read_time: post.read_time || '5 min read' });
    setShowEditor(true);
  };

  const isAdmin = user?.role === 'admin';

  // Single post view
  if (selectedPost) {
    return (
      <>
        <Helmet>
          <title>{selectedPost.title} - Indexios Blog</title>
          <meta name="description" content={selectedPost.excerpt || selectedPost.title} />
        </Helmet>
        
        <section className="relative bg-[#0a0a0a] min-h-screen">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[150px]" />
          </div>

          <div className="relative z-10 max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 py-20">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedPost(null)} 
              className="mb-8 text-white/60 hover:text-white hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Button>

            {selectedPost.image_url && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aspect-video rounded-2xl overflow-hidden mb-8">
                <img src={selectedPost.image_url} alt={selectedPost.title} className="w-full h-full object-cover" />
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {selectedPost.category && (
                <span className="text-purple-400 text-sm font-medium mb-4 block">{selectedPost.category}</span>
              )}
              <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">{selectedPost.title}</h1>
              <div className="flex items-center gap-4 text-sm text-white/40 mb-8 pb-8 border-b border-white/[0.06]">
                {selectedPost.read_time && <span>{selectedPost.read_time}</span>}
                <span>•</span>
                <span>{new Date(selectedPost.created_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </motion.div>

            <motion.article 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="text-white/80 leading-relaxed space-y-4 [&_h1]:text-3xl [&_h1]:font-medium [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-white/70 [&_p]:leading-relaxed [&_p]:mb-4 [&_a]:text-purple-400 [&_a]:underline [&_strong]:text-white [&_strong]:font-semibold [&_code]:text-purple-300 [&_code]:bg-purple-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-white/[0.05] [&_pre]:border [&_pre]:border-white/10 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-purple-500 [&_blockquote]:pl-4 [&_blockquote]:text-white/60 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:text-white/70 [&_hr]:border-white/10 [&_hr]:my-8"
            >
              <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
            </motion.article>

            {isAdmin && (
              <div className="flex gap-3 mt-12 pt-8 border-t border-white/[0.06]">
                <Button variant="outline" onClick={() => { handleEdit(selectedPost); setSelectedPost(null); }} className="border-white/20 text-white hover:bg-white/5">
                  <Edit className="w-4 h-4 mr-2" /> Edit Post
                </Button>
                <Button variant="outline" onClick={() => { deleteMutation.mutate(selectedPost.id); setSelectedPost(null); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Blog - Indexios Resume Verification Insights</title>
        <meta name="description" content="Insights on resume verification, employment background checks, hiring best practices, and industry trends." />
        <link rel="canonical" href="https://indexios.me/Blog" />
      </Helmet>
      
      <section className="relative bg-[#0a0a0a] min-h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-20">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <span className="text-purple-400/80 text-sm font-medium uppercase tracking-widest mb-4 block">Blog</span>
            <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight mb-4">Insights &<span className="font-medium"> Updates</span></h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">Stay updated on resume verification, hiring best practices, and industry trends.</p>
            
            {isAdmin && (
              <Button onClick={() => { resetForm(); setShowEditor(true); }} className="mt-6 bg-purple-600 hover:bg-purple-500 text-white rounded-full">
                <Plus className="w-4 h-4 mr-2" /> New Post
              </Button>
            )}
          </motion.div>

          {/* Editor Modal */}
          {showEditor && isAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#141419] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-xl font-medium text-white">{editingPost ? 'Edit Post' : 'New Post'}</h2>
                  <Button variant="ghost" size="icon" onClick={() => { setShowEditor(false); resetForm(); }} className="text-white/60 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Title</label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Excerpt</label>
                    <Input value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Category</label>
                      <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Read Time</label>
                      <Input value={formData.read_time} onChange={(e) => setFormData({ ...formData, read_time: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Image URL</label>
                    <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Content (Markdown)</label>
                    <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={10} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setShowEditor(false); resetForm(); }} className="flex-1 border-white/20 text-white hover:bg-white/5">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-white text-black hover:bg-white/90">{editingPost ? 'Update' : 'Publish'}</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Posts Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/50 text-lg">No blog posts yet.</p>
              {isAdmin && <p className="text-white/30 text-sm mt-2">Click "New Post" to create the first one.</p>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.article 
                  key={post.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.05 }} 
                  className="group rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  {post.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-6">
                    {post.category && <span className="text-purple-400 text-xs font-medium mb-2 block">{post.category}</span>}
                    <h3 className="text-lg font-medium text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">{post.title}</h3>
                    {post.excerpt && <p className="text-white/50 text-sm mb-4 line-clamp-2">{post.excerpt}</p>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {post.read_time && <span>{post.read_time}</span>}
                        <span>•</span>
                        <span>{new Date(post.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)} className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-20 pt-16 border-t border-white/[0.06]">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">Ready to<span className="font-medium"> get started?</span></h2>
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