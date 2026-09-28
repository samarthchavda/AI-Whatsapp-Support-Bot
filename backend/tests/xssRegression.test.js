const { sanitizeHtml } = require('../utils/sanitizeHtml');

describe('XSS Regression & HTML Sanitization Tests', () => {
  test('Strips script tags and embedded payload content', () => {
    const malicious = '<p>Normal text</p><script>alert("XSS Attack!")</script><div>More text</div>';
    const sanitized = sanitizeHtml(malicious);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("XSS Attack!")');
    expect(sanitized).toContain('<p>Normal text</p>');
    expect(sanitized).toContain('<div>More text</div>');
  });

  test('Strips inline event handlers (onerror, onload, onclick, onmouseover)', () => {
    const malicious = '<img src="invalid.jpg" onerror="alert(document.cookie)" onload="doEvil()" onclick="steal()" />';
    const sanitized = sanitizeHtml(malicious);

    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).toContain('<img src="invalid.jpg"');
  });

  test('Strips dangerous javascript: pseudo-protocols in href and src attributes', () => {
    const malicious = '<a href="javascript:alert(\'hacked\')">Click me</a>';
    const sanitized = sanitizeHtml(malicious);

    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('<a href="#"');
  });

  test('Strips iframe, object, and embed tags', () => {
    const malicious = '<iframe src="https://evil.com"></iframe><object data="evil.swf"></object>';
    const sanitized = sanitizeHtml(malicious);

    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('<object');
    expect(sanitized).not.toContain('evil.com');
  });

  test('Preserves clean, legitimate blog HTML formatting', () => {
    const cleanBlog = `
      <h1>Understanding AI Automation for E-Commerce</h1>
      <p>Kwickbot provides <strong>24/7 AI-powered support</strong> for your online store.</p>
      <ul>
        <li>Shopify & WooCommerce integration</li>
        <li>Instant automated order tracking</li>
      </ul>
      <p>Visit <a href="https://kwickbot.in" target="_blank">Kwickbot Official Site</a> for details.</p>
    `.trim();

    const sanitized = sanitizeHtml(cleanBlog);

    expect(sanitized).toContain('<h1>Understanding AI Automation for E-Commerce</h1>');
    expect(sanitized).toContain('<strong>24/7 AI-powered support</strong>');
    expect(sanitized).toContain('<li>Shopify & WooCommerce integration</li>');
    expect(sanitized).toContain('<a href="https://kwickbot.in" target="_blank">Kwickbot Official Site</a>');
  });

  test('Safely serializes structured JSON-LD data preventing script tag breakouts', () => {
    const safeJsonStringify = (data) => JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const maliciousPayload = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Safe Article</script><script>alert('xss')</script>"
    };

    const serialized = safeJsonStringify(maliciousPayload);

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
  });
});
