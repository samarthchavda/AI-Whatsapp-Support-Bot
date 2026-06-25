import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaHeartbeat, 
  FaArrowLeft 
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

  // Connection Health states
  const getHealthStatusBadgeStyle = (status) => {
    if (status === 'connected') {
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#059669' };
    }
    if (status === 'disconnected') {
      return { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' };
    }
    return { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
  };

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [verifyingHealthId, setVerifyingHealthId] = useState(null);
  const [alertingHealthId, setAlertingHealthId] = useState(null);

  const fetchHealthData = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setHealthLoading(true);
      const res = await axios.get(`${API_BASE}/super-admin/health/connections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHealthData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching health connections:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleVerifyConnection = async (userId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setVerifyingHealthId(userId);
      const res = await axios.post(`${API_BASE}/super-admin/users/${userId}/verify-whatsapp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchHealthData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to verify connection');
    } finally {
      setVerifyingHealthId(null);
    }
  };

  const handleAlertOffline = async (userId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setAlertingHealthId(userId);
      const res = await axios.post(`${API_BASE}/super-admin/users/${userId}/alert-health-offline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send alert notification');
    } finally {
      setAlertingHealthId(null);
    }
  };

  if (healthLoading && !healthData) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fafafa'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

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
            <FaHeartbeat className="heartbeat-icon" style={{ color: '#10b981' }} />
            Connection Health Monitor
          </h1>
          <p className="page-subtitle">Real-time status check for active merchant integrations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Health summary stats */}
        {healthData && healthData.summary && (
          <div className="analytics-cards">
            <div className="stat-card bots">
              <div className="stat-icon"><FaHeartbeat style={{ color: '#10b981' }} /></div>
              <div className="stat-info">
                <h3>Healthy Connections</h3>
                <p className="stat-value">{healthData.summary.healthy}</p>
                <small>Active & responding</small>
              </div>
            </div>
            <div className="stat-card messages">
              <div className="stat-icon"><FaHeartbeat style={{ color: '#ef4444' }} /></div>
              <div className="stat-info">
                <h3>Offline Connections</h3>
                <p className="stat-value">{healthData.summary.offline}</p>
                <small>Need attention</small>
              </div>
            </div>
            <div className="stat-card users">
              <div className="stat-icon"><FaHeartbeat style={{ color: '#71717a' }} /></div>
              <div className="stat-info">
                <h3>Unconfigured</h3>
                <p className="stat-value">{healthData.summary.unconfigured}</p>
                <small>No credentials linked</small>
              </div>
            </div>
          </div>
        )}

        {/* Health details table */}
        <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
          <div className="table-header-premium super-admin-table-header">
            <h2>⚕️ Merchant Integration Monitor</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {healthLoading ? (
              <div style={{ color: '#71717a', textAlign: 'center', padding: '20px' }}>Refreshing health data...</div>
            ) : !healthData || healthData.merchants.length === 0 ? (
              <div style={{ color: '#71717a', textAlign: 'center', padding: '20px' }}>No merchants registered yet.</div>
            ) : (
              <div className="table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Phone ID</th>
                      <th>Business Account ID</th>
                      <th>Status</th>
                      <th>Last Verified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthData.merchants.map(merchant => (
                      <tr key={merchant._id}>
                        <td>
                          <div className="user-info-cell">
                            <span className="user-info-name">{merchant.name}</span>
                            <span className="user-info-email">{merchant.email}</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{merchant.whatsappPhoneNumberId || 'N/A'}</span></td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{merchant.whatsappBusinessAccountId || 'N/A'}</span></td>
                        <td>
                          <span 
                            className="status-badge-pill"
                            style={{ 
                              ...getHealthStatusBadgeStyle(merchant.status),
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}
                          >
                            {merchant.status === 'connected' ? 'Healthy' : merchant.status === 'disconnected' ? 'Offline' : 'Unconfigured'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {merchant.whatsappConnectedAt ? new Date(merchant.whatsappConnectedAt).toLocaleString() : 'Never'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-primary"
                              onClick={() => handleVerifyConnection(merchant._id)}
                              disabled={verifyingHealthId === merchant._id || merchant.status === 'unconfigured'}
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {verifyingHealthId === merchant._id ? 'Verifying...' : 'Verify'}
                            </button>
                            <button
                              className="btn-secondary btn-danger"
                              onClick={() => handleAlertOffline(merchant._id)}
                              disabled={alertingHealthId === merchant._id || merchant.status !== 'disconnected'}
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', background: merchant.status === 'disconnected' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: '#fff', border: 'none' }}
                            >
                              {alertingHealthId === merchant._id ? 'Alerting...' : 'Alert User'}
                            </button>
                          </div>
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
