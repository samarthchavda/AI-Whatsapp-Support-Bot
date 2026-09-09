import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaCalendarAlt, FaUser, FaTag, FaBlog, FaArrowRight } from 'react-icons/fa';
import '../../public/About/AboutPage.css'; // Reuse nav/landing page styles

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const backendHost = API_BASE.replace(/\/api\/?$/, '');
  return `${backendHost}${cleanPath}`;
};

const BlogImage = ({ src, alt, height = '200px' }) => {
  const [error, setError] = useState(false);
  const imageUrl = getImageUrl(src);

  if (error || !imageUrl) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', color: '#1677FF' }}>
        <FaBlog size={height === '400px' ? 80 : 48} style={{ opacity: 0.6 }} />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
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

  // Clean formatting for body content matching light SaaS theme
  const formatBodyContent = (text) => {
    if (!text) return '';

    // Replace relative image URLs inside HTML content body with absolute backend URLs
    let formattedText = text.replace(/<img\s+([^>]*?)src=["'](\/uploads\/[^"']+)["']/gi, (match, prefix, src) => {
      return `<img ${prefix}src="${getImageUrl(src)}"`;
    });

    // If the content doesn't look like HTML (doesn't contain tag structures), replace newlines with paragraphs
    if (!formattedText.includes('<p>') && !formattedText.includes('</h3>') && !formattedText.includes('</div>')) {
      return formattedText
        .split('\n\n')
        .map(p => `<p style="margin-bottom: 1.5em; line-height: 1.8; color: #334155; font-size: 1.05rem;">${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
    }

    // Return HTML directly but style elements dynamically for crisp readability
    return formattedText
      .replace(/<p>/g, '<p style="margin-bottom: 1.5em; line-height: 1.8; color: #334155; font-size: 1.05rem;">')
      .replace(/<h3>/g, '<h3 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-top: 1.8em; margin-bottom: 0.8em; line-height: 1.3;">')
      .replace(/<h4>/g, '<h4 style="font-size: 1.25rem; font-weight: 700; color: #0F172A; margin-top: 1.5em; margin-bottom: 0.6em;">')
      .replace(/<ul>/g, '<ul style="margin-bottom: 1.5em; padding-left: 20px; list-style-type: disc; color: #334155; font-size: 1.05rem;">')
      .replace(/<ol>/g, '<ol style="margin-bottom: 1.5em; padding-left: 20px; list-style-type: decimal; color: #334155; font-size: 1.05rem;">')
      .replace(/<li>/g, '<li style="margin-bottom: 0.6em; line-height: 1.7;">')
      .replace(/<img\b/g, '<img style="max-width: 100%; height: auto; border-radius: 12px; margin: 1.5em 0; border: 1px solid #E2E8F0;"');
  };

  return (
    <div className="about-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Navigation */}
      <nav className="about-nav">
        <div className="about-nav-inner">
          <button className="about-logo" onClick={() => navigate('/')} aria-label="Kwickbot home">
            <img src="/logo.png" className="header-logo-img" alt="Kwickbot Logo" />
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
      <main className="about-container" style={{ flex: 1, padding: '40px 20px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
        <button 
          onClick={() => navigate('/blog')}
          style={{ 
            background: '#F8FAFC', 
            border: '1px solid #E2E8F0', 
            color: '#475569', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '13.5px', 
            fontWeight: '700',
            marginBottom: '28px',
            padding: '8px 16px',
            borderRadius: '20px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1677FF';
            e.currentTarget.style.borderColor = '#1677FF';
            e.currentTarget.style.background = '#EFF6FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.background = '#F8FAFC';
          }}
        >
          <FaArrowLeft /> Back to Blog
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626' }}>
            <FaBlog size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: '700' }}>Article Not Found</p>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{error}</p>
          </div>
        ) : !post ? null : (
          <article style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Header Metadata */}
            <header style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: '20px' }}>
                      <FaTag size={9} style={{ color: '#1677FF' }} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Title Header - Crisp dark slate text for 100% visibility */}
              <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0F172A', lineHeight: '1.25', margin: '4px 0 8px', letterSpacing: '-0.02em' }}>
                {post.title}
              </h1>

              <div style={{ display: 'flex', gap: '20px', fontSize: '13.5px', color: '#64748B', borderBottom: '1px solid #E2E8F0', paddingBottom: '18px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                  <FaUser style={{ color: '#1677FF' }} /> Written by {post.author}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                  <FaCalendarAlt style={{ color: '#1677FF' }} /> {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <div style={{ width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden', background: '#F8FAFC', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(16, 24, 40, 0.04)' }}>
                <BlogImage src={post.coverImage} alt={post.title} height="400px" />
              </div>
            )}

            {/* Summary Block */}
            <div style={{ padding: '20px 24px', background: '#EFF6FF', borderLeft: '4px solid #1677FF', borderRadius: '0 12px 12px 0', fontSize: '16px', color: '#1E293B', fontStyle: 'italic', lineHeight: '1.6', fontWeight: '500' }}>
              {post.summary}
            </div>

            {/* Content Body */}
            <div 
              style={{ fontSize: '16.5px', color: '#334155', lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: formatBodyContent(post.content) }}
            />
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="about-footer-wrapper">
        <div className="about-footer">
          <div className="footer-brand">
            <img src="/logo.png" className="footer-logo-img" alt="Kwickbot Logo" />
          </div>
          <p>WhatsApp support automation for real commerce operations.</p>
          <div className="footer-contacts" style={{ marginTop: '12px', marginBottom: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <a href="mailto:hello@kwickbot.in" style={{ color: 'inherit', textDecoration: 'none' }}>📧 hello@kwickbot.in</a>
            <a href="tel:+918128420287" style={{ color: 'inherit', textDecoration: 'none' }}>📞 +91 8128420287</a>
          </div>
          <button onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
        </div>
      </footer>
    </div>
  );
}

export default BlogPost;
