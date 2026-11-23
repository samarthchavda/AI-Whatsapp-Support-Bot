'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { safeJsonStringify } from '../../utils/jsonSanitizer';
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';

const CATEGORIES = [
  { id: 'kwickbot_crm', label: 'E-commerce' },
  { id: 'crm_integration', label: 'Connect Your CRM' },
  { id: 'whatsapp_api', label: 'WhatsApp API' },
  { id: 'enterprise_custom', label: 'Enterprise' }
];

// The Kwickbot CRM plans have a defined public comparison. Keep this presentation
// layer separate from the plan API so Super Admin remains the source of truth for
// plan price, billing cycle, publication status and CTA behaviour.
const KWICKBOT_CRM_COMPARISON = {
  starter: {
    conversations: '500',
    messages: '2,000',
    connections: '1',
    knowledgeBasePdfs: '1 PDF document (up to 4 pages)',
    storeIntegrations: '1 store integration (Shopify or WooCommerce)',
    advancedAnalytics: false,
    liveChatEscalation: false,
    orderCancellation: false,
    broadcasting: true,
    broadcastCampaigns: '5/month',
    broadcastMessages: '5,000/month',
    scheduledBroadcasts: false,
    audienceSegmentation: false,
    broadcastAnalytics: null,
    abandonedCartRecovery: false,
    productCatalogSync: false,
    productCatalogAi: false,
    customBranding: false,
    developerApi: false
  },
  growth: {
    conversations: 'Unlimited',
    messages: 'Unlimited',
    connections: '3',
    knowledgeBasePdfs: '3 PDF documents',
    storeIntegrations: '2 store integrations (Shopify or WooCommerce)',
    advancedAnalytics: true,
    liveChatEscalation: true,
    orderCancellation: true,
    broadcasting: true,
    broadcastCampaigns: 'Unlimited',
    broadcastMessages: 'Unlimited',
    scheduledBroadcasts: true,
    audienceSegmentation: true,
    broadcastAnalytics: 'Basic',
    abandonedCartRecovery: true,
    productCatalogSync: true,
    productCatalogAi: true,
    orderConfirmationTemplates: true,
    crmApiWebhooks: true,
    customBranding: false,
    developerApi: true
  },
  scale: {
    conversations: 'Unlimited',
    messages: 'Unlimited',
    connections: '5',
    knowledgeBasePdfs: 'Unlimited',
    storeIntegrations: 'Multiple store integrations',
    advancedAnalytics: true,
    liveChatEscalation: true,
    orderCancellation: true,
    broadcasting: true,
    broadcastCampaigns: 'Unlimited',
    broadcastMessages: '25,000/month',
    scheduledBroadcasts: true,
    audienceSegmentation: true,
    broadcastAnalytics: 'Advanced',
    customBranding: true,
    developerApi: true
  }
};

// CRM plans have intentionally different operational boundaries. Keep these
// customer-facing promises explicit rather than exposing internal token or
// implementation limits from the plan service.
const CRM_INTEGRATION_COMPARISON = {
  crm_connect: {
    included: [
      '2 WhatsApp connections and 1 CRM connection',
      'Up to 2,000 WhatsApp conversations/month',
      'Up to 10,000 WhatsApp messages/month',
      'AI WhatsApp support with 1 knowledge base upload',
      'Read-only Odoo product details and order-status lookup',
      'WhatsApp enquiry → Odoo CRM lead creation',
      'Live Chat handoff and integration logs'
    ],
    excluded: [
      'Customer/contact create or update',
      'Quotation, sales order, invoice, return or cancellation creation',
      'Custom automation rules and failed-event replay',
      'WhatsApp broadcasting and broadcast campaigns',
      'Custom webhooks, developer API and custom branding'
    ]
  },
  crm_automation: {
    included: [
      '2 WhatsApp connections and 2 CRM connections',
      'Up to 5,000 WhatsApp conversations/month',
      'Up to 100,000 WhatsApp messages/month',
      'Product and order-status sync with lead and contact sync',
      'Live Chat handoff, templates and integration logs',
      'Configurable CRM automation rules',
      'Quotation and sales-order automation with event retry',
      'Up to 5 WhatsApp broadcast campaigns/month',
      'Up to 5,000 broadcast messages/month'
    ],
    excluded: [
      'Custom webhooks and developer API',
      'Custom branding / white-labeling',
      'Unlimited connections and enterprise custom SLA'
    ]
  }
};

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
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
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

  // Show only the configured e-commerce offers; Scale remains in preparation.
  const filteredPlans = plans.filter((p) => p.category === activeCategory &&
    (activeCategory !== 'kwickbot_crm' || ['starter', 'growth'].includes(String(p.name).toLowerCase())));

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
              <h1>Transparent support &amp; integration plans</h1>
              <p>Simple pricing for validating AI, connecting your CRM, developer APIs and enterprise operations.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <div className="billing-toggle" role="group" aria-label="Billing cycle">
                <button type="button" className={billingCycle === 'monthly' ? 'active' : ''} aria-pressed={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
                  Monthly
                </button>
                <button type="button" className={billingCycle === 'yearly' ? 'active' : ''} aria-pressed={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
                  Yearly <span className="save-tag">Save ~17%</span>
                </button>
              </div>

              <div className="category-tabs" role="group" aria-label="Plan type">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={activeCategory === cat.id ? 'active' : ''}
                    aria-pressed={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
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
              <span>Meta WhatsApp conversation charges and third-party CRM/Odoo subscription fees are charged separately by those providers. Connector maintenance fees apply where specified.</span>
            </div>

            <div className="plan-grid" data-stagger key={`${activeCategory}-${loading}`} aria-busy={loading}>
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
                  const isContactSales = plan.contactSales || plan.monthlyPrice === 0;
                  const currSymbol = getCurrencySymbol(plan.currency);
                  const crmComparison = activeCategory === 'kwickbot_crm'
                    ? KWICKBOT_CRM_COMPARISON[String(plan.name || '').toLowerCase()]
                    : null;
                  const crmIntegrationComparison = activeCategory === 'crm_integration'
                    ? CRM_INTEGRATION_COMPARISON[String(plan.name || '').toLowerCase()]
                    : null;

                  let priceDisplay = 'Contact sales';
                  let subtext = '';
                  let savingsText = null;

                  if (!isContactSales) {
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

                  const isPopularCard = plan.isPopular;

                  return (
                    <article key={plan._id || plan.name} className={`plan-card ${isPopularCard ? 'featured' : ''}`}>
                      {(isPopularCard || plan.badge) && <span className="plan-badge">{plan.badge || 'Most popular'}</span>}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: (isPopularCard || plan.badge) ? 110 : 0 }}>
                        <h3>{plan.displayName}</h3>
                        <p className="plan-desc">{plan.shortDescription || plan.detailedDescription}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div className="plan-price">
                          <strong key={billingCycle} className="price-swap" style={isContactSales ? { fontSize: 32 } : undefined}>{priceDisplay}</strong>
                          {subtext && <span>{subtext}</span>}
                        </div>
                        {savingsText && <span className="plan-note" style={{ fontWeight: 700, color: isPopularCard ? 'var(--pista)' : 'var(--leaf-strong)' }}>{savingsText}</span>}
                        {plan.setupFee > 0 && <span className="plan-note">+ {currSymbol}{formatMoney(plan.setupFee)} one-time setup fee</span>}
                        {plan.connectorMaintenanceFee > 0 && <span className="plan-note">+ {currSymbol}{formatMoney(plan.connectorMaintenanceFee)}/mo connector maintenance fee</span>}
                      </div>

                      <ul className="checklist">
                        {crmComparison ? (
                          <>
                            <FeatureItem>{crmComparison.conversations} WhatsApp conversations / month</FeatureItem>
                            <FeatureItem>{crmComparison.messages} WhatsApp messages / month</FeatureItem>
                            <FeatureItem>{crmComparison.connections} active WhatsApp connection{crmComparison.connections === '1' ? '' : 's'}</FeatureItem>
                            <FeatureItem>{crmComparison.knowledgeBasePdfs} knowledge base</FeatureItem>
                            <FeatureItem>{crmComparison.storeIntegrations}</FeatureItem>
                            <FeatureItem>AI WhatsApp support</FeatureItem>
                            <FeatureItem>Live chat CRM</FeatureItem>
                            {crmComparison.orderConfirmationTemplates && <FeatureItem>Order confirmation WhatsApp templates</FeatureItem>}
                            {crmComparison.crmApiWebhooks && <FeatureItem>Connect your CRM through API and webhooks</FeatureItem>}
                            {showFullComparison && (
                              <>
                                <FeatureItem enabled={crmComparison.advancedAnalytics}>Advanced analytics</FeatureItem>
                                <FeatureItem enabled={crmComparison.abandonedCartRecovery ?? true}>Abandoned-cart recovery</FeatureItem>
                                <FeatureItem enabled={crmComparison.productCatalogSync ?? true}>Product catalog sync</FeatureItem>
                                <FeatureItem enabled={crmComparison.productCatalogAi ?? true}>Product-based AI replies on WhatsApp</FeatureItem>
                                <FeatureItem enabled={crmComparison.liveChatEscalation}>Live chat escalation</FeatureItem>
                                <FeatureItem enabled={crmComparison.orderCancellation}>Order cancellation</FeatureItem>
                                <FeatureItem enabled={crmComparison.broadcasting}>WhatsApp broadcasting</FeatureItem>
                                <FeatureItem enabled={Boolean(crmComparison.broadcastCampaigns)}>
                                  {crmComparison.broadcastCampaigns ? `${crmComparison.broadcastCampaigns} broadcast campaigns` : 'Broadcast campaigns'}
                                </FeatureItem>
                                <FeatureItem enabled={Boolean(crmComparison.broadcastMessages)}>
                                  {crmComparison.broadcastMessages ? `${crmComparison.broadcastMessages} broadcast messages` : 'Broadcast messages'}
                                </FeatureItem>
                                <FeatureItem enabled={crmComparison.scheduledBroadcasts}>Scheduled broadcasts</FeatureItem>
                                <FeatureItem enabled={crmComparison.audienceSegmentation}>Audience segmentation</FeatureItem>
                                <FeatureItem enabled={Boolean(crmComparison.broadcastAnalytics)}>
                                  {crmComparison.broadcastAnalytics ? `${crmComparison.broadcastAnalytics} broadcast analytics` : 'Broadcast analytics'}
                                </FeatureItem>
                                <FeatureItem enabled={crmComparison.customBranding}>Custom branding</FeatureItem>
                                <FeatureItem enabled={crmComparison.developerApi}>Developer API &amp; webhooks</FeatureItem>
                              </>
                            )}
                          </>
                        ) : crmIntegrationComparison ? (
                          <>
                            {crmIntegrationComparison.included.map((feature) => (
                              <FeatureItem key={`included-${feature}`}>{feature}</FeatureItem>
                            ))}
                            {showFullComparison && crmIntegrationComparison.excluded.map((feature) => (
                              <FeatureItem key={`excluded-${feature}`} enabled={false}>{feature}</FeatureItem>
                            ))}
                          </>
                        ) : (
                          <>
                            {plan.usageLimits && (
                              <>
                                <FeatureItem>{formatLimit(plan.usageLimits.monthlyConversations)} WhatsApp conversations / month</FeatureItem>
                                <FeatureItem>{formatLimit(plan.usageLimits.monthlyMessages)} messages / month</FeatureItem>
                                <FeatureItem>{formatLimit(plan.usageLimits.maxWhatsAppConnections === -1 ? -1 : Math.max(2, Number(plan.usageLimits.maxWhatsAppConnections) || 0))} active WhatsApp connection(s)</FeatureItem>
                              </>
                            )}
                            {plan.features?.aiAutomation && <FeatureItem>AI knowledge base &amp; automated support</FeatureItem>}
                            {plan.features?.crmConnection && <FeatureItem>CRM / ERP two-way sync</FeatureItem>}
                            {plan.features?.leadSync && <FeatureItem>Automated lead &amp; contact sync</FeatureItem>}
                            {plan.features?.orderStatusSync && <FeatureItem>WhatsApp order status sync &amp; cancellations</FeatureItem>}
                            {plan.features?.broadcasts && <FeatureItem>WhatsApp broadcast campaigns</FeatureItem>}
                            {plan.features?.advancedAnalytics && <FeatureItem>Advanced analytics &amp; message logs</FeatureItem>}
                            {plan.features?.humanHandoff && <FeatureItem>Automatic live chat human handoff</FeatureItem>}
                            {showFullComparison && (
                              <>
                                <FeatureItem enabled={Boolean(plan.features?.customBranding)}>Custom branding &amp; white labeling</FeatureItem>
                                <FeatureItem enabled={Boolean(plan.features?.developerApi)}>Developer API &amp; webhooks</FeatureItem>
                              </>
                            )}
                          </>
                        )}
                        {plan.supportLevel && <FeatureItem>{plan.supportLevel}</FeatureItem>}
                      </ul>

                      <Link href="/demo" className={`btn btn-block ${isPopularCard ? 'btn-pista' : 'btn-secondary'}`}>
                        {isContactSales ? 'Talk to sales' : 'Start with a demo'}
                      </Link>
                    </article>
                  );
                })
              ) : (
                <div className="card" style={{ gridColumn: '1 / -1', alignItems: 'center', textAlign: 'center', padding: 48 }}>
                  <span className="icon-chip" style={loadError ? { background: 'var(--warn-bg)', color: 'var(--warn-ink)' } : undefined}><FaInfoCircle aria-hidden="true" /></span>
                  <h3>{loadError ? 'Unable to load pricing' : 'Plans coming soon'}</h3>
                  <p style={{ maxWidth: 460 }}>
                    {loadError || `No published ${CATEGORIES.find((category) => category.id === activeCategory)?.label || ''} plans are available right now.`}
                  </p>
                  {loadError ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={fetchPublicPlans}>Retry</button>
                  ) : (
                    <Link href="/demo" className="btn btn-primary btn-sm">Talk to us</Link>
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
