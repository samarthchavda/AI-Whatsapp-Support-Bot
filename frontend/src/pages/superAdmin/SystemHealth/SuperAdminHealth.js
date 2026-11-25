import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaArrowRight } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminHealth.css';

function SuperAdminHealth() {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const fetchHealthData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get('/super-admin/system-health');
      if (res.data?.success) {
        setHealthData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData(false);
  }, [fetchHealthData]);

  if (loading && !healthData) {
    return (
      <div className="health-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const { system = {}, services = {}, serviceDetails, recentErrors = [] } = healthData || {};

  const rows = Array.isArray(serviceDetails) && serviceDetails.length > 0
    ? serviceDetails
    : [
        {
          key: 'mongodb',
          name: 'MongoDB Database',
          status: services.mongodb === 'Operational' ? 'Connected' : 'Down',
          healthy: services.mongodb === 'Operational',
          detail: services.mongodb === 'Operational' ? 'Primary database reachable' : 'Database connection down'
        },
        {
          key: 'gemini',
          name: 'AI / Gemini',
          status: services.gemini === 'Operational' ? 'Configured' : 'Not configured',
          healthy: services.gemini === 'Operational',
          detail: 'Manage key or run live test in Settings',
          settingsTab: 'ai'
        },
        {
          key: 'meta',
          name: 'Meta & WhatsApp',
          status: services.whatsapp === 'Operational' ? 'App Ready' : 'Not configured',
          healthy: services.whatsapp === 'Operational',
          detail: `${services.merchantsConnected || 0} of ${services.merchantsTotal || 0} merchants connected`,
          settingsTab: 'meta'
        }
      ];

  return (
    <div className="health-page">
      <header className="health-header">
        <div>
          <div className="health-breadcrumb">Super Admin / System Health</div>
          <h1 className="health-title">System Health</h1>
          <p className="health-subtitle">
            Server status, configured integrations, and failed webhook or WhatsApp deliveries.
          </p>
        </div>

        <div className="health-header-actions">
          <button
            type="button"
            className="health-btn-secondary"
            onClick={() => fetchHealthData(true)}
            disabled={refreshing}
          >
            <FaSyncAlt />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="health-btn-secondary"
            onClick={() => navigate('/dashboard/super-admin/settings')}
          >
            Integrations
            <FaArrowRight />
          </button>
        </div>
      </header>

      {error && (
        <div className="health-error-banner">
          <span>{error}</span>
          <button type="button" className="health-btn-secondary" onClick={() => fetchHealthData(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Single unified Server + Platform Services Panel */}
      <section className="health-panel">
        <div className="health-metrics-strip">
          <div className="health-metric">
            <span className="health-metric-label">API Server</span>
            <span className="health-metric-value">
              <span className="health-dot ok" />
              {system.backendStatus === 'Operational' ? 'Online' : system.backendStatus || 'Unknown'}
            </span>
            <span className="health-metric-sub">Uptime: {system.uptime || '0m'}</span>
          </div>

          <div className="health-metric">
            <span className="health-metric-label">Database</span>
            <span className="health-metric-value">
              <span className={`health-dot ${system.databaseStatus === 'Operational' ? 'ok' : 'bad'}`} />
              {system.databaseStatus === 'Operational' ? 'Connected' : 'Down'}
            </span>
            <span className="health-metric-sub">MongoDB</span>
          </div>

          <div className="health-metric">
            <span className="health-metric-label">CPU Load</span>
            <span className="health-metric-value">{system.cpuUsage || '0%'}</span>
            <span className="health-metric-sub">PID {system.pid || '—'}</span>
          </div>

          <div className="health-metric">
            <span className="health-metric-label">Memory</span>
            <span className="health-metric-value">{system.memoryUsage || '0 MB'}</span>
            <span className="health-metric-sub">{system.systemMemory || ''}</span>
          </div>
        </div>

        <div className="health-panel-subhead">
          <h2 className="health-section-title">Platform services</h2>
          <button
            type="button"
            className="health-link"
            onClick={() => navigate('/dashboard/super-admin/integration-health')}
          >
            Merchant store sync ({services.shopifyCount || 0} Shopify, {services.wooCount || 0} WooCommerce)
            <FaArrowRight />
          </button>
        </div>

        <div className="health-rows">
          {rows.map((row) => (
            <div className="health-row" key={row.key}>
              <div className="health-row-name">{row.name}</div>
              <div className="health-row-detail">
                {row.detail}
                {row.source === 'db' ? ' · Saved in DB' : row.source === 'env' ? ' · Via .env' : ''}
              </div>
              <div className={`health-row-status${row.healthy ? '' : ' bad'}`}>
                <span className={`health-dot ${row.healthy ? 'ok' : 'bad'}`} />
                {row.status}
              </div>
              <div className="health-row-action">
                {row.settingsTab && (
                  <button
                    type="button"
                    className="health-link"
                    onClick={() => navigate(`/dashboard/super-admin/settings#${row.settingsTab}`)}
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Errors Panel */}
      <section className="health-panel">
        <div className="health-panel-subhead">
          <h2 className="health-section-title">Recent system and webhook errors</h2>
        </div>

        {recentErrors.length === 0 ? (
          <div className="health-empty">
            No failed webhook or WhatsApp delivery errors recorded.
          </div>
        ) : (
          <div className="health-table-wrap">
            <table className="health-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Event</th>
                  <th>Order ID</th>
                  <th>Failure reason</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((errItem) => (
                  <tr key={errItem._id}>
                    <td>{String(errItem.source || '').toUpperCase()}</td>
                    <td className="health-mono">{errItem.eventType}</td>
                    <td className="health-mono">{errItem.externalOrderId}</td>
                    <td className="health-err-text">{errItem.error}</td>
                    <td className="health-mono">{new Date(errItem.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default SuperAdminHealth;
