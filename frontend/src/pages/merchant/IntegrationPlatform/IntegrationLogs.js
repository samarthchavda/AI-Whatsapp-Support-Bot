import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaHistory, 
  FaSync, 
  FaEye, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaFilter
} from 'react-icons/fa';
import { getIntegrationEvents, retryIntegrationEvent } from '../../../services/api';
import './IntegrationDashboard.css';

function IntegrationLogs() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (eventTypeFilter.trim()) params.eventType = eventTypeFilter.trim();

      const res = await getIntegrationEvents(params);
      if (res.data && res.data.success) {
        setEvents(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to fetch integration logs');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load integration logs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventTypeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRetry = async (id) => {
    try {
      setRetryingId(id);
      const res = await retryIntegrationEvent(id);
      if (res.data && res.data.success) {
        alert('Event re-queued for delivery successfully');
        fetchEvents();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to retry event');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge">
            <FaHistory /> Audit & Event Stream
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Integration Event Logs</h1>
              <p>Comprehensive immutable stream of inbound CRM webhooks and outbound WhatsApp messages.</p>
            </div>
            <button className="quick-action-btn" onClick={fetchEvents} disabled={loading}>
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
              placeholder="Search by event type (e.g. crm.lead.created)..." 
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
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
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-input, #f8fafc)',
              border: '1px solid var(--border-subtle, #d9e8f7)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              color: 'var(--text-primary, #101828)'
            }}
          >
            <option value="">All Statuses</option>
            <option value="delivered">Delivered / Success</option>
            <option value="processing">Processing / In Progress</option>
            <option value="failed">Failed</option>
            <option value="dead_letter">Dead Letter</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="integration-section-card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading event logs...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state-card">
            <FaCheckCircle className="empty-state-icon" style={{ color: '#16a36a' }} />
            <h4>No Integration Events Recorded</h4>
            <p>Events triggered by connected CRMs or WhatsApp automations will appear here in real time.</p>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Event ID / Type</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Timestamp</th>
                  <th>Payload & Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt._id}>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{evt.eventType}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)', fontFamily: 'monospace' }}>
                        {evt._id}
                      </div>
                    </td>
                    <td>{evt.sourceProvider || 'crm'}</td>
                    <td>{evt.destination || 'whatsapp'}</td>
                    <td>
                      <span className={`status-tag ${evt.status}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', fontWeight: '600' }}>
                      {evt.attempts || 1}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary, #667085)' }}>
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => setSelectedEvent(evt)}
                          title="View Payload Details"
                        >
                          <FaEye /> View
                        </button>
                        {(evt.status === 'failed' || evt.status === 'dead_letter') && (
                          <button 
                            className="quick-action-btn"
                            style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                            disabled={retryingId === evt._id}
                            onClick={() => handleRetry(evt._id)}
                            title="Retry event processing"
                          >
                            <FaSync className={retryingId === evt._id ? 'spin' : ''} /> Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedEvent && (
        <div className="modal-backdrop-saas" onClick={() => setSelectedEvent(null)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header-saas">
              <h3>Event Payload & Diagnostics</h3>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-saas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)' }}>Event ID</span>
                <code style={{ fontSize: '12px' }}>{selectedEvent._id}</code>
              </div>

              {selectedEvent.errorMessage && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px'
                }}>
                  <strong>Failure Reason:</strong> {selectedEvent.errorMessage}
                </div>
              )}

              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted, #98a2b3)', marginBottom: '6px', display: 'block' }}>
                  Payload (JSON)
                </span>
                <pre style={{
                  background: '#09090b',
                  color: '#f4f4f5',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '260px'
                }}>
                  {JSON.stringify(selectedEvent.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer-saas">
              {(selectedEvent.status === 'failed' || selectedEvent.status === 'dead_letter') && (
                <button 
                  className="quick-action-btn primary"
                  disabled={retryingId === selectedEvent._id}
                  onClick={() => {
                    handleRetry(selectedEvent._id);
                    setSelectedEvent(null);
                  }}
                >
                  <FaSync /> Retry Event Now
                </button>
              )}
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

export default IntegrationLogs;
