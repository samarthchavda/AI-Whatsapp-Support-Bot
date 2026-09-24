'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';

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

export default function PricingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showFullComparison, setShowFullComparison] = useState(true);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://kwickbot.in'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pricing',
        item: 'https://kwickbot.in/pricing'
      }
    ]
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="bg-video-wrapper">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="bg-overlay-gradient"></div>
      </div>

      <main style={{ position: 'relative', zIndex: 1, padding: '40px 20px 80px' }}>
        <section id="pricing" className="dark-section-card">
          <div className="dark-heading-center">
            <span>PRICING TIERS</span>
            <h1 className="retro-dot-headline" style={{ fontSize: 'clamp(28px, 5vw, 56px)', margin: '16px auto' }}>
              Transparent Support Plans
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto' }}>
              Simple pricing tiers for validating AI, active D2C stores, and enterprise operations.
            </p>

            <button
              onClick={() => setShowFullComparison(!showFullComparison)}
              style={{
                marginTop: '20px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '10px 22px',
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
              {showFullComparison ? 'Show Highlights Only' : 'See Full Feature Comparison'}
              {showFullComparison ? <FaChevronUp style={{ fontSize: '11px' }} /> : <FaChevronDown style={{ fontSize: '11px' }} />}
            </button>
          </div>

          <div className="dark-pricing-grid" style={{ marginTop: '36px' }}>
            {/* Starter Plan */}
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

                {showFullComparison && (
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

            {/* Growth Plan */}
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

                {showFullComparison && (
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

            {/* Scale Plan */}
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

                {showFullComparison && (
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
    </div>
  );
}
