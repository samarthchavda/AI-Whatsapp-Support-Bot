import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaWhatsapp, 
  FaBrain, 
  FaChartLine, 
  FaCalendar,
  FaSync,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaPercent,
  FaUserSecret,
  FaTrash
} from 'react-icons/fa';
import './SuperAdmin.css';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

const getRoleBadgeStyle = (role) => {
  const styles = {
    super_admin: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
    admin: { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
    manager: { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    agent: { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
  };
  return styles[role] || { background: 'rgba(113, 113, 122, 0.1)', color: '#71717a' };
};

function SuperAdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
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
      const response = await api.get(`/super-admin/users/${userId}`);
      setData(response.data.data);
      
      // Set edit form with current values
      const user = response.data.data.user;
      setEditForm({
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        monthlyPrice: user.monthlyPrice,
        geminiTokensLimit: user.geminiTokensLimit
      });
      setDiscountValue(user.customDiscount || 0);
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTokens = async () => {
    if (!window.confirm('Reset token usage for this user?')) return;
    
    try {
      await api.post(`/super-admin/users/${userId}/reset-tokens`);
      alert('Token usage reset successfully!');
      fetchUserDetails();
    } catch (error) {
      alert('Failed to reset tokens');
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      await api.put(`/super-admin/users/${userId}/subscription`, editForm);
      alert('Subscription updated successfully!');
      setShowEditModal(false);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to update subscription');
    }
  };

  const handleToggleUserWebBot = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-web-bot`);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to toggle user scanner access');
    }
  };

  const handleToggleUserShopify = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-shopify`);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to toggle user Shopify access');
    }
  };

  const handleToggleUserWooCommerce = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-woocommerce`);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to toggle user WooCommerce access');
    }
  };

  const handleImpersonateUser = async (user) => {
    if (!window.confirm(`Log in as merchant "${user.name}" (${user.email})?`)) return;
    
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const originalAdmin = localStorage.getItem('admin');
    
    try {
      const res = await api.post(`/super-admin/users/${user._id}/impersonate`);
      
      if (res.data.success && res.data.data.token) {
        localStorage.setItem('originalToken', token);
        if (originalAdmin) {
          localStorage.setItem('originalAdmin', originalAdmin);
        }
        
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('accessToken', res.data.data.token);
        
        localStorage.setItem('isImpersonated', 'true');
        localStorage.setItem('impersonatedUserEmail', user.email);
        localStorage.setItem('impersonatedUserName', user.name);

        try {
          const profileRes = await axios.get(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${res.data.data.token}` }
          });
          if (profileRes.data.success && profileRes.data.data.admin) {
            localStorage.setItem('admin', JSON.stringify(profileRes.data.data.admin));
          } else {
            localStorage.setItem('admin', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          console.error('Error fetching impersonated profile:', err);
          localStorage.setItem('admin', JSON.stringify(res.data.data.user));
        }

        alert(`Successfully logged in as ${user.name}! Redirecting to dashboard...`);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to impersonate user');
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user ${userName}? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/super-admin/users/${userId}`);
      alert('User deleted successfully');
      navigate('/dashboard/super-admin');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleApplyDiscount = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/apply-discount`, { discount: discountValue });
      alert('Discount applied successfully!');
      setShowDiscountModal(false);
      fetchUserDetails();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to apply discount');
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
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.name}
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
          </h1>
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
              <strong>₹{user.monthlyPrice}/mo</strong>
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
                ₹{(user.monthlyPrice - (user.monthlyPrice * user.customDiscount / 100)).toFixed(2)}/mo
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
            <div className="detail-row">
              <span>Web Bot Scanner:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={user.webBotEnabled ? 'status-connected' : 'status-disconnected'}>
                  {user.webBotEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={handleToggleUserWebBot}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: 0,
                    color: user.webBotEnabled ? '#10b981' : '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  title={user.webBotEnabled ? 'Revoke Access' : 'Grant Access'}
                >
                  {user.webBotEnabled ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
            <div className="detail-row">
              <span>Shopify Integration:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={user.shopifyEnabled !== false ? 'status-connected' : 'status-disconnected'}>
                  {user.shopifyEnabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={handleToggleUserShopify}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: 0,
                    color: user.shopifyEnabled !== false ? '#10b981' : '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  title={user.shopifyEnabled !== false ? 'Revoke Access' : 'Grant Access'}
                >
                  {user.shopifyEnabled !== false ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
            <div className="detail-row">
              <span>WooCommerce Integration:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={user.woocommerceEnabled !== false ? 'status-connected' : 'status-disconnected'}>
                  {user.woocommerceEnabled !== false ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={handleToggleUserWooCommerce}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: 0,
                    color: user.woocommerceEnabled !== false ? '#10b981' : '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s ease'
                  }}
                  title={user.woocommerceEnabled !== false ? 'Revoke Access' : 'Grant Access'}
                >
                  {user.woocommerceEnabled !== false ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
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

        {/* Store & Contact Details */}
        <div className="detail-card">
          <h3>Store & Contact Details</h3>
          <div className="detail-rows">
            <div className="detail-row">
              <span>Business Name:</span>
              <strong>{user.businessName || 'N/A'}</strong>
            </div>
            <div className="detail-row">
              <span>Website URL:</span>
              {user.storeUrl ? (
                <a 
                  href={user.storeUrl.startsWith('http') ? user.storeUrl : `https://${user.storeUrl}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: '500' }}
                >
                  {user.storeUrl}
                </a>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
              )}
            </div>
            <div className="detail-row">
              <span>Support Email:</span>
              <strong>{user.supportEmail || 'N/A'}</strong>
            </div>
            <div className="detail-row">
              <span>Store Category:</span>
              <strong>{user.storeCategory || 'N/A'}</strong>
            </div>
            <div className="detail-row">
              <span>Base Currency:</span>
              <strong>{user.currency || 'USD'}</strong>
            </div>
            <div className="detail-row">
              <span>Timezone:</span>
              <strong>{user.timezone || 'UTC'}</strong>
            </div>
          </div>
        </div>

        {/* Administrative Actions */}
        <div className="detail-card">
          <h3>Administrative Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <button 
              onClick={() => setShowDiscountModal(true)}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <FaPercent /> Apply Discount
            </button>
            <button 
              onClick={() => handleImpersonateUser(user)}
              className="btn-primary btn-impersonate"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <FaUserSecret /> Impersonate User
            </button>
            <button 
              onClick={() => handleDeleteUser(user._id, user.name)}
              className="btn-primary btn-delete-merchant"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <FaTrash /> Delete Merchant Account
            </button>
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
                <label>Subscription Status</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
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
                <label>Monthly Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.monthlyPrice}
                  onChange={(e) => setEditForm({ ...editForm, monthlyPrice: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
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
                    borderRadius: '10px',
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

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="modal-overlay" onClick={() => setShowDiscountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apply Discount to {user.name}</h2>
              <button onClick={() => setShowDiscountModal(false)} className="modal-close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Discount Percentage</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="discount-preview">
                <div className="preview-row">
                  <span>Original Price:</span>
                  <span>₹{user.monthlyPrice}/mo</span>
                </div>
                <div className="preview-row">
                  <span>Discount:</span>
                  <span style={{ color: '#10b981' }}>-{discountValue}%</span>
                </div>
                <div className="preview-row final">
                  <span>Final Price:</span>
                  <span>₹{(user.monthlyPrice - (user.monthlyPrice * discountValue / 100)).toFixed(2)}/mo</span>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={handleApplyDiscount} className="btn-primary">
                  Apply Discount
                </button>
                <button onClick={() => setShowDiscountModal(false)} className="btn-secondary">
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
