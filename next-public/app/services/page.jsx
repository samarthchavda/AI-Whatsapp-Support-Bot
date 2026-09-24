'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
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
  FaCogs
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

export default function ServicesPage() {
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
        name: 'Services & Setup',
        item: 'https://kwickbot.in/services'
      }
    ]
  };

  return (
    <div className="retro-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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

      <main className="services-main">
        <section className="services-hero-shell">
          <div className="services-hero-copy">
            <span className="section-eyebrow">IMPLEMENTATION + AUTOMATION</span>
            <h1>Turn WhatsApp into an operating channel.</h1>
            <p>
              Kwickbot brings official WhatsApp infrastructure, store data, grounded AI, human handoff, and outbound messaging into one implementation path.
            </p>
            <div className="services-hero-actions">
              <Link href="/demo" className="glowing-btn-white">Discuss your workflow <FaArrowRight /></Link>
              <a href="#service-areas" className="services-secondary-link">Explore delivery areas</a>
            </div>
            <div className="services-proof-row">
              <span><FaCheck /> Official Meta API</span>
              <span><FaCheck /> Store-aware workflows</span>
              <span><FaCheck /> Human control</span>
            </div>
          </div>

          <div className="services-system-map" aria-label="Kwickbot connected system flow">
            <div className="system-map-glow"></div>
            <div className="system-map-label">CONNECTED SUPPORT STACK</div>
            <div className="system-node primary-node"><span><SiMeta /></span><div><strong>WhatsApp Cloud API</strong><small>Customer conversations & templates</small></div></div>
            <div className="system-connector"><span></span></div>
            <div className="system-node ai-node"><span><FaBrain /></span><div><strong>Kwickbot AI Layer</strong><small>Knowledge, rules & routing</small></div></div>
            <div className="system-branch">
              <div className="system-node compact-node"><span><SiShopify /></span><div><strong>Shopify</strong><small>Orders & fulfilments</small></div></div>
              <div className="system-node compact-node"><span><SiWoocommerce /></span><div><strong>WooCommerce</strong><small>Store operations</small></div></div>
            </div>
            <div className="system-connector"><span></span></div>
            <div className="system-node human-node"><span><FaHeadset /></span><div><strong>Human Operations</strong><small>Live chat, escalation & oversight</small></div><em>LIVE</em></div>
          </div>
        </section>

        <section id="service-areas" className="dark-section-card reveal-on-scroll services-section-card">
          <div className="dark-heading-center">
            <span>DELIVERY AREAS</span>
            <h2>Everything Required for a Working Support Flow</h2>
            <p>Each service area connects to an actual Kwickbot workflow, dashboard control, or supported integration.</p>
          </div>

          <div className="services-card-grid">
            {serviceAreas.map((service, index) => {
              const Icon = service.icon;
              return (
                <article className="service-detail-card" key={service.title} style={{ '--reveal-delay': `${index * 80}ms` }}>
                  <div className="service-card-top">
                    <span className="service-card-number">0{index + 1}</span>
                    <span className="service-detail-icon"><Icon /></span>
                  </div>
                  <span className="service-category">{service.category}</span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <ul>
                    {service.deliverables.map((item) => <li key={item}><FaCheck /> {item}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dark-section-card reveal-on-scroll services-process-section">
          <div className="services-process-heading">
            <div>
              <span className="section-eyebrow">IMPLEMENTATION PROCESS</span>
              <h2>A Practical Path from Requirements to Live Operations</h2>
            </div>
            <p>We configure around your real policies and customer journeys, then validate the high-risk paths before activation.</p>
          </div>
          <div className="services-process-grid">
            {implementationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="services-process-step" key={step.title} style={{ '--reveal-delay': `${index * 90}ms` }}>
                  <div className="process-step-header"><span>{step.number}</span><Icon /></div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="services-cta reveal-on-scroll">
          <div className="services-cta-icon"><FaFileAlt /></div>
          <div>
            <span>HAVE A NON-STANDARD WORKFLOW?</span>
            <h2>Let’s map the integration before making promises.</h2>
            <p>Share the platform, events, data fields, and actions you need. We will assess the safest path through supported APIs or scoped webhooks.</p>
          </div>
          <Link href="/demo" className="glowing-btn-white">Book a technical demo <FaArrowRight /></Link>
        </section>
      </main>
    </div>
  );
}
