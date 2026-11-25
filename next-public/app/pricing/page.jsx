'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import { planHighlights, yearlySavingPercent, sortPlans, isTrialPlan, isContactSales } from '../lib/planFeatures';
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';

// Only E-commerce plans are active on public pricing right now; CRM / API / Enterprise will return later.
const ACTIVE_ECOMMERCE_PLANS = ['free_trial', 'starter', 'growth'];

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
    question: "What happens when I reach my plan's AI or message limit?",
    answer: "Each plan lists its monthly limits above. Your dashboard shows usage as you go. If a limit is reached, AI auto-replies pause and conversations stay in your Live Chat inbox so your team can keep replying, so there are no surprise AI bills. You can upgrade at any time."
  }
];
export default function PricingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [showFullComparison, setShowFullComparison] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
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

  const getCurrencySymbol = (code = 'INR') => {
    switch (String(code).toUpperCase()) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return `${code} `;
    }
  };

  const formatMoney = (value) => Number(value).toLocaleString('en-IN');

  const formatLimit = (val, suffix = '') => {
    if (val === -1 || val === null || val === undefined || val === Infinity) {
      return 'Unlimited';
    }
    return `${Number(val).toLocaleString()}${suffix}`;
  };

  const FeatureItem = ({ enabled = true, children }) => (
    <li className={enabled ? '' : 'off'}>
      <span className="check">{enabled ? <FaCheck aria-hidden="true" /> : <FaTimes aria-hidden="true" />}</span>
      <span>{!enabled && <span className="sr-only">Not included: </span>}{children}</span>
    </li>
  );

  // Show active E-commerce offers (Free Trial, Starter, Growth) sorted cleanly.
  const filteredPlans = sortPlans(
    plans.filter((p) => p.category === 'kwickbot_crm' && ACTIVE_ECOMMERCE_PLANS.includes(String(p.name).toLowerCase()))
  );

  const maxYearlySaving = filteredPlans.reduce((max, p) => Math.max(max, yearlySavingPercent(p)), 0);

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
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(faqSchema) }} />

      <main>
        <section className="page-hero">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">Pricing</span>
              <h1>Simple e-commerce WhatsApp support plans</h1>
              <p>Start with a free self-signup trial and upgrade to Starter or Growth whenever your store is ready.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <div className="billing-toggle" role="group" aria-label="Billing cycle">
                <button type="button" className={billingCycle === 'monthly' ? 'active' : ''} aria-pressed={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
                  Monthly
                </button>
                <button type="button" className={billingCycle === 'yearly' ? 'active' : ''} aria-pressed={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
                  Yearly {maxYearlySaving > 0 && <span className="save-tag">Save up to {maxYearlySaving}%</span>}
                </button>
              </div>

              <button type="button" className="btn btn-soft btn-sm" onClick={() => setShowFullComparison((v) => !v)} aria-expanded={showFullComparison}>
                {showFullComparison ? 'Show highlights only' : 'Compare every feature'}
                {showFullComparison ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>

        <section className="section-tight">
          <div className="container">
            <div className="alert" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)', maxWidth: 860, margin: '0 auto 28px' }}>
              <FaInfoCircle aria-hidden="true" style={{ flex: 'none', marginTop: 3 }} />
              <span>Kwickbot AI support is included within each plan&apos;s stated limits. Meta bills WhatsApp message delivery separately at its current category and destination rates.</span>
            </div>

            <div className="plan-grid" data-stagger key={`ecommerce-${loading}`} aria-busy={loading}>
              {loading ? (
                [0, 1, 2].map((index) => (
                  <div key={`pricing-skeleton-${index}`} className="plan-card" aria-hidden="true" style={{ minHeight: 430 }}>
                    <div className="skeleton" style={{ width: '34%', height: 16 }} />
                    <div className="skeleton" style={{ width: '58%', height: 36 }} />
                    <div className="skeleton" style={{ width: '88%', height: 14 }} />
                    <div className="skeleton" style={{ width: '72%', height: 14 }} />
                    <div className="skeleton" style={{ width: '80%', height: 14 }} />
                    <div className="skeleton" style={{ width: '100%', height: 50, marginTop: 'auto', borderRadius: 999 }} />
                  </div>
                ))
              ) : filteredPlans.length > 0 ? (
                filteredPlans.map((plan) => {
                  const isTrial = isTrialPlan(plan);
                  const contactSales = isContactSales(plan);
                  const currSymbol = getCurrencySymbol(plan.currency);
                  const highlights = planHighlights(plan);
                  const trialDays = Number(plan.trialPolicy?.trialDays || plan.trialDays) || 14;

                  let priceDisplay = 'Contact sales';
                  let subtext = '';
                  let savingsText = null;

                  if (isTrial) {
                    priceDisplay = `${currSymbol}0`;
                    subtext = `/ ${trialDays}-day trial`;
                  } else if (!contactSales) {
                    if (billingCycle === 'yearly' && plan.yearlyPrice) {
                      const monthlyEquiv = Math.round(plan.yearlyPrice / 12);
                      priceDisplay = `${currSymbol}${formatMoney(plan.yearlyPrice)}`;
                      subtext = `/ year · ${currSymbol}${formatMoney(monthlyEquiv)}/mo`;

                      if (plan.monthlyPrice > 0 && plan.yearlyPrice < plan.monthlyPrice * 12) {
                        const totalMonthlyYear = plan.monthlyPrice * 12;
                        const savingsPercent = Math.round(((totalMonthlyYear - plan.yearlyPrice) / totalMonthlyYear) * 100);
                        savingsText = `Save ${savingsPercent}% with yearly billing`;
                      }
                    } else {
                      priceDisplay = `${currSymbol}${formatMoney(plan.monthlyPrice)}`;
                      subtext = '/ month';
                    }
                  }

                  const isPopularCard = plan.isPopular || String(plan.name).toLowerCase() === 'growth';

                  return (
                    <article key={plan._id || plan.name} className={`plan-card ${isPopularCard ? 'featured' : ''}`}>
                      {(isPopularCard || plan.badge) && <span className="plan-badge">{plan.badge || 'Most popular'}</span>}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: (isPopularCard || plan.badge) ? 110 : 0 }}>
                        <h3>{plan.displayName}</h3>
                        <p className="plan-desc">{plan.shortDescription || plan.detailedDescription}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div className="plan-price">
                          <strong key={`${billingCycle}-${plan.name}`} className="price-swap" style={contactSales ? { fontSize: 32 } : undefined}>{priceDisplay}</strong>
                          {subtext && <span>{subtext}</span>}
                        </div>
                        {savingsText && <span className="plan-note" style={{ fontWeight: 700, color: isPopularCard ? 'var(--pista)' : 'var(--leaf-strong)' }}>{savingsText}</span>}
                        {isTrial ? (
                          <span className="plan-note">Assigned automatically when you sign up. No payment or card required.</span>
                        ) : (
                          <>
                            {plan.setupFee > 0 && <span className="plan-note">+ {currSymbol}{formatMoney(plan.setupFee)} one-time setup fee</span>}
                            {plan.category === 'kwickbot_crm' && <span className="plan-note">AI support included in this plan. Meta WhatsApp message charges are separate.</span>}
                          </>
                        )}
                      </div>

                      <ul className="checklist">
                        {highlights.included.map((feature) => (
                          <FeatureItem key={`in-${feature}`}>{feature}</FeatureItem>
                        ))}
                        {showFullComparison && highlights.excluded.map((feature) => (
                          <FeatureItem key={`out-${feature}`} enabled={false}>{feature}</FeatureItem>
                        ))}
                      </ul>

                      <Link href={contactSales ? '/contact' : '/signup'} className={`btn btn-block ${isPopularCard ? 'btn-pista' : 'btn-secondary'}`}>
                        {contactSales ? 'Contact us' : isTrial ? 'Start free trial' : 'Create account'}
                      </Link>
                    </article>
                  );
                })
              ) : (
                <div className="card" style={{ gridColumn: '1 / -1', alignItems: 'center', textAlign: 'center', padding: 48 }}>
                  <span className="icon-chip" style={loadError ? { background: 'var(--warn-bg)', color: 'var(--warn-ink)' } : undefined}><FaInfoCircle aria-hidden="true" /></span>
                  <h3>{loadError ? 'Unable to load pricing' : 'Plans coming soon'}</h3>
                  <p style={{ maxWidth: 460 }}>
                    {loadError || 'No published E-commerce plans are available right now.'}
                  </p>
                  {loadError ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={fetchPublicPlans}>Retry</button>
                  ) : (
                    <Link href="/contact" className="btn btn-primary btn-sm">Talk to us</Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

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
                      aria-controls={`pricing-faq-${idx}`}
                      onClick={() => setOpenFaqIndex(open ? null : idx)}
                    >
                      <span>{faq.question}</span>
                      <span className="faq-icon"><FaChevronDown aria-hidden="true" /></span>
                    </button>
                    <div className="faq-a-wrap" id={`pricing-faq-${idx}`} aria-hidden={!open}><div><p className="faq-a">{faq.answer}</p></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
