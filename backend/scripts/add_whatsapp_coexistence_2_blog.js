const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');
require('dotenv').config();

const faqStyle = `style="margin-bottom: 1.2em; padding: 18px 22px; background: #F8FAFC; border-left: 4px solid #1677FF; border-radius: 10px;"`;
const faqTitleStyle = `style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;"`;
const faqTextStyle = `style="margin: 0; color: #334155; line-height: 1.6;"`;

const generateFaqHtml = (faqs) => `
<hr style="margin: 2.5em 0; border: 0; border-top: 1px solid #E2E8F0;" />
<h3 style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin-top: 1.5em; margin-bottom: 1em;">Frequently Asked Questions (FAQ)</h3>
${faqs.map((f, i) => `
<div ${faqStyle}>
  <h4 ${faqTitleStyle}>Q${i + 1}: ${f.q}</h4>
  <p ${faqTextStyle}>${f.a}</p>
</div>
`).join('')}
`;

const newPost = {
  slug: "mastering-whatsapp-coexistence-2-0-ai-automation-and-mobile-app-sync",
  title: "Mastering WhatsApp Coexistence 2.0: How D2C Brands Combine 24/7 AI Automation with Mobile App & WhatsApp Web Support",
  summary: "Discover how Kwickbot's fully working WhatsApp Coexistence engine allows D2C brands to run 24/7 AI chatbots alongside WhatsApp Web and mobile apps with automatic human agent handoff and zero account bans.",
  coverImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
  tags: ["WhatsApp Coexistence", "AI Automation", "Human Handoff", "D2C Brands", "Customer Support"],
  status: "published",
  author: "Kwickbot Engineering Team",
  content: `
<p>For years, e-commerce founders and customer support leaders faced an agonizing trade-off: <strong>Do you adopt an official WhatsApp Business API to run automated AI chatbots, or do you keep your existing phone connected to the WhatsApp Business Mobile App and WhatsApp Web so your team can manually chat with customers?</strong></p>

<p>Historically, connecting a business phone number to an API provider meant sacrificing mobile app access entirely. If a human agent tried to type a reply on their phone, the API session would disconnect, or worse—the AI bot would aggressively interrupt the agent by replying over them.</p>

<p>With <strong>Kwickbot’s WhatsApp Coexistence 2.0 Engine</strong>, that dilemma is officially solved. Merchants can now run 24/7 Google Gemini AI automation while simultaneously maintaining active live support access across WhatsApp Web, mobile devices, and Kwickbot's unified team inbox.</p>

<hr />

<h3>1. How WhatsApp Coexistence 2.0 Works Under the Hood</h3>
<p>WhatsApp Coexistence relies on Meta’s Cloud API infrastructure paired with Kwickbot’s real-time event synchronization middleware.</p>

<p>When a buyer sends a message to your WhatsApp number:</p>
<ul>
  <li><strong>Simultaneous Event Delivery:</strong> Meta dispatches the webhook payload to Kwickbot AI while instantly syncing the chat thread to your WhatsApp Web or mobile app.</li>
  <li><strong>Instant AI Evaluation:</strong> Kwickbot AI evaluates whether the question can be resolved automatically using your store’s Knowledge Base, Shopify product catalog, or carrier tracking webhooks.</li>
  <li><strong>Sub-2 Second Response:</strong> Routine queries (order status, refund policies, sizing charts) are answered instantly without human agent intervention.</li>
</ul>

<hr />

<h3>2. Automatic AI Pause on Manual Mobile & Web Replies</h3>
<p>The biggest innovation in Coexistence 2.0 is <strong>Smart Human Takeover Detection</strong>. You never have to worry about the AI bot arguing with your support reps or sending duplicate answers.</p>

<blockquote style="margin: 1.5em 0; padding: 15px 20px; background: #EFF6FF; border-left: 4px solid #1677FF; color: #1E3A8A; font-style: italic;">
<strong>How It Works:</strong> The moment a human support representative types and sends a manual message from their smartphone (WhatsApp Business App) or WhatsApp Web, Kwickbot immediately detects the human outbound event and sets <code>botPaused = true</code> for that customer conversation.
</blockquote>

<p>The AI gracefully steps aside, allowing your support rep to converse with the buyer naturally.</p>

<hr />

<h3>3. Self-Healing & Automatic AI Bot Resume</h3>
<p>Once a human agent finishes assisting a buyer, how does the AI bot turn back on? Kwickbot offers two seamless ways to resume AI automation:</p>

<ol>
  <li><strong>Instant Manual Resume:</strong> Support reps can click the <strong>[Resume AI Bot]</strong> button on the Kwickbot Dashboard to instantly hand control back to the AI.</li>
  <li><strong>Self-Healing Ticket Resolution:</strong> When the support rep marks the escalation ticket as <strong>Resolved</strong>, Kwickbot’s background engine detects that no open tickets remain. On the customer's next incoming message, the AI automatically unpauses itself and resumes 24/7 auto-replies.</li>
</ol>

<hr />

<h3>4. Key Business Benefits for Scaling D2C Stores</h3>
<ul>
  <li><strong>24/7 Zero-Wait Customer Service:</strong> AI resolves 80%+ of incoming queries at night, over weekends, and during festive sale spikes.</li>
  <li><strong>Zero Agent Burnout:</strong> Support reps only handle high-value sales questions and delicate customer disputes.</li>
  <li><strong>Zero Risk of Account Bans:</strong> Built natively on official Meta Cloud API infrastructure, ensuring 100% compliance with Meta messaging guidelines.</li>
  <li><strong>Unified Conversation History:</strong> All chats, bot replies, and human agent messages sync seamlessly into Kwickbot CRM.</li>
</ul>
` + generateFaqHtml([
    { q: "Will sending a message from my mobile phone break the WhatsApp Cloud API connection?", a: "No! Coexistence 2.0 is fully supported on Meta Cloud API. Your phone app and API bot run simultaneously on the same business number without disconnection." },
    { q: "What happens if a human agent and the AI bot try to answer at the exact same time?", a: "Kwickbot enforces real-time lock protection. The moment a human agent sends a message from mobile or web, the AI bot pauses instantly for that conversation." },
    { q: "How long does the AI bot remain paused after a human agent replies?", a: "The AI remains paused until the support rep clicks 'Resume AI Bot' on the dashboard, until the ticket is marked Resolved (instant self-healing), or after an inactivity timeout." },
    { q: "Does WhatsApp Coexistence require installing special software on mobile phones?", a: "No! Support reps can use the official WhatsApp Business Mobile App, WhatsApp Web on desktop, or log into Kwickbot's mobile dashboard." },
    { q: "Can multi-agent support teams assign escalated chats to specific reps?", a: "Yes! Kwickbot's team inbox allows admins to assign escalated chats to specific agents, set priorities (Urgent, High, Normal), and track resolution times." }
  ])
};

async function createNewBlog() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoUri);

    const superAdmin = await Admin.findOne({ role: 'super_admin' }) || await Admin.findOne();
    const adminId = superAdmin ? superAdmin._id : null;

    await BlogPost.updateOne(
      { slug: newPost.slug },
      { $set: { ...newPost, createdBy: adminId, updatedAt: new Date() } },
      { upsert: true }
    );

    console.log(`\n🎉 SUCCESS: Published blog post "${newPost.title}"!`);
    console.log(`🔗 Slug: ${newPost.slug}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error publishing blog:', err);
    process.exit(1);
  }
}

createNewBlog();
