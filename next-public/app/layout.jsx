import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  metadataBase: new URL('https://kwickbot.in'),
  title: {
    default: 'Kwickbot — AI WhatsApp Customer Support & Chatbot Automation',
    template: '%s | Kwickbot AI'
  },
  description: 'Automate e-commerce customer support 24/7 on WhatsApp using Google Gemini AI, Meta Cloud API, Shopify & WooCommerce integrations, order tracking, and live human handoff.',
  keywords: [
    'WhatsApp AI support',
    'WhatsApp Cloud API',
    'Shopify WhatsApp chatbot',
    'WooCommerce WhatsApp bot',
    'AI customer service automation',
    'WhatsApp order tracking bot',
    'WhatsApp human handoff',
    'Kwickbot AI',
    'E-commerce customer support',
    'WhatsApp marketing automation'
  ],
  authors: [{ name: 'Kwickbot AI Team', url: 'https://kwickbot.in' }],
  creator: 'Kwickbot AI',
  publisher: 'Kwickbot AI',
  alternates: {
    canonical: 'https://kwickbot.in',
  },
  openGraph: {
    title: 'Kwickbot — AI WhatsApp Customer Support & Chatbot Automation',
    description: 'Automate customer support 24/7 with Google Gemini AI integrated directly into your WhatsApp Cloud API and Shopify/WooCommerce store.',
    url: 'https://kwickbot.in',
    siteName: 'Kwickbot AI',
    images: [
      {
        url: 'https://kwickbot.in/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Kwickbot AI WhatsApp Support Platform',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kwickbot — AI WhatsApp Customer Support & Chatbot Automation',
    description: 'Automate customer support 24/7 with Google Gemini AI integrated directly into your WhatsApp Cloud API.',
    images: ['https://kwickbot.in/og-image.jpg'],
    creator: '@kwickbot',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/logo192.png', type: 'image/png', sizes: '192x192' }
    ],
    apple: '/apple-touch-icon.png',
  }
};

export default function RootLayout({ children }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kwickbot AI',
    url: 'https://kwickbot.in',
    logo: 'https://kwickbot.in/logo.png',
    description: 'AI-powered WhatsApp customer support and chatbot automation platform for e-commerce stores (Shopify, WooCommerce).',
    sameAs: [
      'https://facebook.com/kwickbot',
      'https://twitter.com/kwickbot',
      'https://linkedin.com/company/kwickbot'
    ],
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
    name: 'Kwickbot AI',
    operatingSystem: 'All',
    applicationCategory: 'BusinessApplication',
    url: 'https://kwickbot.in',
    image: 'https://kwickbot.in/og-image.jpg',
    description: 'Kwickbot connects WhatsApp Cloud API, Google Gemini AI, and Shopify/WooCommerce stores to automate order tracking, customer support, and agent handoffs 24/7.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: '1499',
      highPrice: '9999',
      offerCount: '3'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '128'
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kwickbot AI',
    url: 'https://kwickbot.in',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://kwickbot.in/blog?search={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        
        {/* Structured Data (JSON-LD Schemas for SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
