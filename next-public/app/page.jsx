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
  FaChevronUp,
  FaWordpress,
  FaTruck
} from 'react-icons/fa';
import { SiWhatsapp, SiShopify, SiWoocommerce, SiMeta, SiGoogle } from 'react-icons/si';
import { getGroundedWebsiteAnswer } from './services/websiteKnowledge';
import { planHighlights, formatINR, sortPlans, isTrialPlan, isContactSales } from './lib/planFeatures';
import BrandMark from './components/BrandMark';
import OrderStory from './components/OrderStory';

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

// Each preview plays as a short conversation: items appear in order,
// with a typing indicator before every AI reply ("out").
const previewScripts = {
  support: [
    { kind: 'in', text: 'Where is my order #ORD-1024?', time: '10:42 AM' },
    { kind: 'note', icon: 'check', text: 'Shopify synced · Order #ORD-1024 matched' },
    { kind: 'out', text: 'Hi Ananya, your order #ORD-1024 has shipped via BlueDart and is out for delivery today.', time: '10:42 AM' },
    {
      kind: 'orderCard',
      orderId: '#ORD-1024',
      status: 'Out for delivery',
      item: 'Cotton Linen Kurta Set · Prepaid ₹1,899',
      meta: 'AWB 78412093 · ETA Today by 6:00 PM'
    }
  ],
  orders: [
    { kind: 'in', text: 'Please cancel my order #ORD-1042.', time: '11:15 AM' },
    { kind: 'note', icon: 'box', text: 'Status: Processing · Eligible for auto-cancel' },
    { kind: 'out', text: 'Done — order #ORD-1042 is cancelled on your store and the refund update has been logged.', time: '11:15 AM' },
    {
      kind: 'orderCard',
      orderId: '#ORD-1042',
      status: 'Cancelled',
      item: 'Ceramic Pour-Over Kit · ₹2,499',
      meta: 'Refund initiated · Synced to Shopify'
    }
  ],
  handoff: [
    { kind: 'in', text: 'I received a damaged box, can a person help with exchange?', time: '12:04 PM' },
    { kind: 'note', icon: 'headset', text: 'Human escalation triggered · AI paused' },
    { kind: 'alert', text: 'Routed to Live Chat Inbox · Assigned to Riya S.' },
    { kind: 'out', text: 'I have handed your chat over to our support team with your full order context.', time: '12:04 PM' }
  ],
  broadcast: [
    { kind: 'template', label: 'Meta Approved Template · Cart Recovery', text: 'Hi Rahul, your Linen Shirt (Size M) is still reserved. Complete checkout before stock runs out.' },
    { kind: 'note', icon: 'check', text: 'Sent to 1,240 opted-in shoppers · 98.4% delivered' },
    { kind: 'in', text: 'Thanks! Completing my order now.', time: '02:18 PM' }
  ]
};

const integrations = [
  { icon: SiWhatsapp, label: 'WhatsApp Cloud API' },
  { icon: SiMeta, label: 'Meta Business' },
  { icon: SiShopify, label: 'Shopify' },
  { icon: FaWordpress, label: 'WooCommerce' },
  { icon: SiGoogle, label: 'Google Gemini AI' },
  { icon: FaPlug, label: 'Odoo CRM' },
  { icon: FaCode, label: 'REST API & webhooks' }
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
  // Live plans from Plan Manager (null = loading, [] = unavailable)
  const [livePlans, setLivePlans] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${apiBase}/auth/plans/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled) setLivePlans(json?.success && Array.isArray(json.data) ? json.data : []); })
      .catch(() => { if (!cancelled) setLivePlans([]); });
    return () => { cancelled = true; };
  }, []);

  const homePlans = sortPlans((livePlans || []).filter((plan) => plan.category === 'kwickbot_crm' && ['free_trial', 'starter', 'growth'].includes(String(plan.name).toLowerCase())));
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
    'Create an account'
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);


  // Rotate the product preview until the visitor picks a tab themselves
  useEffect(() => {
    if (!autoPlay) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const order = previewTabs.map((tab) => tab.id);
    const interval = window.setInterval(() => {
      setActivePreview((current) => order[(order.indexOf(current) + 1) % order.length]);
    }, 6500);

    return () => window.clearInterval(interval);
  }, [autoPlay]);

  const pickPreview = (id) => {
    setAutoPlay(false);
    setActivePreview(id);
  };

  // Play the active preview as a conversation (render initial tab populated immediately)
  const [shownCount, setShownCount] = useState(previewScripts.support.length);
  const [isPreviewTyping, setIsPreviewTyping] = useState(false);
  const isFirstPreviewRender = useRef(true);

  useEffect(() => {
    const items = previewScripts[activePreview];
    if (isFirstPreviewRender.current) {
      isFirstPreviewRender.current = false;
      setShownCount(items.length);
      setIsPreviewTyping(false);
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShownCount(items.length);
      setIsPreviewTyping(false);
      return undefined;
    }
    setShownCount(0);
    setIsPreviewTyping(false);
    const timers = [];
    let t = 220;
    items.forEach((item, index) => {
      if (item.kind === 'out') {
        timers.push(setTimeout(() => setIsPreviewTyping(true), t));
        t += 650;
      }
      timers.push(setTimeout(() => { setIsPreviewTyping(false); setShownCount(index + 1); }, t));
      t += 420;
    });
    return () => timers.forEach(clearTimeout);
  }, [activePreview]);

  const noteIcon = (name) => (name === 'box' ? <FaBox aria-hidden="true" /> : name === 'headset' ? <FaHeadset aria-hidden="true" /> : <FaCheck aria-hidden="true" />);

  const renderPreviewItem = (item, index) => {
    switch (item.kind) {
      case 'in':
        return (
          <div key={index} className="bubble bubble-in seq-item">
            <span>{item.text}</span>
            {item.time && <span className="bubble-time">{item.time}</span>}
          </div>
        );
      case 'out':
        return (
          <div key={index} className="bubble bubble-out seq-item">
            <span>{item.text}</span>
            {item.time && <span className="bubble-time">{item.time}</span>}
          </div>
        );
      case 'note':
        return <span key={index} className="context-note seq-item">{noteIcon(item.icon)} {item.text}</span>;
      case 'alert':
        return <div key={index} className="alert-note seq-item"><FaUserCheck aria-hidden="true" /> {item.text}</div>;
      case 'orderCard':
        return (
          <div key={index} className="preview-order-card seq-item">
            <div className="preview-order-top">
              <strong><FaTruck aria-hidden="true" /> Order {item.orderId}</strong>
              <span className={`preview-order-status ${item.status === 'Cancelled' ? 'cancelled' : 'shipped'}`}>
                {item.status}
              </span>
            </div>
            <div className="preview-order-item">{item.item}</div>
            <div className="preview-order-meta">{item.meta}</div>
          </div>
        );
      case 'template':
        return (
          <div key={index} className="template-card seq-item">
            <span className="template-label">{item.label}</span>
            <span>{item.text}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const sendQuery = (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed || isTyping) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const groundedAnswer = getGroundedWebsiteAnswer(trimmed, { plans: livePlans || [] });
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
              <span className="pill hero-fade" style={{ alignSelf: 'flex-start', '--d': '0s' }}>
                <span className="dot" /> Built for Shopify &amp; WooCommerce stores
              </span>
              <h1 className="hero-title rise" aria-label="WhatsApp AI support that knows your store.">
                <span style={{ '--w': 0 }}>WhatsApp</span>{' '}
                <span style={{ '--w': 1 }}>AI</span>{' '}
                <span style={{ '--w': 2 }}>support</span>{' '}
                <span style={{ '--w': 3 }}>that</span>{' '}
                <span style={{ '--w': 4 }} className="hero-accent">knows your store</span>
              </h1>
              <p className="hero-lead hero-fade" style={{ '--d': '.32s' }}>
                Answer customer queries automatically with Gemini AI, sync live Shopify or WooCommerce orders into every reply, and hand complex chats to your team.
              </p>
              <div className="hero-actions hero-fade" style={{ '--d': '.44s' }}>
                <Link href="/signup" className="btn btn-primary">Start 14-day free trial <FaArrowRight aria-hidden="true" /></Link>
                <Link href="/pricing" className="btn btn-secondary">See pricing</Link>
              </div>
              <p className="hero-meta hero-fade" style={{ '--d': '.52s' }}>
                14-day free trial · No credit card required · Official Meta Cloud API
              </p>
              <div className="hero-integrations hero-fade" style={{ '--d': '.6s' }}>
                <span className="hero-int-item"><SiWhatsapp aria-hidden="true" /> WhatsApp Cloud API</span>
                <span className="hero-int-item"><SiShopify aria-hidden="true" /> Shopify</span>
                <span className="hero-int-item"><FaWordpress aria-hidden="true" /> WooCommerce</span>
                <span className="hero-int-item"><FaBrain aria-hidden="true" /> Gemini AI</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="preview-frame">
                <div className="preview-card">
                  <div className="preview-head">
                    <span className="preview-avatar"><BrandMark variant="dark" className="" /></span>
                    <div className="preview-title">
                      <strong>Kwickbot Inbox · Ananya Mehta</strong>
                      <span><i className="dot" /> AI Auto-Reply · Shopify Connected</span>
                    </div>
                    <span className="preview-status-chip">Live</span>
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
                          <Icon aria-hidden="true" /> <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="preview-body" key={activePreview} role="tabpanel" aria-live="polite">
                    {previewScripts[activePreview].slice(0, shownCount).map(renderPreviewItem)}
                    {isPreviewTyping && (
                      <div className="typing-bubble seq-item" aria-label="Kwickbot is typing">
                        <span className="typing"><i /><i /><i /></span>
                      </div>
                    )}
                  </div>
                  <div className="preview-foot">
                    <span>WhatsApp Cloud API · Gemini AI</span>
                    <span>Synced with Shopify</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FACTS */}
        <section className="section-tight">
          <div className="container">
            <div className="stats-strip" data-stagger>
              <div className="stat"><strong>Official</strong><span>Meta WhatsApp Cloud API</span></div>
              <div className="stat"><strong>2</strong><span>Commerce platforms</span></div>
              <div className="stat"><strong>24/7</strong><span>AI availability</span></div>
              <div className="stat"><strong>Live</strong><span>Human handoff</span></div>
            </div>
            <div className="marquee" style={{ marginTop: 20 }} data-reveal="fade" aria-label="Works with">
              <div className="marquee-track">
                {[0, 1].map((copy) => (
                  <div key={copy} style={{ display: 'flex', gap: 12 }} aria-hidden={copy === 1 ? 'true' : undefined}>
                    {integrations.concat(integrations).map((item, i) => {
                      const Icon = item.icon;
                      return <span key={`${copy}-${i}`} className="pill pill-white"><Icon aria-hidden="true" /> {item.label}</span>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHAT WE OFFER */}
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head">
              <span className="eyebrow">What Kwickbot does</span>
              <h2>Three ways to run commerce on WhatsApp</h2>
              <p>Use the full support platform, plug the WhatsApp API into your own software, or run campaigns. Most stores use all three.</p>
            </div>
            <div className="grid-3" data-stagger>
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

        {/* ORDER → WHATSAPP STORY */}
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head" data-reveal="up">
              <span className="eyebrow">From order to WhatsApp</span>
              <h2>Every order, followed up automatically</h2>
              <p>Scroll through one order’s journey: confirmation, shipping, questions and handoff, all on WhatsApp.</p>
            </div>
            <OrderStory />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">From connection to operation</span>
              <h2>Go live in four clear steps</h2>
              <p>Connect the channels you already use, add the knowledge your team trusts, and manage every conversation from one workspace.</p>
            </div>
            <div className="grid-4 steps-track" data-stagger>
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
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head-row">
              <div data-reveal="up" className="section-head">
                <span className="eyebrow">Platform capabilities</span>
                <h2>Built around real commerce support</h2>
              </div>
              <p>Every capability maps to a workflow available in Kwickbot, not a disconnected marketing add-on.</p>
            </div>
            <div className="grid-3" data-stagger>
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="card lift" key={item.title}>
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
        <section className="section">
          <div className="container">
            <div className="band band-pista" data-reveal="scale">
              <div data-reveal="up" className="section-head" style={{ flex: '1 1 320px', marginBottom: 0 }}>
                <span className="eyebrow" style={{ color: 'var(--deep)' }}>The Kwickbot advantage</span>
                <h2>Automation without losing control</h2>
                <p>AI handles repeatable work while people, policies, permissions and limits stay visible to your team.</p>
              </div>
              <div className="grid-2" data-stagger style={{ flex: '2 1 520px', gap: 14 }}>
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
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head">
              <span className="eyebrow">Who it is for</span>
              <h2>Designed for commerce teams on WhatsApp</h2>
              <p>Kwickbot fits businesses where customer questions, orders, campaigns and human support already meet inside WhatsApp.</p>
            </div>
            <div className="grid-3" data-stagger>
              {audiences.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="card lift" key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
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
        <section id="pricing" className="section">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">Pricing</span>
              <h2>Plans built for growing WhatsApp volume</h2>
              <p>Current e-commerce plans. Meta bills WhatsApp message delivery separately.</p>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setShowFullPricing((v) => !v)} aria-expanded={showFullPricing}>
                {showFullPricing ? 'Show highlights only' : 'Compare every feature'}
                {showFullPricing ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
              </button>
            </div>
            <div className="plan-grid" data-stagger>
              {livePlans === null ? (
                [0, 1, 2].map((index) => (
                  <div key={`home-plan-skeleton-${index}`} className="plan-card" aria-hidden="true" style={{ minHeight: 380 }}>
                    <div className="skeleton" style={{ width: '34%', height: 16 }} />
                    <div className="skeleton" style={{ width: '58%', height: 36 }} />
                    <div className="skeleton" style={{ width: '88%', height: 14 }} />
                    <div className="skeleton" style={{ width: '72%', height: 14 }} />
                    <div className="skeleton" style={{ width: '100%', height: 50, marginTop: 'auto', borderRadius: 999 }} />
                  </div>
                ))
              ) : homePlans.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', alignItems: 'center', textAlign: 'center', padding: 40 }}>
                  <h3>See current plans</h3>
                  <p style={{ maxWidth: 460 }}>Our latest plans, limits and yearly prices are on the pricing page.</p>
                  <Link href="/pricing" className="btn btn-primary btn-sm">View pricing</Link>
                </div>
              ) : homePlans.map((plan) => {
                const { included, excluded } = planHighlights(plan);
                const isTrial = isTrialPlan(plan);
                const featured = Boolean(plan.isPopular) || String(plan.name).toLowerCase() === 'growth';
                const contactSales = isContactSales(plan);
                const trialDays = Number(plan.trialPolicy?.trialDays || plan.trialDays) || 14;
                return (
                  <article key={plan._id || plan.name} className={`plan-card ${featured ? 'featured' : ''}`}>
                    {(featured || plan.badge) && <span className="plan-badge">{plan.badge || 'Most popular'}</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: (featured || plan.badge) ? 105 : 0 }}>
                      <h3>{plan.displayName}</h3>
                      <p className="plan-desc">{plan.shortDescription || plan.detailedDescription}</p>
                    </div>
                    <div className="plan-price">
                      {isTrial ? (
                        <><strong>{formatINR(0, plan.currency)}</strong><span>/ {trialDays}-day trial</span></>
                      ) : contactSales ? (
                        <strong style={{ fontSize: 32 }}>Contact sales</strong>
                      ) : (
                        <><strong>{formatINR(plan.monthlyPrice, plan.currency)}</strong><span>/ month</span></>
                      )}
                    </div>
                    <ul className="checklist">
                      {included.map((feature) => (
                        <li key={feature}><span className="check"><FaCheck aria-hidden="true" /></span>{feature}</li>
                      ))}
                      {showFullPricing && excluded.map((feature) => (
                        <li key={feature} className="off"><span className="check"><FaTimes aria-hidden="true" /></span><span><span className="sr-only">Not included: </span>{feature}</span></li>
                      ))}
                    </ul>
                    <Link href={contactSales ? '/contact' : '/signup'} className={`btn btn-block ${featured ? 'btn-pista' : 'btn-secondary'}`}>
                      {contactSales ? 'Contact us' : isTrial ? 'Start free trial' : 'Create account'}
                    </Link>
                  </article>
                );
              })}
            </div>
            <p style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/pricing" className="text-link">Compare plan details &amp; yearly savings <FaArrowRight aria-hidden="true" /></Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section">
          <div className="container-narrow">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">FAQ</span>
              <h2>Frequently asked questions</h2>
              <p>Everything you need to know about setting up Kwickbot for your online business.</p>
            </div>
            <div className="faq-list" data-stagger>
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
                    <div className="faq-a-wrap" id={`faq-a-${idx}`} aria-hidden={!open}><div><p className="faq-a">{faq.answer}</p></div></div>
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
