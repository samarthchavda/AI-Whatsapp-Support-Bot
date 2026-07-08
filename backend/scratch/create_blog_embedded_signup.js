const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const admin = await Admin.findOne();
  if (!admin) {
    console.error('No admin found to link the blog post to!');
    process.exit(1);
  }

  const title = 'Streamlining Customer Support: The Power of WhatsApp Embedded Signup for E-Commerce';
  const slug = 'streamlining-customer-support-the-power-of-whatsapp-embedded-signup-for-e-commerce';
  
  // Clean up old post
  await BlogPost.deleteMany({ slug });

  const post = new BlogPost({
    title,
    slug,
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
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop',
    tags: ['Embedded Signup', 'WhatsApp API', 'Customer Support', 'Shopify Tips'],
    status: 'published',
    author: 'Kwickbot Team',
    createdBy: admin._id
  });

  await post.save();
  console.log('✅ Success! Blog post uploaded successfully.');
  console.log('   ID:', post._id);
  console.log('   Slug:', post.slug);

  await mongoose.connection.close();
  console.log('Database connection closed.');
}

run().catch(console.error);
