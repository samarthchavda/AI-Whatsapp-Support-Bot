const BlogPost = require('../../models/BlogPost');

exports.generateSitemap = async (req, res) => {
  try {
    const staticUrls = [
      { loc: 'https://kwickbot.in/', changefreq: 'daily', priority: '1.0' },
      { loc: 'https://kwickbot.in/about', changefreq: 'monthly', priority: '0.8' },
      { loc: 'https://kwickbot.in/book-demo', changefreq: 'monthly', priority: '0.9' },
      { loc: 'https://kwickbot.in/services', changefreq: 'monthly', priority: '0.8' },
      { loc: 'https://kwickbot.in/privacy', changefreq: 'monthly', priority: '0.5' },
      { loc: 'https://kwickbot.in/blog', changefreq: 'weekly', priority: '0.9' }
    ];

    // Fetch all published blog posts from database
    const blogPosts = await BlogPost.find({ status: 'published' }).select('slug updatedAt');

    const dynamicUrls = blogPosts.map(post => ({
      loc: `https://kwickbot.in/blog/${post.slug}`,
      lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    }));

    const allUrls = [...staticUrls, ...dynamicUrls];

    // Generate XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    allUrls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      } else {
        xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      }
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    // Set header content type to XML
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
};
