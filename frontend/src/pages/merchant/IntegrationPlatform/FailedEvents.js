import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaExclamationTriangle, 
  FaSync, 
  FaCheckCircle, 
  FaTimes,
  FaEye
} from 'react-icons/fa';
import { getIntegrationEvents, retryIntegrationEvent } from '../../../services/api';
import './IntegrationDashboard.css';

function FailedEvents() {
  const [failedEvents, setFailedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchFailedEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIntegrationEvents({ status: 'failed' });
      if (res.data && res.data.success) {
        setFailedEvents(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to fetch failed events');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load failed events queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFailedEvents();
  }, [fetchFailedEvents]);

  const handleRetrySingle = async (id) => {
    try {
      setRetryingId(id);
      const res = await retryIntegrationEvent(id);
      if (res.data && res.data.success) {
        setFailedEvents(prev => prev.filter(e => e._id !== id));
        alert('Event re-queued for processing');
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to retry event');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!window.confirm(`Are you sure you want to retry all ${failedEvents.length} failed events?`)) return;
    try {
      setBulkRetrying(true);
      for (const evt of failedEvents) {
        try {
          await retryIntegrationEvent(evt._id);
        } catch (e) {
          // continue
        }
      }
      alert('All failed events have been re-queued for processing');
      fetchFailedEvents();
    } catch (err) {
      alert('Failed during bulk replay');
    } finally {
      setBulkRetrying(false);
    }
  };

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <FaExclamationTriangle /> Dead-Letter & Failed Queue
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Failed Integration Events</h1>
              <p>Review dead-letter payloads, network timeouts, authentication rejections, and trigger replay.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={fetchFailedEvents} disabled={loading}>
                <FaSync className={loading ? 'spin' : ''} /> Refresh
              </button>
              {failedEvents.length > 0 && (
                <button 
                  className="quick-action-btn primary" 
                  onClick={handleRetryAll} 
                  disabled={bulkRetrying}
                >
                  <FaSync className={bulkRetrying ? 'spin' : ''} /> Retry All ({failedEvents.length})
                </button>
              )}
            </div>
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
            <span style={{ color: 'var(--text-secondary, #667085)' }}>Scanning failed events queue...</span>
          </div>
        ) : failedEvents.length === 0 ? (
          <div className="empty-state-card">
            <FaCheckCircle className="empty-state-icon" style={{ color: '#16a36a' }} />
            <h4>All Events Healthy</h4>
            <p>There are no failed or dead-letter events in your queue. All CRM sync pipelines and WhatsApp triggers are executing successfully.</p>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Event ID / Type</th>
                  <th>Source / Dest</th>
                  <th>Failure Reason</th>
                  <th>Attempts</th>
                  <th>Failed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedEvents.map(evt => (
                  <tr key={evt._id}>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{evt.eventType}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)', fontFamily: 'monospace' }}>
                        {evt._id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{evt.sourceProvider} &rarr; {evt.destination}</div>
                    </td>
                    <td>
                      <div style={{
                        maxWidth: '280px',
                        fontSize: '12px',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.08)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {evt.errorMessage || 'Execution timeout or CRM endpoint rejection'}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {evt.attempts || 1} / {evt.maxAttempts || 3}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary, #667085)' }}>
                      {evt.updatedAt ? new Date(evt.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => setSelectedEvent(evt)}
                        >
                          <FaEye /> Inspect
                        </button>
                        <button 
                          className="quick-action-btn primary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          disabled={retryingId === evt._id}
                          onClick={() => handleRetrySingle(evt._id)}
                        >
                          <FaSync className={retryingId === evt._id ? 'spin' : ''} /> Retry
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

      {/* Inspect Modal */}
      {selectedEvent && (
        <div className="modal-backdrop-saas" onClick={() => setSelectedEvent(null)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header-saas">
              <h3>Failed Event Inspection</h3>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
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
                <strong>Failure Details:</strong>
                <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontSize: '12px' }}>
                  {selectedEvent.errorMessage || 'Unknown execution error'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)', marginBottom: '6px', display: 'block' }}>
                  Original Event Payload
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
                  {JSON.stringify(selectedEvent.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer-saas">
              <button 
                className="quick-action-btn primary"
                disabled={retryingId === selectedEvent._id}
                onClick={() => {
                  handleRetrySingle(selectedEvent._id);
                  setSelectedEvent(null);
                }}
              >
                <FaSync /> Retry Event Now
              </button>
              <button className="quick-action-btn" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FailedEvents;
