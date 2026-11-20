import { pageMetadata } from '../seo';

export const metadata = pageMetadata({
  path: "/login",
  title: "Sign in",
  description: "Sign in to your Kwickbot dashboard.",
  noindex: true
});

export default function Layout({ children }) {
  return children;
}
