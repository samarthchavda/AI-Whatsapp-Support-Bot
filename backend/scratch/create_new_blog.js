const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BlogPost = require('../models/BlogPost');

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const title = 'Why WhatsApp Automation is the Ultimate Solution for Abandoned Cart Recovery';
  const slug = 'why-whatsapp-automation-is-the-ultimate-solution-for-abandoned-cart-recovery';
  
  // Clean up any old duplicate post with this slug
  await BlogPost.deleteMany({ slug });

  const post = new BlogPost({
    title,
    slug,
    summary: "Discover how automated WhatsApp support chats are outperforming traditional emails for cart recovery, helping online brands recover up to 25% of lost checkouts.",
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
    coverImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop',
    tags: ['Cart Recovery', 'WhatsApp Automation', 'E-commerce Tips', 'Customer Support'],
    status: 'published',
    author: 'Kwickbot Team',
    createdBy: new mongoose.Types.ObjectId('6a30e56cca64bf07ffdb1502') // Use valid system admin ID format
  });

  await post.save();
  console.log('✅ Success! New blog post created and published.');
  console.log('   ID:', post._id);
  console.log('   Slug:', post.slug);

  await mongoose.connection.close();
  console.log('Database connection closed.');
}

run().catch(console.error);
