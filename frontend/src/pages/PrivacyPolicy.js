import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaUserShield, FaChevronLeft, FaCommentDots } from 'react-icons/fa';
import './PrivacyPolicy.css';

function PrivacyPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-container">
      <header className="privacy-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaChevronLeft /> Back to Home
        </button>
        <div className="privacy-logo">
          <FaCommentDots />
          <span className="logo-text">Support Bot Privacy Center</span>
        </div>
      </header>

      <main className="privacy-content">
        <div className="privacy-hero">
          <FaShieldAlt className="hero-icon" />
          <h1>Privacy Policy & Compliance Guidelines</h1>
          <p className="hero-date">Last Updated: June 14, 2026</p>
          <p className="hero-sub">
            Learn how our AI WhatsApp Support Bot platform collects, processes, and secures store customer data, and how to remain compliant with WhatsApp Business policies.
          </p>
        </div>

        <section className="privacy-section-card">
          <h2>1. Data Collection & Usage</h2>
          <p>
            Our platform connects to merchant stores (Shopify, WooCommerce) to sync order details and facilitate customer support. We collect and store:
          </p>
          <ul>
            <li><strong>Store Admin Data:</strong> Name, email address, password, Meta Developer credentials (Access Token, Phone Number ID, Business Account ID).</li>
            <li><strong>Customer Data:</strong> Name, phone number, email address, shipping address, and order transaction details synced from connected platforms.</li>
            <li><strong>Conversation Data:</strong> Text messages and interactive button responses sent to or received from customers via WhatsApp.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>2. Legal Basis for Processing Customer Contacts</h2>
          <div className="legal-callout">
            <FaUserShield className="callout-icon" />
            <div>
              <h3>Why is it lawful to view and store customer contacts?</h3>
              <p>
                Under major privacy frameworks (such as GDPR, CCPA, and DPDP Act), storing and using customer phone numbers and emails for order processing, shipping updates, and customer-initiated support falls under <strong>Performance of a Contract</strong> and <strong>Transactional necessity</strong>. This data is private and accessible only to authorized store admins.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section-card">
          <h2>3. WhatsApp Consent & Meta Compliance Rules</h2>
          <p>
            To protect your store from getting flagged or banned by Meta, you must follow these compliance guidelines:
          </p>
          <div className="guideline-grid">
            <div className="guideline-item">
              <h4>💬 Transactional Messages (Allowed)</h4>
              <p>
                Sending order confirmations, tracking details, shipping updates, or answering customer inquiries does not require explicit prior marketing opt-in, as it is classified as utility/transactional communication.
              </p>
            </div>
            <div className="guideline-item">
              <h4>📢 Marketing Messages (Opt-In Required)</h4>
              <p>
                Sending abandoned cart recovery reminders, discount coupons, or promotional broadcasts **requires prior customer opt-in**. Your storefront checkout page must have a checkbox or notice consenting to receive updates on WhatsApp.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section-card">
          <h2>4. Pricing & WhatsApp Business API Cost Structure</h2>
          <p>
            Understanding the cost breakdown of running an official WhatsApp Support Bot:
          </p>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Charge Type</th>
                <th>Paid To</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Subscription Plan</strong></td>
                <td>AI Support Bot</td>
                <td>Flat monthly software hosting fee (e.g., $29/mo or $79/mo) for bot logic, dashboard controls, and server maintenance.</td>
              </tr>
              <tr>
                <td><strong>AI Token Usage</strong></td>
                <td>AI Support Bot</td>
                <td>Gemini LLM token consumption. Starter plans include a generous quota; additional tokens are billed based on use.</td>
              </tr>
              <tr>
                <td><strong>Meta API Charges</strong></td>
                <td>Meta (Facebook)</td>
                <td>
                  Billed directly by Meta via credit card linked to your Meta Business Manager. Charged per 24-hour conversation window:
                  <ul>
                    <li><strong>Service (User-initiated chat):</strong> First 1,000 conversations each month are **FREE**.</li>
                    <li><strong>Utility (Order tracking, updates):</strong> Low transactional fee per conversation window (e.g., ~₹0.30 in India).</li>
                    <li><strong>Marketing (Cart reminders, broadcasts):</strong> Higher fee per conversation window (e.g., ~₹0.72 in India).</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="privacy-section-card">
          <h2>5. Data Security & Storage</h2>
          <p>
            We implement industry-standard AES-256 encryption to secure your Meta Developer API access tokens in our database. Customer records are strictly isolated using multi-tenant database keys and are never shared across merchants or used to train third-party AI models.
          </p>
        </section>

        <section className="privacy-section-card">
          <h2>6. E-Commerce Integration Prerequisites & Compliance</h2>
          <p>
            For the AI Support Bot to successfully sync order details and verify customer identities for automated WhatsApp tracking, your store must be properly configured:
          </p>
          <div className="guideline-grid">
            <div className="guideline-item">
              <h4>🛍️ Shopify Integration Requirements</h4>
              <ul>
                <li><strong>API Scopes:</strong> The Custom App must have <code>read_customers</code>, <code>read_orders</code>, and <code>read_all_orders</code> enabled.</li>
                <li><strong>Protected Customer Data:</strong> You must explicitly configure access to <em>Customer name</em>, <em>Customer email address</em>, and <em>Customer phone number</em> in your Shopify App Configuration.</li>
                <li>
                  <strong>Shopify Plan Limitations (PII Data Access):</strong> Under Shopify's platform customization policies:
                  <ul style={{ marginTop: '5px', paddingLeft: '20px', listStyleType: 'circle' }}>
                    <li>
                      <strong>Basic Plan ($39/mo):</strong> Restricted to <em>Limited data access (no PII)</em>. Shopify completely redacts customer contact details. 
                      <ul style={{ marginTop: '3px', paddingLeft: '15px', listStyleType: 'square' }}>
                        <li><strong>No Automated Notifications:</strong> Because the customer phone number is missing, the system **cannot** send automated WhatsApp confirmations, invoice bills, tracking alerts, or recovery reminders.</li>
                        <li><strong>AI Support Bot Only:</strong> The merchant still gets the AI chatbot widget/live chat support, and customers can manually type in their order numbers (e.g. `#1008`) to track order status.</li>
                      </ul>
                    </li>
                    <li><strong>Shopify ($105/mo), Advanced ($399/mo), and Plus ($2,300/mo) Plans:</strong> Granted <em>Full data access</em>. All customer details are successfully shared with the Custom App, enabling automated phone-number-based lookup and direct automated WhatsApp notifications (confirmations, bills, shipping updates, etc.).</li>
                  </ul>
                </li>
              </ul>
            </div>
            <div className="guideline-item">
              <h4>🛒 WooCommerce Integration Requirements</h4>
              <ul>
                <li><strong>REST API Keys:</strong> You must generate a consumer key and consumer secret with <code>Read</code> or <code>Read/Write</code> permissions under WooCommerce Settings.</li>
                <li><strong>SSL Certificate:</strong> WooCommerce REST API endpoints require a valid HTTPS connection to securely sync orders to our platform.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="privacy-footer">
        <p>&copy; 2026 AI Support Bot. All rights reserved. Securely integrated with Meta Business API.</p>
      </footer>
    </div>
  );
}

export default PrivacyPolicy;
