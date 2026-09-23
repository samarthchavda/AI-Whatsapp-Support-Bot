import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { getAbandonedCarts, getOrders } from '../../../services/api';
import { FaBroadcastTower, FaPaperPlane, FaTrash, FaClock, FaRedo, FaEye, FaExclamationTriangle } from 'react-icons/fa';

function Broadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [recipientSource, setRecipientSource] = useState('csv');
  const [importPreview, setImportPreview] = useState(null);  // { count, loading, error }
  const [reusedBroadcast, setReusedBroadcast] = useState(null); // { id, title, totalRecipients }
  const [detailModalBroadcast, setDetailModalBroadcast] = useState(null); // full broadcast details
  const [loadingDetailModal, setLoadingDetailModal] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [previewImageFileUrl, setPreviewImageFileUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const plan = (JSON.parse(localStorage.getItem('admin') || '{}')?.subscriptionPlan || 'starter').toLowerCase();

  // Fetch live preview count when source changes
  const fetchImportPreview = useCallback(async (source) => {
    if (source === 'csv' || source === 'reuse') {
      setImportPreview(null);
      return;
    }
    setImportPreview({ loading: true, count: null, error: null });
    try {
      if (source === 'crm') {
        const res = await getOrders({ limit: 10000 });
        const orders = res.data?.orders || res.data?.data || [];
        const uniquePhones = new Set();
        orders.forEach(o => {
          const p = (o.customerPhone || '').toString().trim().replace(/\s+/g, '');
          if (p && p.length > 5 && !p.includes('undefined') && !p.includes('null')) uniquePhones.add(p);
        });
        setImportPreview({ loading: false, count: uniquePhones.size, error: null, source: 'Orders' });
      } else if (source === 'abandoned_carts') {
        const res = await getAbandonedCarts({ limit: 10000 });
        const carts = res.data?.carts || [];
        const uniquePhones = new Set();
        carts.forEach(c => {
          const p = (c.customerPhone || '').toString().trim().replace(/\s+/g, '');
          if (p && p.length > 5 && !p.includes('undefined') && !p.includes('null')) uniquePhones.add(p);
        });
        setImportPreview({ loading: false, count: uniquePhones.size, error: null, source: 'Abandoned Carts' });
      }
    } catch (err) {
      setImportPreview({ loading: false, count: null, error: 'Failed to load preview' });
    }
  }, []);

  const [approvedTemplates, setApprovedTemplates] = useState([]);

  useEffect(() => {
    fetchBroadcasts();
    fetchApprovedTemplates();
  }, []);

  const fetchApprovedTemplates = async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      if (res.data.success) {
        const approved = (res.data.data || []).filter(t => t.status === 'APPROVED');
        setApprovedTemplates(approved);
      }
    } catch (err) {
      // silent
    }
  };

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

  const handleSourceChange = (e) => {
    const val = e.target.value;
    if (val !== 'reuse') {
      setReusedBroadcast(null);
    }
    setRecipientSource(val);
    fetchImportPreview(val);
  };

  const handleReuseBroadcast = (broadcast) => {
    setReusedBroadcast({
      id: broadcast._id,
      title: broadcast.title,
      totalRecipients: broadcast.totalRecipients
    });
    setRecipientSource('reuse');
    setShowCreateForm(true);
    setDetailModalBroadcast(null);
  };

  const handleViewDetails = async (id) => {
    setLoadingDetailModal(true);
    try {
      const res = await api.get(`/broadcasts/${id}`);
      if (res.data.success) {
        setDetailModalBroadcast(res.data.data);
      }
    } catch (err) {
      alert('Failed to load campaign details.');
    } finally {
      setLoadingDetailModal(false);
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (reusedBroadcast) {
      formData.set('recipientSource', 'reuse');
      formData.set('reuseFromId', reusedBroadcast.id);
    }

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
        setReusedBroadcast(null);
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
        <div className="page-header-info">
          <h1 className="page-title">Marketing Broadcasts</h1>
          <p className="page-subtitle">Create, schedule, and monitor WhatsApp marketing campaigns.</p>
        </div>
        <div className="page-header-actions">
          <a 
            href="/docs/broadcast_guide.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            📖 View Guide
          </a>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (showCreateForm) {
                setShowCreateForm(false);
                setReusedBroadcast(null);
                setRecipientSource('csv');
              } else {
                setShowCreateForm(true);
              }
            }}
          >
            <FaBroadcastTower /> {showCreateForm ? 'Cancel' : 'New Broadcast'}
          </button>
        </div>
      </div>

      {/* Create Broadcast Form */}
      {showCreateForm && (
        <div className="table-container" style={{ marginBottom: '28px', background: 'rgba(99, 102, 241, 0.05)', overflowX: 'hidden' }}>
          <div className="table-header" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' }}>
            <h2>📤 Create New Broadcast</h2>
          </div>
          <form onSubmit={handleCreateBroadcast} style={{ padding: '28px' }} encType="multipart/form-data">
            {reusedBroadcast ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: '#34d399', fontSize: '15px' }}>
                    ♻️ Reusing CSV Recipient List
                  </h4>
                  <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
                    Campaign: <strong>"{reusedBroadcast.title}"</strong> ({reusedBroadcast.totalRecipients} recipients loaded)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReusedBroadcast(null);
                    setRecipientSource('csv');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', color: '#ef4444' }}
                >
                  Clear Reuse
                </button>
              </div>
            ) : (
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
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                <label>Broadcast Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={reusedBroadcast ? `Re: ${reusedBroadcast.title}` : ''}
                  placeholder="e.g., Summer Sale Announcement"
                />
              </div>

              <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                <label>Select Meta Approved Template (Required for 24h+ Broadcasts)</label>
                <select
                  name="templateName"
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    if (!selectedName) {
                      setSelectedTemplate(null);
                      return;
                    }
                    const tpl = approvedTemplates.find(t => t.name === selectedName || t._id === selectedName);
                    setSelectedTemplate(tpl || null);
                    if (tpl && tpl.components) {
                      const bodyComp = tpl.components.find(c => c.type === 'BODY');
                      if (bodyComp && bodyComp.text) {
                        const formattedText = bodyComp.text.replace(/\{\{1\}\}/g, '{{name}}');
                        const messageTextarea = document.querySelector('textarea[name="message"]');
                        if (messageTextarea) {
                          messageTextarea.value = formattedText;
                        }
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    color: '#fafafa'
                  }}
                >
                  <option value="">-- Choose Approved Meta Template --</option>
                  {approvedTemplates.map(tpl => {
                    const isImageTpl = tpl.components?.some(c => c.type === 'HEADER' && (c.format === 'IMAGE' || c.text === '[IMAGE]'));
                    return (
                      <option key={tpl._id} value={tpl.name}>
                        {isImageTpl ? '📸 ' : ''}{tpl.name} ({tpl.category}) {isImageTpl ? '[Image Template]' : ''}
                      </option>
                    );
                  })}
                </select>
                <small style={{ color: '#a1a1aa', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Selecting a template auto-populates the message box and formats the payload for Meta API approval.
                </small>
              </div>

              {/* Header Image (Dynamically shown ONLY when an Image Template is selected or media attached) */}
              {((selectedTemplate?.components?.some(c => c.type === 'HEADER' && (c.format === 'IMAGE' || c.format === 'VIDEO' || c.format === 'DOCUMENT' || c.text === '[IMAGE]'))) || headerImageUrl || previewImageFileUrl) && (
                <div className="filter-group" style={{ gridColumn: 'span 2', background: 'rgba(99, 102, 241, 0.08)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                    📸 Media Header (Required for Selected Image Template)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Option A: Paste Image URL (HTTPS)</span>
                      <input
                        type="url"
                        name="headerImageUrl"
                        value={headerImageUrl}
                        onChange={(e) => setHeaderImageUrl(e.target.value)}
                        placeholder="e.g., https://kwickbot.in/assets/banner.jpg"
                        style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid rgba(63, 63, 70, 0.6)', background: 'rgba(39, 39, 42, 0.8)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Option B: Upload Image File</span>
                      <input
                        type="file"
                        name="headerImage"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPreviewImageFileUrl(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                        style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1px dashed rgba(99, 102, 241, 0.6)', background: 'rgba(39, 39, 42, 0.8)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {(headerImageUrl || previewImageFileUrl) && (
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '700' }}>Live Image Header Preview:</span>
                      <img 
                        src={previewImageFileUrl || headerImageUrl} 
                        alt="Header Preview" 
                        style={{ maxHeight: '90px', maxWidth: '200px', borderRadius: '8px', border: '1px solid #3f3f46', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              )}

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
                  onChange={handleSourceChange}
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
                  {reusedBroadcast && (
                    <option value="reuse">♻️ Reusing: {reusedBroadcast.title}</option>
                  )}
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
                    required={!reusedBroadcast}
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
              ) : recipientSource === 'reuse' ? (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Imported Recipient List</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{reusedBroadcast?.totalRecipients?.toLocaleString()}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>recipients auto-populated from <strong style={{ color: 'var(--text-primary)' }}>{reusedBroadcast?.title}</strong> ✅</span>
                  </div>
                </div>
              ) : recipientSource === 'crm' ? (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Import Preview</label>
                  {importPreview?.loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>
                      <div className="spinner" style={{ width: '14px', height: '14px', margin: 0 }} /> Fetching contacts...
                    </div>
                  ) : importPreview?.error ? (
                    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '14px' }}>
                      ⚠️ {importPreview.error}
                    </div>
                  ) : importPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{importPreview.count.toLocaleString()}</span>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>unique contacts from <strong style={{ color: 'var(--text-primary)' }}>{importPreview.source}</strong> — duplicates removed ✅</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <label>Import Preview</label>
                  {importPreview?.loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>
                      <div className="spinner" style={{ width: '14px', height: '14px', margin: 0 }} /> Fetching contacts...
                    </div>
                  ) : importPreview?.error ? (
                    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '14px' }}>
                      ⚠️ {importPreview.error}
                    </div>
                  ) : importPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{importPreview.count.toLocaleString()}</span>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>unique contacts from <strong style={{ color: 'var(--text-primary)' }}>{importPreview.source}</strong> — duplicates removed ✅</span>
                    </div>
                  ) : null}
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
                onClick={() => {
                  setShowCreateForm(false);
                  setReusedBroadcast(null);
                  setRecipientSource('csv');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Broadcasts List */}
      <div className="table-container" style={{ overflowX: 'hidden' }}>
        <div className="table-header">
          <h2>All Broadcasts ({broadcasts.length})</h2>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            Loading broadcasts...
          </div>
        ) : broadcasts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📢</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Broadcasts</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Create your first WhatsApp campaign to engage your customers.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Broadcast
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 'auto', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '22%', padding: '12px 10px' }}>Campaign</th>
                <th style={{ width: '22%', padding: '12px 10px' }}>Message Preview</th>
                <th style={{ width: '8%', padding: '12px 10px' }}>Audience</th>
                <th style={{ width: '10%', padding: '12px 10px' }}>Status</th>
                <th style={{ width: '14%', padding: '12px 10px' }}>Delivery</th>
                <th style={{ width: '12%', padding: '12px 10px' }}>Created</th>
                <th style={{ width: '12%', padding: '12px 10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast._id}>
                  <td style={{ padding: '12px 10px', wordBreak: 'break-word' }}>
                    <strong>{broadcast.title}</strong>
                    {broadcast.csvFileName && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {broadcast.csvFileName}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {broadcast.message}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>{broadcast.totalRecipients}</td>
                  <td style={{ padding: '12px 10px' }}>{getStatusBadge(broadcast.status)}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ color: 'var(--success)', fontWeight: '600' }}>Sent: {broadcast.sentCount || 0}</div>
                      <div style={{ color: broadcast.failedCount > 0 ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '600' }}>
                        Failed: {broadcast.failedCount || 0}
                        <button
                          onClick={() => handleViewDetails(broadcast._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: broadcast.failedCount > 0 ? 'var(--danger)' : '#a1a1aa',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                            fontSize: '11px',
                            fontWeight: '600',
                            marginLeft: '2px'
                          }}
                        >
                          (details)
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '12px' }}>{new Date(broadcast.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleViewDetails(broadcast._id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="View Delivery Log & Status"
                      >
                        <FaEye /> Log
                      </button>

                      <button
                        onClick={() => handleReuseBroadcast(broadcast)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="Reuse Recipient List / Resend"
                      >
                        <FaRedo /> Reuse
                      </button>

                      {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <button
                          onClick={() => handleSendNow(broadcast._id)}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '5px 8px' }}
                          title="Send Now"
                        >
                          <FaPaperPlane />
                        </button>
                      )}
                      {(broadcast.status === 'draft' || broadcast.status === 'failed') && (
                        <button
                          onClick={() => handleDelete(broadcast._id)}
                          className="btn btn-danger"
                          style={{ fontSize: '11px', padding: '5px 8px' }}
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

      {/* Recipient Details & Failure Log Modal */}
      {detailModalBroadcast && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #27272a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#27272a',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#f4f4f5', fontSize: '17px', fontWeight: '700' }}>
                  📊 {detailModalBroadcast.title}
                </h3>
                <small style={{ color: '#a1a1aa' }}>
                  Created on {new Date(detailModalBroadcast.createdAt).toLocaleString()}
                </small>
              </div>
              <button 
                onClick={() => setDetailModalBroadcast(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Campaign Overview Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
                marginBottom: '20px'
              }}>
                <div style={{ background: '#27272a', border: '1px solid #3f3f46', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: '600', marginBottom: '6px' }}>TOTAL RECIPIENTS</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#f4f4f5' }}>{detailModalBroadcast.totalRecipients}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '600', marginBottom: '6px' }}>SUCCESSFUL / SENT</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{detailModalBroadcast.sentCount || 0}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#f87171', fontWeight: '600', marginBottom: '6px' }}>FAILED / REQUIRED TEMPLATE</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{detailModalBroadcast.failedCount || 0}</div>
                </div>
              </div>

              {/* Message Content */}
              <div style={{
                background: '#27272a',
                border: '1px solid #3f3f46',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '13.5px',
                color: '#e4e4e7',
                borderLeft: '4px solid #6366f1'
              }}>
                {detailModalBroadcast.headerImageUrl && (
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '6px' }}>Header Image:</strong>
                    <img
                      src={detailModalBroadcast.headerImageUrl}
                      alt="Header"
                      style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '10px', border: '1px solid #3f3f46', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <strong style={{ color: '#a5b4fc' }}>Message Text:</strong>
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{detailModalBroadcast.message}</p>
              </div>

              {/* Recipient Breakdown Table */}
              <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700' }}>
                Recipient Delivery Status & Failure Log ({detailModalBroadcast.recipients?.length || 0})
              </h4>
              <div style={{ border: '1px solid #3f3f46', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 'auto' }}>
                  <thead>
                    <tr style={{ background: '#27272a', color: '#a1a1aa', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', borderBottom: '1px solid #3f3f46' }}>Phone / Name</th>
                      <th style={{ padding: '12px 14px', borderBottom: '1px solid #3f3f46' }}>Status</th>
                      <th style={{ padding: '12px 14px', borderBottom: '1px solid #3f3f46' }}>Delivery Details / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailModalBroadcast.recipients || []).map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: idx === (detailModalBroadcast.recipients.length - 1) ? 'none' : '1px solid #27272a', background: '#18181b' }}>
                        <td style={{ padding: '12px 14px', color: '#f4f4f5' }}>
                          <div><strong>{r.phone}</strong></div>
                          {r.name && <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{r.name}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: r.status === 'sent' ? 'rgba(16, 185, 129, 0.2)' : r.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(113, 113, 122, 0.2)',
                            color: r.status === 'sent' ? '#10b981' : r.status === 'failed' ? '#ef4444' : '#71717a'
                          }}>
                            {r.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: r.status === 'failed' ? '#f87171' : '#a1a1aa', fontSize: '12.5px' }}>
                          {r.status === 'failed' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FaExclamationTriangle style={{ color: '#ef4444', flexShrink: 0 }} />
                              <span>{r.error || 'Outside 24-hour customer window. Approved Meta template required.'}</span>
                            </div>
                          ) : r.status === 'sent' ? (
                            <span style={{ color: '#10b981' }}>Delivered / Sent to WhatsApp</span>
                          ) : (
                            'Pending queue processing'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #27272a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#27272a',
              flexShrink: 0
            }}>
              <button
                onClick={() => handleReuseBroadcast(detailModalBroadcast)}
                className="btn btn-primary"
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaRedo /> Reuse CSV / Resend to List
              </button>
              <button
                onClick={() => setDetailModalBroadcast(null)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Broadcast;
