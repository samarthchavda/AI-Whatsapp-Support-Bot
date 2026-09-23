import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata = {
  metadataBase: new URL('https://kwickbot.in'),
  title: 'Intelligence Designed To Evolve — Kwickbot AI WhatsApp Support',
  description: 'Kwickbot is an AI-powered WhatsApp customer support and chatbot automation platform for e-commerce. Automate customer queries, track orders, sync Shopify & WooCommerce 24/7.',
  keywords: ['WhatsApp AI', 'WhatsApp Chatbot', 'E-commerce Support', 'Customer Service Automation', 'Shopify WhatsApp Bot', 'WooCommerce Bot', 'Kwickbot'],
  openGraph: {
    title: 'Intelligence Designed To Evolve — Kwickbot AI',
    description: 'Automate customer queries 24/7 with Google Gemini AI integrated directly into your WhatsApp Cloud API.',
    url: 'https://kwickbot.in',
    siteName: 'Kwickbot AI',
    images: [
      {
        url: 'https://kwickbot.in/logo.png',
        width: 800,
        height: 600,
        alt: 'Kwickbot AI Logo',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
