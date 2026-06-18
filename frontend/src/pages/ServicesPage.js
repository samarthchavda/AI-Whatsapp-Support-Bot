import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCommentDots, FaArrowRight, FaBrain, FaPlug, FaCog, FaChartLine, FaRobot, FaHeadset, FaFileAlt } from 'react-icons/fa';
import './ServicesPage.css';

const servicesList = [
  {
    icon: <FaBrain />,
    title: 'Gemini AI Fine-Tuning & Knowledge Base Setups',
    description: 'We ingest your store FAQ sheets, return policies, shipping thresholds, and product catalog into a secure knowledge base so the AI answers perfectly in your brand voice.'
  },
  {
    icon: <FaPlug />,
    title: 'WhatsApp Business API & Account Verification',
    description: 'Avoid session drops. We assist with Meta developer configuration, sandbox setup, official phone number verification, and system approvals.'
  },
  {
    icon: <FaCog />,
    title: 'Shopify, WooCommerce, & Custom API Syncs',
    description: 'We link your real-time e-commerce order feeds. Customers can query shipping status, cancel pending orders, initiate returns, and request refunds autonomously on WhatsApp.'
  },
  {
    icon: <FaHeadset />,
    title: 'Smart Agent Takeover & Escalation Rules',
    description: 'Configure custom human handoff guidelines. Set sentiment triggers (angry words, refund requests) that automatically pause the bot, flag the chat, and alert human agents.'
  },
  {
    icon: <FaFileAlt />,
    title: 'Official WhatsApp Template Message Setup',
    description: 'Design and verify utility/marketing templates with Meta. Launch bulk notification broadcasts, payment reminders, and tracking messages safely.'
  },
  {
    icon: <FaChartLine />,
    title: 'Conversational Resolution Rate Audits',
    description: 'We review your conversation logs and sentiment reports, optimizing AI prompts, adjusting rules, and updating policies to push resolution rates beyond 85%.'
  }
];

function ServicesPage() {
  const navigate = useNavigate();

  return (
    <div className="services-page">
      {/* Navigation */}
      <nav className="services-nav">
        <div className="services-nav-inner">
          <button className="services-logo" onClick={() => navigate('/')} aria-label="Kwickbot home">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '38px', height: '38px' }} />
            <span>Kwickbot</span>
          </button>

          <div className="services-nav-links" aria-label="Primary navigation">
            <button onClick={() => navigate('/')}>Home</button>
            <button onClick={() => navigate('/about')}>About Us</button>
            <button className="active" onClick={() => navigate('/services')}>Services</button>
          </div>

          <div className="services-nav-actions">
            <button className="services-link-button" onClick={() => navigate('/login')}>Sign in</button>
            <button className="services-primary-button small" onClick={() => navigate('/book-demo')}>
              Book demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="services-container">
        <section className="services-hero">
          <div className="services-hero-badge">
            <FaRobot /> SERVICES
          </div>
          <h1>End-to-End Automation Services</h1>
          <p className="services-hero-lead">
            We handle everything from Meta WhatsApp setup and database synchronization to AI instruction training and escalation tuning. Let us build a reliable, automated support engine for your store.
          </p>
        </section>

        {/* Services List Grid */}
        <section className="services-grid">
          {servicesList.map((service, index) => (
            <div className="service-card" key={index}>
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </section>

        {/* Custom Integration Notice Banner */}
        <section className="custom-integration-banner">
          <div className="banner-text">
            <h2>Need a custom ERP/CRM sync?</h2>
            <p>We build customized webhook pipelines and API integrations for custom-built cart systems, Salesforce, HubSpot, and regional shipping providers.</p>
          </div>
          <button className="services-primary-button" onClick={() => navigate('/book-demo')}>
            Talk to Developers <FaArrowRight />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="services-footer">
        <div className="footer-brand">
          <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
          <span>Kwickbot</span>
        </div>
        <p>WhatsApp support automation for real commerce operations.</p>
        <button onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
      </footer>
    </div>
  );
}

export default ServicesPage;
