import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';
import { FaComments, FaBox, FaExclamationTriangle, FaCheckCircle, FaStar, FaArrowUp, FaArrowDown } from 'react-icons/fa';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening with your support bot today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Total Conversations</h3>
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FaComments />
            </div>
          </div>
          <div className="stat-value">{stats.conversations.total}</div>
          <div className="stat-change positive">
            <FaArrowUp /> <span>Active: {stats.conversations.active}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Total Orders</h3>
            <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
              <FaBox />
            </div>
          </div>
          <div className="stat-value">{stats.orders.total}</div>
          <div className="stat-change">
            <span style={{ color: '#6b7280' }}>Pending: {stats.orders.pending}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Escalations</h3>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <FaExclamationTriangle />
            </div>
          </div>
          <div className="stat-value">{stats.escalations.total}</div>
          <div className="stat-change negative">
            <FaArrowDown /> <span>Urgent: {stats.escalations.urgent}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Resolved</h3>
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              <FaCheckCircle />
            </div>
          </div>
          <div className="stat-value">{stats.conversations.resolved}</div>
          {stats.conversations.avgSatisfaction && (
            <div className="stat-change positive">
              <FaStar style={{ color: '#fbbf24' }} /> 
              <span>{stats.conversations.avgSatisfaction}/5 avg rating</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="table-container">
        <div className="table-header">
          <h2>Recent Conversations</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentConversations && stats.recentConversations.length > 0 ? (
              stats.recentConversations.map((conv) => (
                <tr key={conv._id}>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar" style={{ background: getAvatarColor(conv.customerName) }}>
                        {getInitials(conv.customerName)}
                      </div>
                      <div className="customer-info">
                        <span className="customer-name">{conv.customerName}</span>
                        <span className="customer-phone">{conv.customerPhone}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${conv.status}`}>
                      {conv.status}
                    </span>
                    {conv.escalated && (
                      <span className="badge badge-urgent" style={{ marginLeft: '8px' }}>
                        Escalated
                      </span>
                    )}
                  </td>
                  <td>{new Date(conv.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No conversations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Escalations */}
      <div className="table-container">
        <div className="table-header">
          <h2>Recent Escalations</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Reason</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentEscalations && stats.recentEscalations.length > 0 ? (
              stats.recentEscalations.map((esc) => (
                <tr key={esc._id}>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar" style={{ background: getAvatarColor(esc.customerName) }}>
                        {getInitials(esc.customerName)}
                      </div>
                      <div className="customer-info">
                        <span className="customer-name">{esc.customerName}</span>
                      </div>
                    </div>
                  </td>
                  <td>{esc.reason.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge badge-${esc.priority}`}>
                      {esc.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${esc.status}`}>
                      {esc.status}
                    </span>
                  </td>
                  <td>{new Date(esc.createdAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No escalations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
