import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const FALLBACK_POSTS = {
  'whatsapp-business-api-pricing-meta-messaging-costs-2026-guide': {
    _id: '1',
    slug: 'whatsapp-business-api-pricing-meta-messaging-costs-2026-guide',
    title: 'WhatsApp Business API Pricing 2026: Complete Meta Messaging Costs Guide for E-Commerce',
    summary: 'Understand Meta WhatsApp Cloud API pricing in 2026. Learn the difference between Utility, Service, and Marketing conversation categories, free tier limits, and how Kwickbot optimizes AI token costs.',
    tags: ['WhatsApp API', 'Pricing Guide'],
    author: 'Kwickbot Team',
    createdAt: '2026-09-21T10:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=80',
    content: `
      <h2>Introduction to Meta WhatsApp Business API Pricing in 2026</h2>
      <p>Running customer support on WhatsApp requires understanding Meta's official conversation-based pricing model. Unlike traditional SMS that charges per text message, Meta charges per <strong>24-hour conversation window</strong>.</p>
      
      <h3>1. The 4 Conversation Categories</h3>
      <ul>
        <li><strong>Service Conversations (Free Tier):</strong> User-initiated chats. First 1,000 service conversations every month are 100% FREE.</li>
        <li><strong>Utility Conversations:</strong> Business-initiated transactional alerts such as order confirmations, tracking links, and shipping notifications (~₹0.30/chat in India).</li>
        <li><strong>Marketing Conversations:</strong> Promotional broadcasts, discount coupons, and abandoned cart recovery reminders (~₹0.72/chat in India).</li>
        <li><strong>Authentication Conversations:</strong> One-time passcodes and security verification codes.</li>
      </ul>

      <h3>2. How Kwickbot Controls AI Token Budget</h3>
      <p>Kwickbot includes built-in Super Admin token governance. Merchants can specify monthly Gemini AI token budgets (e.g. 10,000 or 50,000 tokens), preventing unexpected bill spikes while maintaining 24/7 AI coverage.</p>
    `
  },
  'whatsapp-ecommerce-automation-d2c-brands-guide-2026': {
    _id: '2',
    slug: 'whatsapp-ecommerce-automation-d2c-brands-guide-2026',
    title: 'WhatsApp E-Commerce Automation: The Ultimate Guide for D2C Brands in 2026',
    summary: 'Discover how top D2C brands automate 80%+ of customer support, tracking inquiries, and COD confirmations on WhatsApp while reducing CAC and RTO.',
    tags: ['E-Commerce', 'Automation'],
    author: 'Kwickbot Engineering',
    createdAt: '2026-09-22T14:30:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0a675409b7cc?auto=format&fit=crop&w=1200&q=80',
    content: `
      <h2>Why WhatsApp Automation is Essential for D2C Brands in 2026</h2>
      <p>With email open rates dropping below 15%, WhatsApp provides an unprecedented 98% open rate and 45% click-through rate for e-commerce communications.</p>

      <h3>Key Workflows Every Store Must Automate</h3>
      <ol>
        <li><strong>Order &amp; Shipping Tracking:</strong> Connect Shopify or WooCommerce webhooks so customers instantly get live tracking links upon typing their order number.</li>
        <li><strong>COD Order Verification (RTO Shield):</strong> Auto-send confirmation buttons before dispatching Cash-on-Delivery packages to slash Return-To-Origin rates by up to 35%.</li>
        <li><strong>Live Chat Handoff:</strong> Automatically pause AI and notify human support staff whenever complex tickets or refund requests trigger escalation keywords.</li>
      </ol>
    `
  },
  'shopify-whatsapp-integration-setup-guide': {
    _id: '3',
    slug: 'shopify-whatsapp-integration-setup-guide',
    title: 'How to Integrate Shopify with Official WhatsApp Cloud API in 5 Minutes',
    summary: 'Step-by-step tutorial on connecting your Shopify Custom App to WhatsApp Cloud API for automated order confirmations, live shipping status, and AI support.',
    tags: ['Shopify', 'Tutorial'],
    author: 'Kwickbot Team',
    createdAt: '2026-09-20T09:15:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=1200&q=80',
    content: `
      <h2>Connecting Shopify to WhatsApp Cloud API</h2>
      <p>Follow this simple 5-minute setup guide to connect your Shopify store credentials to Kwickbot for zero-code support automation.</p>
    `
  }
};

async function getPostBySlug(slug) {
  try {
    const res = await fetch(`http://localhost:5001/api/blog/post/${slug}`, { cache: 'no-store' });
    if (!res.ok) return FALLBACK_POSTS[slug] || null;
    const json = await res.json();
    return json.data || FALLBACK_POSTS[slug] || null;
  } catch (err) {
    return FALLBACK_POSTS[slug] || null;
  }
}

export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    return { title: 'Post Not Found | Kwickbot' };
  }

  return {
    title: `${post.title} | Kwickbot Blog`,
    description: post.summary
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="retro-page-container">
      <div className="bg-video-wrapper">
        <video className="bg-video" autoPlay muted loop playsInline>
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="bg-overlay-gradient"></div>
      </div>

      <main style={{ position: 'relative', zIndex: 1, padding: '40px 20px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <article className="dark-section-card">
          <div style={{ marginBottom: '24px' }}>
            <Link href="/blog" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              ← Back to Blog Index
            </Link>
          </div>

          <header style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {post.tags && post.tags.length ? post.tags.join(' • ') : 'E-Commerce Guide'}
            </div>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '800', color: '#ffffff', lineHeight: '1.3', marginBottom: '16px' }}>
              {post.title}
            </h1>
            <div style={{ fontSize: '14px', color: '#a1a1aa', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span>By <strong style={{ color: '#ffffff' }}>{post.author || 'Kwickbot Team'}</strong></span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </header>

          {post.coverImage && (
            <div style={{ marginBottom: '36px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img 
                src={post.coverImage} 
                alt={post.title} 
                style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} 
              />
            </div>
          )}

          <div 
            className="blog-content-body"
            style={{ fontSize: '16px', lineHeight: '1.8', color: '#d4d4d8' }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
    </div>
  );
}
