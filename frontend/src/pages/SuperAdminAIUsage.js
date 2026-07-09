import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FaBrain, 
  FaSearch, 
  FaEye, 
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartBar
} from 'react-icons/fa';
import './SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminAIUsage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAIUsageData();
  }, []);

  const fetchAIUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/ai-usage');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching AI Usage data:', err);
      setError(err.response?.data?.error || 'Failed to load AI Usage data');
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
          Loading AI Usage metrics...
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
          <button onClick={fetchAIUsageData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data || {
    summary: { totalUsed: 0, totalLimit: 0, avgUsagePct: 0, nearLimitCount: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaBrain className="ai-usage-title-icon" style={{ color: '#a78bfa' }} />
            AI Usage Monitoring
          </h1>
          <p className="page-subtitle">Platform-wide overview of Gemini AI token consumption, allocations, and limit compliance</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaBrain />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total AI Tokens Used</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalUsed.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Gemini token usage</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaChartBar />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Token Limit</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalLimit.toLocaleString()}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Excludes unlimited accounts</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Average Usage</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.avgUsagePct}%</p>
            <small style={{ color: 'var(--text-secondary)' }}>Across limited merchants</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Near Limit</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#ef4444' }}>{summary.nearLimitCount}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Usage exceeds 80%</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaBrain /> Merchant AI Usage ({filteredMerchants.length})</h2>
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
                <th>Tokens Used</th>
                <th>Token Limit</th>
                <th>Remaining</th>
                <th>Usage %</th>
                <th>Status</th>
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
                filteredMerchants.map((merchant) => {
                  const isUnlimited = merchant.geminiTokensLimit === -1 || merchant.geminiTokensLimit === Infinity;
                  return (
                    <tr key={merchant._id}>
                      <td>
                        <div className="user-info-cell">
                          <span className="user-info-name">{merchant.name}</span>
                          <span className="user-info-email">{merchant.email}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{merchant.geminiTokensUsed.toLocaleString()}</strong>
                      </td>
                      <td>
                        <span>{isUnlimited ? 'Unlimited' : merchant.geminiTokensLimit.toLocaleString()}</span>
                      </td>
                      <td>
                        <span style={{ color: !isUnlimited && merchant.remaining < 5000 ? '#ef4444' : 'inherit', fontWeight: !isUnlimited && merchant.remaining < 5000 ? '600' : 'normal' }}>
                          {isUnlimited ? 'Unlimited' : merchant.remaining.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${isUnlimited ? 0 : Math.min(merchant.usagePct, 100)}%`, 
                                background: merchant.status === 'Critical' ? '#ef4444' : merchant.status === 'Warning' ? '#f59e0b' : '#10b981'
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '12px', minWidth: '32px', textAlign: 'right' }}>
                            {isUnlimited ? '0%' : `${merchant.usagePct}%`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            background: merchant.status === 'Critical' ? 'rgba(239, 68, 68, 0.15)' : merchant.status === 'Warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                            color: merchant.status === 'Critical' ? '#ef4444' : merchant.status === 'Warning' ? '#f59e0b' : '#10b981'
                          }}
                        >
                          {merchant.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/dashboard/super-admin/user/${merchant._id}?tab=ai-usage`)}
                          className="btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminAIUsage;
