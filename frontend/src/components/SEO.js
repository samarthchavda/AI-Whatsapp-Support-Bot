import { useEffect } from 'react';

const setMetaTag = (attrName, attrValue, content) => {
  if (!content) return;
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

export default function SEO({
  title = 'Kwickbot — WhatsApp AI Customer Support & Chatbot Automation',
  description = 'Kwickbot is an AI-powered WhatsApp customer support and chatbot automation platform for e-commerce. Automate customer queries, track orders, sync Shopify & WooCommerce, and manage live human handoffs 24/7.',
  keywords = 'WhatsApp AI, WhatsApp Chatbot, E-commerce Support, Customer Service Automation, Shopify WhatsApp Bot, WooCommerce Bot, Kwickbot',
  ogTitle,
  ogDescription,
  ogKeywords,
  ogImage = 'https://kwickbot.in/og-image.jpg',
  url,
  type = 'website',
  schema = null
}) {
  useEffect(() => {
    const finalTitle = title;
    const finalDesc = description;
    const finalKeywords = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    const finalOgTitle = ogTitle || finalTitle;
    const finalOgDesc = ogDescription || finalDesc;
    const finalOgKeywords = ogKeywords ? (Array.isArray(ogKeywords) ? ogKeywords.join(', ') : ogKeywords) : finalKeywords;
    const finalUrl = url || window.location.href;

    // Document Title
    document.title = finalTitle;

    // Basic Meta Tags
    setMetaTag('name', 'title', finalTitle);
    setMetaTag('name', 'description', finalDesc);
    setMetaTag('name', 'keywords', finalKeywords);

    // OpenGraph / Facebook / WhatsApp
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', finalUrl);
    setMetaTag('property', 'og:title', finalOgTitle);
    setMetaTag('property', 'og:description', finalOgDesc);
    setMetaTag('property', 'og:keywords', finalOgKeywords);
    setMetaTag('property', 'og:image', ogImage);

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:url', finalUrl);
    setMetaTag('name', 'twitter:title', finalOgTitle);
    setMetaTag('name', 'twitter:description', finalOgDesc);
    setMetaTag('name', 'twitter:keywords', finalOgKeywords);
    setMetaTag('name', 'twitter:image', ogImage);

    // JSON-LD Schema Script
    let scriptElement = document.querySelector('script[data-seo-schema="true"]');
    if (schema) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.setAttribute('type', 'application/ld+json');
        scriptElement.setAttribute('data-seo-schema', 'true');
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(schema);
    } else if (scriptElement) {
      scriptElement.remove();
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogKeywords, ogImage, url, type, schema]);

  return null;
}
