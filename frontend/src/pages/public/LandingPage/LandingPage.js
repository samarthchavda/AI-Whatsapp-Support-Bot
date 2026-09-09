import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBolt,
  FaBox,
  FaBrain,
  FaBroadcastTower,
  FaCheck,
  FaTimes,
  FaChartLine,
  FaComments,
  FaHeadset,
  FaLock,
  FaPlug,
  FaShieldAlt,
  FaWhatsapp,
  FaEnvelope,
  FaPhoneAlt,
  FaLinkedin,
  FaTwitter,
  FaPaperPlane
} from 'react-icons/fa';
import { SiWhatsapp, SiMeta, SiShopify, SiWoocommerce, SiOpenai } from 'react-icons/si';
import { getGroundedWebsiteAnswer } from '../../../services/websiteKnowledge';
import './LandingPage.css';

const metrics = [
  { value: '1.8s', label: 'median first reply' },
  { value: '82%', label: 'queries resolved by AI' },
  { value: '24/7', label: 'WhatsApp coverage' }
];



const workflows = [
  {
    icon: <FaBrain />,
    title: 'AI Customer Service Automation',
    copy: 'Train your WhatsApp chatbot on store policies, product catalogs, refund windows, and FAQs. The bot resolves queries 24/7 with human-like precision.'
  },
  {
    icon: <FaBox />,
    title: 'Automated Order & Shipping Tracking',
    copy: 'Sync live order data. Customers can inquire about tracking numbers, cancel orders, confirm Cash on Delivery (COD), or edit shipping addresses instantly.'
  },
  {
    icon: <FaHeadset />,
    title: 'Smart Helpdesk & Live Chat Takeover',
    copy: 'Automatically pause the bot and escalate complex tickets or angry customer conversations to a live human agent with full chat context.'
  },
  {
    icon: <FaBroadcastTower />,
    title: 'WhatsApp Marketing & Broadcasts',
    copy: 'Send high-converting bulk campaigns, order notifications, and cart recovery reminders. Analyze delivery rates and customer replies in real-time.'
  }
];

const platformItems = [
  'Official WhatsApp Cloud API & Web connection options',
  'One-click Shopify, WooCommerce, Magento & Custom API sync',
  'Out-of-office auto-replies and 24/7 smart coverage',
  'No-code AI training via PDF, text guides, and site URLs',
  'Real-time conversation analytics, AI logs, and escalation alerts',
  'Secure multi-agent role permissions and admin consoles'
];




const faqs = [
  {
    question: "Do I need a Meta Business Manager account to connect WhatsApp?",
    answer: "Yes, to use the official WhatsApp Cloud API, you need a Meta Business Manager account. Kwickbot provides a step-by-step setup guide with screenshots to help you create your Meta developer app and verify your business number in under 10 minutes."
  },
  {
    question: "How does Kwickbot sync with Shopify or WooCommerce?",
    answer: "Kwickbot integrates directly using secure API credentials. By subscribing to Shopify or WooCommerce webhook events (like order updates and checkout creations), Kwickbot listens to live updates and answers customer tracking and cancellation queries in real-time."
  },
  {
    question: "How does the AI handle complex questions that it isn't trained on?",
    answer: "Kwickbot is equipped with an automated human handoff mechanism. If a customer expresses high frustration, asks for a human agent, or triggers a custom escalation (like a refund request), the AI pauses itself and immediately alerts your support team in the Live Chat CRM console with the full conversation history."
  },
  {
    question: "Can we control the Google Gemini AI token budget?",
    answer: "Yes! Super Admins have complete control over platform token limits. You can specify precise monthly token quotas (e.g., 10k, 50k, 200k tokens) and pricing structures for each merchant. Once the limit is reached, the bot automatically pauses and notifies you, preventing unexpected API bills."
  }
];

function LandingPage() {
  const navigate = useNavigate();
  const [heroTab, setHeroTab] = useState('support'); // 'support' | 'escalation' | 'broadcast' | 'analytics'
  const [heroStep, setHeroStep] = useState('resolved'); // 'customer' | 'typing' | 'ai' | 'resolved'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);

  const WELCOME_MESSAGE = "Hi! I'm the Kwickbot AI assistant. I can help you understand Kwickbot's features, setup process, integrations, and pricing. What would you like to know?";

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickReplies = [
    "What is Kwickbot?",
    "How does it work?",
    "Pricing",
    "Shopify integration",
    "WooCommerce integration",
    "Book a demo"
  ];

  // Hero Preview Animation Sequence per tab
  useEffect(() => {
    if (heroTab === 'support' || heroTab === 'escalation') {
      setHeroStep('customer');
      const t1 = setTimeout(() => setHeroStep('typing'), 1000);
      const t2 = setTimeout(() => setHeroStep('ai'), 2400);
      const t3 = setTimeout(() => setHeroStep('resolved'), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [heroTab]);

  // Tab auto-rotator (every 6 seconds)
  useEffect(() => {
    const tabs = ['support', 'escalation', 'broadcast', 'analytics'];
    const interval = setInterval(() => {
      setHeroTab(prev => {
        const nextIdx = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIdx];
      });
    }, 6200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Scroll Entrance Animations Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const sendQuery = (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed || isTyping) return;

    setChatMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const groundedAnswer = getGroundedWebsiteAnswer(trimmed);
      setChatMessages(prev => [...prev, { role: 'assistant', content: groundedAnswer }]);
      setIsTyping(false);
    }, 600);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendQuery(chatInput);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <button className="landing-logo" onClick={() => scrollToSection('top')} aria-label="Kwickbot home">
            <img src="/logo.png" className="header-logo-img" alt="Kwickbot Logo" />
          </button>

          <div className="landing-nav-links" aria-label="Primary navigation">
            <button onClick={() => navigate('/services')}>Services</button>
            <button onClick={() => navigate('/about')}>About Us</button>
            <button onClick={() => navigate('/blog')}>Blog</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
          </div>

          <div className="landing-nav-actions">
            <button className="landing-link-button" onClick={() => navigate('/login')}>Sign in</button>
            <button className="landing-primary-button small" onClick={() => navigate('/book-demo')}>
              Book demo
            </button>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">
              <FaBolt />
              WhatsApp support automation for E-commerce teams
            </div>
            <h1>Kwickbot — AI WhatsApp Customer Support Bot</h1>
            <p className="landing-hero-lede">
              Automate Shopify & WooCommerce customer support, track orders, manage escalations, send marketing broadcasts, and review analytics from one secure WhatsApp operations workspace.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-primary-button" onClick={() => navigate('/book-demo')}>
                Book a demo <FaArrowRight />
              </button>
              <button className="landing-secondary-button" onClick={() => navigate('/login')}>
                Open dashboard
              </button>
            </div>
            <div className="landing-proof-row">
              {metrics.map((metric) => (
                <div className="landing-proof-item" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-product-preview-container" aria-label="Kwickbot AI WhatsApp Operations Product Preview">
            <div className="hero-product-card">
              {/* Card Header */}
              <div className="hero-card-header">
                <div className="hero-header-brand">
                  <img src="/app-icon.png" alt="Kwickbot App Icon" className="hero-brand-logo" onError={(e) => { e.target.src = '/logo.png'; }} />
                  <div className="hero-brand-text">
                    <span className="hero-brand-title">KWICKBOT AI</span>
                    <span className="hero-brand-sub">WhatsApp Operations</span>
                  </div>
                </div>
                <div className="hero-header-status">
                  <span className="status-dot pulsing"></span>
                  <span>AI Online</span>
                </div>
              </div>

              {/* Scenario Tab Bar */}
              <div className="hero-tab-bar">
                <button
                  className={`hero-tab-btn ${heroTab === 'support' ? 'active' : ''}`}
                  onClick={() => setHeroTab('support')}
                >
                  <FaComments /> AI Support
                </button>
                <button
                  className={`hero-tab-btn ${heroTab === 'escalation' ? 'active' : ''}`}
                  onClick={() => setHeroTab('escalation')}
                >
                  <FaHeadset /> Escalation
                </button>
                <button
                  className={`hero-tab-btn ${heroTab === 'broadcast' ? 'active' : ''}`}
                  onClick={() => setHeroTab('broadcast')}
                >
                  <FaBroadcastTower /> Broadcast
                </button>
                <button
                  className={`hero-tab-btn ${heroTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setHeroTab('analytics')}
                >
                  <FaChartLine /> Analytics
                </button>
              </div>

              {/* Card Content Area */}
              <div className="hero-card-body">
                {/* SCENARIO 1: AI SUPPORT & ORDER TRACKING */}
                {heroTab === 'support' && (
                  <div className="hero-scenario-view fade-in-panel">
                    <div className="chat-msg customer-msg">
                      <span className="msg-author">CUSTOMER</span>
                      <p>Where is my order #ORD-1024?</p>
                    </div>

                    {heroStep === 'typing' && (
                      <div className="chat-msg typing-msg">
                        <div className="typing-dots-hero">
                          <span></span><span></span><span></span>
                        </div>
                        <span className="typing-text-hero">Kwickbot AI is fetching order status...</span>
                      </div>
                    )}

                    {(heroStep === 'ai' || heroStep === 'resolved') && (
                      <div className="chat-msg ai-msg fade-in-slide">
                        <div className="ai-msg-header">
                          <span className="msg-author">KWICKBOT AI</span>
                          <span className="speed-tag">⚡ 1.2s reply</span>
                        </div>
                        <p>Your order #ORD-1024 is out for delivery and is expected to arrive today by 5:00 PM.</p>
                      </div>
                    )}

                    {heroStep === 'resolved' && (
                      <div className="hero-context-badge success fade-in-slide">
                        <FaCheck className="badge-icon" />
                        <span>Order #ORD-1024 • Out for Delivery • AI Resolved</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SCENARIO 2: HUMAN ESCALATION */}
                {heroTab === 'escalation' && (
                  <div className="hero-scenario-view fade-in-panel">
                    <div className="chat-msg customer-msg">
                      <span className="msg-author">CUSTOMER</span>
                      <p>I need urgent help with a damaged product.</p>
                    </div>

                    {(heroStep === 'typing' || heroStep === 'ai' || heroStep === 'resolved') && (
                      <div className="hero-alert-badge warning fade-in-slide">
                        <span>⚠️ AI DETECTED: Keyword "damaged product"</span>
                      </div>
                    )}

                    {(heroStep === 'ai' || heroStep === 'resolved') && (
                      <div className="chat-msg ai-msg fade-in-slide">
                        <div className="ai-msg-header">
                          <span className="msg-author">KWICKBOT CRM</span>
                        </div>
                        <p>I've paused the AI and connected you directly to a live support agent with full chat context.</p>
                      </div>
                    )}

                    {heroStep === 'resolved' && (
                      <div className="hero-context-badge urgent fade-in-slide">
                        <FaHeadset className="badge-icon" />
                        <span>Escalated to Live Human Agent in CRM</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SCENARIO 3: WHATSAPP BROADCAST */}
                {heroTab === 'broadcast' && (
                  <div className="hero-scenario-view fade-in-panel">
                    <div className="hero-broadcast-card">
                      <div className="broadcast-header">
                        <FaBroadcastTower className="broadcast-icon" />
                        <div>
                          <strong>WhatsApp Broadcast Campaign</strong>
                          <span>Target: 2,480 Active Customers</span>
                        </div>
                      </div>
                      <div className="broadcast-preview-bubble">
                        <p style={{ margin: 0 }}>
                          🎉 <strong>Weekend Flash Sale Launch!</strong><br />
                          Get 20% off all new arrivals today. Use code <strong>WEEKEND20</strong> on checkout.
                        </p>
                      </div>
                      <div className="hero-context-badge broadcast-badge fade-in-slide">
                        <FaCheck className="badge-icon" />
                        <span>Campaign Scheduled • 98.4% Est. Delivery</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENARIO 4: ANALYTICS */}
                {heroTab === 'analytics' && (
                  <div className="hero-scenario-view fade-in-panel">
                    <div className="hero-analytics-grid">
                      <div className="hero-analytic-card">
                        <span>AI Resolution Rate</span>
                        <strong>84%</strong>
                        <span className="analytic-sub">Automated 24/7</span>
                      </div>
                      <div className="hero-analytic-card">
                        <span>Open Conversations</span>
                        <strong>18</strong>
                        <span className="analytic-sub">Live in CRM</span>
                      </div>
                      <div className="hero-analytic-card">
                        <span>Broadcast Replies</span>
                        <strong>214</strong>
                        <span className="analytic-sub">Campaign responses</span>
                      </div>
                    </div>
                    <div className="analytics-demo-note">
                      * Illustrative Product Demo Preview
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Bar */}
              <div className="hero-card-footer">
                <span>WhatsApp Cloud API • E-commerce AI Automation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Partner Badges */}
        <section className="partner-badges-section animate-on-scroll">
          <div className="partner-badges-container">
            <div className="partner-badges-title">TRUSTED INTEGRATIONS &amp; POWERED BY</div>
            <div className="partners-grid">

              {/* WhatsApp */}
              <div className="partner-logo-item whatsapp">
                <div className="partner-icon-wrap whatsapp-bg">
                  <SiWhatsapp size={22} color="#ffffff" />
                </div>
                <div className="partner-label">
                  <span className="partner-name">WhatsApp</span>
                  <span className="partner-sub">Official Cloud API</span>
                </div>
              </div>

              {/* Meta */}
              <div className="partner-logo-item meta">
                <div className="partner-icon-wrap meta-bg">
                  <SiMeta size={22} color="#ffffff" />
                </div>
                <div className="partner-label">
                  <span className="partner-name">Meta</span>
                  <span className="partner-sub">Business Partner</span>
                </div>
              </div>

              {/* Shopify */}
              <div className="partner-logo-item shopify">
                <div className="partner-icon-wrap shopify-bg">
                  <SiShopify size={22} color="#ffffff" />
                </div>
                <div className="partner-label">
                  <span className="partner-name">Shopify</span>
                  <span className="partner-sub">Native Sync</span>
                </div>
              </div>

              {/* WooCommerce */}
              <div className="partner-logo-item woocommerce">
                <div className="partner-icon-wrap woo-bg">
                  <SiWoocommerce size={22} color="#ffffff" />
                </div>
                <div className="partner-label">
                  <span className="partner-name">WooCommerce</span>
                  <span className="partner-sub">Connected</span>
                </div>
              </div>

              {/* OpenAI */}
              <div className="partner-logo-item openai">
                <div className="partner-icon-wrap openai-bg">
                  <SiOpenai size={22} color="#ffffff" />
                </div>
                <div className="partner-label">
                  <span className="partner-name">OpenAI</span>
                  <span className="partner-sub">AI Powered</span>
                </div>
              </div>


            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-it-works-section animate-on-scroll">
          <div className="section-heading centered">
            <span>Operational Flow</span>
            <h2>How It Works</h2>
            <p>From Meta API connection to automatic resolution and human takeover control.</p>
          </div>

          <div className="how-it-works-grid-v2">
            <div className="how-it-works-card-v2">
              <div className="step-badge-v2">Step 1</div>
              <div className="step-icon-v2">🔌</div>
              <h3 style={{ marginTop: '10px' }}>Connect Your Store</h3>
              <p>Link your Shopify or WooCommerce store along with your WhatsApp Business Number in under 5 minutes.</p>
              <div className="step-tags-v2">
                <span>Shopify</span>
                <span>WooCommerce</span>
                <span>Meta API</span>
              </div>
            </div>
            
            <div className="how-it-works-card-v2">
              <div className="step-badge-v2">Step 2</div>
              <div className="step-icon-v2">🧠</div>
              <h3 style={{ marginTop: '10px' }}>Train the AI Bot</h3>
              <p>Upload your store FAQs, refund/shipping policies, or PDFs. The AI learns your business details instantly.</p>
              <div className="step-tags-v2">
                <span>PDF Upload</span>
                <span>Store Policies</span>
                <span>Custom FAQs</span>
              </div>
            </div>

            <div className="how-it-works-card-v2">
              <div className="step-badge-v2">Step 3</div>
              <div className="step-icon-v2">⚡</div>
              <h3 style={{ marginTop: '10px' }}>Automate Support</h3>
              <p>Your AI Bot instantly replies to customers, tracks order statuses, and hands over complex chats to live agents.</p>
              <div className="step-tags-v2">
                <span>24/7 Auto-Reply</span>
                <span>Order Tracking</span>
                <span>Human Handoff</span>
              </div>
            </div>
          </div>

          {/* Three Trust Badges Below */}
          <div className="journey-trust-badges">
            <div className="trust-badge">
              <FaCheck className="badge-check-icon" />
              <span>Setup in under 5 minutes</span>
            </div>
            <div className="trust-badge">
              <FaCheck className="badge-check-icon" />
              <span>No coding required</span>
            </div>
            <div className="trust-badge">
              <FaCheck className="badge-check-icon" />
              <span>Official WhatsApp Cloud API</span>
            </div>
          </div>
        </section>

        <section id="workflows" className="landing-section animate-on-scroll">
          <div className="section-heading">
            <span>Core workflows</span>
            <h2>Built for the daily work of support teams</h2>
            <p>Less decoration, more operating leverage: every screen maps to a real task inside a WhatsApp support business.</p>
          </div>

          <div className="workflow-grid">
            {workflows.map((workflow) => (
              <article className="workflow-card" key={workflow.title}>
                <div className="workflow-icon">{workflow.icon}</div>
                <h3>{workflow.title}</h3>
                <p>{workflow.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="platform-section animate-on-scroll">
          <div className="platform-copy">
            <span>No-Code Platform Depth</span>
            <h2>No-Code WhatsApp Chatbot Builder with Startup-Grade Power</h2>
            <p>
              Deploy a complete customer service automation engine. Kwickbot features a fully-integrated backend supporting multi-tenant admin consoles, secure WhatsApp connections, instant order tracking sync, and marketing broadcast workflows.
            </p>
            <button className="landing-secondary-button" onClick={() => navigate('/dashboard')}>
              View product console
            </button>
          </div>

          <div className="platform-list">
            {platformItems.map((item) => (
              <div className="platform-list-item" key={item}>
                <FaCheck />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="security-band animate-on-scroll">
          <div className="security-item">
            <FaShieldAlt />
            <div>
              <strong>Operational visibility</strong>
              <span>Track conversations, escalations, orders, AI responses, and broadcasts from one console.</span>
            </div>
          </div>
          <div className="security-item">
            <FaPlug />
            <div>
              <strong>Integration ready</strong>
              <span>Use the existing webhook and store integration layer instead of a mock marketing shell.</span>
            </div>
          </div>
          <div className="security-item">
            <FaLock />
            <div>
              <strong>Admin-safe access</strong>
              <span>Support for admin roles, super-admin views, and authenticated dashboard sessions.</span>
            </div>
          </div>
        </section>

        <section id="pricing" className="landing-section pricing-section animate-on-scroll">
          <div className="section-heading">
            <span>Pricing</span>
            <h2>Plans that fit growing WhatsApp support volume</h2>
            <p>Simple tiers for demo conversations, active stores, and larger support operations.</p>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card">
              <h3>Starter</h3>
              <div className="price">₹1499<span>/month</span></div>
              <p>For small stores validating AI support.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 500 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 2,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Active WhatsApp connection</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Max 1 PDF document Knowledge Base upload</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>WhatsApp Broadcasting (0 Messages, 0 Campaigns)</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Advanced Analytics Dashboard</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Live Chat Handoff Escalations</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Automated Order Cancellations</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Custom Branding (White-Labeling)</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Developer API & Webhooks Access</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Priority Support</span></li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Start with demo</button>
            </article>

            <article className="pricing-card featured">
              <div className="pricing-tag">Best fit</div>
              <h3>Growth</h3>
              <div className="price">₹2999<span>/month</span></div>
              <p>For stores managing regular order and support volume.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 3,000 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 15,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 2 Active WhatsApp connections</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Max 3 PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> WhatsApp Broadcasting (5,000 Messages & 10 Campaigns/mo)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Advanced Analytics Dashboard (view metrics & logs)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Live Chat Handoff Escalations (automatic takeover)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Automated Order Cancellations via WhatsApp</li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Custom Branding (White-Labeling)</span></li>
                <li style={{ opacity: 0.5 }}><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Developer API & Webhooks Access</span></li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Priority Email & Chat Support (under 4 hours)</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Book demo</button>
            </article>

            <article className="pricing-card">
              <h3>Scale</h3>
              <div className="price">₹9999<span>/month</span></div>
              <p>For teams needing higher limits and custom workflows.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Unlimited WhatsApp Conversations & Messages</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 5 Active WhatsApp connections simultaneously</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Unlimited PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Multiple Integrations (Shopify & WooCommerce both)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> WhatsApp Broadcasting (25,000 Messages & Unlimited Campaigns/mo)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Advanced Analytics Dashboard (view metrics & logs)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Live Chat Handoff Escalations (automatic takeover)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Automated Order Cancellations via WhatsApp</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Custom Branding (rebrand console with logo & name)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Developer API & Webhooks Access</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Premium Support</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Talk to sales</button>
            </article>
          </div>
          <div className="pricing-promo-notice animate-on-scroll">
            <FaBolt style={{ color: '#ec4899', marginRight: '8px' }} />
            <span><strong>First-Time Discount:</strong> Get 60% off your first month on any plan. Copy coupon code <strong>NEW15</strong> and apply it inside your dashboard when upgrading.</span>
          </div>
        </section>

        {/* Early Access Partner Program */}
        <section className="testimonials-section early-access-section animate-on-scroll">
          <div className="testimonials-container">
            <div className="section-heading centered">
              <span>Early Access Program</span>
              <h2>Looking for our first 10 partner stores</h2>
              <p>Skip the wait and get personal launch support. Join our Early Access cohort to build your store AI bot together.</p>
            </div>

            <div className="early-access-card-wrapper">
              <div className="early-access-card">
                <div className="early-access-badge">Limited Opportunities</div>
                <h3>Partner with Kwickbot Founders</h3>
                <p className="early-access-pitch">
                  We are selecting exactly <strong>10 Shopify & WooCommerce brands</strong> to act as our launching design partners. Our core engineering team will personally build, train, and configure your store's AI bot to resolve queries and handle cancellations automatically.
                </p>
                <div className="early-access-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <div>
                      <strong>Free Custom Setup:</strong> We design your bot flow and train the FAQs on your policies from scratch.
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <div>
                      <strong>60% Lifelong Discount:</strong> Locked-in premium subscription plans for being an early adopter.
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <div>
                      <strong>Founder Chat Access:</strong> A direct Slack/WhatsApp connection with Kwickbot developers for feature requests.
                    </div>
                  </div>
                </div>
                <button className="early-access-action-btn" onClick={() => navigate('/book-demo')}>
                  Apply for Early Partner Access <FaArrowRight style={{ marginLeft: '8px' }} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible FAQ Section */}
        <section className="faq-accordion-section animate-on-scroll">
          <div className="faq-accordion-container-wrapper">
            <div className="section-heading centered">
              <span>FAQ</span>
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about setting up Kwickbot for your online business.</p>
            </div>
            <div className="faq-accordion-container">
              {faqs.map((faq, idx) => (
                <div className={`faq-accordion-item ${openFaqIndex === idx ? 'active' : ''}`} key={idx}>
                  <button className="faq-question-btn" onClick={() => toggleFaq(idx)}>
                    <span>{faq.question}</span>
                    <span className="faq-chevron">{openFaqIndex === idx ? '▲' : '▼'}</span>
                  </button>
                  <div className="faq-answer-wrapper" style={{
                    maxHeight: openFaqIndex === idx ? '200px' : '0px',
                    opacity: openFaqIndex === idx ? 1 : 0,
                    transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                    overflow: 'hidden'
                  }}>
                    <div className="faq-answer-panel">
                      <p style={{ margin: 0 }}>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer-wrapper">
        <div className="landing-footer">
          <div className="footer-brand-container">
            <div className="footer-brand">
              <img src="/logo.png" className="footer-logo-img" alt="Kwickbot Logo" />
            </div>
            <p>WhatsApp support automation for real E-commerce operations.</p>
            <div className="footer-socials">
              <a href="https://www.linkedin.com/company/kwickbot/" target="_blank" rel="noopener noreferrer" title="LinkedIn"><FaLinkedin /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter"><FaTwitter /></a>
              <a href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer" title="WhatsApp Support"><FaWhatsapp /></a>
            </div>
          </div>

          <div className="footer-links-grid">
            <div className="footer-links-col">
              <h4>Product</h4>
              <button onClick={() => scrollToSection('how-it-works')}>How it works</button>
              <button onClick={() => scrollToSection('workflows')}>Workflows</button>
              <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            </div>
            <div className="footer-links-col">
              <h4>Company</h4>
              <button onClick={() => navigate('/about')}>About Us</button>
              <button onClick={() => navigate('/services')}>Services</button>
              <button onClick={() => navigate('/blog')}>Blog</button>
              <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
              <button onClick={() => navigate('/terms')}>Terms & Conditions</button>
              <button onClick={() => navigate('/refund-policy')}>Refund Policy</button>
            </div>
            <div className="footer-links-col">
              <h4>Account</h4>
              <button onClick={() => navigate('/login')}>Sign In</button>
              <button onClick={() => navigate('/book-demo')}>Book Demo</button>
            </div>
            <div className="footer-links-col">
              <h4>Contact</h4>
              <a href="mailto:hello@kwickbot.in" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', margin: '4px 0', display: 'flex', alignItems: 'center' }}>
                <FaEnvelope style={{ marginRight: '8px', color: '#1677FF' }} /> hello@kwickbot.in
              </a>
              <a href="tel:+918128420287" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', margin: '4px 0', display: 'flex', alignItems: 'center' }}>
                <FaPhoneAlt style={{ marginRight: '8px', color: '#1677FF' }} /> +91 8128420287
              </a>
            </div>
          </div>

          <div className="footer-cta-container">
            <button className="footer-cta-btn" onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Demo Widget */}
      <div className={`floating-chat-widget ${isChatOpen ? 'open' : ''}`}>
        {!isChatOpen ? (
          <button
            className="chat-trigger-button"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open Kwickbot AI Assistant"
            title="Ask Kwickbot AI Assistant"
          >
            <FaWhatsapp />
          </button>
        ) : (
          <div className="widget-chat-window">
            <div className="widget-chat-header">
              <div className="widget-header-brand">
                <img src="/app-icon.png" alt="Kwickbot App Icon" className="widget-header-avatar" onError={(e) => { e.target.src = '/logo.png'; }} />
                <div>
                  <h4>Kwickbot AI Assistant</h4>
                  <span className="header-status-badge"><span className="status-dot"></span> Online • Website Assistant</span>
                </div>
              </div>
              <button className="widget-chat-close-btn" onClick={() => setIsChatOpen(false)} title="Close Chat">×</button>
            </div>

            <div className="widget-chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`widget-chat-bubble ${msg.role}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{msg.content}</p>
                </div>
              ))}

              {/* Quick Reply Chips (Shown at start or when user can pick common questions) */}
              {chatMessages.length <= 2 && !isTyping && (
                <div className="quick-replies-container">
                  <span className="quick-replies-label">Suggested Questions:</span>
                  <div className="quick-replies-grid">
                    {quickReplies.map((chip, idx) => (
                      <button
                        key={idx}
                        className="quick-reply-chip"
                        onClick={() => sendQuery(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="widget-chat-bubble assistant typing-bubble">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">Kwickbot AI is thinking...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="widget-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about features, pricing, setup..."
                disabled={isTyping}
                required
              />
              <button type="submit" disabled={isTyping || !chatInput.trim()} aria-label="Send message">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;
