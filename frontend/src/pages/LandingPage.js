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
  FaFileAlt,
  FaHeadset,
  FaLock,
  FaPlug,
  FaShieldAlt,
  FaWhatsapp,
  FaCommentDots,
  FaShoppingCart,
  FaEnvelope,
  FaPhoneAlt,
  FaLinkedin,
  FaTwitter
} from 'react-icons/fa';
import { SiWhatsapp, SiMeta, SiShopify, SiWoocommerce, SiOpenai } from 'react-icons/si';
import './LandingPage.css';

const metrics = [
  { value: '1.8s', label: 'median first reply' },
  { value: '82%', label: 'queries resolved by AI' },
  { value: '24/7', label: 'WhatsApp coverage' }
];

const journeySteps = [
  {
    number: '01',
    title: 'Meta WhatsApp API',
    description: 'Direct integration with Meta Cloud API for official business phone number routing.',
    badge: '✓ Connected',
    badgeType: 'success'
  },
  {
    number: '02',
    title: 'Shopify & WooCommerce',
    description: 'Real-time database sync for checking order statuses, tracking details, and processing cancellations.',
    badge: '✓ Connected',
    badgeType: 'success'
  },
  {
    number: '03',
    title: 'Knowledge Base (PDFs)',
    description: 'Upload your store FAQs and policies. Information is digested instantly by the AI.',
    badge: '✓ Knowledge Synced',
    badgeType: 'info'
  },
  {
    number: '04',
    title: 'AI Processing',
    description: 'Google Gemini engine analyzes user context, intent, store policies, and real-time order data.',
    badge: '✓ AI Online',
    badgeType: 'ai'
  },
  {
    number: '05',
    title: 'Customer Message',
    description: 'Shopper asks a question or requests order updates on WhatsApp (e.g., tracking, returns, cancellations).',
    badge: '✓ Active Chat',
    badgeType: 'chat'
  },
  {
    number: '06',
    title: 'Instant AI Reply',
    description: 'Automated policy-compliant bot reply sent back in under 1.5 seconds. Solves 82%+ of tickets.',
    badge: '⚡ Auto-Reply',
    badgeType: 'bolt'
  },
  {
    number: '07',
    title: 'Human Handoff (if needed)',
    description: 'If high frustration is detected or a refund is requested, the AI pauses and routes to live agents.',
    badge: '👥 Live Handoff Ready',
    badgeType: 'human'
  }
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

const testimonials = [
  {
    quote: "Kwickbot has completely transformed our customer operations. We synced our Shopify store and the AI immediately began resolving 80% of our order tracking and cancellation tickets automatically.",
    author: "Elena R.",
    role: "Founder, EcoStyle Apparel"
  },
  {
    quote: "The instant human handoff feature is a lifesaver. When customers request refunds, the AI pauses itself and alerts our team immediately in the live chat workspace. Setup took us less than 5 minutes.",
    author: "Marcus K.",
    role: "Support Director, FitGear Store"
  },
  {
    quote: "Being able to send bulk campaign updates while keeping Gemini AI budgets under control is exactly what we needed. Our WhatsApp customer engagement is up 3x since we started.",
    author: "Aarav S.",
    role: "Operations Head, OrganicGlow"
  }
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
  const [activeTab, setActiveTab] = useState('inbox');
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveJourneyStep((prev) => (prev + 1) % 7);
    }, 3200);
    return () => clearInterval(interval);
  }, []);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPromoBar, setShowPromoBar] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi there! 👋 I am the Kwickbot Sales & Setup Assistant. Ask me about features, plans, extra charges, integration setup, or how to give access permissions!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Hero Real-time Live Demo Animation State
  // States: 'customer-typing' | 'customer-sent' | 'ai-typing' | 'ai-sent' | 'note-sent' | 'reset'
  const [animState, setAnimState] = useState('customer-typing');

  useEffect(() => {
    if (activeTab !== 'inbox') return;

    let timer;
    if (animState === 'customer-typing') {
      timer = setTimeout(() => setAnimState('customer-sent'), 2200);
    } else if (animState === 'customer-sent') {
      timer = setTimeout(() => setAnimState('ai-typing'), 1200);
    } else if (animState === 'ai-typing') {
      timer = setTimeout(() => setAnimState('ai-sent'), 1800);
    } else if (animState === 'ai-sent') {
      timer = setTimeout(() => setAnimState('note-sent'), 1200);
    } else if (animState === 'note-sent') {
      timer = setTimeout(() => setAnimState('reset'), 4500);
    } else if (animState === 'reset') {
      timer = setTimeout(() => setAnimState('customer-typing'), 400);
    }

    return () => clearTimeout(timer);
  }, [animState, activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText('NEW15');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    // Simulated AI response logic
    setTimeout(() => {
      let reply = '';
      const input = userMessage.toLowerCase();

      if (input.includes('price') || input.includes('pricing') || input.includes('cost') || input.includes('plan') || input.includes('money')) {
        reply = '💰 Kwickbot Plans:\n• Starter (₹2999/mo): 500 AI messages, standard knowledge base.\n• Growth (₹6999/mo): 2,500 AI messages, WooCommerce/Shopify sync, campaigns.\n• Scale (₹14000/mo): Unlimited volume, custom CRM integrations.';
      } else if (input.includes('charge') || input.includes('pay') || input.includes('extra') || input.includes('hidden') || input.includes('fee')) {
        reply = '⚠️ Hidden/Extra Charges:\nThere are no hidden fees or extra charges from Kwickbot. If you integrate the official WhatsApp Cloud API, Meta charges directly per conversation (typically around $0.008 to $0.015 depending on the country).';
      } else if (input.includes('setup') || input.includes('integrate') || input.includes('integration') || input.includes('how to use') || input.includes('start') || input.includes('connect')) {
        reply = '🔧 Setup & Integration:\n1. Sign Up / Sign In to Kwickbot.\n2. Connect WhatsApp: Under "WhatsApp Connect", scan the QR code (for Web Bot) or enter your Meta developer credentials (for Cloud API).\n3. Link Shop: Go to "Integrations" and sync your Shopify or WooCommerce store.\n4. Train AI: Upload text FAQs or PDFs so the bot answers like your team!';
      } else if (input.includes('access') || input.includes('permission') || input.includes('agent') || input.includes('role') || input.includes('give')) {
        reply = '👥 Access & Permissions:\n• You can invite support agents from your settings.\n• Agents can reply in the Live Chat CRM console but cannot change integration settings.\n• Super Admins manage token limits, custom pricing rules, and agent permission roles.';
      } else if (input.includes('feature') || input.includes('what can') || input.includes('why') || input.includes('workflow')) {
        reply = '🚀 Core Features:\n• AI Auto-Reply: Resolves 80%+ of common store policy & order FAQs.\n• Instant Human Takeover: Pauses the AI bot and alerts agents on high frustration or refund requests.\n• Bulk Broadcasts: Send campaign updates with delivery analytics.\n• Focused CRM Console: Real-time chats, orders, and escalation queues.';
      } else {
        reply = '👋 I am here to help you get started with Kwickbot! Ask me about pricing & extra charges, how to setup integration, how to give access permissions, or core features.';
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    }, 800);
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {showPromoBar && (
        <div className="promo-banner-bar">
          <div className="promo-content">
            <span className="promo-badge">60% OFF</span>
            <span className="promo-text">First-Time Offer: Get 60% off! Copy code <strong>NEW15</strong> and apply it inside your dashboard when upgrading.</span>
            <button className="promo-copy-btn" onClick={handleCopyCode}>
              {copied ? 'Copied! 🎉' : 'Copy Code'}
            </button>
          </div>
          <button className="promo-close-btn" onClick={() => setShowPromoBar(false)} aria-label="Close offer banner">
            <FaTimes />
          </button>
        </div>
      )}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <button className="landing-logo" onClick={() => scrollToSection('top')} aria-label="Kwickbot home">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '38px', height: '38px' }} />
            <span>Kwickbot</span>
          </button>

          <div className="landing-nav-links" aria-label="Primary navigation">
            <button onClick={() => scrollToSection('how-it-works')}>How it Works</button>
            <button onClick={() => scrollToSection('workflows')}>Workflows</button>
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

          <div className="product-preview" aria-label="Product dashboard preview">
            <div className="preview-toolbar">
              <div>
                <span className="preview-label">Live inbox</span>
                <strong>WhatsApp Operations</strong>
              </div>
              <span className="preview-status">AI online</span>
            </div>

            <div className="preview-grid">
              <aside className="preview-sidebar">
                <button 
                  className={`preview-tab ${activeTab === 'inbox' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inbox')}
                >
                  <FaComments /> Inbox <span>18</span>
                </button>
                <button 
                  className={`preview-tab ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  <FaBox /> Orders <span>42</span>
                </button>
                <button 
                  className={`preview-tab alert ${activeTab === 'escalations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('escalations')}
                >
                  <FaHeadset /> Escalations <span>5</span>
                </button>
                <button 
                  className={`preview-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('analytics')}
                >
                  <FaChartLine /> Analytics
                </button>
              </aside>

              {activeTab === 'inbox' && (
                <div className="preview-conversation" style={{ minHeight: '300px' }}>
                  {/* Status pill header inside conversation box */}
                  <div className="preview-live-indicator">
                    <span className="live-dot animate-pulse"></span>
                    <span>
                      {animState === 'customer-typing' && 'Live Customer (Typing...)'}
                      {animState === 'customer-sent' && 'Live Customer (Online)'}
                      {animState === 'ai-typing' && 'AI Assistant (Typing...)'}
                      {animState === 'ai-sent' && 'AI Assistant (Online)'}
                      {animState === 'note-sent' && 'AI Resolved'}
                      {animState === 'reset' && 'Waiting for customer...'}
                    </span>
                  </div>

                  {/* Customer Message */}
                  {(animState !== 'customer-typing' && animState !== 'reset') && (
                    <div className="preview-message customer fade-in-slide">
                      <span>Customer</span>
                      Is my order arriving today?
                    </div>
                  )}

                  {/* Customer Typing Dot Indicator */}
                  {animState === 'customer-typing' && (
                    <div className="typing-indicator customer">
                      <span>Customer</span>
                      <div className="dot-flashing"></div>
                    </div>
                  )}

                  {/* AI Typing Dot Indicator */}
                  {animState === 'ai-typing' && (
                    <div className="typing-indicator bot">
                      <span>AI assistant</span>
                      <div className="dot-flashing"></div>
                    </div>
                  )}

                  {/* AI Message & Reply Time stats */}
                  {(animState === 'ai-sent' || animState === 'note-sent') && (
                    <div className="preview-message bot fade-in-slide">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span>AI assistant</span>
                        <span className="reply-speed-tag">⚡ AI Reply in 1.3 sec</span>
                      </div>
                      Yes. Order #ORD-1017 is out for delivery and should arrive between 4-7 PM.
                    </div>
                  )}

                  {/* Note message */}
                  {animState === 'note-sent' && (
                    <div className="preview-message note fade-in-slide">
                      <FaCheck />
                      Tracking link sent. No agent needed.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="preview-conversation scrollable-preview">
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1017</strong>
                      <span>Premium Leather Boots</span>
                    </div>
                    <span className="mock-badge success">Delivered</span>
                    <strong>$142.00</strong>
                  </div>
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1016</strong>
                      <span>Wireless Headphones</span>
                    </div>
                    <span className="mock-badge info">Shipped</span>
                    <strong>$89.50</strong>
                  </div>
                  <div className="mock-order-row">
                    <div>
                      <strong>Order #ORD-1015</strong>
                      <span>Smart Fitness Watch</span>
                    </div>
                    <span className="mock-badge warning">Processing</span>
                    <strong>$210.00</strong>
                  </div>
                </div>
              )}

              {activeTab === 'escalations' && (
                <div className="preview-conversation">
                  <div className="mock-escalation-alert">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="mock-badge urgent">URGENT ESCALATION</span>
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Just now</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#e4e4e7', textAlign: 'left' }}>
                      Customer **917777777777** triggered high-priority keyword: *"I want a refund immediately, my order is late."*
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="preview-btn-success" onClick={() => navigate('/login')}>Pause AI & Takeover</button>
                      <button className="preview-btn-secondary" onClick={() => navigate('/login')}>View Logs</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="preview-conversation grid-analytics">
                  <div className="analytics-preview-card">
                    <span>AI Resolution Rate</span>
                    <strong>84.2%</strong>
                    <span className="percent-up">+2.4% this week</span>
                  </div>
                  <div className="analytics-preview-card">
                    <span>Avg Response Time</span>
                    <strong>1.2s</strong>
                    <span className="percent-down">-0.6s faster</span>
                  </div>
                  <div className="analytics-preview-card">
                    <span>Active Conversations</span>
                    <strong>248</strong>
                    <span className="percent-up">24/7 coverage</span>
                  </div>
                </div>
              )}

              <div className="preview-insights">
                <div>
                  <span>Resolution rate</span>
                  <strong>84.2%</strong>
                </div>
                <div>
                  <span>Urgent queue</span>
                  <strong>5</strong>
                </div>
                <div>
                  <span>Broadcast replies</span>
                  <strong>214</strong>
                </div>
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

          <div className="stepper-grid">
            {/* Left side: Automated loop steps */}
            <div className="stepper-nav journey-nav">
              {journeySteps.map((step, idx) => (
                <button
                  key={idx}
                  className={`stepper-nav-item journey-step-item ${activeJourneyStep === idx ? 'active' : ''}`}
                  onClick={() => setActiveJourneyStep(idx)}
                >
                  <span className="step-number">{step.number}</span>
                  <div className="step-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>{step.title}</h3>
                      <span className={`journey-status-badge badge-${step.badgeType}`}>
                        {step.badge}
                      </span>
                    </div>
                    <p>{step.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Right side: Modern Animated Visualizer */}
            <div className="stepper-visual journey-visualizer">
              <div className="stepper-visual-inner">
                <div className="visual-panel journey-panel">
                  <h4 className="visual-panel-title">
                    Your AI Support Bot Goes Live in Under 5 Minutes
                  </h4>
                  
                  <div className="workflow-pipeline">
                    {/* Meta node */}
                    <div className={`pipeline-node-v2 meta-v2 ${activeJourneyStep === 0 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <SiMeta className="node-icon-v2" />
                      </div>
                      <div className="node-details">
                        <strong>Meta WhatsApp API</strong>
                        <span className="live-status-pill connected">✓ Connected</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 0 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* Shopify/WooCommerce Node */}
                    <div className={`pipeline-node-v2 store-v2 ${activeJourneyStep === 1 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <SiShopify className="node-icon-v2 text-shopify" />
                          <SiWoocommerce className="node-icon-v2 text-woo" />
                        </div>
                      </div>
                      <div className="node-details">
                        <strong>Shopify & WooCommerce</strong>
                        <span className="live-status-pill connected">✓ Connected</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 1 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* Knowledge Base Node */}
                    <div className={`pipeline-node-v2 kb-v2 ${activeJourneyStep === 2 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <FaFileAlt className="node-icon-v2 text-kb" />
                      </div>
                      <div className="node-details">
                        <strong>Knowledge Base (PDFs)</strong>
                        <span className="live-status-pill synced">✓ Knowledge Synced</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 2 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* AI Processing Node */}
                    <div className={`pipeline-node-v2 ai-v2 ${activeJourneyStep === 3 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <FaBrain className="node-icon-v2 text-ai" />
                      </div>
                      <div className="node-details">
                        <strong>AI Processing</strong>
                        <span className="live-status-pill online">✓ AI Online</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 3 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* Customer Message Node */}
                    <div className={`pipeline-node-v2 chat-v2 ${activeJourneyStep === 4 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <FaComments className="node-icon-v2 text-chat" />
                      </div>
                      <div className="node-details">
                        <strong>Customer Message</strong>
                        <span className="live-status-pill chat-active">“Is my order arriving today?”</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 4 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* Instant AI Reply Node */}
                    <div className={`pipeline-node-v2 reply-v2 ${activeJourneyStep === 5 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <FaBolt className="node-icon-v2 text-reply" />
                      </div>
                      <div className="node-details">
                        <strong>Instant AI Reply</strong>
                        <span className="live-status-pill reply-sent">⚡ Reply sent in 1.3s</span>
                      </div>
                    </div>

                    <div className={`pipeline-connector-v2 ${activeJourneyStep === 5 ? 'active-pulse' : ''}`}>
                      <div className="pulse-dot"></div>
                    </div>

                    {/* Human Handoff Node */}
                    <div className={`pipeline-node-v2 handoff-v2 ${activeJourneyStep === 6 ? 'active glow' : ''}`}>
                      <div className="node-icon-wrapper">
                        <FaHeadset className="node-icon-v2 text-handoff" />
                      </div>
                      <div className="node-details">
                        <strong>Human Handoff (if needed)</strong>
                        <span className="live-status-pill handoff-ready">👥 Live Agent Takeover Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
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
              <div className="price">₹2999<span>/month</span></div>
              <p>For small stores validating AI support.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 500 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 2,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Active WhatsApp connection</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Max 1 PDF document Knowledge Base upload</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
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
              <div className="price">₹6999<span>/month</span></div>
              <p>For stores managing regular order and support volume.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 3,000 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 15,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 2 Active WhatsApp connections</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Max 3 PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
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
              <div className="price">₹14000<span>/month</span></div>
              <p>For teams needing higher limits and custom workflows.</p>
              <ul>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Unlimited WhatsApp Conversations & Messages</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Up to 5 Active WhatsApp connections simultaneously</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Unlimited PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Multiple Integrations (Shopify & WooCommerce both)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Knowledge Base Retrieval & Live Chat CRM</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Advanced Analytics Dashboard (view metrics & logs)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Live Chat Handoff Escalations (automatic takeover)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Automated Order Cancellations via WhatsApp</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Custom Branding (rebrand console with logo & name)</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Developer API & Webhooks Access</li>
                <li><FaCheck style={{ color: '#10b981', marginRight: '8px' }} /> Dedicated Account Manager & 24/7 Slack Support</li>
              </ul>
              <button onClick={() => navigate('/book-demo')}>Talk to sales</button>
            </article>
          </div>
          <div className="pricing-promo-notice animate-on-scroll">
            <FaBolt style={{ color: '#ec4899', marginRight: '8px' }} />
            <span><strong>First-Time Discount:</strong> Get 60% off your first month on any plan. Copy coupon code <strong>NEW15</strong> and apply it inside your dashboard when upgrading.</span>
          </div>
        </section>

        {/* Customer Testimonials */}
        <section className="testimonials-section animate-on-scroll">
          <div className="testimonials-container">
            <div className="section-heading centered">
              <span>Testimonials</span>
              <h2>What e-commerce founders are saying</h2>
              <p>Loved by online store owners managing automated customer support pipelines.</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((t, idx) => (
                <div className="testimonial-card" key={idx}>
                  <p className="testimonial-quote">"{t.quote}"</p>
                  <div className="testimonial-author">
                    <div className="avatar-placeholder">{t.author.charAt(0)}</div>
                    <div className="author-meta">
                      <h4>{t.author}</h4>
                      <p>{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
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

      <footer className="landing-footer">
        <div className="footer-brand-container">
          <div className="footer-brand">
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '30px', height: '30px' }} />
            <span>Kwickbot</span>
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
            <a href="mailto:kwickbotai@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', margin: '4px 0', display: 'flex', alignItems: 'center' }}>
              <FaEnvelope style={{ marginRight: '8px', color: '#22c55e' }} /> kwickbotai@gmail.com
            </a>
            <a href="tel:+918128420287" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', margin: '4px 0', display: 'flex', alignItems: 'center' }}>
              <FaPhoneAlt style={{ marginRight: '8px', color: '#22c55e' }} /> +91 8128420287
            </a>
          </div>
        </div>

        <div className="footer-cta-container">
          <button className="footer-cta-btn" onClick={() => navigate('/book-demo')}>Book demo <FaArrowRight /></button>
        </div>
      </footer>

      {/* Floating WhatsApp Demo Widget */}
      <div className={`floating-chat-widget ${isChatOpen ? 'open' : ''}`}>
        {!isChatOpen ? (
          <button 
            className="chat-trigger-button" 
            onClick={() => setIsChatOpen(true)}
            aria-label="Open AI Demo Chat"
          >
            <FaWhatsapp />
            <span className="pulse-notification">1</span>
          </button>
        ) : (
          <div className="widget-chat-window">
            <div className="widget-chat-header">
              <FaWhatsapp className="widget-chat-icon" />
              <div>
                <h4>AI Support Assistant</h4>
                <span>Online • Powered by Gemini</span>
              </div>
              <button className="widget-chat-close-btn" onClick={() => setIsChatOpen(false)}>×</button>
            </div>

            <div className="widget-chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`widget-chat-bubble ${msg.role}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="widget-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about pricing, integration, access..."
                required
              />
              <button type="submit"><FaArrowRight /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default LandingPage;
