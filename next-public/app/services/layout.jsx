import { pageMetadata, SITE_URL } from '../seo';
import { safeJsonStringify } from '../../utils/jsonSanitizer';

export const metadata = pageMetadata({
  path: "/services",
  title: "WhatsApp Automation Services for E-commerce",
  description: "Live chat with AI handoff, automatic order updates, an AI knowledge base, broadcasts and a WhatsApp API for your own software, on the official Meta Cloud API.",
  keywords: [
    "WhatsApp automation services",
    "WhatsApp order notifications",
    "WhatsApp live chat",
    "WhatsApp API for CRM",
    "Shopify WhatsApp automation"
  ]
});

const servicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Kwickbot services',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Service',
        name: 'WhatsApp customer support automation',
        description: 'AI answers on WhatsApp from your store data and documents, with Live Chat handoff to your team.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    },
    {
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'Service',
        name: 'WhatsApp order notifications',
        description: 'Order confirmation and shipping templates sent automatically from Shopify or WooCommerce order events.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    },
    {
      '@type': 'ListItem',
      position: 3,
      item: {
        '@type': 'Service',
        name: 'AI knowledge base for WhatsApp',
        description: 'Upload FAQ and policy PDFs so AI replies match your business rules.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    },
    {
      '@type': 'ListItem',
      position: 4,
      item: {
        '@type': 'Service',
        name: 'WhatsApp broadcasts and cart recovery',
        description: 'Approved template campaigns from CSV audiences, scheduling and abandoned-cart reminders.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    },
    {
      '@type': 'ListItem',
      position: 5,
      item: {
        '@type': 'Service',
        name: 'WhatsApp API for your software',
        description: 'REST API to send templates, text and media, with signed webhooks for incoming messages.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    },
    {
      '@type': 'ListItem',
      position: 6,
      item: {
        '@type': 'Service',
        name: 'Usage analytics and governance',
        description: 'Conversation, message and AI token usage against plan limits.',
        provider: { '@type': 'Organization', name: 'Kwickbot', url: SITE_URL },
        areaServed: 'IN'
      }
    }
  ]
};

export default function Layout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonStringify(servicesSchema) }} />
      {children}
    </>
  );
}
