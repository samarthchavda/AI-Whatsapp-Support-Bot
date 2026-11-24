import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: '/contact',
  title: 'Contact Kwickbot',
  description: 'Contact the Kwickbot team about WhatsApp support, integrations, plans or your existing account.'
});

export default function Layout({ children }) {
  return children;
}
