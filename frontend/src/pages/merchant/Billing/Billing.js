import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCrown, FaCheck, FaTimes, FaInfoCircle, FaRegCreditCard, FaHistory, FaCalendarAlt, FaTicketAlt, FaWhatsapp, FaDownload, FaFileInvoice, FaBuilding } from 'react-icons/fa';
import api, { getAdminProfile, getPricingPlans, upgradePricingPlan, createRazorpayOrder, verifyRazorpayPayment } from '../../../services/api';
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
  const [selectedCycle, setSelectedCycle] = useState('monthly');

  // Real invoice history + customer billing details printed on invoices
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [billingDetails, setBillingDetails] = useState({ legalName: '', gstin: '', addressLine: '', city: '', state: '', pincode: '' });
  const [indianStates, setIndianStates] = useState([]);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState(null);

  useEffect(() => {
    fetchBillingData();
    fetchInvoices();
    fetchBillingDetails();
  }, []);

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      setInvoiceError('');
      const res = await api.get('/invoices', { params: { limit: 50 } });
      setInvoices(res.data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoiceError('Could not load your invoices. Please refresh the page.');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchBillingDetails = async () => {
    try {
      const res = await api.get('/invoices/billing-details');
      const data = res.data?.data || {};
      setBillingDetails((prev) => ({ ...prev, ...data, legalName: data.legalName || res.data?.defaults?.legalName || '' }));
      setIndianStates(res.data?.states || []);
    } catch (error) {
      console.error('Error fetching billing details:', error);
    }
  };

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setBillingDetails((prev) => ({ ...prev, [name]: name === 'gstin' ? value.toUpperCase() : value }));
    setDetailsMessage(null);
  };

  const saveBillingDetails = async (e) => {
    e.preventDefault();
    try {
      setSavingDetails(true);
      const res = await api.put('/invoices/billing-details', billingDetails);
      setDetailsMessage({ type: 'success', text: res.data?.message || 'Billing details saved.' });
    } catch (error) {
      setDetailsMessage({ type: 'error', text: error.response?.data?.error || 'Could not save billing details.' });
    } finally {
      setSavingDetails(false);
    }
  };

  const downloadInvoice = async (inv) => {
    try {
      setDownloadingId(inv._id);
      const res = await api.get(`/invoices/${inv._id}/pdf`, { params: { download: 1 }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Kwickbot-Invoice-${String(inv.invoiceNumber).replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (error) {
      console.error('Invoice download failed:', error);
      setInvoiceError('Could not download that invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const handleUpgrade = async (planName, planId) => {
    if (planName === profile?.subscriptionPlan) {
      alert('You are already on this plan.');
      return;
    }

    if (!window.confirm(`Proceed to subscribe to the ${planName.toUpperCase()} plan (${selectedCycle.toUpperCase()})?`)) {
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
      const orderRes = await createRazorpayOrder(planName, activeCoupon ? activeCoupon.code : undefined, planId, selectedCycle);
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
        key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: 'Kwickbot AI',
        description: `Subscribe to ${planName.toUpperCase()} Plan (${selectedCycle.toUpperCase()})`,
        image: '/app-icon.png',
        order_id: id,
        handler: async function (response) {
          try {
            setUpgradingPlanName(planName);
            // 4. Verify payment signature on backend
            const verifyRes = await verifyRazorpayPayment({
              planName,
              planId,
              billingCycle: selectedCycle,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            // Show the new invoice straight away
            fetchInvoices();

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

  const currentPlanDetails = plans.find(p => p.name === (profile?.subscriptionPlan === 'professional' ? 'growth' : profile?.subscriptionPlan === 'enterprise' ? 'scale' : profile?.subscriptionPlan));
  const fallbackFeatures = profile?.subscriptionPlan === 'custom' ? {
    maxConversations: -1,
    maxMessages: -1,
    geminiTokensPerMonth: profile?.geminiTokensLimit ?? -1,
    maxWhatsAppConnections: 5
  } : {
    maxConversations: (profile?.subscriptionPlan === 'growth' || profile?.subscriptionPlan === 'professional' || profile?.subscriptionPlan === 'scale' || profile?.subscriptionPlan === 'enterprise') ? -1 : 500,
    maxMessages: (profile?.subscriptionPlan === 'growth' || profile?.subscriptionPlan === 'professional' || profile?.subscriptionPlan === 'scale' || profile?.subscriptionPlan === 'enterprise') ? -1 : 2000,
    geminiTokensPerMonth: profile?.geminiTokensLimit ?? ((profile?.subscriptionPlan === 'growth' || profile?.subscriptionPlan === 'professional' || profile?.subscriptionPlan === 'scale' || profile?.subscriptionPlan === 'enterprise') ? -1 : 50000),
    maxWhatsAppConnections: (profile?.subscriptionPlan === 'growth' || profile?.subscriptionPlan === 'professional') ? 3 : (profile?.subscriptionPlan === 'scale' || profile?.subscriptionPlan === 'enterprise') ? 5 : 1
  };
  const currentLimits = currentPlanDetails?.usageLimits || {};

  // Real payment details from the latest paid invoice (no placeholder card)
  const PAYMENT_METHOD_LABELS = { card: 'Card', upi: 'UPI', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay later' };
  const latestPaidInvoice = invoices.find((inv) => inv.status === 'paid');
  const paymentMethodText = latestPaidInvoice
    ? `${PAYMENT_METHOD_LABELS[latestPaidInvoice.paymentMethod] || 'Online payment'} via Razorpay (${new Date(latestPaidInvoice.paidDate || latestPaidInvoice.issuedDate).toLocaleDateString('en-IN')})`
    : 'No payments yet';
  const planDisplayName = currentPlanDetails?.displayName || (profile?.subscriptionPlan ? profile.subscriptionPlan.charAt(0).toUpperCase() + profile.subscriptionPlan.slice(1) : 'Starter');
  const planMonthlyPrice = profile?.monthlyPrice || currentPlanDetails?.monthlyPrice;
  const currentFeatures = {
    ...fallbackFeatures,
    maxConversations: currentLimits.monthlyConversations ?? fallbackFeatures.maxConversations,
    maxMessages: currentLimits.monthlyMessages ?? fallbackFeatures.maxMessages,
    geminiTokensPerMonth: currentLimits.geminiTokensPerMonth ?? fallbackFeatures.geminiTokensPerMonth,
    maxWhatsAppConnections: currentLimits.maxWhatsAppConnections ?? fallbackFeatures.maxWhatsAppConnections,
    maxBroadcastMessages: currentLimits.maxBroadcastMessages ?? 0,
    maxBroadcastCampaigns: currentLimits.maxBroadcastCampaigns ?? 0
  };

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
            {planDisplayName} Plan
          </h2>
          
          <div className="plan-status-row">
            <span className={`status-badge-saas status-${profile?.subscriptionStatus || 'trial'}`}>
              {profile?.subscriptionStatus || 'Trial'}
            </span>
            {planMonthlyPrice > 0 && <span className="monthly-price-display">₹{Number(planMonthlyPrice).toLocaleString('en-IN')}/mo</span>}
          </div>
          {['starter', 'growth', 'professional'].includes(profile?.subscriptionPlan) && (
            <p className="billing-meta-plan-note">AI support is included within your plan's usage limits. Meta bills WhatsApp message delivery separately.</p>
          )}

          <div className="plan-meta-list">
            <div className="plan-meta-item">
              <FaCalendarAlt />
              <span>
                {profile?.subscriptionEndDate
                  ? `Current period: ${profile?.subscriptionStartDate ? new Date(profile.subscriptionStartDate).toLocaleDateString('en-IN') + ' – ' : 'until '}${new Date(profile.subscriptionEndDate).toLocaleDateString('en-IN')}`
                  : `Member since: ${profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : 'N/A'}`}
              </span>
            </div>
            <div className="plan-meta-item">
              <FaRegCreditCard />
              <span>Last payment: {paymentMethodText}</span>
            </div>
          </div>

          <div className="plan-limits-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--primary-color, #6366f1)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Plan & Feature Limits</h4>
            <div className="plan-limits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Conversations: <strong style={{ color: 'var(--text-primary)' }}>{(profile?.monthlyConversationsCount || 0).toLocaleString()} / {currentFeatures.maxConversations === -1 ? 'Unlimited' : currentFeatures.maxConversations}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Support Messages: <strong style={{ color: 'var(--text-primary)' }}>{(profile?.totalMessagesProcessed || 0).toLocaleString()} / {currentFeatures.maxMessages === -1 ? 'Unlimited' : (currentFeatures.maxMessages || 2000).toLocaleString()}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Broadcast Messages: <strong style={{ color: 'var(--text-primary)' }}>{(profile?.broadcastMessagesUsed || 0).toLocaleString()} / {currentFeatures.maxBroadcastMessages === -1 ? 'Unlimited' : currentFeatures.maxBroadcastMessages.toLocaleString()}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Broadcast Campaigns: <strong style={{ color: 'var(--text-primary)' }}>{(profile?.broadcastCampaignsUsed || 0).toLocaleString()} / {currentFeatures.maxBroadcastCampaigns === -1 ? 'Unlimited' : (currentFeatures.maxBroadcastCampaigns || 0).toLocaleString()}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                WhatsApp Connections: <strong style={{ color: 'var(--text-primary)' }}>{currentFeatures.maxWhatsAppConnections === -1 ? 'Unlimited' : `${currentFeatures.maxWhatsAppConnections || 1} max`}</strong>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                AI Processing Tokens: <strong style={{ color: 'var(--text-primary)' }}>
                  {(profile?.geminiTokensUsed || 0).toLocaleString()} / {profile?.geminiTokensLimit === -1 || currentFeatures.geminiTokensPerMonth === -1
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
                <p className="upgrade-plan-desc">{plan.shortDescription || plan.description}</p>

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
                {['starter', 'growth', 'professional'].includes(plan.name) && (
                  <p className="billing-meta-plan-note">AI support is included within this plan's usage limits. Meta charges separately for WhatsApp message delivery.</p>
                )}

                <ul className="upgrade-features-list">
                  {/* Conversations */}
                  {/* Conversations */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 500 WhatsApp Conversations/mo (new customer chat sessions)</li>
                  )}
                  {(plan.name === 'growth' || plan.name === 'professional') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited AI WhatsApp conversations/mo</li>
                  )}
                  {(plan.name === 'scale' || plan.name === 'enterprise') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited WhatsApp Conversations/mo (no support volume restrictions)</li>
                  )}
                  
                  {/* Messages */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 2,000 incoming & outgoing messages/mo (individual text bubbles)</li>
                  )}
                  {(plan.name === 'growth' || plan.name === 'professional') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited incoming & outgoing WhatsApp messages/mo</li>
                  )}
                  {(plan.name === 'scale' || plan.name === 'enterprise') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited incoming & outgoing messages/mo (individual text bubbles)</li>
                  )}

                  {/* WhatsApp Connections */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> 1 Active WhatsApp Phone Number connection</li>
                  )}
                  {(plan.name === 'growth' || plan.name === 'professional') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 3 Active WhatsApp Phone Number connections</li>
                  )}
                  {(plan.name === 'scale' || plan.name === 'enterprise') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 5 Active WhatsApp Connections simultaneously</li>
                  )}
                  
                  {/* KB Document Upload */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Max 1 PDF Upload (for training the AI bot on your basic FAQs)</li>
                  )}
                  {(plan.name === 'growth' || plan.name === 'professional') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Max 3 PDF Uploads (train AI on detailed shipping, refund, & FAQ catalogs)</li>
                  )}
                  {(plan.name === 'scale' || plan.name === 'enterprise') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited PDF Uploads (train AI on entire store documents and manuals)</li>
                  )}

                  {/* E-commerce Integrations */}
                  {plan.name === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> 1 Active Integration (Shopify or WooCommerce)</li>
                  )}
                  {(plan.name === 'growth' || plan.name === 'professional') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> 2 Active E-commerce Integrations (Shopify or WooCommerce)</li>
                  )}
                  {(plan.name === 'scale' || plan.name === 'enterprise') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Multiple Integrations (connect both Shopify & WooCommerce simultaneously)</li>
                  )}

                  {/* Knowledge Base & Live Chat */}
                  <li><FaCheck style={{ color: '#1677FF' }} /> Instant AI Answers (reads your store FAQ & policy PDFs)</li>
                  <li><FaCheck style={{ color: '#1677FF' }} /> Live Chat Console for manual customer reply</li>
                  {(plan.name === 'growth' || plan.name === 'professional') && <li><FaCheck style={{ color: '#1677FF' }} /> Abandoned cart recovery and order confirmation templates</li>}
                  {(plan.name === 'growth' || plan.name === 'professional') && <li><FaCheck style={{ color: '#1677FF' }} /> Connect your CRM through WhatsApp API and webhooks</li>}

                  {/* Advanced Analytics */}
                  <li style={{ opacity: features.advancedAnalytics ? 1 : 0.5 }}>
                    {features.advancedAnalytics ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Advanced Analytics (real-time chat reports & charts)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Advanced Analytics Dashboard</span></>
                    )}
                  </li>

                  {/* Handoff Escalations */}
                  <li style={{ opacity: (plan.name !== 'starter') ? 1 : 0.5 }}>
                    {plan.name !== 'starter' ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Live Agent Handoff (auto-alerts team for complex queries)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Live Agent Handoff Escalations</span></>
                    )}
                  </li>

                  {/* Order Cancellation */}
                  <li style={{ opacity: (plan.name !== 'starter') ? 1 : 0.5 }}>
                    {plan.name !== 'starter' ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Automated Order Cancellations via WhatsApp</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Automated Order Cancellations via WhatsApp</span></>
                    )}
                  </li>

                  {/* Custom Branding */}
                  <li style={{ opacity: features.customBranding ? 1 : 0.5 }}>
                    {features.customBranding ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> White-Labeling (remove Kwickbot branding & add your logo)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Custom Branding (White-Labeling)</span></>
                    )}
                  </li>

                  {/* API Access */}
                  <li style={{ opacity: features.developerApi || features.apiAccess ? 1 : 0.5 }}>
                    {features.developerApi || features.apiAccess ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Developer API & Webhooks (for custom websites)</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Developer API & Webhooks Access</span></>
                    )}
                  </li>

                  {/* WhatsApp Broadcasting */}
                  <li>
                    {plan.name === 'starter' && (
                      <><FaCheck style={{ color: '#1677FF' }} /> WhatsApp Broadcasting (5 campaigns/mo)</>
                    )}
                    {(plan.name === 'growth' || plan.name === 'professional') && (
                      <><FaCheck style={{ color: '#1677FF' }} /> Unlimited WhatsApp broadcast messages and campaigns</>
                    )}
                    {(plan.name === 'scale' || plan.name === 'enterprise') && (
                      <><FaCheck style={{ color: '#1677FF' }} /> WhatsApp Broadcasting (25,000 Messages & Unlimited Campaigns/mo)</>
                    )}
                  </li>

                  {/* Priority Support */}
                  <li style={{ opacity: features.prioritySupport ? 1 : 0.5 }}>
                    {plan.name === 'starter' && (
                      <><FaTimes style={{ color: '#ef4444', marginRight: '8px' }} /> <span style={{ textDecoration: 'line-through' }}>Priority Support</span></>
                    )}
                    {(plan.name === 'growth' || plan.name === 'professional') && (
                      <><FaCheck style={{ color: '#1677FF' }} /> Priority Email & Chat Support (under 4-hour response time)</>
                    )}
                    {(plan.name === 'scale' || plan.name === 'enterprise') && (
                      <><FaCheck style={{ color: '#1677FF' }} /> Premium Support</>
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
        <h3 className="card-title-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          <FaWhatsapp style={{ color: '#25D366' }} /> Official Meta WhatsApp API Charges
        </h3>
        <p className="usage-subtitle" style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          Your Kwickbot plan includes its AI support features. Meta's delivery charges are separate and depend on the message category and recipient market.
        </p>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Meta rate</th>
                <th>Common Examples</th>
                <th>Billing Method</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row-premium">
                <td><strong>Utility</strong></td>
                <td><a href="https://whatsappbusiness.com/products/platform-pricing/" target="_blank" rel="noopener noreferrer">View current rate</a></td>
                <td>Order Confirmed, Shipping Updates, Order Cancelled notifications</td>
                <td>Charged per delivered message by Meta</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Marketing</strong></td>
                <td><a href="https://whatsappbusiness.com/products/platform-pricing/" target="_blank" rel="noopener noreferrer">View current rate</a></td>
                <td>Abandoned Cart Recovery, Promo Offers, Coupon Codes</td>
                <td>Charged per delivered message by Meta</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Authentication</strong></td>
                <td><a href="https://whatsappbusiness.com/products/platform-pricing/" target="_blank" rel="noopener noreferrer">View current rate</a></td>
                <td>One-Time Passcodes (OTP), login verification checks</td>
                <td>Charged per delivered message by Meta</td>
              </tr>
              <tr className="table-row-premium">
                <td><strong>Service</strong></td>
                <td>First 1,000 per business number each month are free; then <a href="https://whatsappbusiness.com/products/platform-pricing/" target="_blank" rel="noopener noreferrer">Meta's current rate</a></td>
                <td>Customer support chats started by the customer messaging first</td>
                <td>Charged per delivered message after the free allowance</td>
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
            <strong>Important Billing Note:</strong> Meta sets and bills WhatsApp message rates separately from your Kwickbot subscription. Rates can vary by message category and recipient market. Check Meta's current pricing and payment options in your WhatsApp Business account.
          </div>
        </div>
      </div>

      {/* Billing details printed on invoices */}
      <div className="billing-card billing-details-card">
        <h3 className="card-title-with-icon">
          <FaBuilding /> Billing details for invoices
        </h3>
        <p className="billing-muted">These details appear in the “Billed to” section of your Kwickbot invoices. Add your GSTIN to claim input tax credit.</p>
        <form className="billing-details-form" onSubmit={saveBillingDetails}>
          <div className="bd-field bd-wide">
            <label htmlFor="bd-legalName">Legal business name</label>
            <input id="bd-legalName" name="legalName" value={billingDetails.legalName} onChange={handleDetailsChange} placeholder="As registered for GST" maxLength={200} />
          </div>
          <div className="bd-field">
            <label htmlFor="bd-gstin">GSTIN <span className="billing-muted">(optional)</span></label>
            <input id="bd-gstin" name="gstin" value={billingDetails.gstin} onChange={handleDetailsChange} placeholder="27ABCDE1234F1Z5" maxLength={15} autoComplete="off" />
          </div>
          <div className="bd-field bd-wide">
            <label htmlFor="bd-address">Address</label>
            <input id="bd-address" name="addressLine" value={billingDetails.addressLine} onChange={handleDetailsChange} placeholder="Building, street, area" maxLength={300} autoComplete="street-address" />
          </div>
          <div className="bd-field">
            <label htmlFor="bd-city">City</label>
            <input id="bd-city" name="city" value={billingDetails.city} onChange={handleDetailsChange} maxLength={120} autoComplete="address-level2" />
          </div>
          <div className="bd-field">
            <label htmlFor="bd-state">State</label>
            <select id="bd-state" name="state" value={billingDetails.state} onChange={handleDetailsChange}>
              <option value="">Select state</option>
              {indianStates.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="bd-field">
            <label htmlFor="bd-pincode">PIN code</label>
            <input id="bd-pincode" name="pincode" value={billingDetails.pincode} onChange={handleDetailsChange} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
          </div>
          <div className="bd-actions">
            <button type="submit" className="btn-primary" disabled={savingDetails}>
              {savingDetails ? 'Saving…' : 'Save billing details'}
            </button>
            {detailsMessage && (
              <span role="status" className={detailsMessage.type === 'error' ? 'bd-msg bd-error' : 'bd-msg bd-success'}>
                {detailsMessage.text}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Invoice History */}
      <div className="billing-card invoice-history-card">
        <h3 className="card-title-with-icon">
          <FaHistory /> Invoices
        </h3>
        {invoiceError && <div className="bd-msg bd-error" role="alert" style={{ marginTop: 12 }}>{invoiceError}</div>}
        <div className="table-wrapper" style={{ marginTop: '16px' }}>
          {invoicesLoading ? (
            <p className="billing-muted">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <div className="invoice-empty">
              <FaFileInvoice aria-hidden="true" />
              <div>
                <strong>No invoices yet</strong>
                <p className="billing-muted">Your invoice will appear here as soon as you upgrade or renew a plan.</p>
              </div>
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th><span className="sr-only">Download</span></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="table-row-premium">
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{new Date(inv.issuedDate || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{inv.planName ? `${inv.planName}${inv.billingCycle ? ` · ${inv.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}` : ''}` : (inv.items?.[0]?.description || '—')}</td>
                    <td>{formatINR(inv.totalAmount)}</td>
                    <td>
                      <span className={`badge-premium ${inv.status === 'paid' ? 'badge-active' : ''}`}>
                        {inv.status === 'paid' ? 'Paid' : (inv.status || 'Issued')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="invoice-download-btn"
                        onClick={() => downloadInvoice(inv)}
                        disabled={downloadingId === inv._id}
                        aria-label={`Download invoice ${inv.invoiceNumber} as PDF`}
                      >
                        <FaDownload aria-hidden="true" /> {downloadingId === inv._id ? 'Preparing…' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Billing;
