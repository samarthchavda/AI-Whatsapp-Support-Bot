const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const BlogPost = require('../models/BlogPost');
require('dotenv').config();

const dummyPosts = [
  {
    title: "How to Integrate Gemini AI with WhatsApp for Shopify Support",
    slug: "how-to-integrate-gemini-ai-with-whatsapp-for-shopify-support",
    summary: "Discover how combining Google Gemini 2.5 Flash with the WhatsApp Business API can reduce your support ticket volume by over 80%.",
    content: "<h3>Why WhatsApp is the Ultimate Support Channel</h3><p>With over 2 billion active global users, WhatsApp is where your customers already communicate. By integrating it with your Shopify store and Google Gemini 2.5 Flash, you can deliver instant support, improve customer experience, and save thousands on support costs.</p><h3>How the AI Integration Works</h3><p>Integrating Gemini AI with WhatsApp is simple. When a customer asks a question on your business number, Kwickbot captures the query, checks your store catalog and FAQ policies, and feeds this context to Gemini. The bot then formulates a concise, friendly response and replies to the customer in under 2 seconds.</p><h3>Key Benefits for E-commerce Teams</h3><ul><li><strong>24/7 Auto-Resolution:</strong> Answer order tracking, refund policy, and product availability queries instantly.</li><li><strong>Seamless Human Takeover:</strong> If a customer gets frustrated or asks for a human, the bot automatically pauses itself and routes the conversation to a live agent.</li><li><strong>97% Cost Reductions:</strong> Gemini Flash is incredibly cheap, reducing your API billing to a fraction of the cost of GPT-4.</li></ul>",
    coverImage: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=600&auto=format&fit=crop",
    tags: ["WhatsApp", "Shopify", "Gemini AI", "E-commerce"],
    status: "published",
    author: "Kwickbot Team"
  },
  {
    title: "5 Ways WhatsApp AI Automation Boosts Customer Satisfaction",
    slug: "5-ways-whatsapp-ai-automation-boosts-customer-satisfaction",
    summary: "Learn how real-time response times, automated order tracking, and intelligent human agent handoffs raise CSAT scores to 95%.",
    content: "<h3>The Importance of Response Speed in E-commerce</h3><p>Studies show that customers who receive replies within 5 minutes are 40% more likely to purchase again. Unfortunately, human support teams cannot operate 24/7 without huge budgets. This is where WhatsApp AI automation saves the day.</p><h3>5 Ways AI Chatbots Elevate Customer Experience</h3><ol><li><strong>Instant First Replies:</strong> Reduce wait times from hours to under 2 seconds.</li><li><strong>Automated Shipping Lookups:</strong> Let customers type 'where is my order' and retrieve live tracking data from Shopify instantly.</li><li><strong>Multilingual Support:</strong> Converse with customers in their native language automatically using Gemini AI translation capabilities.</li><li><strong>Proactive Cart Recovery:</strong> Remind shoppers of abandoned checkouts on WhatsApp, offering discount coupons dynamically.</li><li><strong>Intelligent Routing:</strong> Ensure refund disputes go straight to human managers, while simple queries are handled by AI.</li></ol>",
    coverImage: "https://images.unsplash.com/photo-1552581234-2612b75de6d6?q=80&w=600&auto=format&fit=crop",
    tags: ["WhatsApp", "Customer Support", "Automation", "CSAT"],
    status: "published",
    author: "Kwickbot Team"
  },
  {
    title: "A Guide to Reducing Abandoned Carts on WooCommerce using WhatsApp",
    slug: "a-guide-to-reducing-abandoned-carts-on-woocommerce-using-whatsapp",
    summary: "Abandoned checkout messages on WhatsApp see up to a 60% open rate. Here is how you can use Kwickbot to recover lost e-commerce revenue.",
    content: "<h3>The Abandoned Cart Problem</h3><p>Nearly 70% of online shopping carts are abandoned before purchase. While email recovery campaigns have a low 15% open rate, WhatsApp messages have a massive 98% open rate, making it the most effective channel to recover lost sales.</p><h3>How WhatsApp Recovery Workflows Work</h3><p>When Kwickbot detects an abandoned checkout on WooCommerce via webhook events, it schedules a personalized recovery sequence. After 30 minutes, it sends a WhatsApp message: 'Hi there, we noticed you left items in your cart. Use code SAVE10 for a 10% discount!' If the user replies, the AI takes over to answer any product queries.</p><h3>Best Practices for Cart Recovery Campaigns</h3><ul><li><strong>Be Helpful, Not Pushy:</strong> Ask if they experienced any technical issues during checkout.</li><li><strong>Provide Value:</strong> Offer free shipping or a dynamic 10% coupon to incentivize checkout.</li><li><strong>Include Call-to-Actions (CTAs):</strong> Use WhatsApp interactive quick-reply buttons (e.g., 'Check Out Now', 'Ask Support').</li></ul>",
    coverImage: "https://images.unsplash.com/photo-1563013544-824ae1d704d3?q=80&w=600&auto=format&fit=crop",
    tags: ["WooCommerce", "Cart Recovery", "WhatsApp Marketing", "Marketing"],
    status: "published",
    author: "Kwickbot Team"
  }
];

async function seedBlogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find Super Admin
    const superAdmin = await Admin.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      console.error('❌ Super admin not found. Cannot associate posts.');
      process.exit(1);
    }

    // Clear existing posts
    await BlogPost.deleteMany({});
    console.log('🗑️  Cleared old blog posts');

    const postsToInsert = dummyPosts.map(post => ({
      ...post,
      createdBy: superAdmin._id
    }));

    await BlogPost.insertMany(postsToInsert);
    console.log('✅ 3 High-Quality Blog Posts successfully seeded!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    process.exit(1);
  }
}

seedBlogs();
