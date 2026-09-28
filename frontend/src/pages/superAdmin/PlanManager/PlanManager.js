import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FaCog, FaPlus, FaEdit, FaTrash, FaTicketAlt, FaCopy, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaExclamationTriangle, FaLayerGroup,
  FaUsers, FaCheckCircle, FaFileAlt, FaTimes
} from 'react-icons/fa';
import './PlanManager.css';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

const CATEGORY_MAP = {
  kwickbot_crm: { label: 'Kwickbot CRM', className: 'kwickbot_crm' },
  crm_integration: { label: 'CRM Integration', className: 'crm_integration' },
  whatsapp_api: { label: 'WhatsApp API', className: 'whatsapp_api' },
  enterprise_custom: { label: 'Enterprise Custom', className: 'enterprise_custom' }
};

const CATEGORY_OPTIONS = [
  { id: 'kwickbot_crm', name: 'Kwickbot CRM' },
  { id: 'crm_integration', name: 'CRM Integration' },
  { id: 'whatsapp_api', name: 'WhatsApp API' },
  { id: 'enterprise_custom', name: 'Enterprise Custom' }
];

const AVAILABLE_PAGES = [
  'dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics',
  'escalations', 'templates', 'integrations', 'orders', 'leads', 'api-keys', 'profile', 'billing'
];

const FEATURE_KEYS = [
  { key: 'dashboardAccess', label: 'Dashboard Access' },
  { key: 'conversations', label: 'Conversations & Live Chat' },
  { key: 'internalOrders', label: 'Internal Orders Management' },
  { key: 'internalInvoices', label: 'Internal Invoices Management' },
  { key: 'internalLeads', label: 'Internal Leads CRM' },
  { key: 'whatsappConnection', label: 'WhatsApp Connection' },
  { key: 'crmConnection', label: 'CRM / ERP Bi-directional Sync' },
  { key: 'leadSync', label: 'Automated Lead Sync' },
  { key: 'contactSync', label: 'Automated Contact Sync' },
  { key: 'productLookup', label: 'Catalog / Product Lookup' },
  { key: 'quotationCreation', label: 'Quotation Creation' },
  { key: 'saleOrderCreation', label: 'Sale Order Creation' },
  { key: 'orderStatusSync', label: 'Order Status Sync & Cancellations' },
  { key: 'fieldMapping', label: 'Custom Field Mapping' },
  { key: 'automationRules', label: 'Automation Rules Engine' },
  { key: 'customWebhooks', label: 'Custom Webhook Triggers' },
  { key: 'developerApi', label: 'Developer REST API Access' },
  { key: 'apiKeys', label: 'API Keys Management' },
  { key: 'integrationLogs', label: 'Integration & Audit Logs' },
  { key: 'failedEventReplay', label: 'Failed Event Replay' },
  { key: 'aiAutomation', label: 'AI Knowledge Base Support' },
  { key: 'knowledgeBase', label: 'Knowledge Base Uploads' },
  { key: 'broadcasts', label: 'WhatsApp Broadcast Campaigns' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics Dashboard' },
  { key: 'humanHandoff', label: 'Automatic Human Handoff' },
  { key: 'customBranding', label: 'Custom Branding / White Labeling' },
  { key: 'prioritySupport', label: 'Priority Support' },
  { key: 'dedicatedSupport', label: 'Dedicated Account Manager' },
  { key: 'customSla', label: 'Custom Enterprise SLA' }
];

const USAGE_LIMIT_KEYS = [
  { key: 'monthlyConversations', label: 'Monthly Conversations (-1 for unlimited)' },
  { key: 'monthlyMessages', label: 'Monthly Messages (-1 for unlimited)' },
  { key: 'monthlyApiRequests', label: 'Monthly API Requests (-1 for unlimited)' },
  { key: 'monthlyWebhookDeliveries', label: 'Monthly Webhook Deliveries (-1 for unlimited)' },
  { key: 'monthlyAutomationExecutions', label: 'Monthly Automation Executions (-1 for unlimited)' },
  { key: 'maxWhatsAppConnections', label: 'Max WhatsApp Connections (-1 for unlimited)' },
  { key: 'maxCrmConnections', label: 'Max CRM Connections (-1 for unlimited)' },
  { key: 'maxActiveAutomations', label: 'Max Active Automations (-1 for unlimited)' },
  { key: 'maxApiKeys', label: 'Max API Keys (-1 for unlimited)' },
  { key: 'maxTeamMembers', label: 'Max Team Members (-1 for unlimited)' },
  { key: 'logRetentionDays', label: 'Log Retention Days' },
  { key: 'geminiTokensPerMonth', label: 'AI Gemini Tokens / Month (-1 for unlimited)' }
];

const DEFAULT_FORM_DATA = {
  name: '',
  slug: '',
  displayName: '',
  shortDescription: '',
  detailedDescription: '',
  category: 'kwickbot_crm',
  currency: 'INR',
  monthlyPrice: 0,
  yearlyPrice: 0,
  setupFee: 0,
  connectorMaintenanceFee: 0,
  customPricing: false,
  contactSales: false,
  trialEnabled: false,
  trialDays: 14,
  badge: '',
  displayOrder: 0,
  isPopular: false,
  isActive: true,
  isPublished: true,
  allowedBillingCycles: ['monthly', 'yearly'],
  permissionProfile: 'starter',
  allowedPages: ['dashboard', 'conversations', 'knowledge-base', 'integrations', 'profile', 'billing'],
  features: FEATURE_KEYS.reduce((acc, f) => ({ ...acc, [f.key]: false }), { dashboardAccess: true, conversations: true }),
  usageLimits: {
    monthlyConversations: 500,
    monthlyMessages: 2000,
    monthlyApiRequests: 10000,
    monthlyWebhookDeliveries: 5000,
    monthlyAutomationExecutions: 1000,
    maxWhatsAppConnections: 1,
    maxCrmConnections: 0,
    maxActiveAutomations: 0,
    maxApiKeys: 0,
    maxTeamMembers: 1,
    logRetentionDays: 30,
    geminiTokensPerMonth: 50000
  },
  supportLevel: 'Standard Email Support',
  sla: 'Best Effort'
};

const formatCurrency = (val, currency = 'INR') => {
  if (val === undefined || val === null) return '₹0';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  } catch (e) {
    return `₹${val}`;
  }
};

function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'coupons'

  // Toolbar Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBilling, setFilterBilling] = useState('all');
  const [sortBy, setSortBy] = useState('order');

  // Coupon States
  const [coupons, setCoupons] = useState([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 10, expiresAt: '' });

  // Plan Form & Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formSection, setFormSection] = useState(1); // 1 to 10
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Toast System
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/super-admin/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      showToast('Failed to load pricing plans', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/super-admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data.data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchCoupons();
  }, [fetchPlans, fetchCoupons]);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.discountPercent) {
      showToast('Please enter code and discount percentage', 'error');
      return;
    }

    try {
      setCouponLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE}/super-admin/coupons`,
        newCoupon,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Promo code created successfully!', 'success');
        setNewCoupon({ code: '', discountPercent: 10, expiresAt: '' });
        setShowCouponModal(false);
        fetchCoupons();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE}/super-admin/coupons/${couponId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Coupon status updated', 'success');
      fetchCoupons();
    } catch (err) {
      showToast('Failed to update coupon status', 'error');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE}/super-admin/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Coupon deleted', 'success');
      fetchCoupons();
    } catch (err) {
      showToast('Failed to delete coupon', 'error');
    }
  };

  const handleOpenModal = (plan = null, targetSection = 1) => {
    setFormSection(targetSection);
    setIsDirty(false);
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        ...DEFAULT_FORM_DATA,
        ...plan,
        features: {
          ...DEFAULT_FORM_DATA.features,
          ...plan.features
        },
        usageLimits: {
          ...DEFAULT_FORM_DATA.usageLimits,
          ...plan.usageLimits
        }
      });
    } else {
      setEditingPlan(null);
      setFormData(DEFAULT_FORM_DATA);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
    }
    setShowModal(false);
    setIsDirty(false);
  };

  const handleInputChange = (field, value) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (key) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key]
      }
    }));
  };

  const handleLimitChange = (key, value) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      usageLimits: {
        ...prev.usageLimits,
        [key]: Number(value)
      }
    }));
  };

  const handlePageToggle = (pageKey) => {
    setIsDirty(true);
    setFormData(prev => {
      const currentPages = prev.allowedPages || [];
      const updated = currentPages.includes(pageKey)
        ? currentPages.filter(p => p !== pageKey)
        : [...currentPages, pageKey];
      return { ...prev, allowedPages: updated };
    });
  };

  const handleSavePlan = async () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      showToast('Plan Name and Display Name are required', 'error');
      return;
    }

    if (!formData.contactSales) {
      if (Number(formData.monthlyPrice) < 0 || Number(formData.yearlyPrice) < 0) {
        showToast('Prices cannot be negative', 'error');
        return;
      }
      if (!formData.allowedBillingCycles || formData.allowedBillingCycles.length === 0) {
        showToast('At least one billing cycle must be enabled unless Contact Sales is checked', 'error');
        return;
      }
    }

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setIsSaving(true);
      if (editingPlan) {
        await axios.put(
          `${API_BASE}/super-admin/plans/${editingPlan._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast(`Plan "${formData.displayName}" updated successfully!`, 'success');
      } else {
        await axios.post(
          `${API_BASE}/super-admin/plans`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast(`Plan "${formData.displayName}" created successfully!`, 'success');
      }
      setShowModal(false);
      setIsDirty(false);
      fetchPlans();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to save plan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicatePlan = async (planId, planName) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.post(`${API_BASE}/super-admin/plans/${planId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Duplicated "${planName}" cleanly as draft!`, 'success');
      fetchPlans();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to duplicate plan', 'error');
    }
  };

  const handleTogglePublish = async (planId, currentPublishStatus, planName) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.post(`${API_BASE}/super-admin/plans/${planId}/toggle-publish`, {
        isPublished: !currentPublishStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`"${planName}" is now ${!currentPublishStatus ? 'published' : 'draft/unpublished'}`, 'info');
      fetchPlans();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update publish status', 'error');
    }
  };

  const handleDeletePlan = async (plan, e) => {
    e.stopPropagation();
    if (plan.activeSubscribersCount > 0) {
      showToast(`Cannot delete "${plan.displayName}" because it has ${plan.activeSubscribersCount} active customer subscriber(s). Unpublish or archive it instead.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${plan.displayName}"?`)) return;
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.delete(`${API_BASE}/super-admin/plans/${plan._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Plan "${plan.displayName}" deleted successfully`, 'success');
      fetchPlans();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete plan', 'error');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const previousPlans = [...plans];
    const newPlans = [...plans];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlans.length) return;

    // Optimistic reorder update
    const tempOrder = newPlans[index].displayOrder;
    newPlans[index].displayOrder = newPlans[targetIndex].displayOrder;
    newPlans[targetIndex].displayOrder = tempOrder;

    setPlans(newPlans);

    const planOrders = newPlans.map(p => ({ id: p._id, displayOrder: p.displayOrder }));
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    try {
      await axios.post(`${API_BASE}/super-admin/plans/reorder`, { planOrders }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Plan order updated', 'success');
    } catch (err) {
      setPlans(previousPlans); // Rollback on error
      showToast('Failed to reorder plans. Reverting...', 'error');
    }
  };

  // Filter & Search Logic
  const filteredPlans = plans.filter(p => {
    // 1. Search term match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (p.displayName || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q);
      const matchSlug = (p.slug || '').toLowerCase().includes(q);
      const matchBadge = (p.badge || '').toLowerCase().includes(q);
      const matchCat = (CATEGORY_MAP[p.category]?.label || '').toLowerCase().includes(q);
      if (!matchName && !matchSlug && !matchBadge && !matchCat) return false;
    }

    // 2. Category Filter
    if (filterCategory !== 'all' && p.category !== filterCategory) {
      return false;
    }

    // 3. Status Filter
    if (filterStatus === 'published' && !p.isPublished) return false;
    if (filterStatus === 'draft' && p.isPublished) return false;
    if (filterStatus === 'active' && !p.isActive) return false;
    if (filterStatus === 'inactive' && p.isActive) return false;

    // 4. Billing Filter
    if (filterBilling === 'contact_sales' && !p.contactSales) return false;
    if (filterBilling === 'monthly_only' && (p.contactSales || !p.allowedBillingCycles?.includes('monthly') || p.allowedBillingCycles?.includes('yearly'))) return false;
    if (filterBilling === 'yearly_only' && (p.contactSales || !p.allowedBillingCycles?.includes('yearly') || p.allowedBillingCycles?.includes('monthly'))) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return (a.monthlyPrice || 0) - (b.monthlyPrice || 0);
    if (sortBy === 'price_desc') return (b.monthlyPrice || 0) - (a.monthlyPrice || 0);
    if (sortBy === 'name_asc') return (a.displayName || '').localeCompare(b.displayName || '');
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  // Summary Metrics
  const publishedCount = plans.filter(p => p.isPublished).length;
  const draftCount = plans.filter(p => !p.isPublished).length;
  const totalSubscribers = plans.reduce((sum, p) => sum + (p.activeSubscribersCount || 0), 0);

  if (loading) {
    return (
      <div className="plan-manager-container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '16px' }} />
          Loading dynamic pricing plans and promo coupons...
        </div>
      </div>
    );
  }

  return (
    <div className="plan-manager-container">
      {/* HEADER */}
      <div className="plan-manager-header">
        <div>
          <h1 className="plan-header-title">
            <FaCog style={{ color: '#f59e0b' }} />
            Pricing Plans & Coupons
          </h1>
          <p className="plan-header-subtitle">
            Configure subscription tiers, monthly/yearly pricing, features, usage limits, and page permissions
          </p>
        </div>
        <div>
          {activeTab === 'plans' ? (
            <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <FaPlus /> Create New Plan
            </button>
          ) : (
            <button onClick={() => setShowCouponModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <FaPlus /> Create Promo Code
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="plan-summary-grid">
        <div className="plan-summary-card">
          <div className="plan-summary-icon total">
            <FaLayerGroup />
          </div>
          <div>
            <div className="plan-summary-val">{plans.length}</div>
            <div className="plan-summary-lbl">Total Tiers</div>
          </div>
        </div>

        <div className="plan-summary-card">
          <div className="plan-summary-icon published">
            <FaCheckCircle />
          </div>
          <div>
            <div className="plan-summary-val">{publishedCount}</div>
            <div className="plan-summary-lbl">Published Plans</div>
          </div>
        </div>

        <div className="plan-summary-card">
          <div className="plan-summary-icon draft">
            <FaFileAlt />
          </div>
          <div>
            <div className="plan-summary-val">{draftCount}</div>
            <div className="plan-summary-lbl">Draft / Unpublished</div>
          </div>
        </div>

        <div className="plan-summary-card">
          <div className="plan-summary-icon subscribers">
            <FaUsers />
          </div>
          <div>
            <div className="plan-summary-val">{totalSubscribers}</div>
            <div className="plan-summary-lbl">Active Customer Subs</div>
          </div>
        </div>
      </div>

      {/* MANAGEMENT TOOLBAR */}
      <div className="plan-toolbar">
        <div className="plan-tabs">
          <button
            onClick={() => setActiveTab('plans')}
            className={`plan-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          >
            Pricing Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`plan-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          >
            <FaTicketAlt />
            Promo Coupons ({coupons.length})
          </button>
        </div>

        {activeTab === 'plans' && (
          <div className="plan-filters">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search plans or slugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="plan-search-input"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="plan-select-filter"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="plan-select-filter"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft / Unpublished</option>
              <option value="active">Active Tiers</option>
              <option value="inactive">Inactive Tiers</option>
            </select>

            <select
              value={filterBilling}
              onChange={(e) => setFilterBilling(e.target.value)}
              className="plan-select-filter"
            >
              <option value="all">All Billing Types</option>
              <option value="monthly_only">Monthly Only</option>
              <option value="yearly_only">Yearly Only</option>
              <option value="contact_sales">Contact Sales</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="plan-select-filter"
            >
              <option value="order">Display Order</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        )}
      </div>

      {/* PRICING PLANS TAB CONTENT */}
      {activeTab === 'plans' ? (
        <>
          {filteredPlans.length === 0 ? (
            <div className="plan-table-container" style={{ padding: '48px', textAlign: 'center' }}>
              <FaLayerGroup style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No matching pricing plans found</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Try clearing your search query or filters.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="plan-table-container">
                <table className="plan-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Order</th>
                      <th>Plan Tiers</th>
                      <th>Category</th>
                      <th>Monthly</th>
                      <th>Yearly</th>
                      <th>Billing</th>
                      <th>Status</th>
                      <th>Permissions</th>
                      <th>Subscribers</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan, index) => {
                      const catInfo = CATEGORY_MAP[plan.category] || { label: plan.category || 'Kwickbot CRM', className: 'kwickbot_crm' };
                      const pageCount = plan.allowedPages ? plan.allowedPages.length : 0;
                      const hasSubscribers = (plan.activeSubscribersCount || 0) > 0;

                      return (
                        <tr key={plan._id || plan.name}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <button
                                onClick={() => handleMoveOrder(index, 'up')}
                                disabled={index === 0}
                                className="btn-reorder"
                                title="Move plan up"
                              >
                                <FaArrowUp />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(index, 'down')}
                                disabled={index === filteredPlans.length - 1}
                                className="btn-reorder"
                                title="Move plan down"
                              >
                                <FaArrowDown />
                              </button>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {plan.displayName}
                              {plan.badge && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(22, 119, 255, 0.12)', color: '#1677ff', fontWeight: 700 }}>
                                  {plan.badge}
                                </span>
                              )}
                              {!plan.isPublished && (
                                <span className="badge-status badge-draft" title="Draft tier not published on public site">
                                  Draft
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                              slug: {plan.slug || plan.name}
                            </div>
                          </td>

                          <td>
                            <span className={`badge-category ${catInfo.className}`}>
                              {catInfo.label}
                            </span>
                          </td>

                          <td>
                            {plan.contactSales ? (
                              <span style={{ fontWeight: 600, color: '#f59e0b' }}>Contact Sales</span>
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {formatCurrency(plan.monthlyPrice, plan.currency)}/mo
                              </span>
                            )}
                          </td>

                          <td>
                            {plan.contactSales ? (
                              <span style={{ fontWeight: 600, color: '#f59e0b' }}>Custom Quote</span>
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {formatCurrency(plan.yearlyPrice, plan.currency)}/yr
                              </span>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {plan.contactSales ? (
                                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Custom</span>
                              ) : (
                                (plan.allowedBillingCycles || ['monthly', 'yearly']).map(b => (
                                  <span key={b} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {b}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`badge-status ${plan.isPublished ? 'badge-published' : 'badge-draft'}`}>
                                {plan.isPublished ? 'Published' : 'Draft'}
                              </span>
                              <span className={`badge-status ${plan.isActive ? 'badge-active-tier' : 'badge-inactive-tier'}`}>
                                {plan.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>

                          <td>
                            {pageCount > 0 ? (
                              <button
                                onClick={() => handleOpenModal(plan, 8)}
                                className="badge-permissions"
                                title="Click to view/edit allowed pages"
                              >
                                {pageCount} pages ({plan.permissionProfile || 'custom'})
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenModal(plan, 8)}
                                className="badge-permissions warning"
                                title="No pages assigned! Click to assign pages"
                              >
                                <FaExclamationTriangle /> No pages assigned
                              </button>
                            )}
                          </td>

                          <td>
                            <span style={{ fontWeight: 600, color: hasSubscribers ? '#16a36a' : 'var(--text-muted)' }}>
                              {plan.activeSubscribersCount || 0} active
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className="plan-actions" style={{ justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleTogglePublish(plan._id, plan.isPublished, plan.displayName)}
                                className="btn-plan-action"
                                title={plan.isPublished ? "Unpublish plan (hide from website)" : "Publish plan (show on website)"}
                              >
                                {plan.isPublished ? <FaEyeSlash /> : <FaEye />}
                              </button>

                              <button
                                onClick={() => handleOpenModal(plan)}
                                className="btn-plan-action"
                                title="Edit plan details"
                              >
                                <FaEdit />
                              </button>

                              <button
                                onClick={() => handleDuplicatePlan(plan._id, plan.displayName)}
                                className="btn-plan-action"
                                title="Duplicate plan as draft"
                              >
                                <FaCopy />
                              </button>

                              <button
                                onClick={(e) => handleDeletePlan(plan, e)}
                                disabled={hasSubscribers}
                                className="btn-plan-action danger"
                                title={hasSubscribers ? `Cannot delete: Has ${plan.activeSubscribersCount} active subscribers` : "Delete plan"}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST (< 768px) */}
              <div className="plan-mobile-list">
                {filteredPlans.map(plan => {
                  const catInfo = CATEGORY_MAP[plan.category] || { label: plan.category || 'Kwickbot CRM', className: 'kwickbot_crm' };
                  const hasSubscribers = (plan.activeSubscribersCount || 0) > 0;

                  return (
                    <div key={plan._id || plan.name} className="plan-mobile-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                            {plan.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {plan.slug || plan.name}
                          </div>
                        </div>
                        <span className={`badge-category ${catInfo.className}`}>
                          {catInfo.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', margin: '12px 0', fontSize: '14px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monthly</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {plan.contactSales ? 'Contact Sales' : `${formatCurrency(plan.monthlyPrice, plan.currency)}/mo`}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Yearly</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {plan.contactSales ? 'Custom Quote' : `${formatCurrency(plan.yearlyPrice, plan.currency)}/yr`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className={`badge-status ${plan.isPublished ? 'badge-published' : 'badge-draft'}`}>
                            {plan.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <div className="plan-actions">
                          <button onClick={() => handleTogglePublish(plan._id, plan.isPublished, plan.displayName)} className="btn-plan-action">
                            {plan.isPublished ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          <button onClick={() => handleOpenModal(plan)} className="btn-plan-action">
                            <FaEdit />
                          </button>
                          <button onClick={() => handleDuplicatePlan(plan._id, plan.displayName)} className="btn-plan-action">
                            <FaCopy />
                          </button>
                          <button onClick={(e) => handleDeletePlan(plan, e)} disabled={hasSubscribers} className="btn-plan-action danger">
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* PROMO COUPONS TAB CONTENT */
        <div className="plan-table-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Active Promotional Coupons</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Discount codes applied during merchant checkout</p>
            </div>
            <button onClick={() => setShowCouponModal(true)} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <FaPlus /> Create Promo Code
            </button>
          </div>

          {coupons.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No active promo coupons found. Click "Create Promo Code" to generate one.
            </div>
          ) : (
            <table className="plan-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount Percentage</th>
                  <th>Expiration Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => (
                  <tr key={coupon._id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '15px', color: '#1677ff' }}>
                      {coupon.code}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {coupon.discountPercent}% OFF
                    </td>
                    <td>
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never Expires'}
                    </td>
                    <td>
                      <span className={`badge-status ${coupon.isActive ? 'badge-published' : 'badge-draft'}`}>
                        {coupon.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="plan-actions" style={{ justifyContent: 'flex-end' }}>
                        <button onClick={() => handleToggleCoupon(coupon._id)} className="btn-plan-action">
                          {coupon.isActive ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button onClick={() => handleDeleteCoupon(coupon._id)} className="btn-plan-action danger">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showModal && (
        <div className="plan-modal-backdrop">
          <div className="plan-modal-dialog">
            <div className="plan-modal-header">
              <h2>{editingPlan ? `Edit Pricing Plan: ${editingPlan.displayName}` : 'Create New Pricing Tiers'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', fontSize: '18px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            {/* 10-Section Navigation Stepper */}
            <div className="plan-modal-nav">
              <button onClick={() => setFormSection(1)} className={`plan-nav-item ${formSection === 1 ? 'active' : ''}`}>1. Basic Info</button>
              <button onClick={() => setFormSection(2)} className={`plan-nav-item ${formSection === 2 ? 'active' : ''}`}>2. Category & Display</button>
              <button onClick={() => setFormSection(3)} className={`plan-nav-item ${formSection === 3 ? 'active' : ''}`}>3. Pricing</button>
              <button onClick={() => setFormSection(4)} className={`plan-nav-item ${formSection === 4 ? 'active' : ''}`}>4. Fees</button>
              <button onClick={() => setFormSection(5)} className={`plan-nav-item ${formSection === 5 ? 'active' : ''}`}>5. Trial</button>
              <button onClick={() => setFormSection(6)} className={`plan-nav-item ${formSection === 6 ? 'active' : ''}`}>6. Features</button>
              <button onClick={() => setFormSection(7)} className={`plan-nav-item ${formSection === 7 ? 'active' : ''}`}>7. Limits</button>
              <button onClick={() => setFormSection(8)} className={`plan-nav-item ${formSection === 8 ? 'active' : ''}`}>8. Permissions</button>
              <button onClick={() => setFormSection(9)} className={`plan-nav-item ${formSection === 9 ? 'active' : ''}`}>9. Support & SLA</button>
              <button onClick={() => setFormSection(10)} className={`plan-nav-item ${formSection === 10 ? 'active' : ''}`}>10. Preview & Publish</button>
            </div>

            <div className="plan-modal-body">
              {/* SECTION 1: BASIC INFORMATION */}
              {formSection === 1 && (
                <div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Internal Name (Identifier) *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g. starter, growth, crm_connect"
                        className="form-control"
                      />
                      <div className="form-hint">Unique lowercase code used in DB queries</div>
                    </div>
                    <div className="form-group">
                      <label>Display Name *</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        placeholder="e.g. Starter Plan, CRM Automation"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>URL Slug *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="e.g. starter-plan, crm-connect"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Short Description</label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                      placeholder="e.g. For small stores validating AI support"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Detailed Description</label>
                    <textarea
                      rows={3}
                      value={formData.detailedDescription}
                      onChange={(e) => handleInputChange('detailedDescription', e.target.value)}
                      placeholder="Full description shown on landing page and checkout"
                      className="form-control"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: CATEGORY & DISPLAY */}
              {formSection === 2 && (
                <div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Plan Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="form-control"
                      >
                        {CATEGORY_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Badge Text (Optional)</label>
                      <input
                        type="text"
                        value={formData.badge || ''}
                        onChange={(e) => handleInputChange('badge', e.target.value)}
                        placeholder="e.g. BEST FIT, POPULAR, RECOMMENDED"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Display Order (Sorting Index)</label>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => handleInputChange('displayOrder', e.target.value)}
                        className="form-control"
                      />
                    </div>

                    <div className="form-group" style={{ paddingTop: '28px' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isPopular}
                          onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                        />
                        Highlight Card as Popular / Best Fit
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: PRICING */}
              {formSection === 3 && (
                <div>
                  <div className="form-group">
                    <label className="checkbox-label" style={{ marginBottom: '16px' }}>
                      <input
                        type="checkbox"
                        checked={formData.contactSales}
                        onChange={(e) => handleInputChange('contactSales', e.target.checked)}
                      />
                      Contact Sales / Custom Enterprise Quote (Hides standard fixed prices)
                    </label>
                  </div>

                  {!formData.contactSales && (
                    <div className="form-grid-3">
                      <div className="form-group">
                        <label>Monthly Price (INR ₹) *</label>
                        <input
                          type="number"
                          value={formData.monthlyPrice}
                          onChange={(e) => handleInputChange('monthlyPrice', e.target.value)}
                          className="form-control"
                        />
                      </div>

                      <div className="form-group">
                        <label>Yearly Price (INR ₹) *</label>
                        <input
                          type="number"
                          value={formData.yearlyPrice}
                          onChange={(e) => handleInputChange('yearlyPrice', e.target.value)}
                          className="form-control"
                        />
                        <div className="form-hint">Yearly discount rate compared to 12 x monthly</div>
                      </div>

                      <div className="form-group">
                        <label>Currency</label>
                        <input
                          type="text"
                          value={formData.currency}
                          onChange={(e) => handleInputChange('currency', e.target.value)}
                          className="form-control"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: SETUP & MAINTENANCE FEES */}
              {formSection === 4 && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>One-Time Setup Fee (INR ₹)</label>
                    <input
                      type="number"
                      value={formData.setupFee}
                      onChange={(e) => handleInputChange('setupFee', e.target.value)}
                      className="form-control"
                    />
                    <div className="form-hint">Applied to first invoice upon onboarding</div>
                  </div>

                  <div className="form-group">
                    <label>Monthly Connector Maintenance Fee (INR ₹)</label>
                    <input
                      type="number"
                      value={formData.connectorMaintenanceFee}
                      onChange={(e) => handleInputChange('connectorMaintenanceFee', e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 5: TRIAL SETTINGS */}
              {formSection === 5 && (
                <div className="form-grid-2">
                  <div className="form-group" style={{ paddingTop: '28px' }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.trialEnabled}
                        onChange={(e) => handleInputChange('trialEnabled', e.target.checked)}
                      />
                      Enable Free Trial for New Signups
                    </label>
                  </div>

                  {formData.trialEnabled && (
                    <div className="form-group">
                      <label>Trial Duration (Days)</label>
                      <input
                        type="number"
                        value={formData.trialDays}
                        onChange={(e) => handleInputChange('trialDays', e.target.value)}
                        className="form-control"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: CORE FEATURES */}
              {formSection === 6 && (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Select entitlements for this pricing tier:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {FEATURE_KEYS.map(f => (
                      <label key={f.key} className="checkbox-label" style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-input)' }}>
                        <input
                          type="checkbox"
                          checked={formData.features?.[f.key] || false}
                          onChange={() => handleFeatureToggle(f.key)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 7: USAGE LIMITS */}
              {formSection === 7 && (
                <div className="form-grid-2">
                  {USAGE_LIMIT_KEYS.map(u => (
                    <div key={u.key} className="form-group">
                      <label>{u.label}</label>
                      <input
                        type="number"
                        value={formData.usageLimits?.[u.key] ?? -1}
                        onChange={(e) => handleLimitChange(u.key, e.target.value)}
                        className="form-control"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 8: PAGE PERMISSIONS */}
              {formSection === 8 && (
                <div>
                  <div className="form-group">
                    <label>Permission Profile Template</label>
                    <select
                      value={formData.permissionProfile || 'starter'}
                      onChange={(e) => handleInputChange('permissionProfile', e.target.value)}
                      className="form-control"
                    >
                      <option value="starter">Starter Profile</option>
                      <option value="growth">Growth Profile</option>
                      <option value="scale">Scale Profile</option>
                      <option value="custom">Custom Configuration</option>
                    </select>
                  </div>

                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', margin: '16px 0 8px 0' }}>
                    Allowed Dashboard Page Access ({formData.allowedPages?.length || 0} selected):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {AVAILABLE_PAGES.map(p => {
                      const isChecked = (formData.allowedPages || []).includes(p);
                      return (
                        <label key={p} className="checkbox-label" style={{ padding: '8px', borderRadius: '6px', background: isChecked ? 'rgba(22, 119, 255, 0.08)' : 'var(--bg-input)' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle(p)}
                          />
                          {p}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 9: SUPPORT & SLA */}
              {formSection === 9 && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Support Tier Level</label>
                    <input
                      type="text"
                      value={formData.supportLevel}
                      onChange={(e) => handleInputChange('supportLevel', e.target.value)}
                      placeholder="e.g. Standard Email Support, 24/7 Dedicated Line"
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>SLA Commitment</label>
                    <input
                      type="text"
                      value={formData.sla}
                      onChange={(e) => handleInputChange('sla', e.target.value)}
                      placeholder="e.g. Best Effort, 99.9% Uptime Guarantee"
                      className="form-control"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 10: PREVIEW & PUBLICATION */}
              {formSection === 10 && (
                <div>
                  <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isPublished}
                          onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                        />
                        Publish Plan on Public Website
                      </label>
                      <div className="form-hint">Unpublished plans remain as Drafts visible only to Super Admin</div>
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        />
                        Active Status (Enabled for subscriptions)
                      </label>
                    </div>
                  </div>

                  <div style={{ padding: '20px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Live Public Pricing Card Preview
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', maxWidth: '320px', margin: '0 auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>{formData.displayName || 'Plan Name'}</span>
                        {formData.badge && <span style={{ fontSize: '10px', background: '#1677ff', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{formData.badge}</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{formData.shortDescription || 'Short description goes here'}</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                        {formData.contactSales ? 'Contact Sales' : `${formatCurrency(formData.monthlyPrice, formData.currency)}/mo`}
                      </div>
                      <button style={{ width: '100%', padding: '10px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
                        {formData.contactSales ? 'Contact Us' : 'Get Started'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="plan-modal-footer">
              <button onClick={handleCloseModal} className="btn-secondary" style={{ padding: '8px 18px', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
                Cancel
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isDirty && <span style={{ fontSize: '12px', color: '#f59e0b' }}>Unsaved changes</span>}
                <button
                  onClick={handleSavePlan}
                  disabled={isSaving}
                  style={{ padding: '10px 24px', borderRadius: '8px', background: '#1677ff', color: '#ffffff', border: 'none', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                  {isSaving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROMO COUPON MODAL */}
      {showCouponModal && (
        <div className="plan-modal-backdrop">
          <div className="plan-modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="plan-modal-header">
              <h2>Create Promotional Coupon</h2>
              <button onClick={() => setShowCouponModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '18px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon} className="plan-modal-body">
              <div className="form-group">
                <label>Promo Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="form-control"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label>Discount Percentage (%) *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  placeholder="15"
                  value={newCoupon.discountPercent}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCouponModal(false)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={couponLoading} style={{ padding: '8px 20px', borderRadius: '8px', background: '#1677ff', color: '#fff', border: 'none', fontWeight: 600, cursor: couponLoading ? 'not-allowed' : 'pointer' }}>
                  {couponLoading ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toast.show && (
        <div className={`plan-toast ${toast.type}`}>
          {toast.type === 'success' && <FaCheckCircle />}
          {toast.type === 'error' && <FaExclamationTriangle />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default PlanManager;
