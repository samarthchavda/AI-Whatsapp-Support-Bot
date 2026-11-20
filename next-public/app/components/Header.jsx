'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';
import BrandMark from './BrandMark';

const NAV = [
  { href: '/', label: 'Home', match: (p) => p === '/' },
  { href: '/services', label: 'Services', match: (p) => p === '/services' },
  { href: '/pricing', label: 'Pricing', match: (p) => p === '/pricing' },
  { href: '/blog', label: 'Blog', match: (p) => p.startsWith('/blog') },
  { href: '/about', label: 'About us', match: (p) => p === '/about' },
];

export default function Header() {
  const pathname = usePathname() || '/';
  const [isAdminPortal, setIsAdminPortal] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('admin.')) {
      setIsAdminPortal(true);
    }
  }, []);

  React.useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (isAdminPortal) return null;

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main">
        <Link href="/" className="brand" aria-label="Kwickbot home">
          <BrandMark />
          <span className="brand-name">kwickbot</span>
        </Link>

        <div className="nav-links">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={item.match(pathname) ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <a href="/login" className="link-signin">Sign in</a>
          <Link href="/demo" className="btn btn-primary btn-sm">Book a demo</Link>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={`menu-link ${item.match(pathname) ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
        <div className="menu-actions">
          <a href="/login" className="btn btn-secondary btn-sm">Sign in</a>
          <Link href="/demo" className="btn btn-primary btn-sm">Book a demo</Link>
        </div>
      </div>
    </header>
  );
}
