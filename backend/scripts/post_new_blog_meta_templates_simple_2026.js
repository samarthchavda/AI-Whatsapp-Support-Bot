const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/ubuntu/whatsapp-bot/backend/.env' });
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

async function createSimpleMetaTemplatesBlogPost() {
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

    const slug = 'what-are-whatsapp-meta-templates-simple-guide-2026';

    // Remove existing post with same slug if any
    await BlogPost.deleteOne({ slug });

    const blogData = {
      title: 'Understanding WhatsApp Meta Templates (2026): A Simple Guide for Store Owners (No Coding Required)',
      slug: slug,
      summary: 'A simple, non-technical guide explaining what WhatsApp Meta message templates are, why Meta requires pre-approved messages, how the 24-hour rule works, and how Kwickbot automates them for your store.',
      coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      tags: ['Meta Templates', 'Beginners Guide', 'WhatsApp API', 'Store Automation'],
      status: 'published',
      author: 'Kwickbot Customer Success Team',
      createdBy: adminDoc._id,
      content: `
<h2>What is a WhatsApp Meta Template? (The Simple Analogy)</h2>
<p>If you have ever used WhatsApp for your business, you might have heard the term <strong>"Meta Template"</strong>. Don't worry—it sounds technical, but the concept is actually very simple!</p>

<p>Think of a Meta Template as a <strong>pre-approved official letterhead or digital stamp</strong>. Because Meta (the parent company of WhatsApp) wants to protect users from unwanted spam and fake messages, they require businesses to submit the layout of their official outbound messages for a quick review before sending them to customers.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80" alt="Simple WhatsApp Message Templates on Mobile Phone" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 1: Official pre-approved WhatsApp message templates on customer mobile devices</p>
</div>

<h2>The 24-Hour Customer Support Rule Explained</h2>
<p>Meta has one golden rule for WhatsApp business communications:</p>

<ol>
  <li><strong>When a customer messages you first:</strong> You have a 24-hour "Free Customer Support Window." During these 24 hours, Kwickbot AI or your human support agents can chat freely with the customer, answer questions, and send normal text messages without needing pre-approved templates.</li>
  <li><strong>When your business messages the customer first (or after 24 hours):</strong> If you want to send an order update, shipping tracking link, or promotional offer, Meta requires you to use a <strong>pre-approved Meta Template</strong>.</li>
</ol>

<h2>The 3 Simple Categories of Templates</h2>

<p>Meta classifies all business templates into 3 clear categories:</p>

<h3>1. Utility Templates (Order Updates & Receipts)</h3>
<p>These are transactional notifications your customers expect to receive. Examples include:</p>
<ul>
  <li><i>"Hi {{1}}, your Shopify order #{{2}} has been confirmed!"</i></li>
  <li><i>"Your package is out for delivery with courier tracking link: {{1}}"</i></li>
</ul>

<h3>2. Marketing Templates (Offers, Discounts & Sale Announcements)</h3>
<p>These are promotional broadcasts aimed at growing sales. Examples include:</p>
<ul>
  <li><i>"Festival Sale Announcement: Get 20% OFF all products this weekend!"</i></li>
  <li><i>"Hey {{1}}, you left items in your cart! Tap below to finish your purchase."</i></li>
</ul>

<h3>3. Authentication Templates (Security OTPs)</h3>
<p>Used for sending one-time passcodes (OTPs) when customers log into your store or verify their mobile number.</p>

<div style="text-align: center; margin: 30px 0;">
  <img src="https://images.unsplash.com/photo-1556742049-0a675409b7cc?auto=format&fit=crop&w=1000&q=80" alt="Interactive WhatsApp Buttons and Store Order Notifications" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">Figure 2: Interactive Quick Reply Buttons for easy 1-tap customer actions</p>
</div>

<h2>What Makes Modern Templates Super Powerful?</h2>

<p>Old bulk SMS could only send plain text. Meta WhatsApp templates allow rich, interactive elements:</p>

<ul>
  <li><strong>Image &amp; Video Headers:</strong> Attach your product photos or promo banners right at the top of the message.</li>
  <li><strong>Dynamic Fill-in Blank Variables:</strong> Placeholders like <code>{{1}}</code> and <code>{{2}}</code> automatically fill with the customer's actual name, order number, or tracking link.</li>
  <li><strong>1-Tap Interactive Buttons:</strong> Add buttons like <i>"Confirm COD Order"</i>, <i>"Track Package"</i>, or <i>"Claim Discount"</i> so customers can tap once instead of typing.</li>
</ul>

<h2>How Kwickbot Makes Meta Templates 100% Automatic</h2>

<p>You don't need to know how to code or navigate complex technical portals. Kwickbot handles everything behind the scenes:</p>

<ol>
  <li><strong>Built-In Ready Templates:</strong> Choose from pre-tested templates for Shopify &amp; WooCommerce order updates, abandoned carts, and broadcasts.</li>
  <li><strong>Automatic Meta Approval:</strong> When you click save, Kwickbot submits the template directly to Meta. Approval usually happens in under 60 seconds!</li>
  <li><strong>Instant AI Takeover:</strong> When a customer taps a button on your template, Kwickbot's <strong>Google Gemini AI immediately steps in 24/7</strong> to answer their follow-up questions in natural human language.</li>
</ol>

<h2>Frequently Asked Questions (FAQs)</h2>

<div class="faq-container">
  <h3>Q1: How long does it take for Meta to approve a new message template?</h3>
  <p>Most standard utility and marketing templates are automatically reviewed and approved by Meta's AI within 1 to 2 minutes.</p>

  <h3>Q2: Can I edit a template after it has been approved by Meta?</h3>
  <p>Meta requires you to submit a minor update or create a new template if you change the wording. In Kwickbot, you can easily clone and update templates with 1 click.</p>

  <h3>Q3: What are the placeholders like {{1}} and {{2}} in templates?</h3>
  <p>These are dynamic variables. When Kwickbot sends the message, <code>{{1}}</code> is automatically replaced with the customer's name, and <code>{{2}}</code> with their order number or tracking link.</p>
</div>
`
    };

    const newPost = new BlogPost(blogData);
    await newPost.save();
    console.log('✅ Successfully created and published new simple Meta Templates blog post!');
    console.log('📌 Title:', newPost.title);
    console.log('🔗 Slug:', newPost.slug);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating blog post:', err);
    process.exit(1);
  }
}

createSimpleMetaTemplatesBlogPost();
