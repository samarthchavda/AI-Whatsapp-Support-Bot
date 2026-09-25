const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/ubuntu/whatsapp-bot/backend/.env' });
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

async function createBroadcastingBlogPost() {
  try {
    let mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      mongodbUri = 'mongodb://127.0.0.1:27017/whatsapp-bot';
    }

    await mongoose.connect(mongodbUri);
    console.log('✅ Connected to MongoDB');

    const adminDoc = await Admin.findOne({ role: 'super_admin' }) || await Admin.findOne();
    if (!adminDoc) {
      console.error('❌ No Admin found in DB');
      process.exit(1);
    }

    const slug = 'whatsapp-broadcasting-meta-approved-campaigns-guide-2026';

    // Remove existing post with same slug if any
    await BlogPost.deleteOne({ slug });

    const blogData = {
      title: 'WhatsApp Broadcasting Guide (2026): How D2C Brands Run Meta-Approved Campaigns, Segment Audiences, and Achieve 45%+ Conversion Rates with Kwickbot',
      slug: slug,
      summary: 'Learn how to launch high-converting WhatsApp broadcast campaigns using Meta Cloud API templates, rich media image headers, dynamic customer segmentation, and automated Gemini AI response handling with Kwickbot.',
      coverImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80',
      tags: ['WhatsApp Broadcasting', 'Meta Cloud API', 'Campaign Marketing', 'D2C Growth', 'Shopify Sync', 'Gemini AI'],
      status: 'published',
      author: 'Kwickbot Growth Team',
      createdBy: adminDoc._id,
      content: `
<h2>The Shift to Mobile Marketing: Why WhatsApp Broadcasting Dominates in 2026</h2>
<p>Email marketing open rates have dropped below 15%, and social media organic reach continues to decline. E-commerce and D2C brands need a direct, high-converting channel to reach their customers. <strong>WhatsApp Broadcasting</strong> has emerged as the most lucrative marketing channel for modern stores, delivering an extraordinary <strong>98% open rate</strong> and over <strong>45% click-through rate (CTR)</strong>.</p>

<p>Unlike old bulk SMS services or unauthorized WhatsApp scraping tools that get phone numbers permanently banned, Kwickbot utilizes the <strong>Official Meta WhatsApp Cloud API</strong>. This guarantees 100% deliverability, verified green tick business trust, and rich interactive campaign features.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80" alt="WhatsApp Marketing Broadcast Campaign Mobile Preview" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 1: Rich Media WhatsApp Broadcast Campaign with Image Header and Interactive Call-to-Action Buttons</p>
</div>

<h2>Key Features of Kwickbot's Broadcasting Engine</h2>

<h3>1. Meta Cloud API Approved Template Submissions</h3>
<p>Create and submit message templates directly from the Kwickbot platform. Meta reviews and approves Marketing, Utility, and Authentication templates within seconds, ensuring your messaging complies with official Meta policy guidelines.</p>

<h3>2. Rich Multimedia Headers (Images, Banners & Videos)</h3>
<p>Capture customer attention immediately with high-resolution promo banners, product photos, or short video teasers attached to your broadcast message headers. Visual messages yield 3x higher engagement compared to plain text.</p>

<h3>3. Interactive Action Buttons (`Shop Now`, `Claim Discount`)</h3>
<p>Ditch boring URLs! Include interactive quick reply buttons and call-to-action buttons (e.g. <i>"Claim 20% Off"</i>, <i>"Track Order"</i>, <i>"Talk to Agent"</i>). Customers can tap a single button to buy or ask questions instantly.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1556742049-0a675409b7cc?auto=format&fit=crop&w=1000&q=80" alt="E-Commerce Customer Audience Analytics & Broadcast Dashboard" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 2: Real-time Customer Audience Segmentation and Delivery Analytics</p>
</div>

<h3>4. Targeted Customer Audience Segmentation</h3>
<p>Segment your broadcast list based on live store data synced from Shopify or WooCommerce. Target VIP spenders, recent buyers, or inactive leads with personalized offers tailored to their shopping habits.</p>

<h3>5. Automated Gemini AI Response Handling</h3>
<p>What happens when 5,000 customers reply to your broadcast at once? Traditional marketing teams get overwhelmed. With Kwickbot, <strong>Google Gemini AI automatically handles incoming customer replies 24/7</strong>, answering product questions, confirming stock, and providing discount links without human delay!</p>

<h2>Step-by-Step: How to Launch Your Broadcast Campaign in Kwickbot</h2>

<ol>
  <li><strong>Navigate to Broadcasts:</strong> Log into your Kwickbot Dashboard and select the <strong>Broadcast Manager</strong> tab.</li>
  <li><strong>Select an Approved Meta Template:</strong> Choose from your verified marketing templates or create a new template with image header variables.</li>
  <li><strong>Select Target Recipient Segment:</strong> Choose all active contacts or upload a targeted CSV list of customers.</li>
  <li><strong>Set Schedule & Send:</strong> Dispatch the broadcast immediately or schedule it for peak engagement hours (e.g., 7:00 PM on weekends).</li>
  <li><strong>Monitor Real-Time Analytics:</strong> Track total sent, delivered, read, and replied metrics from the campaign analytics card.</li>
</ol>

<h2>Best Practices to Maintain 100% Meta Quality Score</h2>

<ul>
  <li><strong>Always Obtain Opt-In Consent:</strong> Send promotional broadcasts only to customers who have opted in during checkout or sign-up.</li>
  <li><strong>Use Relevant Personalization:</strong> Include template variables like <code>{{1}}</code> for customer first name to increase trust.</li>
  <li><strong>Avoid Excessive Frequency:</strong> Limit marketing broadcasts to 1-2 times per week per customer segment to prevent spam reports.</li>
</ul>

<h2>Frequently Asked Questions (FAQs)</h2>

<div class="faq-container">
  <h3>Q1: Can I send promotional broadcasts with image headers using Kwickbot?</h3>
  <p>Yes! Kwickbot supports dynamic Image Header templates, video headers, PDF catalog attachments, and interactive quick reply buttons.</p>

  <h3>Q2: What happens when a customer replies to a broadcast message?</h3>
  <p>Kwickbot's Google Gemini AI instantly takes over the conversation, answering customer questions 24/7 based on your store's knowledge base and product catalog.</p>

  <h3>Q3: Is broadcasting through Kwickbot compliant with Meta's Official Policy?</h3>
  <p>Yes. Kwickbot connects directly to the official Meta WhatsApp Cloud API infrastructure. All messages are transmitted through Meta approved business templates, keeping your phone number 100% safe.</p>
</div>
`
    };

    const newPost = new BlogPost(blogData);
    await newPost.save();
    console.log('✅ Successfully created and published new broadcasting blog post!');
    console.log('📌 Title:', newPost.title);
    console.log('🔗 Slug:', newPost.slug);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating blog post:', err);
    process.exit(1);
  }
}

createBroadcastingBlogPost();
