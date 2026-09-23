'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header-wrapper">
      <nav className="landing-nav-pill">
        <Link href="/" className="logo-circle-btn" aria-label="Kwickbot Home">
          <img src="/app-icon.png" className="logo-img-inside" alt="Kwickbot Logo" />
        </Link>

        <div className="nav-pill-links">
          <Link href="/" className={pathname === '/' ? 'active' : ''}>
            Home
          </Link>
          <Link href="/services" className={pathname === '/services' ? 'active' : ''}>
            Services
          </Link>
          <Link href="/about" className={pathname === '/about' ? 'active' : ''}>
            About Us
          </Link>
          <Link href="/blog" className={pathname.startsWith('/blog') ? 'active' : ''}>
            Blog
          </Link>
          <Link href="/pricing" className={pathname === '/pricing' ? 'active' : ''}>
            Pricing
          </Link>
        </div>

        <div className="nav-pill-actions">
          <a href="https://kwickbot.in/login" className="sign-in-pill">
            Sign in
          </a>
          <Link href="/demo" className="cta-pill-small">
            Book demo
          </Link>
        </div>
      </nav>
    </header>
  );
}
