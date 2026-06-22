import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaCalendarAlt, FaUser, FaTag, FaBlog } from 'react-icons/fa';
import './AboutPage.css'; // Reuse nav/landing page styles

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

const BlogImage = ({ src, alt, height = '200px' }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b 0%, #09090b 100%)', color: '#6366f1' }}>
        <FaBlog size={height === '400px' ? 80 : 48} style={{ opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
    />
  );
};

function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get(`${API_BASE}/blog/post/${slug}`);
        if (res.data.success) {
          setPost(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching blog article:', err);
        setError(err.response?.data?.error || 'Article not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  // Clean formatting for body content
  const formatBodyContent = (text) => {
    if (!text) return '';
    // If the content doesn't look like HTML (doesn't contain tag structures), replace newlines with paragraphs
    if (!text.includes('<p>') && !text.includes('</h3>') && !text.includes('</div>')) {
      return text
        .split('\n\n')
        .map(p => `<p style="margin-bottom: 1.5em; line-height: 1.8; color: #d4d4d8;">${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
    }
    // Return HTML directly but style some elements dynamically
    return text
      .replace(/<p>/g, '<p style="margin-bottom: 1.5em; line-height: 1.8; color: #d4d4d8;">')
      .replace(/<h3>/g, '<h3 style="font-size: 1.5rem; font-weight: 700; color: #fafafa; margin-top: 1.8em; margin-bottom: 0.8em;">')
      .replace(/<h4>/g, '<h4 style="font-size: 1.25rem; font-weight: 600; color: #f4f4f5; margin-top: 1.5em; margin-bottom: 0.6em;">')
      .replace(/<ul>/g, '<ul style="margin-bottom: 1.5em; padding-left: 20px; list-style-type: disc; color: #d4d4d8;">')
      .replace(/<ol>/g, '<ol style="margin-bottom: 1.5em; padding-left: 20px; list-style-type: decimal; color: #d4d4d8;">')
      .replace(/<li>/g, '<li style="margin-bottom: 0.5em; line-height: 1.7;">');
  };

  return (
    <div className="about-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav className="about-nav">
        <div className="about-nav-inner">
          <button className="about-logo" onClick={() => navigate('/')} aria-label="Kwickbot home">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '38px', height: '38px' }} />
            <span>Kwickbot</span>
          </button>

          <div className="about-nav-links" aria-label="Primary navigation">
            <button onClick={() => navigate('/')}>Home</button>
            <button onClick={() => navigate('/about')}>About Us</button>
            <button onClick={() => navigate('/services')}>Services</button>
            <button className="active" onClick={() => navigate('/blog')}>Blog</button>
          </div>

          <div className="about-nav-actions">
            <button className="about-link-button" onClick={() => navigate('/login')}>Sign in</button>
            <button className="about-primary-button small" onClick={() => navigate('/book-demo')}>
              Book demo
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="about-container" style={{ flex: 1, padding: '40px 20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <button 
          onClick={() => navigate('/blog')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#a1a1aa', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            fontWeight: '600',
            marginBottom: '28px',
            padding: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#6366f1'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
        >
          <FaArrowLeft /> Back to Blog
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444' }}>
            <FaBlog size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: '700' }}>Article Not Found</p>
            <p style={{ fontSize: '14px', color: '#71717a', marginTop: '4px' }}>{error}</p>
          </div>
        ) : !post ? null : (
          <article style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Metadata */}
            <header style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '4px' }}>
                      <FaTag size={9} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fafafa', lineHeight: '1.25', margin: '4px 0 8px' }}>
                {post.title}
              </h1>

              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#a1a1aa', borderBottom: '1px solid rgba(63, 63, 70, 0.3)', paddingBottom: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaUser style={{ color: '#6366f1' }} /> Written by {post.author}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaCalendarAlt style={{ color: '#6366f1' }} /> {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <div style={{ width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden', background: '#18181b', border: '1px solid rgba(63, 63, 70, 0.3)' }}>
                <BlogImage src={post.coverImage} alt={post.title} height="400px" />
              </div>
            )}

            {/* Summary Block */}
            <div style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderLeft: '4px solid #6366f1', borderRadius: '0 8px 8px 0', fontSize: '16px', color: '#e4e4e7', fontStyle: 'italic', lineHeight: '1.6' }}>
              {post.summary}
            </div>

            {/* Content Body */}
            <div 
              style={{ fontSize: '16px', color: '#d4d4d8', lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: formatBodyContent(post.content) }}
            />
          </article>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(63, 63, 70, 0.3)', padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px', marginTop: 'auto' }}>
        <div style={{ marginBottom: '10px' }}>
          <a href="mailto:kwickbotai@gmail.com" style={{ color: 'inherit', textDecoration: 'none', marginRight: '16px' }}>📧 kwickbotai@gmail.com</a>
          <a href="tel:+918128420287" style={{ color: 'inherit', textDecoration: 'none' }}>📞 +91 8128420287</a>
        </div>
        &copy; {new Date().getFullYear()} Kwickbot. All rights reserved.
      </footer>
    </div>
  );
}

export default BlogPost;
