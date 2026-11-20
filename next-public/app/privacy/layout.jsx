import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Policy",
  description: "How Kwickbot collects, processes and secures merchant and customer data, and how to stay compliant with WhatsApp Business policies."
});

export default function Layout({ children }) {
  return children;
}
