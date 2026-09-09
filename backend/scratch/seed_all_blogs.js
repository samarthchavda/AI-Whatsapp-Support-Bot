const mongoose = require('mongoose');

const blogPostsData = [
  {
    title: 'How WhatsApp Business Works: Combining WhatsApp Business API, AI Chatbots, and Mobile Apps',
    slug: 'how-whatsapp-business-works-combining-api-ai-bots-and-mobile-app',
    summary: 'Explore how modern e-commerce brands combine the official WhatsApp Business API, intelligent AI support chatbots, and native mobile apps to deliver instant 24/7 customer service.',
    content: `<h3>The Evolution of WhatsApp for Business Communication</h3>
<p>Over 2 billion active users rely on WhatsApp daily. For modern e-commerce merchants, turning WhatsApp into a core sales and customer support channel is no longer optional—it is essential.</p>

<p>However, many business owners get confused between the <strong>WhatsApp Business Mobile App</strong> and the <strong>WhatsApp Business API</strong>. Understanding how these tools work together with <strong>AI Chatbots</strong> is the secret to scaling customer engagement without increasing support overhead.</p>

<h3>1. The WhatsApp Business Mobile App vs. WhatsApp Business API</h3>
<p>The standard <strong>WhatsApp Business App</strong> (available on iOS and Android) is designed for small local shops. It allows manual chat management, basic quick replies, and simple business profiles on a single device. However, it cannot handle thousands of customer queries, automated order tracking, or AI-powered instant responses.</p>

<p>The <strong>WhatsApp Business Cloud API</strong> is built for scaling businesses. It enables multi-agent team inboxes, automated template notifications, Shopify/WooCommerce catalog integration, and custom AI chatbot connections.</p>

<h3>2. Supercharging Customer Service with AI Chatbots</h3>
<p>When you connect Kwickbot AI to your WhatsApp Cloud API, customer messages are analyzed in real time by AI models. The bot understands complex customer inquiries such as <em>"Where is my order?", "Can I exchange size L for XL?", "What is your refund timeline?"</em> and responds within seconds based on your store's Knowledge Base.</p>

<h3>3. Seamless Human Handoff via Mobile App & Live Chat</h3>
<p>What happens when a customer needs human assistance? Kwickbot automatically routes high-priority conversations to your human agents. Your team can reply directly from the Kwickbot live chat inbox or integrated mobile app, ensuring no customer inquiry ever gets missed.</p>

<h3>Start Automating Your WhatsApp Support Today</h3>
<p>Combine the power of Meta's WhatsApp API with Kwickbot AI to reduce support tickets by 80% while increasing sales conversion rates.</p>`,
    coverImage: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?q=80&w=1200&auto=format&fit=crop',
    tags: ['WhatsApp API', 'AI Chatbot', 'Mobile Apps', 'Customer Support'],
    status: 'published',
    author: 'Kwickbot Team'
  },
  {
    title: 'Why WhatsApp Automation is the Ultimate Solution for Abandoned Cart Recovery',
    slug: 'why-whatsapp-automation-is-the-ultimate-solution-for-abandoned-cart-recovery',
    summary: 'Discover how automated WhatsApp support chats are outperforming traditional emails for cart recovery, helping online brands recover up to 25% of lost checkouts.',
    content: `<h3>The Challenge of Cart Abandonment in E-Commerce</h3>
<p>Every e-commerce store owner shares the same frustration: a visitor browses the store, adds high-value items to their shopping cart, goes to the checkout page, and then—disappears. Statistically, over <strong>70% of shopping carts are abandoned</strong> before checkout completion.</p>

<p>For years, the standard solution has been email retargeting. However, in today's crowded digital space, email open rates have dropped below 20%, and click-through rates are even lower. E-commerce merchants need a faster, more direct channel to win back customers.</p>

<h3>1. Why WhatsApp is Outperforming Traditional Recovery Channels</h3>
<p>WhatsApp boasts an incredible <strong>98% open rate</strong>, and over 90% of messages are read within 3 minutes of receipt. By shifting your recovery strategy from email to WhatsApp, you reach customers where they are already active and responsive.</p>

<h3>2. Dynamic Checkout and Automated Reminders</h3>
<p>Kwickbot AI connects directly to your Shopify or WooCommerce store to detect abandoned carts in real-time. Instead of a generic email, Kwickbot sends a personalized WhatsApp reminder containing a direct checkout link. Customers can complete their purchase with a single tap, bypassing the friction of manual log-ins.</p>

<h3>3. Clearing Pre-Purchase Doubts Instantly</h3>
<p>Often, customers abandon checkouts due to sudden questions: <em>"Is shipping free?", "What is the return policy?", "Can I pay Cash on Delivery (COD)?"</em>. With Kwickbot's automated AI responder, the customer can simply reply to the cart reminder on WhatsApp, and the AI answers their questions in under 2 seconds. This clears hesitation and drives instant conversion.</p>

<h3>Ready to Recover Your Lost Sales?</h3>
<p>Activate the Abandoned Carts integration inside your Kwickbot dashboard today. Map your automated cart recovery templates, customize the delay settings, and watch your recovery rate soar up to 25%.</p>`,
    coverImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
    tags: ['Cart Recovery', 'WhatsApp Automation', 'E-commerce Tips', 'Customer Support'],
    status: 'published',
    author: 'Kwickbot Team'
  },
  {
    title: 'Streamlining Customer Support: The Power of WhatsApp Embedded Signup for E-Commerce',
    slug: 'streamlining-customer-support-the-power-of-whatsapp-embedded-signup-for-e-commerce',
    summary: 'Learn how the new WhatsApp Embedded Signup SDK enables e-commerce merchants to link their business accounts in a single click, automating billing and onboarding.',
    content: `<h3>Why Onboarding Speed Matters for Scaling Merchants</h3>
<p>In e-commerce, time is money. Getting your automated customer support bot, transactional order confirmations, and marketing broadcasts live quickly can be the difference between capturing a sale or losing it to a competitor.</p>

<p>Historically, connecting a business WhatsApp number to an AI support platform involved manual, tedious steps: creating a developer app on Meta, copying Access Tokens, and setting up webhook endpoints. To eliminate this friction, Kwickbot is introducing support for Meta's <strong>WhatsApp Embedded Signup SDK</strong>.</p>

<h3>1. One-Click Verification and Onboarding</h3>
<p>With the Embedded Signup flow, merchants no longer need to navigate the Meta Developer dashboard or copy-paste long authentication keys. By simply clicking a single "Connect with Facebook" button inside the Kwickbot dashboard, a secure Meta Login popup appears. The user logs in, verifies their business phone number, and Kwickbot automates the rest of the connection in the background.</p>

<h3>2. Direct Billing with Meta</h3>
<p>One of the largest benefits of Embedded Signup is transparent pricing. By completing onboarding directly inside the Meta popup, store owners link their credit card directly to their Meta Business Account. Meta bills the store owner directly for template message costs at official standard rates. Kwickbot doesn't charge per message, ensuring you get the most cost-effective rates directly from source.</p>

<h3>3. Instant Access to Pre-Approved WhatsApp Templates</h3>
<p>Once connected via Embedded Signup, your verified templates (such as Abandoned Cart alerts or Order Confirmed notifications) are instantly pulled into your Kwickbot dashboard. You can begin sending broadcast marketing templates and setting up automated workflows immediately.</p>

<h3>Boost Your Store Support Today</h3>
<p>The WhatsApp Embedded Signup integration is coming to all Kwickbot dashboard users in our next update. Prepare your Meta Business Account today and unlock instant customer engagement.</p>`,
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
    tags: ['Embedded Signup', 'WhatsApp API', 'Customer Support', 'Shopify Tips'],
    status: 'published',
    author: 'Kwickbot Team'
  }
];

async function seed() {
  const dbNames = ['whatsapp-bot', 'whatsapp_support_bot', 'whatsapp-support'];

  for (const dbName of dbNames) {
    console.log(`\nProcessing database: ${dbName}`);
    try {
      const conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`).asPromise();
      const BlogPost = conn.model('BlogPost', new mongoose.Schema({}, { strict: false }), 'blogposts');
      const Admin = conn.model('Admin', new mongoose.Schema({}, { strict: false }), 'admins');
      
      const adminDoc = await Admin.findOne();
      const adminId = adminDoc ? adminDoc._id : new mongoose.Types.ObjectId('6a30e56cca64bf07ffdb1502');

      for (const item of blogPostsData) {
        const existing = await BlogPost.findOne({ slug: item.slug });
        if (existing) {
          await BlogPost.updateOne({ slug: item.slug }, { $set: { ...item, createdBy: adminId, updatedAt: new Date() } });
          console.log(`  Updated: [${item.slug}]`);
        } else {
          await BlogPost.create({ ...item, createdBy: adminId, createdAt: new Date(), updatedAt: new Date() });
          console.log(`  Created: [${item.slug}]`);
        }
      }
      const count = await BlogPost.countDocuments({ status: 'published' });
      console.log(`  Total published blog posts in ${dbName}: ${count}`);
      await conn.close();
    } catch (err) {
      console.error(`Error in ${dbName}:`, err.message);
    }
  }

  console.log('\n✅ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
