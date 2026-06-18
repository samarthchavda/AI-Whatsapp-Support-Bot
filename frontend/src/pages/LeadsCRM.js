import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, 
  FaDollarSign, 
  FaCrown, 
  FaSearch, 
  FaUserPlus, 
  FaHistory, 
  FaEye, 
  FaTrash 
} from 'react-icons/fa';
import './SuperAdmin.css'; // Reuse existing styles for consistency

const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;

function LeadsCRM() {
  const navigate = useNavigate();
  const storedAdmin = localStorage.getItem('admin');
  const admin = storedAdmin ? JSON.parse(storedAdmin) : null;

  // Protect route
  useEffect(() => {
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [admin, navigate]);

  // Leads CRM State
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showConvertLeadModal, setShowConvertLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    websiteUrl: '',
    source: 'other',
    notes: '',
    remindAt: ''
  });
  const [convertPlan, setConvertPlan] = useState({
    subscriptionPlan: 'starter',
    monthlyPrice: 29,
    geminiTokensLimit: 10000
  });

  // Fetch B2B Leads
  const fetchLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.get(`${API_BASE}/super-admin/leads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search: leadSearch,
          status: leadStatusFilter,
          source: leadSourceFilter
        }
      });
      if (res.data.success) {
        setLeads(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadSearch, leadStatusFilter, leadSourceFilter]);

  useEffect(() => {
    if (admin && admin.role === 'super_admin') {
      fetchLeads();
    }
  }, [admin, fetchLeads]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.post(`${API_BASE}/super-admin/leads`, newLead, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowAddLeadModal(false);
        setNewLead({
          name: '',
          email: '',
          phone: '',
          businessName: '',
          websiteUrl: '',
          source: 'other',
          notes: '',
          remindAt: ''
        });
        fetchLeads();
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      alert(err.response?.data?.error || 'Failed to create lead');
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.put(`${API_BASE}/super-admin/leads/${selectedLead._id}`, selectedLead, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowEditLeadModal(false);
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Error updating lead:', err);
      alert(err.response?.data?.error || 'Failed to update lead');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.delete(`${API_BASE}/super-admin/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert(err.response?.data?.error || 'Failed to delete lead');
    }
  };

  const handleConvertLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.post(`${API_BASE}/super-admin/leads/${selectedLead._id}/convert`, convertPlan, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert(`Lead converted successfully!\nCredentials sent to ${selectedLead.email}`);
        setShowConvertLeadModal(false);
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Error converting lead:', err);
      alert(err.response?.data?.error || 'Failed to convert lead');
    }
  };

  if (!admin || admin.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="super-admin-container" style={{ padding: '24px' }}>
      <div className="super-admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fafafa', margin: 0 }}>Leads CRM</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Manage prospective e-commerce merchants and convert outreach leads to platform clients
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAddLeadModal(true)}
        >
          <FaUserPlus /> Add Lead
        </button>
      </div>

      <div className="crm-leads-container">
        {/* Stats Summary cards */}
        <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaUsers />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Total Prospects</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#fafafa' }}>{leads.length}</p>
              <small style={{ fontSize: '11px', color: '#71717a' }}>Outreach sales pipeline</small>
            </div>
          </div>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaCrown />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Converted</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#fafafa' }}>{leads.filter(l => l.status === 'converted').length}</p>
              <small style={{ fontSize: '11px', color: '#71717a' }}>New paying merchants</small>
            </div>
          </div>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaDollarSign />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Proposals Sent</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#fafafa' }}>{leads.filter(l => l.status === 'proposal_sent').length}</p>
              <small style={{ fontSize: '11px', color: '#71717a' }}>Awaiting response</small>
            </div>
          </div>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaHistory />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Follow-Ups</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#fafafa' }}>{leads.filter(l => l.status === 'followed_up' || l.remindAt).length}</p>
              <small style={{ fontSize: '11px', color: '#71717a' }}>Pending actions</small>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="table-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '14px', top: '15px', color: '#71717a' }} />
            <input
              type="text"
              placeholder="Search leads by name, business, email, phone..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                color: '#fafafa',
                fontSize: '14px'
              }}
            />
          </div>
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            style={{
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              color: '#fafafa',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="followed_up">Followed Up</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          <select
            value={leadSourceFilter}
            onChange={(e) => setLeadSourceFilter(e.target.value)}
            style={{
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              color: '#fafafa',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Sources</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="builtwith">BuiltWith</option>
            <option value="google_maps">Google Maps</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
          <div className="table-header-premium super-admin-table-header">
            <h2>📋 Outreach Leads & Pipeline Tracker</h2>
          </div>
          <div className="table-responsive-premium">
            {leadsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading leads...</div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>No prospects found matching filters.</div>
            ) : (
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Store / Business</th>
                    <th>Contact Person</th>
                    <th>Contact Details</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Next Action</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#fafafa' }}>{lead.businessName}</div>
                        {lead.websiteUrl && (
                          <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                            {lead.websiteUrl.replace(/https?:\/\//, '')}
                          </a>
                        )}
                      </td>
                      <td>{lead.name}</td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{lead.email || '-'}</div>
                        <div style={{ fontSize: '12px', color: '#71717a' }}>{lead.phone || '-'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', textTransform: 'capitalize', color: '#a1a1aa' }}>
                          {lead.source}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${lead.status}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {lead.remindAt ? (
                          <div style={{ fontSize: '12px' }}>
                            📅 {new Date(lead.remindAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span style={{ color: '#71717a', fontSize: '12px' }}>No reminder</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowEditLeadModal(true);
                            }}
                            className="action-btn"
                            title="Edit details & notes"
                            style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <FaEye /> Edit
                          </button>
                          {lead.status !== 'converted' && (
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setConvertPlan({ subscriptionPlan: 'starter', monthlyPrice: 29, geminiTokensLimit: 10000 });
                                setShowConvertLeadModal(true);
                              }}
                              className="action-btn"
                              title="Convert to client account"
                              style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <FaCrown /> Convert
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLead(lead._id)}
                            className="action-btn"
                            title="Delete Lead"
                            style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="modal-overlay" onClick={() => setShowAddLeadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New CRM Lead</h2>
              <button onClick={() => setShowAddLeadModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      required
                      value={newLead.businessName}
                      onChange={(e) => setNewLead({...newLead, businessName: e.target.value})}
                      placeholder="e.g. FitFuel Apparel"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website URL</label>
                    <input
                      type="text"
                      value={newLead.websiteUrl}
                      onChange={(e) => setNewLead({...newLead, websiteUrl: e.target.value})}
                      placeholder="e.g. https://fitfuel.com"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={newLead.name}
                      onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                      placeholder="e.g. Samarth Owner"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Source</label>
                    <select
                      value={newLead.source}
                      onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      <option value="other">Other</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="builtwith">BuiltWith</option>
                      <option value="google_maps">Google Maps</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                      placeholder="e.g. contact@fitfuel.com"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (WhatsApp)</label>
                    <input
                      type="text"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                      placeholder="e.g. 918128420287"
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Next Follow-Up Reminder (Date)</label>
                  <input
                    type="date"
                    value={newLead.remindAt}
                    onChange={(e) => setNewLead({...newLead, remindAt: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Sales Notes / Outreach History</label>
                  <textarea
                    rows="3"
                    value={newLead.notes}
                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                    placeholder="Enter details about their current support pain points, channels used, etc."
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary">
                    Create Lead
                  </button>
                  <button type="button" onClick={() => setShowAddLeadModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && selectedLead && (
        <div className="modal-overlay" onClick={() => setShowEditLeadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Prospect: {selectedLead.businessName}</h2>
              <button onClick={() => setShowEditLeadModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateLead}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      required
                      value={selectedLead.businessName}
                      onChange={(e) => setSelectedLead({...selectedLead, businessName: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website URL</label>
                    <input
                      type="text"
                      value={selectedLead.websiteUrl || ''}
                      onChange={(e) => setSelectedLead({...selectedLead, websiteUrl: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={selectedLead.name}
                      onChange={(e) => setSelectedLead({...selectedLead, name: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => setSelectedLead({...selectedLead, status: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="followed_up">Followed Up</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={selectedLead.email || ''}
                      onChange={(e) => setSelectedLead({...selectedLead, email: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (WhatsApp)</label>
                    <input
                      type="text"
                      value={selectedLead.phone || ''}
                      onChange={(e) => setSelectedLead({...selectedLead, phone: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Source</label>
                    <select
                      value={selectedLead.source}
                      onChange={(e) => setSelectedLead({...selectedLead, source: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      <option value="other">Other</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="builtwith">BuiltWith</option>
                      <option value="google_maps">Google Maps</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Next Follow-Up Reminder</label>
                    <input
                      type="date"
                      value={selectedLead.remindAt ? new Date(selectedLead.remindAt).toISOString().split('T')[0] : ''}
                      onChange={(e) => setSelectedLead({...selectedLead, remindAt: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Sales Notes / Outreach History</label>
                  <textarea
                    rows="3"
                    value={selectedLead.notes || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setShowEditLeadModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead Modal */}
      {showConvertLeadModal && selectedLead && (
        <div className="modal-overlay" onClick={() => setShowConvertLeadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Convert to Customer: {selectedLead.businessName}</h2>
              <button onClick={() => setShowConvertLeadModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleConvertLead}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6', textAlign: 'left' }}>
                  This will register a new merchant workspace under the email: <strong style={{ color: '#fafafa' }}>{selectedLead.email}</strong>, generate their secure credentials, and send their onboarding setup details via both Email and WhatsApp instantly.
                </p>

                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label>Subscription Plan</label>
                  <select
                    value={convertPlan.subscriptionPlan}
                    onChange={(e) => setConvertPlan({...convertPlan, subscriptionPlan: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <option value="starter">Starter Plan</option>
                    <option value="professional">Professional Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                    <option value="custom">Custom Quotas Plan</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left' }}>
                  <div className="form-group">
                    <label>Monthly Price ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={convertPlan.monthlyPrice}
                      onChange={(e) => setConvertPlan({...convertPlan, monthlyPrice: Number(e.target.value)})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Gemini Tokens Limit/Month</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={convertPlan.geminiTokensLimit}
                      onChange={(e) => setConvertPlan({...convertPlan, geminiTokensLimit: Number(e.target.value)})}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '24px' }}>
                  <button type="submit" className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}>
                    Confirm Conversion & Send Welcomes
                  </button>
                  <button type="button" onClick={() => setShowConvertLeadModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsCRM;
