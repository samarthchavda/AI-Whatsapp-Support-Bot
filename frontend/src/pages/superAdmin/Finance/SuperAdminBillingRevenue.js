import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaSync,
  FaPlus,
  FaEye,
  FaFilePdf,
  FaCheckCircle,
  FaBan,
  FaPalette,
  FaFileInvoiceDollar,
  FaUsers,
  FaSave,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminBillingRevenue.css';

const THEME_OPTIONS = [
  {
    key: 'pista',
    name: 'Pista Signature',
    desc: 'Deep olive & soft sage',
    deep: '#2A3D18',
    accent: '#3D5A22',
    soft: '#B9DB97',
    mist: '#F5F8EF',
    tint: '#EEF5E4',
    headerText: '#F5F8EF',
    headerSub: '#B9DB97',
    ink: '#1D2A13',
    muted: '#556447',
    paidBg: '#B9DB97',
    paidText: '#2A3D18'
  },
  {
    key: 'midnight',
    name: 'Midnight Pro',
    desc: 'Slate dark & sky blue',
    deep: '#0F172A',
    accent: '#1E293B',
    soft: '#38BDF8',
    mist: '#F8FAFC',
    tint: '#F1F5F9',
    headerText: '#F8FAFC',
    headerSub: '#7DD3FC',
    ink: '#0F172A',
    muted: '#64748B',
    paidBg: '#10B981',
    paidText: '#FFFFFF'
  },
  {
    key: 'indigo',
    name: 'Royal Indigo',
    desc: 'Deep violet & soft indigo',
    deep: '#1E1B4B',
    accent: '#4338CA',
    soft: '#A5B4FC',
    mist: '#F5F7FF',
    tint: '#EEF2FF',
    headerText: '#FFFFFF',
    headerSub: '#C7D2FE',
    ink: '#1E1B4B',
    muted: '#6366F1',
    paidBg: '#A5B4FC',
    paidText: '#1E1B4B'
  },
  {
    key: 'minimal',
    name: 'Clean Minimal',
    desc: 'Monochrome charcoal',
    deep: '#18181B',
    accent: '#27272A',
    soft: '#E4E4E7',
    mist: '#F4F4F5',
    tint: '#FAFAFA',
    headerText: '#FFFFFF',
    headerSub: '#D4D4D8',
    ink: '#18181B',
    muted: '#71717A',
    paidBg: '#DCFCE7',
    paidText: '#166534'
  }
];

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function SuperAdminBillingRevenue() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const [activeTab, setActiveTab] = useState('subscriptions');
  const [subFilter, setSubFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [invFilter, setInvFilter] = useState('all');
  const [invSearch, setInvSearch] = useState('');

  // Billing Style & Business Profile Form
  const [profileForm, setProfileForm] = useState(null);
  const [savingStyle, setSavingStyle] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [requireBillingOnPurchase, setRequireBillingOnPurchase] = useState(true);
  const [togglingBillingReq, setTogglingBillingReq] = useState(false);

  // Create Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingInv, setCreatingInv] = useState(false);
  const [newInv, setNewInv] = useState({
    customerId: '',
    description: '',
    amount: '',
    cycle: 'monthly',
    status: 'paid',
    paymentMethod: 'upi',
    dueDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // View Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Record Payment Modal
  const [payModalInvoice, setPayModalInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('upi');
  const [recordingPay, setRecordingPay] = useState(false);

  const flashNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchBillingData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const response = await api.get('/super-admin/billing-revenue');
      const payload = response.data?.data || {};
      setData(payload);
      if (payload.businessProfile) {
        setProfileForm((prev) => (isRefresh && prev ? prev : payload.businessProfile));
      }
      if (typeof payload.requireBillingDetailsOnPurchase === 'boolean') {
        setRequireBillingOnPurchase(payload.requireBillingDetailsOnPurchase);
      }
    } catch (err) {
      console.error('Error fetching Billing & Revenue data:', err);
      setError(err.response?.data?.error || 'Failed to load billing & revenue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData(false);
  }, [fetchBillingData]);

  const merchants = useMemo(() => data?.merchants || [], [data]);
  const invoices = useMemo(() => data?.invoices || [], [data]);
  const summary = data?.summary || {};
  const statesList = data?.states || [];

  const filteredMerchants = useMemo(() => {
    const q = subSearch.toLowerCase().trim();
    return merchants.filter((m) => {
      if (subFilter === 'active' && m.subscriptionStatus !== 'active') return false;
      if (subFilter === 'trial' && m.subscriptionStatus !== 'trial') return false;
      if (subFilter === 'inactive' && m.subscriptionStatus !== 'inactive' && m.subscriptionStatus !== 'cancelled') return false;
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.businessName || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.plan || '').toLowerCase().includes(q)
      );
    });
  }, [merchants, subFilter, subSearch]);

  const filteredInvoices = useMemo(() => {
    const q = invSearch.toLowerCase().trim();
    return invoices.filter((inv) => {
      const paid = inv.paymentStatus === 'completed' || inv.status === 'paid';
      if (invFilter === 'paid' && !paid) return false;
      if (invFilter === 'issued' && (paid || inv.status === 'cancelled')) return false;
      if (invFilter === 'cancelled' && inv.status !== 'cancelled') return false;
      if (!q) return true;
      return (
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.customerEmail || '').toLowerCase().includes(q) ||
        (inv.planName || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, invFilter, invSearch]);

  const openIssueModalForMerchant = (merchant = null) => {
    const fallbackMerchant = merchant || merchants[0] || null;
    const defaultAmount = fallbackMerchant?.monthlyAmount > 0 ? String(fallbackMerchant.monthlyAmount) : '1499';
    const planLabel = fallbackMerchant?.plan ? `${fallbackMerchant.plan} plan` : 'subscription';
    setNewInv({
      customerId: fallbackMerchant?._id || '',
      description: `Kwickbot ${planLabel} · Monthly subscription`,
      amount: defaultAmount,
      cycle: 'monthly',
      status: 'paid',
      paymentMethod: 'upi',
      dueDate: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleMerchantSelectInModal = (customerId) => {
    const m = merchants.find((item) => item._id === customerId);
    setNewInv((prev) => ({
      ...prev,
      customerId,
      amount: m?.monthlyAmount > 0 ? String(m.monthlyAmount) : prev.amount,
      description: m ? `Kwickbot ${m.plan || 'starter'} plan · ${prev.cycle === 'yearly' ? 'Yearly' : 'Monthly'} subscription` : prev.description
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newInv.customerId) {
      flashNotice('error', 'Select a merchant to issue an invoice.');
      return;
    }
    try {
      setCreatingInv(true);
      await api.post('/invoices', {
        customerId: newInv.customerId,
        description: newInv.description,
        amount: Number(newInv.amount),
        cycle: newInv.cycle,
        status: newInv.status,
        paymentMethod: newInv.paymentMethod,
        dueDate: newInv.dueDate,
        notes: newInv.notes
      });
      setShowCreateModal(false);
      flashNotice('success', 'Invoice created and added to ledger.');
      setActiveTab('invoices');
      await fetchBillingData(true);
    } catch (err) {
      flashNotice('error', err.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setCreatingInv(false);
    }
  };

  const handleOpenInvoicePdf = async (invoiceId) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      flashNotice('error', 'Failed to generate invoice PDF.');
    }
  };

  const handleOpenPayModal = (inv) => {
    const due = Math.max(0, (inv.totalAmount || 0) - (inv.amountPaid || 0));
    setPayModalInvoice(inv);
    setPayAmount(String(due || inv.totalAmount || 0));
    setPayMethod(inv.paymentMethod || 'upi');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    try {
      setRecordingPay(true);
      await api.post(`/invoices/${payModalInvoice._id}/payment`, {
        amountPaid: Number(payAmount),
        paymentMethod: payMethod
      });
      setPayModalInvoice(null);
      flashNotice('success', 'Payment recorded cleanly.');
      await fetchBillingData(true);
    } catch (err) {
      flashNotice('error', err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setRecordingPay(false);
    }
  };

  const handleCancelInvoice = async (inv) => {
    if (!window.confirm(`Cancel invoice ${inv.invoiceNumber}?`)) return;
    try {
      await api.put(`/invoices/${inv._id}`, { status: 'cancelled' });
      flashNotice('success', `Invoice ${inv.invoiceNumber} marked as cancelled.`);
      await fetchBillingData(true);
    } catch (err) {
      flashNotice('error', err.response?.data?.error || 'Failed to cancel invoice.');
    }
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: field === 'gstin' || field === 'pan' || field === 'invoicePrefix' ? String(value).toUpperCase() : value
    }));
  };

  const handleSaveBillingStyle = async (e) => {
    e.preventDefault();
    try {
      setSavingStyle(true);
      await api.post('/super-admin/settings', {
        settings: { invoice_business_profile: profileForm }
      });
      flashNotice('success', 'Billing style & GST profile saved.');
      await fetchBillingData(true);
    } catch (err) {
      flashNotice('error', err.response?.data?.error || 'Could not save billing style.');
    } finally {
      setSavingStyle(false);
    }
  };

  const handleToggleBillingRequirement = async () => {
    const nextValue = !requireBillingOnPurchase;
    try {
      setTogglingBillingReq(true);
      await api.post('/super-admin/feature-flags/toggle', {
        key: 'requireBillingDetailsOnPurchase',
        isEnabled: nextValue
      });
      setRequireBillingOnPurchase(nextValue);
      flashNotice(
        'success',
        nextValue
          ? 'Mandatory billing details before plan purchase is now ON.'
          : 'Mandatory billing details before plan purchase is now OFF.'
      );
    } catch (err) {
      flashNotice('error', err.response?.data?.error || 'Failed to toggle purchase billing requirement.');
    } finally {
      setTogglingBillingReq(false);
    }
  };

  const handlePreviewSamplePdf = async () => {
    try {
      setPreviewingPdf(true);
      const res = await api.get('/invoices/sample/pdf', {
        params: {
          templateStyle: profileForm?.templateStyle,
          headerLayout: profileForm?.headerLayout,
          brandTagline: profileForm?.brandTagline,
          invoicePrefix: profileForm?.invoicePrefix,
          footerNote: profileForm?.footerNote
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      flashNotice('error', 'Failed to generate sample PDF.');
    } finally {
      setPreviewingPdf(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="billing-sa-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const activeTheme = THEME_OPTIONS.find((t) => t.key === (profileForm?.templateStyle || 'pista')) || THEME_OPTIONS[0];
  const sampleTotal = 2999;
  const gstRegistered = Boolean(profileForm?.gstin && Number(profileForm?.gstRate) > 0);
  const sampleRate = Number(profileForm?.gstRate) || 18;
  const sampleTaxable = gstRegistered ? Number((sampleTotal / (1 + sampleRate / 100)).toFixed(2)) : sampleTotal;
  const sampleTax = gstRegistered ? Number((sampleTotal - sampleTaxable).toFixed(2)) : 0;

  return (
    <div className="billing-sa-page">
      {/* Header */}
      <div className="billing-sa-header">
        <div>
          <div className="billing-sa-breadcrumb">Finance / Billing &amp; Revenue</div>
          <h1 className="billing-sa-title">Billing &amp; Revenue</h1>
          <p className="billing-sa-subtitle">
            Manage merchant subscriptions, issue and settle GST invoices, and customize your live billing style.
          </p>
        </div>

        <div className="billing-sa-header-actions">
          <button
            type="button"
            className="billing-btn-primary"
            onClick={() => openIssueModalForMerchant(null)}
            disabled={merchants.length === 0}
          >
            <FaPlus /> Issue Invoice
          </button>
          <button
            type="button"
            className="billing-btn-secondary"
            onClick={() => fetchBillingData(true)}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="billing-notice error">
          <span><FaExclamationTriangle style={{ marginRight: '8px' }} />{error}</span>
          <button type="button" className="billing-btn-secondary" onClick={() => fetchBillingData(false)}>
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className={`billing-notice ${notice.type}`}>
          <span>{notice.text}</span>
        </div>
      )}

      {!error && (
        <div className="billing-panel">
          {/* KPI Summary Strip */}
          <div className="billing-summary-strip">
            <div className="billing-metric">
              <span className="billing-metric-label">Collected revenue</span>
              <span className="billing-metric-value">{formatInr(summary.totalRevenue)}</span>
              <span className="billing-metric-sub">
                {summary.paidInvoicesCount || 0} paid invoice{summary.paidInvoicesCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="billing-metric">
              <span className="billing-metric-label">Active monthly run-rate (MRR)</span>
              <span className="billing-metric-value">{formatInr(summary.estimatedMrr)}</span>
              <span className="billing-metric-sub">Across {summary.activeSubs || 0} active plan(s)</span>
            </div>

            <div className="billing-metric">
              <span className="billing-metric-label">Subscriber breakdown</span>
              <span className="billing-metric-value">{summary.activeSubs || 0} active</span>
              <span className="billing-metric-sub">
                {summary.trialMerchants || 0} trial · {summary.expiredInactive || 0} inactive
              </span>
            </div>

            <div className="billing-metric">
              <span className="billing-metric-label">Pending / due invoices</span>
              <span className="billing-metric-value">{formatInr(summary.pendingAmount)}</span>
              <span className="billing-metric-sub">
                {summary.pendingCount || 0} awaiting payment
              </span>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="billing-nav-tabs" role="tablist">
            <button
              type="button"
              className={`billing-nav-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              <FaUsers /> Subscriptions ({merchants.length})
            </button>
            <button
              type="button"
              className={`billing-nav-tab ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setActiveTab('invoices')}
            >
              <FaFileInvoiceDollar /> Invoices &amp; Payments ({invoices.length})
            </button>
            <button
              type="button"
              className={`billing-nav-tab ${activeTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveTab('style')}
            >
              <FaPalette /> Billing Style &amp; Template
            </button>
          </div>

          {/* TAB 1: SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && (
            <>
              <div className="billing-toolbar">
                <div className="billing-filter-pills">
                  {[
                    { key: 'all', label: `All (${merchants.length})` },
                    { key: 'active', label: `Active (${summary.activeSubs || 0})` },
                    { key: 'trial', label: `Trial (${summary.trialMerchants || 0})` },
                    { key: 'inactive', label: `Inactive (${summary.expiredInactive || 0})` }
                  ].map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      className={`billing-filter-pill ${subFilter === pill.key ? 'active' : ''}`}
                      onClick={() => setSubFilter(pill.key)}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="billing-search">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search merchant, email, or plan..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Plan</th>
                      <th>Monthly Rate</th>
                      <th>Collected (Invoices)</th>
                      <th>Trial / Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          No merchants match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((merchant) => {
                        const pillClass =
                          merchant.billingStatus === 'Active'
                            ? 'ok'
                            : merchant.billingStatus === 'Trial'
                              ? 'info'
                              : 'crit';
                        return (
                          <tr key={merchant._id}>
                            <td>
                              <div className="billing-merchant-name">{merchant.businessName || merchant.name}</div>
                              <div className="billing-merchant-sub">{merchant.email}</div>
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>{merchant.plan}</td>
                            <td>{formatInr(merchant.monthlyAmount)}</td>
                            <td>
                              <strong>{formatInr(merchant.totalPaid)}</strong>
                              <div className="billing-merchant-sub">
                                {merchant.invoiceCount || 0} invoice{merchant.invoiceCount === 1 ? '' : 's'}
                              </div>
                            </td>
                            <td>{formatDate(merchant.expiryDate)}</td>
                            <td>
                              <span className={`billing-status-pill ${pillClass}`}>{merchant.billingStatus}</span>
                            </td>
                            <td>
                              <div className="billing-row-actions">
                                <button
                                  type="button"
                                  className="billing-act-btn accent"
                                  onClick={() => openIssueModalForMerchant(merchant)}
                                >
                                  <FaPlus /> Invoice
                                </button>
                                <button
                                  type="button"
                                  className="billing-act-btn"
                                  onClick={() => navigate(`/dashboard/super-admin/merchants/${merchant._id}?tab=subscription`)}
                                >
                                  <FaEye /> Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 2: INVOICES & PAYMENTS */}
          {activeTab === 'invoices' && (
            <>
              <div className="billing-toolbar">
                <div className="billing-filter-pills">
                  {[
                    { key: 'all', label: `All (${invoices.length})` },
                    { key: 'paid', label: `Paid (${summary.paidInvoicesCount || 0})` },
                    { key: 'issued', label: `Unpaid / Due (${summary.pendingCount || 0})` },
                    { key: 'cancelled', label: 'Cancelled' }
                  ].map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      className={`billing-filter-pill ${invFilter === pill.key ? 'active' : ''}`}
                      onClick={() => setInvFilter(pill.key)}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="billing-search">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search invoice #, merchant, email..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="billing-table-wrap">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Merchant</th>
                      <th>Description</th>
                      <th>Total Amount</th>
                      <th>Issued / Due</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          No invoices found. Click &quot;Issue Invoice&quot; to generate one.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const isPaid = inv.paymentStatus === 'completed' || inv.status === 'paid';
                        const isCancelled = inv.status === 'cancelled';
                        const statusClass = isPaid ? 'ok' : isCancelled ? 'muted' : inv.status === 'overdue' ? 'crit' : 'warn';
                        return (
                          <tr key={inv._id}>
                            <td className="billing-mono">{inv.invoiceNumber}</td>
                            <td>
                              <div className="billing-merchant-name">{inv.customerName}</div>
                              <div className="billing-merchant-sub">{inv.customerEmail || inv.customerPhone}</div>
                            </td>
                            <td>
                              <div>{inv.items?.[0]?.description || inv.planName || 'Subscription invoice'}</div>
                              <div className="billing-merchant-sub" style={{ textTransform: 'capitalize' }}>
                                {inv.paymentMethod ? `Paid via ${inv.paymentMethod}` : (inv.billingCycle || 'Custom')}
                              </div>
                            </td>
                            <td>
                              <strong>{formatInr(inv.totalAmount)}</strong>
                              {inv.tax?.registered && (
                                <div className="billing-merchant-sub">Incl. {inv.tax.rate}% GST</div>
                              )}
                            </td>
                            <td>
                              <div>{formatDate(inv.issuedDate || inv.createdAt)}</div>
                              <div className="billing-merchant-sub">Due {formatDate(inv.dueDate)}</div>
                            </td>
                            <td>
                              <span className={`billing-status-pill ${statusClass}`}>{isPaid ? 'Paid' : inv.status}</span>
                            </td>
                            <td>
                              <div className="billing-row-actions">
                                <button
                                  type="button"
                                  className="billing-act-btn"
                                  onClick={() => setSelectedInvoice(inv)}
                                  title="Inspect invoice breakdown"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  type="button"
                                  className="billing-act-btn"
                                  onClick={() => handleOpenInvoicePdf(inv._id)}
                                  title="Open PDF"
                                >
                                  <FaFilePdf style={{ color: '#f87171' }} /> PDF
                                </button>
                                {!isPaid && !isCancelled && (
                                  <>
                                    <button
                                      type="button"
                                      className="billing-act-btn accent"
                                      onClick={() => handleOpenPayModal(inv)}
                                    >
                                      <FaCheckCircle /> Mark Paid
                                    </button>
                                    <button
                                      type="button"
                                      className="billing-act-btn danger"
                                      onClick={() => handleCancelInvoice(inv)}
                                    >
                                      <FaBan /> Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 3: BILLING STYLE & LIVE PREVIEW */}
          {activeTab === 'style' && profileForm && (
            <div className="billing-style-grid">
              <form className="billing-config-col" onSubmit={handleSaveBillingStyle}>
                <div className="billing-config-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ marginBottom: 4 }}>Checkout Billing Details Rule</h3>
                      <p style={{ margin: 0 }}>
                        Require merchants to fill Legal Name, Address, City, State &amp; PIN Code before purchasing a plan.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className={`billing-status-pill ${requireBillingOnPurchase ? 'paid' : 'cancelled'}`}
                      >
                        {requireBillingOnPurchase ? 'ON · Mandatory' : 'OFF · Optional'}
                      </span>
                      <button
                        type="button"
                        className={requireBillingOnPurchase ? 'billing-act-btn danger' : 'billing-act-btn accent'}
                        onClick={handleToggleBillingRequirement}
                        disabled={togglingBillingReq}
                      >
                        {togglingBillingReq
                          ? 'Updating...'
                          : requireBillingOnPurchase
                            ? 'Turn OFF'
                            : 'Turn ON'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="billing-config-section">
                  <h3>Invoice Theme &amp; Layout</h3>
                  <p>Choose the visual style applied to generated PDF invoices and merchant downloads.</p>

                  <div className="theme-swatches">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={`theme-swatch-card ${profileForm.templateStyle === t.key ? 'active' : ''}`}
                        onClick={() => handleProfileChange('templateStyle', t.key)}
                      >
                        <div className="swatch-dots">
                          <span className="swatch-dot" style={{ background: t.deep }} />
                          <span className="swatch-dot" style={{ background: t.soft }} />
                        </div>
                        <div>
                          <div className="swatch-title">{t.name}</div>
                          <div className="swatch-sub">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="layout-toggle-row">
                    {[
                      { key: 'banner', label: 'Solid Brand Header Banner' },
                      { key: 'clean', label: 'Minimal Top Accent Rule' }
                    ].map((layoutOpt) => (
                      <button
                        key={layoutOpt.key}
                        type="button"
                        className={`layout-pill-btn ${profileForm.headerLayout === layoutOpt.key ? 'active' : ''}`}
                        onClick={() => handleProfileChange('headerLayout', layoutOpt.key)}
                      >
                        {layoutOpt.label}
                      </button>
                    ))}
                  </div>

                  <div className="billing-form-grid">
                    <div className="billing-field">
                      <label>Brand Tagline</label>
                      <input
                        type="text"
                        value={profileForm.brandTagline || ''}
                        onChange={(e) => handleProfileChange('brandTagline', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>Invoice Number Prefix</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="KB"
                        value={profileForm.invoicePrefix || 'KB'}
                        onChange={(e) => handleProfileChange('invoicePrefix', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="billing-check-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={profileForm.showPaymentRef !== false}
                        onChange={(e) => handleProfileChange('showPaymentRef', e.target.checked)}
                      />
                      Show Razorpay Order / Payment Reference
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={profileForm.showTaxNote !== false}
                        onChange={(e) => handleProfileChange('showTaxNote', e.target.checked)}
                      />
                      Show GST Inclusive Tax Note
                    </label>
                  </div>
                </div>

                <div className="billing-config-section">
                  <h3>Seller Business &amp; GST Details</h3>
                  <p>Frozen onto every invoice created after saving.</p>

                  <div className="billing-form-grid">
                    <div className="billing-field">
                      <label>Legal Business Name *</label>
                      <input
                        type="text"
                        required
                        value={profileForm.legalName || ''}
                        onChange={(e) => handleProfileChange('legalName', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>Trade / Display Name</label>
                      <input
                        type="text"
                        value={profileForm.tradeName || ''}
                        onChange={(e) => handleProfileChange('tradeName', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>GSTIN (Leave blank for non-GST)</label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="e.g. 24ABCDE1234F1Z5"
                        value={profileForm.gstin || ''}
                        onChange={(e) => handleProfileChange('gstin', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>PAN</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={profileForm.pan || ''}
                        onChange={(e) => handleProfileChange('pan', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>GST Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="28"
                        value={profileForm.gstRate ?? 18}
                        onChange={(e) => handleProfileChange('gstRate', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>SAC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 998314"
                        value={profileForm.sacCode || ''}
                        onChange={(e) => handleProfileChange('sacCode', e.target.value)}
                      />
                    </div>
                    <div className="billing-field full">
                      <label>Registered Address Line</label>
                      <input
                        type="text"
                        value={profileForm.addressLine || ''}
                        onChange={(e) => handleProfileChange('addressLine', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>City</label>
                      <input
                        type="text"
                        value={profileForm.city || ''}
                        onChange={(e) => handleProfileChange('city', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>State</label>
                      <select
                        value={profileForm.state || ''}
                        onChange={(e) => handleProfileChange('state', e.target.value)}
                      >
                        <option value="">Select state</option>
                        {statesList.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div className="billing-field">
                      <label>PIN Code</label>
                      <input
                        type="text"
                        value={profileForm.pincode || ''}
                        onChange={(e) => handleProfileChange('pincode', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>Support Email</label>
                      <input
                        type="email"
                        value={profileForm.email || ''}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>Phone</label>
                      <input
                        type="text"
                        value={profileForm.phone || ''}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="billing-field">
                      <label>Website</label>
                      <input
                        type="text"
                        value={profileForm.website || ''}
                        onChange={(e) => handleProfileChange('website', e.target.value)}
                      />
                    </div>
                    <div className="billing-field full">
                      <label>Invoice Footer Note</label>
                      <input
                        type="text"
                        value={profileForm.footerNote || ''}
                        onChange={(e) => handleProfileChange('footerNote', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="billing-style-footer">
                  <button type="submit" className="billing-btn-primary" disabled={savingStyle}>
                    <FaSave /> {savingStyle ? 'Saving...' : 'Save Billing Style & Profile'}
                  </button>
                  <button
                    type="button"
                    className="billing-btn-secondary"
                    onClick={handlePreviewSamplePdf}
                    disabled={previewingPdf}
                  >
                    <FaFilePdf style={{ color: '#f87171' }} />
                    {previewingPdf ? 'Generating...' : 'Open Real Sample PDF'}
                  </button>
                </div>
              </form>

              {/* LIVE INTERACTIVE INVOICE PREVIEW */}
              <div className="billing-preview-col">
                <div className="billing-preview-bar">
                  <span>Live Billing Preview ({activeTheme.name})</span>
                </div>

                <div className="invoice-sheet">
                  {profileForm.headerLayout === 'clean' ? (
                    <div className="invoice-sheet-clean" style={{ borderTopColor: activeTheme.deep }}>
                      <div>
                        <div className="sheet-brand-name" style={{ color: activeTheme.ink }}>
                          {profileForm.tradeName || profileForm.legalName || 'Kwickbot'}
                        </div>
                        <div className="sheet-brand-tag" style={{ color: activeTheme.muted }}>
                          {profileForm.brandTagline || 'AI WhatsApp support for e-commerce'}
                        </div>
                      </div>
                      <div>
                        <div className="sheet-inv-type" style={{ color: activeTheme.deep }}>
                          {gstRegistered ? 'TAX INVOICE' : 'INVOICE'}
                        </div>
                        <div className="sheet-inv-num" style={{ color: activeTheme.accent }}>
                          {profileForm.invoicePrefix || 'KB'}/26-27/SAMPLE
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="sheet-paid-pill" style={{ background: activeTheme.paidBg, color: activeTheme.paidText }}>
                            PAID
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="invoice-sheet-banner" style={{ background: activeTheme.deep }}>
                      <div>
                        <div className="sheet-brand-name" style={{ color: activeTheme.headerText }}>
                          {profileForm.tradeName || profileForm.legalName || 'Kwickbot'}
                        </div>
                        <div className="sheet-brand-tag" style={{ color: activeTheme.headerSub }}>
                          {profileForm.brandTagline || 'AI WhatsApp support for e-commerce'}
                        </div>
                      </div>
                      <div>
                        <div className="sheet-inv-type" style={{ color: '#ffffff' }}>
                          {gstRegistered ? 'TAX INVOICE' : 'INVOICE'}
                        </div>
                        <div className="sheet-inv-num" style={{ color: activeTheme.headerSub }}>
                          {profileForm.invoicePrefix || 'KB'}/26-27/SAMPLE
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="sheet-paid-pill" style={{ background: activeTheme.paidBg, color: activeTheme.paidText }}>
                            PAID
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="invoice-sheet-body" style={{ color: activeTheme.ink }}>
                    <div className="sheet-meta-row">
                      <div>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>Invoice date</div>
                        <div className="sheet-val">{formatDate(new Date())}</div>
                      </div>
                      <div>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>Billing period</div>
                        <div className="sheet-val">Monthly</div>
                      </div>
                      <div>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>
                          {profileForm.showPaymentRef !== false ? 'Payment ref' : 'Status'}
                        </div>
                        <div className="sheet-val">
                          {profileForm.showPaymentRef !== false ? 'pay_SAMPLE000' : 'Settled'}
                        </div>
                      </div>
                      <div>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>
                          {gstRegistered ? 'Place of supply' : 'Terms'}
                        </div>
                        <div className="sheet-val">
                          {gstRegistered ? (profileForm.state || 'Gujarat') : 'Due on Receipt'}
                        </div>
                      </div>
                    </div>

                    <div className="sheet-parties">
                      <div className="sheet-party-card" style={{ background: activeTheme.mist }}>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>Billed by</div>
                        <div className="sheet-party-name">{profileForm.legalName || 'Kwickbot'}</div>
                        {profileForm.addressLine && <div className="sheet-party-line">{profileForm.addressLine}</div>}
                        {(profileForm.city || profileForm.state) && (
                          <div className="sheet-party-line">
                            {[profileForm.city, profileForm.state, profileForm.pincode].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {profileForm.gstin && <div className="sheet-party-line">GSTIN: {profileForm.gstin}</div>}
                        {profileForm.email && <div className="sheet-party-line">{profileForm.email}</div>}
                      </div>

                      <div className="sheet-party-card" style={{ background: activeTheme.tint }}>
                        <div className="sheet-label" style={{ color: activeTheme.muted }}>Billed to</div>
                        <div className="sheet-party-name">Sample Store Pvt Ltd</div>
                        <div className="sheet-party-line">12 Example Road, Sample City</div>
                        <div className="sheet-party-line">accounts@example.com</div>
                      </div>
                    </div>

                    <div>
                      <div className="sheet-table-head" style={{ background: activeTheme.deep, color: activeTheme.headerText }}>
                        <span>DESCRIPTION</span>
                        <span>QTY</span>
                        <span>AMOUNT</span>
                      </div>
                      <div className="sheet-table-row">
                        <div>
                          <div style={{ fontWeight: 600 }}>Kwickbot Growth plan · Monthly subscription</div>
                          {gstRegistered && profileForm.sacCode && (
                            <div style={{ fontSize: '9.5px', color: activeTheme.muted }}>SAC {profileForm.sacCode}</div>
                          )}
                        </div>
                        <span>1</span>
                        <span style={{ fontWeight: 700 }}>{formatInr(sampleTotal)}</span>
                      </div>
                    </div>

                    <div className="sheet-totals-wrap">
                      <div className="sheet-totals-box">
                        <div className="sheet-total-line">
                          <span>Subtotal</span>
                          <span>{formatInr(sampleTotal)}</span>
                        </div>
                        {gstRegistered && (
                          <>
                            <div className="sheet-total-line">
                              <span>Taxable value</span>
                              <span>{formatInr(sampleTaxable)}</span>
                            </div>
                            <div className="sheet-total-line">
                              <span>GST @ {sampleRate}%</span>
                              <span>{formatInr(sampleTax)}</span>
                            </div>
                          </>
                        )}
                        <div className="sheet-grand-total" style={{ background: activeTheme.deep, color: '#ffffff' }}>
                          <span>{gstRegistered ? 'Total (incl. GST)' : 'Total'}</span>
                          <span>{formatInr(sampleTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sheet-footer" style={{ color: activeTheme.muted }}>
                      <div style={{ fontWeight: 700, color: activeTheme.ink }}>
                        {profileForm.footerNote || 'Thank you for choosing Kwickbot.'}
                      </div>
                      <div>
                        {[profileForm.email, profileForm.website, profileForm.phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / ISSUE INVOICE MODAL */}
      {showCreateModal && (
        <div className="billing-modal-backdrop">
          <div className="billing-modal">
            <div className="billing-modal-head">
              <h3>Issue Invoice</h3>
              <button type="button" className="billing-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="billing-form-grid">
                <div className="billing-field full">
                  <label>Merchant *</label>
                  <select
                    required
                    value={newInv.customerId}
                    onChange={(e) => handleMerchantSelectInModal(e.target.value)}
                  >
                    <option value="">Select merchant...</option>
                    {merchants.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.businessName || m.name} ({m.email}) — {m.plan}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="billing-field full">
                  <label>Line Item Description *</label>
                  <input
                    type="text"
                    required
                    value={newInv.description}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="billing-field">
                  <label>Amount (INR, GST Inclusive) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={newInv.amount}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="billing-field">
                  <label>Billing Cycle</label>
                  <select
                    value={newInv.cycle}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, cycle: e.target.value }))}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>

                <div className="billing-field">
                  <label>Initial Status</label>
                  <select
                    value={newInv.status}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="paid">Paid (Settled)</option>
                    <option value="issued">Issued (Payment Due)</option>
                  </select>
                </div>

                <div className="billing-field">
                  <label>Payment Method</label>
                  <select
                    value={newInv.paymentMethod}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="upi">UPI</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div className="billing-field">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newInv.dueDate}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>

                <div className="billing-field full">
                  <label>Internal Notes</label>
                  <input
                    type="text"
                    placeholder="Optional payment reference or remarks"
                    value={newInv.notes}
                    onChange={(e) => setNewInv((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="billing-modal-footer">
                <button type="button" className="billing-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="billing-btn-primary" disabled={creatingInv}>
                  {creatingInv ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE DETAIL MODAL */}
      {selectedInvoice && (
        <div className="billing-modal-backdrop">
          <div className="billing-modal">
            <div className="billing-modal-head">
              <h3>Invoice {selectedInvoice.invoiceNumber}</h3>
              <button type="button" className="billing-modal-close" onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>

            <div className="inv-detail-grid">
              <div className="inv-detail-box">
                <h4>Billed To</h4>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.customerName}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{selectedInvoice.customerEmail}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{selectedInvoice.customerPhone}</div>
                {selectedInvoice.buyer?.gstin && (
                  <div style={{ marginTop: 4 }}>GSTIN: {selectedInvoice.buyer.gstin}</div>
                )}
              </div>

              <div className="inv-detail-box">
                <h4>Payment &amp; Dates</h4>
                <div>Issued: {formatDate(selectedInvoice.issuedDate || selectedInvoice.createdAt)}</div>
                <div>Due: {formatDate(selectedInvoice.dueDate)}</div>
                <div>Status: <strong style={{ textTransform: 'capitalize' }}>{selectedInvoice.status}</strong></div>
                {selectedInvoice.razorpayPaymentId && (
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Ref: {selectedInvoice.razorpayPaymentId}
                  </div>
                )}
              </div>
            </div>

            <div className="inv-detail-box" style={{ marginBottom: 14 }}>
              <h4>Summary</h4>
              {(selectedInvoice.items || []).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{item.description} × {item.quantity || 1}</span>
                  <strong>{formatInr(item.amount)}</strong>
                </div>
              ))}
              {selectedInvoice.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Discount {selectedInvoice.couponCode ? `(${selectedInvoice.couponCode})` : ''}</span>
                  <span>-{formatInr(selectedInvoice.discountAmount)}</span>
                </div>
              )}
              {selectedInvoice.tax?.registered && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>GST ({selectedInvoice.tax.rate}% included)</span>
                  <span>{formatInr(selectedInvoice.taxAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: 8, marginTop: 8, fontSize: 15 }}>
                <strong>Total Amount</strong>
                <strong>{formatInr(selectedInvoice.totalAmount)}</strong>
              </div>
            </div>

            <div className="billing-modal-footer">
              <button type="button" className="billing-btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
              <button
                type="button"
                className="billing-btn-primary"
                onClick={() => handleOpenInvoicePdf(selectedInvoice._id)}
              >
                <FaFilePdf /> Open Invoice PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {payModalInvoice && (
        <div className="billing-modal-backdrop">
          <div className="billing-modal">
            <div className="billing-modal-head">
              <h3>Record Payment — {payModalInvoice.invoiceNumber}</h3>
              <button type="button" className="billing-modal-close" onClick={() => setPayModalInvoice(null)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="billing-form-grid">
                <div className="billing-field">
                  <label>Amount Received (INR)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div className="billing-field">
                  <label>Payment Method</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="upi">UPI</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="billing-modal-footer">
                <button type="button" className="billing-btn-secondary" onClick={() => setPayModalInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" className="billing-btn-primary" disabled={recordingPay}>
                  {recordingPay ? 'Saving...' : 'Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminBillingRevenue;
