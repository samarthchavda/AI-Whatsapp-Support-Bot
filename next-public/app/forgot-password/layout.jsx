import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/forgot-password",
  title: "Reset your password",
  description: "Request a password reset link for your Kwickbot account.",
  noindex: true
});

export default function Layout({ children }) {
  return children;
}
