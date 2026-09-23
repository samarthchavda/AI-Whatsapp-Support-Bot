'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBrain, FaPlug, FaCog, FaChartLine, FaRobot, FaHeadset, FaFileAlt } from 'react-icons/fa';

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

export default function ServicesPage() {
  return (
    <div className="retro-page-container">
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
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>AUTOMATION CAPABILITIES</span>
            <h1 className="retro-dot-headline" style={{ fontSize: 'clamp(28px, 5vw, 56px)', margin: '16px auto' }}>
              End-To-End Support Services
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto' }}>
              We handle everything from Meta WhatsApp setup and database synchronization to AI instruction training and escalation tuning.
            </p>
          </div>

          <div className="dark-pricing-grid" style={{ marginTop: '36px' }}>
            {servicesList.map((service, index) => (
              <div className="dark-pricing-card" key={index}>
                <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}>{service.icon}</div>
                <h3>{service.title}</h3>
                <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>{service.description}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '18px', marginBottom: '4px' }}>Need a custom ERP or CRM sync?</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>We build custom webhooks for custom cart platforms, Salesforce, HubSpot, and shipping carriers.</p>
            </div>
            <Link href="/demo" className="glowing-btn-white">
              Talk to Developers <FaArrowRight />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
