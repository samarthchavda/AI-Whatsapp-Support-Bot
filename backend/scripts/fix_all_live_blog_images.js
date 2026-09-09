const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');
require('dotenv').config();

const imageMapping = {
  'how-to-connect-meta-whatsapp-cloud-api-setup-guide': 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=80',
  'how-ai-whatsapp-agents-eliminate-rto-cash-on-delivery-profits': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
  '10-whatsapp-marketing-strategies-double-shopify-conversions-2026': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'how-24-7-ai-whatsapp-automation-transforms-customer-support': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'human-support-vs-ai-whatsapp-agents': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
  'meta-whatsapp-embedded-signup-v4-coexistence-guide': 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
  'how-to-run-whatsapp-web-and-ai-automation-together-whatsapp-coexistence': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'the-evolution-of-intelligence-from-ai-to-agi-and-asi': 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
  'streamlining-customer-support-the-power-of-whatsapp-embedded-signup-for-e-commerce': 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80',
  'the-art-of-whatsapp-coexistence-balancing-ai-chatbots-and-human-support-agents': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
  'how-multilingual-whatsapp-bots-help-indian-d2c-brands-scale-regionally': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
  'why-whatsapp-automation-is-the-ultimate-solution-for-abandoned-cart-recovery': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
  'introducing-custom-branding-and-enterprise-features-on-kwickbot-ai': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'how-to-integrate-gemini-ai-with-whatsapp-for-shopify-support': 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=1200&q=80',
  'a-guide-to-reducing-abandoned-carts-on-woocommerce-using-whatsapp': 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&w=1200&q=80',
  '5-ways-whatsapp-ai-automation-boosts-customer-satisfaction': 'https://images.unsplash.com/photo-1552581234-2612b75de6d6?auto=format&fit=crop&w=1200&q=80'
};

const todayPost = {
  title: "How WhatsApp Business Works: Combining WhatsApp Business API, AI Chatbots, and Mobile Apps",
  slug: "how-whatsapp-business-works-combining-api-ai-bots-and-mobile-app",
  summary: "Discover how WhatsApp Business operates for e-commerce brands, how the WhatsApp Cloud API powers 24/7 AI chatbots, and how businesses can seamlessly combine AI automation with mobile app access for live human agent support.",
  content: `
<p>WhatsApp has evolved from a basic messaging app into the most powerful customer communication channel for modern e-commerce brands. With over 2 billion active users globally and open rates exceeding 95%, businesses are rapidly scaling customer service, sales, and order updates directly on WhatsApp.</p>

<p>However, many merchants wonder: <strong>How does WhatsApp Business actually work? What is the difference between the mobile app and the WhatsApp Business API? And can you run automated AI chatbots while still managing customer replies on your phone?</strong></p>

<p>In this comprehensive guide, we unpack the mechanics of WhatsApp Business, how official WhatsApp Business API integration enables AI bot automation, and how Kwickbot seamlessly bridges automated AI support with mobile app and CRM capabilities.</p>

<hr />

<h3>1. Understanding the WhatsApp Ecosystem: Business App vs. Business API</h3>

<p>To understand how WhatsApp works for commercial operations, it helps to distinguish between the two primary business solutions offered by Meta:</p>

<h4>A. The Free WhatsApp Business Mobile App</h4>
<p>The standard WhatsApp Business App is designed for small local shops, freelancers, and single-owner businesses. It runs directly on a single mobile phone, allowing manual quick replies, basic business profile details, and manual product catalogs. However, it lacks enterprise AI automation, multi-agent access, and webhook integrations with Shopify or WooCommerce.</p>

<h4>B. The Official WhatsApp Business API (Cloud API)</h4>
<p>The <strong>WhatsApp Business API</strong> (hosted officially on Meta's Cloud API infrastructure) is built for growing e-commerce stores, medium businesses, and enterprises. Instead of locking messaging to a single phone, the API enables:</p>
<ul>
  <li><strong>24/7 AI Chatbot Automation:</strong> Automated resolution for order tracking, FAQ responses, and product inquiries.</li>
  <li><strong>Multi-Agent Team CRM:</strong> Multiple customer support representatives working simultaneously on a shared inbox console.</li>
  <li><strong>Direct E-commerce Sync:</strong> Webhook integrations with Shopify, WooCommerce, and custom databases to check live order status and process automated cancellations.</li>
  <li><strong>High-Volume Broadcast Campaigns:</strong> Sending Meta-approved promotional and transactional broadcasts to thousands of opt-in customers.</li>
</ul>

<hr />

<h3>2. How AI Chatbots Work on WhatsApp Business API</h3>

<p>When you connect your store to Kwickbot using the official WhatsApp Business API, your customer interaction flow transforms into an automated support engine:</p>

<ol>
  <li><strong>Incoming Customer Message:</strong> A customer sends a WhatsApp message asking, <em>"Where is my order #ORD-1024?"</em> or <em>"What is your refund policy?"</em></li>
  <li><strong>Webhook Event Trigger:</strong> Meta's Cloud API instantly sends the message payload to Kwickbot's backend infrastructure.</li>
  <li><strong>Knowledge Base & Inventory Inspection:</strong> Kwickbot inspects your store database (Shopify or WooCommerce) and trained PDF knowledge base files.</li>
  <li><strong>Gemini AI Generation:</strong> Powered by Google Gemini AI, Kwickbot constructs a precise, human-like response in under 2 seconds.</li>
  <li><strong>Automated Reply Delivery:</strong> The API delivers the answer back to the customer on WhatsApp with zero human delay.</li>
</ol>

<hr />

<h3>3. Mobile App Integration & Coexistence: Best of Both Worlds</h3>

<p>A common concern for merchants is: <strong>"If an AI bot handles my WhatsApp API, can my team still view messages or reply on mobile devices?"</strong></p>

<p>The answer is <strong>YES</strong>. Through Kwickbot's unified architecture and WhatsApp coexistence support, businesses don't have to choose between pure AI automation and mobile flexibility:</p>

<ul>
  <li><strong>Instant Mobile Notifications:</strong> When a customer requests a human agent or triggers an escalation rule (e.g. an angry customer or refund dispute), Kwickbot alerts support team members immediately.</li>
  <li><strong>Live Agent Handoff:</strong> When a human agent steps in to reply (either from a mobile-friendly CRM web portal or connected agent account), Kwickbot automatically pauses the AI bot for that customer. This prevents awkward bot interruptions while a human is conversing.</li>
  <li><strong>Full Conversation History:</strong> Human agents can review complete conversation logs, AI reply history, and customer order details before responding on their mobile device or desktop CRM console.</li>
  <li><strong>Automatic Bot Resume:</strong> Once the human agent resolves the issue and closes the ticket, AI coverage seamlessly resumes.</li>
</ul>

<hr />

<h3>4. Key Benefits of Combining WhatsApp API, AI Bots, and Mobile Handoff</h3>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left;">
  <thead>
    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
      <th style="padding: 12px;">Feature</th>
      <th style="padding: 12px;">WhatsApp Mobile App Only</th>
      <th style="padding: 12px;">Kwickbot AI + WhatsApp API</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px;"><strong>Response Time</strong></td>
      <td style="padding: 12px;">Minutes to Hours (manual)</td>
      <td style="padding: 12px;"><strong>Under 2 Seconds (24/7 AI)</strong></td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px;"><strong>Order Tracking</strong></td>
      <td style="padding: 12px;">Manual copy-paste lookups</td>
      <td style="padding: 12px;"><strong>Automated Live Sync (Shopify/Woo)</strong></td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px;"><strong>AI Training</strong></td>
      <td style="padding: 12px;">None (manual templates)</td>
      <td style="padding: 12px;"><strong>PDF Knowledge Base training</strong></td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px;"><strong>Human Escalation</strong></td>
      <td style="padding: 12px;">Single phone limited</td>
      <td style="padding: 12px;"><strong>Smart Auto-Pause & Multi-Agent CRM</strong></td>
    </tr>
  </tbody>
</table>

<hr />

<h3>5. How to Get Started with Kwickbot AI</h3>

<p>Setting up your automated WhatsApp AI assistant with Kwickbot takes less than 10 minutes:</p>

<ol>
  <li><strong>Sign Up for Kwickbot:</strong> Create your account and choose a plan tailored to your conversation volume (Starter, Growth, or Scale).</li>
  <li><strong>Link Your Store:</strong> Connect your Shopify or WooCommerce store in 1 click.</li>
  <li><strong>Connect WhatsApp:</strong> Connect your official WhatsApp Business account via Meta Embedded Signup or web option.</li>
  <li><strong>Upload Your PDF Knowledge Base:</strong> Feed your store return policies, FAQs, and product guides so the AI answers accurately in your brand voice.</li>
  <li><strong>Go Live:</strong> Turn on AI auto-replies, monitor real-time chats, and let your team step in whenever needed!</li>
</ol>
`.trim(),
  coverImage: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=80",
  tags: ["WhatsApp Business", "WhatsApp API", "AI Chatbot", "Mobile App", "Kwickbot", "E-commerce"],
  status: "published",
  author: "Kwickbot Team"
};

async function fixImages() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    const superAdmin = await Admin.findOne({ role: 'super_admin' }) || await Admin.findOne();
    const adminId = superAdmin ? superAdmin._id : null;

    // 1. Update coverImage for all existing posts matching slugs
    for (const [slug, imgUrl] of Object.entries(imageMapping)) {
      const res = await BlogPost.updateOne({ slug }, { $set: { coverImage: imgUrl } });
      if (res.matchedCount > 0) {
        console.log(`✅ Updated coverImage for: ${slug}`);
      }
    }

    // 2. Ensure today's blog post exists and has current date
    const todayRes = await BlogPost.updateOne(
      { slug: todayPost.slug },
      { $set: { ...todayPost, createdBy: adminId, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
    console.log('✅ Updated / created today\'s post with current timestamp!');

    console.log('\n🎉 Done updating all blog cover images!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing images:', err);
    process.exit(1);
  }
}

fixImages();
