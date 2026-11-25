import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCrown,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaRegCreditCard,
  FaHistory,
  FaCalendarAlt,
  FaTicketAlt,
  FaWhatsapp,
  FaDownload,
  FaFileInvoice,
  FaBuilding,
  FaExclamationTriangle,
  FaClock
} from 'react-icons/fa';
import api, { getAdminProfile, getPricingPlans, createRazorpayOrder, verifyRazorpayPayment } from '../../../services/api';
import './Billing.css';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const COUPON_RE = /^[A-Z0-9_-]{3,32}$/;

const STATE_CODE_MAP = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};

function normalizePlanSlug(name) {
  const raw = String(name || 'starter').toLowerCase().trim();
  if (raw === 'professional') return 'growth';
  if (raw === 'enterprise') return 'scale';
  if (raw === 'basic' || raw === 'free') return 'starter';
  return raw;
}

function Billing() {
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanName, setUpgradingPlanName] = useState(null);
  const [billingAlert, setBillingAlert] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('monthly');

  // Checkout confirmation modal + manual Trial summary popup
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showTrialDetailsModal, setShowTrialDetailsModal] = useState(false);

  // Invoices & buyer billing details
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [billingDetails, setBillingDetails] = useState({
    legalName: '',
    gstin: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [indianStates, setIndianStates] = useState([]);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState(null);

  const showAlert = (type, text) => {
    setBillingAlert({ type, text });
    if (type === 'success') {
      setTimeout(() => setBillingAlert((prev) => (prev?.text === text ? null : prev)), 6000);
    }
  };

  const fetchInvoices = useCallback(async () => {
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
  }, []);

  const fetchBillingDetails = useCallback(async () => {
    try {
      const res = await api.get('/invoices/billing-details');
      const data = res.data?.data || {};
      setBillingDetails((prev) => ({
        ...prev,
        ...data,
        legalName: data.legalName || res.data?.defaults?.legalName || ''
      }));
      setIndianStates(res.data?.states || []);
    } catch (error) {
      console.error('Error fetching billing details:', error);
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, plansRes] = await Promise.all([
        getAdminProfile(),
        getPricingPlans()
      ]);
      const fetchedAdmin = profileRes.data?.data?.admin || null;
      setProfile(fetchedAdmin);
      setPlans(plansRes.data?.data || []);
      if (plansRes.data?.razorpayKeyId) {
        setRazorpayKeyId(plansRes.data.razorpayKeyId);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      showAlert('error', error.response?.data?.error || 'Could not load subscription plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
    fetchInvoices();
    fetchBillingDetails();
  }, [fetchBillingData, fetchInvoices, fetchBillingDetails]);

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setBillingDetails((prev) => ({
      ...prev,
      [name]: name === 'gstin' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value
    }));
    setDetailsMessage(null);
  };

  const validateBillingDetailsClient = () => {
    const legal = String(billingDetails.legalName || '').trim();
    const gstin = String(billingDetails.gstin || '').trim().toUpperCase();
    const state = String(billingDetails.state || '').trim();
    const pincode = String(billingDetails.pincode || '').trim();

    if (legal.length < 2) {
      return 'Legal business name is required (minimum 2 characters).';
    }
    if (gstin && !GSTIN_RE.test(gstin)) {
      return 'Invalid GSTIN format. Enter a 15-character GSTIN (e.g. 24ABCDE1234F1Z5).';
    }
    if (gstin && state && STATE_CODE_MAP[gstin.slice(0, 2)] && STATE_CODE_MAP[gstin.slice(0, 2)] !== state) {
      return `GSTIN state code ${gstin.slice(0, 2)} (${STATE_CODE_MAP[gstin.slice(0, 2)]}) does not match selected state (${state}).`;
    }
    if (pincode && !PINCODE_RE.test(pincode)) {
      return 'PIN code must be a valid 6-digit Indian PIN.';
    }
    return null;
  };

  const saveBillingDetails = async (e) => {
    e.preventDefault();
    const validationErr = validateBillingDetailsClient();
    if (validationErr) {
      setDetailsMessage({ type: 'error', text: validationErr });
      return;
    }

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

  const handleVerifyCoupon = async (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a promo code.');
      return;
    }
    if (!COUPON_RE.test(code)) {
      setCouponError('Promo code must be 3–32 letters, numbers, hyphens, or underscores.');
      setActiveCoupon(null);
      return;
    }

    try {
      setVerifyingCoupon(true);
      setCouponError('');
      const response = await api.post('/auth/verify-coupon', { code });
      if (response.data.success) {
        setActiveCoupon(response.data.data);
        setCouponError('');
      }
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Invalid or expired promo code.');
      setActiveCoupon(null);
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const loadRazorpayScript = () => new Promise((resolve) => {
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

  const openCheckoutConfirmation = (plan) => {
    if (!plan || !plan.name) return;

    const expiredNow = Boolean(profile?.subscriptionEndDate && new Date(profile.subscriptionEndDate) <= new Date());
    const alreadyActiveSamePlan =
      profile?.subscriptionStatus === 'active' &&
      !expiredNow &&
      normalizePlanSlug(profile?.subscriptionPlan) === normalizePlanSlug(plan.name) &&
      (profile?.billingCycle || 'monthly') === selectedCycle;

    if (alreadyActiveSamePlan) {
      showAlert('error', 'You are already active on this exact plan and billing cycle.');
      return;
    }

    if (plan.contactSales) {
      showAlert('error', 'Custom Enterprise plans require contacting Kwickbot sales for setup.');
      return;
    }

    const allowedCycles = Array.isArray(plan.allowedBillingCycles) && plan.allowedBillingCycles.length > 0
      ? plan.allowedBillingCycles
      : ['monthly', 'yearly'];
    if (!allowedCycles.includes(selectedCycle)) {
      showAlert('error', `${plan.displayName || plan.name} does not support ${selectedCycle} billing. Switch to Monthly.`);
      return;
    }

    const basePrice = selectedCycle === 'yearly' && plan.yearlyPrice
      ? Number(plan.yearlyPrice)
      : Number(plan.monthlyPrice || 0);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      showAlert('error', 'Plan pricing is invalid. Contact support.');
      return;
    }

    const discountAmount = activeCoupon ? (basePrice * Number(activeCoupon.discountPercent || 0)) / 100 : 0;
    const totalPayable = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);
    if (totalPayable < 1) {
      showAlert('error', 'This discount reduces the payable amount below ₹1. Contact Kwickbot support to activate manually.');
      return;
    }

    setCheckoutPlan({
      plan,
      cycle: selectedCycle,
      basePrice,
      discountAmount,
      totalPayable
    });
  };

  const executeRazorpayCheckout = async () => {
    if (!checkoutPlan) return;
    const { plan, cycle } = checkoutPlan;
    setCheckoutPlan(null);

    try {
      setUpgradingPlanName(plan.name);
      setBillingAlert(null);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showAlert('error', 'Failed to load Razorpay Payment Gateway. Check your internet connection.');
        setUpgradingPlanName(null);
        return;
      }

      const orderRes = await createRazorpayOrder(
        plan.name,
        activeCoupon ? activeCoupon.code : undefined,
        plan._id,
        cycle
      );
      const { id, amount, currency } = orderRes.data.data;

      const prefillData = {};
      if (profile?.name?.trim()) prefillData.name = profile.name.trim();
      if (profile?.email?.trim()) prefillData.email = profile.email.trim();
      if (profile?.businessPhone?.trim()) {
        const phoneDigits = profile.businessPhone.replace(/\D/g, '');
        if (phoneDigits) prefillData.contact = phoneDigits;
      }

      const options = {
        key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Kwickbot AI',
        description: `${plan.displayName || plan.name} Plan (${cycle.toUpperCase()})`,
        image: '/app-icon.png',
        order_id: id,
        handler: async (response) => {
          try {
            setUpgradingPlanName(plan.name);
            const verifyRes = await verifyRazorpayPayment({
              planName: plan.name,
              planId: plan._id,
              billingCycle: cycle,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            fetchInvoices();
            const updatedProfile = verifyRes.data.data;
            setProfile((prev) => ({
              ...prev,
              subscriptionPlan: updatedProfile.subscriptionPlan,
              subscriptionStatus: updatedProfile.subscriptionStatus,
              selfSignupTrial: false,
              billingCycle: cycle,
              monthlyPrice: updatedProfile.monthlyPrice
            }));

            const storedAdmin = localStorage.getItem('admin');
            if (storedAdmin) {
              const adminObj = JSON.parse(storedAdmin);
              localStorage.setItem('admin', JSON.stringify({
                ...adminObj,
                subscriptionPlan: updatedProfile.subscriptionPlan,
                subscriptionStatus: updatedProfile.subscriptionStatus,
                selfSignupTrial: false,
                monthlyPrice: updatedProfile.monthlyPrice
              }));
            }

            showAlert('success', `Payment successful! Welcome to Kwickbot ${plan.displayName || plan.name} Plan.`);
            window.location.reload();
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            showAlert('error', verifyErr.response?.data?.error || 'Payment verification failed. Contact support.');
          } finally {
            setUpgradingPlanName(null);
          }
        },
        prefill: prefillData,
        theme: { color: '#2A3D18' },
        modal: {
          ondismiss: () => setUpgradingPlanName(null)
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error initiating payment:', error);
      showAlert('error', error.response?.data?.error || 'Failed to initiate Razorpay checkout order.');
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
  let progressColor = '#22c55e';
  if (isUsageDanger) progressColor = '#ef4444';
  else if (isUsageWarning) progressColor = '#f59e0b';

  const normalizedProfilePlan = normalizePlanSlug(profile?.subscriptionPlan);
  const currentPlanDetails = plans.find((p) => normalizePlanSlug(p.name) === normalizedProfilePlan);
  const fallbackFeatures = normalizedProfilePlan === 'custom' ? {
    maxConversations: -1,
    maxMessages: -1,
    geminiTokensPerMonth: profile?.geminiTokensLimit ?? -1,
    maxWhatsAppConnections: 5
  } : {
    maxConversations: (normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale') ? -1 : 500,
    maxMessages: (normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale') ? -1 : 2000,
    geminiTokensPerMonth: profile?.geminiTokensLimit ?? ((normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale') ? -1 : 50000),
    maxWhatsAppConnections: normalizedProfilePlan === 'growth' ? 3 : normalizedProfilePlan === 'scale' ? 5 : 1
  };
  const currentLimits = currentPlanDetails?.usageLimits || {};

  const PAYMENT_METHOD_LABELS = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay later',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash'
  };
  const latestPaidInvoice = invoices.find((inv) => inv.status === 'paid' || inv.paymentStatus === 'completed');
  const paymentMethodText = latestPaidInvoice
    ? `${PAYMENT_METHOD_LABELS[latestPaidInvoice.paymentMethod] || 'Online payment'} (${new Date(latestPaidInvoice.paidDate || latestPaidInvoice.issuedDate).toLocaleDateString('en-IN')})`
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

  const isTrialStatus = profile?.subscriptionStatus === 'trial';
  const isExpired = Boolean(profile?.subscriptionEndDate && new Date(profile.subscriptionEndDate) <= new Date());
  const daysLeft = profile?.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(profile.subscriptionEndDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  const showTrialCallout = profile?.role !== 'super_admin' && (isTrialStatus || isExpired || profile?.selfSignupTrial === true);

  return (
    <div className="container billing-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FaCrown style={{ color: '#fbbf24', marginRight: '12px' }} />
            Billing &amp; Subscriptions
          </h1>
          <p className="page-subtitle">Manage your SaaS subscription, trial status, usage limits, and GST billing details</p>
        </div>
      </div>

      {billingAlert && (
        <div className={`billing-alert ${billingAlert.type}`} role="alert">
          <span>
            {billingAlert.type === 'success' ? <FaCheck style={{ marginRight: '8px' }} /> : <FaExclamationTriangle style={{ marginRight: '8px' }} />}
            {billingAlert.text}
          </span>
          <button
            type="button"
            onClick={() => setBillingAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '15px' }}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {showTrialCallout && (
        <div className="billing-trial-callout">
          <div className="billing-trial-callout-left">
            <FaClock style={{ color: isExpired ? '#dc2626' : '#d97706', fontSize: '20px', marginTop: '3px', flexShrink: 0 }} />
            <div>
              <span className={`billing-trial-pill ${isExpired ? 'expired' : ''}`}>
                {isExpired ? 'TRIAL ENDED' : `${daysLeft ?? 14} DAYS LEFT IN FREE TRIAL`}
              </span>
              <h3>
                {isExpired
                  ? `Your ${planDisplayName} Trial has expired`
                  : `${planDisplayName} Plan Trial Active`}
              </h3>
              <p>
                {profile?.selfSignupTrial === true
                  ? 'You are currently in Free Preview sandbox mode. Activate any paid plan below via Razorpay to unlock full AI replies, store sync, and unlimited campaigns.'
                  : `Your trial ends on ${profile?.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}. Click "Activate Plan" below anytime to continue seamlessly.`}
              </p>
            </div>
          </div>
          <div className="billing-trial-actions">
            <button
              type="button"
              className="invoice-download-btn"
              onClick={() => setShowTrialDetailsModal(true)}
            >
              View Trial Info
            </button>
            <a
              href="#plans-section"
              className="btn-primary"
              style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}
            >
              Activate Plan
            </a>
          </div>
        </div>
      )}

      {/* Plan Overview & Token Usage */}
      <div className="billing-overview-grid">
        <div className="billing-card active-plan-card">
          <div className="card-badge">{isTrialStatus ? 'Trial Plan' : 'Current Plan'}</div>
          <h2 className="plan-name-display">{planDisplayName} Plan</h2>

          <div className="plan-status-row">
            <span className={`status-badge-saas status-${profile?.subscriptionStatus || 'trial'}`}>
              {profile?.subscriptionStatus || 'Trial'}
            </span>
            {planMonthlyPrice > 0 && (
              <span className="monthly-price-display">₹{Number(planMonthlyPrice).toLocaleString('en-IN')}/mo</span>
            )}
          </div>

          {['starter', 'growth', 'professional'].includes(profile?.subscriptionPlan) && (
            <p className="billing-meta-plan-note">
              AI support is included within your plan&apos;s usage limits. Meta bills WhatsApp message delivery separately.
            </p>
          )}

          <div className="plan-meta-list">
            <div className="plan-meta-item">
              <FaCalendarAlt />
              <span>
                {profile?.subscriptionEndDate
                  ? `Current period: ${profile?.subscriptionStartDate ? `${new Date(profile.subscriptionStartDate).toLocaleDateString('en-IN')} – ` : 'until '}${new Date(profile.subscriptionEndDate).toLocaleDateString('en-IN')}`
                  : `Member since: ${profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : 'N/A'}`}
              </span>
            </div>
            <div className="plan-meta-item">
              <FaRegCreditCard />
              <span>Last payment: {paymentMethodText}</span>
            </div>
          </div>

          <div className="plan-limits-section">
            <h4 className="plan-limits-title">Plan &amp; Feature Limits</h4>
            <div className="plan-limits-grid">
              <div>
                Conversations: <strong>{(profile?.monthlyConversationsCount || 0).toLocaleString()} / {currentFeatures.maxConversations === -1 ? 'Unlimited' : currentFeatures.maxConversations}</strong>
              </div>
              <div>
                Support Messages: <strong>{(profile?.totalMessagesProcessed || 0).toLocaleString()} / {currentFeatures.maxMessages === -1 ? 'Unlimited' : (currentFeatures.maxMessages || 2000).toLocaleString()}</strong>
              </div>
              <div>
                Broadcast Messages: <strong>{(profile?.broadcastMessagesUsed || 0).toLocaleString()} / {currentFeatures.maxBroadcastMessages === -1 ? 'Unlimited' : currentFeatures.maxBroadcastMessages.toLocaleString()}</strong>
              </div>
              <div>
                Broadcast Campaigns: <strong>{(profile?.broadcastCampaignsUsed || 0).toLocaleString()} / {currentFeatures.maxBroadcastCampaigns === -1 ? 'Unlimited' : (currentFeatures.maxBroadcastCampaigns || 0).toLocaleString()}</strong>
              </div>
              <div>
                WhatsApp Connections: <strong>{currentFeatures.maxWhatsAppConnections === -1 ? 'Unlimited' : `${currentFeatures.maxWhatsAppConnections || 1} max`}</strong>
              </div>
              <div>
                AI Processing Tokens: <strong>
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
              <FaInfoCircle /> Warning: You are running low on monthly AI chat credits. Upgrade your plan to avoid interruption.
            </div>
          )}
        </div>
      </div>

      {/* Plan Selection Grid */}
      <div id="plans-section" className="plans-selection-section">
        <div className="plans-toolbar-row">
          <div>
            <h2 className="section-title">Choose or Upgrade Subscription Plan</h2>
            <p className="section-subtitle">Select monthly or yearly billing and checkout securely via Razorpay.</p>
          </div>

          <div className="cycle-switch-group" role="tablist" aria-label="Billing cycle">
            <button
              type="button"
              className={`cycle-switch-btn ${selectedCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`cycle-switch-btn ${selectedCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('yearly')}
            >
              Yearly <span className="cycle-save-badge">Save</span>
            </button>
          </div>
        </div>

        {/* Promo Code Box */}
        <div className="promo-code-box">
          <h4>
            <FaTicketAlt style={{ color: 'var(--brand, #3D5A22)' }} /> Have a Promo Code?
          </h4>
          <form onSubmit={handleVerifyCoupon} className="promo-form">
            <input
              type="text"
              placeholder="e.g. WELCOME20"
              maxLength={32}
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError('');
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
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#047857', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✓ Code {activeCoupon.code} applied ({activeCoupon.discountPercent}% OFF)</span>
              <button
                type="button"
                onClick={() => { setActiveCoupon(null); setCouponCode(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
          )}
          {couponError && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
              ✗ {couponError}
            </div>
          )}
        </div>

        <div className="billing-plans-grid">
          {plans.map((plan) => {
            const cardSlug = normalizePlanSlug(plan.name);
            const isSamePlanName = normalizedProfilePlan === cardSlug;
            const isPaidCurrent =
              profile?.subscriptionStatus === 'active' &&
              !isExpired &&
              isSamePlanName &&
              (profile?.billingCycle || 'monthly') === selectedCycle;
            const features = plan.features || {};

            const cyclePrice = selectedCycle === 'yearly' && plan.yearlyPrice
              ? Number(plan.yearlyPrice)
              : Number(plan.monthlyPrice || 0);
            const discountedPrice = activeCoupon
              ? Math.max(0, cyclePrice - (cyclePrice * activeCoupon.discountPercent) / 100)
              : cyclePrice;

            const actionLabel = isPaidCurrent
              ? 'Current Active Plan'
              : upgradingPlanName === plan.name
                ? 'Processing...'
                : isSamePlanName && isTrialStatus
                  ? `Activate ${plan.displayName || plan.name} Plan`
                  : 'Select & Pay';

            return (
              <div key={plan._id || plan.name} className={`upgrade-plan-card ${isPaidCurrent ? 'current' : ''}`}>
                {plan.badge && <span className="upgrade-badge">{plan.badge}</span>}

                <h3 className="upgrade-plan-name">{plan.displayName}</h3>
                <p className="upgrade-plan-desc">{plan.shortDescription || plan.description}</p>

                <div className="upgrade-price-row">
                  {activeCoupon ? (
                    <>
                      <span className="price" style={{ textDecoration: 'line-through', fontSize: '18px', color: 'var(--text-muted)' }}>
                        ₹{cyclePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="price" style={{ color: '#047857' }}>
                        ₹{discountedPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </>
                  ) : (
                    <span className="price">₹{cyclePrice.toLocaleString('en-IN')}</span>
                  )}
                  <span className="period">/{selectedCycle === 'yearly' && plan.yearlyPrice ? 'year' : 'month'}</span>
                </div>

                {['starter', 'growth', 'professional'].includes(cardSlug) && (
                  <p className="billing-meta-plan-note">
                    AI support is included within this plan&apos;s usage limits. Meta charges separately for WhatsApp message delivery.
                  </p>
                )}

                <ul className="upgrade-features-list">
                  {cardSlug === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 500 WhatsApp Conversations/mo</li>
                  )}
                  {cardSlug === 'growth' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited AI WhatsApp conversations/mo</li>
                  )}
                  {cardSlug === 'scale' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited WhatsApp Conversations/mo</li>
                  )}

                  {cardSlug === 'starter' && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Up to 2,000 incoming &amp; outgoing messages/mo</li>
                  )}
                  {(cardSlug === 'growth' || cardSlug === 'scale') && (
                    <li><FaCheck style={{ color: '#1677FF' }} /> Unlimited incoming &amp; outgoing WhatsApp messages/mo</li>
                  )}

                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {cardSlug === 'starter' ? '1 Active WhatsApp Number' : cardSlug === 'growth' ? 'Up to 3 WhatsApp Numbers' : 'Up to 5 WhatsApp Numbers'}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {cardSlug === 'starter' ? '1 KB PDF Upload' : cardSlug === 'growth' ? 'Up to 3 KB PDF Uploads' : 'Unlimited KB PDF Uploads'}
                  </li>
                  <li><FaCheck style={{ color: '#1677FF' }} /> Instant AI Answers &amp; Live Chat Console</li>

                  <li style={{ opacity: features.advancedAnalytics ? 1 : 0.5 }}>
                    {features.advancedAnalytics ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Advanced Analytics Dashboard</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444' }} /> <span style={{ textDecoration: 'line-through' }}>Advanced Analytics Dashboard</span></>
                    )}
                  </li>
                  <li style={{ opacity: features.customBranding ? 1 : 0.5 }}>
                    {features.customBranding ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> White-Label Custom Branding</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444' }} /> <span style={{ textDecoration: 'line-through' }}>White-Label Custom Branding</span></>
                    )}
                  </li>
                  <li style={{ opacity: features.developerApi || features.apiAccess ? 1 : 0.5 }}>
                    {features.developerApi || features.apiAccess ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Developer API &amp; Webhooks</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444' }} /> <span style={{ textDecoration: 'line-through' }}>Developer API &amp; Webhooks</span></>
                    )}
                  </li>
                </ul>

                <button
                  type="button"
                  className={`plan-select-btn ${isPaidCurrent ? 'btn-current' : 'btn-upgrade'}`}
                  disabled={isPaidCurrent || upgradingPlanName !== null}
                  onClick={() => openCheckoutConfirmation(plan)}
                >
                  {actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Meta WhatsApp API Charges Info Card */}
      <div className="billing-card meta-charges-card" style={{ marginBottom: '28px' }}>
        <h3 className="card-title-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          <FaWhatsapp style={{ color: '#25D366' }} /> Official Meta WhatsApp API Charges
        </h3>
        <p className="usage-subtitle" style={{ margin: '0 0 20px 0' }}>
          Your Kwickbot plan includes AI support features. Meta&apos;s delivery charges are separate and depend on message category and recipient market.
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
                <td>First 1,000 per business number each month are free; then <a href="https://whatsappbusiness.com/products/platform-pricing/" target="_blank" rel="noopener noreferrer">Meta&apos;s current rate</a></td>
                <td>Customer support chats started by the customer messaging first</td>
                <td>Charged per delivered message after the free allowance</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing details printed on invoices */}
      <div className="billing-card billing-details-card">
        <h3 className="card-title-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <FaBuilding /> Billing details for invoices
        </h3>
        <p className="billing-muted">These details appear in the “Billed to” section of your Kwickbot GST invoices.</p>
        <form className="billing-details-form" onSubmit={saveBillingDetails}>
          <div className="bd-field bd-wide">
            <label htmlFor="bd-legalName">Legal business name *</label>
            <input id="bd-legalName" name="legalName" required value={billingDetails.legalName} onChange={handleDetailsChange} placeholder="As registered for GST" maxLength={200} />
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
                <p className="billing-muted">Your invoice will appear here as soon as you activate or renew a plan.</p>
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
                      <span className={`badge-premium ${inv.status === 'paid' || inv.paymentStatus === 'completed' ? 'badge-active' : ''}`}>
                        {inv.status === 'paid' || inv.paymentStatus === 'completed' ? 'Paid' : (inv.status || 'Issued')}
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

      {/* Checkout Confirmation Modal */}
      {checkoutPlan && (
        <div className="billing-checkout-backdrop">
          <div className="billing-checkout-modal">
            <h3>Confirm Subscription Activation</h3>
            <p className="billing-muted" style={{ marginTop: 0 }}>
              Review your plan and pricing before proceeding to Razorpay Checkout.
            </p>
            <div className="billing-checkout-summary">
              <div className="billing-checkout-row">
                <span>Plan</span>
                <strong>{checkoutPlan.plan.displayName || checkoutPlan.plan.name} ({checkoutPlan.cycle})</strong>
              </div>
              <div className="billing-checkout-row">
                <span>List Price (incl. GST)</span>
                <span>{formatINR(checkoutPlan.basePrice)}</span>
              </div>
              {checkoutPlan.discountAmount > 0 && (
                <div className="billing-checkout-row" style={{ color: '#047857' }}>
                  <span>Promo ({activeCoupon?.code})</span>
                  <span>-{formatINR(checkoutPlan.discountAmount)}</span>
                </div>
              )}
              <div className="billing-checkout-row billing-checkout-total">
                <span>Total Payable</span>
                <span>{formatINR(checkoutPlan.totalPayable)}</span>
              </div>
            </div>
            <div className="billing-checkout-actions">
              <button type="button" className="invoice-download-btn" onClick={() => setCheckoutPlan(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px' }}
                onClick={executeRazorpayCheckout}
              >
                Proceed to Razorpay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial Details Modal (when user clicks "View Trial Info") */}
      {showTrialDetailsModal && (
        <div className="billing-checkout-backdrop">
          <div className="billing-checkout-modal">
            <h3>{planDisplayName} Trial Details</h3>
            <p className="billing-muted" style={{ marginTop: 0 }}>
              Summary of your current trial window and what unlocks upon plan activation.
            </p>
            <div className="billing-checkout-summary">
              <div className="billing-checkout-row">
                <span>Status</span>
                <strong style={{ textTransform: 'capitalize' }}>{profile?.subscriptionStatus || 'Trial'}</strong>
              </div>
              <div className="billing-checkout-row">
                <span>Days Remaining</span>
                <strong>{isExpired ? 'Expired (0 days)' : `${daysLeft ?? 14} days`}</strong>
              </div>
              <div className="billing-checkout-row">
                <span>Trial End Date</span>
                <span>{profile?.subscriptionEndDate ? new Date(profile.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
              <div className="billing-checkout-row">
                <span>Workspace Mode</span>
                <span>{profile?.selfSignupTrial === true ? 'Free Preview Sandbox' : 'Full Plan Trial'}</span>
              </div>
            </div>
            <div className="billing-checkout-actions">
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px' }}
                onClick={() => setShowTrialDetailsModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
