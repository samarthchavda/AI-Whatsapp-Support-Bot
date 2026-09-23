'use client';

import React from 'react';
import Link from 'next/link';
import { FaLinkedin, FaTwitter, FaWhatsapp, FaEnvelope, FaPhoneAlt } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="dark-footer-wrapper">
      <div className="dark-footer-container">
        {/* Left Column: Brand & Socials */}
        <div className="footer-brand-container">
          <div className="footer-brand">
            <img src="/app-icon.png" className="footer-logo-img" alt="Kwickbot Logo" />
            <span className="footer-brand-title">Kwickbot</span>
          </div>
          <p className="footer-desc">
            AI-powered WhatsApp customer support &amp; e-commerce automation platform.
          </p>
          <div className="footer-socials">
            <a href="https://www.linkedin.com/company/kwickbot/" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer" title="WhatsApp Support" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
          </div>
        </div>

        {/* Center Grid: Links */}
        <div className="footer-links-grid">
          <div className="footer-links-col">
            <h4>Product</h4>
            <Link href="/services">Services</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/demo">Book Demo</Link>
          </div>
          <div className="footer-links-col">
            <h4>Company</h4>
            <Link href="/about">About Us</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refund">Refund Policy</Link>
          </div>
          <div className="footer-links-col">
            <h4>Account</h4>
            <a href="https://kwickbot.in/login">Sign In</a>
            <Link href="/demo">Book Demo</Link>
          </div>
          <div className="footer-links-col contact-col">
            <h4>Contact</h4>
            <a href="mailto:hello@kwickbot.in" className="contact-link">
              <FaEnvelope className="contact-icon" /> hello@kwickbot.in
            </a>
            <a href="tel:+918128420287" className="contact-link">
              <FaPhoneAlt className="contact-icon" /> +91 8128420287
            </a>
            <a href="https://wa.me/918128420287" target="_blank" rel="noopener noreferrer" className="contact-link">
              <FaWhatsapp className="contact-icon" style={{ color: '#25D366' }} /> WhatsApp Support
            </a>
          </div>
        </div>

        {/* Right Column: CTA Card */}
        <div className="footer-cta-container">
          <div className="dark-cta-card">
            <div className="cta-sparkle">⚡ 14-Day Free Trial</div>
            <h3>Automate WhatsApp support today</h3>
            <p>Connect Shopify or WooCommerce in 1 click and let Gemini AI handle routine customer queries 24/7.</p>
            <div className="footer-cta-buttons">
              <Link href="/demo" className="glowing-btn-white small">
                Book Live Demo →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subbar */}
      <div className="footer-subbar-dark">
        <p>© {new Date().getFullYear()} Kwickbot AI. All rights reserved.</p>
        <div className="footer-legal-inline">
          <Link href="/privacy">Privacy</Link>
          <span className="dot">•</span>
          <Link href="/terms">Terms</Link>
          <span className="dot">•</span>
          <Link href="/refund">Refund Policy</Link>
          <span className="dot">•</span>
          <Link href="/data-deletion">Data Deletion</Link>
        </div>
      </div>
    </footer>
  );
}
