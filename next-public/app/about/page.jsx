'use client';

import React from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import { FaArrowRight, FaBrain, FaUsers, FaShieldAlt } from 'react-icons/fa';

const values = [
  {
    icon: FaShieldAlt,
    title: 'Safety & privacy first',
    copy: 'We respect customer privacy. WhatsApp and store API credentials are encrypted at rest (AES-256-GCM), and each merchant’s data stays scoped to their own workspace.'
  },
  {
    icon: FaBrain,
    title: 'Contextual intelligence',
    copy: 'No generic boilerplate replies. The AI works from your uploaded policies and FAQs plus live order and fulfilment data from your store.'
  },
  {
    icon: FaUsers,
    title: 'Human handoff control',
    copy: 'AI is an operational assistant. When a query needs a person, the bot pauses and the conversation moves to your live agents with full context.'
  }
];

export default function AboutPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kwickbot.in' },
      { '@type': 'ListItem', position: 2, name: 'About Us', item: 'https://kwickbot.in/about' }
    ]
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(breadcrumbSchema) }} />

      <main>
        <section className="page-hero">
          <div className="container">
            <div data-reveal="up" className="section-head center" style={{ maxWidth: 820 }}>
              <span className="eyebrow">About Kwickbot</span>
              <h1>Empowering commerce with <span className="highlight swipe">agentic support</span></h1>
              <p>
                We are building the future of automated customer operations. Our mission is to give D2C brands startup speed and enterprise reliability through 24/7 intelligent WhatsApp support.
              </p>
            </div>
          </div>
        </section>

        <section className="section-tight">
          <div className="container">
            <div className="stats-strip" data-stagger>
              <div className="stat"><strong>Official</strong><span>Meta WhatsApp Cloud API</span></div>
              <div className="stat"><strong>2</strong><span>Commerce platforms</span></div>
              <div className="stat"><strong>24/7</strong><span>AI support coverage</span></div>
              <div className="stat accent"><strong>Live</strong><span>Human handoff</span></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">Our vision &amp; values</span>
              <h2>Bridging AI automation with human expertise</h2>
            </div>
            <div className="grid-3" data-stagger>
              {values.map((item) => {
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
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <Link href="/contact" className="btn btn-primary">Contact us <FaArrowRight /></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
