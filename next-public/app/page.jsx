'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../utils/jsonSanitizer';
import {
  FaArrowRight,
  FaBox,
  FaBrain,
  FaBroadcastTower,
  FaCheck,
  FaTimes,
  FaChartLine,
  FaCode,
  FaComments,
  FaHeadset,
  FaPlug,
  FaShieldAlt,
  FaWhatsapp,
  FaPaperPlane,
  FaMobileAlt,
  FaShoppingBag,
  FaSyncAlt,
  FaUserCheck,
  FaCoins,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { SiWhatsapp, SiShopify, SiWoocommerce } from 'react-icons/si';
import { getGroundedWebsiteAnswer } from './services/websiteKnowledge';
import BrandMark from './components/BrandMark';

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

const servicePaths = [
  {
    icon: FaHeadset,
    title: 'Support automation for stores',
    copy: 'AI answers order, policy and product questions on WhatsApp, with live chat handoff to your team when it matters.',
    href: '/services',
    cta: 'Explore support plans'
  },
  {
    icon: FaCode,
    title: 'WhatsApp API for your software',
    copy: 'Connect the official WhatsApp Cloud API to your own systems with API keys, webhooks and delivery logs.',
    href: '/services',
    cta: 'See the developer API'
  },
  {
    icon: FaBroadcastTower,
    title: 'Broadcasts & cart recovery',
    copy: 'Send approved templates, scheduled campaigns and abandoned-cart reminders, and see what was delivered.',
    href: '/services',
    cta: 'See campaign tools'
  }
];

const plans = [
  {
    name: 'Starter',
    price: '₹1,499',
    desc: 'For small stores validating AI support.',
    cta: 'Start with a demo',
    included: [
      'Up to 500 WhatsApp conversations / month',
      'Up to 2,000 messages / month',
      '1 active WhatsApp connection',
      '1 knowledge base PDF',
      '1 store integration (Shopify or WooCommerce)',
      'Knowledge base retrieval & live chat CRM'
    ],
    excluded: [
      'WhatsApp broadcasting',
      'Advanced analytics dashboard',
      'Live chat handoff escalations',
      'Automated order cancellations',
      'Custom branding',
      'Developer API & webhooks',
      'Priority support'
    ]
  },
  {
    name: 'Growth',
    price: '₹2,999',
    desc: 'For stores managing regular order and support volume.',
    cta: 'Book a demo',
    featured: true,
    included: [
      'Up to 3,000 WhatsApp conversations / month',
      'Up to 15,000 messages / month',
      'Up to 2 active WhatsApp connections',
      'Up to 3 knowledge base PDFs',
      '1 store integration (Shopify or WooCommerce)',
      'Knowledge base retrieval & live chat CRM',
      'Broadcasting: 5,000 messages & 10 campaigns / month',
      'Advanced analytics dashboard',
      'Live chat handoff escalations',
      'Automated order cancellations',
      'Priority email & chat support (under 4 hours)'
    ],
    excluded: ['Custom branding', 'Developer API & webhooks']
  },
  {
    name: 'Scale',
    price: '₹9,999',
    desc: 'For teams needing higher limits and custom workflows.',
    cta: 'Talk to sales',
    included: [
      'Unlimited WhatsApp conversations & messages',
      'Up to 5 active WhatsApp connections',
      'Unlimited knowledge base PDFs',
      'Shopify and WooCommerce together',
      'Knowledge base retrieval & live chat CRM',
      'Broadcasting: 25,000 messages & unlimited campaigns',
      'Advanced analytics dashboard',
      'Live chat handoff escalations',
      'Automated order cancellations',
      'Custom branding (your logo & name)',
      'Developer API & webhooks',
      'Premium support'
    ],
    excluded: []
  }
];

const previewTabs = [
  { id: 'support', label: 'Support', icon: FaComments },
  { id: 'orders', label: 'Orders', icon: FaBox },
  { id: 'handoff', label: 'Handoff', icon: FaHeadset },
  { id: 'broadcast', label: 'Campaign', icon: FaBroadcastTower }
];

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFullPricing, setShowFullPricing] = useState(false);
  const [activePreview, setActivePreview] = useState('support');
  const [autoPlay, setAutoPlay] = useState(true);

  const WELCOME_MESSAGE = "Hi! I'm the Kwickbot AI assistant. I can help you understand Kwickbot's features, setup process, integrations, and pricing. What would you like to know?";

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickReplies = [
    'What is Kwickbot?',
    'How does it work?',
    'Pricing',
    'Shopify integration',
    'WooCommerce integration',
    'Book a demo'
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

  // Rotate the product preview until the visitor picks a tab themselves
  useEffect(() => {
    if (!autoPlay) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const order = previewTabs.map((tab) => tab.id);
    const interval = window.setInterval(() => {
      setActivePreview((current) => order[(order.indexOf(current) + 1) % order.length]);
    }, 4800);

    return () => window.clearInterval(interval);
  }, [autoPlay]);

  const pickPreview = (id) => {
    setAutoPlay(false);
    setActivePreview(id);
  };

  const sendQuery = (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed || isTyping) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const groundedAnswer = getGroundedWebsiteAnswer(trimmed);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: groundedAnswer }]);
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
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonStringify(faqSchema) }}
      />

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="pill" style={{ alignSelf: 'flex-start' }}>
                <span className="dot" /> Built for WhatsApp commerce operations
              </span>
              <h1>
                Support that knows <span className="highlight">your store.</span>
              </h1>
              <p className="hero-lead">
                Kwickbot connects WhatsApp, Gemini AI and your commerce data, so customers get useful answers while your team keeps control of every escalation.
              </p>
              <div className="hero-actions">
                <Link href="/demo" className="btn btn-primary">Book a demo <FaArrowRight /></Link>
                <Link href="/pricing" className="btn btn-secondary">See pricing</Link>
              </div>
              <div className="hero-tags">
                <span className="pill pill-white"><SiWhatsapp aria-hidden="true" /> WhatsApp Cloud API</span>
                <span className="pill pill-white"><SiShopify aria-hidden="true" /> Shopify</span>
                <span className="pill pill-white"><SiWoocommerce aria-hidden="true" /> WooCommerce</span>
                <span className="pill pill-white"><FaBrain aria-hidden="true" /> Gemini AI</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="preview-frame">
                <div className="preview-card">
                  <div className="preview-head">
                    <span className="preview-avatar"><BrandMark variant="dark" className="" /></span>
                    <div className="preview-title">
                      <strong>Commerce support workspace</strong>
                      <span>● AI active</span>
                    </div>
                  </div>

                  <div className="preview-tabs" role="tablist" aria-label="Kwickbot workflow preview">
                    {previewTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={activePreview === tab.id}
                          className={`preview-tab ${activePreview === tab.id ? 'active' : ''}`}
                          onClick={() => pickPreview(tab.id)}
                        >
                          <Icon aria-hidden="true" /> {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="preview-body" key={activePreview} role="tabpanel">
                    {activePreview === 'support' && (
                      <>
                        <div className="bubble bubble-in">Where is my order #ORD-1024?</div>
                        <span className="context-note"><FaCheck aria-hidden="true" /> Order matched in the connected store</span>
                        <div className="bubble bubble-out">Your order has shipped. I found the latest fulfilment status and tracking reference for you.</div>
                      </>
                    )}
                    {activePreview === 'orders' && (
                      <>
                        <div className="bubble bubble-in">Can I cancel this order?</div>
                        <span className="context-note"><FaBox aria-hidden="true" /> Current status: processing</span>
                        <div className="bubble bubble-out">The order is still eligible for the configured cancellation workflow. I can submit the request now.</div>
                      </>
                    )}
                    {activePreview === 'handoff' && (
                      <>
                        <div className="bubble bubble-in">I need an agent to review my refund.</div>
                        <span className="context-note"><FaHeadset aria-hidden="true" /> Human assistance requested</span>
                        <div className="alert-note"><FaUserCheck aria-hidden="true" /> AI paused · conversation routed to Live Chat</div>
                      </>
                    )}
                    {activePreview === 'broadcast' && (
                      <>
                        <div className="template-card">
                          <span className="template-label">Abandoned cart follow-up · Approved WhatsApp template</span>
                          <span>You left items in your cart. Complete your order when you are ready.</span>
                        </div>
                        <span className="context-note"><FaCheck aria-hidden="true" /> Campaign activity stays visible</span>
                      </>
                    )}
                  </div>
                  <div className="preview-foot">WhatsApp Cloud API · Shopify &amp; WooCommerce · Gemini AI</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FACTS */}
        <section className="section-tight reveal-on-scroll">
          <div className="container">
            <div className="stats-strip">
              <div className="stat"><strong>Official</strong><span>Meta WhatsApp Cloud API</span></div>
              <div className="stat"><strong>2</strong><span>Commerce platforms</span></div>
              <div className="stat"><strong>24/7</strong><span>AI availability</span></div>
              <div className="stat accent"><strong>Live</strong><span>Human handoff</span></div>
            </div>
          </div>
        </section>

        {/* WHAT WE OFFER */}
        <section className="section reveal-on-scroll">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">What Kwickbot does</span>
              <h2>Three ways to run commerce on WhatsApp</h2>
              <p>Use the full support platform, plug the WhatsApp API into your own software, or run campaigns. Most stores use all three.</p>
            </div>
            <div className="grid-3">
              {servicePaths.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} className="card card-link" key={item.title}>
                    <span className="icon-chip"><Icon aria-hidden="true" /></span>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                    <span className="text-link" style={{ marginTop: 'auto' }}>{item.cta} <FaArrowRight aria-hidden="true" /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section reveal-on-scroll">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow">From connection to operation</span>
              <h2>Go live in four clear steps</h2>
              <p>Connect the channels you already use, add the knowledge your team trusts, and manage every conversation from one workspace.</p>
            </div>
            <div className="grid-4">
              {setupSteps.map((step, index) => (
                <article className="card step-card" key={step.title}>
                  <span className={`num-badge ${index === setupSteps.length - 1 ? 'dark' : ''}`}>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="section reveal-on-scroll">
          <div className="container">
            <div className="section-head-row">
              <div className="section-head">
                <span className="eyebrow">Platform capabilities</span>
                <h2>Built around real commerce support</h2>
              </div>
              <p>Every capability maps to a workflow available in Kwickbot, not a disconnected marketing add-on.</p>
            </div>
            <div className="grid-3">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="card" key={item.title}>
                    <span className="icon-chip"><Icon aria-hidden="true" /></span>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ADVANTAGE */}
        <section className="section reveal-on-scroll">
          <div className="container">
            <div className="band band-pista">
              <div className="section-head" style={{ flex: '1 1 320px', marginBottom: 0 }}>
                <span className="eyebrow" style={{ color: 'var(--deep)' }}>The Kwickbot advantage</span>
                <h2>Automation without losing control</h2>
                <p>AI handles repeatable work while people, policies, permissions and limits stay visible to your team.</p>
              </div>
              <div className="grid-2" style={{ flex: '2 1 520px', gap: 14 }}>
                {advantages.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article className="card card-soft" key={item.title} style={{ padding: 22 }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon aria-hidden="true" style={{ color: 'var(--olive)', flex: 'none' }} /> {item.title}
                      </h3>
                      <p>{item.copy}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="section reveal-on-scroll">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Who it is for</span>
              <h2>Designed for commerce teams on WhatsApp</h2>
              <p>Kwickbot fits businesses where customer questions, orders, campaigns and human support already meet inside WhatsApp.</p>
            </div>
            <div className="grid-3">
              {audiences.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="card" key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                    <span className="icon-chip"><Icon aria-hidden="true" /></span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <h3>{item.title}</h3>
                      <p>{item.copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="section reveal-on-scroll">
          <div className="container">
            <div className="section-head center">
              <span className="eyebrow">Pricing</span>
              <h2>Plans built for growing WhatsApp volume</h2>
              <p>Simple tiers for validating AI, active stores and high-volume operations.</p>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setShowFullPricing((v) => !v)} aria-expanded={showFullPricing}>
                {showFullPricing ? 'Show highlights only' : 'Compare every feature'}
                {showFullPricing ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
              </button>
            </div>
            <div className="plan-grid">
              {plans.map((plan) => (
                <article key={plan.name} className={`plan-card ${plan.featured ? 'featured' : ''}`}>
                  {plan.featured && <span className="plan-badge">Most popular</span>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h3>{plan.name}</h3>
                    <p className="plan-desc">{plan.desc}</p>
                  </div>
                  <div className="plan-price"><strong>{plan.price}</strong><span>/ month</span></div>
                  <ul className="checklist">
                    {plan.included.map((feature) => (
                      <li key={feature}><span className="check"><FaCheck aria-hidden="true" /></span>{feature}</li>
                    ))}
                    {showFullPricing && plan.excluded.map((feature) => (
                      <li key={feature} className="off"><span className="check"><FaTimes aria-hidden="true" /></span><span><span className="sr-only">Not included: </span>{feature}</span></li>
                    ))}
                  </ul>
                  <Link href="/demo" className={`btn btn-block ${plan.featured ? 'btn-pista' : 'btn-secondary'}`}>{plan.cta}</Link>
                </article>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/pricing" className="text-link">See all plans, yearly prices and API plans <FaArrowRight aria-hidden="true" /></Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section reveal-on-scroll">
          <div className="container-narrow">
            <div className="section-head center">
              <span className="eyebrow">FAQ</span>
              <h2>Frequently asked questions</h2>
              <p>Everything you need to know about setting up Kwickbot for your online business.</p>
            </div>
            <div className="faq-list">
              {faqs.map((faq, idx) => {
                const open = openFaqIndex === idx;
                return (
                  <div key={faq.question} className={`faq-item ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-q"
                      aria-expanded={open}
                      aria-controls={`faq-a-${idx}`}
                      onClick={() => setOpenFaqIndex(open ? null : idx)}
                    >
                      <span>{faq.question}</span>
                      <span className="faq-icon"><FaChevronDown aria-hidden="true" /></span>
                    </button>
                    {open && <p id={`faq-a-${idx}`} className="faq-a">{faq.answer}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Website assistant */}
      {!isChatOpen ? (
        <button
          type="button"
          className="chat-fab"
          onClick={() => setIsChatOpen(true)}
          aria-label="Open Kwickbot website assistant"
          title="Ask the Kwickbot assistant"
        >
          <FaComments aria-hidden="true" />
        </button>
      ) : (
        <div className="chat-window" role="dialog" aria-label="Kwickbot website assistant">
          <div className="chat-head">
            <span className="preview-avatar" style={{ background: 'var(--olive)' }}><BrandMark variant="dark" className="" /></span>
            <div>
              <strong>Kwickbot assistant</strong>
              <span>● Online · answers about Kwickbot</span>
            </div>
            <button type="button" className="chat-close" onClick={() => setIsChatOpen(false)} aria-label="Close assistant">×</button>
          </div>
          <div className="chat-messages" aria-live="polite">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`bubble ${msg.role}`}>{msg.content}</div>
            ))}
            {chatMessages.length <= 2 && !isTyping && (
              <div className="quick-replies">
                <span>Suggested questions</span>
                <div>
                  {quickReplies.map((chip) => (
                    <button type="button" key={chip} onClick={() => sendQuery(chip)}>{chip}</button>
                  ))}
                </div>
              </div>
            )}
            {isTyping && (
              <div className="bubble assistant" aria-label="Assistant is typing">
                <span className="typing"><i /><i /><i /></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="chat-input">
            <label htmlFor="assistant-input" className="sr-only">Ask a question</label>
            <input
              id="assistant-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about features, pricing, setup…"
              disabled={isTyping}
              required
            />
            <button type="submit" disabled={isTyping || !chatInput.trim()} aria-label="Send message">
              <FaPaperPlane aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
