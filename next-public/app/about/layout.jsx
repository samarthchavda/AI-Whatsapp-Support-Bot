import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/about",
  title: "About Us: AI WhatsApp Support for D2C Brands",
  description: "Kwickbot helps D2C and e-commerce brands answer customers on WhatsApp with grounded AI, live order data and human handoff, on the official Meta Cloud API."
});

export default function Layout({ children }) {
  return children;
}
