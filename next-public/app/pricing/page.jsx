'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';

const CATEGORIES = [
  { id: 'kwickbot_crm', label: 'Kwickbot CRM' },
  { id: 'crm_integration', label: 'Connect Your CRM' },
  { id: 'whatsapp_api', label: 'WhatsApp API' },
  { id: 'enterprise_custom', label: 'Enterprise' }
];

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
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeCategory, setActiveCategory] = useState('kwickbot_crm');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchPublicPlans();
  }, []);

  const fetchPublicPlans = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiBase}/auth/plans/public`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Pricing service returned ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Pricing service returned an invalid response');
      }

      setPlans(json.data);
    } catch (err) {
      console.error('Error fetching public plans:', err);
      setPlans([]);
      setLoadError('Pricing is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getCurrencySymbol = (code = 'INR') => {
    switch (String(code).toUpperCase()) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return `${code} `;
    }
  };

  const formatLimit = (val, suffix = '') => {
    if (val === -1 || val === null || val === undefined || val === Infinity) {
      return 'Unlimited';
    }
    return `${Number(val).toLocaleString()}${suffix}`;
  };

  // Filter plans for active category
  const filteredPlans = plans.filter(p => p.category === activeCategory);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kwickbot.in' },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://kwickbot.in/pricing' }
    ]
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };

  return (
    <div className="retro-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonStringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonStringify(faqSchema) }}
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
              Transparent Support & Integration Plans
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto' }}>
              Simple pricing for validating AI, connecting your CRM, developer APIs, and enterprise operations.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '999px', margin: '24px auto 0', border: '1px solid rgba(255,255,255,0.12)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                style={{
                  background: billingCycle === 'monthly' ? '#6366f1' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                style={{
                  background: billingCycle === 'yearly' ? '#6366f1' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Yearly Billing
                <span style={{ background: '#22c55e', color: '#000000', fontSize: '10px', padding: '2px 6px', borderRadius: '999px', fontWeight: '800' }}>
                  SAVE ~17%
                </span>
              </button>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    background: activeCategory === cat.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeCategory === cat.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: activeCategory === cat.id ? '#38bdf8' : '#a1a1aa',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setShowFullComparison(!showFullComparison)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {showFullComparison ? 'Show Highlights Only' : 'See Full Feature Comparison'}
                {showFullComparison ? <FaChevronUp style={{ fontSize: '10px' }} /> : <FaChevronDown style={{ fontSize: '10px' }} />}
              </button>
            </div>
          </div>

          {/* Additional Charges Disclaimer Note */}
          <div style={{ maxWidth: '840px', margin: '20px auto 0', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', fontSize: '12px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaInfoCircle style={{ color: '#f59e0b', flexShrink: 0, fontSize: '14px' }} />
            <span>Note: Meta WhatsApp conversation charges &amp; third-party CRM/Odoo subscription fees are charged separately by respective providers. Connector maintenance fees apply where specified.</span>
          </div>

          <div className="dark-pricing-grid" style={{ marginTop: '32px' }}>
            {loading ? (
              [0, 1, 2].map(index => (
                <div
                  key={`pricing-skeleton-${index}`}
                  className="dark-pricing-card"
                  aria-hidden="true"
                  style={{ minHeight: '430px', overflow: 'hidden' }}
                >
                  <div className="pricing-skeleton-line" style={{ width: '34%', height: '14px' }} />
                  <div className="pricing-skeleton-line" style={{ width: '58%', height: '30px', marginTop: '20px' }} />
                  <div className="pricing-skeleton-line" style={{ width: '42%', height: '42px', marginTop: '24px' }} />
                  <div className="pricing-skeleton-line" style={{ width: '88%', height: '14px', marginTop: '24px' }} />
                  <div className="pricing-skeleton-line" style={{ width: '72%', height: '14px', marginTop: '12px' }} />
                  <div className="pricing-skeleton-line" style={{ width: '100%', height: '52px', marginTop: 'auto', borderRadius: '999px' }} />
                </div>
              ))
            ) : filteredPlans.length > 0 ? (
              filteredPlans.map(plan => {
                const isContactSales = plan.contactSales || plan.monthlyPrice === 0;
                const currSymbol = getCurrencySymbol(plan.currency);

                let priceDisplay = 'Contact Sales';
                let subtext = '';
                let savingsText = null;

                if (!isContactSales) {
                  if (billingCycle === 'yearly' && plan.yearlyPrice) {
                    const monthlyEquiv = Math.round(plan.yearlyPrice / 12);
                    priceDisplay = `${currSymbol}${plan.yearlyPrice}`;
                    subtext = `/year (effective ${currSymbol}${monthlyEquiv}/mo)`;

                    if (plan.monthlyPrice > 0 && plan.yearlyPrice < plan.monthlyPrice * 12) {
                      const totalMonthlyYear = plan.monthlyPrice * 12;
                      const savingsPercent = Math.round(((totalMonthlyYear - plan.yearlyPrice) / totalMonthlyYear) * 100);
                      savingsText = `Save ${savingsPercent}% on yearly billing`;
                    }
                  } else {
                    priceDisplay = `${currSymbol}${plan.monthlyPrice}`;
                    subtext = '/month';
                  }
                }

                const isPopularCard = plan.isPopular;

                return (
                  <div key={plan._id || plan.name} className={`dark-pricing-card ${isPopularCard ? 'featured' : ''}`}>
                    {(isPopularCard || plan.badge) && (
                      <div className="cta-sparkle" style={{ fontSize: '11px', marginBottom: '6px' }}>
                        {plan.badge || 'POPULAR'}
                      </div>
                    )}

                    <h3>{plan.displayName}</h3>
                    <div className="dark-price" style={{ fontSize: isContactSales ? '28px' : '36px' }}>
                      {priceDisplay}
                      {subtext && <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{subtext}</span>}
                    </div>

                    {savingsText && (
                      <div style={{ color: '#4ade80', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                        {savingsText}
                      </div>
                    )}

                    {plan.setupFee > 0 && (
                      <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '4px' }}>
                        + {currSymbol}{plan.setupFee} one-time setup fee
                      </div>
                    )}

                    {plan.connectorMaintenanceFee > 0 && (
                      <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '2px' }}>
                        + {currSymbol}{plan.connectorMaintenanceFee}/mo connector maintenance fee
                      </div>
                    )}

                    <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '8px' }}>
                      {plan.shortDescription || plan.detailedDescription}
                    </p>

                    <ul style={{ marginTop: '16px' }}>
                      {/* Usage limits */}
                      {plan.usageLimits && (
                        <>
                          <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> {formatLimit(plan.usageLimits.monthlyConversations)} WhatsApp Conversations/mo</li>
                          <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> {formatLimit(plan.usageLimits.monthlyMessages)} Messages/mo</li>
                          <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> {formatLimit(plan.usageLimits.maxWhatsAppConnections)} Active WhatsApp Connection(s)</li>
                        </>
                      )}

                      {/* Dynamic Feature Entitlements */}
                      {plan.features?.aiAutomation && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> AI Knowledge Base &amp; Automated Support</li>
                      )}

                      {plan.features?.crmConnection && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> CRM / ERP Bi-directional Sync</li>
                      )}

                      {plan.features?.leadSync && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Automated Lead &amp; Contact Sync</li>
                      )}

                      {plan.features?.orderStatusSync && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> WhatsApp Order Status Sync &amp; Cancellations</li>
                      )}

                      {plan.features?.broadcasts && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> WhatsApp Broadcast Campaigns</li>
                      )}

                      {plan.features?.advancedAnalytics && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Advanced Analytics &amp; Message Logs</li>
                      )}

                      {plan.features?.humanHandoff && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Automatic Live Chat Human Handoff</li>
                      )}

                      {showFullComparison && (
                        <>
                          {plan.features?.customBranding ? (
                            <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Custom Branding &amp; White Labeling</li>
                          ) : (
                            <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Custom Branding</li>
                          )}

                          {plan.features?.developerApi ? (
                            <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> Developer API &amp; Webhook Triggers</li>
                          ) : (
                            <li className="disabled"><FaTimes style={{ flexShrink: 0, marginTop: '3px' }} /> Developer API &amp; Webhooks</li>
                          )}
                        </>
                      )}

                      {plan.supportLevel && (
                        <li><FaCheck style={{ color: '#4ade80', flexShrink: 0, marginTop: '3px' }} /> {plan.supportLevel}</li>
                      )}
                    </ul>

                    <Link
                      href={isContactSales ? "/demo" : "/demo"}
                      className="glowing-btn-white"
                      style={{ marginTop: 'auto', width: '100%', textAlign: 'center' }}
                    >
                      {isContactSales ? 'Talk to sales' : 'Start with demo'}
                    </Link>
                  </div>
                );
              })
            ) : (
              <div
                className="dark-pricing-card"
                style={{ gridColumn: '1 / -1', minHeight: '220px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
              >
                <FaInfoCircle style={{ color: loadError ? '#f59e0b' : '#38bdf8', fontSize: '26px' }} />
                <h3 style={{ marginTop: '14px' }}>
                  {loadError ? 'Unable to load pricing' : 'Plans coming soon'}
                </h3>
                <p style={{ color: '#a1a1aa', fontSize: '13px', maxWidth: '440px' }}>
                  {loadError || `No published ${CATEGORIES.find(category => category.id === activeCategory)?.label || ''} plans are available right now.`}
                </p>
                {loadError && (
                  <button type="button" className="glowing-btn-white" onClick={fetchPublicPlans} style={{ marginTop: '14px', padding: '12px 24px' }}>
                    Retry pricing
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section className="dark-section-card" style={{ marginTop: '40px' }}>
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
