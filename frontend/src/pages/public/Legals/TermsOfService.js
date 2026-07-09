import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFileSignature, FaChevronLeft, FaBalanceScale } from 'react-icons/fa';
import './PrivacyPolicy.css'; // Re-use privacy policy layout styling

function TermsOfService() {
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
          <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '38px', height: '38px' }} />
          <span className="logo-text">Kwickbot Legal Center</span>
        </div>
      </header>

      <main className="privacy-content">
        <div className="privacy-hero">
          <FaBalanceScale className="hero-icon" />
          <h1>Terms of Service</h1>
          <p className="hero-date">Last Updated: June 24, 2026</p>
          <p className="hero-sub">
            These terms govern your use of the Kwickbot platform, services, API access, and website. By signing up, you agree to these rules.
          </p>
        </div>

        <section className="privacy-section-card">
          <h2>1. Terms of Agreement</h2>
          <p>
            Welcome to Kwickbot (operated under registered business entities, "we", "us", or "our"). By registering a merchant account, connecting your Shopify or WooCommerce store, or using any of our WhatsApp support automation services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not register or use our services.
          </p>
        </section>

        <section className="privacy-section-card">
          <h2>2. Account Registration & Security</h2>
          <p>
            To use our WhatsApp CRM and AI tools, you must create a secure admin profile.
          </p>
          <ul>
            <li>You must provide accurate, current, and complete information during signup.</li>
            <li>You are solely responsible for maintaining the confidentiality of your account password and API tokens.</li>
            <li>You agree to notify us immediately of any unauthorized access to your account or security breaches.</li>
            <li>You agree to use Kwickbot only for lawful commerce operations.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>3. Subscription, Payments & Renewals</h2>
          <p>
            Our software runs on a recurring subscription model (Starter: ₹1499/mo, Growth: ₹2999/mo, Scale: ₹9999/mo).
          </p>
          <div className="legal-callout">
            <FaFileSignature className="callout-icon" style={{ color: '#34d399' }} />
            <div>
              <h3>Billing & Automatic Renewal</h3>
              <p>
                All subscription fees are processed securely through our payment gateway (Razorpay). Subscriptions are billed on the date of purchase and auto-renew every 30 days unless cancelled prior to the renewal date. All fees are listed in Indian Rupees (INR) and are exclusive of applicable taxes unless stated otherwise.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section-card">
          <h2>4. WhatsApp Policy & Anti-Spam Compliance</h2>
          <p>
            Since Kwickbot integrates with the official Meta WhatsApp Business API:
          </p>
          <ul>
            <li>You must comply with Meta's WhatsApp Commerce Policy and Business Solution Terms.</li>
            <li>You are strictly prohibited from sending unsolicited spam broadcasts or unauthorized marketing messages via Kwickbot.</li>
            <li>Meta reserves the right to suspend your WhatsApp Business phone number if your spam report rate exceeds allowable thresholds. Kwickbot is not responsible for any phone number blocks initiated by Meta.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>5. Limitation of Liability</h2>
          <p>
            Kwickbot is provided "as is" and "as available". We do not guarantee that our service will be uninterrupted, error-free, or 100% secure. In no event shall Kwickbot or its directors be liable for any lost profits, lost store sales, database corruption, or system downtime arising out of or related to your use of our platform.
          </p>
        </section>

        <section className="privacy-section-card">
          <h2>6. Governing Law & Jurisdiction</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the courts located in Gujarat, India.
          </p>
        </section>
      </main>
    </div>
  );
}

export default TermsOfService;
