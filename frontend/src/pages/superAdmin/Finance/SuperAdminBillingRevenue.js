import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { 
  FaCoins, 
  FaSearch, 
  FaEye, 
  FaTimesCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaCrown
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminBillingRevenue() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBillingRevenueData();
  }, []);

  const fetchBillingRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/billing-revenue');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching Billing & Revenue data:', err);
      setError(err.response?.data?.error || 'Failed to load Billing & Revenue data');
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
          Loading Billing & Revenue metrics...
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
          <button onClick={fetchBillingRevenueData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalRevenue: 0, activeSubs: 0, trialMerchants: 0, expiredInactive: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaCoins className="billing-revenue-title-icon" style={{ color: '#fbbf24' }} />
            Billing & Revenue Monitoring
          </h1>
          <p className="page-subtitle">Platform-wide overview of subscriber plans, pricing calculations, trials, and total platform revenue</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCoins />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Revenue</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>
              ₹{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <small style={{ color: 'var(--text-secondary)' }}>Paid invoice sum</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCrown />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Active Subscriptions</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.activeSubs}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Paying subscribers</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCalendarAlt />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Trial Merchants</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#38bdf8' }}>{summary.trialMerchants}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Free trial status</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Expired/Inactive</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#ef4444' }}>{summary.expiredInactive}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Cancelled or unpaid</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaCoins /> Billing Registry ({filteredMerchants.length})</h2>
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
                <th>Plan</th>
                <th>Subscription Status</th>
                <th>Monthly Amount</th>
                <th>Trial/Expiry Date</th>
                <th>Billing Status</th>
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
                      <span className="role-badge-pill" style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                        {merchant.plan}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: merchant.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.15)' : merchant.subscriptionStatus === 'trial' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: merchant.subscriptionStatus === 'active' ? '#10b981' : merchant.subscriptionStatus === 'trial' ? '#38bdf8' : '#ef4444' 
                        }}
                      >
                        {merchant.subscriptionStatus}
                      </span>
                    </td>
                    <td>
                      <strong>₹{merchant.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td>
                      {merchant.expiryDate 
                        ? new Date(merchant.expiryDate).toLocaleDateString() 
                        : 'Not available'}
                    </td>
                    <td>
                      <span 
                        className={
                          merchant.billingStatus === 'Active' ? 'status-connected' : 
                          merchant.billingStatus === 'Trial' ? 'status-disabled' : 
                          'status-disconnected'
                        }
                        style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}
                      >
                        {merchant.billingStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/dashboard/super-admin/user/${merchant._id}?tab=subscription`)}
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

export default SuperAdminBillingRevenue;
