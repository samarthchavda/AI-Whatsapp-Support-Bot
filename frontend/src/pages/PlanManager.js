import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCog, FaPlus, FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import './SuperAdmin.css';

function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/super-admin/plans', {
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

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
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
    const token = localStorage.getItem('token');
    
    try {
      if (editingPlan) {
        await axios.put(
          `http://localhost:5001/api/super-admin/plans/${editingPlan._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Plan updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5001/api/super-admin/plans',
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

    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(
        `http://localhost:5001/api/super-admin/plans/${planId}`,
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
            Pricing Plan Manager
          </h1>
          <p className="page-subtitle">Create and manage subscription plans</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <FaPlus /> Create New Plan
        </button>
      </div>

      {/* Plans Grid */}
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

                <li><FaCheck /> {plan.features.geminiTokensPerMonth.toLocaleString()} Gemini Tokens/month</li>
                <li><FaCheck /> {plan.features.maxWhatsAppConnections} WhatsApp Connection{plan.features.maxWhatsAppConnections > 1 ? 's' : ''}</li>

                {plan.features.advancedAnalytics && <li><FaCheck /> Advanced Analytics</li>}
                {plan.features.customBranding && <li><FaCheck /> Custom Branding</li>}
                {plan.features.liveChat && <li><FaCheck /> Live Chat Support</li>}
                {plan.features. knowledgeBase && <li><FaCheck /> Knowledge Base</li>}
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
    </div>
  );
}

export default PlanManager;
