import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaBlog, FaArrowRight, FaCalendarAlt, FaUser, FaTag } from 'react-icons/fa';
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
      <main className="about-container" style={{ flex: 1, padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section className="about-hero" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="about-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <FaBlog /> BLOG & NEWS
          </div>
          <h1 style={{ marginTop: '16px' }}>Insights, Guides & Tutorials</h1>
          <p className="about-hero-lead" style={{ maxWidth: '600px', margin: '16px auto 0' }}>
            Learn how to automate your e-commerce operations, boost customer satisfaction, and leverage AI on WhatsApp.
          </p>
        </section>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444' }}>
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a1a1aa', background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(63, 63, 70, 0.3)', borderRadius: '16px' }}>
            <FaBlog size={48} style={{ marginBottom: '16px', opacity: 0.4, color: '#6366f1' }} />
            <p style={{ fontSize: '18px', fontWeight: '600' }}>No articles published yet</p>
            <p style={{ fontSize: '14px', color: '#71717a', marginTop: '4px' }}>Check back soon! Our team is drafting fresh guides and tutorials.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
            {posts.map(post => (
              <article 
                key={post._id} 
                onClick={() => navigate(`/blog/${post.slug}`)}
                style={{ 
                  background: 'rgba(24, 24, 27, 0.6)', 
                  border: '1px solid rgba(63, 63, 70, 0.3)', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(63, 63, 70, 0.3)';
                }}
              >
                {/* Cover Image */}
                <div style={{ height: '200px', background: '#18181b', position: 'relative', overflow: 'hidden' }}>
                  <BlogImage src={post.coverImage} alt={post.title} />
                </div>

                {/* Content */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          <FaTag size={9} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fafafa', margin: '4px 0 0', lineHeight: '1.4' }}>
                    {post.title}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.6' }}>
                    {post.summary}
                  </p>

                  {/* Footer metadata */}
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(63, 63, 70, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#71717a' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaUser /> {post.author}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaCalendarAlt /> {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#6366f1', marginTop: '8px' }}>
                    Read Full Article <FaArrowRight size={10} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(63, 63, 70, 0.3)', padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Kwickbot. All rights reserved.
      </footer>
    </div>
  );
}

export default Blog;
