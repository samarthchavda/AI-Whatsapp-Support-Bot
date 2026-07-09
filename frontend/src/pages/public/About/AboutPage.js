import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCommentDots, FaArrowRight, FaBrain, FaUsers, FaShieldAlt, FaRocket, FaChartBar, FaSmile } from 'react-icons/fa';
import './AboutPage.css';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      {/* Navigation */}
      <nav className="about-nav">
        <div className="about-nav-inner">
          <button className="about-logo" onClick={() => navigate('/')} aria-label="Kwickbot home">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '38px', height: '38px' }} />
            <span>Kwickbot</span>
          </button>

          <div className="about-nav-links" aria-label="Primary navigation">
            <button onClick={() => navigate('/')}>Home</button>
            <button className="active" onClick={() => navigate('/about')}>About Us</button>
            <button onClick={() => navigate('/services')}>Services</button>
          </div>

          <div className="about-nav-actions">
            <button className="about-link-button" onClick={() => navigate('/login')}>Sign in</button>
            <button className="about-primary-button small" onClick={() => navigate('/book-demo')}>
              Book demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="about-container">
        <section className="about-hero">
          <div className="about-hero-badge">
            <FaRocket /> ABOUT US
          </div>
          <h1>Empowering Commerce with Agentic Support</h1>
          <p className="about-hero-lead">
            We are building the future of automated customer operations. Our mission is to provide start-up speed and enterprise reliability to online brands through 24/7 intelligent WhatsApp support.
          </p>
        </section>

        {/* Stats Section */}
        <section className="about-stats-grid">
          <div className="about-stat-card">
            <FaBrain className="stat-icon" />
            <h3>82%+</h3>
            <p>Automated FAQ Resolution</p>
          </div>
          <div className="about-stat-card">
            <FaChartBar className="stat-icon" />
            <h3>10x</h3>
            <p>Faster Support Response</p>
          </div>
          <div className="about-stat-card">
            <FaSmile className="stat-icon" />
            <h3>95%</h3>
            <p>Customer Satisfaction Score</p>
          </div>
          <div className="about-stat-card">
            <FaUsers className="stat-icon" />
            <h3>24/7</h3>
            <p>Active Support Coverage</p>
          </div>
        </section>

        {/* Mission and Story */}
        <section className="about-mission-section">
          <div className="mission-content">
            <h2>Our Vision</h2>
            <p>
              E-commerce support is broken. Customers demand immediate answers to tracking, refund, and product questions, while support staff are overwhelmed by repetitive inquiries. 
            </p>
            <p>
              Our platform bridges this gap. By utilizing advanced Gemini AI models integrated directly with store inventory databases and shipping APIs, we resolve up to 82% of routine queries on WhatsApp instantly. This gives human support agents the leverage they need to focus on high-value escalations, VIP customers, and complex problem solving.
            </p>
          </div>

          <div className="values-list">
            <h2>Core Values</h2>
            
            <div className="value-item">
              <div className="value-icon"><FaShieldAlt /></div>
              <div>
                <h3>Safety & Privacy First</h3>
                <p>We respect customer privacy. Conversations are secured, and customer credentials are never exposed.</p>
              </div>
            </div>

            <div className="value-item">
              <div className="value-icon"><FaBrain /></div>
              <div>
                <h3>Contextual Intelligence</h3>
                <p>No generic replies. The AI knows order history, return policies, and stock availability to provide accurate info.</p>
              </div>
            </div>

            <div className="value-item">
              <div className="value-icon"><FaUsers /></div>
              <div>
                <h3>Human Agency</h3>
                <p>AI is an assistant, not a replacement. We enable instant human handoff with full logs whenever requested.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section className="about-cta-card">
          <h2>Ready to automate your support?</h2>
          <p>Get started in minutes. Connect your WhatsApp line, feed your policies, and watch the AI resolve customer tickets in real-time.</p>
          <div className="cta-actions">
            <button className="about-primary-button" onClick={() => navigate('/book-demo')}>
              Book a Strategy Call <FaArrowRight />
            </button>
            <button className="about-secondary-button" onClick={() => navigate('/login')}>
              Go to Dashboard
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="about-footer">
        <div className="footer-brand">
          <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
          <span>Kwickbot</span>
        </div>
        <p>WhatsApp support automation for real commerce operations.</p>
        <div className="footer-contacts" style={{ marginTop: '12px', marginBottom: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <a href="mailto:kwickbotai@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>📧 kwickbotai@gmail.com</a>
          <a href="tel:+918128420287" style={{ color: 'inherit', textDecoration: 'none' }}>📞 +91 8128420287</a>
        </div>
        <button onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
      </footer>
    </div>
  );
}

export default AboutPage;
