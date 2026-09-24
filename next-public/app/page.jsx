'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FaArrowRight,
  FaBox,
  FaBrain,
  FaBroadcastTower,
  FaCheck,
  FaTimes,
  FaChartLine,
  FaComments,
  FaHeadset,
  FaPlug,
  FaShieldAlt,
  FaWhatsapp,
  FaPaperPlane,
  FaMobileAlt,
  FaShoppingBag,
  FaStore,
  FaSyncAlt,
  FaUserCheck,
  FaCoins,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { SiWhatsapp, SiMeta, SiShopify, SiWoocommerce } from 'react-icons/si';
import { getGroundedWebsiteAnswer } from './services/websiteKnowledge';

const faqs = [
  {
    question: "Do I need a Meta Business Manager account to connect WhatsApp?",
    answer: "Yes. The official WhatsApp Cloud API is managed through Meta Business Manager. Kwickbot includes a guided connection flow for adding your business account, phone number ID, and approved message templates."
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
    answer: "Yes. Super Admins can define monthly token limits for each merchant and monitor usage from the platform dashboard. This keeps AI consumption visible and aligned with the merchant's plan."
  },
  {
    question: "Can our support team take over an AI conversation?",
    answer: "Yes. When a customer asks for an agent or a configured escalation is triggered, Kwickbot pauses AI replies for that conversation. Your team can continue the same conversation from Live Chat with the available customer context."
  },
  {
    question: "Is each merchant's data kept separate?",
    answer: "Kwickbot associates conversations, orders, knowledge-base content, integrations, broadcasts, and usage with the authenticated merchant account. Role-based routes and tenant-aware queries keep each workspace scoped to its owner."
  }
];

const setupSteps = [
  {
    icon: FaWhatsapp,
    title: 'Connect WhatsApp',
    copy: 'Connect an official Meta WhatsApp Cloud API number or configure supported coexistence for your business number.'
  },
  {
    icon: FaPlug,
    title: 'Sync your store',
    copy: 'Link Shopify or WooCommerce so Kwickbot can use live order, fulfilment, customer, and checkout context.'
  },
  {
    icon: FaBrain,
    title: 'Teach your AI',
    copy: 'Upload store FAQs and policy documents so Gemini answers from the information your business approves.'
  },
  {
    icon: FaHeadset,
    title: 'Operate from one inbox',
    copy: 'Monitor conversations, handle escalations, run broadcasts, review analytics, and manage usage from the dashboard.'
  }
];

const capabilities = [
  {
    icon: SiWhatsapp,
    title: 'Official WhatsApp Cloud API',
    copy: 'Connect through Meta infrastructure for inbound customer conversations, outbound templates, and webhook-driven updates.'
  },
  {
    icon: FaMobileAlt,
    title: 'WhatsApp Coexistence',
    copy: 'Use supported coexistence to keep the WhatsApp Business App available while Kwickbot automates eligible conversations.'
  },
  {
    icon: FaBrain,
    title: 'Gemini Knowledge Base',
    copy: 'Ground AI replies in uploaded FAQs, store policies, product context, and merchant-specific knowledge instead of generic answers.'
  },
  {
    icon: SiShopify,
    title: 'Shopify Order Operations',
    copy: 'Sync orders and fulfilments, answer tracking questions, process supported cancellations, and react to checkout events.'
  },
  {
    icon: SiWoocommerce,
    title: 'WooCommerce Automation',
    copy: 'Use WooCommerce REST data for order-aware support, customer context, fulfilment updates, and store-specific responses.'
  },
  {
    icon: FaBroadcastTower,
    title: 'Templates & Broadcasts',
    copy: 'Manage approved templates, recipient lists, scheduled campaigns, delivery activity, and abandoned-cart follow-ups.'
  }
];

const audiences = [
  { icon: FaShoppingBag, title: 'D2C Brands', copy: 'Brands that want WhatsApp to become a reliable service channel for product, policy, and post-purchase questions.' },
  { icon: SiShopify, title: 'Shopify Merchants', copy: 'Teams that need order lookup, fulfilment updates, cancellation workflows, and checkout recovery connected to Shopify.' },
  { icon: SiWoocommerce, title: 'WooCommerce Stores', copy: 'WordPress commerce teams looking to connect store data with an AI-assisted WhatsApp support workflow.' },
  { icon: FaBox, title: 'Order-Heavy Operations', copy: 'Businesses handling frequent WISMO, shipping, cancellation, address, invoice, and delivery-status requests.' },
  { icon: FaHeadset, title: 'Support Teams', copy: 'Agents who need AI to handle repetitive questions while preserving a clear path to human takeover.' },
  { icon: FaChartLine, title: 'Retention Marketers', copy: 'Teams running approved WhatsApp campaigns, abandoned-cart reminders, and segmented follow-up communication.' }
];

const advantages = [
  { icon: FaBrain, title: 'Grounded Business Answers', copy: 'Responses use merchant-specific knowledge and available commerce context, with escalation when the AI should not decide.' },
  { icon: FaSyncAlt, title: 'Order-Aware Automation', copy: 'Webhook and API integrations keep support flows connected to current orders, fulfilments, and customer records.' },
  { icon: FaUserCheck, title: 'Human Control Built In', copy: 'Agents can pause automation, take over conversations, reply manually, and return control when the case is resolved.' },
  { icon: FaCoins, title: 'Usage & Plan Controls', copy: 'Merchant plans, message limits, conversation limits, and Gemini token usage can be monitored from the platform.' },
  { icon: FaShieldAlt, title: 'Tenant-Scoped Workspaces', copy: 'Authenticated routes and merchant-linked records keep operational data scoped to the correct business workspace.' },
  { icon: FaChartLine, title: 'Operational Visibility', copy: 'Dashboards expose conversations, orders, escalations, broadcasts, integrations, usage, and audit activity in one place.' }
];

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFullPricing, setShowFullPricing] = useState(true);
  const [activePreview, setActivePreview] = useState('support');

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const previewOrder = ['support', 'orders', 'handoff', 'broadcast'];
    const interval = window.setInterval(() => {
      setActivePreview((current) => {
        const currentIndex = previewOrder.indexOf(current);
        return previewOrder[(currentIndex + 1) % previewOrder.length];
      });
    }, 4800);

    return () => window.clearInterval(interval);
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <div className="retro-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Background Video */}
      <div className="bg-video-wrapper">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="bg-overlay-gradient"></div>
      </div>

      <main id="top">
        {/* HERO SECTION */}
        <section className="hero-retro-section">
          {/* Platform stack */}
          <div className="trust-row-wrapper">
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <SiWhatsapp />
              </div>
            </div>
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <SiMeta />
              </div>
            </div>
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <SiShopify />
              </div>
            </div>
            <div className="trust-text-pill">
              Built for WhatsApp commerce operations
            </div>
          </div>

          {/* Retro Dot-Matrix Headline with Interactive GET STARTED Hover Morph */}
          <Link href="/demo" className="hero-headline-interactive-wrapper" aria-label="Get Started Demo">
            <h1 className="retro-dot-headline default-headline">
              Support That Knows<br />
              Your Store
            </h1>
            <h1 className="retro-dot-headline hover-headline">
              GET STARTED <FaArrowRight style={{ fontSize: '0.75em', marginLeft: '12px' }} />
            </h1>
          </Link>

          <p className="retro-subhead">
            Kwickbot connects WhatsApp, Gemini AI, and your commerce data so customers get useful answers while your team keeps control of every escalation.
          </p>

          <Link href="/demo" className="glowing-btn-white">
            Get Started <FaArrowRight />
          </Link>
        </section>

        {/* Factual platform summary */}
        <section className="retro-stats-grid reveal-on-scroll">
          <div className="stat-dot-card">
            <div className="stat-dot-icon"><SiMeta /></div>
            <div className="stat-dot-value">Official</div>
            <div className="stat-dot-label">Meta Cloud API</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon"><FaStore /></div>
            <div className="stat-dot-value">2</div>
            <div className="stat-dot-label">Commerce Platforms</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon"><FaBrain /></div>
            <div className="stat-dot-value">24/7</div>
            <div className="stat-dot-label">AI Availability</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon"><FaHeadset /></div>
            <div className="stat-dot-value">Live</div>
            <div className="stat-dot-label">Human Handoff</div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>FROM CONNECTION TO OPERATION</span>
            <h2>Go Live in Four Clear Steps</h2>
            <p>Connect the channels you already use, add the knowledge your team trusts, and manage every conversation from one workspace.</p>
          </div>

          <div className="workflow-grid">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="workflow-step" key={step.title} style={{ '--reveal-delay': `${index * 90}ms` }}>
                  <div className="workflow-step-top">
                    <span className="workflow-number">0{index + 1}</span>
                    <span className="workflow-icon"><Icon /></span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* INTERACTIVE PRODUCT STORY */}
        <section className="dark-section-card product-story-section reveal-on-scroll">
          <div className="product-story-grid">
            <div className="product-story-copy">
              <span className="section-eyebrow">SEE THE WORKFLOW</span>
              <h2>One WhatsApp conversation. Full store context.</h2>
              <p>Kwickbot brings AI, order data, escalation controls, templates, and agent operations into the same customer journey.</p>
              <div className="product-proof-list">
                <div><FaCheck /> Answers can use approved merchant knowledge.</div>
                <div><FaCheck /> Store data supports order-aware responses.</div>
                <div><FaCheck /> AI pauses when a human should take over.</div>
                <div><FaCheck /> Campaign and usage activity stays visible.</div>
              </div>
              <Link href="/demo" className="story-link">Walk through your use case <FaArrowRight /></Link>
            </div>

            <div className="hero-product-preview-container">
              <div className="hero-product-card">
                <div className="hero-card-header">
                  <div className="hero-header-brand">
                    <img src="/app-icon.png" alt="Kwickbot" className="hero-brand-logo" />
                    <div className="hero-brand-text">
                      <span className="hero-brand-title">KWICKBOT OPERATIONS</span>
                      <span className="hero-brand-sub">Commerce support workspace</span>
                    </div>
                  </div>
                  <span className="hero-header-status"><span className="live-dot"></span> AI active</span>
                </div>

                <div className="hero-tab-bar" role="tablist" aria-label="Kwickbot workflow preview">
                  <button className={`hero-tab-btn ${activePreview === 'support' ? 'active' : ''}`} onClick={() => setActivePreview('support')}><FaComments /> Support</button>
                  <button className={`hero-tab-btn ${activePreview === 'orders' ? 'active' : ''}`} onClick={() => setActivePreview('orders')}><FaBox /> Orders</button>
                  <button className={`hero-tab-btn ${activePreview === 'handoff' ? 'active' : ''}`} onClick={() => setActivePreview('handoff')}><FaHeadset /> Handoff</button>
                  <button className={`hero-tab-btn ${activePreview === 'broadcast' ? 'active' : ''}`} onClick={() => setActivePreview('broadcast')}><FaBroadcastTower /> Campaign</button>
                </div>

                <div className="hero-card-body preview-panel" key={activePreview}>
                  {activePreview === 'support' && (
                    <>
                      <div className="chat-msg customer-msg">Where is my order #ORD-1024?</div>
                      <div className="hero-context-badge success"><FaCheck /> Order matched in the connected store</div>
                      <div className="chat-msg ai-msg">Your order has shipped. I found the latest fulfilment status and tracking reference for you.</div>
                    </>
                  )}
                  {activePreview === 'orders' && (
                    <>
                      <div className="chat-msg customer-msg">Can I cancel this order?</div>
                      <div className="hero-context-badge success"><FaBox /> Current status: processing</div>
                      <div className="chat-msg ai-msg">The order is still eligible for the configured cancellation workflow. I can submit the request now.</div>
                    </>
                  )}
                  {activePreview === 'handoff' && (
                    <>
                      <div className="chat-msg customer-msg">I need an agent to review my refund.</div>
                      <div className="hero-context-badge urgent"><FaHeadset /> Human assistance requested</div>
                      <div className="hero-alert-badge">AI paused • Conversation routed to Live Chat</div>
                    </>
                  )}
                  {activePreview === 'broadcast' && (
                    <div className="hero-broadcast-card">
                      <div className="broadcast-header"><FaBroadcastTower /><div><strong>Abandoned cart follow-up</strong><span>Approved WhatsApp template</span></div></div>
                      <div className="broadcast-preview-bubble">You left items in your cart. Complete your order when you are ready.</div>
                      <div className="hero-context-badge success"><FaCheck /> Campaign activity remains visible</div>
                    </div>
                  )}
                </div>
                <div className="hero-card-footer">WhatsApp Cloud API • Shopify &amp; WooCommerce • Gemini AI</div>
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM CAPABILITIES */}
        <section className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>PLATFORM CAPABILITIES</span>
            <h2>Built Around Real Commerce Support</h2>
            <p>Every capability maps to a workflow available in Kwickbot—not a disconnected marketing add-on.</p>
          </div>
          <div className="content-card-grid">
            {capabilities.map((item, index) => {
              const Icon = item.icon;
              return (
                <article className="content-info-card" key={item.title} style={{ '--reveal-delay': `${index * 70}ms` }}>
                  <span className="content-card-icon"><Icon /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* TARGET AUDIENCE */}
        <section className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>WHO IT IS FOR</span>
            <h2>Designed for Commerce Teams on WhatsApp</h2>
            <p>Kwickbot fits businesses where customer questions, orders, campaigns, and human support already meet inside WhatsApp.</p>
          </div>
          <div className="content-card-grid audience-grid">
            {audiences.map((item, index) => {
              const Icon = item.icon;
              return (
                <article className="content-info-card audience-card" key={item.title} style={{ '--reveal-delay': `${index * 70}ms` }}>
                  <span className="content-card-icon"><Icon /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* KWICKBOT ADVANTAGES */}
        <section className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>THE KWICKBOT ADVANTAGE</span>
            <h2>Automation Without Losing Control</h2>
            <p>AI handles repeatable work while people, policies, permissions, and operational limits remain visible to your team.</p>
          </div>
          <div className="content-card-grid">
            {advantages.map((item, index) => {
              const Icon = item.icon;
              return (
                <article className="content-info-card advantage-card" key={item.title} style={{ '--reveal-delay': `${index * 70}ms` }}>
                  <span className="content-card-icon"><Icon /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>PRICING TIERS</span>
            <h2>Plans Built for Growing WhatsApp Volume</h2>
            <p>Simple pricing tiers for validating AI, active stores, and high-volume operations.</p>

            <button
              onClick={() => setShowFullPricing(!showFullPricing)}
              style={{
                marginTop: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '8px 20px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              {showFullPricing ? 'Show Highlights Only' : 'See Full Feature Comparison'}
              {showFullPricing ? <FaChevronUp style={{ fontSize: '11px' }} /> : <FaChevronDown style={{ fontSize: '11px' }} />}
            </button>
          </div>

          <div className="dark-pricing-grid" style={{ marginTop: '28px' }}>
            <div className="dark-pricing-card">
              <h3>Starter</h3>
              <div className="dark-price">₹1499<span>/month</span></div>
              <p style={{ color: '#a1a1aa', fontSize: '13px' }}>For small stores validating AI support.</p>
              <ul>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 500 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 2,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> 1 Active WhatsApp connection</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Max 1 PDF document Knowledge Base upload</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Knowledge Base Retrieval &amp; Live Chat CRM</li>

                {showFullPricing && (
                  <>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> WhatsApp Broadcasting (0 Messages, 0 Campaigns)</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Advanced Analytics Dashboard</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Live Chat Handoff Escalations</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Automated Order Cancellations</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Custom Branding (White Labeling)</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Developer API &amp; Webhooks Access</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Priority Support</li>
                  </>
                )}
              </ul>
              <Link href="/demo" className="glowing-btn-white" style={{ marginTop: 'auto', width: '100%' }}>
                Start with demo
              </Link>
            </div>

            <div className="dark-pricing-card featured">
              <div className="cta-sparkle" style={{ fontSize: '12px', marginBottom: '8px' }}>BEST FIT</div>
              <h3>Growth</h3>
              <div className="dark-price">₹2999<span>/month</span></div>
              <p style={{ color: '#a1a1aa', fontSize: '13px' }}>For stores managing regular order and support volume.</p>
              <ul>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 3,000 WhatsApp Conversations/mo (customer chats)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 15,000 messages/mo (text bubbles)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 2 Active WhatsApp connections</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Max 3 PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> 1 Store Integration (Shopify OR WooCommerce)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Knowledge Base Retrieval &amp; Live Chat CRM</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> WhatsApp Broadcasting (5,000 Messages &amp; 10 Campaigns/mo)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Advanced Analytics Dashboard (view metrics &amp; logs)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Live Chat Handoff Escalations (automatic takeover)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Automated Order Cancellations via WhatsApp</li>

                {showFullPricing && (
                  <>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Custom Branding (White Labeling)</li>
                    <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Developer API &amp; Webhooks Access</li>
                  </>
                )}

                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Priority Email &amp; Chat Support (under 4 hours)</li>
              </ul>
              <Link href="/demo" className="glowing-btn-white" style={{ marginTop: 'auto', width: '100%' }}>
                Book demo
              </Link>
            </div>

            <div className="dark-pricing-card">
              <h3>Scale</h3>
              <div className="dark-price">₹9999<span>/month</span></div>
              <p style={{ color: '#a1a1aa', fontSize: '13px' }}>For teams needing higher limits and custom workflows.</p>
              <ul>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Unlimited WhatsApp Conversations &amp; Messages</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Up to 5 Active WhatsApp connections simultaneously</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Unlimited PDF document Knowledge Base uploads</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Multiple Integrations (Shopify &amp; WooCommerce both)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Knowledge Base Retrieval &amp; Live Chat CRM</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> WhatsApp Broadcasting (25,000 Messages &amp; Unlimited Campaigns/mo)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Advanced Analytics Dashboard (view metrics &amp; logs)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Live Chat Handoff Escalations (automatic takeover)</li>
                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Automated Order Cancellations via WhatsApp</li>

                {showFullPricing && (
                  <>
                    <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Custom Branding (rebrand console with logo &amp; name)</li>
                    <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Developer API &amp; Webhooks Access</li>
                  </>
                )}

                <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Premium Support</li>
              </ul>
              <Link href="/demo" className="glowing-btn-white" style={{ marginTop: 'auto', width: '100%' }}>
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section className="dark-section-card reveal-on-scroll">
          <div className="dark-heading-center">
            <span>FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about setting up Kwickbot for your online business.</p>
          </div>

          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(24, 24, 27, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  cursor: 'pointer'
                }}
                onClick={() => toggleFaq(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', color: '#ffffff', fontSize: '15px' }}>
                  <span>{faq.question}</span>
                  <span style={{ color: '#38bdf8' }}>{openFaqIndex === idx ? '▲' : '▼'}</span>
                </div>
                {openFaqIndex === idx && (
                  <p style={{ marginTop: '12px', color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6, margin: '12px 0 0' }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

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
          <div className="widget-chat-window" style={{ background: '#121215', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>
            <div className="widget-chat-header" style={{ background: '#18181b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="widget-header-brand">
                <img src="/app-icon.png" alt="Kwickbot App Icon" className="widget-header-avatar" onError={(e) => { e.target.src = '/logo.png'; }} />
                <div>
                  <h4 style={{ color: '#ffffff' }}>Kwickbot AI Assistant</h4>
                  <span className="header-status-badge"><span className="status-dot"></span> Online • Website Assistant</span>
                </div>
              </div>
              <button className="widget-chat-close-btn" onClick={() => setIsChatOpen(false)} title="Close Chat" style={{ color: '#ffffff' }}>×</button>
            </div>

            <div className="widget-chat-messages" style={{ background: '#09090b' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`widget-chat-bubble ${msg.role}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{msg.content}</p>
                </div>
              ))}

              {chatMessages.length <= 2 && !isTyping && (
                <div className="quick-replies-container">
                  <span className="quick-replies-label" style={{ color: '#a1a1aa' }}>Suggested Questions:</span>
                  <div className="quick-replies-grid">
                    {quickReplies.map((chip, idx) => (
                      <button
                        key={idx}
                        className="quick-reply-chip"
                        onClick={() => sendQuery(chip)}
                        style={{ background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

            <form onSubmit={handleChatSubmit} className="widget-chat-input" style={{ background: '#18181b', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about features, pricing, setup..."
                disabled={isTyping}
                required
                style={{ background: '#27272a', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button type="submit" disabled={isTyping || !chatInput.trim()} aria-label="Send message" style={{ background: '#ffffff', color: '#000000' }}>
                <FaPaperPlane />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
