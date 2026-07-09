import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrashAlt, FaUserShield, FaChevronLeft, FaEnvelope } from 'react-icons/fa';
import './PrivacyPolicy.css'; // Re-use the clean policy layout styling

function DataDeletion() {
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
          <span className="logo-text">Kwickbot Privacy Center</span>
        </div>
      </header>

      <main className="privacy-content">
        <div className="privacy-hero" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
          <FaTrashAlt className="hero-icon" style={{ color: '#ef4444' }} />
          <h1>User Data Deletion Instructions</h1>
          <p className="hero-date">Last Updated: July 7, 2026</p>
          <p className="hero-sub">
            At Kwickbot, we respect your privacy rights and provide clear instructions on how you can request the permanent deletion of your personal data from our systems.
          </p>
        </div>

        <section className="privacy-section-card">
          <h2>1. Overview of Data We Store</h2>
          <p>
            Kwickbot acts as a data processor for online merchants, syncing order information and customer contacts to provide automated customer support. We store:
          </p>
          <ul>
            <li><strong>Merchant Account Details:</strong> Name, business email, connected store settings, and Meta WhatsApp integration tokens.</li>
            <li><strong>Customer Store Records:</strong> Synced contact names, phone numbers, order IDs, and shipping carrier data necessary for tracking.</li>
            <li><strong>AI Chat History:</strong> Transcripts of text and interactive button exchanges between customers and the Kwickbot AI agent.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>2. How to Request Data Deletion</h2>
          <p>
            You can request the permanent removal of all your data or your customers' data from Kwickbot through the following standard methods:
          </p>
          <div className="guideline-grid">
            <div className="guideline-item">
              <h4>🛠️ Option A: Self-Service Account Deletion</h4>
              <p>
                As a Store Admin/Merchant, you can delete your account directly:
              </p>
              <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
                <li>Log in to your <strong>Kwickbot Dashboard</strong>.</li>
                <li>Navigate to the <strong>Profile Settings</strong> tab.</li>
                <li>Scroll to the bottom of the page and click the <strong>"Delete Account"</strong> red button.</li>
                <li>Confirm the prompt. This will immediately purge all your credentials, synced customer orders, and chat logs from our active servers.</li>
              </ol>
            </div>
            <div className="guideline-item">
              <h4>📧 Option B: Email Request (Direct Processing)</h4>
              <p>
                If you are a store customer whose data was processed by a store using Kwickbot, or if you prefer manual processing:
              </p>
              <p style={{ marginTop: '10px' }}>
                Send a data deletion request email to our Data Protection Officer at:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', marginTop: '8px', fontWeight: '600' }}>
                <FaEnvelope style={{ color: '#6366f1' }} />
                <span>chavdasamarth007@gmail.com</span>
              </div>
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
                *Note: Please send the request from the email address or phone number you wish to delete. We will process your request and delete all records from our database within 24 hours.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section-card">
          <h2>3. Data Retention and Purge Policy</h2>
          <p>
            Once a deletion request is completed:
          </p>
          <ul>
            <li>All associated database records (invoices, client configurations, order caches) are immediately and permanently erased.</li>
            <li>Our integration access to your Shopify or WooCommerce custom apps is disconnected.</li>
            <li>Database backups are overwritten within a standard cycle of 30 days, during which your deleted data remains completely encrypted and inaccessible.</li>
          </ul>
        </section>
      </main>

      <footer className="privacy-footer">
        <p>&copy; 2026 Kwickbot. All rights reserved. Securely integrated with Meta Business API.</p>
      </footer>
    </div>
  );
}

export default DataDeletion;
