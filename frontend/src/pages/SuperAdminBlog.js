import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBlog, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaTimes, 
  FaSave
} from 'react-icons/fa';
import api from '../services/api';
import './SuperAdmin.css';

function SuperAdminBlog() {
  const navigate = useNavigate();
  const storedAdmin = localStorage.getItem('admin');
  const admin = storedAdmin ? JSON.parse(storedAdmin) : null;

  // Protect route
  useEffect(() => {
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [admin, navigate]);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    coverImage: '',
    tags: '',
    status: 'draft',
    author: 'Kwickbot Team'
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/blog/admin/all');
      if (res.data.success) {
        setPosts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin blog posts:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch blog posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleTitleChange = (e) => {
    const titleVal = e.target.value;
    // Auto-generate slug if not editing or manually changed
    const generatedSlug = titleVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
      
    setFormData(prev => ({
      ...prev,
      title: titleVal,
      slug: prev.slug === '' || generatedSlug.startsWith(prev.slug) ? generatedSlug : prev.slug
    }));
  };

  const handleOpenCreate = () => {
    setEditingPostId(null);
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      coverImage: '',
      tags: '',
      status: 'draft',
      author: 'Kwickbot Team'
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post) => {
    setEditingPostId(post._id);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      summary: post.summary || '',
      content: post.content || '',
      coverImage: post.coverImage || '',
      tags: post.tags ? post.tags.join(', ') : '',
      status: post.status || 'draft',
      author: post.author || 'Kwickbot Team'
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      setSuccessMsg('');
      
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        : [];

      const payload = {
        ...formData,
        tags: tagsArray
      };

      let response;
      if (editingPostId) {
        response = await api.put(`/blog/${editingPostId}`, payload);
      } else {
        response = await api.post('/blog', payload);
      }

      if (response.data.success) {
        setSuccessMsg(editingPostId ? 'Blog post updated successfully! 🎉' : 'Blog post created successfully! 🎉');
        setIsModalOpen(false);
        fetchPosts();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error saving blog post:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save blog post.');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.delete(`/blog/${postId}`);
      if (res.data.success) {
        setSuccessMsg('Blog post deleted successfully! 🗑️');
        fetchPosts();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error deleting blog post:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to delete blog post.');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaBlog style={{ color: '#6366f1' }} /> Blog Manager
          </h1>
          <p className="page-subtitle">Draft, publish, and manage educational articles for your website's organic SEO.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate} style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
          <FaPlus /> Create Post
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ padding: '12px 20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#fafafa', borderRadius: '8px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fafafa', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {/* Blog Posts Table */}
      <div className="super-admin-card" style={{ padding: '24px', background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(63, 63, 70, 0.3)', borderRadius: '16px', overflowX: 'auto' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
            <FaBlog size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No blog posts found. Click "Create Post" to write your first article!</p>
          </div>
        ) : (
          <table className="super-admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600' }}>Article Title</th>
                <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600' }}>Slug</th>
                <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600' }}>Author</th>
                <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px 8px', color: '#a1a1aa', fontWeight: '600' }}>Created Date</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#a1a1aa', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post._id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '16px 8px', color: '#fafafa', fontWeight: '500' }}>{post.title}</td>
                  <td style={{ padding: '16px 8px', color: '#71717a', fontSize: '13px' }}>{post.slug}</td>
                  <td style={{ padding: '16px 8px', color: '#a1a1aa' }}>{post.author}</td>
                  <td style={{ padding: '16px 8px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      background: post.status === 'published' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                      color: post.status === 'published' ? '#10b981' : '#f59e0b'
                    }}>
                      {post.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 8px', color: '#71717a', fontSize: '13px' }}>
                    {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '6px 12px', border: '1px solid #3f3f46', background: 'transparent', color: '#a1a1aa', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <FaEye /> View
                      </a>
                      <button onClick={() => handleOpenEdit(post)} className="btn-secondary" style={{ padding: '6px 12px', border: '1px solid #3f3f46', background: 'transparent', color: '#fafafa', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                        <FaEdit /> Edit
                      </button>
                      <button onClick={() => handleDelete(post._id)} className="btn-danger" style={{ padding: '6px 12px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9, 9, 11, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '800px', background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fafafa', margin: 0 }}>
                {editingPostId ? 'Edit Blog Post' : 'Create Blog Post'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '18px' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Enter article title"
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Slug (URL Path)</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. how-to-sync-whatsapp"
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Summary (Brief SEO preview card text)</label>
                <input
                  type="text"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Enter a 1-2 sentence description for listing previews..."
                  style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Body Content (Markdown or HTML supported)</label>
                <textarea
                  required
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write the full content of your article here. You can write details, features, steps, and use standard HTML tags like <p>, <h3>, <ul>, etc."
                  style={{ padding: '14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Cover Image URL</label>
                  <input
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://images.unsplash.com/photo-..."
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g. WhatsApp, Shopify, AI, Customer Support"
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a1a1aa' }}>Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    style={{ padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #27272a', paddingTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', border: '1px solid #3f3f46', background: 'transparent', color: '#fafafa', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#6366f1', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaSave /> Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminBlog;
