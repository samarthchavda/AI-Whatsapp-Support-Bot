import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlug, 
  FaPlus, 
  FaSync, 
  FaTimesCircle, 
  FaExchangeAlt, 
  FaCog, 
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';
import { 
  getCrmConnections, 
  createCrmConnection, 
  testCrmConnection, 
  disconnectCrmConnection 
} from '../../../services/api';
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './IntegrationDashboard.css';

const PROVIDERS = [
  { id: 'odoo', name: 'Odoo ERP / CRM', icon: '🟣', defaultAuth: 'api_key', desc: 'Connect Odoo XML-RPC / REST API for leads and sales orders' },
  { id: 'zoho', name: 'Zoho CRM', icon: '🟡', defaultAuth: 'oauth2', desc: 'Sync Zoho CRM contacts, deals, and automated workflows' },
  { id: 'hubspot', name: 'HubSpot CRM', icon: '🟠', defaultAuth: 'api_key', desc: 'Connect HubSpot private app token for contacts and deals' },
  { id: 'salesforce', name: 'Salesforce', icon: '🔵', defaultAuth: 'oauth2', desc: 'Connect Salesforce REST API for enterprise lead tracking' },
  { id: 'custom_api', name: 'Custom CRM / Webhook', icon: '⚡', defaultAuth: 'api_key', desc: 'Generic REST API endpoint integration with HMAC or Bearer auth' }
];

function CRMConnections() {
  const { usageLimits, getUsageLimit } = useEffectiveAccess();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: 'odoo',
    displayName: '',
    baseUrl: '',
    databaseName: '',
    tenantIdentifier: '',
    authType: 'api_key',
    apiKey: '',
    username: '',
    password: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const maxConnections = getUsageLimit('maxCrmConnections') || usageLimits?.maxCrmConnections || 1;

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCrmConnections();
      if (res.data && res.data.success) {
        setConnections(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to load CRM connections');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to fetch CRM connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleTestConnection = async (id) => {
    try {
      setTestingId(id);
      const res = await testCrmConnection(id);
      if (res.data && res.data.success) {
        alert(`Connection test passed: ${res.data.message || 'CRM endpoint is reachable and authenticated.'}`);
        fetchConnections();
      } else {
        alert(`Connection test failed: ${res.data?.error || 'CRM unreachable'}`);
      }
    } catch (err) {
      alert(`Connection test failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this CRM integration?')) return;
    try {
      setDisconnectingId(id);
      const res = await disconnectCrmConnection(id);
      if (res.data && res.data.success) {
        alert('CRM connection disconnected successfully');
        fetchConnections();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to disconnect connection');
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.baseUrl.trim()) {
      setFormError('Display Name and Base URL are required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const credentials = {};
      if (formData.authType === 'api_key') {
        credentials.apiKey = formData.apiKey;
      } else if (formData.authType === 'basic_auth' || formData.authType === 'username_password') {
        credentials.username = formData.username;
        credentials.password = formData.password;
      } else {
        credentials.apiKey = formData.apiKey;
      }

      const payload = {
        provider: formData.provider,
        displayName: formData.displayName,
        baseUrl: formData.baseUrl,
        databaseName: formData.databaseName || undefined,
        tenantIdentifier: formData.tenantIdentifier || undefined,
        credentials,
        configuration: {
          authType: formData.authType
        }
      };

      const res = await createCrmConnection(payload);
      if (res.data && res.data.success) {
        setShowAddModal(false);
        setFormData({
          provider: 'odoo',
          displayName: '',
          baseUrl: '',
          databaseName: '',
          tenantIdentifier: '',
          authType: 'api_key',
          apiKey: '',
          username: '',
          password: ''
        });
        fetchConnections();
      } else {
        setFormError(res.data?.error || 'Failed to create connection');
      }
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save connection');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="integration-container">
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge">
            <FaPlug /> Connected CRM Systems
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>CRM Connections Manager</h1>
              <p>Configure endpoint URLs, authentication credentials, and monitor sync status.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={fetchConnections} disabled={loading}>
                <FaSync className={loading ? 'spin' : ''} /> Refresh
              </button>
              <button 
                className="quick-action-btn primary" 
                onClick={() => setShowAddModal(true)}
                disabled={connections.length >= maxConnections}
              >
                <FaPlus /> Add CRM Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan limit banner */}
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
          <strong>Plan Quota:</strong> You have configured <strong>{connections.length}</strong> of <strong>{maxConnections}</strong> allowed CRM connection{maxConnections !== 1 ? 's' : ''}.
        </span>
        {connections.length >= maxConnections && (
          <Link to="/dashboard/billing" style={{ color: 'var(--accent, #1677ff)', fontWeight: '600', textDecoration: 'none' }}>
            Upgrade for more connections &rarr;
          </Link>
        )}
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
          <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading your CRM connections...</span>
        </div>
      ) : connections.length === 0 ? (
        <div className="integration-section-card">
          <div className="empty-state-card">
            <FaPlug className="empty-state-icon" />
            <h4>No CRM Connections Configured</h4>
            <p>Connect your first CRM system (Odoo, HubSpot, Zoho, Salesforce, or Custom API) to begin streaming leads and automated WhatsApp notifications.</p>
            <button className="quick-action-btn primary" onClick={() => setShowAddModal(true)}>
              <FaPlus /> Connect New CRM
            </button>
          </div>
        </div>
      ) : (
        <div className="integration-section-card">
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Provider / Name</th>
                  <th>Base Endpoint</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => {
                  const providerObj = PROVIDERS.find(p => p.id === conn.provider) || { icon: '⚡', name: conn.provider };
                  return (
                    <tr key={conn._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{providerObj.icon}</span>
                          <div>
                            <div style={{ fontWeight: '700' }}>{conn.displayName}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #98a2b3)' }}>{providerObj.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px' }}>{conn.baseUrl}</code>
                        {conn.databaseName && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)' }}>DB: {conn.databaseName}</div>
                        )}
                      </td>
                      <td>
                        <span className={`status-tag ${conn.status}`}>
                          {conn.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary, #667085)', fontSize: '12px' }}>
                        {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : 'Never synced'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            className="quick-action-btn" 
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            disabled={testingId === conn._id}
                            onClick={() => handleTestConnection(conn._id)}
                            title="Test connection reachability"
                          >
                            <FaSync className={testingId === conn._id ? 'spin' : ''} /> Test
                          </button>
                          <Link 
                            to={`/dashboard/integration/field-mapping?connectionId=${conn._id}`} 
                            className="quick-action-btn" 
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="Configure Field Mappings"
                          >
                            <FaExchangeAlt /> Fields
                          </Link>
                          <Link 
                            to={`/dashboard/integration/connections/${conn._id}`} 
                            className="quick-action-btn" 
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="View / Edit Connection Details"
                          >
                            <FaCog /> Edit
                          </Link>
                          {conn.status === 'connected' && (
                            <button 
                              className="quick-action-btn" 
                              style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                              disabled={disconnectingId === conn._id}
                              onClick={() => handleDisconnect(conn._id)}
                              title="Disconnect Connection"
                            >
                              <FaTimesCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="modal-backdrop-saas" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()}>
            <div className="modal-header-saas">
              <h3><FaPlus style={{ color: 'var(--accent, #1677ff)' }} /> Connect New CRM System</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} autoComplete="off" data-lpignore="true">
              {/* Dummy hidden inputs to prevent Chrome password manager from autofilling user credentials */}
              <input type="text" name="crm_autofill_honeypot_user" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
              <input type="password" name="crm_autofill_honeypot_pass" style={{ display: 'none' }} tabIndex="-1" autoComplete="new-password" />

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
                  <label>CRM / ERP Provider</label>
                  <select 
                    value={formData.provider} 
                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
                  <span className="form-hint">
                    {PROVIDERS.find(p => p.id === formData.provider)?.desc}
                  </span>
                </div>

                <div className="form-group-saas">
                  <label>Display Name *</label>
                  <input 
                    type="text"
                    name="crm_connection_display_name"
                    placeholder="e.g. Production Odoo 16 CRM" 
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                    required
                  />
                </div>

                <div className="form-group-saas">
                  <label>CRM Base URL *</label>
                  <input 
                    type="url" 
                    name="crm_connection_base_url"
                    placeholder="https://mycompany.odoo.com or https://api.crm.com" 
                    value={formData.baseUrl}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                    required
                  />
                  <span className="form-hint">Must be a secure public HTTPS endpoint (SSRF protected)</span>
                </div>

                {formData.provider === 'odoo' && (
                  <div className="form-group-saas">
                    <label>Odoo Database Name</label>
                    <input 
                      type="text"
                      name="crm_odoo_database_name"
                      placeholder="e.g. odoo_production_db" 
                      value={formData.databaseName}
                      onChange={e => setFormData({ ...formData, databaseName: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                )}

                <div className="form-group-saas">
                  <label>Authentication Method</label>
                  <select 
                    value={formData.authType}
                    onChange={e => setFormData({ ...formData, authType: e.target.value })}
                  >
                    <option value="api_key">API Key / Secret Token</option>
                    <option value="basic_auth">Username & Password / Basic Auth</option>
                    <option value="oauth2">OAuth2 Token / Private App Token</option>
                  </select>
                </div>

                {formData.authType === 'basic_auth' ? (
                  <>
                    <div className="form-group-saas">
                      <label>Username / Email</label>
                      <input 
                        type="text" 
                        name="crm_custom_auth_username"
                        placeholder="admin@example.com" 
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>
                    <div className="form-group-saas">
                      <label>Password / User API Key</label>
                      <input 
                        type="password" 
                        name="crm_custom_auth_password"
                        placeholder="••••••••••••" 
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group-saas">
                    <label>Secret API Key / Bearer Token</label>
                    <input 
                      type="password" 
                      name="crm_custom_api_key_secret"
                      placeholder="Enter secret key or token..." 
                      value={formData.apiKey}
                      onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <span className="form-hint">Stored securely using AES-256 encryption</span>
                  </div>
                )}
              </div>

              <div className="modal-footer-saas">
                <button 
                  type="button" 
                  className="quick-action-btn" 
                  onClick={() => setShowAddModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="quick-action-btn primary" 
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : 'Save & Verify Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRMConnections;
