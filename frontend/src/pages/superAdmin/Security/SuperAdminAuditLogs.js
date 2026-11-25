import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaShieldAlt,
  FaSearch,
  FaEye,
  FaSync,
  FaCrown,
  FaUser,
  FaCog,
  FaFileAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminAuditLogs.css';

const PANEL_LABELS = {
  all: 'All Panels',
  super_admin: 'Super Admin Panel',
  admin: 'Admin Panel',
  system: 'System & Security'
};

const PANEL_PILL_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin Panel',
  system: 'System'
};

function SuperAdminAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPanel = searchParams.get('panel') || 'all';
  const activePanel = ['all', 'super_admin', 'admin', 'system'].includes(initialPanel)
    ? initialPanel
    : 'all';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogsData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const response = await api.get('/super-admin/audit-logs');
      setData(response.data?.data || null);
    } catch (err) {
      console.error('Error fetching Audit Logs data:', err);
      setError(err.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogsData(false);
  }, [fetchAuditLogsData]);

  const handleSelectPanel = (panelKey) => {
    setActionFilter('');
    if (panelKey === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ panel: panelKey });
    }
  };

  const allLogs = useMemo(() => data?.logs || [], [data]);
  const summary = data?.summary || {};

  const panelLogs = useMemo(() => {
    if (activePanel === 'all') return allLogs;
    return allLogs.filter((log) => log.panel === activePanel);
  }, [allLogs, activePanel]);

  const actionTypes = useMemo(() => {
    const set = new Set();
    panelLogs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [panelLogs]);

  const filteredLogs = useMemo(() => {
    let result = panelLogs;
    if (actionFilter) {
      result = result.filter((log) => log.action === actionFilter);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (log) =>
          (log.actorName || '').toLowerCase().includes(q) ||
          (log.actorEmail || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.target || '').toLowerCase().includes(q) ||
          (log.ipAddress || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [panelLogs, actionFilter, searchQuery]);

  if (loading && !data) {
    return (
      <div className="audit-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <div className="audit-breadcrumb">
            Security / Audit Logs {activePanel !== 'all' ? `/ ${PANEL_LABELS[activePanel]}` : ''}
          </div>
          <h1 className="audit-title">Security Audit Logs</h1>
          <p className="audit-subtitle">
            Complete activity trail across Super Admin operations, Merchant Admin panel actions, and system security events.
          </p>
        </div>

        <button
          type="button"
          className="audit-refresh-btn"
          onClick={() => fetchAuditLogsData(true)}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="audit-error-box">
          <span><FaExclamationTriangle style={{ marginRight: '8px' }} />{error}</span>
          <button type="button" className="audit-refresh-btn" onClick={() => fetchAuditLogsData(false)}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="audit-panel">
          <div className="audit-summary-strip">
            <div className="audit-metric">
              <span className="audit-metric-label">Total logged events</span>
              <span className="audit-metric-value">{(summary.totalActivities || 0).toLocaleString()}</span>
              <span className="audit-metric-sub">Recent 500 activity records</span>
            </div>

            <div className="audit-metric">
              <span className="audit-metric-label">Super Admin panel</span>
              <span className="audit-metric-value">{(summary.superAdminActions || 0).toLocaleString()}</span>
              <span className="audit-metric-sub">Platform &amp; config updates</span>
            </div>

            <div className="audit-metric">
              <span className="audit-metric-label">Admin (Merchant) panel</span>
              <span className="audit-metric-value">{(summary.adminPanelActions || 0).toLocaleString()}</span>
              <span className="audit-metric-sub">Store &amp; merchant mutations</span>
            </div>

            <div className="audit-metric">
              <span className="audit-metric-label">Last 24 hours</span>
              <span className="audit-metric-value">{(summary.recentActivities || 0).toLocaleString()}</span>
              <span className="audit-metric-sub">{summary.systemActions || 0} system/security events</span>
            </div>
          </div>

          <div className="audit-panel-tabs" role="tablist">
            {[
              { key: 'all', label: `All Logs (${summary.totalActivities || 0})`, icon: <FaFileAlt /> },
              { key: 'super_admin', label: `Super Admin Panel (${summary.superAdminActions || 0})`, icon: <FaCrown /> },
              { key: 'admin', label: `Admin Panel (${summary.adminPanelActions || 0})`, icon: <FaUser /> },
              { key: 'system', label: `System & Security (${summary.systemActions || 0})`, icon: <FaCog /> }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`audit-panel-tab ${activePanel === tab.key ? 'active' : ''}`}
                onClick={() => handleSelectPanel(tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="audit-toolbar">
            <select
              className="audit-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions ({actionTypes.length})</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <div className="audit-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search actor, action, target, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Panel</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No audit logs found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div className="audit-actor-name">{log.actorName}</div>
                        <div className="audit-actor-email">{log.actorEmail}</div>
                      </td>
                      <td>
                        <span className={`audit-panel-pill ${log.panel || 'system'}`}>
                          {PANEL_PILL_LABELS[log.panel] || 'System'}
                        </span>
                      </td>
                      <td>
                        <span className="audit-action-code">{log.action}</span>
                      </td>
                      <td>
                        <span className="audit-target" title={log.target}>{log.target}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {log.ipAddress}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="audit-view-btn"
                          onClick={() => setSelectedLog(log)}
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="audit-modal-backdrop">
          <div className="audit-modal">
            <div className="audit-modal-head">
              <h3><FaShieldAlt style={{ marginRight: '8px', color: '#60a5fa' }} /> Audit Log Details</h3>
              <button type="button" className="audit-modal-close" onClick={() => setSelectedLog(null)}>
                ✕
              </button>
            </div>

            <div className="audit-modal-grid">
              <div className="audit-meta-item">
                <span>Actor</span>
                <strong>{selectedLog.actorName} ({selectedLog.actorEmail})</strong>
              </div>
              <div className="audit-meta-item">
                <span>Panel &amp; Role</span>
                <strong>{PANEL_PILL_LABELS[selectedLog.panel] || 'System'} · {selectedLog.actorRole || 'N/A'}</strong>
              </div>
              <div className="audit-meta-item">
                <span>Action</span>
                <strong className="audit-action-code">{selectedLog.action}</strong>
              </div>
              <div className="audit-meta-item">
                <span>Target</span>
                <strong>{selectedLog.target}</strong>
              </div>
              <div className="audit-meta-item">
                <span>Timestamp</span>
                <strong>{new Date(selectedLog.createdAt).toLocaleString('en-IN')}</strong>
              </div>
              <div className="audit-meta-item">
                <span>IP Address</span>
                <strong>{selectedLog.ipAddress}</strong>
              </div>
            </div>

            <div className="audit-meta-item" style={{ marginBottom: '12px' }}>
              <span>User Agent</span>
              <strong style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                {selectedLog.userAgent}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Sanitized Event Payload
              </span>
              <pre className="audit-json-pre">
                <code>{JSON.stringify(selectedLog.details || {}, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminAuditLogs;
