import './globals.css';
import { SITE_URL, DEFAULT_OG_IMAGE } from './seo';
import Header from './components/Header';
import PromoBanner from './components/PromoBanner';
import Footer from './components/Footer';
import MotionProvider from './components/MotionProvider';
import { safeJsonStringify } from '../utils/jsonSanitizer';

const HOME_TITLE = 'AI WhatsApp Support for Shopify & WooCommerce | Kwickbot';
const HOME_DESCRIPTION = 'Kwickbot answers customers on WhatsApp with Gemini AI, sends order confirmations and shipping updates automatically, and hands chats to your team when needed.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: '%s | Kwickbot'
  },
  description: HOME_DESCRIPTION,
  applicationName: 'Kwickbot',
  keywords: [
    'WhatsApp AI chatbot for Shopify',
    'WooCommerce WhatsApp chatbot',
    'WhatsApp Cloud API',
    'WhatsApp customer support automation',
    'WhatsApp order confirmation message',
    'WhatsApp shipping updates',
    'WhatsApp Business API India',
    'WhatsApp live chat human handoff',
    'WhatsApp broadcast and abandoned cart'
  ],
  authors: [{ name: 'Kwickbot', url: SITE_URL }],
  creator: 'Kwickbot',
  publisher: 'Kwickbot',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    siteName: 'Kwickbot',
    images: [DEFAULT_OG_IMAGE],
    locale: 'en_IN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/logo192.png', type: 'image/png', sizes: '192x192' }
    ],
    apple: '/apple-touch-icon.png'
  },
  manifest: '/manifest.json'
};

export const viewport = {
  themeColor: '#2A3D18'
};

// Price range for the SoftwareApplication schema, read from the live plans
// (refreshed hourly). If the plans API is unreachable the offer is left out
// rather than showing stale prices.
async function getPriceOffer() {
  try {
    const apiBase = process.env.PLANS_API_URL || 'https://kwickbot.in/api';
    const res = await fetch(`${apiBase}/auth/plans/public`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const prices = (json?.data || []).filter((p) => !p.contactSales && p.monthlyPrice > 0).map((p) => p.monthlyPrice);
    if (!prices.length) return null;
    return {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: String(Math.min(...prices)),
      highPrice: String(Math.max(...prices)),
      offerCount: String(prices.length),
      url: 'https://kwickbot.in/pricing'
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const priceOffer = await getPriceOffer();
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kwickbot',
    url: 'https://kwickbot.in',
    logo: 'https://kwickbot.in/logo.png',
    description: 'AI-powered WhatsApp customer support and chatbot automation platform for e-commerce stores (Shopify, WooCommerce).',
    sameAs: ['https://www.linkedin.com/company/kwickbot/'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@kwickbot.in',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi', 'Gujarati']
    }
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kwickbot',
    operatingSystem: 'All',
    applicationCategory: 'BusinessApplication',
    url: 'https://kwickbot.in',
    image: 'https://kwickbot.in/og-image.jpg',
    description: 'Kwickbot connects WhatsApp Cloud API, Google Gemini AI, and Shopify/WooCommerce stores to automate order tracking, customer support, and agent handoffs 24/7.',
    ...(priceOffer ? { offers: priceOffer } : {})
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kwickbot',
    url: 'https://kwickbot.in'
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('motion-ready')" }} />

        {/* Structured Data (JSON-LD Schemas for SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonStringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonStringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonStringify(websiteSchema) }}
        />
      </head>
      <body>
        <a href="#main" className="sr-only">Skip to content</a>
        <PromoBanner />
        <Header />
        <div id="main">{children}</div>
        <Footer />
        <MotionProvider />
      </body>
    </html>
  );
}
