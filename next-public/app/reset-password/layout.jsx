import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/reset-password",
  title: "Choose a new password",
  description: "Set a new password for your Kwickbot account.",
  noindex: true
});

export default function Layout({ children }) {
  return children;
}
