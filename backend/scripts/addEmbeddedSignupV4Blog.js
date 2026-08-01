require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let admin = await Admin.findOne({ role: 'superadmin' });
    if (!admin) {
      admin = await Admin.findOne({});
    }

    if (!admin) {
      console.error('❌ No Admin user found to associate with blog post.');
      process.exit(1);
    }

    const postData = {
      title: "Meta WhatsApp Embedded Signup v4 & Coexistence: Complete Guide for Business Owners (2026)",
      slug: "meta-whatsapp-embedded-signup-v4-coexistence-guide",
      summary: "Everything you need to know about Meta's WhatsApp Embedded Signup v4 update. Learn how D2C brands can run their mobile WhatsApp Business App and Kwickbot AI Cloud Bot together on the same number seamlessly.",
      coverImage: "/uploads/blog/whatsapp-embedded-signup-v4-guide.jpg",
      tags: ["WhatsApp Cloud API", "Meta Embedded Signup v4", "WhatsApp Coexistence", "AI Automation", "Shopify WhatsApp"],
      status: "published",
      author: "Kwickbot Engineering Team",
      createdBy: admin._id,
      content: `
<h2>Introduction: The New Era of Meta WhatsApp Business Integration</h2>
<p>If you own an e-commerce brand or business in 2026, WhatsApp is likely your primary channel for customer acquisition, order notifications, and support. However, until recently, business owners faced a major dilemma: <strong>Do I use the WhatsApp Business mobile app on my phone, or do I migrate to the WhatsApp Cloud API for automated AI messaging?</strong></p>

<p>Historically, connecting to the WhatsApp Cloud API required disconnecting your phone number from the mobile app. But with Meta’s official launch of <strong>Embedded Signup v4 (WhatsApp Coexistence)</strong>, that restriction is officially gone!</p>

<p>In this comprehensive guide, we will break down what Meta Embedded Signup v4 is, how WhatsApp Coexistence works, its pricing structure, and how you can connect your business number to Kwickbot AI in less than 2 minutes.</p>

<hr />

<h2>What is Meta WhatsApp Embedded Signup v4?</h2>
<p><strong>Embedded Signup v4</strong> is Meta's latest, streamlined onboarding protocol designed for Solution Providers and Tech Providers (like Kwickbot). It allows merchants to link their official WhatsApp Business Accounts (WABAs) directly from an embedded web popup without entering complex API keys or manual webhook settings.</p>

<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <strong>💡 Key Upgrade in v4:</strong> Embedded Signup v4 natively introduces <em>Official WhatsApp Business App Coexistence</em>. Merchants can authorize their existing WhatsApp Business mobile app number without deleting their mobile app account!
</div>

<hr />

<h2>How WhatsApp Coexistence Works (App + Cloud API Together)</h2>
<p>Under Meta's Coexistence model, your phone number operates on a dual-stack system supported by Meta's Cloud servers:</p>

<ul>
  <li><strong>1-on-1 Manual Chatting on Phone:</strong> You can keep your WhatsApp Business App (with the <strong>'B'</strong> icon) open on your iPhone or Android device. Messages you type manually to customers remain <strong>100% free</strong>.</li>
  <li><strong>AI Automation & Multi-Agent Inbox on Kwickbot:</strong> Kwickbot runs simultaneously in the background. It automatically handles repetitive customer FAQs, retrieves order statuses from Shopify/WooCommerce, and dispatches bulk promotional broadcasts.</li>
  <li><strong>Real-Time Chat Mirroring:</strong> All customer conversations and message echoes are mirrored in real time between your phone app and your Kwickbot live chat inbox.</li>
</ul>

<hr />

<h2>Eligibility Requirements for WhatsApp Coexistence</h2>
<p>To enable Coexistence on your business number via Meta Embedded Signup v4, make sure your account meets Meta's standard eligibility criteria:</p>

<ol>
  <li><strong>WhatsApp Business App Version:</strong> Your mobile device must be running WhatsApp Business App version <strong>2.24.17 or higher</strong> (available free on Google Play Store and Apple App Store).</li>
  <li><strong>7-Day Account History:</strong> The phone number must have been active on the WhatsApp Business App on your phone for at least <strong>7 days</strong> prior to onboarding.</li>
  <li><strong>No On-Premise Conflict:</strong> The number must not be concurrently registered on legacy On-Premises API servers or Marketing Messages (MM Lite).</li>
</ol>

<hr />

<h2>Pricing & Conversation Billing Principles</h2>
<p>Meta has simplified pricing for Coexistence users to ensure transparency:</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 12px; text-align: left;">Message Source</th>
      <th style="border: 1px solid #cbd5e1; padding: 12px; text-align: left;">Cost per Message</th>
      <th style="border: 1px solid #cbd5e1; padding: 12px; text-align: left;">Daily Messaging Limit Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 12px;"><strong>Mobile WhatsApp Business App</strong> (Typed on Phone)</td>
      <td style="border: 1px solid #cbd5e1; padding: 12px; color: #16a34a; font-weight: bold;">FREE (₹0)</td>
      <td style="border: 1px solid #cbd5e1; padding: 12px;">Does NOT count against API caps</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 12px;"><strong>Kwickbot AI Cloud API</strong> (Automated Replies & Broadcasts)</td>
      <td style="border: 1px solid #cbd5e1; padding: 12px;">Standard Meta Cloud API Rates (e.g. ~₹0.11 support / ~₹0.78 marketing)</td>
      <td style="border: 1px solid #cbd5e1; padding: 12px;">Counts towards API Tier limits (e.g. 1k/day)</td>
    </tr>
  </tbody>
</table>

<hr />

<h2>Step-by-Step: How to Connect Your WhatsApp Number to Kwickbot AI</h2>

<ol>
  <li><strong>Log into your Kwickbot Dashboard:</strong> Go to <a href="https://kwickbot.in/dashboard/whatsapp-connect">kwickbot.in/dashboard/whatsapp-connect</a>.</li>
  <li><strong>Click "Connect via Meta":</strong> The Meta Embedded Signup v4 popup will launch automatically.</li>
  <li><strong>Select Your Business Portfolio:</strong> Log in with your Facebook account and choose your Meta Business Manager.</li>
  <li><strong>Enter Your Mobile Number & Verify:</strong> Enter your WhatsApp Business App phone number. Meta will send a 6-digit verification code directly into your mobile app from the official <em>Facebook Business</em> system account.</li>
  <li><strong>Tap Connect & Enjoy Coexistence:</strong> Tap "Connect" on your phone, paste the code in the popup, and you're done! Your AI Agent is live!</li>
</ol>

<hr />

<h2>Conclusion</h2>
<p>Meta Embedded Signup v4 and WhatsApp Coexistence eliminate the friction of choosing between mobile flexibility and enterprise AI power. By combining the WhatsApp Business mobile app with <strong>Kwickbot AI</strong>, D2C brands can cut support response times by 80% while keeping full personal control over customer relationships.</p>

<p>Ready to automate your WhatsApp support and boost store conversions? <a href="https://kwickbot.in/login">Sign up for Kwickbot today</a> and connect your WhatsApp Business account in under 2 minutes!</p>
      `
    };

    const existingPost = await BlogPost.findOne({ slug: postData.slug });
    if (existingPost) {
      await BlogPost.updateOne({ slug: postData.slug }, postData);
      console.log(`✅ Updated existing blog post: ${postData.title}`);
    } else {
      await BlogPost.create(postData);
      console.log(`🎉 Created new blog post: ${postData.title}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding blog post:', err);
    process.exit(1);
  }
};

run();
