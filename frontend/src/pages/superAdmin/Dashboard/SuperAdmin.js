import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  FaUsers,
  FaRupeeSign,
  FaRobot,
  FaComments,
  FaCrown,
  FaSearch,
  FaUserPlus,
  FaHistory,
  FaDatabase,
  FaDownload,
  FaUpload,
  FaCoins,
  FaGlobe,
  FaChartLine
} from 'react-icons/fa';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getSuperAdminUsers, getSuperAdminAnalytics } from '../../../services/api';
import './SuperAdmin.css';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

function SuperAdmin() {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    subscriptionPlan: 'starter',
    subscriptionStatus: 'trial',
    monthlyPrice: 1499,
    geminiTokensLimit: 50000,
    webBotEnabled: false,
  });

  const [activeTab, setActiveTab] = useState('merchants');
  const [auditLogs, setAuditLogs] = useState([]);
  const [dbFile, setDbFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [trafficData, setTrafficData] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  // Socket listener for live audit logs
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) return;

    const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5001' : '/');
    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('🔌 Connected to live audit log socket stream');
      const connectionLog = {
        _id: 'local_' + Math.random(),
        createdAt: new Date(),
        actorEmail: 'SYSTEM (LOCAL)',
        action: 'socket_connected',
        target: 'Event Server Stream',
        details: { message: 'Successfully connected to backend real-time event pipeline.' }
      };
      setAuditLogs(prev => [connectionLog, ...prev].slice(0, 100));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      const errorLog = {
        _id: 'local_' + Math.random(),
        createdAt: new Date(),
        actorEmail: 'SYSTEM (LOCAL)',
        action: 'network_error',
        target: 'Server Gateway',
        details: { message: `Connection failed: ${error.message}. Checking backup connection...` }
      };
      setAuditLogs(prev => [errorLog, ...prev].slice(0, 100));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      const disconnectLog = {
        _id: 'local_' + Math.random(),
        createdAt: new Date(),
        actorEmail: 'SYSTEM (LOCAL)',
        action: 'connection_lost',
        target: 'Socket.io Stream',
        details: { message: `Disconnected from live event stream. Reason: ${reason}` }
      };
      setAuditLogs(prev => [disconnectLog, ...prev].slice(0, 100));
    });

    socket.on('audit_log', (newLog) => {
      setAuditLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, analyticsRes] = await Promise.all([
        getSuperAdminUsers(),
        getSuperAdminAnalytics()
      ]);

      setUsers(usersRes.data.data);
      setAnalytics(analyticsRes.data.data);



      // Fetch audit logs
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const logsRes = await axios.get(`${API_BASE}/super-admin/audit-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (logsRes.data.success) {
          const rawData = logsRes.data.data;
          setAuditLogs(Array.isArray(rawData) ? rawData : (rawData?.logs || []));
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Super admin privileges required.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'traffic' && !trafficData) {
      fetchTrafficData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchTrafficData = async () => {
    try {
      setTrafficLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const res = await axios.get(`${API_BASE}/super-admin/traffic-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTrafficData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching traffic data:', err);
    } finally {
      setTrafficLoading(false);
    }
  };








  const handleAddUser = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `${API_BASE}/super-admin/users`,
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Merchant created successfully!');
      setShowAddUserModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        subscriptionPlan: 'starter',
        subscriptionStatus: 'trial',
        monthlyPrice: 1499,
        geminiTokensLimit: 50000,
        webBotEnabled: false,
        shopifyEnabled: true,
        woocommerceEnabled: true
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create merchant');
    }
  };

  const getPlanBadgeStyle = (plan) => {
    const styles = {
      starter: { background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' },
      professional: { background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' },
      enterprise: { background: 'rgba(236, 72, 153, 0.1)', color: '#db2777' },
      custom: { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }
    };
    return styles[plan] || { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      active: { background: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
      trial: { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' },
      inactive: { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' },
      cancelled: { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }
    };
    return styles[status] || { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
  };

  const getRoleBadgeStyle = (role) => {
    const styles = {
      super_admin: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
      admin: { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
      manager: { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
      agent: { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
    };
    return styles[role] || { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
  };




  const handleBackupDownload = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await axios({
        url: `${API_BASE}/super-admin/db/backup`,
        method: 'GET',
        responseType: 'blob', // Important
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create file download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `db_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      alert('Database backup downloaded successfully!');
    } catch (err) {
      alert('Failed to download database backup');
      console.error(err);
    }
  };

  const handleRestoreUpload = async (e) => {
    e.preventDefault();
    if (!dbFile) {
      alert('Please select a database backup file first');
      return;
    }

    if (!window.confirm('⚠️ WARNING: Restoring will overwrite existing database records! Are you absolutely sure?')) {
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('file', dbFile);

    try {
      setRestoring(true);
      const res = await axios.post(
        `${API_BASE}/super-admin/db/restore`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      if (res.data.success) {
        alert('Database restored successfully! Refreshing data...');
        setDbFile(null);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore database');
      console.error(err);
    } finally {
      setRestoring(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.businessName?.toLowerCase().includes(q) ||
        u.subscriptionPlan?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading super admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title">
            <FaCrown className="crown-icon" />
            Super Admin
          </h1>
          <p className="page-subtitle">Platform overview, merchant management, and revenue analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate('/dashboard/super-admin/budget')}
            style={{
              background: 'rgba(39, 39, 42, 0.6)',
              border: '1px solid rgba(63, 63, 70, 0.5)',
              color: '#fafafa',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <FaCoins /> Gemini Budget
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowAddUserModal(true)}
          >
            <FaUserPlus /> Add Merchant
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="super-admin-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('merchants')}
          className={`tab-btn ${activeTab === 'merchants' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'merchants' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'merchants' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaUsers /> Merchants
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'terminal' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'terminal' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaHistory /> Live Event Terminal
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'database' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'database' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaDatabase /> Database Manager
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`tab-btn ${activeTab === 'traffic' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'traffic' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderBottom: activeTab === 'traffic' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaGlobe /> Website Traffic
        </button>
      </div>

      {activeTab === 'merchants' && (
        <>
          {/* Global Analytics Cards */}
          {analytics && (
            <div className="analytics-cards">
              <div className="stat-card revenue">
                <div className="stat-icon">
                  <FaRupeeSign />
                </div>
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">₹{analytics.totalRevenue}</p>
                  <small>Monthly recurring revenue</small>
                </div>
              </div>

              <div className="stat-card bots">
                <div className="stat-icon">
                  <FaRobot />
                </div>
                <div className="stat-info">
                  <h3>Active Bots</h3>
                  <p className="stat-value">{analytics.totalActiveBots}</p>
                  <small>WhatsApp connections</small>
                </div>
              </div>

              <div className="stat-card messages">
                <div className="stat-icon">
                  <FaComments />
                </div>
                <div className="stat-info">
                  <h3>Total Messages</h3>
                  <p className="stat-value">{analytics.totalMessagesProcessed.toLocaleString()}</p>
                  <small>Across all clients</small>
                </div>
              </div>

              <div className="stat-card users">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <h3>Total Merchants</h3>
                  <p className="stat-value">{analytics.totalUsers}</p>
                  <small>{analytics.recentSignups} new this week</small>
                </div>
              </div>
            </div>
          )}

          <div className="table-container-premium super-admin-table">
            <div className="table-header-premium super-admin-table-header">
              <h2><FaUsers /> All Merchants ({filteredUsers.length})</h2>
              <div className="super-admin-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search merchants..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Role</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Revenue</th>
                    <th>Token Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="super-admin-empty">
                        No merchants found matching &quot;{userSearch}&quot;
                      </td>
                    </tr>
                  ) : filteredUsers.map((user) => {
                    const finalPrice = user.monthlyPrice - (user.monthlyPrice * user.customDiscount / 100);
                    const tokenPercentage = user.geminiTokensLimit > 0
                      ? Math.round((user.geminiTokensUsed / user.geminiTokensLimit) * 100)
                      : 0;

                    return (
                      <tr
                        key={user._id}
                        onClick={() => navigate(`/dashboard/super-admin/user/${user._id}`)}
                        className="clickable-row"
                        style={{ cursor: 'pointer' }}
                        title="Click to view details & actions"
                      >
                        <td>
                          <div className="user-info-cell">
                            <span className="user-info-name">{user.name}</span>
                            <span className="user-info-email">{user.email}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="role-badge-pill"
                            style={{
                              ...getRoleBadgeStyle(user.role || 'admin'),
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}
                          >
                            {user.role === 'super_admin' ? 'Super Admin' : (user.role || 'Admin')}
                          </span>
                        </td>
                        <td>
                          <span
                            className="plan-badge-pill"
                            style={{
                              ...getPlanBadgeStyle(user.subscriptionPlan),
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}
                          >
                            {user.subscriptionPlan}
                          </span>
                        </td>
                        <td>
                          <span
                            className="status-badge-pill"
                            style={{
                              ...getStatusBadgeStyle(user.subscriptionStatus),
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}
                          >
                            {user.subscriptionStatus}
                          </span>
                        </td>
                        <td>
                          <div className="revenue-cell">
                            <strong className="revenue-amount">₹{finalPrice}</strong>
                            {user.customDiscount > 0 && (
                              <span className="discount-applied">-{user.customDiscount}%</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="token-usage-bar">
                            <div className="token-usage-track">
                              <div
                                className={`token-usage-fill ${tokenPercentage > 80 ? 'high' : ''}`}
                                style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="token-usage-text">
                              {user.geminiTokensLimit === -1 || user.geminiTokensLimit === Infinity
                                ? `Unlimited · ${user.geminiTokensUsed?.toLocaleString() || 0} used`
                                : `${tokenPercentage}% · ${user.geminiTokensUsed?.toLocaleString() || 0} used`
                              }
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


        </>
      )}

      {activeTab === 'terminal' && (
        <div className="table-container-premium super-admin-table">
          <div className="table-header-premium super-admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>🖥️ Live System Event Terminal</h2>
            <small style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              Socket Connection Active
            </small>
          </div>
          <div style={{ padding: '24px', background: '#09090b', borderRadius: '0 0 16px 16px', fontFamily: 'Courier New, monospace' }}>
            <div className="terminal-logs-window" style={{
              height: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              color: '#38bdf8',
              textAlign: 'left',
              fontSize: '13px'
            }}>
              {auditLogs.length === 0 ? (
                <div style={{ color: '#71717a' }}>No system events logged yet...</div>
              ) : auditLogs.map((log) => {
                const dateStr = new Date(log.createdAt).toLocaleString();
                let logColor = '#34d399'; // default green
                if (log.action.includes('delete') || log.action.includes('revoke') || log.action.includes('suspend') || log.action.includes('deactivate') || log.action.includes('error') || log.action.includes('lost')) {
                  logColor = '#f87171'; // red
                } else if (log.action.includes('impersonate') || log.action.includes('restore') || log.action.includes('backup') || log.action.includes('disconnect') || log.action.includes('connection_lost')) {
                  logColor = '#fbbf24'; // orange/amber
                }

                return (
                  <div key={log._id || Math.random()} style={{ borderBottom: '1px dashed #27272a', paddingBottom: '8px' }}>
                    <span style={{ color: '#71717a', marginRight: '8px' }}>[{dateStr}]</span>
                    <span style={{ color: '#fb7185', fontWeight: 'bold', marginRight: '8px' }}>{log.actorEmail}</span>
                    <span style={{ color: '#f472b6', marginRight: '8px' }}>performed</span>
                    <span style={{ color: logColor, fontWeight: 'bold', marginRight: '8px' }}>{log.action.toUpperCase()}</span>
                    {log.target && (
                      <>
                        <span style={{ color: '#71717a', marginRight: '8px' }}>on</span>
                        <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{log.target}</span>
                      </>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div style={{ color: '#a1a1aa', paddingLeft: '24px', fontSize: '11px', marginTop: '4px' }}>
                        Details: {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
            <div className="table-header-premium super-admin-table-header">
              <h2>💾 Export Database Backup</h2>
            </div>
            <div style={{ padding: '24px', textAlign: 'left' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                Download a complete, portable backup of all platform collections (Admins, Conversations, Orders, Broadcasts, AILogs, GlobalSettings, AuditLogs) in structured JSON format.
              </p>
              <button
                onClick={handleBackupDownload}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
              >
                <FaDownload /> Download JSON Backup
              </button>
            </div>
          </div>

          <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
            <div className="table-header-premium super-admin-table-header">
              <h2>⚠️ Restore Database Backup</h2>
            </div>
            <div style={{ padding: '24px', textAlign: 'left' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                Restore the database from a backup JSON file. Warning: This will completely replace existing system records. This action is destructive and irreversible.
              </p>
              <form onSubmit={handleRestoreUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  border: '2px dashed var(--border-default)',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.15)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setDbFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="db-restore-file"
                  />
                  <label htmlFor="db-restore-file" style={{ cursor: 'pointer', display: 'block' }}>
                    <FaUpload style={{ fontSize: '28px', color: 'var(--accent)', marginBottom: '8px' }} />
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: dbFile ? '#fafafa' : '#71717a' }}>
                      {dbFile ? dbFile.name : 'Select database backup (.json)'}
                    </span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn-primary btn-danger"
                  disabled={restoring || !dbFile}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}
                >
                  {restoring ? 'Restoring Database...' : 'Restore JSON Backup'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'traffic' && (
        <div className="traffic-analytics-tab">
          {trafficLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              Loading traffic data...
            </div>
          ) : !trafficData ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
              No traffic data found. Visit the landing page to trigger views!
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="analytics-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaGlobe />
                  </div>
                  <div className="stat-info">
                    <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Total Pageviews</h3>
                    <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{trafficData.totalVisits.toLocaleString()}</p>
                    <small style={{ color: 'var(--text-secondary)' }}>Last 30 days</small>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaUsers />
                  </div>
                  <div className="stat-info">
                    <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Unique Visitors</h3>
                    <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{trafficData.uniqueVisitors.toLocaleString()}</p>
                    <small style={{ color: 'var(--text-secondary)' }}>Unique IP addresses</small>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaChartLine />
                  </div>
                  <div className="stat-info">
                    <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Top Page</h3>
                    <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={trafficData.topPages[0]?.page || 'N/A'}>
                      {trafficData.topPages[0]?.page || 'N/A'}
                    </p>
                    <small style={{ color: 'var(--text-secondary)' }}>{trafficData.topPages[0]?.count || 0} visits</small>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="chart-container" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Website Pageviews (Last 30 Days)</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trafficData.dailyVisits}>
                    <defs>
                      <linearGradient id="trafficColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.3)" />
                    <XAxis dataKey="day" stroke="#a1a1aa" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#a1a1aa" style={{ fontSize: '12px' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#18181b', 
                        border: '1px solid #3f3f46', 
                        borderRadius: '8px',
                        color: '#fafafa'
                      }} 
                    />
                    <Area type="monotone" dataKey="count" name="Pageviews" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#trafficColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tables */}
              <div className="traffic-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Top Pages Table */}
                <div className="table-container-premium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Top Visited Pages</h3>
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Page Path</th>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>Pageviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.topPages.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No page visits tracked yet.</td>
                          </tr>
                        ) : (
                          trafficData.topPages.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(63, 63, 70, 0.2)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.page}</td>
                              <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600' }}>{item.count.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Referrers Table */}
                <div className="table-container-premium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Top Referral Sources</h3>
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Referrer</th>
                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.topReferrers.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No referrer data available.</td>
                          </tr>
                        ) : (
                          trafficData.topReferrers.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(63, 63, 70, 0.2)' }}>
                              <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-primary)' }}>{item.referrer}</td>
                              <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600' }}>{item.count.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}



      {/* Add Merchant Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Merchant</h2>
              <button onClick={() => setShowAddUserModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    minLength="6"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={newUser.role || 'admin'}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="admin">Admin (Merchant Owner)</option>
                    <option value="super_admin">Super Admin (Platform Owner)</option>
                  </select>
                </div>

                {/* Condition: Hide all merchant details for Super Admins */}
                {newUser.role !== 'super_admin' && (
                  <>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label>Subscription Plan</label>
                        <select
                          value={newUser.subscriptionPlan}
                          onChange={(e) => {
                            const plan = e.target.value;
                            let price = 1499;
                            let tokens = 50000;
                            if (plan === 'professional') { price = 2999; tokens = 200000; }
                            if (plan === 'enterprise') { price = 9999; tokens = -1; }
                            setNewUser({ ...newUser, subscriptionPlan: plan, monthlyPrice: price, geminiTokensLimit: tokens });
                          }}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="starter">Starter</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Status</label>
                        <select
                          value={newUser.subscriptionStatus}
                          onChange={(e) => setNewUser({ ...newUser, subscriptionStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label>Monthly Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={newUser.monthlyPrice}
                          onChange={(e) => setNewUser({ ...newUser, monthlyPrice: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label>Gemini Tokens/Month</label>
                        <input
                          type="number"
                          min="0"
                          value={newUser.geminiTokensLimit}
                          onChange={(e) => setNewUser({ ...newUser, geminiTokensLimit: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>



                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <input
                        type="checkbox"
                        id="shopifyEnabled"
                        checked={newUser.shopifyEnabled}
                        onChange={(e) => setNewUser({ ...newUser, shopifyEnabled: e.target.checked })}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: '#10b981',
                          cursor: 'pointer'
                        }}
                      />
                      <label htmlFor="shopifyEnabled" style={{ cursor: 'pointer', fontSize: '14px', margin: 0, color: '#fafafa' }}>
                        Enable Shopify Integration
                      </label>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <input
                        type="checkbox"
                        id="woocommerceEnabled"
                        checked={newUser.woocommerceEnabled}
                        onChange={(e) => setNewUser({ ...newUser, woocommerceEnabled: e.target.checked })}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: '#10b981',
                          cursor: 'pointer'
                        }}
                      />
                      <label htmlFor="woocommerceEnabled" style={{ cursor: 'pointer', fontSize: '14px', margin: 0, color: '#fafafa' }}>
                        Enable WooCommerce Integration
                      </label>
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button type="submit" className="btn-primary">
                    Create User
                  </button>
                  <button type="button" onClick={() => setShowAddUserModal(false)} className="btn-secondary">
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

export default SuperAdmin;
