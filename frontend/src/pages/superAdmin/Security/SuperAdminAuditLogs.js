import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { 
  FaShieldAlt, 
  FaSearch, 
  FaEye, 
  FaTimesCircle,
  FaCalendarAlt,
  FaUserSecret,
  FaFileAlt,
  FaServer
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminAuditLogs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchAuditLogsData();
  }, []);

  const fetchAuditLogsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/audit-logs');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching Audit Logs data:', err);
      setError(err.response?.data?.error || 'Failed to load Audit Logs data');
    } finally {
      setLoading(false);
    }
  };

  // Get dynamic action types list for filter dropdown
  const actionTypes = useMemo(() => {
    if (!data || !data.logs) return [];
    const set = new Set();
    data.logs.forEach(log => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredLogs = useMemo(() => {
    if (!data || !data.logs) return [];
    
    let result = data.logs;

    // Apply Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (log) =>
          (log.actorName && log.actorName.toLowerCase().includes(q)) ||
          (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.target && log.target.toLowerCase().includes(q))
      );
    }

    // Apply Action Filter
    if (actionFilter) {
      result = result.filter((log) => log.action === actionFilter);
    }

    return result;
  }, [data, searchQuery, actionFilter]);

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading Audit Logs metrics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="detail-card" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <FaTimesCircle style={{ fontSize: '40px', color: '#ef4444', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Error Loading Dashboard</h3>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>{error}</p>
          <button onClick={fetchAuditLogsData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalActivities: 0, adminActions: 0, merchantActions: 0, recentActivities: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaShieldAlt className="audit-logs-title-icon" style={{ color: '#f87171' }} />
            Security Audit Logs
          </h1>
          <p className="page-subtitle">Track platform security events, system backup updates, admin overrides, and merchant configurations</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaShieldAlt />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Activities</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalActivities}</p>
            <small style={{ color: 'var(--text-secondary)' }}>System security logs</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaUserSecret />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Admin Actions</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#38bdf8' }}>{summary.adminActions}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Super admin operations</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaFileAlt />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Merchant Actions</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#a78bfa' }}>{summary.merchantActions}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Merchant admin changes</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCalendarAlt />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Recent (24h)</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.recentActivities}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Activities past 24 hours</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h2><FaShieldAlt /> System Activity Registry ({filteredLogs.length})</h2>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">All Actions</option>
              {actionTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Search */}
            <div className="super-admin-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search actor, action, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Timestamp</th>
                <th>IP Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="super-admin-empty">
                    No activity logs found matching current filters
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="user-info-cell">
                        <span className="user-info-name">{log.actorName}</span>
                        <span className="user-info-email">{log.actorEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge-pill" style={{ fontStyle: 'normal', color: 'var(--text-primary)', textTransform: 'none' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        {log.target}
                      </span>
                    </td>
                    <td>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <FaServer style={{ fontSize: '12px' }} />
                        {log.ipAddress}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="detail-card" style={{
            width: '90%',
            maxWidth: '600px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-subtle)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>

            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <FaShieldAlt style={{ color: '#f87171' }} />
              Activity Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: '14px', marginBottom: '20px' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Action:</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedLog.action}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Actor Name:</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedLog.actorName}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Actor Email:</div>
              <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedLog.actorEmail}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Actor Role:</div>
              <div style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{selectedLog.actorRole}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Target:</div>
              <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedLog.target}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Timestamp:</div>
              <div style={{ color: 'var(--text-primary)' }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>IP Address:</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedLog.ipAddress}</div>

              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>User Agent:</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '13px', wordBreak: 'break-word' }}>{selectedLog.userAgent}</div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '14px' }}>Metadata Payload:</h4>
              <pre style={{
                background: 'var(--bg-body)',
                color: 'var(--text-primary)',
                padding: '16px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
                maxHeight: '200px',
                border: '1px solid var(--border-subtle)'
              }}>
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedLog(null)} className="btn-primary" style={{ padding: '8px 20px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminAuditLogs;
