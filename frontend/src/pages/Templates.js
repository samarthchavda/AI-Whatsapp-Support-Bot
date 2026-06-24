import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaSync, FaSearch, FaFilter, FaCheckCircle, FaExclamationCircle, FaProjectDiagram, FaInfoCircle, FaFileAlt } from 'react-icons/fa';
import './Templates.css';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/whatsapp/templates');
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to retrieve templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/whatsapp/templates/sync');
      alert(response.data.message || 'Templates synced successfully!');
      fetchTemplates();
    } catch (error) {
      console.error('Error syncing templates:', error);
      alert('Failed to sync templates with Meta API');
    } finally {
      setSyncing(false);
    }
  };

  const handleMapEvent = async (templateId, eventValue) => {
    try {
      // Send value as null if 'None' is chosen
      const mappedValue = eventValue === 'none' ? null : eventValue;
      
      const response = await api.put(`/whatsapp/templates/${templateId}/map`, {
        mappedEvent: mappedValue
      });
      
      alert(response.data.message || 'Mapping updated successfully!');
      fetchTemplates(); // Reload to update UI across other templates (in case of override)
    } catch (error) {
      console.error('Error mapping template:', error);
      alert(error.response?.data?.error || 'Failed to update template mapping');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
      PENDING: { bg: '#fef3c7', text: '#92400e', label: 'Pending Meta Review' },
      REJECTED: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
      PAUSED: { bg: '#e5e7eb', text: '#374151', label: 'Paused' }
    };
    
    const badge = badges[status] || { bg: '#f3f4f6', text: '#374151', label: status };
    
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: badge.bg,
        color: badge.text
      }}>
        {badge.label}
      </span>
    );
  };

  const filteredTemplates = templates.filter(tpl => {
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tpl.components.some(c => c.text && c.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'ALL' || tpl.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || tpl.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderComponent = (comp) => {
    if (comp.type === 'HEADER') {
      return (
        <div key="header" className="template-preview-header">
          <strong>Header:</strong> {comp.text}
        </div>
      );
    }
    if (comp.type === 'BODY') {
      return (
        <div key="body" className="template-preview-body">
          <p>{comp.text}</p>
        </div>
      );
    }
    if (comp.type === 'FOOTER') {
      return (
        <div key="footer" className="template-preview-footer">
          <small>{comp.text}</small>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Template Manager</h1>
          <p className="page-subtitle">View your Meta-approved messaging templates and map them to transactional webhook triggers.</p>
        </div>
        <button
          onClick={handleSync}
          className="btn-primary sync-btn"
          disabled={syncing}
        >
          <FaSync className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing...' : 'Sync with Meta'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Categories</option>
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Retrieving template records...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <FaFileAlt style={{ fontSize: '48px', color: '#a1a1aa', marginBottom: '16px' }} />
          <h3>No Templates Found</h3>
          <p>We couldn't find any templates matching your criteria. Try syncing with Meta to import templates.</p>
          <button onClick={handleSync} className="btn-secondary" style={{ marginTop: '12px' }}>
            <FaSync /> Sync Live Templates
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((tpl) => (
            <div key={tpl._id} className="template-card">
              <div className="template-card-header">
                <div className="template-title-wrapper">
                  <h3 className="template-name">{tpl.name}</h3>
                  <span className="template-category-tag">{tpl.category}</span>
                </div>
                {getStatusBadge(tpl.status)}
              </div>

              {/* Mapped Event Config */}
              <div className="template-mapping-section">
                <label className="mapping-label">
                  <FaProjectDiagram /> Map to Trigger Event:
                </label>
                <select
                  value={tpl.mappedEvent || 'none'}
                  onChange={(e) => handleMapEvent(tpl._id, e.target.value)}
                  className="mapping-select"
                >
                  <option value="none">None (Manual Dispatch Only)</option>
                  <option value="order_confirmation">E-Commerce: Order Confirmed</option>
                  <option value="order_shipped">E-Commerce: Order Shipped</option>
                  <option value="order_delivered">E-Commerce: Order Delivered</option>
                  <option value="order_cancelled">E-Commerce: Order Cancelled</option>
                  <option value="abandoned_cart">E-Commerce: Abandoned Cart</option>
                </select>
              </div>

              {/* Preview Box */}
              <div className="template-preview-box">
                <div className="preview-label">Live Preview</div>
                <div className="preview-bubble">
                  {tpl.components.map(renderComponent)}
                </div>
              </div>

              <div className="template-card-footer">
                <span className="template-lang-badge">Language: <code>{tpl.language}</code></span>
                {tpl.mappedEvent && (
                  <span className="mapping-active-badge">
                    <FaCheckCircle /> Active Notification Mapping
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info notice */}
      <div className="info-notice-box">
        <FaInfoCircle />
        <div>
          <strong>Info on Variables:</strong> Message templates use placeholders like <code>{"{{1}}"}</code> or <code>{"{{2}}"}</code>. During webhook events (like Shopify order confirmation), these variables are automatically populated with real-time merchant parameters (e.g., customer name, order number, tracking ID).
        </div>
      </div>
    </div>
  );
}

export default Templates;
