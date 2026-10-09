export default async function sitemap() {
  const baseUrl = 'https://kwickbot.in';

  // Core static routes
  const staticRoutes = [
    '',
    '/about',
    '/pricing',
    '/services',
    '/demo',
    '/blog',
    '/privacy',
    '/terms',
    '/refund',
    '/data-deletion',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' || route === '/blog' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/blog' || route === '/pricing' ? 0.9 : 0.8,
  }));

  // Fetch dynamic blog posts from Express API
  try {
    const res = await fetch('http://localhost:5001/api/blog', {
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || data.data || (Array.isArray(data) ? data : []);
      if (posts.length > 0) {
        const dynamicBlogRoutes = posts.map((post) => ({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString(),
          changeFrequency: 'weekly',
          priority: 0.7,
        }));
        return [...staticRoutes, ...dynamicBlogRoutes];
      }
    }
  } catch (err) {
    console.error('Error fetching blog posts for sitemap.js:', err.message);
  }

  // Fallback to static blog slugs if API is unavailable during build
  const fallbackSlugs = [
    'multimodal-ai-whatsapp-cloud-api-ecommerce-support-guide-2026',
    'agentic-ai-whatsapp-cloud-api-ecommerce-automation-guide-2026',
    'meta-whatsapp-api-changes-october-2026-pricing-guide',
    'whatsapp-flows-native-checkout-ai-agents-guide-2026',
    'what-are-whatsapp-meta-templates-simple-guide-2026',
    'whatsapp-broadcasting-meta-approved-campaigns-guide-2026',
    'whatsapp-business-api-pricing-meta-messaging-costs-2026-guide',
    'whatsapp-ecommerce-automation-d2c-brands-guide-2026',
    'shopify-whatsapp-integration-setup-guide'
  ];

  const fallbackRoutes = fallbackSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...fallbackRoutes];
}
