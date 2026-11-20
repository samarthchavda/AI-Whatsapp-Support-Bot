import React from 'react';
import Link from 'next/link';
import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: '/blog',
  title: 'WhatsApp Commerce Blog: Guides for Shopify & D2C Brands',
  description: 'Guides on WhatsApp AI customer support, the WhatsApp Cloud API, Meta templates and pricing, broadcasts and Shopify or WooCommerce automation.'
});

const FALLBACK_POSTS = [
  {
    _id: 'multimodal-ai-whatsapp-cloud-api-2026',
    slug: 'multimodal-ai-whatsapp-cloud-api-ecommerce-support-guide-2026',
    title: 'Multimodal AI on WhatsApp Cloud API (2026): The Complete Guide to Voice Notes, Vision AI Returns & Autonomous E-Commerce Support',
    summary: 'Discover how Multimodal AI on Meta\'s WhatsApp Cloud API is redefining e-commerce support and broadcasting in late 2026. Learn how autonomous AI agents transcribe voice notes, analyze customer product damage photos with Vision AI, process instant in-chat exchanges, and supercharge broadcast conversions while slashing support tickets by 75%.',
    tags: ['Multimodal AI', 'WhatsApp Cloud API', 'Vision AI', 'Customer Support', 'Broadcasting', 'Shopify AI'],
    author: 'Kwickbot AI Research & Product Team',
    createdAt: '2026-10-06T04:30:00.000Z',
    coverImage: '/blog/multimodal-ai-whatsapp-cloud-api-ecommerce-support-2026.jpg'
  },
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

  const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page">
      <main>
        <section className="page-hero">
          <div className="container">
            <div data-reveal="up" className="section-head center">
              <span className="eyebrow">Kwickbot insights</span>
              <h1>Blog &amp; e-commerce guides</h1>
              <p>Tutorials, pricing breakdowns and automation strategies for WhatsApp AI support.</p>
            </div>
          </div>
        </section>

        <section className="section-tight">
          <div className="container">
            <div className="blog-grid" data-stagger>
              {paginatedPosts.map((post) => (
                <article key={post._id || post.slug} className="card card-link post-card">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt="" className="post-cover" loading="lazy" />
                  ) : (
                    <div className="post-cover-fallback" aria-hidden="true" />
                  )}
                  <div className="post-body">
                    <div className="post-meta">
                      <span className="pill" style={{ padding: '4px 10px', fontSize: 12 }}>
                        {post.tags && post.tags.length ? post.tags[0] : 'Guide'}
                      </span>
                      {formatDate(post.createdAt) && <span>{formatDate(post.createdAt)}</span>}
                    </div>
                    <h2>
                      <Link href={`/blog/${post.slug}`} style={{ color: 'inherit' }}>{post.title}</Link>
                    </h2>
                    <p>{post.summary}</p>
                    <Link href={`/blog/${post.slug}`} className="text-link" aria-label={`Read: ${post.title}`}>
                      Read article <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Blog pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 48, flexWrap: 'wrap' }}>
                {validPage > 1 ? (
                  <Link href={`/blog?page=${validPage - 1}`} className="btn btn-secondary btn-sm">← Previous</Link>
                ) : (
                  <span className="btn btn-secondary btn-sm" aria-disabled="true">← Previous</span>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Link
                    key={pageNum}
                    href={`/blog?page=${pageNum}`}
                    aria-current={pageNum === validPage ? 'page' : undefined}
                    className={`btn btn-sm ${pageNum === validPage ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: 42, padding: '0 12px' }}
                  >
                    {pageNum}
                  </Link>
                ))}
                {validPage < totalPages ? (
                  <Link href={`/blog?page=${validPage + 1}`} className="btn btn-secondary btn-sm">Next →</Link>
                ) : (
                  <span className="btn btn-secondary btn-sm" aria-disabled="true">Next →</span>
                )}
              </nav>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
