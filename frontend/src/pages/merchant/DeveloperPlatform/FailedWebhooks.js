import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaExclamationTriangle, 
  FaSync, 
  FaCheckCircle, 
  FaTimes, 
  FaEye 
} from 'react-icons/fa';
import { getFailedWebhooks, retryFailedWebhook } from '../../../services/api';
import './DeveloperPlatform.css';
import '../../../features/merchant/crm/IntegrationDashboard.css';

function FailedWebhooks() {
  const [failedList, setFailedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  const fetchFailed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFailedWebhooks();
      if (res.data && res.data.success) {
        setFailedList(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to fetch failed webhooks queue');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load failed webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFailed();
  }, [fetchFailed]);

  const handleRetry = async (id) => {
    try {
      setRetryingId(id);
      const res = await retryFailedWebhook(id);
      if (res.data && res.data.success) {
        alert('Webhook delivery re-queued successfully');
        setFailedList(prev => prev.filter(w => w._id !== id));
      } else {
        alert(`Retry failed: ${res.data?.error || 'Server error'}`);
      }
    } catch (err) {
      alert(`Retry failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <FaExclamationTriangle /> Failed Delivery Queue
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Failed Webhooks Delivery Queue</h1>
              <p>Undelivered outbound webhooks due to remote server timeouts (504), non-2xx responses, or connection drops.</p>
            </div>
            <button className="quick-action-btn" onClick={fetchFailed} disabled={loading}>
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

      {/* Main Table */}
      <div className="integration-section-card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <span style={{ color: 'var(--text-secondary, #667085)' }}>Scanning failed webhook queue...</span>
          </div>
        ) : failedList.length === 0 ? (
          <div className="empty-state-card">
            <FaCheckCircle className="empty-state-icon" style={{ color: '#16a36a' }} />
            <h4>No Failed Webhook Deliveries</h4>
            <p>All outbound webhooks have been received and acknowledged with HTTP 200/2xx status by your servers.</p>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Destination URL</th>
                  <th>Error / Response</th>
                  <th>Attempts</th>
                  <th>Failed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedList.map(item => (
                  <tr key={item._id}>
                    <td>
                      <code style={{ fontSize: '12.5px', fontWeight: '700' }}>{item.eventType || 'webhook.event'}</code>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{item.url || item.destination}</code>
                    </td>
                    <td>
                      <span style={{
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.08)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        {item.errorMessage || `HTTP ${item.responseStatus || 500}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {item.attempts || 1}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary, #667085)' }}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => setSelectedWebhook(item)}
                        >
                          <FaEye /> Inspect
                        </button>
                        <button 
                          className="quick-action-btn primary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          disabled={retryingId === item._id}
                          onClick={() => handleRetry(item._id)}
                        >
                          <FaSync className={retryingId === item._id ? 'spin' : ''} /> Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedWebhook && (
        <div className="modal-backdrop-saas" onClick={() => setSelectedWebhook(null)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header-saas">
              <h3>Undelivered Webhook Inspection</h3>
              <button className="modal-close-btn" onClick={() => setSelectedWebhook(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-saas">
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <strong>Delivery Error:</strong>
                <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontSize: '12px' }}>
                  {selectedWebhook.errorMessage || 'No response from destination endpoint'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)', marginBottom: '6px', display: 'block' }}>
                  Webhook Payload
                </span>
                <pre style={{
                  background: '#09090b',
                  color: '#f4f4f5',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '240px'
                }}>
                  {JSON.stringify(selectedWebhook.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer-saas">
              <button 
                className="quick-action-btn primary"
                disabled={retryingId === selectedWebhook._id}
                onClick={() => {
                  handleRetry(selectedWebhook._id);
                  setSelectedWebhook(null);
                }}
              >
                <FaSync /> Retry Delivery Now
              </button>
              <button className="quick-action-btn" onClick={() => setSelectedWebhook(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FailedWebhooks;
