import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaSync, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaExchangeAlt, 
  FaSave,
  FaTimesCircle
} from 'react-icons/fa';
import { 
  getCrmConnectionById, 
  updateCrmConnection, 
  testCrmConnection, 
  disconnectCrmConnection,
  getFieldMappings
} from '../../../services/api';
import './IntegrationDashboard.css';

function CRMConnectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [connection, setConnection] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [tenantIdentifier, setTenantIdentifier] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [connRes, mapRes] = await Promise.all([
        getCrmConnectionById(id),
        getFieldMappings(id).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      if (connRes.data && connRes.data.success) {
        const conn = connRes.data.data;
        setConnection(conn);
        setDisplayName(conn.displayName || '');
        setBaseUrl(conn.baseUrl || '');
        setDatabaseName(conn.databaseName || '');
        setTenantIdentifier(conn.tenantIdentifier || '');
      } else {
        setError(connRes.data?.error || 'Connection not found');
      }

      if (mapRes.data && mapRes.data.success) {
        setMappings(mapRes.data.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load connection details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const payload = {
        displayName,
        baseUrl,
        databaseName: databaseName || undefined,
        tenantIdentifier: tenantIdentifier || undefined
      };

      if (newApiKey.trim()) {
        payload.credentials = { apiKey: newApiKey.trim() };
      }

      const res = await updateCrmConnection(id, payload);
      if (res.data && res.data.success) {
        setSaveSuccess(true);
        setNewApiKey('');
        loadData();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(res.data?.error || 'Failed to update connection');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update connection');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await testCrmConnection(id);
      if (res.data && res.data.success) {
        alert('Connection test successful! CRM is responding normally.');
        loadData();
      } else {
        alert(`Test failed: ${res.data?.error || 'Unreachable'}`);
      }
    } catch (err) {
      alert(`Test error: ${err?.response?.data?.error || err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this connection?')) return;
    try {
      const res = await disconnectCrmConnection(id);
      if (res.data && res.data.success) {
        alert('Connection disconnected');
        loadData();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="integration-container" style={{ padding: '60px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading connection settings...</span>
      </div>
    );
  }

  if (error && !connection) {
    return (
      <div className="integration-container">
        <div className="integration-section-card">
          <div className="empty-state-card">
            <FaExclamationTriangle className="empty-state-icon" style={{ color: '#ef4444' }} />
            <h4>Connection Not Found</h4>
            <p>{error}</p>
            <button className="quick-action-btn" onClick={() => navigate('/dashboard/integration/connections')}>
              <FaArrowLeft /> Back to Connections
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <button 
            className="quick-action-btn" 
            onClick={() => navigate('/dashboard/integration/connections')}
            style={{ width: 'fit-content', marginBottom: '8px' }}
          >
            <FaArrowLeft /> Back to CRM Connections
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>{connection?.displayName}</h1>
              <p>Provider: <strong>{connection?.provider?.toUpperCase()}</strong> &bull; Status: <span className={`status-tag ${connection?.status}`}>{connection?.status}</span></p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={handleTest} disabled={testing}>
                <FaSync className={testing ? 'spin' : ''} /> Test Connection
              </button>
              {connection?.status === 'connected' && (
                <button 
                  className="quick-action-btn" 
                  style={{ color: '#ef4444', borderColor: '#ef4444' }} 
                  onClick={handleDisconnect}
                >
                  <FaTimesCircle /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          background: 'rgba(22, 163, 106, 0.12)',
          border: '1px solid rgba(22, 163, 106, 0.3)',
          color: '#16a36a',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaCheckCircle /> Connection settings updated successfully!
        </div>
      )}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: '24px' }}>
        {/* Main Settings Form */}
        <div className="integration-section-card">
          <div className="section-header-row">
            <div className="section-title-group">
              <h2>Connection Configuration</h2>
              <p>Update endpoint URLs and authentication credentials</p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group-saas">
              <label>Display Name *</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group-saas">
              <label>Base URL *</label>
              <input 
                type="url" 
                value={baseUrl} 
                onChange={e => setBaseUrl(e.target.value)} 
                required 
              />
            </div>

            {connection?.provider === 'odoo' && (
              <div className="form-group-saas">
                <label>Odoo Database Name</label>
                <input 
                  type="text" 
                  value={databaseName} 
                  onChange={e => setDatabaseName(e.target.value)} 
                />
              </div>
            )}

            <div className="form-group-saas">
              <label>Tenant / Account Identifier</label>
              <input 
                type="text" 
                value={tenantIdentifier} 
                onChange={e => setTenantIdentifier(e.target.value)} 
              />
            </div>

            <div className="form-group-saas">
              <label>Update Secret API Key / Token</label>
              <input 
                type="password" 
                placeholder="Leave blank to keep existing encrypted secret" 
                value={newApiKey}
                onChange={e => setNewApiKey(e.target.value)}
              />
              <span className="form-hint">For security, existing credentials are encrypted with AES-256 and never sent back in plaintext.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="quick-action-btn primary" disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info & Associated Mappings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="integration-section-card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Connection Metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Provider:</span>
                <span style={{ fontWeight: '600' }}>{connection?.provider}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Status:</span>
                <span className={`status-tag ${connection?.status}`}>{connection?.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Last Sync:</span>
                <span>{connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Created:</span>
                <span>{connection?.createdAt ? new Date(connection.createdAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>

          <div className="integration-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Field Mappings ({mappings.length})</h3>
              <Link 
                to={`/dashboard/integration/field-mapping?connectionId=${id}`} 
                className="quick-action-btn" 
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                <FaExchangeAlt /> Manage
              </Link>
            </div>

            {mappings.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #667085)', margin: 0 }}>
                No field mappings configured for this connection yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mappings.slice(0, 4).map((m) => (
                  <div key={m._id} style={{
                    padding: '8px 10px',
                    background: 'var(--bg-input, #f8fafc)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: '600' }}>{m.entityType}</span>
                    <span style={{ color: 'var(--text-muted, #98a2b3)' }}>{m.mappings?.length || 0} fields</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CRMConnectionDetail;
