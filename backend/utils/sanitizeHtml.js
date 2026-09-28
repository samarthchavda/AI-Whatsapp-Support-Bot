/**
 * HTML Sanitizer to prevent XSS in blog post content while preserving valid formatting.
 */
function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return dirtyHtml || '';
  }

  let clean = dirtyHtml;

  // 1. Strip script tags and their inner content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Strip iframe, object, embed, frame tags and contents
  clean = clean.replace(/<(iframe|object|embed|frame|frameset)\b[^>]*>(.*?)<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|frame|frameset)\b[^>]*\/?>/gi, '');

  // 3. Strip inline event handlers (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Strip javascript: or vbscript: URLs in attributes
  clean = clean.replace(/(href|src|action)\s*=\s*['"]\s*(?:javascript|vbscript):[^'"]*['"]/gi, '$1="#"');
  clean = clean.replace(/(href|src|action)\s*=\s*(?:javascript|vbscript):[^\s>]*/gi, '$1="#"');

  return clean;
}

module.exports = { sanitizeHtml };
