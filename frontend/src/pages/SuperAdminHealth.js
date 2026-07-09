import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaHeartbeat, 
  FaArrowLeft,
  FaDatabase,
  FaServer,
  FaWhatsapp,
  FaBrain,
  FaShoppingBag,
  FaTimesCircle,
  FaInfoCircle
} from 'react-icons/fa';
import './SuperAdmin.css'; // Reuse existing glassmorphic SuperAdmin styles

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');

function SuperAdminHealth() {
  const navigate = useNavigate();
  const storedAdmin = localStorage.getItem('admin');
  const admin = storedAdmin ? JSON.parse(storedAdmin) : null;

  // Protect route
  useEffect(() => {
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [admin?.role, navigate]);

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealthData = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/super-admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHealthData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
      setError(err.response?.data?.error || 'Failed to load system health metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const getStatusBadgeStyle = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'operational') {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
    }
    if (s === 'degraded') {
      return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    }
    if (s === 'down') {
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
    }
    return { background: 'var(--border-subtle)', color: 'var(--text-secondary)' };
  };

  if (loading && !healthData) {
    return (
      <div className="container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading System Health metrics...
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
          <button onClick={fetchHealthData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { system, services, recentErrors } = healthData || {
    system: {}, services: {}, recentErrors: []
  };

  return (
    <div className="container super-admin-page">
      {/* Header and Back Button */}
      <div className="page-header super-admin-header" style={{ marginBottom: '28px' }}>
        <div>
          <button 
            onClick={() => navigate('/dashboard/super-admin')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              padding: 0,
              marginBottom: '12px'
            }}
          >
            <FaArrowLeft /> Back to Super Admin
          </button>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaHeartbeat className="heartbeat-icon" style={{ color: '#ef4444' }} />
            System Health
          </h1>
          <p className="page-subtitle">Real-time monitoring of backend API performance, resources, database state, and linked external services</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* KPI Cards */}
        <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaHeartbeat />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>API Status</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{system.backendStatus}</p>
              <small style={{ color: 'var(--text-secondary)' }}>Express instance</small>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaDatabase />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Database Status</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: system.databaseStatus === 'Operational' ? '#10b981' : '#ef4444' }}>{system.databaseStatus}</p>
              <small style={{ color: 'var(--text-secondary)' }}>MongoDB cluster</small>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaServer />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Memory Usage</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{system.memoryUsage}</p>
              <small style={{ color: 'var(--text-secondary)' }}>Node heap allocation</small>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaInfoCircle />
            </div>
            <div className="stat-info">
              <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Process Uptime</h3>
              <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{system.uptime}</p>
              <small style={{ color: 'var(--text-secondary)' }}>Continuous runtime</small>
            </div>
          </div>
        </div>

        {/* Detailed Status Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Server Resources */}
          <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
            <div className="table-header-premium super-admin-table-header">
              <h2><FaServer /> Host Resources</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Server Status</span>
                  <span style={{ fontWeight: '600', color: '#10b981' }}>{system.serverStatus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Load (Average / CPU)</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{system.cpuUsage}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Physical Memory</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{system.systemMemory}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Engine Process ID</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{system.pid || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* External Services */}
          <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
            <div className="table-header-premium super-admin-table-header">
              <h2><FaHeartbeat /> Service Integrations</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <FaDatabase style={{ color: '#10b981', fontSize: '14px' }} /> MongoDB Database
                  </span>
                  <span className="badge" style={getStatusBadgeStyle(services.mongodb)}>{services.mongodb}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <FaWhatsapp style={{ color: '#25d366', fontSize: '14px' }} /> WhatsApp/Meta API
                  </span>
                  <span className="badge" style={getStatusBadgeStyle(services.whatsapp)}>{services.whatsapp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <FaBrain style={{ color: '#a78bfa', fontSize: '14px' }} /> AI/Gemini Service
                  </span>
                  <span className="badge" style={getStatusBadgeStyle(services.gemini)}>{services.gemini}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <FaShoppingBag style={{ color: '#38bdf8', fontSize: '14px' }} /> Shopify Sync
                  </span>
                  <span className="badge" style={getStatusBadgeStyle(services.shopify)}>{services.shopify}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <FaShoppingBag style={{ color: '#6366f1', fontSize: '14px' }} /> WooCommerce Sync
                  </span>
                  <span className="badge" style={getStatusBadgeStyle(services.woocommerce)}>{services.woocommerce}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Integration Errors section */}
        <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
          <div className="table-header-premium super-admin-table-header">
            <h2>⚠️ Recent System & Webhook Errors</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {recentErrors.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No active integration or system delivery errors detected. Everything is healthy!
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Integration Source</th>
                      <th>Event Triggered</th>
                      <th>Linked Order ID</th>
                      <th>Reported Failure Reason</th>
                      <th>Logged At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentErrors.map(err => (
                      <tr key={err._id}>
                        <td>
                          <span className="role-badge-pill" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                            {err.source}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {err.eventType}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                            {err.externalOrderId}
                          </span>
                        </td>
                        <td style={{ color: '#ef4444', fontWeight: '500', maxWidth: '300px', wordBreak: 'break-all' }}>
                          {err.error}
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {new Date(err.createdAt).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminHealth;
