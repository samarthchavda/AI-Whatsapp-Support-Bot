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
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './IntegrationDashboard.css';

const PROVIDERS = [
  { id: 'odoo', mark: 'O', name: 'Odoo ERP / CRM', detail: 'Leads, contacts and sales orders', tone: 'violet' },
  { id: 'hubspot', mark: 'H', name: 'HubSpot CRM', detail: 'Private app contacts and deals', tone: 'orange' },
  { id: 'zoho', mark: 'Z', name: 'Zoho CRM', detail: 'Contacts, deals and workflows', tone: 'amber' },
  { id: 'salesforce', mark: 'S', name: 'Salesforce', detail: 'REST API lead synchronization', tone: 'blue' },
  { id: 'custom_api', mark: 'API', name: 'Custom API / Webhook', detail: 'Generic REST and webhook bridge', tone: 'cyan' }
];

function IntegrationDashboard() {
  const { canViewPage, hasPermission, subscription, usageLimits } = useEffectiveAccess();
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

  const canUseAutomations = canViewPage('automation-rules');
  const canUseFailedEvents = canViewPage('failed-events');
  const canViewLogs = canViewPage('integration-logs');
  const canRetryEvents = hasPermission('failedEvents.retry');
  const recentEventCount = overview?.recentEvents?.length || 0;
  const maxConnections = usageLimits?.maxCrmConnections;

  const statCards = [
    {
      key: 'connections',
      icon: <FaPlug />,
      tone: 'blue',
      label: 'CRM Connections',
      value: `${summary.activeConnections} / ${summary.totalConnections}`,
      sub: `Active / Configured${maxConnections > 0 ? ` · Limit ${maxConnections}` : ''}`
    },
    {
      key: 'mappings',
      icon: <FaExchangeAlt />,
      tone: 'purple',
      label: 'Field Mappings',
      value: summary.totalFieldMappings,
      sub: 'Active data transformations'
    },
    ...(canUseAutomations ? [{
      key: 'automations',
      icon: <FaCogs />,
      tone: 'green',
      label: 'Automation Rules',
      value: `${summary.activeAutomations} / ${summary.totalAutomations}`,
      sub: 'Active triggers running'
    }] : []),
    ...(canUseFailedEvents ? [{
      key: 'failed',
      icon: <FaExclamationTriangle />,
      tone: 'red',
      label: 'Failed Events Queue',
      value: summary.failedEventsCount,
      sub: summary.failedEventsCount > 0 ? 'Action needed' : 'All clear'
    }] : []),
    ...(canViewLogs && !canUseFailedEvents ? [{
      key: 'events',
      icon: <FaHistory />,
      tone: 'green',
      label: 'Recent Events',
      value: recentEventCount,
      sub: 'Latest sync activity loaded'
    }] : [])
  ];

  const setupSteps = [
    { number: 1, title: 'Connect CRM', text: 'Add endpoint and credentials', complete: summary.totalConnections > 0 },
    { number: 2, title: 'Map Fields', text: 'Match leads, contacts and orders', complete: summary.totalFieldMappings > 0 },
    { number: 3, title: 'Verify Sync', text: 'Test connection and review logs', complete: recentEventCount > 0 }
  ];

  return (
    <div className="integration-container">
      <section className="integration-hero">
        <div className="integration-hero-copy">
          <div className="integration-hero-meta">
            <span className="integration-badge"><FaNetworkWired /> CRM Integration Hub</span>
            <span className="integration-plan-chip">
              <span className="integration-plan-dot" />
              {subscription?.planName || 'CRM Integration'} · {subscription?.status || 'active'}
            </span>
          </div>
          <h1>Connect your CRM to WhatsApp</h1>
          <p>Sync leads, contacts and customer events between your business system and Kwickbot from one secure workspace.</p>
          <div className="integration-hero-actions">
            <Link to="/dashboard/integration/connections" className="quick-action-btn primary">
              <FaPlus /> Connect New CRM
            </Link>
            <button className="quick-action-btn" onClick={fetchOverview} disabled={loading}>
              <FaSync className={loading ? 'spin' : ''} /> Refresh data
            </button>
          </div>
        </div>

        <div className="integration-setup-panel">
          <div className="integration-setup-heading">
            <div>
              <span>Getting started</span>
              <strong>Integration setup</strong>
            </div>
            <span className="integration-step-count">{setupSteps.filter(step => step.complete).length}/3</span>
          </div>
          <div className="integration-setup-list">
            {setupSteps.map((step) => (
              <div key={step.number} className={`integration-setup-step${step.complete ? ' complete' : ''}`}>
                <span className="integration-step-number">{step.complete ? <FaCheckCircle /> : step.number}</span>
                <div><strong>{step.title}</strong><span>{step.text}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="integration-error-banner">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="integration-stats-grid">
        {statCards.map((card) => (
          <div className="stat-card-saas" key={card.key}>
            <div className={`stat-icon-wrapper ${card.tone}`}>{card.icon}</div>
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <span className="stat-val">{card.value}</span>
              <span className="stat-sub">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="integration-quick-actions">
        <Link to="/dashboard/integration/field-mapping" className="quick-action-btn">
          <FaExchangeAlt /> Field Mapping
        </Link>
        {canUseAutomations && (
          <Link to="/dashboard/integration/automations" className="quick-action-btn"><FaCogs /> Automation Rules</Link>
        )}
        {canUseFailedEvents && (
          <Link to="/dashboard/integration/failed-events" className="quick-action-btn">
            <FaExclamationTriangle style={{ color: summary.failedEventsCount > 0 ? '#ef4444' : 'inherit' }} /> Failed Events ({summary.failedEventsCount})
          </Link>
        )}
        {canViewLogs && (
          <Link to="/dashboard/integration/logs" className="quick-action-btn"><FaHistory /> Integration Logs</Link>
        )}
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
          {PROVIDERS.map((provider) => (
            <div className="provider-card" key={provider.id}>
              <div className={`provider-icon-box ${provider.tone}`}>{provider.mark}</div>
              <div className="provider-copy">
                <div className="provider-name">{provider.name}</div>
                <div className="provider-detail">{provider.detail}</div>
              </div>
              <span className={`provider-badge ${provider.id === 'custom_api' ? 'generic' : 'ready'}`}>
                {provider.id === 'custom_api' ? 'Universal' : 'Available'}
              </span>
            </div>
          ))}
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
                      {(evt.status === 'failed' || evt.status === 'dead_letter') && canRetryEvents ? (
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
