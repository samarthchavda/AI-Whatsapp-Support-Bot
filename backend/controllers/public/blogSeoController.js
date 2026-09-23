const fs = require('fs');
const path = require('path');
const BlogPost = require('../../models/BlogPost');

const getImageUrl = (url) => {
  if (!url) return 'https://kwickbot.in/og-image.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `https://kwickbot.in${cleanPath}`;
};

const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const calculateReadingTime = (text) => {
  if (!text) return '3 minutes';
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const words = cleanText.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} minutes`;
};

exports.renderBlogPageWithSeo = async (req, res) => {
  try {
    const buildPath = path.join(__dirname, '../../../frontend/build/index.html');
    const localPublicPath = path.join(__dirname, '../../../frontend/public/index.html');
    
    let htmlPath = fs.existsSync(buildPath) ? buildPath : localPublicPath;
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).send('HTML template not found');
    }

    let html = fs.readFileSync(htmlPath, 'utf8');
    const slug = req.params.slug;

    let seoTitle = 'WhatsApp AI & E-commerce Customer Support Blog | Kwickbot';
    let seoDesc = "Explore Kwickbot's latest guides, tutorials, and insights on WhatsApp AI customer support, e-commerce automation, and slashing CAC.";
    let seoKeywords = 'WhatsApp AI blog, customer support articles, e-commerce automation guides, Shopify WhatsApp chatbot, WooCommerce support AI, Kwickbot insights';
    let seoImage = 'https://kwickbot.in/og-image.jpg';
    let seoUrl = 'https://kwickbot.in/blog';
    let isArticle = false;
    let publishedTime = new Date().toISOString();
    let modifiedTime = new Date().toISOString();
    let authorName = 'Kwickbot Team';
    let readingTime = '4 minutes';
    let schemaJson = null;

    if (slug) {
      const post = await BlogPost.findOne({ slug, status: 'published' });
      if (post) {
        isArticle = true;
        seoTitle = post.seoTitle || `${post.title} | Kwickbot`;
        seoDesc = post.seoDescription || post.summary;
        seoKeywords = post.keywords || (post.tags && post.tags.length ? post.tags.join(', ') : 'WhatsApp AI, Customer Support, E-commerce Bot, Kwickbot');
        seoImage = post.coverImage ? getImageUrl(post.coverImage) : 'https://kwickbot.in/og-image.jpg';
        seoUrl = `https://kwickbot.in/blog/${post.slug}`;
        publishedTime = post.createdAt ? new Date(post.createdAt).toISOString() : publishedTime;
        modifiedTime = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedTime;
        authorName = post.author || 'Kwickbot Team';
        readingTime = calculateReadingTime(post.content);

        schemaJson = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.summary,
          "image": seoImage,
          "author": {
            "@type": "Organization",
            "name": authorName
          },
          "publisher": {
            "@type": "Organization",
            "name": "Kwickbot",
            "logo": {
              "@type": "ImageObject",
              "url": "https://kwickbot.in/logo.png"
            }
          },
          "datePublished": publishedTime,
          "dateModified": modifiedTime,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": seoUrl
          }
        };
      }
    }

    const safeTitle = escapeHtml(seoTitle);
    const safeDesc = escapeHtml(seoDesc);
    const safeKeywords = escapeHtml(seoKeywords);
    const safeImage = escapeHtml(seoImage);
    const safeUrl = escapeHtml(seoUrl);
    const safeAuthor = escapeHtml(authorName);
    const safeReadingTime = escapeHtml(readingTime);

    // Clean out existing default title and meta tags from template to prevent duplication
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']title["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+property=["']article:[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

    // Build complete Rank Math / Yoast style enterprise metadata block
    let seoBlock = `
<!-- Kwickbot Advanced SEO & Social Media Optimization Engine -->
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}" />
<meta name="keywords" content="${safeKeywords}" />
<meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large" />
<link rel="canonical" href="${safeUrl}" />

<!-- Open Graph / Facebook / WhatsApp SEO -->
<meta property="og:locale" content="en_US" />
<meta property="og:type" content="${isArticle ? 'article' : 'website'}" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDesc}" />
<meta property="og:url" content="${safeUrl}" />
<meta property="og:site_name" content="Kwickbot" />
${isArticle ? `<meta property="article:published_time" content="${publishedTime}" />
<meta property="article:modified_time" content="${modifiedTime}" />` : ''}
<meta property="og:image" content="${safeImage}" />
<meta property="og:image:secure_url" content="${safeImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${safeTitle}" />

<!-- Twitter / X Card SEO -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDesc}" />
<meta name="twitter:image" content="${safeImage}" />
<meta name="twitter:label1" content="Written by" />
<meta name="twitter:data1" content="${safeAuthor}" />
<meta name="twitter:label2" content="Est. reading time" />
<meta name="twitter:data2" content="${safeReadingTime}" />
<!-- / Kwickbot SEO Engine -->
`;

    if (schemaJson) {
      seoBlock += `\n<script type="application/ld+json">\n${JSON.stringify(schemaJson, null, 2)}\n</script>\n`;
    }

    // Inject immediately after <head>
    html = html.replace('<head>', `<head>${seoBlock}`);

    res.header('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering blog HTML SEO:', error);
    res.status(500).send('Error rendering page');
  }
};
