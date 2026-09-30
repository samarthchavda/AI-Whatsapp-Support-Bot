import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'WhatsApp AI & E-Commerce Support Blog | Kwickbot',
  description: 'Explore Kwickbot\'s latest guides, tutorials, and insights on WhatsApp AI customer support, e-commerce automation, abandoned cart recovery, and slashing CAC.',
  openGraph: {
    title: 'WhatsApp AI & E-Commerce Support Blog | Kwickbot',
    description: 'Latest guides on WhatsApp AI automation, Shopify sync, and D2C support.',
  }
};

const FALLBACK_POSTS = [
  {
    _id: 'agentic-ai-whatsapp-cloud-api-2026',
    slug: 'agentic-ai-whatsapp-cloud-api-ecommerce-automation-guide-2026',
    title: 'Agentic AI on WhatsApp Cloud API (2026): The Complete Guide to Autonomous Customer Support, Smart Broadcasting & E-Commerce Automation',
    summary: 'Discover how Agentic AI on Meta\'s WhatsApp Cloud API is replacing rigid chatbots in 2026. Learn how autonomous AI agents execute multi-step workflows—from real-time order tracking and returns to hyper-targeted broadcasts and abandoned cart recovery—achieving 90%+ resolution rates.',
    tags: ['Agentic AI', 'WhatsApp Cloud API', 'E-Commerce Automation', 'Customer Support', 'Broadcasting', 'Shopify AI'],
    author: 'Kwickbot Product & AI Architecture Team',
    createdAt: '2026-09-30T04:30:00.000Z',
    coverImage: '/blog/agentic-ai-whatsapp-cloud-api-2026.jpg'
  },
  {
    _id: 'meta-pricing-october-2026',
    slug: 'meta-whatsapp-api-changes-october-2026-pricing-guide',
    title: 'Meta WhatsApp API Changes (October 2026): The Complete Guide to Service Message Pricing, Meta Business Agent (MBA), and Cost-Saving Strategies for E-Commerce Brands',
    summary: 'Meta is overhauling WhatsApp Business Platform pricing on October 1, 2026. Discover how the end of free service messages, the new Meta Business Agent (MBA) category, and per-message billing impact your e-commerce store—and how to cut costs by 50% with Kwickbot AI.',
    tags: ['WhatsApp API Changes', 'Meta Pricing 2026', 'Meta Business Agent', 'AI Customer Support', 'Broadcasting', 'Shopify Automation'],
    author: 'Kwickbot Product & Strategy Team',
    createdAt: '2026-09-29T08:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: 'whatsapp-flows-2026-1',
    slug: 'whatsapp-flows-native-checkout-ai-agents-guide-2026',
    title: 'WhatsApp Flows 2.0 & AI Agents: The Complete 2026 Guide to In-Chat Native Checkout, Smart Forms & Automated Support',
    summary: 'Discover how D2C and Shopify brands use WhatsApp Flows 2.0 and Gemini AI agents to build multi-screen native in-chat checkouts, smart support intake forms, and automated broadcasts that eliminate bounce rates and drive 4x higher sales.',
    tags: ['WhatsApp Flows', 'Native In-Chat Checkout', 'WhatsApp Cloud API', 'Gemini AI Agents'],
    author: 'Kwickbot Product Team',
    createdAt: '2026-09-28T09:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: 'meta-templates-simple-1',
    slug: 'what-are-whatsapp-meta-templates-simple-guide-2026',
    title: 'Understanding WhatsApp Meta Templates (2026): A Simple Guide for Store Owners (No Coding Required)',
    summary: 'A simple, non-technical guide explaining what WhatsApp Meta message templates are, why Meta requires pre-approved messages, how the 24-hour rule works, and how Kwickbot automates them for your store.',
    tags: ['Meta Templates', 'Beginners Guide', 'WhatsApp API', 'Store Automation'],
    author: 'Kwickbot Customer Success Team',
    createdAt: '2026-09-26T10:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: 'broadcasting-1',
    slug: 'whatsapp-broadcasting-meta-approved-campaigns-guide-2026',
    title: 'WhatsApp Broadcasting Guide (2026): How D2C Brands Run Meta-Approved Campaigns, Segment Audiences, and Achieve 45%+ Conversion Rates with Kwickbot',
    summary: 'Learn how to launch high-converting WhatsApp broadcast campaigns using Meta Cloud API templates, rich media image headers, dynamic customer segmentation, and automated Gemini AI response handling with Kwickbot.',
    tags: ['WhatsApp Broadcasting', 'Meta Cloud API', 'Campaign Marketing', 'D2C Growth'],
    author: 'Kwickbot Growth Team',
    createdAt: '2026-09-25T10:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: '1',
    slug: 'whatsapp-business-api-pricing-meta-messaging-costs-2026-guide',
    title: 'WhatsApp Business API Pricing 2026: Complete Meta Messaging Costs Guide for E-Commerce',
    summary: 'Understand Meta WhatsApp Cloud API pricing in 2026. Learn the difference between Utility, Service, and Marketing conversation categories, free tier limits, and how Kwickbot optimizes AI token costs.',
    tags: ['WhatsApp API', 'Pricing Guide'],
    author: 'Kwickbot Team',
    createdAt: '2026-09-21T10:00:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: '2',
    slug: 'whatsapp-ecommerce-automation-d2c-brands-guide-2026',
    title: 'WhatsApp E-Commerce Automation: The Ultimate Guide for D2C Brands in 2026',
    summary: 'Discover how top D2C brands automate 80%+ of customer support, tracking inquiries, and COD confirmations on WhatsApp while reducing CAC and RTO.',
    tags: ['E-Commerce', 'Automation'],
    author: 'Kwickbot Engineering',
    createdAt: '2026-09-22T14:30:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1556742049-0a675409b7cc?auto=format&fit=crop&w=1200&q=80'
  },
  {
    _id: '3',
    slug: 'shopify-whatsapp-integration-setup-guide',
    title: 'How to Integrate Shopify with Official WhatsApp Cloud API in 5 Minutes',
    summary: 'Step-by-step tutorial on connecting your Shopify Custom App to WhatsApp Cloud API for automated order confirmations, live shipping status, and AI support.',
    tags: ['Shopify', 'Tutorial'],
    author: 'Kwickbot Team',
    createdAt: '2026-09-20T09:15:00.000Z',
    coverImage: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=1200&q=80'
  }
];

async function getPublishedPosts() {
  try {
    const res = await fetch('http://localhost:5001/api/blog', { cache: 'no-store' });
    if (!res.ok) return FALLBACK_POSTS;
    const json = await res.json();
    return json.data && json.data.length ? json.data : FALLBACK_POSTS;
  } catch (err) {
    return FALLBACK_POSTS;
  }
}

export default async function BlogIndexPage({ searchParams }) {
  const posts = await getPublishedPosts();
  const pageParam = searchParams?.page;
  const currentPage = Math.max(1, parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10));
  const POSTS_PER_PAGE = 12;

  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE) || 1;
  const validPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);

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

      <main style={{ position: 'relative', zIndex: 1, padding: '40px 20px 80px' }}>
        <section className="dark-section-card">
          <div className="dark-heading-center">
            <span>KWICKBOT INSIGHTS</span>
            <h1 className="retro-dot-headline" style={{ fontSize: 'clamp(28px, 5vw, 56px)', margin: '16px auto' }}>
              Blog &amp; E-Commerce Guides
            </h1>
            <p className="retro-subhead" style={{ margin: '0 auto' }}>
              Tutorials, pricing breakdown guides, and automation strategies for WhatsApp AI support.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            maxWidth: '1120px',
            margin: '40px auto 0'
          }}>
            {paginatedPosts.map((post) => (
              <article key={post._id || post.slug} className="dark-pricing-card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                {post.coverImage && (
                  <img 
                    src={post.coverImage} 
                    alt={post.title} 
                    style={{ width: '100%', height: '190px', objectFit: 'cover', display: 'block' }} 
                  />
                )}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    {post.tags && post.tags.length ? post.tags.join(' • ') : 'Guide'}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '12px', lineHeight: '1.4' }}>
                    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: '#ffffff' }}>
                      {post.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.6', marginBottom: '20px', flex: 1 }}>
                    {post.summary}
                  </p>
                  <Link href={`/blog/${post.slug}`} style={{
                    color: '#38bdf8',
                    fontWeight: '600',
                    textDecoration: 'none',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    Read Full Article →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '48px',
              flexWrap: 'wrap'
            }}>
              {validPage > 1 ? (
                <Link href={`/blog?page=${validPage - 1}`} className="glowing-btn-white small" style={{ fontSize: '14px', textDecoration: 'none' }}>
                  ← Previous
                </Link>
              ) : (
                <span style={{ padding: '8px 16px', color: '#52525b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '100px', fontSize: '14px' }}>
                  ← Previous
                </span>
              )}

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Link
                    key={pageNum}
                    href={`/blog?page=${pageNum}`}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '100px',
                      background: pageNum === validPage ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                      color: pageNum === validPage ? '#09090b' : '#a1a1aa',
                      fontWeight: pageNum === validPage ? '700' : '500',
                      textDecoration: 'none',
                      fontSize: '14px',
                      border: pageNum === validPage ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {pageNum}
                  </Link>
                ))}
              </div>

              {validPage < totalPages ? (
                <Link href={`/blog?page=${validPage + 1}`} className="glowing-btn-white small" style={{ fontSize: '14px', textDecoration: 'none' }}>
                  Next →
                </Link>
              ) : (
                <span style={{ padding: '8px 16px', color: '#52525b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '100px', fontSize: '14px' }}>
                  Next →
                </span>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
