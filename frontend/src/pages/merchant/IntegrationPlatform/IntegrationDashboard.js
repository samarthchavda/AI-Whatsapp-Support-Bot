import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlug, 
  FaNetworkWired, 
  FaExchangeAlt, 
  FaCogs, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaSync, 
  FaPlus,
  FaArrowRight,
  FaHistory
} from 'react-icons/fa';
import { getIntegrationOverview, retryIntegrationEvent } from '../../../services/api';
import './IntegrationDashboard.css';

function IntegrationDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIntegrationOverview();
      if (res.data && res.data.success) {
        setOverview(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to load overview data');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to connect to integration service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRetry = async (eventId) => {
    try {
      setRetryingId(eventId);
      const res = await retryIntegrationEvent(eventId);
      if (res.data && res.data.success) {
        alert('Event re-queued for processing successfully');
        fetchOverview();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to retry event');
    } finally {
      setRetryingId(null);
    }
  };

  const summary = overview?.summary || {
    totalConnections: 0,
    activeConnections: 0,
    totalAutomations: 0,
    activeAutomations: 0,
    totalFieldMappings: 0,
    failedEventsCount: 0
  };

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge">
            <FaNetworkWired /> CRM Integration Hub
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>CRM & Business System Integration</h1>
              <p>Connect your CRM (Odoo, Zoho, HubSpot, Salesforce) with Kwickbot WhatsApp automations in real-time.</p>
            </div>
            <button className="quick-action-btn" onClick={fetchOverview} disabled={loading}>
              <FaSync className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
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

      {/* Overview Stat Cards */}
      <div className="integration-stats-grid">
        <div className="stat-card-saas">
          <div className="stat-icon-wrapper blue">
            <FaPlug />
          </div>
          <div className="stat-info">
            <span className="stat-label">CRM Connections</span>
            <span className="stat-val">{summary.activeConnections} / {summary.totalConnections}</span>
            <span className="stat-sub">Active / Configured</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper green">
            <FaCogs />
          </div>
          <div className="stat-info">
            <span className="stat-label">Automation Rules</span>
            <span className="stat-val">{summary.activeAutomations} / {summary.totalAutomations}</span>
            <span className="stat-sub">Active triggers running</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper purple">
            <FaExchangeAlt />
          </div>
          <div className="stat-info">
            <span className="stat-label">Field Mappings</span>
            <span className="stat-val">{summary.totalFieldMappings}</span>
            <span className="stat-sub">Active field transformations</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper red">
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Failed Events Queue</span>
            <span className="stat-val">{summary.failedEventsCount}</span>
            <span className="stat-sub">{summary.failedEventsCount > 0 ? 'Action needed' : 'All clear'}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="integration-quick-actions">
        <Link to="/dashboard/integration/connections" className="quick-action-btn primary">
          <FaPlus /> Connect New CRM
        </Link>
        <Link to="/dashboard/integration/field-mapping" className="quick-action-btn">
          <FaExchangeAlt /> Field Mapping
        </Link>
        <Link to="/dashboard/integration/automations" className="quick-action-btn">
          <FaCogs /> Automation Rules
        </Link>
        <Link to="/dashboard/integration/failed-events" className="quick-action-btn">
          <FaExclamationTriangle style={{ color: summary.failedEventsCount > 0 ? '#ef4444' : 'inherit' }} /> Failed Events ({summary.failedEventsCount})
        </Link>
        <Link to="/dashboard/integration/logs" className="quick-action-btn">
          <FaHistory /> Integration Logs
        </Link>
      </div>

      {/* Supported Providers */}
      <div className="integration-section-card">
        <div className="section-header-row">
          <div className="section-title-group">
            <h2>Supported CRM & ERP Platforms</h2>
            <p>Ready-to-integrate enterprise connectors and generic webhook ingestion</p>
          </div>
          <Link to="/dashboard/integration/connections" className="quick-action-btn" style={{ fontSize: '12px' }}>
            Manage Connections <FaArrowRight />
          </Link>
        </div>

        <div className="providers-grid">
          <div className="provider-card">
            <div className="provider-icon-box">🟣</div>
            <div className="provider-name">Odoo ERP / CRM</div>
            <span className="provider-badge ready">Supported</span>
          </div>
          <div className="provider-card">
            <div className="provider-icon-box">🟠</div>
            <div className="provider-name">HubSpot CRM</div>
            <span className="provider-badge ready">Supported</span>
          </div>
          <div className="provider-card">
            <div className="provider-icon-box">🟡</div>
            <div className="provider-name">Zoho CRM</div>
            <span className="provider-badge ready">Supported</span>
          </div>
          <div className="provider-card">
            <div className="provider-icon-box">🔵</div>
            <div className="provider-name">Salesforce</div>
            <span className="provider-badge ready">Supported</span>
          </div>
          <div className="provider-card">
            <div className="provider-icon-box">⚡</div>
            <div className="provider-name">Custom API / Webhook</div>
            <span className="provider-badge generic">Universal</span>
          </div>
        </div>
      </div>

      {/* Recent Integration Events Table */}
      <div className="integration-section-card">
        <div className="section-header-row">
          <div className="section-title-group">
            <h2>Recent Event Activity</h2>
            <p>Live audit trail of bidirectional CRM events and WhatsApp triggers</p>
          </div>
          <Link to="/dashboard/integration/logs" className="quick-action-btn" style={{ fontSize: '12px' }}>
            View All Logs <FaArrowRight />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <span style={{ color: 'var(--text-secondary, #667085)', fontSize: '13px' }}>Loading integration events...</span>
          </div>
        ) : !overview?.recentEvents || overview.recentEvents.length === 0 ? (
          <div className="empty-state-card">
            <FaCheckCircle className="empty-state-icon" style={{ color: '#16a36a' }} />
            <h4>No Recent Events Recorded</h4>
            <p>When your CRM sends webhooks or automations trigger WhatsApp messages, live event logs will show up here.</p>
            <Link to="/dashboard/integration/connections" className="quick-action-btn primary">
              <FaPlus /> Connect Your First CRM
            </Link>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentEvents.map((evt) => (
                  <tr key={evt._id}>
                    <td>
                      <code style={{ fontSize: '12px', fontWeight: '600' }}>{evt.eventType || 'generic.event'}</code>
                    </td>
                    <td>{evt.sourceProvider || 'crm'}</td>
                    <td>{evt.destination || 'whatsapp'}</td>
                    <td>
                      <span className={`status-tag ${evt.status}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary, #667085)', fontSize: '12.5px' }}>
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      {evt.status === 'failed' || evt.status === 'dead_letter' ? (
                        <button 
                          className="quick-action-btn" 
                          style={{ padding: '4px 10px', fontSize: '11px', color: '#ef4444', borderColor: '#ef4444' }}
                          disabled={retryingId === evt._id}
                          onClick={() => handleRetry(evt._id)}
                        >
                          <FaSync className={retryingId === evt._id ? 'spin' : ''} /> Retry
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #98a2b3)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default IntegrationDashboard;
