import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, 
  FaDollarSign, 
  FaRobot, 
  FaComments, 
  FaEye, 
  FaToggleOn, 
  FaToggleOff,
  FaTrash,
  FaPercent,
  FaCrown
} from 'react-icons/fa';
import './SuperAdmin.css';

function SuperAdmin() {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    subscriptionPlan: 'starter',
    subscriptionStatus: 'trial',
    monthlyPrice: 29,
    geminiTokensLimit: 10000
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, analyticsRes] = await Promise.all([
        axios.get('http://localhost:5001/api/super-admin/users', { headers }),
        axios.get('http://localhost:5001/api/super-admin/analytics', { headers })
      ]);

      setUsers(usersRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Super admin privileges required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (userId) => {
    navigate(`/dashboard/super-admin/user/${userId}`);
  };

  const handleToggleStatus = async (userId) => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `http://localhost:5001/api/super-admin/users/${userId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      alert('Failed to toggle user status');
    }
  };

  const handleApplyDiscount = async () => {
    if (!selectedUser) return;

    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `http://localhost:5001/api/super-admin/users/${selectedUser._id}/apply-discount`,
        { discount: discountValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Discount applied successfully!');
      setShowDiscountModal(false);
      setSelectedUser(null);
      setDiscountValue(0);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to apply discount');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user ${userName}? This action cannot be undone.`)) return;

    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(
        `http://localhost:5001/api/super-admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User deleted successfully');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        'http://localhost:5001/api/super-admin/users',
        newUser,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User created successfully!');
      setShowAddUserModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        subscriptionPlan: 'starter',
        subscriptionStatus: 'trial',
        monthlyPrice: 29,
        geminiTokensLimit: 10000
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const getPlanBadgeColor = (plan) => {
    const colors = {
      starter: '#6366f1',
      professional: '#8b5cf6',
      enterprise: '#ec4899',
      custom: '#f59e0b'
    };
    return colors[plan] || '#71717a';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: '#10b981',
      trial: '#3b82f6',
      inactive: '#71717a',
      cancelled: '#ef4444'
    };
    return colors[status] || '#71717a';
  };

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
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FaCrown style={{ color: '#f59e0b', marginRight: '12px' }} />
            Super Admin Dashboard
          </h1>
          <p className="page-subtitle">Manage all users and view global analytics</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowAddUserModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaUsers /> Add New User
        </button>
      </div>

      {/* Global Analytics Cards */}
      {analytics && (
        <div className="analytics-cards">
          <div className="stat-card revenue">
            <div className="stat-icon">
              <FaDollarSign />
            </div>
            <div className="stat-info">
              <h3>Total Revenue</h3>
              <p className="stat-value">${analytics.totalRevenue}</p>
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
              <h3>Total Users</h3>
              <p className="stat-value">{analytics.totalUsers}</p>
              <small>{analytics.recentSignups} new this week</small>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-container">
        <div className="table-header">
          <h2>All Business Owners ({users.length})</h2>
        </div>
        
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Price</th>
                <th>Discount</th>
                <th>WhatsApp</th>
                <th>Tokens Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const finalPrice = user.monthlyPrice - (user.monthlyPrice * user.customDiscount / 100);
                const tokenPercentage = user.geminiTokensLimit > 0
                  ? ((user.geminiTokensUsed / user.geminiTokensLimit) * 100).toFixed(0)
                  : 0;

                return (
                  <tr key={user._id}>
                    <td>
                      <strong>{user.name}</strong>
                      {user.businessName && (
                        <div style={{ fontSize: '12px', color: '#71717a' }}>
                          {user.businessName}
                        </div>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span 
                        className="badge"
                        style={{ 
                          background: `${getPlanBadgeColor(user.subscriptionPlan)}33`,
                          color: getPlanBadgeColor(user.subscriptionPlan)
                        }}
                      >
                        {user.subscriptionPlan}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge"
                        style={{ 
                          background: `${getStatusBadgeColor(user.subscriptionStatus)}33`,
                          color: getStatusBadgeColor(user.subscriptionStatus)
                        }}
                      >
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td>
                      <div>
                        ${finalPrice.toFixed(2)}/mo
                        {user.customDiscount > 0 && (
                          <div style={{ fontSize: '11px', color: '#71717a', textDecoration: 'line-through' }}>
                            ${user.monthlyPrice}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {user.customDiscount > 0 ? (
                        <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                          {user.customDiscount}% OFF
                        </span>
                      ) : (
                        <span style={{ color: '#71717a' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={user.whatsappConnected ? 'status-connected' : 'status-disconnected'}>
                        {user.whatsappConnected ? '✓ Connected' : '✗ Not Connected'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        {user.geminiTokensUsed.toLocaleString()} / {user.geminiTokensLimit.toLocaleString()}
                        <div 
                          style={{ 
                            width: '100%', 
                            height: '4px', 
                            background: 'rgba(63, 63, 70, 0.5)', 
                            borderRadius: '2px',
                            marginTop: '4px',
                            overflow: 'hidden'
                          }}
                        >
                          <div 
                            style={{ 
                              width: `${tokenPercentage}%`, 
                              height: '100%', 
                              background: tokenPercentage > 80 ? '#ef4444' : '#10b981',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleViewDetails(user._id)}
                          className="btn-icon"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setDiscountValue(user.customDiscount || 0);
                            setShowDiscountModal(true);
                          }}
                          className="btn-icon"
                          title="Apply Discount"
                        >
                          <FaPercent />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user._id)}
                          className="btn-icon"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="btn-icon btn-danger"
                          title="Delete User"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDiscountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apply Discount to {selectedUser.name}</h2>
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
                    background: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '10px',
                    color: '#fafafa',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="discount-preview">
                <div className="preview-row">
                  <span>Original Price:</span>
                  <span>${selectedUser.monthlyPrice}/mo</span>
                </div>
                <div className="preview-row">
                  <span>Discount:</span>
                  <span style={{ color: '#10b981' }}>-{discountValue}%</span>
                </div>
                <div className="preview-row final">
                  <span>Final Price:</span>
                  <span>${(selectedUser.monthlyPrice - (selectedUser.monthlyPrice * discountValue / 100)).toFixed(2)}/mo</span>
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
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
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    placeholder="John Doe"
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
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="john@example.com"
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
                  <label>Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Minimum 6 characters"
                    minLength="6"
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

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Subscription Plan</label>
                    <select
                      value={newUser.subscriptionPlan}
                      onChange={(e) => {
                        const plan = e.target.value;
                        let price = 29;
                        let tokens = 10000;
                        if (plan === 'professional') { price = 79; tokens = 50000; }
                        if (plan === 'enterprise') { price = 199; tokens = 200000; }
                        setNewUser({...newUser, subscriptionPlan: plan, monthlyPrice: price, geminiTokensLimit: tokens});
                      }}
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
                    <label>Status</label>
                    <select
                      value={newUser.subscriptionStatus}
                      onChange={(e) => setNewUser({...newUser, subscriptionStatus: e.target.value})}
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
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Monthly Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newUser.monthlyPrice}
                      onChange={(e) => setNewUser({...newUser, monthlyPrice: Number(e.target.value)})}
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
                    <label>Gemini Tokens/Month</label>
                    <input
                      type="number"
                      min="0"
                      value={newUser.geminiTokensLimit}
                      onChange={(e) => setNewUser({...newUser, geminiTokensLimit: Number(e.target.value)})}
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
                </div>

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
