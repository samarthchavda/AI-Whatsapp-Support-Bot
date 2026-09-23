const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/ubuntu/whatsapp-bot/backend/.env' });
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

async function createNewBlogPost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminDoc = await Admin.findOne({ role: 'super_admin' }) || await Admin.findOne();
    if (!adminDoc) {
      console.error('❌ No Admin found in DB');
      process.exit(1);
    }

    const slug = 'whatsapp-ecommerce-automation-d2c-brands-guide-2026';

    // Remove existing post with same slug if any
    await BlogPost.deleteOne({ slug });

    const blogData = {
      title: 'WhatsApp E-Commerce Automation Guide (2026): How D2C Brands Combine Meta Cloud API, Gemini AI, and Shopify to Double Conversions',
      slug: slug,
      summary: 'Discover the step-by-step framework for integrating WhatsApp Cloud API with Shopify and WooCommerce. Learn how top D2C brands automate 24/7 customer support, streamline broadcasts, and slash RTO fees.',
      coverImage: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80',
      tags: ['WhatsApp E-Commerce', 'Shopify Automation', 'D2C Marketing', 'Gemini AI', 'Meta Cloud API', 'Cart Recovery'],
      status: 'published',
      author: 'Kwickbot Team',
      createdBy: adminDoc._id,
      content: `
<h2>The Shift in E-Commerce Communication: Why WhatsApp Rules D2C</h2>
<p>In 2026, mobile-first shoppers expect instant, personalized answers to their pre-purchase questions. Traditional customer support channels like email and web chat suffer from low open rates and slow response times. WhatsApp, with over 2.5 billion active monthly users and a 98% message open rate, has emerged as the definitive channel for e-commerce growth.</p>

<p>Leading D2C brands are moving beyond simple bulk SMS to full <strong>WhatsApp E-Commerce Automation</strong>—combining real-time store synchronization, AI chatbots, and mobile app coexistence.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80" alt="E-Commerce Team Automating WhatsApp Support" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 1: Automated AI Support Team working alongside WhatsApp Coexistence</p>
</div>

<h2>4 Core Pillars of WhatsApp E-Commerce Automation</h2>

<h3>1. Real-Time Shopify & WooCommerce Store Sync</h3>
<p>When a shopper places an order, abandons a checkout, or requests a refund, Kwickbot automatically syncs with your store via webhooks. Customers receive automated order tracking links, invoice downloads, and Cash-on-Delivery (COD) verification messages instantly.</p>

<h3>2. Google Gemini AI Customer Support Assistant</h3>
<p>By training Kwickbot on your brand's FAQs, product catalog, return policy, and shipping terms, Gemini AI answers 80%+ of incoming routine queries 24/7 without requiring human intervention.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80" alt="WhatsApp Automation Dashboard & Metrics" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 2: Real-time Live Chat Analytics and Response Automation</p>
</div>

<h3>3. Automated COD Confirmation & RTO Reduction</h3>
<p>Return to Origin (RTO) is one of the highest expenses for COD-heavy D2C brands. Kwickbot sends automated WhatsApp buttons asking customers to confirm their COD order before shipping, filtering out fake addresses and boosting delivery success rates by 35%.</p>

<h3>4. Targeted Image Header Broadcast Campaigns</h3>
<p>Engage your audience with rich multimedia broadcasts featuring high-resolution images, discount coupons, and call-to-action buttons. Segment campaigns by customer purchase history to maximize repeat order revenue.</p>

<h2>Step-by-Step Implementation Framework</h2>

<ol>
  <li><strong>Connect Meta Cloud API:</strong> Use 1-Click Embedded Signup to link your official WhatsApp Business number.</li>
  <li><strong>Upload Knowledge Base PDF:</strong> Train the AI on your store policies, shipping timelines, and product care instructions.</li>
  <li><strong>Enable Shopify Sync:</strong> Connect your store API credentials for automated cart recovery and order status updates.</li>
  <li><strong>Set Up Coexistence:</strong> Manage incoming customer responses seamlessly on both your mobile WhatsApp Business App and Kwickbot Live Chat.</li>
</ol>

<h2>Conclusion: Transform Customer Experience with Kwickbot AI</h2>
<p>Automating your WhatsApp strategy is no longer optional—it is a core growth engine for D2C brands. Power your store with Kwickbot AI to reduce support costs, eliminate RTO losses, and turn every customer conversation into a sale.</p>

<h2>Frequently Asked Questions (FAQs)</h2>

<div class="faq-container">
  <h3>Q1: Can I send image header broadcast templates using Kwickbot?</h3>
  <p>Yes! Kwickbot supports dynamic Image Header templates, video headers, document attachments, and interactive button messages.</p>

  <h3>Q2: How does Kwickbot reduce Return-to-Origin (RTO) for COD orders?</h3>
  <p>Kwickbot dispatches instant WhatsApp verification messages upon COD order placement, allowing customers to confirm or cancel before dispatch.</p>

  <h3>Q3: Does Kwickbot work with both Shopify and WooCommerce?</h3>
  <p>Yes, Kwickbot provides native integrations and automated webhook triggers for both Shopify and WooCommerce platforms.</p>
</div>
`
    };

    const newPost = new BlogPost(blogData);
    await newPost.save();
    console.log('✅ Successfully created and published new blog post with images!');
    console.log('📌 Title:', newPost.title);
    console.log('🔗 Slug:', newPost.slug);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating blog post:', err);
    process.exit(1);
  }
}

createNewBlogPost();
