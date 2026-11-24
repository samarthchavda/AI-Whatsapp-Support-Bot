// Turns a live plan from /api/auth/plans/public into customer-facing feature lines.
// Used by the Home page, the Pricing page and the website assistant so every
// place shows the same, current numbers from Plan Manager.

export const CATEGORY_LABELS = {
  kwickbot_crm: 'E-commerce',
  crm_integration: 'Connect your CRM',
  whatsapp_api: 'WhatsApp API',
  enterprise_custom: 'Enterprise'
};

const fmt = (v) => Number(v).toLocaleString('en-IN');
const unlimited = (v) => v === -1 || v === null || v === undefined;
const plural = (count, one, many) => `${fmt(count)} ${count === 1 ? one : many}`;

export function formatINR(value, currency = 'INR') {
  const symbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[String(currency).toUpperCase()] || `${currency} `;
  return `${symbol}${fmt(value)}`;
}

/** Percentage saved with yearly billing, or 0 */
export function yearlySavingPercent(plan) {
  if (!plan || !plan.monthlyPrice || !plan.yearlyPrice) return 0;
  const full = plan.monthlyPrice * 12;
  return plan.yearlyPrice < full ? Math.round(((full - plan.yearlyPrice) / full) * 100) : 0;
}

export function isContactSales(plan) {
  return Boolean(plan?.contactSales) || !plan?.monthlyPrice;
}

// Feature flags shown per category, in display order: [flag, label]
const FLAG_LINES = {
  kwickbot_crm: [
    ['liveChat', 'Live chat inbox for your team'],
    ['escalations', 'Automatic escalation to your team'],
    ['scheduledBroadcasts', 'Scheduled broadcasts'],
    ['audienceSegmentation', 'Audience segmentation'],
    ['abandonedCartRecovery', 'Automatic abandoned-cart reminders'],
    ['productCatalogSync', 'Product catalog sync'],
    ['productCatalogAi', 'AI answers from your product catalog'],
    ['advancedAnalytics', 'Advanced analytics'],
    ['developerApi', 'Developer API & webhooks'],
    ['customBranding', 'Custom branding'],
    ['prioritySupport', 'Priority support']
  ],
  crm_integration: [
    ['leadSync', 'WhatsApp enquiries create CRM leads'],
    ['contactSync', 'Contact sync with your CRM'],
    ['orderStatusSync', 'Order-status answers from your CRM'],
    ['productLookup', 'Product lookup from your CRM'],
    ['quotationCreation', 'Quotation creation'],
    ['saleOrderCreation', 'Sales order creation'],
    ['automationRules', 'Automation rules'],
    ['failedEventReplay', 'Failed event replay'],
    ['humanHandoff', 'Live chat handoff'],
    ['customWebhooks', 'Custom webhooks'],
    ['developerApi', 'Developer API'],
    ['customBranding', 'Custom branding']
  ],
  whatsapp_api: [
    ['developerApi', 'REST API to send templates, text and media'],
    ['customWebhooks', 'Webhooks for incoming messages'],
    ['aiAutomation', 'Optional AI auto-replies'],
    ['knowledgeBase', 'AI knowledge base'],
    ['broadcasts', 'Broadcast campaigns'],
    ['customBranding', 'Custom branding']
  ],
  enterprise_custom: [
    ['crmConnection', 'CRM / ERP integration'],
    ['automationRules', 'Custom automation rules'],
    ['developerApi', 'Developer API & custom webhooks'],
    ['humanHandoff', 'Live chat handoff'],
    ['advancedAnalytics', 'Advanced analytics'],
    ['customBranding', 'Custom branding'],
    ['dedicatedSupport', 'Dedicated support'],
    ['customSla', 'Custom SLA']
  ]
};

function limitLines(plan) {
  const l = plan.usageLimits || {};
  const f = plan.features || {};
  const cat = plan.category;
  const lines = [];

  if (cat !== 'enterprise_custom') {
    lines.push(unlimited(l.monthlyConversations) ? 'Unlimited WhatsApp conversations' : `Up to ${fmt(l.monthlyConversations)} WhatsApp conversations / month`);
    if (l.monthlyMessages !== undefined) lines.push(unlimited(l.monthlyMessages) ? 'Unlimited messages' : `Up to ${fmt(l.monthlyMessages)} messages / month`);
  } else {
    lines.push('Custom conversation and message volumes');
  }

  if (l.maxWhatsAppConnections !== undefined) {
    lines.push(unlimited(l.maxWhatsAppConnections) ? 'Unlimited WhatsApp numbers' : plural(l.maxWhatsAppConnections, 'WhatsApp number', 'WhatsApp numbers'));
  }

  if (cat === 'whatsapp_api') {
    if (l.monthlyApiRequests !== undefined) lines.push(unlimited(l.monthlyApiRequests) ? 'Unlimited API requests' : `${fmt(l.monthlyApiRequests)} API requests / month`);
    if (l.monthlyWebhookDeliveries !== undefined) lines.push(unlimited(l.monthlyWebhookDeliveries) ? 'Unlimited webhook deliveries' : `${fmt(l.monthlyWebhookDeliveries)} webhook deliveries / month`);
    if (l.maxApiKeys > 0) lines.push(plural(l.maxApiKeys, 'API key', 'API keys'));
  }

  if (f.aiAutomation && cat !== 'whatsapp_api') {
    lines.push(unlimited(l.geminiTokensPerMonth) ? 'Unlimited AI auto-replies (Gemini)' : `AI auto-replies (Gemini), ${fmt(l.geminiTokensPerMonth)} AI tokens / month`);
  }

  if (cat !== 'enterprise_custom' && f.knowledgeBase && l.maxKbUploads !== undefined && l.maxKbUploads !== 0) {
    const pages = l.maxKbPdfPages > 0 ? `, up to ${fmt(l.maxKbPdfPages)} pages each` : '';
    lines.push(unlimited(l.maxKbUploads) ? 'Unlimited knowledge base PDFs' : `${plural(l.maxKbUploads, 'knowledge base PDF', 'knowledge base PDFs')}${pages}`);
  }

  if (cat === 'kwickbot_crm' && l.maxIntegrations) {
    lines.push(unlimited(l.maxIntegrations) ? 'Unlimited Shopify / WooCommerce stores' : `${plural(l.maxIntegrations, 'store', 'stores')} (Shopify or WooCommerce)`);
  }
  if (cat === 'crm_integration' && l.maxCrmConnections) {
    lines.push(unlimited(l.maxCrmConnections) ? 'Unlimited CRM connections' : plural(l.maxCrmConnections, 'CRM connection', 'CRM connections'));
  }

  const broadcastsOn = f.broadcasts || f.broadcastingAccess;
  const campaigns = l.maxBroadcastCampaigns;
  const messages = l.maxBroadcastMessages;
  if (broadcastsOn && campaigns !== 0 && messages !== 0 && cat !== 'whatsapp_api') {
    if (unlimited(campaigns) && unlimited(messages)) lines.push('Unlimited broadcasts');
    else {
      const parts = [];
      if (!unlimited(messages) && messages !== undefined) parts.push(`${fmt(messages)} messages`);
      if (campaigns !== undefined) parts.push(unlimited(campaigns) ? 'unlimited campaigns' : `${fmt(campaigns)} campaigns`);
      lines.push(`Broadcasts: ${parts.join(' & ')} / month`);
    }
  }
  return lines;
}

/** @returns {{ included: string[], excluded: string[] }} */
export function planHighlights(plan) {
  if (!plan) return { included: [], excluded: [] };
  const f = plan.features || {};
  const included = limitLines(plan);
  const excluded = [];
  for (const [flag, label] of FLAG_LINES[plan.category] || []) {
    if (f[flag] === true) {
      if (!included.includes(label)) included.push(label);
    } else if (f[flag] === false) {
      excluded.push(label);
    }
  }
  const l = plan.usageLimits || {};
  const f2 = plan.features || {};
  const hasBroadcastLine = included.some((line) => /broadcast/i.test(line));
  if (!hasBroadcastLine && (f2.broadcasts === false || l.maxBroadcastCampaigns === 0) && !['whatsapp_api', 'enterprise_custom'].includes(plan.category) && !excluded.includes('WhatsApp broadcasts')) {
    excluded.unshift('WhatsApp broadcasts');
  }
  if (plan.supportLevel) included.push(plan.supportLevel);
  return { included, excluded };
}

/** Cheapest first; contact-sales plans last */
export function sortPlans(plans) {
  return [...plans].sort((a, b) => {
    const ca = isContactSales(a) ? 1 : 0;
    const cb = isContactSales(b) ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return (a.monthlyPrice || 0) - (b.monthlyPrice || 0) || (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}

/** Short plain-text summary used by the website assistant */
export function plansAsText(plans) {
  const groups = {};
  for (const p of sortPlans(plans || [])) (groups[p.category] = groups[p.category] || []).push(p);
  const order = ['kwickbot_crm', 'crm_integration', 'whatsapp_api', 'enterprise_custom'];
  const out = [];
  for (const cat of order) {
    if (!groups[cat]) continue;
    out.push(`${CATEGORY_LABELS[cat] || cat} plans:`);
    for (const p of groups[cat]) {
      const price = isContactSales(p) ? 'custom pricing (talk to sales)' : `${formatINR(p.monthlyPrice, p.currency)} / month`;
      const setup = p.setupFee > 0 ? ` + ${formatINR(p.setupFee, p.currency)} one-time setup` : '';
      const top = planHighlights(p).included.slice(0, 4).join('; ');
      out.push(`• ${p.displayName}: ${price}${setup}. ${top}.`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}
