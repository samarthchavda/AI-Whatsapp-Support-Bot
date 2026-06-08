import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaWhatsapp, 
  FaBrain, 
  FaChartLine, 
  FaCalendar,
  FaSync,
  FaEdit
} from 'react-icons/fa';
import './SuperAdmin.css';

function SuperAdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    subscriptionPlan: '',
    subscriptionStatus: '',
    monthlyPrice: 0,
    geminiTokensLimit: 0
  });

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/super-admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data.data);
      
      // Set edit form with current values
      const user = response.data.data.user;
      setEditForm({
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        monthlyPrice: user.monthlyPrice,
        geminiTokensLimit: user.geminiTokensLimit
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTokens = async () => {
    if (!window.confirm('Reset token usage for this user?')) return;

    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `http://localhost:5001/api/super-admin/users/${userId}/reset-tokens`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Token usage reset successfully!');
      fetchUserDetails();
    } catch (error) {
      alert('Failed to reset tokens');
    }
  };

  const handleUpdateSubscription = async () => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.put(
        `http://localhost:5001/api/super-admin/users/${userId}/subscription`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Subscription updated successfully!');
      setShowEditModal(false);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to update subscription');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading user details...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          User not found
        </div>
      </div>
    );
  }

  const { user, stats } = data;
  const tokenPercentage = user.geminiTokensLimit > 0
    ? ((user.geminiTokensUsed / user.geminiTokensLimit) * 100).toFixed(1)
    : 0;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <button 
            onClick={() => navigate('/dashboard/super-admin')}
            className="btn-secondary"
            style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaArrowLeft /> Back to Users
          </button>
          <h1 className="page-title">{user.name}</h1>
          <p className="page-subtitle">{user.email}</p>
        </div>
        <button 
          onClick={() => setShowEditModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaEdit /> Edit Subscription
        </button>
      </div>

      {/* User Info Cards */}
      <div className="user-detail-grid">
        {/* Subscription Info */}
        <div className="detail-card">
          <h3>Subscription Details</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Plan:</span>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                {user.subscriptionPlan}
              </span>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <span className={`badge ${user.subscriptionStatus === 'active' ? 'badge-delivered' : 'badge-cancelled'}`}>
                {user.subscriptionStatus}
              </span>
            </div>
            <div className="detail-row">
              <span>Monthly Price:</span>
              <strong>${user.monthlyPrice}/mo</strong>
            </div>
            {user.customDiscount > 0 && (
              <div className="detail-row">
                <span>Discount:</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>
                  {user.customDiscount}% OFF
                </span>
              </div>
            )}
            <div className="detail-row">
              <span>Final Price:</span>
              <strong style={{ color: '#10b981' }}>
                ${(user.monthlyPrice - (user.monthlyPrice * user.customDiscount / 100)).toFixed(2)}/mo
              </strong>
            </div>
            {user.subscriptionEndDate && (
              <div className="detail-row">
                <span>Expires:</span>
                <span>
                  {new Date(user.subscriptionEndDate).toLocaleDateString()}
                  {stats.daysUntilExpiry && (
                    <span style={{ color: stats.daysUntilExpiry < 7 ? '#ef4444' : '#71717a', marginLeft: '8px' }}>
                      ({stats.daysUntilExpiry} days)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Status */}
        <div className="detail-card">
          <h3><FaWhatsapp /> WhatsApp Connection</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Status:</span>
              <span className={user.whatsappConnected ? 'status-connected' : 'status-disconnected'}>
                {user.whatsappConnected ? '✓ Connected' : '✗ Not Connected'}
              </span>
            </div>
            {user.whatsappConnectedAt && (
              <div className="detail-row">
                <span>Connected At:</span>
                <span>{new Date(user.whatsappConnectedAt).toLocaleString()}</span>
              </div>
            )}
            {user.businessPhone && (
              <div className="detail-row">
                <span>Phone:</span>
                <span>{user.businessPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Token Usage */}
        <div className="detail-card">
          <h3>
            <FaBrain /> Gemini API Usage
            <button 
              onClick={handleResetTokens}
              className="btn-icon"
              style={{ marginLeft: 'auto' }}
              title="Reset Token Usage"
            >
              <FaSync />
            </button>
          </h3>
          <div className="token-usage">
            <div className="token-stats">
              <div className="token-stat">
                <span>Used</span>
                <strong>{user.geminiTokensUsed.toLocaleString()}</strong>
              </div>
              <div className="token-stat">
                <span>Limit</span>
                <strong>{user.geminiTokensLimit.toLocaleString()}</strong>
              </div>
              <div className="token-stat">
                <span>Remaining</span>
                <strong>{(user.geminiTokensLimit - user.geminiTokensUsed).toLocaleString()}</strong>
              </div>
            </div>
            <div className="token-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${tokenPercentage}%`,
                    background: tokenPercentage > 80 ? '#ef4444' : '#10b981'
                  }}
                />
              </div>
              <span className="progress-label">{tokenPercentage}% used</span>
            </div>
            {user.lastTokenReset && (
              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '12px' }}>
                Last reset: {new Date(user.lastTokenReset).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="detail-card">
          <h3><FaChartLine /> Activity Statistics</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Total Conversations:</span>
              <strong>{stats.totalConversations}</strong>
            </div>
            <div className="detail-row">
              <span>Total Orders:</span>
              <strong>{stats.totalOrders}</strong>
            </div>
            <div className="detail-row">
              <span>Total Broadcasts:</span>
              <strong>{stats.totalBroadcasts}</strong>
            </div>
            <div className="detail-row">
              <span>Messages Processed:</span>
              <strong>{user.totalMessagesProcessed.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="detail-card">
          <h3><FaCalendar /> Account Information</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Account Status:</span>
              <span className={user.isActive ? 'status-connected' : 'status-disconnected'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="detail-row">
              <span>Joined:</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            {user.lastLogin && (
              <div className="detail-row">
                <span>Last Login:</span>
                <span>{new Date(user.lastLogin).toLocaleString()}</span>
              </div>
            )}
            {user.businessName && (
              <div className="detail-row">
                <span>Business:</span>
                <span>{user.businessName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Subscription Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Subscription</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Subscription Plan</label>
                <select
                  value={editForm.subscriptionPlan}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    color: '#fafafa',
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
                <label>Subscription Status</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    color: '#fafafa',
                    fontSize: '14px'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Monthly Price ($)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.monthlyPrice}
                  onChange={(e) => setEditForm({ ...editForm, monthlyPrice: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    color: '#fafafa',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="form-group">
                <label>Gemini Token Limit</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.geminiTokensLimit}
                  onChange={(e) => setEditForm({ ...editForm, geminiTokensLimit: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    color: '#fafafa',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="modal-actions">
                <button onClick={handleUpdateSubscription} className="btn-primary">
                  Update Subscription
                </button>
                <button onClick={() => setShowEditModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminUserDetail;
