'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import {
  FaArrowRight, FaCheck, FaSearch, FaPlug, FaCogs, FaRocket, FaFileAlt,
  FaComments, FaShoppingBag, FaBook, FaBullhorn, FaCode, FaChartBar, FaTools, FaClipboardList
} from 'react-icons/fa';
import {
  FlowHero, InboxMock, OrderTimelineMock, KnowledgeMock, CampaignMock, ApiMock, UsageMock
} from '../components/ServiceMockups';

const SECTIONS = [
  {
    id: 'support',
    nav: 'Support',
    icon: FaComments,
    eyebrow: 'Customer support',
    title: 'AI answers first. Your team takes over when it matters.',
    copy: 'Every WhatsApp conversation lands in one Live Chat inbox. The AI replies from your store data and documents, and pauses itself the moment a customer needs a person.',
    points: [
      'Live Chat inbox with full conversation history',
      'AI pauses on escalation, refund or “talk to a human” requests',
      'Agents reply manually and hand the chat back to the AI',
      'Escalations list so nothing urgent is missed'
    ],
    Mock: InboxMock
  },
  {
    id: 'orders',
    nav: 'Orders',
    icon: FaShoppingBag,
    eyebrow: 'Order automation',
    title: 'Every order followed up on WhatsApp, automatically.',
    copy: 'Connect Shopify or WooCommerce and Kwickbot receives orders by webhook, sends the templates you map to each order event, and answers tracking and cancellation questions with live order data.',
    points: [
      'Order sync from Shopify or WooCommerce',
      'Templates mapped to order events (confirmation, shipped, delivered)',
      'Order-status and tracking answers in chat',
      'Supported cancellation workflow over WhatsApp'
    ],
    Mock: OrderTimelineMock
  },
  {
    id: 'knowledge',
    nav: 'Knowledge',
    icon: FaBook,
    eyebrow: 'AI knowledge base',
    title: 'Answers grounded in your own policies.',
    copy: 'Upload your FAQ and policy PDFs. Kwickbot uses them to answer customers, and you can test any question before going live, so replies match what your business actually says.',
    points: [
      'PDF upload for FAQs, return and shipping policies',
      'Shopify product details synced into the knowledge base',
      'Test-a-question panel before launch',
      'Escalates instead of guessing when it is unsure'
    ],
    Mock: KnowledgeMock
  },
  {
    id: 'campaigns',
    nav: 'Campaigns',
    icon: FaBullhorn,
    eyebrow: 'Broadcasts & cart recovery',
    title: 'Approved campaigns, sent and tracked.',
    copy: 'Import recipients from CSV, pick an approved WhatsApp template, schedule it, and see what was sent or failed. Bring back shoppers with abandoned-cart reminders.',
    points: [
      'Approved template selection with header images',
      'CSV recipient import and scheduling',
      'Sent and failed counts for every campaign',
      'Abandoned-cart reminders from the dashboard'
    ],
    Mock: CampaignMock
  },
  {
    id: 'developer',
    nav: 'Developer API',
    icon: FaCode,
    eyebrow: 'WhatsApp API for your software',
    title: 'Plug WhatsApp into your own CRM, ERP or app.',
    copy: 'Use Kwickbot as your WhatsApp layer through a simple REST API. Send templates, text and media, and receive incoming messages on your own webhook.',
    points: [
      'API keys with usage tracking',
      'Send templates, text and media over REST',
      'Signed webhooks with secret rotation and test events',
      'Request logs and failed-webhook review'
    ],
    Mock: ApiMock
  },
  {
    id: 'governance',
    nav: 'Usage & control',
    icon: FaChartBar,
    eyebrow: 'Analytics, usage & governance',
    title: 'Always know what is running and what it costs.',
    copy: 'See conversations, messages and AI token use against your plan limits, with WhatsApp connection status and analytics in one dashboard.',
    points: [
      'Conversation, message and AI token meters',
      'Plan limits with clear usage visibility',
      'Conversation and operations analytics',
      'Integration and connection status'
    ],
    Mock: UsageMock
  }
];

const implementationSteps = [
  { icon: FaSearch, title: 'Map the workflow', copy: 'Identify your high-volume questions, order actions, policies, escalation rules and outbound use cases.' },
  { icon: FaPlug, title: 'Connect the stack', copy: 'Connect WhatsApp Cloud API and the commerce platform needed for store-aware operations.' },
  { icon: FaCogs, title: 'Configure & test', copy: 'Load approved knowledge, validate representative questions, and test order and agent-handoff paths.' },
  { icon: FaRocket, title: 'Launch with visibility', copy: 'Go live, monitor usage and conversations, and refine knowledge or rules as operations evolve.' }
];

const WE_SET_UP = [
  'WhatsApp Cloud API connection and webhooks',
  'Shopify or WooCommerce connection and order sync',
  'Knowledge base upload and test questions',
  'Templates mapped to your order events',
  'Live Chat escalation rules for your team',
  'A walkthrough of the dashboard for your agents'
];

const YOU_BRING = [
  'A Meta Business Manager account and the WhatsApp number to use',
  'Admin access to your Shopify store, or WooCommerce REST API keys over HTTPS',
  'Your FAQ, return and shipping policy documents (PDF)',
  'The message templates you want to send (we help draft them for Meta approval)'
];

export default function ServicesPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Highlight the section currently in view in the sticky menu
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

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
              <span className="eyebrow hero-fade" style={{ '--d': '0s' }}>Services for e-commerce on WhatsApp</span>
              <h1 className="rise" aria-label="Turn WhatsApp into an operating channel.">
                <span style={{ '--w': 0 }}>Turn</span>{' '}
                <span style={{ '--w': 1 }}>WhatsApp</span>{' '}
                <span style={{ '--w': 2 }}>into</span>{' '}
                <span style={{ '--w': 3 }}>an</span>{' '}
                <span style={{ '--w': 4 }} className="highlight swipe">operating</span>{' '}
                <span style={{ '--w': 5 }} className="highlight swipe">channel.</span>
              </h1>
              <p className="hero-lead hero-fade" style={{ '--d': '.45s' }}>
                Support automation, order follow-ups, campaigns and a WhatsApp API for your own software, set up on the official Meta Cloud API and connected to your store.
              </p>
              <div className="hero-actions hero-fade" style={{ '--d': '.6s' }}>
                <Link href="/demo" className="btn btn-primary">Discuss your workflow <FaArrowRight /></Link>
                <a href="#support" className="btn btn-secondary">See what’s included</a>
              </div>
              <div className="hero-tags hero-fade" style={{ '--d': '.75s' }}>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Official Meta API</span>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Shopify &amp; WooCommerce</span>
                <span className="pill pill-white"><FaCheck aria-hidden="true" /> Human control</span>
              </div>
            </div>
            <div className="hero-visual">
              <FlowHero />
            </div>
          </div>
        </section>

        {/* STICKY SECTION MENU */}
        <div className="svc-nav-wrap">
          <div className="container">
            <nav className="svc-nav" aria-label="Services sections">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''} aria-current={active === s.id ? 'true' : undefined}>
                    <Icon aria-hidden="true" /> {s.nav}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* FEATURES */}
        <section className="section-tight">
          <div className="container">
            {SECTIONS.map((s, index) => {
              const Mock = s.Mock;
              return (
                <section key={s.id} id={s.id} className={`feature ${index % 2 ? 'reverse' : ''}`} aria-labelledby={`${s.id}-title`}>
                  <div className="feature-copy" data-reveal={index % 2 ? 'right' : 'left'}>
                    <span className="eyebrow">{s.eyebrow}</span>
                    <h2 id={`${s.id}-title`}>{s.title}</h2>
                    <p>{s.copy}</p>
                    <ul className="checklist">
                      {s.points.map((point) => (
                        <li key={point}><span className="check"><FaCheck aria-hidden="true" /></span>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <Mock />
                </section>
              );
            })}
          </div>
        </section>

        {/* PROCESS */}
        <section className="section">
          <div className="container">
            <div className="band band-pista" data-reveal="scale" style={{ flexDirection: 'column', flexWrap: 'nowrap' }}>
              <div className="section-head-row" style={{ marginBottom: 0 }}>
                <div className="section-head">
                  <span className="eyebrow" style={{ color: 'var(--deep)' }}>Implementation process</span>
                  <h2>A practical path from requirements to live operations</h2>
                </div>
                <p style={{ color: 'var(--deep)' }}>We configure around your real policies and customer journeys, then validate the high-risk paths before going live.</p>
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

        {/* SET UP vs BRING */}
        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">Before you start</span>
              <h2>What we set up, and what we need from you</h2>
              <p>No surprises during onboarding. These are the pieces every working setup needs.</p>
            </div>
            <div className="grid-2" data-stagger>
              <article className="card">
                <span className="icon-chip"><FaTools aria-hidden="true" /></span>
                <h3>We set up</h3>
                <ul className="checklist">
                  {WE_SET_UP.map((item) => <li key={item}><span className="check"><FaCheck aria-hidden="true" /></span>{item}</li>)}
                </ul>
              </article>
              <article className="card" style={{ background: 'var(--pista-tint)', borderColor: 'transparent' }}>
                <span className="icon-chip" style={{ background: '#FFFFFF' }}><FaClipboardList aria-hidden="true" /></span>
                <h3>You bring</h3>
                <ul className="checklist">
                  {YOU_BRING.map((item) => <li key={item}><span className="check" style={{ background: '#FFFFFF' }}><FaCheck aria-hidden="true" /></span>{item}</li>)}
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* CUSTOM WORKFLOW */}
        <section className="section">
          <div className="container">
            <div className="card lift" data-reveal="up" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24, padding: 'clamp(24px, 4vw, 40px)' }}>
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
