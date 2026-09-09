import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaBlog, FaArrowRight, FaCalendarAlt, FaUser, FaTag } from 'react-icons/fa';
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

function Blog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublishedPosts = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/blog`);
        if (res.data.success) {
          setPosts(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching public blog posts:', err);
        setError('Failed to load blog articles. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublishedPosts();
  }, []);

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
      <main className="about-container" style={{ flex: 1, padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section className="about-hero" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="about-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <FaBlog /> BLOG &amp; NEWS
          </div>
          <h1 style={{ marginTop: '16px', color: '#0F172A' }}>Insights, Guides &amp; Tutorials</h1>
          <p className="about-hero-lead" style={{ maxWidth: '600px', margin: '16px auto 0', color: '#64748B' }}>
            Learn how to automate your e-commerce operations, boost customer satisfaction, and leverage AI on WhatsApp.
          </p>
        </section>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626' }}>
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
            <FaBlog size={48} style={{ marginBottom: '16px', opacity: 0.4, color: '#1677FF' }} />
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>No articles published yet</p>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Check back soon! Our team is drafting fresh guides and tutorials.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
            {posts.map(post => (
              <article 
                key={post._id} 
                onClick={() => navigate(`/blog/${post.slug}`)}
                style={{ 
                  background: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(16, 24, 40, 0.05)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#1677FF';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(22, 119, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 24, 40, 0.05)';
                }}
              >
                {/* Cover Image */}
                <div style={{ height: '200px', background: '#F8FAFC', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #E2E8F0' }}>
                  <BlogImage src={post.coverImage} alt={post.title} />
                </div>

                {/* Content */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 9px', borderRadius: '20px' }}>
                          <FaTag size={9} style={{ color: '#1677FF' }} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '4px 0 0', lineHeight: '1.4' }}>
                    {post.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#475569', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.6' }}>
                    {post.summary}
                  </p>

                  {/* Footer metadata */}
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                      <FaUser style={{ color: '#1677FF' }} /> {post.author}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                      <FaCalendarAlt style={{ color: '#1677FF' }} /> {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#1677FF', marginTop: '8px' }}>
                    Read Full Article <FaArrowRight size={10} />
                  </div>
                </div>
              </article>
            ))}
          </div>
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

export default Blog;
