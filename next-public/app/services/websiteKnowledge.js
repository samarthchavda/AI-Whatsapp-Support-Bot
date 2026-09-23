/**
 * Official Kwickbot Public Website Knowledge Base & AI Assistant Query Matcher
 */

const WEBSITE_KNOWLEDGE = {
  overview: {
    title: "What is Kwickbot",
    content: `Kwickbot is an AI-powered WhatsApp customer support and automation platform designed specifically for e-commerce businesses.

Key capabilities include:
• Automate customer support 24/7 on WhatsApp
• Connect Shopify or WooCommerce stores seamlessly
• Train the AI using your store's PDF knowledge-base documents
• Answer store FAQs, return policies, and product queries automatically
• Track order status, shipping details, and process automated cancellations
• Recover abandoned shopping carts with automated WhatsApp reminders
• Send targeted WhatsApp bulk broadcast campaigns
• Automatically escalate complex queries to human agents in a live chat CRM
• Monitor customer conversations, resolution rates, and support analytics`
  },

  howItWorks: {
    title: "How Kwickbot Works",
    content: `Here is how Kwickbot works in 7 simple steps:

1. Connect your Shopify or WooCommerce store to sync live order feeds.
2. Connect your WhatsApp Business account (via official WhatsApp Cloud API or Web connection).
3. Upload PDF documents (FAQs, return policies, shipping guides) to train your AI knowledge base.
4. The AI automatically answers customer questions 24/7 with human-like precision.
5. Handles order tracking, shipping status, and automated support workflows.
6. Complex or angry conversations automatically hand over to a live human agent with full context.
7. Support managers monitor real-time chats, resolution rates, and analytics from the dashboard.`
  },

  services: {
    title: "Kwickbot Services",
    content: `Kwickbot provides end-to-end support automation services:

• Gemini AI Fine-Tuning & Knowledge Base Setup (PDF ingestion & brand voice training)
• WhatsApp Business API & Meta Account Verification assistance
• Shopify, WooCommerce & Custom ERP/CRM API Synchronizations
• Smart Agent Handoff & Escalation Rule Configurations
• Official WhatsApp Template Message Design & Approval Setup
• Custom Branding & Enterprise Support Suite Deployment`
  },

  shopifyIntegration: {
    title: "Shopify Integration",
    content: `Kwickbot integrates directly with Shopify via secure API credentials and real-time webhooks.

Shopify integration features:
• Automated order confirmation and tracking messages via WhatsApp
• Real-time order status inquiries (customers type order # to check delivery)
• Automated abandoned checkout recovery reminders with custom discount links
• Cancellation request handling directly through WhatsApp
• Automatic order tagging and sync back to Shopify Admin`
  },

  wooCommerceIntegration: {
    title: "WooCommerce Integration",
    content: `Kwickbot provides 1-click WooCommerce store synchronization using REST API keys and webhooks.

WooCommerce integration features:
• Real-time order creation and status webhooks
• Order tracking lookup by order ID or customer phone number
• Automated abandoned cart recovery sequences via WhatsApp
• Instant sync of customer contact details and order histories`
  },

  whatsappConnection: {
    title: "WhatsApp Connection Options",
    content: `Kwickbot supports official WhatsApp connections for your business:

1. Official WhatsApp Cloud API (Recommended):
   • Connect using Meta Embedded Signup in under 10 minutes
   • Enables high-volume broadcasting, template messages, and interactive buttons
   • Verified green checkmark badge application support
   • Coexistence: Run mobile WhatsApp Business App and Cloud API simultaneously on the same number

2. WhatsApp Web Connection:
   • Scan QR code to connect existing mobile WhatsApp Business number
   • Instant setup with zero Meta verification required`
  },

  aiTraining: {
    title: "AI Training & Knowledge Base",
    content: `Training your Kwickbot AI assistant is quick and requires no coding:

1. Upload PDF files containing your store's FAQs, return policies, and sizing charts.
2. Enter custom text instructions or public website URLs.
3. Kwickbot's Gemini AI ingests and indexes the knowledge base.
4. The AI answers customer queries matching your exact store policies in real-time.`
  },

  humanHandoff: {
    title: "Human Agent Handoff & Helpdesk",
    content: `Kwickbot includes an intelligent automated human takeover mechanism:

• If a customer asks for a human agent or shows high frustration, AI auto-replies pause automatically.
• The conversation escalates to the Live Chat CRM dashboard.
• Support agents receive real-time notifications with full chat history and customer details.
• Agents can chat directly with the customer and re-enable AI automation when done.`
  },

  orderTracking: {
    title: "Order Tracking & E-Commerce Support",
    content: `Kwickbot connects directly to your store order database to automate post-purchase support:

• Customers send their order ID or phone number to check shipping status
• The bot fetches live tracking details (carrier name, tracking link, ETA)
• Handles pre-purchase questions (materials, sizing, availability)
• Processes automated cancellation requests according to store policy`
  },

  abandonedCart: {
    title: "Abandoned Cart Recovery",
    content: `Recover up to 25% of abandoned checkouts with WhatsApp automation:

• Detect abandoned checkouts in real-time via Shopify/WooCommerce webhooks
• Send personalized WhatsApp reminders 30 minutes after abandonment
• Offer dynamic coupon codes and 1-click checkout links
• 98% open rate significantly outperforms traditional email recovery`
  },

  broadcasts: {
    title: "WhatsApp Marketing & Bulk Broadcasts",
    content: `Drive repeat purchases with targeted WhatsApp broadcasts:

• Send bulk marketing campaigns to opted-in customer contact lists
• Use Meta-approved rich media templates (images, videos, PDF catalogs)
• Include interactive call-to-action (CTA) and quick-reply buttons
• Analyze real-time delivery, read rates, and customer responses`
  },

  pricingOverview: {
    title: "Kwickbot Pricing Plans",
    content: `Kwickbot offers 3 straightforward monthly plans based on support volume:

1. Starter Plan ($29 / month):
   • Up to 1,000 WhatsApp Broadcast Messages / month
   • Google Gemini 2.5 AI Auto-Replies included
   • 1 Store Connection (Shopify or WooCommerce)
   • PDF Knowledge Base Training (Up to 5 documents)
   • Standard Live Chat Inbox Access
   • Standard Email Support

2. Growth Plan ($79 / month):
   • Up to 10,000 WhatsApp Broadcast Messages / month
   • Unlimited Gemini AI Auto-Replies
   • Up to 3 Store Connections
   • Unlimited PDF & Text Knowledge Base Training
   • Advanced Human Handoff & Escalations
   • Abandoned Cart Recovery Sequences
   • Priority Support

3. Scale Plan ($199 / month):
   • Unlimited WhatsApp Broadcast Campaigns
   • White-Labeling (Remove Kwickbot branding & add custom logo)
   • Unlimited Store Connections & Custom API Integrations
   • Dedicated Account Manager & Custom AI Fine-Tuning
   • 24/7 SLA Support`
  },

  noHiddenFees: {
    title: "Hidden Fees Policy",
    content: `There are NO hidden fees or extra subscription charges from Kwickbot!
Meta WhatsApp conversation charges (if applicable) are paid directly to Meta at official wholesale rates with zero markup from Kwickbot.`
  },

  bookDemo: {
    title: "Book a Demo",
    content: `Ready to see Kwickbot in action?
You can book a live 1-on-1 personalized demo with our engineering team at https://kwickbot.in/book-demo or by clicking the 'Book Demo' button.`
  },

  contactInfo: {
    title: "Contact Kwickbot Team",
    content: `You can reach the Kwickbot team anytime:
• Email: hello@kwickbot.in
• Phone: +91 8128420287
• Live Demo: https://kwickbot.in/book-demo
• Location: India`
  }
};

export function getGroundedWebsiteAnswer(userQuery) {
  const q = (userQuery || '').toLowerCase().trim();
  if (!q) {
    return "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team.";
  }

  // 1. Pricing / Cost / Plans
  if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('plan') || q.includes('rate') || q.includes('charge') || q.includes('fee')) {
    if (q.includes('hidden') || q.includes('extra') || q.includes('markup')) {
      return WEBSITE_KNOWLEDGE.noHiddenFees.content;
    }
    return WEBSITE_KNOWLEDGE.pricingOverview.content;
  }

  // 2. How it works / Steps
  if (q.includes('how it work') || q.includes('how does it work') || q.includes('how to start') || q.includes('step') || q.includes('process')) {
    return WEBSITE_KNOWLEDGE.howItWorks.content;
  }

  // 3. What is Kwickbot / About
  if (q.includes('what is kwickbot') || q.includes('who are you') || q.includes('about kwickbot') || q.includes('overview') || q.includes('what do you do') || q.includes('feature') || q.includes('capability')) {
    return WEBSITE_KNOWLEDGE.overview.content;
  }

  // 4. Shopify Integration
  if (q.includes('shopify')) {
    return WEBSITE_KNOWLEDGE.shopifyIntegration.content;
  }

  // 5. WooCommerce Integration
  if (q.includes('woocommerce') || q.includes('woocomerce') || q.includes('wp')) {
    return WEBSITE_KNOWLEDGE.wooCommerceIntegration.content;
  }

  // 6. WhatsApp Connection / Meta / API / Cloud API / Coexistence
  if (q.includes('whatsapp connection') || q.includes('meta') || q.includes('cloud api') || q.includes('qr code') || q.includes('number') || q.includes('connect whatsapp') || q.includes('coexistence')) {
    return WEBSITE_KNOWLEDGE.whatsappConnection.content;
  }

  // 7. AI Training / Knowledge Base / PDF
  if (q.includes('pdf') || q.includes('train') || q.includes('knowledge') || q.includes('document') || q.includes('faq')) {
    return WEBSITE_KNOWLEDGE.aiTraining.content;
  }

  // 8. Human Handoff / Escalation / Support Agent
  if (q.includes('human') || q.includes('handoff') || q.includes('escalat') || q.includes('agent') || q.includes('live chat') || q.includes('takeover')) {
    return WEBSITE_KNOWLEDGE.humanHandoff.content;
  }

  // 9. Order Tracking / Shipping / Delivery
  if (q.includes('order') || q.includes('track') || q.includes('shipping') || q.includes('delivery') || q.includes('cancel')) {
    return WEBSITE_KNOWLEDGE.orderTracking.content;
  }

  // 10. Abandoned Cart
  if (q.includes('cart') || q.includes('abandon') || q.includes('checkout') || q.includes('recovery')) {
    return WEBSITE_KNOWLEDGE.abandonedCart.content;
  }

  // 11. Broadcast / Marketing / Bulk
  if (q.includes('broadcast') || q.includes('bulk') || q.includes('campaign') || q.includes('marketing') || q.includes('template')) {
    return WEBSITE_KNOWLEDGE.broadcasts.content;
  }

  // 12. Services
  if (q.includes('service') || q.includes('offer') || q.includes('provide')) {
    return WEBSITE_KNOWLEDGE.services.content;
  }

  // 13. Book Demo
  if (q.includes('demo') || q.includes('book') || q.includes('trial') || q.includes('schedule')) {
    return WEBSITE_KNOWLEDGE.bookDemo.content;
  }

  // 14. Contact / Email / Phone
  if (q.includes('contact') || q.includes('email') || q.includes('phone') || q.includes('support number') || q.includes('reach') || q.includes('address')) {
    return WEBSITE_KNOWLEDGE.contactInfo.content;
  }

  // Fallback Rule
  return "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team.";
}
