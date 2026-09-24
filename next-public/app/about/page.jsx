'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaBrain, FaUsers, FaShieldAlt, FaRocket, FaChartBar, FaSmile } from 'react-icons/fa';

export default function AboutPage() {
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
        name: 'About Us',
        item: 'https://kwickbot.in/about'
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

      <main style={{ position: 'relative', zIndex: 1, padding: '40px 20px 80px' }}>
        <section className="dark-section-card" style={{ textAlign: 'center' }}>
          <div className="dark-heading-center">
            <span>ABOUT KWICKBOT</span>
            <h1 className="retro-dot-headline" style={{ fontSize: 'clamp(28px, 5vw, 56px)', margin: '16px auto' }}>
              Empowering Commerce With Agentic Support
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto' }}>
              We are building the future of automated customer operations. Our mission is to provide startup speed and enterprise reliability to D2C brands through 24/7 intelligent WhatsApp support.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="retro-stats-grid">
          <div className="stat-dot-card">
            <FaBrain className="stat-dot-icon" />
            <div className="stat-dot-value">82%+</div>
            <div className="stat-dot-label">Automated FAQ Resolution</div>
          </div>
          <div className="stat-dot-card">
            <FaChartBar className="stat-dot-icon" />
            <div className="stat-dot-value">10x</div>
            <div className="stat-dot-label">Faster Support Response</div>
          </div>
          <div className="stat-dot-card">
            <FaSmile className="stat-dot-icon" />
            <div className="stat-dot-value">95%</div>
            <div className="stat-dot-label">Customer CSAT Score</div>
          </div>
          <div className="stat-dot-card">
            <FaUsers className="stat-dot-icon" />
            <div className="stat-dot-value">24/7</div>
            <div className="stat-dot-label">Active Support Coverage</div>
          </div>
        </section>

        {/* Vision & Values */}
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>OUR VISION &amp; VALUES</span>
            <h2>Bridging AI Automation with Human Expertise</h2>
          </div>

          <div className="dark-pricing-grid">
            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaShieldAlt /></div>
              <h3>Safety &amp; Privacy First</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                We respect customer privacy. Customer records and API tokens are secured with bank-grade encryption and never exposed.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaBrain /></div>
              <h3>Contextual Intelligence</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                No generic boilerplate replies. The AI analyzes live order feeds, inventory thresholds, and return windows for precision answers.
              </p>
            </div>

            <div className="dark-pricing-card">
              <div style={{ fontSize: '28px', color: '#38bdf8', marginBottom: '14px' }}><FaUsers /></div>
              <h3>Human Handoff Control</h3>
              <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: 1.6 }}>
                AI is an operational assistant. When queries require human empathy, the bot pauses and hands off seamlessly to live agents.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <Link href="/demo" className="glowing-btn-white">
              Book a Strategy Call <FaArrowRight />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
