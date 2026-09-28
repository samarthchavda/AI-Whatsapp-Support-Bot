import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaHistory, 
  FaSync, 
  FaEye, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaTimes,
  FaFilter
} from 'react-icons/fa';
import { getDeveloperLogs } from '../../../services/api';
import './DeveloperPlatform.css';
import '../../../features/merchant/crm/IntegrationDashboard.css';

function ApiLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchEndpoint, setSearchEndpoint] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (methodFilter) params.method = methodFilter;
      if (statusFilter) params.statusCode = statusFilter;
      if (searchEndpoint.trim()) params.endpoint = searchEndpoint.trim();

      const res = await getDeveloperLogs(params);
      if (res.data && res.data.success) {
        setLogs(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to fetch API logs');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load API logs');
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, searchEndpoint]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusBadgeClass = (code) => {
    if (code >= 200 && code < 300) return 'status-tag delivered';
    if (code >= 400 && code < 500) return 'status-tag paused';
    if (code >= 500) return 'status-tag failed';
    return 'status-tag configuring';
  };

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaHistory /> API Traffic Logs
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>API Request Logs</h1>
              <p>Real-time audit log of incoming and outbound REST API requests, response status codes, and execution latencies.</p>
            </div>
            <button className="quick-action-btn" onClick={fetchLogs} disabled={loading}>
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

      {/* Filter Bar */}
      <div className="integration-section-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaFilter style={{ color: 'var(--text-muted, #98a2b3)' }} />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Filters:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <input 
              type="text" 
              placeholder="Search by endpoint (e.g. /send-template)..." 
              value={searchEndpoint}
              onChange={e => setSearchEndpoint(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input, #f8fafc)',
                border: '1px solid var(--border-subtle, #d9e8f7)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px'
              }}
            />
          </div>

          <select 
            value={methodFilter} 
            onChange={e => setMethodFilter(e.target.value)}
            style={{
              background: 'var(--bg-input, #f8fafc)',
              border: '1px solid var(--border-subtle, #d9e8f7)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px'
            }}
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-input, #f8fafc)',
              border: '1px solid var(--border-subtle, #d9e8f7)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px'
            }}
          >
            <option value="">All Status Codes</option>
            <option value="200">200 OK</option>
            <option value="201">201 Created</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="429">429 Rate Limited</option>
            <option value="500">500 Server Error</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="integration-section-card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading API logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state-card">
            <FaCheckCircle className="empty-state-icon" style={{ color: '#16a36a' }} />
            <h4>No API Requests Logged</h4>
            <p>API requests triggered from your client scripts or CRMs will be logged here with status codes and latency metrics.</p>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint Path</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className={`status-tag ${log.method === 'POST' ? 'connected' : 'processing'}`} style={{ fontWeight: '800' }}>
                        {log.method}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '13px', fontWeight: '600' }}>{log.endpoint || log.path}</code>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(log.statusCode)}>
                        {log.statusCode || 200}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', fontWeight: '600' }}>
                      {log.latencyMs ? `${log.latencyMs} ms` : '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted, #98a2b3)', fontFamily: 'monospace' }}>
                      {log.ipAddress || '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary, #667085)' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <button 
                        className="quick-action-btn"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => setSelectedLog(log)}
                      >
                        <FaEye /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="modal-backdrop-saas" onClick={() => setSelectedLog(null)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header-saas">
              <h3>Request Details: {selectedLog.method} {selectedLog.endpoint}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedLog(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-saas">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Status Code:</span>
                  <div style={{ fontWeight: '700', marginTop: '2px' }}>{selectedLog.statusCode}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Response Time:</span>
                  <div style={{ fontWeight: '700', marginTop: '2px' }}>{selectedLog.latencyMs} ms</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Client IP:</span>
                  <div style={{ fontFamily: 'monospace', marginTop: '2px' }}>{selectedLog.ipAddress || '—'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted, #98a2b3)' }}>Timestamp:</span>
                  <div style={{ marginTop: '2px' }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px'
                }}>
                  <strong>Error Message:</strong> {selectedLog.errorMessage}
                </div>
              )}

              {selectedLog.requestBody && (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)', marginBottom: '6px', display: 'block' }}>
                    Request Body
                  </span>
                  <pre style={{
                    background: '#09090b',
                    color: '#f4f4f5',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    maxHeight: '200px'
                  }}>
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer-saas">
              <button className="quick-action-btn" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiLogs;
