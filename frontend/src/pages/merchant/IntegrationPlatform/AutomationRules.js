import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaCogs, 
  FaPlus, 
  FaToggleOn, 
  FaToggleOff, 
  FaTrash, 
  FaSync, 
  FaExclamationTriangle,
  FaBolt,
  FaTimes
} from 'react-icons/fa';
import { 
  getAutomationRules, 
  createAutomationRule, 
  toggleAutomationRule, 
  deleteAutomationRule 
} from '../../../services/api';
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './IntegrationDashboard.css';

const TRIGGERS = [
  { id: 'crm.lead.created', name: 'CRM: Lead Created', desc: 'Fires when a new lead is created in CRM' },
  { id: 'crm.lead.status_changed', name: 'CRM: Lead Status Changed', desc: 'Fires when lead status or stage is updated' },
  { id: 'crm.order.created', name: 'CRM: Sales Order Created', desc: 'Fires when a new quotation/order is generated' },
  { id: 'crm.invoice.paid', name: 'CRM: Invoice Paid', desc: 'Fires when payment is reconciled in ERP' },
  { id: 'whatsapp.message.received', name: 'WhatsApp: Incoming Message', desc: 'Fires when customer sends a message on WhatsApp' },
  { id: 'whatsapp.cart.abandoned', name: 'WhatsApp: Abandoned Cart', desc: 'Fires when visitor leaves checkout without paying' }
];

const ACTIONS = [
  { id: 'send_whatsapp_template', name: 'Send WhatsApp Template Message' },
  { id: 'sync_to_crm', name: 'Sync Contact/Lead to CRM' },
  { id: 'escalate_to_agent', name: 'Escalate to Live Human Agent' },
  { id: 'webhook_post', name: 'Trigger Outbound Webhook' }
];

function AutomationRules() {
  const { usageLimits, getUsageLimit } = useEffectiveAccess();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('crm.lead.created');
  const [actionType, setActionType] = useState('send_whatsapp_template');
  const [templateName, setTemplateName] = useState('');
  const [conditionField, setConditionField] = useState('phone');
  const [conditionOperator, setConditionOperator] = useState('is_not_empty');
  const [conditionValue, setConditionValue] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const maxAutomations = getUsageLimit('maxActiveAutomations') || usageLimits?.maxActiveAutomations || 5;

  const fetchAutomations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAutomationRules();
      if (res.data && res.data.success) {
        setAutomations(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to load automations');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to fetch automation rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleToggle = async (id) => {
    try {
      setTogglingId(id);
      const res = await toggleAutomationRule(id);
      if (res.data && res.data.success) {
        setAutomations(prev => prev.map(a => a._id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a));
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to toggle rule');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await deleteAutomationRule(id);
      setAutomations(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete automation rule');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setFormError('Rule Name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const conditions = [];
      if (conditionField.trim()) {
        conditions.push({
          field: conditionField.trim(),
          operator: conditionOperator,
          value: conditionValue
        });
      }

      const actionConfig = {};
      if (actionType === 'send_whatsapp_template') {
        actionConfig.templateName = templateName.trim();
        actionConfig.language = 'en';
      }

      const payload = {
        name: ruleName.trim(),
        triggerEvent,
        conditions,
        actionType,
        actionConfig,
        status: 'active'
      };

      const res = await createAutomationRule(payload);
      if (res.data && res.data.success) {
        setShowModal(false);
        setRuleName('');
        setTemplateName('');
        fetchAutomations();
      } else {
        setFormError(res.data?.error || 'Failed to create automation');
      }
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save automation rule');
    } finally {
      setFormSubmitting(false);
    }
  };

  const activeCount = automations.filter(a => a.status === 'active').length;

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge">
            <FaBolt /> Automation Workflow Engine
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Event Automation Rules</h1>
              <p>Trigger instant WhatsApp messages, CRM synchronization, and team alerts based on real-time business events.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={fetchAutomations} disabled={loading}>
                <FaSync className={loading ? 'spin' : ''} /> Refresh
              </button>
              <button 
                className="quick-action-btn primary" 
                onClick={() => setShowModal(true)}
                disabled={activeCount >= maxAutomations}
              >
                <FaPlus /> Create Automation Rule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quota bar */}
      <div style={{
        background: 'var(--bg-input, #f8fafc)',
        border: '1px solid var(--border-subtle, #d9e8f7)',
        borderRadius: '10px',
        padding: '12px 18px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px'
      }}>
        <span>
          <strong>Active Automations:</strong> <strong>{activeCount}</strong> of <strong>{maxAutomations}</strong> maximum concurrent active triggers.
        </span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading your automation rules...</span>
        </div>
      ) : automations.length === 0 ? (
        <div className="integration-section-card">
          <div className="empty-state-card">
            <FaCogs className="empty-state-icon" />
            <h4>No Automation Rules Configured</h4>
            <p>Set up rules to automatically send WhatsApp messages whenever leads or orders are created in your CRM.</p>
            <button className="quick-action-btn primary" onClick={() => setShowModal(true)}>
              <FaPlus /> Create First Rule
            </button>
          </div>
        </div>
      ) : (
        <div className="integration-section-card">
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Trigger Event</th>
                  <th>Action</th>
                  <th>Executions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {automations.map(rule => (
                  <tr key={rule._id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{rule.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)' }}>
                        Created {rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{rule.triggerEvent}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', fontWeight: '600' }}>
                        {ACTIONS.find(a => a.id === rule.actionType)?.name || rule.actionType}
                      </span>
                      {rule.actionConfig?.templateName && (
                        <div style={{ fontSize: '11px', color: 'var(--accent, #1677ff)' }}>
                          Template: {rule.actionConfig.templateName}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {rule.executionCount || 0}
                    </td>
                    <td>
                      <span className={`status-tag ${rule.status}`}>
                        {rule.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          disabled={togglingId === rule._id}
                          onClick={() => handleToggle(rule._id)}
                          title={rule.status === 'active' ? 'Pause Rule' : 'Activate Rule'}
                        >
                          {rule.status === 'active' ? <FaToggleOn style={{ color: '#16a36a', fontSize: '16px' }} /> : <FaToggleOff style={{ color: '#98a2b3', fontSize: '16px' }} />}
                        </button>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleDelete(rule._id)}
                          title="Delete Rule"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showModal && (
        <div className="modal-backdrop-saas" onClick={() => setShowModal(false)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()}>
            <div className="modal-header-saas">
              <h3><FaPlus style={{ color: 'var(--accent, #1677ff)' }} /> Create Automation Rule</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body-saas">
                {formError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-group-saas">
                  <label>Rule Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Instant Lead Welcome Notification" 
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-saas">
                  <label>Trigger Event *</label>
                  <select 
                    value={triggerEvent} 
                    onChange={e => setTriggerEvent(e.target.value)}
                  >
                    {TRIGGERS.map(t => (
                      <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-saas">
                  <label>Filter Condition (Optional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Field (e.g. phone)" 
                      value={conditionField}
                      onChange={e => setConditionField(e.target.value)}
                    />
                    <select 
                      value={conditionOperator} 
                      onChange={e => setConditionOperator(e.target.value)}
                    >
                      <option value="is_not_empty">Is Not Empty</option>
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater Than</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Value" 
                      value={conditionValue}
                      onChange={e => setConditionValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group-saas">
                  <label>Action to Execute *</label>
                  <select 
                    value={actionType} 
                    onChange={e => setActionType(e.target.value)}
                  >
                    {ACTIONS.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {actionType === 'send_whatsapp_template' && (
                  <div className="form-group-saas">
                    <label>Meta-Approved Template Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. lead_welcome_v1 or order_confirmation_v1" 
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      required
                    />
                    <span className="form-hint">Make sure this template is approved in WhatsApp Templates page</span>
                  </div>
                )}
              </div>

              <div className="modal-footer-saas">
                <button 
                  type="button" 
                  className="quick-action-btn" 
                  onClick={() => setShowModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="quick-action-btn primary" 
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : 'Save & Activate Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomationRules;
