import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: '/signup',
  title: 'Create your Kwickbot account',
  description: 'Create a Kwickbot merchant account and set up WhatsApp support for your business.'
});

export default function Layout({ children }) {
  return children;
}
