import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { 
  FaPlug, 
  FaSearch, 
  FaEye, 
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShoppingBag
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminIntegrationHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchIntegrationHealthData();
  }, []);

  const fetchIntegrationHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/integration-health');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching Integration Health data:', err);
      setError(err.response?.data?.error || 'Failed to load Integration Health data');
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
          Loading Integration Health metrics...
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
          <button onClick={fetchIntegrationHealthData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalShopify: 0, totalWoo: 0, activeIntegrations: 0, failedIntegrations: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaPlug className="integration-health-icon" style={{ color: '#38bdf8' }} />
            Integration Health
          </h1>
          <p className="page-subtitle">Platform-wide overview of e-commerce store sync connections, active webhooks, and channel statuses</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Shopify Connections</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalShopify}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Shopify shops</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaPlug />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>WooCommerce Connections</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalWoo}</p>
            <small style={{ color: 'var(--text-secondary)' }}>WooCommerce shops</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Connected (Active)</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.activeIntegrations}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Healthy syncing channels</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Failed/Disconnected</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#ef4444' }}>{summary.failedIntegrations}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Attention required</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaPlug /> Store Integrations Health ({filteredMerchants.length})</h2>
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
                <th>Shopify Status</th>
                <th>WooCommerce Status</th>
                <th>Last Sync</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="super-admin-empty">
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
                      <span 
                        className="badge" 
                        style={{ 
                          background: merchant.shopifyStatus === 'Active' ? 'rgba(16, 185, 129, 0.15)' : merchant.shopifyStatus === 'Inactive' ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-subtle)', 
                          color: merchant.shopifyStatus === 'Active' ? '#10b981' : merchant.shopifyStatus === 'Inactive' ? '#ef4444' : 'var(--text-secondary)' 
                        }}
                      >
                        {merchant.shopifyStatus}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: merchant.wooStatus === 'Active' ? 'rgba(16, 185, 129, 0.15)' : merchant.wooStatus === 'Inactive' ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-subtle)', 
                          color: merchant.wooStatus === 'Active' ? '#10b981' : merchant.wooStatus === 'Inactive' ? '#ef4444' : 'var(--text-secondary)' 
                        }}
                      >
                        {merchant.wooStatus}
                      </span>
                    </td>
                    <td>
                      {merchant.lastSync 
                        ? new Date(merchant.lastSync).toLocaleString() 
                        : 'Not available'}
                    </td>
                    <td>
                      <span className={merchant.status === 'Healthy' ? 'status-connected' : merchant.status === 'Issues' ? 'status-disconnected' : 'status-disabled'} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {merchant.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/dashboard/super-admin/user/${merchant._id}?tab=integrations`)}
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

export default SuperAdminIntegrationHealth;
