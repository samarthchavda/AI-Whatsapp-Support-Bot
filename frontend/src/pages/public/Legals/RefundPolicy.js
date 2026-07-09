import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaChevronLeft, FaRegHandshake } from 'react-icons/fa';
import './PrivacyPolicy.css'; // Re-use privacy policy layout styling

function RefundPolicy() {
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
          <span className="logo-text">Kwickbot Support Center</span>
        </div>
      </header>

      <main className="privacy-content">
        <div className="privacy-hero">
          <FaUndo className="hero-icon" />
          <h1>Refund & Cancellation Policy</h1>
          <p className="hero-date">Last Updated: June 24, 2026</p>
          <p className="hero-sub">
            Please read our cancellation rules and refund processing timelines for all Kwickbot SaaS subscription plans.
          </p>
        </div>

        <section className="privacy-section-card">
          <h2>1. Cancellation of Subscription</h2>
          <p>
            You are free to cancel your Kwickbot subscription plan at any time. To cancel:
          </p>
          <ul>
            <li>Navigate to your merchant dashboard, open the <strong>Billing & Subscriptions</strong> page, and click **Cancel Subscription**.</li>
            <li>Alternatively, you can send an email cancellation request to `kwickbotai@gmail.com` at least 48 hours before your next billing cycle.</li>
            <li>Upon cancellation, your active bot replies, CRM, and integrations will remain functional until the end of your current 30-day paid billing cycle, after which your account will automatically downgrade and suspend features.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>2. Refund Eligibility</h2>
          <p>
            We stand behind our product quality, but we also enforce strict guidelines for refund requests:
          </p>
          <ul>
            <li><strong>Trial period:</strong> We offer a free demo sandbox environment for merchants to validate Kwickbot's AI capabilities before purchasing.</li>
            <li><strong>First-time buyers:</strong> If you are unhappy with the software performance, first-time subscribers are eligible for a full refund within **7 days of your initial payment**.</li>
            <li><strong>Renewals:</strong> Recurring monthly renewal charges are non-refundable. Please make sure to cancel your plan before the auto-renewal date if you do not wish to continue.</li>
            <li><strong>API Cost Exclusions:</strong> WhatsApp Business API conversation charges (billed directly by Meta based on message categories) are paid to Meta and are entirely non-refundable under any circumstances.</li>
          </ul>
        </section>

        <section className="privacy-section-card">
          <h2>3. Refund Processing Timelines</h2>
          <div className="legal-callout">
            <FaRegHandshake className="callout-icon" style={{ color: '#34d399' }} />
            <div>
              <h3>How refunds are processed (Razorpay rules)</h3>
              <p>
                Once a refund is approved by our billing support team, it is initiated instantly through our payment gateway (Razorpay). The refunded amount will be credited back to your **original payment source** (Credit Card, Debit Card, UPI, NetBanking, or Wallet) within **5 to 7 working days** depending on your bank's clearance times.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section-card">
          <h2>4. Abuse of Policy</h2>
          <p>
            Kwickbot reserves the right to deny refund requests if we detect abuse, such as creating multiple accounts to exploit the 7-day refund window, or using the bot to send spam broadcasts before requesting a refund.
          </p>
        </section>

        <section className="privacy-section-card">
          <h2>5. Contact Billing Support</h2>
          <p>
            If you have any questions regarding your invoice, subscription status, or want to request a refund, please contact us directly:
          </p>
          <ul>
            <li>📧 Email: **kwickbotai@gmail.com** (We reply within 24 hours)</li>
            <li>📞 Phone: **+91 8128420287**</li>
            <li>📍 Office Address: Gujarat, India</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default RefundPolicy;
