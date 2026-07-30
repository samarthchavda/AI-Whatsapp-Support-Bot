const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in your environment configuration!');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB...');

    const BlogPost = require('../models/BlogPost');
    const Admin = require('../models/Admin');

    // 1. Fetch a real Admin user from database to link as creator
    const admin = await Admin.findOne();
    const createdBy = admin ? admin._id : new mongoose.Types.ObjectId("6a46092f4121647c0e7a37da");

    const title = "How to Run WhatsApp Web and AI Automation Together: A Guide to WhatsApp Coexistence with Kwickbot";
    const slug = "how-to-run-whatsapp-web-and-ai-automation-together-whatsapp-coexistence";
    
    // Check if a post with this slug already exists to prevent duplicate entries
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      console.log(`⚠️ Blog post with slug "${slug}" already exists in database.`);
      await mongoose.disconnect();
      return;
    }

    const content = `
<p>As a D2C e-commerce brand owner, you probably face a difficult choice: Do you keep using the standard <strong>WhatsApp Business App</strong> on your phone to maintain a close, personal relationship with your customers, or do you switch to a high-end <strong>WhatsApp Business API chatbot</strong> to automate FAQs and tracking, losing the ability to chat with customers on your mobile phone?</p>

<p>At Kwickbot, we believe you shouldn't have to choose. In this guide, we will show you how to achieve <strong>WhatsApp Coexistence</strong>—running both your manual WhatsApp Business chats and Kwickbot's AI automation together on the same business number.</p>

<h3>What is WhatsApp Coexistence?</h3>
<p>WhatsApp Coexistence allows a business owner to enjoy the best of both worlds:
<ul>
  <li><strong>Kwickbot AI</strong> operates on the WhatsApp Business API to automatically handle 70% of customer FAQs (returns, size guides, refunds) and Shopify order tracking queries in real-time.</li>
  <li><strong>You (The Owner)</strong> can still use WhatsApp Web or your phone's WhatsApp Business app to chat with VIP clients, address custom inquiries, or close sales manually.</li>
</ul>
</p>

<h3>How Kwickbot Coordinates Coexistence</h3>
<p>If both the AI bot and a human try to type on the same number, it can lead to confusion. Kwickbot handles this using a <strong>Live Handoff and Pause Protocol</strong>:
<ol>
  <li><strong>First Line of Defense:</strong> When a customer messages your number, Kwickbot’s AI reads their question. If it's a routine query (like <em>"Is my order shipped?"</em>), Kwickbot replies instantly.</li>
  <li><strong>Intelligent Pause:</strong> If the customer asks to speak to a human, or if the AI detects complex issue sentiment, Kwickbot triggers an escalation and temporarily **pauses the AI bot** for that chat.</li>
  <li><strong>Manual Control:</strong> You get a notification on your Kwickbot Dashboard. You can then open your phone's WhatsApp or your team's live inbox to chat directly with the customer. The AI bot will remain silent until you mark the ticket resolved.</li>
</ol>
</p>

<h3>Step-by-Step: How to Set Up WhatsApp Coexistence in Kwickbot</h3>
<p>Enabling this hybrid model for your brand is simple and takes less than 5 minutes through your Kwickbot Dashboard:
<ol>
  <li><strong>Connect WhatsApp via Embedded Signup:</strong> Log into your Kwickbot Merchant Dashboard, navigate to <strong>WhatsApp Integration</strong>, and click <em>Connect with Facebook</em>. Follow the secure popup to verify your business number.</li>
  <li><strong>Configure AI Knowledge Base:</strong> Input your store policies, refund rules, and size guides in the AI settings page. Kwickbot will sync directly with your Shopify inventory and orders.</li>
  <li><strong>Set Escalation Alerts:</strong> Set up your fallback email address (like <code>hello@kwickbot.in</code>). If a customer needs manual assistance, Kwickbot will instantly notify you.</li>
  <li><strong>Access from Anywhere:</strong> Download the WhatsApp Business App on your mobile device, log in with the same phone number, and you're ready to monitor chats and step in whenever you want!</li>
</ol>
</p>

<h3>The Final Verdict</h3>
<p>By letting AI handle the repetitive questions while keeping yourself available for critical customer conversations, you save time, reduce support costs, and build deeper trust with your buyers. WhatsApp Coexistence with Kwickbot is the ultimate customer support setup for modern Indian D2C brands.</p>
    `.trim();

    const post = new BlogPost({
      title,
      slug,
      content,
      summary: "Discover how to run Kwickbot's automated AI Shopify support alongside your standard WhatsApp Business app on the same phone number to coordinate manual and automated customer chats concurrently.",
      coverImage: "https://kwickbot.in/uploads/blog/whatsapp-coexistence-guide.jpg",
      status: "published",
      author: "Kwickbot Team",
      tags: ["WhatsApp Coexistence", "WhatsApp Business API", "Shopify Support", "AI Automation"],
      readTime: 4,
      createdBy: createdBy
    });

    await post.save();
    console.log("✅ Successfully created new WhatsApp Coexistence guide blog post:", title);

  } catch (err) {
    console.error("❌ Database script error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

run();
