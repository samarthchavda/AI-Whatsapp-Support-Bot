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

  // Checkout confirmation modal + manual Trial summary popup + mandatory billing prompt
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState(null);
  const [requireBillingOnPurchase, setRequireBillingOnPurchase] = useState(true);
  const [savedBillingDetails, setSavedBillingDetails] = useState(null);
  const [modalBillingError, setModalBillingError] = useState('');
  const [savingModalDetails, setSavingModalDetails] = useState(false);
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
      const resolved = {
        legalName: data.legalName || res.data?.defaults?.legalName || '',
        gstin: data.gstin || '',
        addressLine: data.addressLine || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || ''
      };
      setBillingDetails((prev) => ({
        ...prev,
        ...resolved
      }));
      setSavedBillingDetails({
        legalName: data.legalName || '',
        gstin: data.gstin || '',
        addressLine: data.addressLine || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || ''
      });
      setRequireBillingOnPurchase(res.data?.requireOnPurchase !== false);
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

  const validateBillingDetailsClient = (targetDetails = billingDetails, strict = requireBillingOnPurchase) => {
    const legal = String(targetDetails?.legalName || '').trim();
    const gstin = String(targetDetails?.gstin || '').trim().toUpperCase();
    const addressLine = String(targetDetails?.addressLine || '').trim();
    const city = String(targetDetails?.city || '').trim();
    const state = String(targetDetails?.state || '').trim();
    const pincode = String(targetDetails?.pincode || '').trim();

    if (legal.length < 2) {
      return 'Legal business name is required (minimum 2 characters).';
    }
    if (gstin && !GSTIN_RE.test(gstin)) {
      return 'Invalid GSTIN format. Enter a 15-character GSTIN (e.g. 24ABCDE1234F1Z5).';
    }
    if (gstin && state && STATE_CODE_MAP[gstin.slice(0, 2)] && STATE_CODE_MAP[gstin.slice(0, 2)] !== state) {
      return `GSTIN state code ${gstin.slice(0, 2)} (${STATE_CODE_MAP[gstin.slice(0, 2)]}) does not match selected state (${state}).`;
    }
    if (strict) {
      if (addressLine.length < 5) {
        return 'Registered address is required (minimum 5 characters).';
      }
      if (city.length < 2) {
        return 'City is required (minimum 2 characters).';
      }
      if (!state) {
        return 'State is required.';
      }
      if (!PINCODE_RE.test(pincode)) {
        return 'PIN code is required and must be a valid 6-digit Indian PIN.';
      }
    } else if (pincode && !PINCODE_RE.test(pincode)) {
      return 'PIN code must be a valid 6-digit Indian PIN.';
    }
    return null;
  };

  const saveBillingDetails = async (e) => {
    e.preventDefault();
    const validationErr = validateBillingDetailsClient(billingDetails, requireBillingOnPurchase);
    if (validationErr) {
      setDetailsMessage({ type: 'error', text: validationErr });
      return;
    }

    try {
      setSavingDetails(true);
      const res = await api.put('/invoices/billing-details', billingDetails);
      const updated = res.data?.data || billingDetails;
      setBillingDetails((prev) => ({ ...prev, ...updated }));
      setSavedBillingDetails(updated);
      setDetailsMessage({ type: 'success', text: res.data?.message || 'Billing details saved.' });
    } catch (error) {
      setDetailsMessage({ type: 'error', text: error.response?.data?.error || 'Could not save billing details.' });
    } finally {
      setSavingDetails(false);
    }
  };

  const saveModalBillingAndContinue = async (e) => {
    e.preventDefault();
    const validationErr = validateBillingDetailsClient(billingDetails, true);
    if (validationErr) {
      setModalBillingError(validationErr);
      return;
    }

    try {
      setSavingModalDetails(true);
      setModalBillingError('');
      const res = await api.put('/invoices/billing-details', billingDetails);
      const updated = res.data?.data || billingDetails;
      setBillingDetails((prev) => ({ ...prev, ...updated }));
      setSavedBillingDetails(updated);
      const nextPlan = pendingCheckoutPlan;
      setPendingCheckoutPlan(null);
      if (nextPlan) {
        setCheckoutPlan(nextPlan);
      }
    } catch (error) {
      setModalBillingError(error.response?.data?.error || 'Could not save billing details.');
    } finally {
      setSavingModalDetails(false);
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

    const setupFee = Number(plan.setupFee || 0);
    const discountAmount = activeCoupon ? (basePrice * Number(activeCoupon.discountPercent || 0)) / 100 : 0;
    const totalPayable = Math.max(0, Math.round((basePrice + setupFee - discountAmount) * 100) / 100);
    if (totalPayable < 1) {
      showAlert('error', 'This discount reduces the payable amount below ₹1. Contact Kwickbot support to activate manually.');
      return;
    }

    const payload = {
      plan,
      cycle: selectedCycle,
      basePrice,
      setupFee,
      discountAmount,
      totalPayable
    };

    if (requireBillingOnPurchase) {
      const missingErr = validateBillingDetailsClient(savedBillingDetails, true);
      if (missingErr) {
        setModalBillingError('');
        setPendingCheckoutPlan(payload);
        return;
      }
    }

    setCheckoutPlan(payload);
  };

  const executeRazorpayCheckout = async () => {
    if (!checkoutPlan) return;
    const currentCheckout = checkoutPlan;
    const { plan, cycle } = currentCheckout;
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
      if (error.response?.data?.code === 'BILLING_DETAILS_REQUIRED') {
        setRequireBillingOnPurchase(true);
        setModalBillingError(error.response?.data?.error || 'Please complete your billing details before purchasing a plan.');
        setPendingCheckoutPlan(currentCheckout);
        fetchBillingDetails();
      } else {
        showAlert('error', error.response?.data?.error || 'Failed to initiate Razorpay checkout order.');
      }
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

  const normalizedProfilePlan = normalizePlanSlug(profile?.subscriptionPlan);
  const currentPlanDetails = plans.find((p) => normalizePlanSlug(p.name) === normalizedProfilePlan);
  const fallbackFeatures = normalizedProfilePlan === 'custom' ? {
    maxConversations: -1,
    maxMessages: -1,
    maxAiRepliesPerMonth: -1,
    aiTopupAvailable: true,
    maxWhatsAppConnections: 5
  } : {
    maxConversations: (normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale') ? -1 : 500,
    maxMessages: (normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale') ? -1 : 2000,
    maxAiRepliesPerMonth: normalizedProfilePlan === 'growth' ? 5000 : normalizedProfilePlan === 'scale' ? -1 : 2000,
    aiTopupAvailable: normalizedProfilePlan === 'growth' || normalizedProfilePlan === 'scale',
    maxWhatsAppConnections: normalizedProfilePlan === 'growth' ? 3 : normalizedProfilePlan === 'scale' ? 5 : 1
  };
  const currentLimits = currentPlanDetails?.usageLimits || {};
  const currentPlanFlags = currentPlanDetails?.features || {};

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
  const rawPlanDisplayName = currentPlanDetails?.displayName || (profile?.subscriptionPlan ? profile.subscriptionPlan.charAt(0).toUpperCase() + profile.subscriptionPlan.slice(1) : 'Starter');
  const planBaseTitle = String(rawPlanDisplayName).replace(/\s+plan$/i, '').trim() || 'Starter';
  const planDisplayName = `${planBaseTitle} Plan`;
  const planMonthlyPrice = profile?.monthlyPrice || currentPlanDetails?.monthlyPrice;
  const currentFeatures = {
    ...fallbackFeatures,
    maxConversations: currentLimits.monthlyConversations ?? fallbackFeatures.maxConversations,
    maxMessages: currentLimits.monthlyMessages ?? fallbackFeatures.maxMessages,
    maxAiRepliesPerMonth: currentLimits.maxAiRepliesPerMonth ?? fallbackFeatures.maxAiRepliesPerMonth,
    aiTopupAvailable: currentPlanFlags.aiTopupAvailable ?? fallbackFeatures.aiTopupAvailable,
    maxWhatsAppConnections: currentLimits.maxWhatsAppConnections ?? fallbackFeatures.maxWhatsAppConnections,
    maxBroadcastMessages: currentLimits.maxBroadcastMessages ?? 0,
    maxBroadcastCampaigns: currentLimits.maxBroadcastCampaigns ?? 0
  };

  const aiRepliesUsed = profile?.totalMessagesProcessed || 0;
  const aiRepliesLimit = currentFeatures.maxAiRepliesPerMonth;
  const aiRepliesPercentage = aiRepliesLimit > 0
    ? Math.min(100, Math.round((aiRepliesUsed / aiRepliesLimit) * 100))
    : 0;

  const isUsageWarning = aiRepliesLimit > 0 && aiRepliesPercentage >= 80;
  const isUsageDanger = aiRepliesLimit > 0 && aiRepliesPercentage >= 95;
  let progressColor = '#22c55e';
  if (isUsageDanger) progressColor = '#ef4444';
  else if (isUsageWarning) progressColor = '#f59e0b';

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
                  : `${planDisplayName} Trial Active`}
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
          <h2 className="plan-name-display">{planDisplayName}</h2>

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
                AI Replies / Month: <strong>
                  {aiRepliesUsed.toLocaleString()} / {aiRepliesLimit === -1 ? 'Unlimited' : Number(aiRepliesLimit).toLocaleString()}
                </strong>
                {currentFeatures.aiTopupAvailable && aiRepliesLimit !== -1 && (
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Top-up available after limit
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Replies Usage Card */}
        <div className="billing-card token-usage-card">
          <h3>AI Replies Usage</h3>
          <p className="usage-subtitle">
            Your monthly AI replies reset every 30 days.
            {currentFeatures.aiTopupAvailable && aiRepliesLimit !== -1 && ' Need more? Top-up is available after your monthly limit.'}
          </p>

          <div className="usage-numeric-row">
            <div>
              <span className="used-amount">{aiRepliesUsed.toLocaleString()}</span>
              <span className="divider"> / </span>
              <span className="limit-amount">
                {aiRepliesLimit === -1 || aiRepliesLimit === Infinity
                  ? 'Unlimited'
                  : Number(aiRepliesLimit).toLocaleString()}
              </span>
              <span className="unit"> replies</span>
            </div>
            {aiRepliesLimit !== -1 && aiRepliesLimit !== Infinity && (
              <div className="percentage-display">{aiRepliesPercentage}%</div>
            )}
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${aiRepliesPercentage}%`, backgroundColor: progressColor }}
            />
          </div>

          {isUsageDanger && (
            <div className="usage-alertdanger">
              <FaInfoCircle />{' '}
              {currentFeatures.aiTopupAvailable
                ? 'You have reached your monthly AI reply limit. Contact support for an instant top-up or wait for monthly reset.'
                : 'You have reached your monthly AI reply limit! Upgrade your plan or wait for monthly reset.'}
            </div>
          )}
          {!isUsageDanger && isUsageWarning && (
            <div className="usage-alertwarning">
              <FaInfoCircle />{' '}
              {currentFeatures.aiTopupAvailable
                ? 'Warning: You are nearing your monthly AI reply limit. Top-up is available anytime after the limit.'
                : 'Warning: You are running low on monthly AI replies. Upgrade your plan to avoid interruption.'}
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
            const planSetupFee = Number(plan.setupFee || 0);
            const limits = plan.usageLimits || {};
            const discountValue = activeCoupon ? (cyclePrice * Number(activeCoupon.discountPercent || 0)) / 100 : 0;
            const discountedPrice = Math.max(0, cyclePrice - discountValue);

            const convLimit = limits.monthlyConversations ?? (cardSlug === 'starter' ? 500 : -1);
            const msgLimit = limits.monthlyMessages ?? (cardSlug === 'starter' ? 2000 : -1);
            const aiRepliesLimitCard = limits.maxAiRepliesPerMonth ?? (cardSlug === 'growth' ? 5000 : cardSlug === 'starter' ? 2000 : -1);
            const waLimit = limits.maxWhatsAppConnections ?? (cardSlug === 'growth' ? 3 : cardSlug === 'scale' ? 5 : 1);
            const kbLimit = limits.maxKbUploads ?? (cardSlug === 'growth' ? 3 : cardSlug === 'scale' ? -1 : 1);
            const kbPages = limits.maxKbPdfPages ?? (cardSlug === 'starter' ? 4 : 0);
            const storeLimit = limits.maxIntegrations ?? (cardSlug === 'growth' ? 2 : 1);
            const bcastCamp = limits.maxBroadcastCampaigns ?? (cardSlug === 'starter' ? 5 : -1);
            const bcastMsgs = limits.maxBroadcastMessages ?? (cardSlug === 'starter' ? 5000 : -1);

            const actionLabel = isPaidCurrent
              ? 'Current Active Plan'
              : upgradingPlanName === plan.name
                ? 'Processing...'
                : isSamePlanName && isTrialStatus
                  ? `Activate ${plan.displayName || `${cardSlug} Plan`}`
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

                {planSetupFee > 0 && (
                  <p className="billing-meta-plan-note" style={{ fontWeight: 600, marginBottom: 6 }}>
                    + ₹{planSetupFee.toLocaleString('en-IN')} one-time setup fee
                  </p>
                )}

                {['starter', 'growth', 'professional'].includes(cardSlug) && (
                  <p className="billing-meta-plan-note">
                    AI support is included within this plan&apos;s usage limits. Meta charges separately for WhatsApp message delivery.
                  </p>
                )}

                <ul className="upgrade-features-list">
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {convLimit === -1 ? 'Unlimited AI WhatsApp conversations/mo' : `Up to ${convLimit.toLocaleString('en-IN')} WhatsApp Conversations/mo`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {aiRepliesLimitCard === -1
                      ? 'Unlimited AI replies / month'
                      : `${Number(aiRepliesLimitCard).toLocaleString('en-IN')} AI replies / month${features.aiTopupAvailable ? ' (+ Top-up available)' : ''}`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {msgLimit === -1 ? 'Unlimited incoming & outgoing messages/mo' : `Up to ${msgLimit.toLocaleString('en-IN')} messages/mo`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {waLimit === -1 ? 'Unlimited WhatsApp Numbers' : waLimit === 1 ? '1 Active WhatsApp Number' : `Up to ${waLimit} WhatsApp Numbers`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {storeLimit === -1 ? 'Unlimited Shopify / WooCommerce Stores' : `${storeLimit} ${storeLimit === 1 ? 'Store' : 'Stores'} (Shopify / WooCommerce)`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {kbLimit === -1 ? 'Unlimited KB PDF Uploads' : kbLimit === 1 ? `1 KB PDF Upload${kbPages > 0 ? ` (max ${kbPages} pages)` : ''}` : `Up to ${kbLimit} KB PDF Uploads`}
                  </li>
                  <li>
                    <FaCheck style={{ color: '#1677FF' }} />{' '}
                    {bcastCamp === -1 && bcastMsgs === -1
                      ? 'Unlimited Broadcast Campaigns & Scheduled Sends'
                      : `Broadcasts: ${bcastMsgs.toLocaleString('en-IN')} msgs & ${bcastCamp} campaigns/mo`}
                  </li>
                  <li style={{ opacity: features.abandonedCartRecovery ? 1 : 0.5 }}>
                    {features.abandonedCartRecovery ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Abandoned Cart Recovery &amp; Catalog Sync</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444' }} /> <span style={{ textDecoration: 'line-through' }}>Abandoned Cart Recovery &amp; Catalog Sync</span></>
                    )}
                  </li>
                  <li style={{ opacity: features.advancedAnalytics ? 1 : 0.5 }}>
                    {features.advancedAnalytics ? (
                      <><FaCheck style={{ color: '#1677FF' }} /> Advanced Analytics Dashboard</>
                    ) : (
                      <><FaTimes style={{ color: '#ef4444' }} /> <span style={{ textDecoration: 'line-through' }}>Advanced Analytics Dashboard</span></>
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
        <p className="billing-muted">
          These details appear in the “Billed to” section of your Kwickbot GST invoices.
          {requireBillingOnPurchase && ' Complete billing details are required before purchasing a plan.'}
        </p>
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
            <label htmlFor="bd-address">Address {requireBillingOnPurchase ? '*' : ''}</label>
            <input id="bd-address" name="addressLine" required={requireBillingOnPurchase} value={billingDetails.addressLine} onChange={handleDetailsChange} placeholder="Building, street, area" maxLength={300} autoComplete="street-address" />
          </div>
          <div className="bd-field">
            <label htmlFor="bd-city">City {requireBillingOnPurchase ? '*' : ''}</label>
            <input id="bd-city" name="city" required={requireBillingOnPurchase} value={billingDetails.city} onChange={handleDetailsChange} maxLength={120} autoComplete="address-level2" />
          </div>
          <div className="bd-field">
            <label htmlFor="bd-state">State {requireBillingOnPurchase ? '*' : ''}</label>
            <select id="bd-state" name="state" required={requireBillingOnPurchase} value={billingDetails.state} onChange={handleDetailsChange}>
              <option value="">Select state</option>
              {indianStates.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="bd-field">
            <label htmlFor="bd-pincode">PIN code {requireBillingOnPurchase ? '*' : ''}</label>
            <input id="bd-pincode" name="pincode" required={requireBillingOnPurchase} value={billingDetails.pincode} onChange={handleDetailsChange} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
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

      {/* Mandatory Billing Details Modal before Checkout */}
      {pendingCheckoutPlan && (
        <div className="billing-checkout-backdrop">
          <div className="billing-checkout-modal billing-checkout-modal-wide" role="dialog" aria-modal="true" aria-label="Complete Billing Details to Continue">
            <h3>Complete Billing Details to Continue</h3>
            <p className="billing-muted" style={{ marginTop: 0 }}>
              Please fill in your complete billing details before purchasing{' '}
              <strong>{pendingCheckoutPlan.plan.displayName || pendingCheckoutPlan.plan.name}</strong>.
            </p>
            <form className="billing-details-form billing-modal-form" onSubmit={saveModalBillingAndContinue}>
              <div className="bd-field bd-wide">
                <label htmlFor="modal-bd-legalName">Legal business name *</label>
                <input
                  id="modal-bd-legalName"
                  name="legalName"
                  required
                  value={billingDetails.legalName}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                  placeholder="As registered for GST"
                  maxLength={200}
                />
              </div>
              <div className="bd-field">
                <label htmlFor="modal-bd-gstin">GSTIN <span className="billing-muted">(optional)</span></label>
                <input
                  id="modal-bd-gstin"
                  name="gstin"
                  value={billingDetails.gstin}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                  placeholder="27ABCDE1234F1Z5"
                  maxLength={15}
                  autoComplete="off"
                />
              </div>
              <div className="bd-field bd-wide">
                <label htmlFor="modal-bd-address">Address *</label>
                <input
                  id="modal-bd-address"
                  name="addressLine"
                  required
                  value={billingDetails.addressLine}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                  placeholder="Building, street, area"
                  maxLength={300}
                  autoComplete="street-address"
                />
              </div>
              <div className="bd-field">
                <label htmlFor="modal-bd-city">City *</label>
                <input
                  id="modal-bd-city"
                  name="city"
                  required
                  value={billingDetails.city}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                  maxLength={120}
                  autoComplete="address-level2"
                />
              </div>
              <div className="bd-field">
                <label htmlFor="modal-bd-state">State *</label>
                <select
                  id="modal-bd-state"
                  name="state"
                  required
                  value={billingDetails.state}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                >
                  <option value="">Select state</option>
                  {indianStates.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="bd-field">
                <label htmlFor="modal-bd-pincode">PIN code *</label>
                <input
                  id="modal-bd-pincode"
                  name="pincode"
                  required
                  value={billingDetails.pincode}
                  onChange={(e) => { handleDetailsChange(e); setModalBillingError(''); }}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="postal-code"
                />
              </div>
              {modalBillingError && (
                <div className="bd-actions" style={{ marginTop: 2 }}>
                  <span role="alert" className="bd-msg bd-error">{modalBillingError}</span>
                </div>
              )}
              <div className="bd-actions billing-checkout-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="invoice-download-btn"
                  onClick={() => { setPendingCheckoutPlan(null); setModalBillingError(''); }}
                  disabled={savingModalDetails}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px' }}
                  disabled={savingModalDetails}
                >
                  {savingModalDetails ? 'Saving…' : 'Save & Continue to Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {checkoutPlan && (
        <div className="billing-checkout-backdrop">
          <div className="billing-checkout-modal" role="dialog" aria-modal="true" aria-label="Confirm Subscription Activation">
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
              {checkoutPlan.setupFee > 0 && (
                <div className="billing-checkout-row">
                  <span>One-time Setup Fee</span>
                  <span>+{formatINR(checkoutPlan.setupFee)}</span>
                </div>
              )}
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
          <div className="billing-checkout-modal" role="dialog" aria-modal="true" aria-label={`${planDisplayName} Trial Details`}>
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
