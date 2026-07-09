import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCog, FaPlus, FaEdit, FaTrash, FaCheck, FaTicketAlt } from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'coupons'
  
  // Coupon States
  const [coupons, setCoupons] = useState([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 10, expiresAt: '' });

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: null,
    badge: null,
    features: {
      maxConversations: -1,
      maxMessages: -1,
      geminiTokensPerMonth: 10000,
      maxWhatsAppConnections: 1,
      advancedAnalytics: false,
      customBranding: false,
      liveChat: false,
      knowledgeBase: false,
      integrations: false,
      apiAccess: false,
      prioritySupport: false
    }
  });

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
      const response = await axios.post(
        `${API_BASE}/super-admin/coupons/${couponId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        fetchCoupons();
      }
    } catch (err) {
      alert('Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios.delete(
        `${API_BASE}/super-admin/coupons/${couponId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        alert('Coupon deleted successfully!');
        fetchCoupons();
      }
    } catch (err) {
      alert('Failed to delete coupon');
    }
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        ...plan,
        features: {
          maxConversations: -1,
          maxMessages: -1,
          geminiTokensPerMonth: 10000,
          maxWhatsAppConnections: 1,
          advancedAnalytics: false,
          customBranding: false,
          liveChat: false,
          knowledgeBase: false,
          integrations: false,
          apiAccess: false,
          prioritySupport: false,
          ...plan.features
        }
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        monthlyPrice: 0,
        yearlyPrice: null,
        badge: null,
        features: {
          maxConversations: -1,
          maxMessages: -1,
          geminiTokensPerMonth: 10000,
          maxWhatsAppConnections: 1,
          advancedAnalytics: false,
          customBranding: false,
          liveChat: false,
          knowledgeBase: false,
          integrations: false,
          apiAccess: false,
          prioritySupport: false
        }
      });
    }
    setShowModal(true);
  };

  const handleSavePlan = async () => {
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

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this pricing plan?')) return;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    
    try {
      await axios.delete(
        `${API_BASE}/super-admin/plans/${planId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return <div className="container"><div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading plans...</div></div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FaCog style={{ color: '#f59e0b', marginRight: '12px' }} />
            Pricing Plan & Coupon Manager
          </h1>
          <p className="page-subtitle">Create and manage subscription plans and discount codes</p>
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

      {/* Tabs */}
      <div className="super-admin-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'plans' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'plans' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaCog /> Subscription Plans
        </button>
        <button 
          onClick={() => setActiveTab('coupons')}
          className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'coupons' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'coupons' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaTicketAlt /> Discount Codes
        </button>
      </div>

      {activeTab === 'plans' && (
        <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan._id} className="plan-card">
            <div className="plan-badge">
              {plan.badge && <span className="badge-text">{plan.badge}</span>}
            </div>

            <h2 className="plan-name">{plan.displayName}</h2>
            <p className="plan-description">{plan.description}</p>

            <div className="plan-price">
              <span className="price">${plan.monthlyPrice}</span>
              <span className="period">/month</span>
            </div>

            {plan.yearlyPrice && (
              <div className="yearly-price">
                ${plan.yearlyPrice}/year (Save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%)
              </div>
            )}

            <div className="plan-features">
              <h3>Features</h3>
              <ul>
                {plan.features.maxConversations === -1 ? (
                  <li><FaCheck /> Unlimited Conversations</li>
                ) : (
                  <li>Up to {plan.features.maxConversations} Conversations</li>
                )}
                
                {plan.features.maxMessages === -1 ? (
                  <li><FaCheck /> Unlimited Messages</li>
                ) : (
                  <li>Up to {plan.features.maxMessages} Messages</li>
                )}

                <li><FaCheck /> {plan.features.geminiTokensPerMonth === -1 ? 'Unlimited' : plan.features.geminiTokensPerMonth.toLocaleString()} Gemini Tokens/month</li>
                <li><FaCheck /> {plan.features.maxWhatsAppConnections} WhatsApp Connection{plan.features.maxWhatsAppConnections > 1 ? 's' : ''}</li>

                {plan.features.advancedAnalytics && <li><FaCheck /> Advanced Analytics</li>}
                {plan.features.customBranding && <li><FaCheck /> Custom Branding</li>}
                {plan.features.liveChat && <li><FaCheck /> Live Chat Support</li>}
                {plan.features.knowledgeBase && <li><FaCheck /> Knowledge Base</li>}
                {plan.features.integrations && <li><FaCheck /> E-commerce Integrations</li>}
                {plan.features.apiAccess && <li><FaCheck /> API Access</li>}
                {plan.features.prioritySupport && <li><FaCheck /> Priority Support</li>}
              </ul>
            </div>

            <div className="plan-actions">
              <button onClick={() => handleOpenModal(plan)} className="btn-icon-edit">
                <FaEdit /> Edit
              </button>
              <button onClick={() => handleDeletePlan(plan._id)} className="btn-icon-delete">
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Create/Edit Plan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close">✕</button>
            </div>

            <div className="modal-body plan-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Plan Name (Internal)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 'professional'"
                  />
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., 'Professional Plan'"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description"
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Monthly Price ($)</label>
                  <input
                    type="number"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Yearly Price ($) - Optional</label>
                  <input
                    type="number"
                    value={formData.yearlyPrice || ''}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="form-group">
                  <label>Badge (e.g., POPULAR)</label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Conversations (-1 = unlimited)</label>
                  <input
                    type="number"
                    value={formData.features.maxConversations}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: { ...formData.features, maxConversations: Number(e.target.value) }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Max Messages (-1 = unlimited)</label>
                  <input
                    type="number"
                    value={formData.features.maxMessages}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: { ...formData.features, maxMessages: Number(e.target.value) }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Max WhatsApp Connections</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.features.maxWhatsAppConnections}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: { ...formData.features, maxWhatsAppConnections: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Gemini Tokens Per Month</label>
                <input
                  type="number"
                  value={formData.features.geminiTokensPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    features: { ...formData.features, geminiTokensPerMonth: Number(e.target.value) }
                  })}
                />
              </div>

              <div className="features-checklist">
                <h3>Features</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { key: 'advancedAnalytics', label: 'Advanced Analytics' },
                    { key: 'customBranding', label: 'Custom Branding' },
                    { key: 'liveChat', label: 'Live Chat Support' },
                    { key: 'knowledgeBase', label: 'Knowledge Base' },
                    { key: 'integrations', label: 'E-commerce Integrations' },
                    { key: 'apiAccess', label: 'API Access' },
                    { key: 'prioritySupport', label: 'Priority Support' }
                  ].map((feature) => (
                    <label key={feature.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.features[feature.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          features: { ...formData.features, [feature.key]: e.target.checked }
                        })}
                      />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={handleSavePlan} className="btn-primary">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="table-container-premium super-admin-table" style={{ marginTop: '24px' }}>
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount Percentage</th>
                  <th>Status</th>
                  <th>Expires At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No discount codes generated yet. Click "Create Promo Code" to make one.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon._id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{coupon.code}</td>
                      <td>
                        <span className="plan-badge-pill starter" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: 'var(--brand)', fontWeight: 'bold' }}>
                          {coupon.discountPercent}% OFF
                        </span>
                      </td>
                      <td>
                        <span className={`channel-status ${coupon.isActive ? 'connected' : 'disconnected'}`}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="action-buttons coupon-actions">
                          <button
                            onClick={() => handleToggleCoupon(coupon._id)}
                            className={`btn-action-toggle ${coupon.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                            title={coupon.isActive ? "Deactivate Code" : "Activate Code"}
                          >
                            {coupon.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon._id)}
                            className="btn-action-delete"
                            title="Delete Code"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCouponModal && (
        <div className="modal-overlay" onClick={() => setShowCouponModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Discount Code</h2>
              <button onClick={() => setShowCouponModal(false)} className="modal-close">✕</button>
            </div>

            <div className="modal-body plan-form" style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Promo Code (Uppercase, letters & numbers)</label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER50"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    marginTop: '6px'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Discount Percentage (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newCoupon.discountPercent}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: Number(e.target.value) })}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    marginTop: '6px'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    marginTop: '6px'
                  }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button onClick={handleCreateCoupon} className="btn-primary" disabled={couponLoading}>
                  {couponLoading ? 'Creating...' : 'Create Promo Code'}
                </button>
                <button onClick={() => setShowCouponModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanManager;
