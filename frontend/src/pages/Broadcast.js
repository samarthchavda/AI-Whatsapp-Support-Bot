import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaBroadcastTower, FaUpload, FaCalendarAlt, FaPaperPlane, FaTrash, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

function Broadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [recipientSource, setRecipientSource] = useState('csv');

  const plan = (JSON.parse(localStorage.getItem('admin') || '{}')?.subscriptionPlan || 'starter').toLowerCase();

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/broadcasts');
      setBroadcasts(response.data.data);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      alert('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const scheduledFor = e.target.scheduledFor?.value;
    if (scheduledFor) {
      formData.set('scheduledFor', new Date(scheduledFor).toISOString());
    }

    try {
      setUploadProgress('Creating broadcast...');
      
      const response = await api.post('/broadcasts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setShowCreateForm(false);
        setUploadProgress(null);
        setRecipientSource('csv');
        fetchBroadcasts();
        alert('Broadcast created successfully!');
        e.target.reset();
      }
    } catch (error) {
      setUploadProgress(null);
      alert(error.response?.data?.error || 'Failed to create broadcast');
    }
  };

  const handleSendNow = async (id) => {
    if (!window.confirm('Send this broadcast immediately?')) return;
    
    try {
      await api.post(`/broadcasts/${id}/send`, {});
      alert('Broadcast queued for sending!');
      fetchBroadcasts();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send broadcast');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this broadcast?')) return;
    
    try {
      await api.delete(`/broadcasts/${id}`);
      alert('Broadcast deleted successfully');
      fetchBroadcasts();
    } catch (error) {
      alert('Failed to delete broadcast');
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `phoneNumber,name
+1234567890,John Doe
+1234567891,Jane Smith
+1234567892,Bob Johnson`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_recipients.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: '#71717a', label: 'Draft' },
      scheduled: { color: '#f59e0b', label: 'Scheduled' },
      sending: { color: '#3b82f6', label: 'Sending' },
      completed: { color: '#10b981', label: 'Completed' },
      failed: { color: '#ef4444', label: 'Failed' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className="badge" style={{ background: `${config.color}33`, color: config.color }}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Marketing Broadcasts</h1>
            <p className="page-subtitle">
              Send bulk WhatsApp messages to your customers.
              <a 
                href="/docs/broadcast_guide.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  marginLeft: '12px', 
                  color: '#6366f1', 
                  fontWeight: '600', 
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📖 Shopify Basic Plan PDF Guide
              </a>
            </p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaBroadcastTower /> {showCreateForm ? 'Cancel' : 'New Broadcast'}
          </button>
        </div>
      </div>

      {/* Create Broadcast Form */}
      {showCreateForm && (
        <div className="table-container" style={{ marginBottom: '28px', background: 'rgba(99, 102, 241, 0.05)' }}>
          <div className="table-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' }}>
            <h2>📤 Create New Broadcast</h2>
          </div>
          <form onSubmit={handleCreateBroadcast} style={{ padding: '28px' }} encType="multipart/form-data">
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.1)', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                📋 CSV Format Requirements:
              </h3>
              <ul style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                <li><strong>Required columns:</strong> phoneNumber (with country code, e.g., +1234567890)</li>
                <li><strong>Optional columns:</strong> name (for personalization)</li>
                <li><strong>Example:</strong> phoneNumber,name</li>
                <li><strong>Max file size:</strong> 5MB</li>
                <li><strong>Shopify Basic Plan Guide:</strong> Learn how to export customers from Shopify and format the CSV by downloading the <a href="/docs/broadcast_guide.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc', textDecoration: 'underline', fontWeight: 'bold' }}>Shopify Basic Plan PDF Guide</a>.</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                <label>Broadcast Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Summer Sale Announcement"
                />
              </div>

              <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                <label>Message *</label>
                <textarea
                  name="message"
                  required
                  placeholder="Your marketing message here... Use {{name}} for personalization"
                  rows="5"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa',
                    fontFamily: 'Inter, sans-serif',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#71717a', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                  Tip: Use {'{'}{'{'} name {'}'}{'}'}  to personalize messages with recipient names
                </small>
              </div>

              <div className="filter-group">
                <label>Recipient Source *</label>
                <select
                  name="recipientSource"
                  value={recipientSource}
                  onChange={(e) => setRecipientSource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa'
                  }}
                >
                  <option value="csv">📁 Upload CSV File</option>
                  <option value="crm" disabled={plan === 'starter'}>
                    📦 Import from Orders {plan === 'starter' ? '🔒 (Upgrade Plan)' : ''}
                  </option>
                  <option value="abandoned_carts" disabled={plan === 'starter'}>
                    🛒 Import from Abandoned Carts {plan === 'starter' ? '🔒 (Upgrade Plan)' : ''}
                  </option>
                </select>
              </div>

              <div className="filter-group">
                <label>Schedule For (Optional)</label>
                <input
                  type="datetime-local"
                  name="scheduledFor"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa'
                  }}
                />
                <small style={{ color: '#71717a', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                  Leave empty to send immediately
                </small>
              </div>

              {recipientSource === 'csv' ? (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Upload Recipients CSV *</label>
                  <input 
                    type="file" 
                    name="csvFile" 
                    accept=".csv"
                    required
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: '2px dashed rgba(99, 102, 241, 0.5)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      background: 'rgba(39, 39, 42, 0.6)',
                      color: '#fafafa',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              ) : recipientSource === 'crm' ? (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Import Configuration</label>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    color: '#10b981',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: '1.5'
                  }}>
                    📦 Import from Orders Enabled! We will automatically fetch unique customer names and phone numbers from your Shopify orders. No duplicates or empty contacts will be imported.
                  </div>
                </div>
              ) : (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Import Configuration</label>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    color: '#f59e0b',
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: '1.5'
                  }}>
                    🛒 Import from Abandoned Carts Enabled! We will fetch unique customer names and phone numbers from your abandoned checkouts. Duplicate phone numbers are automatically removed.
                  </div>
                </div>
              )}
            </div>

            {uploadProgress && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 16px',
                borderRadius: '10px',
                color: '#a5b4fc',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {uploadProgress}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={uploadProgress !== null}
                style={{ flex: 1 }}
              >
                {uploadProgress ? 'Creating...' : 'Create Broadcast'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={downloadSampleCSV}
              >
                📥 Sample CSV
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Broadcasts List */}
      <div className="table-container">
        <div className="table-header">
          <h2>All Broadcasts ({broadcasts.length})</h2>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            Loading broadcasts...
          </div>
        ) : broadcasts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📢</div>
            <p>No broadcasts created yet.</p>
            <p style={{ fontSize: '14px' }}>Create your first broadcast to reach your customers!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Message Preview</th>
                <th>Recipients</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Scheduled For</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast._id}>
                  <td>
                    <strong>{broadcast.title}</strong>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#a1a1aa' }}>
                      {broadcast.message}
                    </div>
                  </td>
                  <td>{broadcast.totalRecipients}</td>
                  <td>{getStatusBadge(broadcast.status)}</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ color: '#10b981' }}>✓ {broadcast.sentCount} sent</div>
                      <div style={{ color: '#ef4444' }}>✗ {broadcast.failedCount} failed</div>
                    </div>
                  </td>
                  <td>
                    {broadcast.scheduledFor ? (
                      <div style={{ fontSize: '12px' }}>
                        <FaClock style={{ marginRight: '4px' }} />
                        {new Date(broadcast.scheduledFor).toLocaleString()}
                      </div>
                    ) : (
                      <span style={{ color: '#71717a' }}>-</span>
                    )}
                  </td>
                  <td>{new Date(broadcast.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <button
                          onClick={() => handleSendNow(broadcast._id)}
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          title="Send Now"
                        >
                          <FaPaperPlane />
                        </button>
                      )}
                      {(broadcast.status === 'draft' || broadcast.status === 'failed') && (
                        <button
                          onClick={() => handleDelete(broadcast._id)}
                          className="btn btn-danger"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Broadcast;
