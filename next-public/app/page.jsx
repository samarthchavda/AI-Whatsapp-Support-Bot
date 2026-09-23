'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  FaPaperPlane,
  FaMobileAlt,
  FaFileCode,
  FaShoppingBag,
  FaStore,
  FaSyncAlt,
  FaUserCheck,
  FaRegSmileBeam,
  FaCoins,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { SiWhatsapp, SiMeta, SiShopify, SiWoocommerce, SiOpenai } from 'react-icons/si';
import { getGroundedWebsiteAnswer } from './services/websiteKnowledge';

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

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFullPricing, setShowFullPricing] = useState(true);

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

  return (
    <div className="retro-page-container">
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
          {/* Overlapping Enterprise Avatar Rings + Trust Pill */}
          <div className="trust-row-wrapper">
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <i className="fa-brands fa-whatsapp"></i>
              </div>
            </div>
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <i className="fa-brands fa-meta"></i>
              </div>
            </div>
            <div className="trust-avatar-ring">
              <div className="inner-white-circle">
                <i className="fa-brands fa-shopify"></i>
              </div>
            </div>
            <div className="trust-text-pill">
              Trusted by 2000+ Enterprises
            </div>
          </div>

          {/* Retro Dot-Matrix Headline with Interactive GET STARTED Hover Morph */}
          <Link href="/demo" className="hero-headline-interactive-wrapper" aria-label="Get Started Demo">
            <h1 className="retro-dot-headline default-headline">
              Intelligence<br />
              Designed To Evolve
            </h1>
            <h1 className="retro-dot-headline hover-headline">
              GET STARTED <FaArrowRight style={{ fontSize: '0.75em', marginLeft: '12px' }} />
            </h1>
          </Link>

          <p className="retro-subhead">
            Automate Shopify &amp; WooCommerce customer support, track orders, manage escalations, and dispatch targeted WhatsApp campaigns on Meta Cloud API.
          </p>

          <Link href="/demo" className="glowing-btn-white">
            Get Started <FaArrowRight />
          </Link>
        </section>

        {/* 4 RETRO STATS FOOTER */}
        <section className="retro-stats-grid">
          <div className="stat-dot-card">
            <div className="stat-dot-icon">&lt;</div>
            <div className="stat-dot-value">1.8s</div>
            <div className="stat-dot-label">Inference Time</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon">%</div>
            <div className="stat-dot-value">82%</div>
            <div className="stat-dot-label">Queries Resolved by AI</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon">*</div>
            <div className="stat-dot-value">24/7</div>
            <div className="stat-dot-label">Autonomous Runtime</div>
          </div>
          <div className="stat-dot-card">
            <div className="stat-dot-icon">#</div>
            <div className="stat-dot-value">10x</div>
            <div className="stat-dot-label">ROI Boost</div>
          </div>
        </section>

        {/* SECTION 1: WHAT WE PROVIDE */}
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>OUR PLATFORM CAPABILITIES</span>
            <h2>What We Provide</h2>
            <p>End-to-end WhatsApp customer support automation, store integrations, and Meta API infrastructure.</p>
          </div>

          <div className="dark-pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><SiWhatsapp /></div>
              <h3>Official WhatsApp Cloud API</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Direct Meta Business integration for enterprise messaging stability, zero per-message markup, and verified green tick readiness.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaMobileAlt /></div>
              <h3>WhatsApp SMB Coexistence</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Use your mobile WhatsApp Business App and Kwickbot AI simultaneously on the exact same phone number without losing chat history.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaFileCode /></div>
              <h3>Meta-Approved Templates</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Send official Meta utility templates (order updates, shipping, invoices) and promotional marketing broadcasts with CTA buttons.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><SiShopify /></div>
              <h3>1-Click Shopify Connection</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Automate order tracking lookups, shipping status alerts, order cancellation requests, and abandoned cart recovery via Shopify webhooks.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><SiWoocommerce /></div>
              <h3>WooCommerce Automation</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Seamless REST API integration for WordPress &amp; WooCommerce stores to handle customer queries 24/7 autonomously.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHO IS OUR CUSTOMER */}
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>TARGET AUDIENCE</span>
            <h2>Who Is Our Customer?</h2>
            <p>Designed specifically for growing e-commerce operations, support teams, and D2C sellers.</p>
          </div>

          <div className="dark-pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaShoppingBag /></div>
              <h3>D2C E-Commerce Brands</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Online stores processing 500 to 50,000+ orders monthly looking to deliver 24/7 instant customer support on WhatsApp.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaShieldAlt /></div>
              <h3>Stores Facing High RTO Losses</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Merchants needing automated Cash-on-Delivery (COD) address verification before dispatch to slash Return-To-Origin shipping costs.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaHeadset /></div>
              <h3>Overwhelmed Support Teams</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Customer service teams bogged down by repetitive "Where is my order?" (WISMO), sizing, and refund policy inquiries.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaChartLine /></div>
              <h3>Growth &amp; Performance Marketers</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                E-commerce marketers looking to recover up to 25% of abandoned checkout carts through interactive WhatsApp reminders.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHY CHOOSE KWICKBOT */}
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>THE KWICKBOT ADVANTAGE</span>
            <h2>Why Choose Kwickbot?</h2>
            <p>Proven operational leverage, zero latency, and complete control over your AI support engine.</p>
          </div>

          <div className="dark-pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaBolt /></div>
              <h3>82%+ Automated FAQ Resolution</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Google Gemini AI trained on your exact store FAQs, return windows, and product catalog—providing 10x faster replies.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaCoins /></div>
              <h3>Token Budget Control</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Super Admin quota management allows you to specify exact monthly LLM token budgets to prevent unexpected API bill spikes.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaSyncAlt /></div>
              <h3>Seamless Human Handoff</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                AI automatically pauses itself and alerts your support team in the Live Chat CRM whenever escalation or refund keywords trigger.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaStore /></div>
              <h3>Multi-Platform E-Commerce Sync</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                Supports Shopify, WooCommerce, custom cart webhooks, and multi-agent admin consoles from a single workspace.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="dark-section-card">
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
        <section className="dark-section-card">
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
