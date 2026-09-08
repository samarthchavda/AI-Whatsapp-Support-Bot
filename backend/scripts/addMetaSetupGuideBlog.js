require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let admin = await Admin.findOne({ role: 'super_admin' });
    if (!admin) {
      admin = await Admin.findOne({ role: 'admin' });
    }
    if (!admin) {
      admin = await Admin.findOne({});
    }

    if (!admin) {
      console.error('❌ No Admin user found to associate with blog post.');
      process.exit(1);
    }

    const postData = {
      title: "How to Connect Meta WhatsApp Cloud API to Kwickbot in 3 Simple Steps: Complete Setup Guide (2026)",
      slug: "how-to-connect-meta-whatsapp-cloud-api-setup-guide",
      summary: "Step-by-step guide on how to get your Meta Access Token, Phone Number ID, and WABA ID from Meta for Developers, paste them into Kwickbot, and activate 24/7 AI WhatsApp automation in under 3 minutes.",
      coverImage: "/uploads/blog/meta-whatsapp-api-connect-guide.jpg",
      tags: ["Meta Cloud API", "WhatsApp Setup Guide", "Kwickbot AI", "WhatsApp Integration", "API Key Setup"],
      status: "published",
      author: "Kwickbot Engineering Team",
      createdBy: admin._id,
      content: `
<p>Connecting your official WhatsApp Business account to <strong>Kwickbot AI</strong> allows your store to automate 24/7 customer support, send abandoned cart reminders, and run high-converting broadcast campaigns.</p>

<p>Whether you choose **1-Click Meta Embedded Signup v4** or manual API key configuration, setting up your Meta WhatsApp Cloud API credentials takes less than 3 minutes. In this step-by-step guide, we walk you through exact prerequisites, API key details, and how Kwickbot verifies your connection instantly.</p>

<hr />

<h2>Prerequisites Before You Begin</h2>

<p>Before connecting your account on the Kwickbot Dashboard, ensure you have:</p>

<ul>
  <li><strong>A Meta Business Account:</strong> Verified or unverified Meta Business Manager account at <a href="https://business.facebook.com">business.facebook.com</a>.</li>
  <li><strong>A Dedicated Phone Number:</strong> A mobile number that can receive SMS/Voice OTP (not currently active on WhatsApp personal app, or coexisting via Meta Embedded Signup v4).</li>
  <li><strong>Kwickbot Merchant Account:</strong> Logged into <a href="https://kwickbot.in/dashboard/whatsapp-connect">kwickbot.in/dashboard/whatsapp-connect</a>.</li>
</ul>

<hr />

<h2>Method 1: 1-Click Meta Embedded Signup v4 (Fastest & Recommended)</h2>

<p>Kwickbot supports official Meta Embedded Signup v4. You don't need to manually create developer apps or copy API tokens.</p>

<ol>
  <li>Go to your Kwickbot Dashboard: <strong>WhatsApp Connect</strong> page.</li>
  <li>Click the green <strong>"Connect via Meta"</strong> button.</li>
  <li>A secure Meta Facebook login popup will open. Log in with your Facebook account.</li>
  <li>Select your <strong>Meta Business Portfolio</strong> and select/add your WhatsApp Business Phone Number.</li>
  <li>Enter the 6-digit OTP code sent to your mobile.</li>
  <li>Click <strong>Finish</strong>. Kwickbot automatically fetches your Access Tokens, WABA ID, and Phone Number ID in the background!</li>
</ol>

<hr />

<h2>Method 2: Manual Meta API Key Setup (For Developer & Custom Apps)</h2>

<p>If you already have a Meta Developer App created under <a href="https://developers.facebook.com">developers.facebook.com</a>, follow these 3 steps to copy your credentials into Kwickbot:</p>

<h3>Step 1: Obtain Credentials from Meta Developer Console</h3>
<p>Navigate to your Meta App > <strong>WhatsApp</strong> > <strong>API Setup</strong>. Locate the following 3 fields:</p>

<ul>
  <li><strong>Temporary / Permanent Access Token:</strong> The Bearer token starting with <code>EAAG...</code> (Generated under System Users in Business Manager for permanent production access).</li>
  <li><strong>Phone Number ID:</strong> The 15-digit ID associated with your phone number (e.g., <code>104829384729104</code>).</li>
  <li><strong>WhatsApp Business Account ID (WABA ID):</strong> The 15-digit ID for your business account (e.g., <code>938471928472910</code>).</li>
</ul>

<h3>Step 2: Paste Credentials into Kwickbot Dashboard</h3>
<p>Open Kwickbot Dashboard > <a href="https://kwickbot.in/dashboard/whatsapp-connect">WhatsApp Connect</a> and switch to the <strong>Manual Credentials</strong> tab:</p>

<ol>
  <li>Paste your <strong>Phone Number ID</strong> into the <em>Phone Number ID</em> input.</li>
  <li>Paste your <strong>WhatsApp Business Account ID</strong> into the <em>WABA ID</em> input.</li>
  <li>Paste your <strong>Meta Access Token</strong> into the <em>Permanent Access Token</em> field.</li>
  <li>Click <strong>Save & Test Connection</strong>.</li>
</ol>

<hr />

<h2>What Happens Behind the Scenes When You Click "Save"?</h2>

<div class="blog-highlights" style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin: 24px 0;">
  <h4 style="margin-top: 0; color: #1e1b4b;">⚡ Instant Verification Workflow:</h4>
  <ul>
    <li><strong>1. Token & Graph API Handshake:</strong> Kwickbot backend sends a real-time test ping to Meta Graph API (<code>GET /v18.0/{phone_number_id}</code>).</li>
    <li><strong>2. Webhook Registration:</strong> Kwickbot registers your webhook endpoint (<code>https://kwickbot.in/api/webhooks/whatsapp</code>) to receive customer messages in real-time.</li>
    <li><strong>3. Status Verification:</strong> Your status updates to <strong style="color: #10b981;">Connected & Active ✅</strong> instantly.</li>
  </ul>
</div>

<hr />

<h2>Testing Your Connection</h2>

<p>Once connected, send a test WhatsApp message (e.g., <em>"Hi"</em> or <em>"Hello"</em>) from any personal mobile number to your connected WhatsApp Business number. Kwickbot AI will respond within 3 seconds!</p>

<hr />

<h2>Conclusion</h2>

<p>Connecting Meta WhatsApp Cloud API to Kwickbot is seamless, fast, and secure. Whether you use 1-click Embedded Signup or manual API token paste, your AI WhatsApp Agent is live and ready to automate customer support in minutes.</p>

<p>Ready to connect your WhatsApp Business account? <a href="https://kwickbot.in/login">Log into Kwickbot today</a> and start automating!</p>
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
