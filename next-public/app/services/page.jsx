'use client';

import React from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import {
  FaArrowRight,
  FaBrain,
  FaPlug,
  FaHeadset,
  FaFileAlt,
  FaWhatsapp,
  FaStore,
  FaBroadcastTower,
  FaShieldAlt,
  FaCheck,
  FaSearch,
  FaRocket,
  FaCogs,
  FaCode,
  FaArrowDown
} from 'react-icons/fa';
import { SiMeta, SiShopify, SiWoocommerce } from 'react-icons/si';

const serviceAreas = [
  {
    icon: FaBrain,
    category: 'AI KNOWLEDGE',
    title: 'Business Knowledge Configuration',
    description: 'Shape Gemini responses around the information your business approves instead of relying on generic chatbot answers.',
    deliverables: ['FAQ and policy document ingestion', 'Merchant-specific retrieval context', 'Test-query review before launch']
  },
  {
    icon: FaWhatsapp,
    category: 'META ONBOARDING',
    title: 'WhatsApp Cloud API Setup',
    description: 'Configure the Meta assets and webhook connection Kwickbot needs to receive conversations and send approved messages.',
    deliverables: ['Business account and phone-number mapping', 'Cloud API credentials and webhooks', 'Template and coexistence guidance']
  },
  {
    icon: FaStore,
    category: 'COMMERCE DATA',
    title: 'Shopify & WooCommerce Integration',
    description: 'Connect store operations so support replies can use order, customer, fulfilment, and checkout context when it is available.',
    deliverables: ['Shopify or WooCommerce connection', 'Order and fulfilment synchronization', 'Cancellation and cart-event workflows']
  },
  {
    icon: FaHeadset,
    category: 'HUMAN OPERATIONS',
    title: 'Live Chat & Escalation Design',
    description: 'Define when AI should pause, what your agents need to see, and how the same conversation moves into human support.',
    deliverables: ['Escalation and refund triggers', 'Agent takeover with conversation context', 'Manual reply and bot resume controls']
  },
  {
    icon: FaBroadcastTower,
    category: 'OUTBOUND MESSAGING',
    title: 'Templates & Broadcast Operations',
    description: 'Prepare approved WhatsApp communication for targeted campaigns, operational updates, and supported follow-up journeys.',
    deliverables: ['Template organization and selection', 'Recipient imports and scheduling', 'Campaign queue and activity visibility']
  },
  {
    icon: FaShieldAlt,
    category: 'PLATFORM CONTROL',
    title: 'Analytics, Usage & Governance',
    description: 'Give merchants and platform operators visibility into activity, limits, integration health, and important administrative actions.',
    deliverables: ['Conversation and operations analytics', 'Plan, message, and token controls', 'Audit, health, and feature visibility']
  }
];

const implementationSteps = [
  { icon: FaSearch, number: '01', title: 'Map the workflow', copy: 'Identify your high-volume questions, order actions, policies, escalation rules, and outbound use cases.' },
  { icon: FaPlug, number: '02', title: 'Connect the stack', copy: 'Connect WhatsApp Cloud API and the supported commerce platform required for store-aware operations.' },
  { icon: FaCogs, number: '03', title: 'Configure & test', copy: 'Load approved knowledge, validate representative questions, and test order and agent-handoff paths.' },
  { icon: FaRocket, number: '04', title: 'Launch with visibility', copy: 'Activate the workflow, monitor usage and conversations, and refine knowledge or rules as operations evolve.' }
];
const developerArea = {
  icon: FaCode,
  category: 'Developer API',
  title: 'WhatsApp API for Your Software',
  description: 'Use Kwickbot as the WhatsApp layer for your own CRM, ERP or app, with keys, logs and webhooks managed from the dashboard.',
  deliverables: ['API keys with usage tracking', 'Send messages, templates and media over REST', 'Signed webhooks with test events, logs and failed-event review']
};

const allAreas = [...serviceAreas, developerArea];

export default function ServicesPage() {

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kwickbot.in' },
      { '@type': 'ListItem', position: 2, name: 'Services & Setup', item: 'https://kwickbot.in/services' }
    ]
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(breadcrumbSchema) }} />

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow hero-fade" style={{ '--d': '0s' }}>Implementation + automation</span>
              <h1 className="hero-fade" style={{ '--d': '.1s' }}>Turn WhatsApp into an <span className="highlight swipe">operating channel.</span></h1>
              <p className="hero-lead hero-fade" style={{ '--d': '.35s' }}>
                Kwickbot brings official WhatsApp infrastructure, store data, grounded AI, human handoff and outbound messaging into one implementation path.
              </p>
              <div className="hero-actions hero-fade" style={{ '--d': '.5s' }}>
                <Link href="/demo" className="btn btn-primary">Discuss your workflow <FaArrowRight /></Link>
                <a href="#service-areas" className="btn btn-secondary">Explore delivery areas</a>
              </div>
              <div className="hero-tags hero-fade" style={{ '--d': '.65s' }}>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Official Meta API</span>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Store-aware workflows</span>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Human control</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="preview-frame" aria-label="How the Kwickbot support stack connects">
                <div className="flow" data-stagger>
                  <span className="eyebrow" style={{ color: 'var(--deep)' }}>Connected support stack</span>
                  <div className="flow-node">
                    <span className="icon-chip"><SiMeta aria-hidden="true" /></span>
                    <div>WhatsApp Cloud API<small>Customer conversations &amp; templates</small></div>
                  </div>
                  <FaArrowDown className="flow-arrow" aria-hidden="true" />
                  <div className="flow-node ai">
                    <span className="icon-chip" style={{ background: '#FFFFFF' }}><FaBrain aria-hidden="true" /></span>
                    <div>Kwickbot AI layer<small>Knowledge, rules &amp; routing</small></div>
                  </div>
                  <div className="flow-row">
                    <div className="flow-node">
                      <span className="icon-chip"><SiShopify aria-hidden="true" /></span>
                      <div>Shopify<small>Orders &amp; fulfilments</small></div>
                    </div>
                    <div className="flow-node">
                      <span className="icon-chip"><SiWoocommerce aria-hidden="true" /></span>
                      <div>WooCommerce<small>Store operations</small></div>
                    </div>
                  </div>
                  <FaArrowDown className="flow-arrow" aria-hidden="true" />
                  <div className="flow-node human">
                    <span className="icon-chip"><FaHeadset aria-hidden="true" /></span>
                    <div>Human operations<small>Live chat, escalation &amp; oversight</small></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DELIVERY AREAS */}
        <section id="service-areas" className="section">
          <div className="container">
            <div data-reveal="up" className="section-head-row">
              <div data-reveal="up" className="section-head">
                <span className="eyebrow">Delivery areas</span>
                <h2>Everything required for a working support flow</h2>
              </div>
              <p>Each service area connects to an actual Kwickbot workflow, dashboard control or supported integration.</p>
            </div>
            <div className="grid-3" data-stagger>
              {allAreas.map((service, index) => {
                const Icon = service.icon;
                return (
                  <article className="card lift" key={service.title}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="icon-chip"><Icon aria-hidden="true" /></span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-2)' }}>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <span className="eyebrow" style={{ fontSize: 12 }}>{service.category}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <ul className="checklist" style={{ marginTop: 6 }}>
                      {service.deliverables.map((item) => (
                        <li key={item}><span className="check"><FaCheck aria-hidden="true" /></span>{item}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="section">
          <div className="container">
            <div className="band band-pista" data-reveal="scale" style={{ flexDirection: 'column', flexWrap: 'nowrap' }}>
              <div data-reveal="up" className="section-head-row" style={{ marginBottom: 0 }}>
                <div data-reveal="up" className="section-head">
                  <span className="eyebrow" style={{ color: 'var(--deep)' }}>Implementation process</span>
                  <h2>A practical path from requirements to live operations</h2>
                </div>
                <p style={{ color: 'var(--deep)' }}>We configure around your real policies and customer journeys, then validate the high-risk paths before activation.</p>
              </div>
              <div className="grid-4" data-stagger>
                {implementationSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article className="card card-soft" key={step.title} style={{ padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`num-badge ${index === implementationSteps.length - 1 ? 'dark' : ''}`}>{index + 1}</span>
                        <Icon aria-hidden="true" style={{ color: 'var(--olive)', fontSize: 20 }} />
                      </div>
                      <h3>{step.title}</h3>
                      <p>{step.copy}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOM WORKFLOW */}
        <section className="section">
          <div className="container">
            <div className="card" data-reveal="up" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24, padding: 'clamp(24px, 4vw, 40px)' }}>
              <span className="icon-chip" style={{ width: 64, height: 64, borderRadius: 20, fontSize: 26 }}><FaFileAlt aria-hidden="true" /></span>
              <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="eyebrow">Have a non-standard workflow?</span>
                <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800 }}>Let’s map the integration before making promises.</h2>
                <p>Share the platform, events, data fields and actions you need. We will assess the safest path through supported APIs or scoped webhooks.</p>
              </div>
              <Link href="/demo" className="btn btn-primary">Book a technical demo <FaArrowRight /></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
