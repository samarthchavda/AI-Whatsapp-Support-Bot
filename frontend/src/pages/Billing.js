import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCrown, FaCheck, FaTimes, FaInfoCircle, FaRegCreditCard, FaHistory, FaCalendarAlt, FaTicketAlt, FaWhatsapp } from 'react-icons/fa';
import api, { getAdminProfile, getPricingPlans, upgradePricingPlan, createRazorpayOrder, verifyRazorpayPayment } from '../services/api';
import './Billing.css';

function Billing() {
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanName, setUpgradingPlanName] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [profileRes, plansRes] = await Promise.all([
        getAdminProfile(),
        getPricingPlans()
      ]);
      setProfile(profileRes.data.data.admin);
      setPlans(plansRes.data.data);
      if (plansRes.data.razorpayKeyId) {
        setRazorpayKeyId(plansRes.data.razorpayKeyId);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    
    try {
      setVerifyingCoupon(true);
      setCouponError(null);
      
      const response = await api.post('/auth/verify-coupon', { code: couponCode });
      
      if (response.data.success) {
        setActiveCoupon(response.data.data);
        setCouponError(null);
      }
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Invalid promo code');
      setActiveCoupon(null);
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planName) => {
    if (planName === profile?.subscriptionPlan) {
      alert('You are already on this plan.');
      return;
    }

    if (!window.confirm(`Proceed to subscribe to the ${planName.toUpperCase()} plan?`)) {
      return;
    }

    try {
      setUpgradingPlanName(planName);

      // 1. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay Payment Gateway. Please check your internet connection.');
        return;
      }

      // 2. Create Razorpay order on backend
      const orderRes = await createRazorpayOrder(planName, activeCoupon ? activeCoupon.code : undefined);
      const { id, amount, currency } = orderRes.data.data;

      // 3. Open Razorpay checkout modal
      const prefillData = {};
      if (profile?.name && profile.name.trim()) {
        prefillData.name = profile.name.trim();
      }
      if (profile?.email && profile.email.trim()) {
        prefillData.email = profile.email.trim();
      }
      if (profile?.businessPhone && profile.businessPhone.trim()) {
        const phoneDigits = profile.businessPhone.replace(/\D/g, '');
        if (phoneDigits) {
          prefillData.contact = phoneDigits;
        }
      }

      const options = {
        key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_mockkey',
        amount: amount,
        currency: currency,
        name: 'Kwickbot AI',
        description: `Upgrade to ${planName.toUpperCase()} Plan`,
        image: '/logo.png',
        order_id: id,
        handler: async function (response) {
          try {
            setUpgradingPlanName(planName);
            // 4. Verify payment signature on backend
            const verifyRes = await verifyRazorpayPayment({
              planName,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            // Update local profile state
            const updatedProfile = verifyRes.data.data;
            setProfile(prev => ({
              ...prev,
              subscriptionPlan: updatedProfile.subscriptionPlan,
              subscriptionStatus: updatedProfile.subscriptionStatus,
              monthlyPrice: updatedProfile.monthlyPrice
            }));

            // Save updated admin data to localStorage
            const storedAdmin = localStorage.getItem('admin');
            if (storedAdmin) {
              const adminObj = JSON.parse(storedAdmin);
              const updatedAdminObj = {
                ...adminObj,
                subscriptionPlan: updatedProfile.subscriptionPlan,
                subscriptionStatus: updatedProfile.subscriptionStatus,
                monthlyPrice: updatedProfile.monthlyPrice
              };
              localStorage.setItem('admin', JSON.stringify(updatedAdminObj));
            }

            setSuccessMessage(`Payment successful! Welcome to Kwickbot ${planName.toUpperCase()} Plan.`);
            setTimeout(() => setSuccessMessage(null), 5000);
            
            // Reload window to refresh all layout headers
            window.location.reload();

          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            alert(verifyErr.response?.data?.error || 'Payment verification failed. Please contact support.');
          } finally {
            setUpgradingPlanName(null);
          }
        },
        prefill: prefillData,
        theme: {
          color: '#6366f1'
        },
        modal: {
          ondismiss: function () {
            setUpgradingPlanName(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Error initiating payment:', error);
      alert(error.response?.data?.error || 'Failed to initiate checkout order.');
      setUpgradingPlanName(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading subscription details...
        </div>
      </div>
    );
  }

  const tokenUsagePercentage = profile && profile.geminiTokensLimit > 0
    ? Math.min(100, Math.round((profile.geminiTokensUsed / profile.geminiTokensLimit) * 100))
    : 0;

  const isUsageWarning = tokenUsagePercentage >= 80;
  const isUsageDanger = tokenUsagePercentage >= 95;

  let progressColor = '#22c55e'; // Green
  if (isUsageDanger) progressColor = '#ef4444'; // Red
  else if (isUsageWarning) progressColor = '#f59e0b'; // Amber

  const currentPlanDetails = plans.find(p => p.name === profile?.subscriptionPlan);
  const currentFeatures = currentPlanDetails?.features || (profile?.subscriptionPlan === 'custom' ? {
    maxConversations: -1,
    maxMessages: -1,
    geminiTokensPerMonth: profile?.geminiTokensLimit || -1,
    maxWhatsAppConnections: 5
  } : {
    maxConversations: profile?.subscriptionPlan === 'professional' ? 3000 : profile?.subscriptionPlan === 'enterprise' ? -1 : 500,
    maxMessages: profile?.subscriptionPlan === 'professional' ? 15000 : profile?.subscriptionPlan === 'enterprise' ? -1 : 2000,
    geminiTokensPerMonth: profile?.geminiTokensLimit || (profile?.subscriptionPlan === 'professional' ? 200000 : profile?.subscriptionPlan === 'enterprise' ? -1 : 50000),
    maxWhatsAppConnections: profile?.subscriptionPlan === 'professional' ? 2 : profile?.subscriptionPlan === 'enterprise' ? 5 : 1
  });

  const mockInvoices = [
    { id: 'INV-2026-001', date: '2026-05-15', amount: profile?.monthlyPrice || 29, status: 'Paid', method: 'Visa ending in 4242' },
    { id: 'INV-2026-002', date: '2026-04-15', amount: profile?.monthlyPrice || 29, status: 'Paid', method: 'Visa ending in 4242' },
  ];

  return (
    <div className="container billing-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FaCrown style={{ color: '#fbbf24', marginRight: '12px' }} />
            Billing & Subscriptions
          </h1>
          <p className="page-subtitle">Manage your SaaS subscription, limits, and billing details</p>
        </div>
      </div>

      {successMessage && (
        <div className="billing-success-alert">
          <FaCheck /> {successMessage}
        </div>
      )}

      {/* Grid: Plan overview and Token usage */}
      <div className="billing-overview-grid">
        {/* Active Plan Card */}
        <div className="billing-card active-plan-card">
          <div className="card-badge">Current Plan</div>
          <h2 className="plan-name-display">
            {profile?.subscriptionPlan ? profile.subscriptionPlan.toUpperCase() : 'STARTER'} Plan
          </h2>
          
          <div className="plan-status-row">
            <span className={`status-badge-saas status-${profile?.subscriptionStatus || 'trial'}`}>
              {profile?.subscriptionStatus || 'Trial'}
            </span>
            <span className="monthly-price-display">₹{profile?.monthlyPrice || 2999}/mo</span>
          </div>

          <div className="plan-meta-list">
            <div className="plan-meta-item">
              <FaCalendarAlt />
              <span>
                Billing Period Started: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="plan-meta-item">
              <FaRegCreditCard />
              <span>Payment Method: Visa ending in 4242</span>
            </div>
          </div>

          <div className="plan-limits-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Plan Limits</h4>
            <div className="plan-limits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px' }}>
              <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                Conversations (Unique Chats): <strong style={{ color: '#fafafa' }}>{currentFeatures.maxConversations === -1 ? 'Unlimited' : currentFeatures.maxConversations}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                Messages (Text Bubbles): <strong style={{ color: '#fafafa' }}>{currentFeatures.maxMessages === -1 ? 'Unlimited' : currentFeatures.maxMessages}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                WhatsApp Connections: <strong style={{ color: '#fafafa' }}>{currentFeatures.maxWhatsAppConnections} max</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                AI Response Units: <strong style={{ color: '#fafafa' }}>
                  {profile?.geminiTokensLimit === -1 || currentFeatures.geminiTokensPerMonth === -1
                    ? 'Unlimited'
                    : (profile?.geminiTokensLimit || currentFeatures.geminiTokensPerMonth || 50000).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Token Usage Card */}
        <div className="billing-card token-usage-card">
          <h3>AI Chatbot Processing Usage</h3>
          <p className="usage-subtitle">Your monthly AI usage limits reset every 30 days.</p>

          <div className="usage-numeric-row">
            <div>
              <span className="used-amount">{profile?.geminiTokensUsed?.toLocaleString() || 0}</span>
              <span className="divider"> / </span>
              <span className="limit-amount">
                {profile?.geminiTokensLimit === -1 || profile?.geminiTokensLimit === Infinity 
                  ? 'Unlimited' 
                  : (profile?.geminiTokensLimit?.toLocaleString() || '50,000')}
              </span>
              <span className="unit"> units</span>
            </div>
            {profile?.geminiTokensLimit !== -1 && profile?.geminiTokensLimit !== Infinity && (
              <div className="percentage-display">{tokenUsagePercentage}%</div>
            )}
          </div>

          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${tokenUsagePercentage}%`, backgroundColor: progressColor }}
            />
          </div>

          {isUsageDanger && (
            <div className="usage-alertdanger">
              <FaInfoCircle /> You have reached your AI chat limit! Suspending bot auto-replies until upgrade or monthly reset.
            </div>
          )}
          {!isUsageDanger && isUsageWarning && (
            <div className="usage-alertwarning">
              <FaInfoCircle /> Warning: You are running low on monthly AI chat credits. Upgrade your plan to avoid service interruption.
            </div>
          )}
        </div>
      </div>

       {/* Plan Selection Grid */}
      <div className="plans-selection-section">
        <h2 className="section-title">Change Subscription Plan</h2>
        <p className="section-subtitle" style={{ marginBottom: '20px' }}>Select a plan that fits your customer support request volume.</p>
        
        {profile?.role !== 'super_admin' && (
          <div className="saas-alert-info" style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#93c5fd'
          }}>
            <FaInfoCircle style={{ fontSize: '20px', flexShrink: 0, color: '#60a5fa' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Plan Management Restricted</strong>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your subscription plan and billing limits are managed by the system administrator. 
                Please contact your Super Admin to upgrade, apply promo codes, or modify your current plan limits.
              </span>
            </div>
          </div>
        )}

        {/* Promo Code Input Form */}
        <div className="promo-code-box" style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
          maxWidth: '500px',
          opacity: profile?.role !== 'super_admin' ? 0.6 : 1
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaTicketAlt style={{ color: 'var(--accent)' }} /> Have a Promo Code?
          </h4>
          <form onSubmit={handleVerifyCoupon} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="e.g. BotReply50"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={verifyingCoupon || !couponCode.trim()}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {verifyingCoupon ? 'Applying...' : 'Apply Code'}
            </button>
          </form>
          {activeCoupon && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>
              ✓ Code {activeCoupon.code} applied! Enjoy {activeCoupon.discountPercent}% OFF on checkout.
            </div>
          )}
          {couponError && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>
              ✗ {couponError}
            </div>
          )}
        </div>

        <div className="billing-plans-grid">
          {plans.map((plan) => {
            const isCurrent = profile?.subscriptionPlan === plan.name;
            const features = plan.features || {};

            return (
              <div key={plan._id || plan.name} className={`upgrade-plan-card ${isCurrent ? 'current' : ''}`}>
                {plan.badge && <span className="upgrade-badge">{plan.badge}</span>}
                
                <h3 className="upgrade-plan-name">{plan.displayName}</h3>
                <p className="upgrade-plan-desc">{plan.description}</p>

                <div className="upgrade-price-row">
                  {activeCoupon ? (
                    <div>
                      <span className="price" style={{ textDecoration: 'line-through', fontSize: '18px', color: 'var(--text-muted)', marginRight: '8px' }}>
                        ₹{plan.monthlyPrice}
                      </span>
                      <span className="price" style={{ color: 'var(--success)' }}>
                        ₹{(plan.monthlyPrice - (plan.monthlyPrice * activeCoupon.discountPercent / 100)).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="price">₹{plan.monthlyPrice}</span>
                  )}
                  <span className="period">/month</span>
                </div>

                <ul className="upgrade-features-list">
                  {/* Conversations */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 500 WhatsApp Conversations/mo (new customer chat sessions)</li>
                  )}
                  {plan.name === 'professional' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 3,000 WhatsApp Conversations/mo (ideal for active marketing & sales)</li>
                  )}
                  {plan.name === 'enterprise' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Unlimited WhatsApp Conversations/mo (no support volume restrictions)</li>
                  )}
                  
                  {/* Messages */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 2,000 incoming & outgoing messages/mo (individual text bubbles)</li>
                  )}
                  {plan.name === 'professional' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 15,000 incoming & outgoing messages/mo (individual text bubbles)</li>
                  )}
                  {plan.name === 'enterprise' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Unlimited incoming & outgoing messages/mo (individual text bubbles)</li>
                  )}


                  {/* WhatsApp Connections */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> 1 Active WhatsApp Phone Number connection</li>
                  )}
                  {plan.name === 'professional' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 2 Active WhatsApp Phone Number connections</li>
                  )}
                  {plan.name === 'enterprise' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Up to 5 Active WhatsApp Connections simultaneously</li>
                  )}
                  
                  {/* KB Document Upload */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Max 1 PDF Upload (for training the AI bot on your basic FAQs)</li>
                  )}
                  {plan.name === 'professional' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Max 3 PDF Uploads (train AI on detailed shipping, refund, & FAQ catalogs)</li>
                  )}
                  {plan.name === 'enterprise' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Unlimited PDF Uploads (train AI on entire store documents and manuals)</li>
                  )}

                  {/* E-commerce Integrations */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> 1 Active Integration (connect either your Shopify OR WooCommerce store)</li>
                  )}
                  {plan.name === 'professional' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> 1 Active Integration (connect either your Shopify OR WooCommerce store)</li>
                  )}
                  {plan.name === 'enterprise' && (
                    <li><FaCheck style={{ color: '#10b981' }} /> Multiple Integrations (connect both Shopify & WooCommerce simultaneously)</li>
                  )}

                  {/* Knowledge Base & Live Chat */}
                  <li><FaCheck style={{ color: '#10b981' }} /> Instant AI Answers (reads your store FAQ & policy PDFs)</li>
                  <li><FaCheck style={{ color: '#10b981' }} /> Live Chat Console for manual customer reply</li>

                  {/* Advanced Analytics */}
                  <li style={{ opacity: features.advancedAnalytics ? 1 : 0.5 }}>
                    {features.advancedAnalytics ? (
                      <><FaCheck style={{ color: '#10b981' }} /> Advanced Analytics (real-time chat reports & charts)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Advanced Analytics Dashboard</span></>
                    )}
                  </li>

                  {/* Handoff Escalations */}
                  <li style={{ opacity: (plan.name !== 'starter') ? 1 : 0.5 }}>
                    {plan.name !== 'starter' ? (
                      <><FaCheck style={{ color: '#10b981' }} /> Live Agent Handoff (auto-alerts team for complex queries)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Live Agent Handoff Escalations</span></>
                    )}
                  </li>

                  {/* Order Cancellation */}
                  <li style={{ opacity: (plan.name !== 'starter') ? 1 : 0.5 }}>
                    {plan.name !== 'starter' ? (
                      <><FaCheck style={{ color: '#10b981' }} /> Automated Order Cancellations via WhatsApp</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Automated Order Cancellations via WhatsApp</span></>
                    )}
                  </li>

                  {/* Custom Branding */}
                  <li style={{ opacity: features.customBranding ? 1 : 0.5 }}>
                    {features.customBranding ? (
                      <><FaCheck style={{ color: '#10b981' }} /> White-Labeling (remove Kwickbot branding & add your logo)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Custom Branding (White-Labeling)</span></>
                    )}
                  </li>

                  {/* API Access */}
                  <li style={{ opacity: features.apiAccess ? 1 : 0.5 }}>
                    {features.apiAccess ? (
                      <><FaCheck style={{ color: '#10b981' }} /> Developer API & Webhooks (for custom websites)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Developer API & Webhooks Access</span></>
                    )}
                  </li>

                  {/* Priority Support */}
                  <li style={{ opacity: features.prioritySupport ? 1 : 0.5 }}>
                    {plan.name === 'starter' && (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Priority Customer Support</span></>
                    )}
                    {plan.name === 'professional' && (
                      <><FaCheck style={{ color: '#10b981' }} /> Priority Email & Chat Support (under 4-hour response time)</>
                    )}
                    {plan.name === 'enterprise' && (
                      <><FaCheck style={{ color: '#10b981' }} /> Dedicated Account Manager & 24/7 Instant Slack Support</>
                    )}
                  </li>
                </ul>

                <button
                  type="button"
                  className={`plan-select-btn ${isCurrent ? 'btn-current' : 'btn-upgrade'}`}
                  disabled={isCurrent || upgradingPlanName !== null}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {isCurrent 
                    ? 'Current Active Plan' 
                    : upgradingPlanName === plan.name 
                    ? 'Processing...' 
                    : 'Upgrade Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Meta WhatsApp API Charges Info Card */}
      <div className="billing-card meta-charges-card" style={{ marginBottom: '40px' }}>
        <h3 className="card-title-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '700', color: '#fafafa', margin: '0 0 8px 0' }}>
          <FaWhatsapp style={{ color: '#25D366' }} /> Official Meta WhatsApp API Charges
        </h3>
        <p className="usage-subtitle" style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          Direct pricing charged directly by Meta. There are no platform markups or hidden fees on message templates.
        </p>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Rate (India / +91 numbers)</th>
                <th>Common Examples</th>
                <th>Billing Method</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row-premium">
                <td><strong>Utility</strong></td>
                <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>₹0.145</span> <small style={{ color: 'var(--text-muted)' }}>/ 24-hr session</small></td>
                <td>Order Confirmed, Shipping Updates, Order Cancelled notifications</td>
                <td>Billed directly to your connected Meta card</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Marketing</strong></td>
                <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>₹1.09</span> <small style={{ color: 'var(--text-muted)' }}>/ 24-hr session</small></td>
                <td>Abandoned Cart Recovery, Promo Offers, Coupon Codes</td>
                <td>Billed directly to your connected Meta card</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Authentication</strong></td>
                <td><span style={{ color: 'var(--success)', fontWeight: '700' }}>₹0.145</span> <small style={{ color: 'var(--text-muted)' }}>/ 24-hr session</small></td>
                <td>One-Time Passcodes (OTP), login verification checks</td>
                <td>Billed directly to your connected Meta card</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Service</strong></td>
                <td><span style={{ color: '#60a5fa', fontWeight: '700' }}>Free Tier</span> <small style={{ color: 'var(--text-muted)' }}>(1,000/month)</small></td>
                <td>Customer support chats started by the customer messaging first</td>
                <td>Free for first 1,000 monthly service sessions</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="saas-alert-info" style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '14px 16px',
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fef08a'
        }}>
          <FaInfoCircle style={{ fontSize: '18px', flexShrink: 0, color: '#f59e0b' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left' }}>
            <strong>Important Billing Note:</strong> The rates listed above are standard base rates for sending templates to destination phone numbers in India (+91). For sending templates to customers in other countries, Meta's regional conversation rates apply. You must connect your credit card directly inside the Meta Business Manager Billing panel to fund template deliveries.
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="billing-card invoice-history-card">
        <h3 className="card-title-with-icon">
          <FaHistory /> Invoice Payment History
        </h3>
        <div className="table-wrapper" style={{ marginTop: '16px' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Billed Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="table-row-premium">
                  <td><strong>{inv.id}</strong></td>
                  <td>{inv.date}</td>
                  <td>₹{inv.amount.toFixed(2)}</td>
                  <td>{inv.method}</td>
                  <td>
                    <span className="badge-premium badge-active">{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Billing;
