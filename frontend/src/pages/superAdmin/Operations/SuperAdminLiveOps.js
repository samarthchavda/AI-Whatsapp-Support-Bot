import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { 
  FaComments, 
  FaSearch, 
  FaEye, 
  FaEnvelopeOpen,
  FaSignal,
  FaExclamationTriangle,
  FaTimesCircle
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminLiveOps() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLiveOpsData();
  }, []);

  const fetchLiveOpsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/live-operations');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching Live Operations data:', err);
      setError(err.response?.data?.error || 'Failed to load Live Operations data');
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = useMemo(() => {
    if (!data || !data.merchants) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.merchants;
    return data.merchants.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading Live Operations metrics...
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
          <button onClick={fetchLiveOpsData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalConversations: 0, totalMessages: 0, activeConversations: 0, escalatedConversations: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaComments className="live-ops-icon" style={{ color: 'var(--accent)' }} />
            Live Operations
          </h1>
          <p className="page-subtitle">Platform-wide overview of conversation sessions, message throughput, and customer escalations</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaComments />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Conversations</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalConversations.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>All-time sessions</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaEnvelopeOpen />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Messages</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalMessages.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Exchanged messages</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaSignal />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Active Sessions</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#3b82f6' }}>{summary.activeConversations.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Ongoing chatbots</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Escalated</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#f59e0b' }}>{summary.escalatedConversations.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Human handoffs</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaComments /> Merchant Live Operations ({filteredMerchants.length})</h2>
          <div className="super-admin-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Conversations</th>
                <th>Messages</th>
                <th>Active Conversations</th>
                <th>Escalations</th>
                <th>Last Activity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="super-admin-empty">
                    No merchants found matching &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant._id}>
                    <td>
                      <div className="user-info-cell">
                        <span className="user-info-name">{merchant.name}</span>
                        <span className="user-info-email">{merchant.email}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{(merchant.conversationsCount || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <strong>{(merchant.messagesCount || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: merchant.activeConversationsCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--border-subtle)', 
                          color: merchant.activeConversationsCount > 0 ? '#3b82f6' : 'var(--text-secondary)' 
                        }}
                      >
                        {merchant.activeConversationsCount} active
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: merchant.escalatedConversationsCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--border-subtle)', 
                          color: merchant.escalatedConversationsCount > 0 ? '#f59e0b' : 'var(--text-secondary)' 
                        }}
                      >
                        {merchant.escalatedConversationsCount} escalated
                      </span>
                    </td>
                    <td>
                      {merchant.lastActivity 
                        ? new Date(merchant.lastActivity).toLocaleString() 
                        : 'Not available'}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/dashboard/super-admin/user/${merchant._id}`)}
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
    </div>
  );
}

export default SuperAdminLiveOps;
