/**
 * Official Kwickbot Public Website Knowledge Base & AI Assistant Query Matcher
 * 
 * Strict Grounding Rules:
 * 1. ONLY answer from public website content, approved pricing plans, and public FAQs.
 * 2. NEVER invent features, pricing, or internal capabilities.
 * 3. Fallback when info is unavailable:
 *    "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team."
 * 4. Keep answers friendly, professional, concise (2-5 sentences), and use bullet points for feature lists.
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
• Conversational Resolution Rate Audits & Prompt Optimization`
  },

  shopifyIntegration: {
    title: "Shopify Integration",
    content: `Kwickbot integrates directly with Shopify via secure API credentials and real-time webhooks.

How it helps your store:
• Automatically syncs order updates, tracking info, and checkout creations
• Answers customer queries about order status and delivery updates instantly
• Enables automated order cancellations directly via WhatsApp
• Trigger abandoned cart recovery messages when checkouts are left incomplete`
  },

  woocommerceIntegration: {
    title: "WooCommerce Integration",
    content: `Kwickbot provides 1-click WooCommerce store synchronization using REST API keys and webhooks.

Key features for WooCommerce stores:
• Real-time synchronization of order feeds, status changes, and customer details
• Automated answers for order tracking, shipping windows, and stock inquiries
• Automated Cash on Delivery (COD) confirmation and cancellation workflows
• Live Chat CRM handoff when customers request human assistance`
  },

  whatsappConnection: {
    title: "WhatsApp Connection",
    content: `Kwickbot supports official WhatsApp connections for your business:

• Official WhatsApp Cloud API: Connect your Meta Business Manager account for enterprise-grade throughput and green-tick verification support.
• Web Connection Option: Fast QR-code scan setup for smaller operations.

Both methods allow 24/7 AI coverage, automated replies, and live chat CRM support.`
  },

  aiTraining: {
    title: "AI Chatbot Training & Knowledge Base",
    content: `Training your Kwickbot AI assistant is quick and requires no coding:

• Upload PDF documents containing store FAQs, shipping guides, return policies, or product catalogs.
• The AI instantly ingests the documents into a secure vector knowledge base.
• It uses Google Gemini AI to answer customer questions strictly grounded in your store policies.
• Allowed PDF uploads depend on your plan (1 PDF on Starter, 3 PDFs on Growth, Unlimited on Scale).`
  },

  humanHandoff: {
    title: "Live Chat Handoff & Escalations",
    content: `Kwickbot includes an intelligent automated human takeover mechanism:

• When a customer expresses frustration, asks for a human agent, or triggers escalation rules (like refund requests), the bot automatically pauses.
• The conversation is immediately flagged in your Live Chat CRM dashboard.
• Human support agents receive alerts with full conversation history to take over seamlessly.`
  },

  orderTracking: {
    title: "Order Tracking & Cancellations",
    content: `Kwickbot connects directly to your store order database to automate post-purchase support:

• Customers can ask "Where is my order?" and get live tracking details instantly.
• On Growth and Scale plans, customers can request automated order cancellations directly over WhatsApp.
• Confirms Cash on Delivery (COD) orders automatically to reduce Return-to-Origin (RTO).`
  },

  abandonedCart: {
    title: "Abandoned Cart Recovery",
    content: `Recover lost sales automatically on WhatsApp:

• Listens to incomplete store checkouts in real-time.
• Sends timely, friendly WhatsApp reminders to customers with their cart details and direct checkout links.
• Helps boost e-commerce conversion rates by converting abandoned checkouts into completed sales.`
  },

  broadcasts: {
    title: "WhatsApp Broadcast Messaging",
    content: `Send bulk promotional campaigns and transactional notifications:

• Included in Growth (5,000 messages & 10 campaigns/mo) and Scale (25,000 messages & unlimited campaigns/mo) plans.
• Design Meta-approved template messages with action buttons.
• Audience segmentation and scheduled campaign delivery.
• Real-time delivery, read rate, and reply analytics dashboard.`
  },

  analytics: {
    title: "Analytics Dashboard",
    content: `Gain actionable insights into your support operations (Included in Growth & Scale plans):

• Real-time resolution rates (typically 80%+ resolved by AI).
• Total WhatsApp conversations and message volume metrics.
• Response time benchmarking (median 1.8s reply speed).
• Conversation logs, sentiment analysis, and escalation audit reports.`
  },

  pricingOverview: {
    title: "Kwickbot Pricing Plans",
    content: `Kwickbot offers 3 straightforward monthly plans based on support volume:

💰 STARTER — ₹1,499/month
• Up to 500 WhatsApp Conversations/mo (2,000 messages)
• 1 Active WhatsApp Connection & 1 PDF Knowledge Base upload
• 1 Store Integration (Shopify OR WooCommerce) + Live Chat CRM
• No Broadcasting, no advanced analytics, no live escalation handoffs

🚀 GROWTH — ₹2,999/month (Best Fit)
• Up to 3,000 WhatsApp Conversations/mo (15,000 messages)
• 2 Active WhatsApp Connections & 3 PDF Knowledge Base uploads
• 1 Store Integration (Shopify OR WooCommerce)
• WhatsApp Broadcasting (5,000 messages & 10 campaigns/mo)
• Advanced Analytics, Live Chat Handoff, Order Cancellations & Priority Support

⚡ SCALE — ₹9,999/month
• Unlimited WhatsApp Conversations & Messages
• 5 Active WhatsApp Connections & Unlimited PDF KB uploads
• Multiple Store Integrations (Shopify & WooCommerce both)
• WhatsApp Broadcasting (25,000 messages & Unlimited campaigns/mo)
• Custom Branding (White-Labeling), Developer API & Webhooks`
  },

  planRecommendationSmall: {
    title: "Plan Recommendation for Small Store",
    content: `For a small e-commerce store just starting out, the STARTER plan (₹1,499/month) is the best choice!

Why it's ideal:
• Covers up to 500 WhatsApp conversations and 2,000 messages per month.
• Includes 1 store integration (Shopify or WooCommerce) and 1 WhatsApp connection.
• Allows 1 PDF Knowledge Base upload to automate your store FAQs 24/7.
• As your order volume grows, you can easily upgrade to Growth for broadcasting and live handoff.`
  },

  extraCharges: {
    title: "Extra & Hidden Charges",
    content: `There are NO hidden fees or extra subscription charges from Kwickbot!

Important details:
• If you use the official WhatsApp Cloud API, Meta charges directly per conversation (typically ~$0.008 to $0.015 depending on the destination country).
• First-Time Offer: Get 60% off your first month on any plan using coupon code NEW15 inside your dashboard!`
  },

  bookDemo: {
    title: "Book a Demo",
    content: `Ready to see Kwickbot in action?

• You can book a personalized demo by visiting the /book-demo page or clicking the "Book demo" button.
• Fill out your business details, and our team will contact you within 24 hours to schedule a strategy call and set up your bot!`
  },

  supportContact: {
    title: "Support & Contact Information",
    content: `You can reach the Kwickbot team anytime:

• Email: hello@kwickbot.in
• Phone / WhatsApp: +91 8128420287
• Hours: 24/7 AI coverage with human support available for assistance.`
  }
};

/**
 * Evaluates a user query against public website knowledge base rules
 * Returns a grounded answer string or the standard out-of-scope fallback.
 */
export function getGroundedWebsiteAnswer(userQuery) {
  if (!userQuery || typeof userQuery !== 'string') {
    return "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team.";
  }

  const q = userQuery.toLowerCase().trim();

  // 1. Strict Exclusion Pre-checks for Security & Private Systems
  const privateKeywords = [
    'token', 'secret', 'password', 'api key', 'super admin', 'system health',
    'database', 'mongodb', 'access token', 'env', 'environment variable',
    'admin email', 'bearer', 'razorpay secret', 'jwt'
  ];
  if (privateKeywords.some(keyword => q.includes(keyword))) {
    return "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team.";
  }

  // 2. Demo Booking
  if (q.includes('demo') || q.includes('book') || q.includes('schedule') || q.includes('strategy call') || q.includes('contact sales')) {
    return WEBSITE_KNOWLEDGE.bookDemo.content;
  }

  // 3. What is Kwickbot / About
  if (q.includes('what is kwickbot') || q.includes('about kwickbot') || (q.includes('what') && q.includes('kwickbot') && !q.includes('work') && !q.includes('cost') && !q.includes('price'))) {
    return WEBSITE_KNOWLEDGE.overview.content;
  }

  // 4. How It Works
  if (q.includes('how does it work') || q.includes('how it works') || q.includes('how kwickbot works') || (q.includes('how') && q.includes('work')) || q.includes('working flow') || q.includes('setup flow')) {
    return WEBSITE_KNOWLEDGE.howItWorks.content;
  }

  // 5. Services Provided
  if (q.includes('service') || q.includes('what do you provide') || q.includes('what services') || q.includes('offerings')) {
    return WEBSITE_KNOWLEDGE.services.content;
  }

  // 6. Shopify Integration
  if (q.includes('shopify')) {
    return WEBSITE_KNOWLEDGE.shopifyIntegration.content;
  }

  // 7. WooCommerce Integration
  if (q.includes('woocommerce') || q.includes('woo')) {
    return WEBSITE_KNOWLEDGE.woocommerceIntegration.content;
  }

  // 8. WhatsApp API / Connection
  if (q.includes('whatsapp cloud api') || q.includes('meta business') || q.includes('whatsapp connect') || q.includes('connection option') || q.includes('qr scan')) {
    return WEBSITE_KNOWLEDGE.whatsappConnection.content;
  }

  // 9. Knowledge Base & AI Training
  if (q.includes('train') || q.includes('pdf') || q.includes('knowledge base') || q.includes('documents') || q.includes('ingest')) {
    return WEBSITE_KNOWLEDGE.aiTraining.content;
  }

  // 10. Live Chat Handoff / Human Agent / Escalations
  if (q.includes('handoff') || q.includes('human') || q.includes('agent') || q.includes('escalat') || q.includes('takeover') || q.includes('angry')) {
    return WEBSITE_KNOWLEDGE.humanHandoff.content;
  }

  // 11. Order Tracking & Cancellations
  if (q.includes('track') || q.includes('order') || q.includes('cancel') || q.includes('shipping') || q.includes('cod')) {
    return WEBSITE_KNOWLEDGE.orderTracking.content;
  }

  // 12. Abandoned Cart Recovery
  if (q.includes('cart') || q.includes('abandoned') || q.includes('recovery') || q.includes('checkout')) {
    return WEBSITE_KNOWLEDGE.abandonedCart.content;
  }

  // 13. Broadcasting / Bulk Messages
  if (q.includes('broadcast') || q.includes('bulk') || q.includes('campaign') || q.includes('promot')) {
    return WEBSITE_KNOWLEDGE.broadcasts.content;
  }

  // 14. Analytics
  if (q.includes('analytic') || q.includes('metric') || q.includes('report') || q.includes('resolution rate') || q.includes('stat')) {
    return WEBSITE_KNOWLEDGE.analytics.content;
  }

  // 15. Plan recommendation for small store
  if ((q.includes('small store') || q.includes('starter store') || q.includes('which plan') || q.includes('best plan')) && (q.includes('small') || q.includes('start'))) {
    return WEBSITE_KNOWLEDGE.planRecommendationSmall.content;
  }

  // 16. Starter Plan specific
  if (q.includes('starter plan') || q.includes('starter tier') || q.includes('what is included in starter')) {
    return `💰 STARTER PLAN — ₹1,499/month
• Up to 500 WhatsApp Conversations/month (2,000 messages)
• 1 Active WhatsApp Connection & 1 PDF Knowledge Base upload
• 1 Store Integration (Shopify OR WooCommerce)
• Knowledge Base Retrieval & Live Chat CRM console
• Ideal for small e-commerce stores validating AI support!`;
  }

  // 17. Growth Plan specific
  if (q.includes('growth plan') || q.includes('growth tier') || q.includes('what is included in growth')) {
    return `🚀 GROWTH PLAN — ₹2,999/month (Recommended)
• Up to 3,000 WhatsApp Conversations/month (15,000 messages)
• Up to 2 Active WhatsApp Connections & 3 PDF Knowledge Base uploads
• 1 Store Integration (Shopify OR WooCommerce)
• WhatsApp Broadcasting (5,000 messages & 10 campaigns/mo)
• Advanced Analytics Dashboard & Live Chat Handoff Escalations
• Automated Order Cancellations & Priority Email/Chat Support`;
  }

  // 18. Scale Plan specific
  if (q.includes('scale plan') || q.includes('scale tier') || q.includes('what is included in scale')) {
    return `⚡ SCALE PLAN — ₹9,999/month
• Unlimited WhatsApp Conversations & Messages
• Up to 5 Active WhatsApp Connections & Unlimited PDF KB uploads
• Multiple Store Integrations (Shopify & WooCommerce both)
• WhatsApp Broadcasting (25,000 messages & Unlimited campaigns/mo)
• Custom Branding (White-Labeling console with your logo & name)
• Developer API & Webhooks Access + Premium Support`;
  }

  // 19. Pricing / Costs / Plans general
  if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('plan') || q.includes('rate') || q.includes('charge')) {
    if (q.includes('extra') || q.includes('hidden') || q.includes('meta')) {
      return WEBSITE_KNOWLEDGE.extraCharges.content;
    }
    return WEBSITE_KNOWLEDGE.pricingOverview.content;
  }

  // 20. Support / Contact / Email
  if (q.includes('contact') || q.includes('email') || q.includes('phone') || q.includes('support') || q.includes('help')) {
    return WEBSITE_KNOWLEDGE.supportContact.content;
  }

  // Standard Fallback when information is not in the public knowledge base
  return "I don't have that information on the website yet. I can help you book a demo or connect you with the Kwickbot team.";
}
