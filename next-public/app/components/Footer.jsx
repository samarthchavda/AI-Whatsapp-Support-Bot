'use client';

import React from 'react';
import Link from 'next/link';
import { FaLinkedin, FaWhatsapp, FaEnvelope, FaPhoneAlt, FaArrowRight } from 'react-icons/fa';
import BrandMark from './BrandMark';

export default function Footer() {
  const [isAdminPortal, setIsAdminPortal] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('admin.')) {
      setIsAdminPortal(true);
    }
  }, []);

  const year = new Date().getFullYear();

  if (isAdminPortal) {
    return (
      <footer className="footer-bottom container" style={{ justifyContent: 'center' }}>
        © {year} Kwickbot Master Control. All rights reserved.
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="container" style={{ paddingTop: 64 }}>
        <div className="band band-deep cta-band" data-reveal="fade">
          <BrandMark variant="dark" className="cta-mark" />
          <div className="cta-copy">
            <span className="eyebrow" style={{ color: 'var(--pista)' }}>14-day free trial</span>
            <h2>Automate WhatsApp support today</h2>
            <p>Connect your WhatsApp number and store, and let Kwickbot answer routine customer questions around the clock.</p>
          </div>
          <div className="cta-actions">
            <Link href="/signup" className="btn btn-pista">Create account <FaArrowRight /></Link>
            <Link href="/pricing" className="btn btn-outline-light">See pricing</Link>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" aria-label="Kwickbot home">
              <BrandMark />
              <span className="brand-name">kwickbot</span>
            </Link>
            <p>AI WhatsApp support and e-commerce automation for Shopify and WooCommerce stores.</p>
            <div className="footer-socials">
              <a href="https://www.linkedin.com/company/kwickbot/" target="_blank" rel="noopener noreferrer" aria-label="Kwickbot on LinkedIn"><FaLinkedin /></a>
              <a href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer" aria-label="Chat with Kwickbot on WhatsApp"><FaWhatsapp /></a>
              <a href="mailto:hello@kwickbot.in" aria-label="Email Kwickbot"><FaEnvelope /></a>
            </div>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link href="/services">Services</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/signup">Create account</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link href="/about">About us</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/contact">Contact us</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <a href="/login">Sign in</a>
              <Link href="/forgot-password">Reset password</Link>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <a href="mailto:hello@kwickbot.in"><FaEnvelope aria-hidden="true" /> hello@kwickbot.in</a>
              <a href="tel:+918128420287"><FaPhoneAlt aria-hidden="true" /> +91 81284 20287</a>
              <a href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true" /> WhatsApp support</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} Kwickbot AI. All rights reserved.</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund">Refund policy</Link>
            <Link href="/data-deletion">Data deletion</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
