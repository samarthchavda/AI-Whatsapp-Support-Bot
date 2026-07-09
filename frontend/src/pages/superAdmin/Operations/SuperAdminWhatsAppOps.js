import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { 
  FaWhatsapp, 
  FaSearch, 
  FaEye, 
  FaComments,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminWhatsAppOps() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWhatsAppOpsData();
  }, []);

  const fetchWhatsAppOpsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/whatsapp-monitoring');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching WhatsApp operations data:', err);
      setError(err.response?.data?.error || 'Failed to load WhatsApp operations data');
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
        m.email.toLowerCase().includes(q) ||
        (m.businessPhone && m.businessPhone.includes(q)) ||
        (m.whatsappBusinessAccountId && m.whatsappBusinessAccountId.includes(q))
    );
  }, [data, searchQuery]);

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading WhatsApp operations status...
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
          <button onClick={fetchWhatsAppOpsData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalAccounts: 0, connectedAccounts: 0, disconnectedAccounts: 0, totalMessages: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaWhatsapp className="whatsapp-icon" style={{ color: '#25d366' }} />
            WhatsApp Operations
          </h1>
          <p className="page-subtitle">Platform-wide WhatsApp connections monitoring and message usage metrics</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaWhatsapp />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Accounts</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalAccounts}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Configured merchants</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Connected</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.connectedAccounts}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Active chatbots</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaTimesCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Disconnected</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#ef4444' }}>{summary.disconnectedAccounts}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Action required</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaComments />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Messages</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalMessages.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Processed by AI</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaWhatsapp /> Merchant Connections ({filteredMerchants.length})</h2>
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
                <th>Phone Number</th>
                <th>Connection Status</th>
                <th>WABA ID</th>
                <th>Total Messages</th>
                <th>Last Connected/Updated</th>
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
                      <strong>{merchant.businessPhone || 'Not available'}</strong>
                    </td>
                    <td>
                      <span className={merchant.whatsappConnected ? 'status-connected' : 'status-disconnected'}>
                        {merchant.whatsappConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{merchant.whatsappBusinessAccountId || 'Not available'}</code>
                    </td>
                    <td>
                      <strong>{(merchant.totalMessagesProcessed || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      {merchant.whatsappConnectedAt 
                        ? new Date(merchant.whatsappConnectedAt).toLocaleString() 
                        : (merchant.updatedAt ? new Date(merchant.updatedAt).toLocaleDateString() : 'Not available')}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/dashboard/super-admin/user/${merchant._id}?tab=whatsapp`)}
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

export default SuperAdminWhatsAppOps;
