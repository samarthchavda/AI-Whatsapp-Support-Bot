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
    const res = await fetch('http://localhost:5001/api/blog/posts', {
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || data.data || (Array.isArray(data) ? data : []);
      const dynamicBlogRoutes = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
      return [...staticRoutes, ...dynamicBlogRoutes];
    }
  } catch (err) {
    console.error('Error fetching blog posts for sitemap.js:', err.message);
  }

  return staticRoutes;
}
