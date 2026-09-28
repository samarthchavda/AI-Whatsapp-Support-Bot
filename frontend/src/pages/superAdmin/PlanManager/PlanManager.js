import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCog, FaPlus, FaEdit, FaTrash, FaCheck, FaTicketAlt, FaCopy, FaEye, FaEyeSlash, FaArrowUp, FaArrowDown, FaInfoCircle } from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

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
  permissionProfile: 'default',
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

function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'coupons'
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Coupon States
  const [coupons, setCoupons] = useState([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 10, expiresAt: '' });

  // Plan Form & Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formSection, setFormSection] = useState(1); // 1 to 9
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  useEffect(() => {
    fetchPlans();
    fetchCoupons();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/super-admin/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/super-admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.discountPercent) {
      alert('Please fill code and discount percentage');
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
        alert('Discount code created successfully!');
        setNewCoupon({ code: '', discountPercent: 10, expiresAt: '' });
        setShowCouponModal(false);
        fetchCoupons();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create coupon');
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
      fetchCoupons();
    } catch (err) {
      alert('Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE}/super-admin/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCoupons();
    } catch (err) {
      alert('Failed to delete coupon');
    }
  };

  const handleOpenModal = (plan = null) => {
    setFormSection(1);
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

  const handleSavePlan = async () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      alert('Plan Name and Display Name are required');
      return;
    }

    if (Number(formData.monthlyPrice) < 0 || Number(formData.yearlyPrice) < 0) {
      alert('Prices cannot be negative');
      return;
    }

    if (!formData.contactSales && (!formData.allowedBillingCycles || formData.allowedBillingCycles.length === 0)) {
      alert('At least one billing cycle must be enabled unless Contact Sales is checked');
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      if (editingPlan) {
        await axios.put(
          `${API_BASE}/super-admin/plans/${editingPlan._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Plan updated successfully!');
      } else {
        await axios.post(
          `${API_BASE}/super-admin/plans`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Plan created successfully!');
      }
      setShowModal(false);
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save plan');
    }
  };

  const handleDuplicatePlan = async (planId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.post(`${API_BASE}/super-admin/plans/${planId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Plan duplicated cleanly as draft!');
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to duplicate plan');
    }
  };

  const handleTogglePublish = async (planId, currentPublishStatus) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.post(`${API_BASE}/super-admin/plans/${planId}/toggle-publish`, {
        isPublished: !currentPublishStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to toggle publish status');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this pricing plan?')) return;
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      await axios.delete(`${API_BASE}/super-admin/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete plan');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const newPlans = [...plans];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlans.length) return;

    const temp = newPlans[index].displayOrder;
    newPlans[index].displayOrder = newPlans[targetIndex].displayOrder;
    newPlans[targetIndex].displayOrder = temp;

    const planOrders = newPlans.map(p => ({ id: p._id, displayOrder: p.displayOrder }));
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    try {
      await axios.post(`${API_BASE}/super-admin/plans/reorder`, { planOrders }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
    } catch (err) {
      alert('Failed to reorder plans');
    }
  };

  const displayedPlans = filterCategory === 'all'
    ? plans
    : plans.filter(p => p.category === filterCategory);

  if (loading) {
    return <div className="container"><div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading plans...</div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FaCog style={{ color: '#f59e0b', marginRight: '12px' }} />
            Dynamic Pricing Plan & Coupon Manager
          </h1>
          <p className="page-subtitle">Configure subscription tiers, monthly/yearly pricing, features, limits, and permissions</p>
        </div>
        {activeTab === 'plans' ? (
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <FaPlus /> Create New Plan
          </button>
        ) : (
          <button onClick={() => setShowCouponModal(true)} className="btn-primary">
            <FaPlus /> Create Promo Code
          </button>
        )}
      </div>

      {/* TABS & CATEGORY FILTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('plans')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'plans' ? '#6366f1' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Pricing Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'coupons' ? '#6366f1' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FaTicketAlt style={{ marginRight: '6px' }} />
            Promo Coupons ({coupons.length})
          </button>
        </div>

        {activeTab === 'plans' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                background: 'rgba(24,24,27,0.9)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === 'plans' ? (
        <div className="table-responsive" style={{ background: 'rgba(24, 24, 27, 0.8)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Plan Name</th>
                <th>Category</th>
                <th>Monthly Price</th>
                <th>Yearly Price</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedPlans.map((plan, index) => (
                <tr key={plan._id || plan.name}>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleMoveOrder(index, 'up')} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><FaArrowUp /></button>
                      <button onClick={() => handleMoveOrder(index, 'down')} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><FaArrowDown /></button>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#ffffff' }}>{plan.displayName}</div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>{plan.name}</div>
                    {plan.badge && <span className="badge badge-info" style={{ fontSize: '10px', marginTop: '2px' }}>{plan.badge}</span>}
                  </td>
                  <td>
                    <span className="badge badge-secondary">{plan.category}</span>
                  </td>
                  <td>
                    {plan.contactSales ? 'Contact Sales' : `${plan.currency || 'INR'} ${plan.monthlyPrice}`}
                    {plan.setupFee > 0 && <div style={{ fontSize: '10px', color: '#f59e0b' }}>+{plan.currency || 'INR'}{plan.setupFee} setup</div>}
                  </td>
                  <td>
                    {plan.contactSales ? 'Contact Sales' : (plan.yearlyPrice ? `${plan.currency || 'INR'} ${plan.yearlyPrice}` : 'N/A')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className={`badge ${plan.isPublished ? 'badge-success' : 'badge-warning'}`}>
                        {plan.isPublished ? 'Published' : 'Draft / Unpublished'}
                      </span>
                      <span className={`badge ${plan.isActive ? 'badge-info' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#38bdf8' }}>{plan.allowedPages?.length || 0} pages</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleTogglePublish(plan._id, plan.isPublished)} title={plan.isPublished ? "Unpublish" : "Publish"} className="btn-icon" style={{ color: plan.isPublished ? '#f59e0b' : '#22c55e' }}>
                        {plan.isPublished ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <button onClick={() => handleOpenModal(plan)} title="Edit Plan" className="btn-icon"><FaEdit /></button>
                      <button onClick={() => handleDuplicatePlan(plan._id)} title="Duplicate Plan" className="btn-icon" style={{ color: '#38bdf8' }}><FaCopy /></button>
                      <button onClick={() => handleDeletePlan(plan._id)} title="Delete Plan" className="btn-icon btn-danger"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* PROMO COUPONS TABLE */
        <div className="table-responsive" style={{ background: 'rgba(24, 24, 27, 0.8)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id}>
                  <td style={{ fontWeight: '700', color: '#6366f1' }}>{coupon.code}</td>
                  <td>{coupon.discountPercent}% OFF</td>
                  <td><span className={`badge ${coupon.isActive ? 'badge-success' : 'badge-secondary'}`}>{coupon.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleToggleCoupon(coupon._id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Toggle</button>
                      <button onClick={() => handleDeleteCoupon(coupon._id)} className="btn-icon btn-danger"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PLAN FORM MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '16px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{editingPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* FORM STEPPER NAV */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', pb: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['1. Basic', '2. Category', '3. Pricing', '4. Setup Fees', '5. Features', '6. Limits', '7. Pages', '8. Support', '9. Preview'].map((stepName, idx) => (
                <button
                  key={idx}
                  onClick={() => setFormSection(idx + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: formSection === (idx + 1) ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: formSection === (idx + 1) ? '#ffffff' : '#a1a1aa',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {stepName}
                </button>
              ))}
            </div>

            {/* SECTION 1: BASIC INFO */}
            {formSection === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Plan Name Key (Unique machine identifier)*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. crm_connect, api_starter, starter"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Display Name*</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="form-control"
                    placeholder="e.g. CRM Connect, Growth Plan"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">URL Slug*</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="form-control"
                    placeholder="e.g. crm-connect, growth"
                  />
                </div>
                <div>
                  <label className="form-label">Short Description</label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="form-control"
                    placeholder="Brief 1-line headline description"
                  />
                </div>
                <div>
                  <label className="form-label">Detailed Description</label>
                  <textarea
                    value={formData.detailedDescription}
                    onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                    className="form-control"
                    rows={3}
                    placeholder="Full plan capabilities and description"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: CATEGORY & DISPLAY */}
            {formSection === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Plan Category*</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Badge Text (e.g. POPULAR, BEST FIT, ENTERPRISE)</label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label">Display Order (Numeric sort order)</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    />
                    Highlight as Popular Plan
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    />
                    Publish on Public Website
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Is Active
                  </label>
                </div>
              </div>
            )}

            {/* SECTION 3: PRICING */}
            {formSection === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Currency Code</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      className="form-control"
                      placeholder="INR, USD, EUR"
                    />
                  </div>
                  <div>
                    <label className="form-label">Monthly Price</label>
                    <input
                      type="number"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                      className="form-control"
                      disabled={formData.contactSales}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Yearly Price (Full year charge)</label>
                    <input
                      type="number"
                      value={formData.yearlyPrice || 0}
                      onChange={(e) => setFormData({ ...formData, yearlyPrice: Number(e.target.value) })}
                      className="form-control"
                      disabled={formData.contactSales}
                    />
                  </div>
                  <div>
                    <label className="form-label">Supported Billing Cycles</label>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={formData.allowedBillingCycles?.includes('monthly')}
                          onChange={(e) => {
                            const cycles = new Set(formData.allowedBillingCycles || []);
                            if (e.target.checked) cycles.add('monthly'); else cycles.delete('monthly');
                            setFormData({ ...formData, allowedBillingCycles: Array.from(cycles) });
                          }}
                        /> Monthly
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={formData.allowedBillingCycles?.includes('yearly')}
                          onChange={(e) => {
                            const cycles = new Set(formData.allowedBillingCycles || []);
                            if (e.target.checked) cycles.add('yearly'); else cycles.delete('yearly');
                            setFormData({ ...formData, allowedBillingCycles: Array.from(cycles) });
                          }}
                        /> Yearly
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.contactSales}
                      onChange={(e) => setFormData({ ...formData, contactSales: e.target.checked })}
                    />
                    Contact Sales CTA (Hides ₹ price, shows Contact Sales button)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.customPricing}
                      onChange={(e) => setFormData({ ...formData, customPricing: e.target.checked })}
                    />
                    Custom Pricing (Enterprise negotiated rate)
                  </label>
                </div>
              </div>
            )}

            {/* SECTION 4: SETUP & MAINTENANCE FEES */}
            {formSection === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Setup Fee (One-time charge)</label>
                  <input
                    type="number"
                    value={formData.setupFee || 0}
                    onChange={(e) => setFormData({ ...formData, setupFee: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label">Connector Maintenance Fee (Recurring monthly maintenance)</label>
                  <input
                    type="number"
                    value={formData.connectorMaintenanceFee || 0}
                    onChange={(e) => setFormData({ ...formData, connectorMaintenanceFee: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {/* SECTION 5: FEATURES */}
            {formSection === 5 && (
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#38bdf8' }}>Feature Entitlements (Machine-readable keys)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {FEATURE_KEYS.map(f => (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.features?.[f.key])}
                        onChange={(e) => setFormData({
                          ...formData,
                          features: { ...formData.features, [f.key]: e.target.checked }
                        })}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 6: USAGE LIMITS */}
            {formSection === 6 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {USAGE_LIMIT_KEYS.map(u => (
                  <div key={u.key}>
                    <label className="form-label" style={{ fontSize: '12px' }}>{u.label}</label>
                    <input
                      type="number"
                      value={formData.usageLimits?.[u.key] ?? -1}
                      onChange={(e) => setFormData({
                        ...formData,
                        usageLimits: { ...formData.usageLimits, [u.key]: Number(e.target.value) }
                      })}
                      className="form-control"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* SECTION 7: PAGE PERMISSIONS */}
            {formSection === 7 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Permission Profile</label>
                  <input
                    type="text"
                    value={formData.permissionProfile || 'default'}
                    onChange={(e) => setFormData({ ...formData, permissionProfile: e.target.value })}
                    className="form-control"
                    placeholder="starter, growth, scale, crm_basic, api_basic, enterprise"
                  />
                </div>
                <div>
                  <label className="form-label">Allowed Navigation Pages (Front &amp; Backend Enforcement)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    {AVAILABLE_PAGES.map(pageKey => (
                      <label key={pageKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                        <input
                          type="checkbox"
                          checked={formData.allowedPages?.includes(pageKey)}
                          onChange={(e) => {
                            const setPages = new Set(formData.allowedPages || []);
                            if (e.target.checked) setPages.add(pageKey); else setPages.delete(pageKey);
                            setFormData({ ...formData, allowedPages: Array.from(setPages) });
                          }}
                        /> {pageKey}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: TRIAL & SUPPORT */}
            {formSection === 8 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.trialEnabled}
                      onChange={(e) => setFormData({ ...formData, trialEnabled: e.target.checked })}
                    /> Enable Free Trial
                  </label>
                </div>
                {formData.trialEnabled && (
                  <div>
                    <label className="form-label">Trial Duration (Days)</label>
                    <input
                      type="number"
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                      className="form-control"
                    />
                  </div>
                )}
                <div>
                  <label className="form-label">Support Level Description</label>
                  <input
                    type="text"
                    value={formData.supportLevel}
                    onChange={(e) => setFormData({ ...formData, supportLevel: e.target.value })}
                    className="form-control"
                    placeholder="Standard Email, Priority Chat, Dedicated Manager"
                  />
                </div>
                <div>
                  <label className="form-label">SLA Commitment</label>
                  <input
                    type="text"
                    value={formData.sla}
                    onChange={(e) => setFormData({ ...formData, sla: e.target.value })}
                    className="form-control"
                    placeholder="Best Effort, 4-hour SLA, 99.9% Uptime SLA"
                  />
                </div>
              </div>
            )}

            {/* SECTION 9: PREVIEW */}
            {formSection === 9 && (
              <div>
                <h4 style={{ fontSize: '14px', color: '#38bdf8', marginBottom: '12px' }}>Live Public Pricing Card Preview</h4>
                <div style={{ maxWidth: '340px', margin: '0 auto', background: '#18181b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', padding: '24px' }}>
                  {formData.isPopular && <div className="cta-sparkle" style={{ fontSize: '10px', marginBottom: '6px' }}>{formData.badge || 'POPULAR'}</div>}
                  <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{formData.displayName || 'Plan Name'}</h3>
                  <div style={{ fontSize: '32px', fontWeight: '800', margin: '12px 0 4px' }}>
                    {formData.contactSales ? 'Contact Sales' : `${formData.currency} ${formData.monthlyPrice}`}
                    {!formData.contactSales && <span style={{ fontSize: '13px', color: '#a1a1aa' }}>/month</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: '#a1a1aa' }}>{formData.shortDescription}</p>
                  <ul style={{ fontSize: '12px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li><FaCheck style={{ color: '#22c55e' }} /> {formData.usageLimits?.monthlyConversations === -1 ? 'Unlimited' : formData.usageLimits?.monthlyConversations} Conversations/mo</li>
                    <li><FaCheck style={{ color: '#22c55e' }} /> {formData.usageLimits?.maxWhatsAppConnections} Active WA Connections</li>
                    {formData.features?.aiAutomation && <li><FaCheck style={{ color: '#22c55e' }} /> AI Knowledge Base Support</li>}
                    {formData.features?.broadcastingAccess && <li><FaCheck style={{ color: '#22c55e' }} /> WhatsApp Broadcasting</li>}
                  </ul>
                  <button className="glowing-btn-white" style={{ marginTop: '20px', width: '100%', pointerEvents: 'none' }}>
                    {formData.contactSales ? 'Talk to sales' : 'Start with demo'}
                  </button>
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                disabled={formSection === 1}
                onClick={() => setFormSection(prev => Math.max(1, prev - 1))}
                className="btn-secondary"
              >
                Previous Step
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {formSection < 9 && (
                  <button
                    type="button"
                    onClick={() => setFormSection(prev => Math.min(9, prev + 1))}
                    className="btn-secondary"
                  >
                    Next Step
                  </button>
                )}
                <button type="button" onClick={handleSavePlan} className="btn-primary">
                  <FaCheck /> Save Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROMO CODE MODAL */}
      {showCouponModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '450px', padding: '24px', color: '#ffffff' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Create Promo Code</h2>
            <form onSubmit={handleCreateCoupon}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Coupon Code*</label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="form-control"
                  placeholder="e.g. KWICK10, FESTIVE20"
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Discount Percentage (%)*</label>
                <input
                  type="number"
                  value={newCoupon.discountPercent}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
                  className="form-control"
                  min="1"
                  max="100"
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  className="form-control"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowCouponModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={couponLoading} className="btn-primary">
                  {couponLoading ? 'Creating...' : 'Save Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanManager;
