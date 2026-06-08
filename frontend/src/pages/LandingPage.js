import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaWhatsapp, 
  FaRobot, 
  FaClock, 
  FaShoppingCart, 
  FaHeadset, 
  FaChartLine,
  FaCheck,
  FaStar,
  FaArrowRight,
  FaBolt,
  FaShieldAlt,
  FaGlobe
} from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <FaWhatsapp className="logo-icon" />
            <span>AI Support Bot</span>
          </div>
          <div className="nav-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
            <a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollToSection('testimonials'); }}>Testimonials</a>
            <button className="nav-btn-demo" onClick={() => navigate('/login')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <FaBolt /> Powered by Google Gemini
            </div>
            <h1 className="hero-title">
              Automate Your Customer Support on WhatsApp with AI
            </h1>
            <p className="hero-subtitle">
              Transform your customer service with intelligent AI automation. 
              Handle unlimited conversations 24/7, integrate with your e-commerce store, 
              and scale your support without hiring more agents.
            </p>
            <div className="hero-cta">
              <button className="btn-primary-hero" onClick={() => navigate('/login')}>
                Get Started <FaArrowRight />
              </button>
              <button className="btn-secondary-hero" onClick={() => scrollToSection('features')}>
                Learn More
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Availability</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">&lt;2s</div>
                <div className="stat-label">Response Time</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="chat-bubble-container">
              <div className="chat-bubble chat-bubble-1">
                <FaRobot className="bubble-icon" />
                <div className="bubble-text">
                  <div className="bubble-title">AI Assistant</div>
                  <div className="bubble-message">How can I help you today?</div>
                </div>
              </div>
              <div className="chat-bubble chat-bubble-2">
                <div className="bubble-text">
                  <div className="bubble-message">What's my order status?</div>
                </div>
              </div>
              <div className="chat-bubble chat-bubble-3">
                <FaRobot className="bubble-icon" />
                <div className="bubble-text">
                  <div className="bubble-message">Your order #12345 is out for delivery!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Solved Section */}
      <section className="problems-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Transform Your Support Operations</h2>
            <p className="section-subtitle">See the difference AI automation makes</p>
          </div>
          <div className="comparison-grid">
            <div className="comparison-card before-card">
              <div className="comparison-header">
                <div className="comparison-icon before-icon">❌</div>
                <h3>Before AI Automation</h3>
              </div>
              <ul className="comparison-list">
                <li>High support costs with multiple agents</li>
                <li>Limited to business hours only</li>
                <li>Slow response times (5-10 minutes)</li>
                <li>Inconsistent customer experience</li>
                <li>Manual order tracking and updates</li>
                <li>Overwhelmed during peak hours</li>
              </ul>
            </div>
            <div className="comparison-card after-card">
              <div className="comparison-header">
                <div className="comparison-icon after-icon">✓</div>
                <h3>With AI Support Bot</h3>
              </div>
              <ul className="comparison-list">
                <li>80% cost reduction on support</li>
                <li>24/7 availability, never miss a customer</li>
                <li>Instant responses (&lt;2 seconds)</li>
                <li>Consistent, professional interactions</li>
                <li>Automated order tracking & updates</li>
                <li>Scales infinitely with demand</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features Built for Scale</h2>
            <p className="section-subtitle">Everything you need to automate customer support</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaClock />
              </div>
              <h3 className="feature-title">24/7 AI Automation</h3>
              <p className="feature-description">
                Powered by Google Gemini, our AI handles customer inquiries instantly, 
                understands context, and provides accurate responses around the clock.
              </p>
              <ul className="feature-list">
                <li><FaCheck /> Natural language understanding</li>
                <li><FaCheck /> Multi-language support</li>
                <li><FaCheck /> Context-aware responses</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaShoppingCart />
              </div>
              <h3 className="feature-title">E-commerce Integration</h3>
              <p className="feature-description">
                Seamlessly connect with Shopify, WooCommerce, or any custom store. 
                Automatic order sync via webhooks and real-time updates.
              </p>
              <ul className="feature-list">
                <li><FaCheck /> Shopify & WooCommerce ready</li>
                <li><FaCheck /> Real-time order tracking</li>
                <li><FaCheck /> Automatic notifications</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaHeadset />
              </div>
              <h3 className="feature-title">Human-in-the-Loop</h3>
              <p className="feature-description">
                Smart escalation system detects complex issues and routes them to 
                human agents. Best of both worlds: AI efficiency + human empathy.
              </p>
              <ul className="feature-list">
                <li><FaCheck /> Intelligent escalation</li>
                <li><FaCheck /> Priority queue management</li>
                <li><FaCheck /> Seamless handoff</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3 className="feature-title">Real-time Dashboard</h3>
              <p className="feature-description">
                Monitor conversations, track orders, and analyze performance with 
                our beautiful, intuitive dashboard. Make data-driven decisions.
              </p>
              <ul className="feature-list">
                <li><FaCheck /> Live conversation monitoring</li>
                <li><FaCheck /> Performance analytics</li>
                <li><FaCheck /> Custom reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Trusted by Growing Businesses</h2>
            <p className="section-subtitle">See what our customers say</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
              </div>
              <p className="testimonial-text">
                "This AI bot reduced our support costs by 75% while improving response times. 
                Our customers love the instant replies, and we can finally scale without 
                hiring more agents."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">JD</div>
                <div className="author-info">
                  <div className="author-name">John Davis</div>
                  <div className="author-role">CEO, TechStore</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
              </div>
              <p className="testimonial-text">
                "The Shopify integration is seamless. Orders sync automatically, and customers 
                get instant tracking updates. Setup took less than 30 minutes. Absolutely worth it!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">SM</div>
                <div className="author-info">
                  <div className="author-name">Sarah Martinez</div>
                  <div className="author-role">Operations Manager, FashionHub</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-stars">
                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
              </div>
              <p className="testimonial-text">
                "The human escalation feature is brilliant. AI handles 90% of queries, and 
                complex issues are routed to our team. Customer satisfaction is up 40%!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">MK</div>
                <div className="author-info">
                  <div className="author-name">Michael Kim</div>
                  <div className="author-role">Support Lead, ElectroMart</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Choose the plan that fits your business</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-name">Starter</h3>
                <div className="pricing-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">29</span>
                  <span className="price-period">/month</span>
                </div>
                <p className="pricing-description">Ideal for small shops</p>
              </div>
              <ul className="pricing-features">
                <li><FaCheck /> 500 Messages/month</li>
                <li><FaCheck /> Basic Gemini Pro Integration</li>
                <li><FaCheck /> Standard Dashboard</li>
                <li><FaCheck /> WhatsApp Integration</li>
                <li><FaCheck /> Email Support</li>
              </ul>
              <button className="pricing-btn" onClick={() => navigate('/login')}>
                Get Started
              </button>
            </div>

            <div className="pricing-card pricing-card-featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="pricing-name">Professional</h3>
                <div className="pricing-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">79</span>
                  <span className="price-period">/month</span>
                </div>
                <p className="pricing-description">Best for growing brands</p>
              </div>
              <ul className="pricing-features">
                <li><FaCheck /> 2,500 Messages/month</li>
                <li><FaCheck /> Advanced Gemini 1.5 Flash (Speed)</li>
                <li><FaCheck /> E-commerce Sync</li>
                <li><FaCheck /> Advanced Dashboard & Analytics</li>
                <li><FaCheck /> Priority Support</li>
                <li><FaCheck /> Custom Branding</li>
                <li><FaCheck /> API Access</li>
              </ul>
              <button className="pricing-btn pricing-btn-featured" onClick={() => navigate('/login')}>
                Get Started
              </button>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-name">Enterprise</h3>
                <div className="pricing-price">
                  <span className="price-amount">Custom</span>
                </div>
                <p className="pricing-description">For large scale operations</p>
              </div>
              <ul className="pricing-features">
                <li><FaCheck /> Unlimited Messages</li>
                <li><FaCheck /> Gemini 1.5 Pro (High Intelligence)</li>
                <li><FaCheck /> Custom Webhooks</li>
                <li><FaCheck /> Dedicated Account Manager</li>
                <li><FaCheck /> White-label Solution</li>
                <li><FaCheck /> Custom AI Training</li>
                <li><FaCheck /> SLA Guarantee</li>
                <li><FaCheck /> On-premise Deployment</li>
              </ul>
              <button className="pricing-btn" onClick={() => scrollToSection('contact')}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="section-container">
          <div className="trust-grid">
            <div className="trust-item">
              <FaShieldAlt className="trust-icon" />
              <h4>Enterprise Security</h4>
              <p>Bank-level encryption and SOC 2 compliant</p>
            </div>
            <div className="trust-item">
              <FaBolt className="trust-icon" />
              <h4>99.9% Uptime</h4>
              <p>Reliable infrastructure with automatic failover</p>
            </div>
            <div className="trust-item">
              <FaGlobe className="trust-icon" />
              <h4>Global Scale</h4>
              <p>Servers in 15+ regions worldwide</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="section-container">
          <div className="final-cta-content">
            <h2 className="final-cta-title">Ready to Transform Your Customer Support?</h2>
            <p className="final-cta-subtitle">
              Join hundreds of businesses automating their WhatsApp support with AI. 
              Get started in minutes, no credit card required.
            </p>
            <div className="final-cta-buttons">
              <button className="btn-primary-hero" onClick={() => navigate('/login')}>
                Get Started <FaArrowRight />
              </button>
              <button className="btn-secondary-hero" onClick={() => scrollToSection('pricing')}>
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-column">
              <div className="footer-logo">
                <FaWhatsapp />
                <span>AI Support Bot</span>
              </div>
              <p className="footer-description">
                Automate your customer support on WhatsApp with intelligent AI. 
                Scale your business without scaling your team.
              </p>
            </div>
            <div className="footer-column">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><a onClick={() => scrollToSection('features')}>Features</a></li>
                <li><a onClick={() => scrollToSection('pricing')}>Pricing</a></li>
                <li><a onClick={() => navigate('/dashboard')}>Dashboard</a></li>
                <li><a href="#">API Docs</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4 className="footer-title">Legal</h4>
              <ul className="footer-links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 AI WhatsApp Support Bot. All rights reserved.</p>
            <div className="footer-social">
              <a href="#" aria-label="Twitter">𝕏</a>
              <a href="#" aria-label="LinkedIn">in</a>
              <a href="#" aria-label="GitHub">⚡</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
