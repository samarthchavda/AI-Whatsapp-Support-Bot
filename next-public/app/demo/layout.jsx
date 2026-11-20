import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/demo",
  title: "Book a Demo of Kwickbot on WhatsApp",
  description: "See Kwickbot answer your real customer questions on WhatsApp. Book a 30-minute walkthrough for Shopify, WooCommerce or your own CRM and API."
});

export default function Layout({ children }) {
  return children;
}
