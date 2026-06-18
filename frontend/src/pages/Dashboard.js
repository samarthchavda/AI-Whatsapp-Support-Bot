import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import { getDashboardStats } from '../services/api';
import { FaComments, FaBox, FaExclamationTriangle, FaCheckCircle, FaStar, FaArrowUp, FaArrowDown, FaCommentDots, FaPlug, FaBrain, FaBroadcastTower } from 'react-icons/fa';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001' : window.location.origin);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats(false); // Initial load: show spinner

    // Connect to Socket.IO for real-time dashboard updates
    const socket = io(SOCKET_URL);

    socket.on('new_message', () => {
      fetchStats(true); // Silent update: no spinner
    });

    socket.on('escalation_created', () => {
      fetchStats(true); // Silent update: no spinner
    });

    const interval = setInterval(() => {
      fetchStats(true); // Silent update: no spinner
    }, 30000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchStats = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
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
        <p className="page-subtitle">Monitor conversations, orders, and escalations at a glance.</p>
      </div>
      
      {/* Stats Cards with Glassmorphism */}
      <div className="stats-grid">
        <div className="stat-card-premium">
          <div className="stat-card-header">
            <h3>Total Conversations</h3>
            <div className="stat-icon-premium" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <FaComments />
            </div>
          </div>
          <div className="stat-value-premium">{stats.conversations.total}</div>
          <div className="stat-change positive">
            <FaArrowUp /> <span>Active: {stats.conversations.active}</span>
          </div>
        </div>

        <div className="stat-card-premium">
          <div className="stat-card-header">
            <h3>Total Orders</h3>
            <div className="stat-icon-premium" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <FaBox />
            </div>
          </div>
          <div className="stat-value-premium">{stats.orders.total}</div>
          <div className="stat-change">
            <span style={{ color: '#9ca3af' }}>Pending: {stats.orders.pending}</span>
          </div>
        </div>

        <div className="stat-card-premium">
          <div className="stat-card-header">
            <h3>Escalations</h3>
            <div className="stat-icon-premium" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <FaExclamationTriangle />
            </div>
          </div>
          <div className="stat-value-premium">{stats.escalations.total}</div>
          <div className="stat-change negative">
            <FaArrowDown /> <span>Urgent: {stats.escalations.urgent}</span>
          </div>
        </div>

        <div className="stat-card-premium">
          <div className="stat-card-header">
            <h3>Resolved</h3>
            <div className="stat-icon-premium" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <FaCheckCircle />
            </div>
          </div>
          <div className="stat-value-premium">{stats.conversations.resolved}</div>
          <div className="stat-change positive">
            {stats.conversations.avgSatisfaction ? (
              <>
                <FaStar style={{ color: '#fbbf24' }} />
                <span>{stats.conversations.avgSatisfaction}/5 avg rating</span>
              </>
            ) : (
              <span>Closed conversations</span>
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions-grid">
        <Link to="/dashboard/whatsapp-connect" className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <FaPlug />
          </div>
          <div>
            <h4>Connect WhatsApp</h4>
            <p>Link your business number to start receiving messages</p>
          </div>
        </Link>
        <Link to="/dashboard/knowledge-base" className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <FaBrain />
          </div>
          <div>
            <h4>Upload Knowledge Base</h4>
            <p>Train AI with your FAQs and product documents</p>
          </div>
        </Link>
        <Link to="/dashboard/broadcast" className="quick-action-card">
          <div className="quick-action-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <FaBroadcastTower />
          </div>
          <div>
            <h4>Send Broadcast</h4>
            <p>Message customers with promotions and updates</p>
          </div>
        </Link>
      </div>

      {/* Recent Conversations */}
      <div className="table-container-premium">
        <div className="table-header-premium">
          <h2>Recent Conversations</h2>
        </div>
        {stats.recentConversations && stats.recentConversations.length > 0 ? (
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentConversations.map((conv) => (
                  <tr key={conv._id} className="table-row-premium">
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
                      <span className={`badge-premium badge-${conv.status}`}>
                        {conv.status === 'active' && <span className="status-dot-pulse"></span>}
                        {conv.status}
                      </span>
                      {conv.escalated && (
                        <span className="badge-premium badge-urgent" style={{ marginLeft: '8px' }}>
                          Escalated
                        </span>
                      )}
                    </td>
                    <td className="text-muted">{new Date(conv.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaCommentDots />
            </div>
            <h3 className="empty-state-title">All Quiet Here</h3>
            <p className="empty-state-text">New messages from your WhatsApp bot will appear here</p>
            <Link to="/dashboard/demo-chat" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Try Demo Chat
            </Link>
          </div>
        )}
      </div>

      {/* Recent Escalations */}
      <div className="table-container-premium">
        <div className="table-header-premium">
          <h2>Recent Escalations</h2>
        </div>
        {stats.recentEscalations && stats.recentEscalations.length > 0 ? (
          <div className="table-wrapper">
            <table className="premium-table">
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
                {stats.recentEscalations.map((esc) => (
                  <tr key={esc._id} className="table-row-premium">
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
                    <td className="text-capitalize">{esc.reason.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge-premium badge-${esc.priority}`}>
                        {esc.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-premium badge-${esc.status}`}>
                        {esc.status}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(esc.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaExclamationTriangle />
            </div>
            <h3 className="empty-state-title">No Escalations</h3>
            <p className="empty-state-text">Critical issues will appear here when they need attention</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
