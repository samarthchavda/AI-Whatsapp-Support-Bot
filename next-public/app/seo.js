// Shared SEO helpers. Every public route gets its own title, description,
// canonical URL and social preview, so search engines index each page on
// its own instead of treating it as a copy of the home page.

export const SITE_URL = 'https://kwickbot.in';
export const SITE_NAME = 'Kwickbot';
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: 'Kwickbot — AI WhatsApp support for Shopify and WooCommerce stores'
};

/**
 * @param {object} opts
 * @param {string} opts.path      Route path, e.g. '/services'
 * @param {string} opts.title     Page title (the layout adds "| Kwickbot")
 * @param {string} opts.description  ~150–160 characters
 * @param {boolean} [opts.noindex]   Keep utility pages (login etc.) out of search
 * @param {string[]} [opts.keywords]
 */
export function pageMetadata({ path, title, description, noindex = false, keywords }) {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [DEFAULT_OG_IMAGE.url]
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {})
  };
}
