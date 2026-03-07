import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';
import { FaComments, FaBox, FaExclamationTriangle, FaCheckCircle, FaStar } from 'react-icons/fa';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
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

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
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
      <h1>Dashboard Overview</h1>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Total Conversations</h3>
            <FaComments className="stat-icon" style={{ color: '#667eea' }} />
          </div>
          <div className="stat-value">{stats.conversations.total}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Active: {stats.conversations.active}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Total Orders</h3>
            <FaBox className="stat-icon" style={{ color: '#28a745' }} />
          </div>
          <div className="stat-value">{stats.orders.total}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Pending: {stats.orders.pending}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Escalations</h3>
            <FaExclamationTriangle className="stat-icon" style={{ color: '#dc3545' }} />
          </div>
          <div className="stat-value">{stats.escalations.total}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Urgent: {stats.escalations.urgent}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3>Resolved</h3>
            <FaCheckCircle className="stat-icon" style={{ color: '#17a2b8' }} />
          </div>
          <div className="stat-value">{stats.conversations.resolved}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            {stats.conversations.avgSatisfaction && (
              <>
                <FaStar style={{ color: '#ffc107' }} /> {stats.conversations.avgSatisfaction}/5
              </>
            )}
          </div>
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
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentConversations && stats.recentConversations.length > 0 ? (
              stats.recentConversations.map((conv) => (
                <tr key={conv._id}>
                  <td>{conv.customerName}</td>
                  <td>{conv.customerPhone}</td>
                  <td>
                    <span className={`badge badge-${conv.status}`}>
                      {conv.status}
                    </span>
                    {conv.escalated && (
                      <span className="badge badge-urgent" style={{ marginLeft: '5px' }}>
                        Escalated
                      </span>
                    )}
                  </td>
                  <td>{new Date(conv.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
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
              <th>Customer Name</th>
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
                  <td>{esc.customerName}</td>
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
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
