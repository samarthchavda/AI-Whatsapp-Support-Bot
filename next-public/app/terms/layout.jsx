import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Service",
  description: "The terms that govern your use of the Kwickbot WhatsApp support and automation platform."
});

export default function Layout({ children }) {
  return children;
}
