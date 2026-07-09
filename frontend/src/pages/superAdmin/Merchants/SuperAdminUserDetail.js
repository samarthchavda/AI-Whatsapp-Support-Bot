import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../../services/api';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaWhatsapp, 
  FaBrain, 
  FaChartLine, 
  FaSync,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaUserSecret,
  FaTrash,
  FaPlug,
  FaCoins,
  FaHistory,
  FaInfoCircle
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css';

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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error('Error fetching merchant details:', error);
      alert('Failed to load merchant details');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTokens = async () => {
    if (!window.confirm('Reset token usage for this merchant?')) return;
    
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



  const handleToggleUserShopify = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-shopify`);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to toggle merchant Shopify access');
    }
  };

  const handleToggleUserWooCommerce = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/toggle-woocommerce`);
      fetchUserDetails();
    } catch (error) {
      alert('Failed to toggle merchant WooCommerce access');
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
      alert(error.response?.data?.error || 'Failed to impersonate merchant');
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete merchant ${userName}? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/super-admin/users/${userId}`);
      alert('Merchant deleted successfully');
      navigate('/dashboard/super-admin');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete merchant');
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
          Loading merchant details...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          Merchant not found
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
            <FaArrowLeft /> Back to Merchants
          </button>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            Merchant 360° View: {user.name}
          </h1>
          <p className="page-subtitle">Unified profile monitoring, billing status, and platform analytics</p>
        </div>
      </div>

      <div className="merchant-360-grid" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column: Summary & Tab Navigation */}
        <div className="merchant-360-sidebar" style={{ flex: '0 0 280px', width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <div className="detail-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Merchant Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{user.email}</div>
              <div style={{ marginTop: '8px' }}>
                <span 
                  className="role-badge-pill"
                  style={{ 
                    ...getRoleBadgeStyle(user.role || 'admin'),
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}
                >
                  {user.role === 'super_admin' ? 'Super Admin' : (user.role || 'Admin')}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Card */}
          <div className="detail-card" style={{ margin: 0, padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: 'overview', label: 'Overview', icon: <FaInfoCircle /> },
                { id: 'whatsapp', label: 'WhatsApp', icon: <FaWhatsapp /> },
                { id: 'integrations', label: 'Integrations', icon: <FaPlug /> },
                { id: 'ai-usage', label: 'AI Usage', icon: <FaBrain /> },
                { id: 'subscription', label: 'Subscription', icon: <FaCoins /> },
                { id: 'activity', label: 'Activity', icon: <FaChartLine /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? 'var(--brand-light)' : 'none',
                    border: 'none',
                    color: activeTab === tab.id ? 'var(--brand-dark)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Administrative Actions */}
          <div className="detail-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => handleImpersonateUser(user)}
                className="btn-primary btn-impersonate"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '10px', fontSize: '13px' }}
              >
                <FaUserSecret /> Impersonate Merchant
              </button>
              <button 
                onClick={() => handleDeleteUser(user._id, user.name)}
                className="btn-primary btn-delete-merchant"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '10px', fontSize: '13px' }}
              >
                <FaTrash /> Delete Merchant Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Tab Content panels */}
        <div className="merchant-360-content" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {activeTab === 'overview' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaInfoCircle /> Profile Overview</h3>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Merchant Name:</span>
                  <strong>{user.name}</strong>
                </div>
                <div className="detail-row">
                  <span>Email Address:</span>
                  <strong>{user.email}</strong>
                </div>
                <div className="detail-row">
                  <span>Business Name:</span>
                  <strong>{user.businessName || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Store Category:</span>
                  <strong>{user.storeCategory || 'N/A'}</strong>
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
                  <span>Account Status:</span>
                  <span className={user.isActive ? 'status-connected' : 'status-disconnected'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Joined Date:</span>
                  <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Last Login:</span>
                  <strong>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</strong>
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
          )}

          {activeTab === 'whatsapp' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaWhatsapp /> WhatsApp Connection Status</h3>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Connection Status:</span>
                  <span className={user.whatsappConnected ? 'status-connected' : 'status-disconnected'}>
                    {user.whatsappConnected ? '✓ Connected' : '✗ Not Connected'}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Connected Phone Number:</span>
                  <strong>{user.businessPhone || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>WhatsApp Business Account ID (WABA ID):</span>
                  <strong style={{ fontFamily: 'monospace' }}>{user.whatsappBusinessAccountId || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>WhatsApp Phone Number ID:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{user.whatsappPhoneNumberId || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Connected At:</span>
                  <strong>{user.whatsappConnectedAt ? new Date(user.whatsappConnectedAt).toLocaleString() : 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Total Messages Processed:</span>
                  <strong>{user.totalMessagesProcessed.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaPlug /> Platforms Integration Monitoring</h3>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Shopify Access Status:</span>
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
                      title={user.shopifyEnabled !== false ? 'Revoke Shopify Access' : 'Grant Shopify Access'}
                    >
                      {user.shopifyEnabled !== false ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                  </div>
                </div>
                
                <div className="detail-row">
                  <span>WooCommerce Access Status:</span>
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
                      title={user.woocommerceEnabled !== false ? 'Revoke WooCommerce Access' : 'Grant WooCommerce Access'}
                    >
                      {user.woocommerceEnabled !== false ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                  </div>
                </div>

                <div className="detail-row">
                  <span>Last Data Sync Status:</span>
                  <strong>{user.lastSync ? new Date(user.lastSync).toLocaleString() : 'Not available'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-usage' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}><FaBrain /> Gemini API Token Usage</h3>
                <button 
                  onClick={handleResetTokens}
                  className="btn-icon"
                  style={{ 
                    background: 'rgba(39, 39, 42, 0.6)', 
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    color: '#fafafa',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  title="Reset Token Usage"
                >
                  <FaSync /> Reset Tokens
                </button>
              </div>
              <div className="token-usage">
                <div className="token-stats">
                  <div className="token-stat">
                    <span>Tokens Used</span>
                    <strong>{user.geminiTokensUsed.toLocaleString()}</strong>
                  </div>
                  <div className="token-stat">
                    <span>Tokens Limit</span>
                    <strong>{user.geminiTokensLimit === -1 || user.geminiTokensLimit === Infinity ? 'Unlimited' : user.geminiTokensLimit.toLocaleString()}</strong>
                  </div>
                  <div className="token-stat">
                    <span>Tokens Remaining</span>
                    <strong>{user.geminiTokensLimit === -1 || user.geminiTokensLimit === Infinity ? 'Unlimited' : (user.geminiTokensLimit - user.geminiTokensUsed).toLocaleString()}</strong>
                  </div>
                </div>
                <div className="token-progress" style={{ marginTop: '16px' }}>
                  <div className="progress-bar" style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className="progress-fill"
                      style={{ 
                        height: '100%',
                        width: `${user.geminiTokensLimit > 0 ? Math.min(tokenPercentage, 100) : 0}%`,
                        background: tokenPercentage > 80 ? '#ef4444' : '#10b981',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <span className="progress-label" style={{ display: 'block', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tokenPercentage}% used
                  </span>
                </div>
                {user.lastTokenReset && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
                    Last token reset: {new Date(user.lastTokenReset).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}><FaCoins /> Subscription Settings</h3>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                >
                  <FaEdit /> Edit Subscription
                </button>
              </div>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Subscription Plan:</span>
                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', textTransform: 'capitalize' }}>
                    {user.subscriptionPlan}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Subscription Status:</span>
                  <span className={`badge ${user.subscriptionStatus === 'active' ? 'badge-delivered' : 'badge-cancelled'}`} style={{ textTransform: 'capitalize' }}>
                    {user.subscriptionStatus}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Base Monthly Price:</span>
                  <strong>₹{user.monthlyPrice}/mo</strong>
                </div>
                {user.customDiscount > 0 && (
                  <div className="detail-row">
                    <span>Discount applied:</span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {user.customDiscount}% OFF
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span>Final Monthly billing:</span>
                  <strong style={{ color: '#10b981' }}>
                    ₹{(user.monthlyPrice - (user.monthlyPrice * user.customDiscount / 100)).toFixed(2)}/mo
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Trial Started At:</span>
                  <strong>{user.trialStartedAt ? new Date(user.trialStartedAt).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Subscription Expires:</span>
                  <span>
                    {user.subscriptionEndDate ? (
                      <>
                        {new Date(user.subscriptionEndDate).toLocaleDateString()}
                        {stats.daysUntilExpiry && (
                          <span style={{ color: stats.daysUntilExpiry < 7 ? '#ef4444' : '#71717a', marginLeft: '8px', fontWeight: '600' }}>
                            ({stats.daysUntilExpiry} days remaining)
                          </span>
                        )}
                      </>
                    ) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="detail-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3><FaChartLine /> Merchant Platform Activity</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', textAlign: 'center', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Total Conversations</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.totalConversations}</div>
                </div>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', textAlign: 'center', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Total Orders</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.totalOrders}</div>
                </div>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', textAlign: 'center', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Total Broadcasts</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.totalBroadcasts}</div>
                </div>
              </div>

              <div style={{ border: '1px dashed var(--border)', borderRadius: '12px', padding: '32px', textAlign: 'center', marginTop: '8px' }}>
                <FaHistory style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-primary)' }}>Detailed System Activity Audit Logs</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Detailed audit log history is not available for this merchant profile yet.
                </p>
              </div>
            </div>
          )}

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
