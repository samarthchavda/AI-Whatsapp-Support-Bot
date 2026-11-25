import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaEye, FaTimes, FaSave } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminBlog.css';

const PUBLIC_SITE_URL = (process.env.REACT_APP_PUBLIC_SITE_URL || 'https://kwickbot.in').replace(/\/$/, '');

const slugifyTitle = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

function SuperAdminBlog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    coverImage: '',
    tags: '',
    seoTitle: '',
    keywords: '',
    status: 'draft',
    author: 'Kwickbot Team'
  });

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/blog/admin/all');
      if (res.data?.success) {
        setPosts(res.data.data || []);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to load blog posts.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleTitleChange = (e) => {
    const titleVal = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title: titleVal,
      slug: !editingPostId && !slugManuallyEdited ? slugifyTitle(titleVal) : prev.slug
    }));
  };

  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: slugifyTitle(e.target.value) }));
  };

  const handleOpenCreate = () => {
    setEditingPostId(null);
    setSlugManuallyEdited(false);
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      coverImage: '',
      tags: '',
      seoTitle: '',
      keywords: '',
      status: 'draft',
      author: 'Kwickbot Team'
    });
    setStatusMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post) => {
    setEditingPostId(post._id);
    setSlugManuallyEdited(true);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      summary: post.summary || '',
      content: post.content || '',
      coverImage: post.coverImage || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      seoTitle: post.seoTitle || '',
      keywords: post.keywords || '',
      status: post.status || 'draft',
      author: post.author || 'Kwickbot Team'
    });
    setStatusMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage(null);

      const tagsArray = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
        ...formData,
        tags: tagsArray
      };

      const res = editingPostId
        ? await api.put(`/blog/${editingPostId}`, payload)
        : await api.post('/blog', payload);

      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: editingPostId ? 'Article updated.' : 'Article created.'
        });
        setIsModalOpen(false);
        await fetchPosts();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save article.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleStatus = async (post) => {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      setStatusMessage(null);
      const res = await api.put(`/blog/${post._id}`, { status: nextStatus });
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: nextStatus === 'published' ? 'Article published.' : 'Article moved to draft.'
        });
        await fetchPosts();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update status.'
      });
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this article? This action cannot be undone.')) {
      return;
    }
    try {
      setStatusMessage(null);
      const res = await api.delete(`/blog/${postId}`);
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: 'Article deleted.'
        });
        await fetchPosts();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete article.'
      });
    }
  };

  const counts = useMemo(() => {
    const published = posts.filter((p) => p.status === 'published').length;
    return {
      all: posts.length,
      published,
      draft: posts.length - published
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return posts.filter((post) => {
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      if (!q) return true;
      return (
        String(post.title || '').toLowerCase().includes(q) ||
        String(post.slug || '').toLowerCase().includes(q) ||
        String(post.author || '').toLowerCase().includes(q)
      );
    });
  }, [posts, filterStatus, searchQuery]);

  if (loading && posts.length === 0) {
    return (
      <div className="blogm-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="blogm-page">
      <header className="blogm-header">
        <div>
          <div className="blogm-breadcrumb">Super Admin / Blog Manager</div>
          <h1 className="blogm-title">Blog Manager</h1>
          <p className="blogm-subtitle">
            Draft, publish, and manage SEO articles for kwickbot.in.
          </p>
        </div>

        <button type="button" className="blogm-btn-primary" onClick={handleOpenCreate}>
          <FaPlus />
          Create post
        </button>
      </header>

      {statusMessage && !isModalOpen && (
        <div
          role="status"
          className={`blogm-alert ${statusMessage.type === 'error' ? 'error' : 'success'}`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="blogm-toolbar">
        <div className="blogm-tabs" role="tablist" aria-label="Filter posts by status">
          <button
            type="button"
            className={`blogm-tab${filterStatus === 'all' ? ' active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`blogm-tab${filterStatus === 'published' ? ' active' : ''}`}
            onClick={() => setFilterStatus('published')}
          >
            Published ({counts.published})
          </button>
          <button
            type="button"
            className={`blogm-tab${filterStatus === 'draft' ? ' active' : ''}`}
            onClick={() => setFilterStatus('draft')}
          >
            Drafts ({counts.draft})
          </button>
        </div>

        <input
          type="text"
          className="blogm-search"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <section className="blogm-panel">
        {filteredPosts.length === 0 ? (
          <div className="blogm-empty">
            {posts.length === 0
              ? 'No articles yet. Click Create post to write your first one.'
              : 'No articles match your current filter.'}
          </div>
        ) : (
          <div className="blogm-table-wrap">
            <table className="blogm-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post._id}>
                    <td>
                      <div className="blogm-article-title">{post.title}</div>
                      <div className="blogm-article-slug">/blog/{post.slug}</div>
                    </td>
                    <td className="blogm-author">{post.author || 'Kwickbot Team'}</td>
                    <td>
                      <button
                        type="button"
                        className="blogm-status-btn"
                        onClick={() => handleQuickToggleStatus(post)}
                        title={post.status === 'published' ? 'Click to unpublish to draft' : 'Click to publish'}
                      >
                        <span className={`blogm-dot ${post.status === 'published' ? 'published' : ''}`} />
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="blogm-date">
                      {new Date(post.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="blogm-actions">
                        <a
                          href={`${PUBLIC_SITE_URL}/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="blogm-action-btn"
                          title={`Open ${PUBLIC_SITE_URL}/blog/${post.slug}`}
                        >
                          <FaEye />
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(post)}
                          className="blogm-action-btn"
                        >
                          <FaEdit />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post._id)}
                          className="blogm-action-btn danger"
                          aria-label="Delete article"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="blogm-modal-backdrop">
          <div className="blogm-modal" role="dialog" aria-modal="true">
            <div className="blogm-modal-head">
              <h2 className="blogm-modal-title">
                {editingPostId ? 'Edit article' : 'Create article'}
              </h2>
              <button
                type="button"
                className="blogm-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="blogm-form" autoComplete="off">
              {statusMessage && (
                <div
                  role="status"
                  className={`blogm-alert ${statusMessage.type === 'error' ? 'error' : 'success'}`}
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="blogm-grid-2">
                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-title">
                    Title
                  </label>
                  <input
                    id="blog-title"
                    type="text"
                    required
                    className="blogm-input"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Enter article title"
                  />
                </div>

                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-slug">
                    URL slug
                  </label>
                  <input
                    id="blog-slug"
                    type="text"
                    required
                    className="blogm-input"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    placeholder="how-to-sync-whatsapp"
                  />
                </div>
              </div>

              <div className="blogm-field">
                <label className="blogm-label" htmlFor="blog-summary">
                  Summary (listing &amp; meta description)
                </label>
                <input
                  id="blog-summary"
                  type="text"
                  required
                  className="blogm-input"
                  value={formData.summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="1-2 sentence overview shown on blog cards and search snippets"
                />
              </div>

              <div className="blogm-field">
                <label className="blogm-label" htmlFor="blog-content">
                  Body content (HTML or Markdown)
                </label>
                <textarea
                  id="blog-content"
                  required
                  rows={10}
                  className="blogm-textarea"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write article content here..."
                />
              </div>

              <div className="blogm-grid-2">
                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-cover">
                    Cover image URL
                  </label>
                  <input
                    id="blog-cover"
                    type="text"
                    className="blogm-input"
                    value={formData.coverImage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://... or /uploads/blog/..."
                  />
                </div>

                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-tags">
                    Tags (comma separated)
                  </label>
                  <input
                    id="blog-tags"
                    type="text"
                    className="blogm-input"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="WhatsApp, Shopify, Automation"
                  />
                </div>
              </div>

              <div className="blogm-seo-section">
                <h3 className="blogm-seo-heading">SEO metadata</h3>
                <div className="blogm-grid-2">
                  <div className="blogm-field">
                    <label className="blogm-label" htmlFor="blog-seo-title">
                      Custom SEO title (optional)
                    </label>
                    <input
                      id="blog-seo-title"
                      type="text"
                      className="blogm-input"
                      value={formData.seoTitle}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                      placeholder="Leave blank to use article title"
                    />
                  </div>

                  <div className="blogm-field">
                    <label className="blogm-label" htmlFor="blog-seo-keywords">
                      SEO meta keywords (comma separated)
                    </label>
                    <input
                      id="blog-seo-keywords"
                      type="text"
                      className="blogm-input"
                      value={formData.keywords}
                      onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                      placeholder="WhatsApp AI bot, ecommerce automation"
                    />
                  </div>
                </div>
              </div>

              <div className="blogm-grid-2">
                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-status">
                    Status
                  </label>
                  <select
                    id="blog-status"
                    className="blogm-input"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="blogm-field">
                  <label className="blogm-label" htmlFor="blog-author">
                    Author
                  </label>
                  <input
                    id="blog-author"
                    type="text"
                    className="blogm-input"
                    value={formData.author}
                    onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                  />
                </div>
              </div>

              <div className="blogm-modal-foot">
                <button
                  type="button"
                  className="blogm-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="blogm-btn-primary" disabled={saving}>
                  <FaSave />
                  {saving ? 'Saving...' : 'Save post'}
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
