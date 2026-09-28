import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaPlug, 
  FaPlus, 
  FaSync, 
  FaTrash, 
  FaCheck, 
  FaCopy, 
  FaKey, 
  FaShieldAlt, 
  FaExclamationTriangle,
  FaTimes,
  FaCheckCircle
} from 'react-icons/fa';
import { 
  getDeveloperWebhooks, 
  createDeveloperWebhook, 
  rotateWebhookSecret, 
  testDeveloperWebhook, 
  deleteDeveloperWebhook 
} from '../../../services/api';
import './DeveloperPlatform.css';
import '../IntegrationPlatform/IntegrationDashboard.css';

const AVAILABLE_EVENTS = [
  { id: 'message.received', name: 'Message Received', desc: 'Inbound message sent by customer on WhatsApp' },
  { id: 'message.delivered', name: 'Message Delivered', desc: 'Message delivered to recipient device' },
  { id: 'message.read', name: 'Message Read', desc: 'Recipient opened and read the message' },
  { id: 'message.failed', name: 'Message Failed', desc: 'Message undelivered (blocked or invalid number)' },
  { id: 'order.created', name: 'Order Created', desc: 'Customer placed a WhatsApp catalog order' },
  { id: 'lead.created', name: 'Lead Generated', desc: 'New inquiry or contact captured' },
  { id: 'broadcast.completed', name: 'Broadcast Finished', desc: 'Bulk campaign batch completed' }
];

function WebhookConfig() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [rotatingId, setRotatingId] = useState(null);

  // Newly created webhook secret modal
  const [createdSecretData, setCreatedSecretData] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Add form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['*']);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDeveloperWebhooks();
      if (res.data && res.data.success) {
        setWebhooks(res.data.data || []);
      } else {
        setError(res.data?.error || 'Failed to fetch webhooks');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleTest = async (id) => {
    try {
      setTestingId(id);
      const res = await testDeveloperWebhook(id);
      if (res.data && res.data.success) {
        alert(`Test ping successful! Response code: ${res.data.data?.statusCode || 200}`);
      } else {
        alert(`Test failed: ${res.data?.error || 'Unreachable destination'}`);
      }
    } catch (err) {
      alert(`Webhook test failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleRotate = async (id) => {
    if (!window.confirm('Are you sure you want to rotate this webhook signing secret? Existing HMAC verification on your server will fail until updated.')) return;
    try {
      setRotatingId(id);
      const res = await rotateWebhookSecret(id);
      if (res.data && res.data.success && res.data.data) {
        setCreatedSecretData({
          name: res.data.data.name || 'Webhook Endpoint',
          secret: res.data.data.signingSecret
        });
        fetchWebhooks();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to rotate secret');
    } finally {
      setRotatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription?')) return;
    try {
      await deleteDeveloperWebhook(id);
      setWebhooks(prev => prev.filter(w => w._id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete webhook');
    }
  };

  const handleEventCheckbox = (eventId) => {
    if (eventId === '*') {
      setSelectedEvents(['*']);
      return;
    }

    let updated = selectedEvents.filter(e => e !== '*');
    if (updated.includes(eventId)) {
      updated = updated.filter(e => e !== eventId);
      if (updated.length === 0) updated = ['*'];
    } else {
      updated.push(eventId);
    }
    setSelectedEvents(updated);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setFormError('Name and Destination URL are required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        name: name.trim(),
        url: url.trim(),
        subscribedEvents: selectedEvents
      };

      const res = await createDeveloperWebhook(payload);
      if (res.data && res.data.success) {
        setShowAddModal(false);
        setName('');
        setUrl('');
        setSelectedEvents(['*']);
        setCreatedSecretData({
          name: res.data.data?.name || 'Webhook',
          secret: res.data.data?.signingSecret
        });
        fetchWebhooks();
      } else {
        setFormError(res.data?.error || 'Failed to create webhook');
      }
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to register webhook');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCopySecret = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaPlug /> Real-time Event Streams
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Outbound Webhooks Configuration</h1>
              <p>Configure HTTPS endpoints to receive signed real-time events whenever WhatsApp messages, replies, and status updates occur.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={fetchWebhooks} disabled={loading}>
                <FaSync className={loading ? 'spin' : ''} /> Refresh
              </button>
              <button className="quick-action-btn primary" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Add Webhook Endpoint
              </button>
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

      {/* Webhooks Table */}
      <div className="integration-section-card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <span style={{ color: 'var(--text-secondary, #667085)' }}>Loading configured webhooks...</span>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="empty-state-card">
            <FaPlug className="empty-state-icon" />
            <h4>No Webhooks Configured</h4>
            <p>Subscribe to events like incoming messages, delivery statuses, and CRM signals to receive instant POST notifications to your backend.</p>
            <button className="quick-action-btn primary" onClick={() => setShowAddModal(true)}>
              <FaPlus /> Add Your First Webhook
            </button>
          </div>
        ) : (
          <div className="integration-table-container">
            <table className="integration-table">
              <thead>
                <tr>
                  <th>Webhook Name</th>
                  <th>Destination HTTPS URL</th>
                  <th>Subscribed Events</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map(wh => (
                  <tr key={wh._id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{wh.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)' }}>
                        Created {wh.createdAt ? new Date(wh.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '12.5px' }}>{wh.url}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(wh.subscribedEvents || ['*']).map(e => (
                          <span key={e} style={{ background: 'var(--bg-input, #f8fafc)', border: '1px solid var(--border-subtle, #d9e8f7)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontFamily: 'monospace' }}>
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-tag ${wh.isActive ? 'active' : 'inactive'}`}>
                        {wh.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          disabled={testingId === wh._id}
                          onClick={() => handleTest(wh._id)}
                          title="Send test ping event"
                        >
                          <FaSync className={testingId === wh._id ? 'spin' : ''} /> Test
                        </button>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          disabled={rotatingId === wh._id}
                          onClick={() => handleRotate(wh._id)}
                          title="Rotate Signing Secret"
                        >
                          <FaKey /> Secret
                        </button>
                        <button 
                          className="quick-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleDelete(wh._id)}
                          title="Delete Webhook"
                        >
                          <FaTrash />
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

      {/* HMAC Signature Verification Guide */}
      <div className="integration-section-card">
        <div className="section-header-row" style={{ marginBottom: '14px' }}>
          <div className="section-title-group">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShieldAlt style={{ color: 'var(--accent, #1677ff)' }} /> HMAC SHA-256 Signature Verification
            </h2>
            <p>Every outbound webhook contains a <code>X-Kwickbot-Signature</code> header. Verify signatures in your backend to ensure requests originate genuinely from Kwickbot.</p>
          </div>
        </div>

        <div className="code-container">
          <div className="code-header-bar">
            <span>Node.js / Express Signature Verifier</span>
            <span>JavaScript</span>
          </div>
          <pre className="code-body">
{`const crypto = require('crypto');

function verifyKwickbotWebhook(req, res, next) {
  const signature = req.headers['x-kwickbot-signature'];
  const signingSecret = process.env.KWICKBOT_WEBHOOK_SECRET;

  const hmac = crypto.createHmac('sha256', signingSecret);
  const calculated = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(calculated))) {
    return next();
  }
  return res.status(401).send('Invalid HMAC signature');
}`}
          </pre>
        </div>
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className="modal-backdrop-saas" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()}>
            <div className="modal-header-saas">
              <h3><FaPlus style={{ color: 'var(--accent, #1677ff)' }} /> Register Webhook Endpoint</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body-saas">
                {formError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-group-saas">
                  <label>Endpoint Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Production CRM Callback" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-saas">
                  <label>Destination HTTPS URL *</label>
                  <input 
                    type="url" 
                    placeholder="https://your-crm.com/api/kwickbot-webhook" 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                  />
                  <span className="form-hint">SSRF-protected. Must be a secure public HTTPS endpoint.</span>
                </div>

                <div className="form-group-saas">
                  <label>Subscribed Events</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedEvents.includes('*')}
                        onChange={() => handleEventCheckbox('*')}
                      />
                      <strong>All Events (*)</strong> — Listen to all inbound and outbound events
                    </label>

                    {AVAILABLE_EVENTS.map(ev => (
                      <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginLeft: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEvents.includes(ev.id)}
                          onChange={() => handleEventCheckbox(ev.id)}
                          disabled={selectedEvents.includes('*')}
                        />
                        <span><code>{ev.id}</code> — {ev.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-saas">
                <button 
                  type="button" 
                  className="quick-action-btn" 
                  onClick={() => setShowAddModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="quick-action-btn primary" 
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Registering...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signing Secret Reveal Modal */}
      {createdSecretData && (
        <div className="modal-backdrop-saas" onClick={() => setCreatedSecretData(null)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header-saas">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a36a' }}>
                <FaCheckCircle /> Save Your Webhook Secret
              </h3>
              <button className="modal-close-btn" onClick={() => setCreatedSecretData(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-saas">
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #667085)', margin: 0 }}>
                Here is the signing secret for <strong>{createdSecretData.name}</strong>. Save it securely now in your environment variables. For security, it will not be displayed again in plaintext.
              </p>

              <div className="api-key-display-row" style={{ marginTop: '8px' }}>
                <code className="api-key-value-box" style={{ color: '#1677ff' }}>
                  {createdSecretData.secret}
                </code>
                <button 
                  className="quick-action-btn primary"
                  onClick={() => handleCopySecret(createdSecretData.secret)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {copiedSecret ? <FaCheck /> : <FaCopy />} {copiedSecret ? 'Copied' : 'Copy Secret'}
                </button>
              </div>
            </div>

            <div className="modal-footer-saas">
              <button className="quick-action-btn primary" onClick={() => setCreatedSecretData(null)}>
                I have saved my secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebhookConfig;
