import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../../../services/api';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaBrain, 
  FaChartLine, 
  FaSync,
  FaEdit,
  FaUserSecret,
  FaTrash,
  FaCoins,
  FaInfoCircle,
  FaShieldAlt,
  FaNetworkWired,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaLock,
  FaUndo,
  FaTag
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

const ALL_PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter Plan (₹1,499/mo)', category: 'Kwickbot CRM' },
  { value: 'growth', label: 'Growth Plan (₹2,999/mo)', category: 'Kwickbot CRM' },
  { value: 'scale', label: 'Scale Enterprise (₹5,999/mo)', category: 'Kwickbot CRM' },
  { value: 'crm_connect', label: 'CRM Connect (₹2,999/mo)', category: 'CRM Integration' },
  { value: 'crm_automation', label: 'CRM Automation (₹5,999/mo)', category: 'CRM Integration' },
  { value: 'crm_enterprise', label: 'CRM Enterprise (₹9,999/mo)', category: 'CRM Integration' },
  { value: 'api_starter', label: 'API Starter (₹1,999/mo)', category: 'WhatsApp API' },
  { value: 'api_growth', label: 'API Growth (₹4,999/mo)', category: 'WhatsApp API' },
  { value: 'api_enterprise', label: 'API Enterprise (₹8,999/mo)', category: 'WhatsApp API' },
  { value: 'custom_automation', label: 'Custom Automation (Custom)', category: 'Enterprise Custom' }
];

export default function SuperAdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [effectiveAccessData, setEffectiveAccessData] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [canonicalMetadata, setCanonicalMetadata] = useState(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Edit Subscription Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    subscriptionPlan: '',
    subscriptionStatus: '',
    monthlyPrice: 0,
    geminiTokensLimit: 0
  });

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);

  // Access Overrides State
  const [customProfile, setCustomProfile] = useState('');
  const [allowedPages, setAllowedPages] = useState([]);
  const [deniedPages, setDeniedPages] = useState([]);
  const [savingOverrides, setSavingOverrides] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);

      const [userRes, accessRes, profilesRes, metaRes] = await Promise.all([
        api.get(`/super-admin/users/${userId}`),
        api.get(`/super-admin/users/${userId}/effective-access`),
        api.get('/super-admin/permission-profiles'),
        api.get('/super-admin/permission-profiles/metadata/canonical')
      ]);

      setData(userRes.data.data);
      const user = userRes.data.data.user;

      setEditForm({
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        monthlyPrice: user.monthlyPrice,
        geminiTokensLimit: user.geminiTokensLimit
      });
      setDiscountValue(user.customDiscount || 0);

      if (accessRes.data.success) {
        setEffectiveAccessData(accessRes.data.data);
        const diag = accessRes.data.data;
        setCustomProfile(diag.overrides?.customPermissionProfile || '');
        setAllowedPages(diag.overrides?.allowedPages || []);
        setDeniedPages(diag.overrides?.deniedPages || []);
      }

      if (profilesRes.data.success) {
        setAvailableProfiles(profilesRes.data.data);
      }
      if (metaRes.data.success) {
        setCanonicalMetadata(metaRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching merchant details:', error);
      setActionError(error.response?.data?.error || 'Failed to load merchant details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  // Save Effective Access Overrides
  const handleSaveOverrides = async (revokeSessions = false) => {
    try {
      setSavingOverrides(true);
      setActionError(null);

      const res = await api.put(`/super-admin/users/${userId}/effective-access`, {
        allowedPages,
        deniedPages,
        customPermissionProfile: customProfile || null,
        revokeActiveSessions: revokeSessions
      });

      if (res.data.success) {
        setActionSuccess('Effective access overrides updated successfully' + (revokeSessions ? ' & active sessions revoked.' : '.'));
        fetchUserDetails();
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to save access overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  // Reset Overrides to Plan Defaults
  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all permissions and page overrides to plan defaults?')) return;

    try {
      setSavingOverrides(true);
      setActionError(null);

      const res = await api.put(`/super-admin/users/${userId}/effective-access`, {
        resetToPlanDefaults: true,
        revokeActiveSessions: true
      });

      if (res.data.success) {
        setActionSuccess('All overrides reset to plan defaults successfully.');
        fetchUserDetails();
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to reset overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  // Revoke Sessions
  const handleRevokeSessions = async () => {
    if (!window.confirm(`Force sign-out / revoke active login sessions for ${data?.user?.email}?`)) return;

    try {
      const res = await api.post(`/super-admin/users/${userId}/revoke-sessions`);
      if (res.data.success) {
        setActionSuccess(`Active sessions for ${data?.user?.email} revoked.`);
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to revoke sessions');
    }
  };

  // Toggle Page in Allowed List
  const handleToggleAllowPage = (pageKey) => {
    setAllowedPages(prev => 
      prev.includes(pageKey) ? prev.filter(k => k !== pageKey) : [...prev, pageKey]
    );
    // If allowed, ensure it's not in denied
    setDeniedPages(prev => prev.filter(k => k !== pageKey));
  };

  // Toggle Page in Denied List
  const handleToggleDenyPage = (pageKey) => {
    setDeniedPages(prev =>
      prev.includes(pageKey) ? prev.filter(k => k !== pageKey) : [...prev, pageKey]
    );
    // If denied, ensure it's removed from allowed overrides
    setAllowedPages(prev => prev.filter(k => k !== pageKey));
  };

  // Update Subscription
  const handleUpdateSubscription = async () => {
    try {
      await api.put(`/super-admin/users/${userId}/subscription`, editForm);
      setActionSuccess('Subscription updated successfully!');
      setShowEditModal(false);
      fetchUserDetails();
    } catch (error) {
      setActionError('Failed to update subscription');
    }
  };

  // Apply Discount
  const handleApplyDiscount = async () => {
    try {
      await api.post(`/super-admin/users/${userId}/apply-discount`, { discount: discountValue });
      setActionSuccess('Discount applied successfully!');
      setShowDiscountModal(false);
      fetchUserDetails();
    } catch (error) {
      setActionError('Failed to apply discount');
    }
  };

  // Impersonate
  const handleImpersonateUser = async (user) => {
    if (!window.confirm(`Log in as merchant "${user.name}" (${user.email})?`)) return;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const originalAdmin = localStorage.getItem('admin');

    try {
      const res = await api.post(`/super-admin/users/${user._id}/impersonate`);

      if (res.data.success && res.data.data.token) {
        try {
          sessionStorage.setItem('originalToken', token);
          if (originalAdmin) sessionStorage.setItem('originalAdmin', originalAdmin);
          sessionStorage.setItem('isImpersonated', 'true');
          sessionStorage.setItem('impersonatedUserEmail', user.email);
          sessionStorage.setItem('impersonatedUserName', user.name);
        } catch (e) {}

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
          localStorage.setItem('admin', JSON.stringify(res.data.data.user));
        }

        window.location.href = '/dashboard';
      }
    } catch (error) {
      setActionError(error.response?.data?.error || 'Failed to impersonate merchant');
    }
  };

  // Delete User
  const handleDeleteUser = async (uId, userName) => {
    if (!window.confirm(`Delete merchant ${userName}? This action cannot be undone.`)) return;

    try {
      await api.delete(`/super-admin/users/${uId}`);
      navigate('/dashboard/super-admin');
    } catch (error) {
      setActionError(error.response?.data?.error || 'Failed to delete merchant');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <FaSync className="onboard-spin" style={{ fontSize: '24px', marginBottom: '12px' }} />
          <div>Loading merchant 360° diagnostics...</div>
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
  const effectivePages = effectiveAccessData?.effectiveAccess?.effectivePages || [];
  const effectivePermissions = effectiveAccessData?.effectiveAccess?.effectivePermissions || [];
  const baseProfile = effectiveAccessData?.baseProfile;
  const overrides = effectiveAccessData?.overrides;
  const integrations = effectiveAccessData?.integrations;

  return (
    <div className="container">
      {/* Top Alerts */}
      {actionError && (
        <div className="onboard-alert onboard-alert-error" style={{ marginBottom: '16px' }}>
          <FaExclamationTriangle />
          <span>{actionError}</span>
          <button className="onboard-alert-close" onClick={() => setActionError(null)}><FaTimes /></button>
        </div>
      )}
      {actionSuccess && (
        <div className="prof-alert prof-alert-success" style={{ marginBottom: '16px' }}>
          <FaCheck />
          <span>{actionSuccess}</span>
          <button className="prof-alert-close" onClick={() => setActionSuccess(null)}><FaTimes /></button>
        </div>
      )}

      {/* Page Header */}
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
          <p className="page-subtitle">Unified profile monitoring, billing status, effective access matrix, and platform diagnostics</p>
        </div>
      </div>

      <div className="merchant-360-grid" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column: Summary & Navigation */}
        <div className="merchant-360-sidebar" style={{ flex: '0 0 280px', width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <div className="detail-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Merchant Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{user.email}</div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                <span 
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: user.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: user.subscriptionStatus === 'active' ? '#10b981' : '#f59e0b'
                  }}
                >
                  {user.subscriptionStatus?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Card */}
          <div className="detail-card" style={{ margin: 0, padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { id: 'overview', label: 'Overview & Subscription', icon: <FaInfoCircle /> },
                { id: 'permissions', label: 'Effective Access Matrix', icon: <FaShieldAlt /> },
                { id: 'integrations', label: 'Integration Health', icon: <FaNetworkWired /> },
                { id: 'ai-usage', label: 'AI Usage & Limits', icon: <FaBrain /> },
                { id: 'activity', label: 'Activity & History', icon: <FaChartLine /> }
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

          {/* Quick Actions */}
          <div className="detail-card" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Administrative Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => handleImpersonateUser(user)}
                className="btn-primary btn-impersonate"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '10px', fontSize: '13px' }}
              >
                <FaUserSecret /> Impersonate Merchant
              </button>
              <button 
                onClick={handleRevokeSessions}
                className="btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '10px', fontSize: '13px' }}
              >
                <FaLock /> Revoke Active Sessions
              </button>
              <button 
                onClick={() => handleDeleteUser(user._id, user.name)}
                className="btn-primary btn-delete-merchant"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', padding: '10px', fontSize: '13px' }}
              >
                <FaTrash /> Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="merchant-360-content" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 1: OVERVIEW & SUBSCRIPTION */}
          {activeTab === 'overview' && (
            <>
              {/* Profile Card */}
              <div className="detail-card" style={{ margin: 0 }}>
                <h3><FaInfoCircle /> Account Identity</h3>
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
                    <span>Account Created:</span>
                    <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              {/* Subscription Card */}
              <div className="detail-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}><FaCoins /> Subscription & Commercials</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => setShowDiscountModal(true)}>
                      <FaTag /> Apply Discount
                    </button>
                    <button className="btn-primary" onClick={() => setShowEditModal(true)}>
                      <FaEdit /> Modify Subscription
                    </button>
                  </div>
                </div>
                <div className="detail-rows">
                  <div className="detail-row">
                    <span>Current Plan:</span>
                    <strong>{user.subscriptionPlan}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Subscription Status:</span>
                    <strong>{user.subscriptionStatus?.toUpperCase()}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Monthly Billed Rate:</span>
                    <strong>₹{user.monthlyPrice} / month</strong>
                  </div>
                  <div className="detail-row">
                    <span>Custom Discount:</span>
                    <strong>{user.customDiscount || 0}% OFF</strong>
                  </div>
                  <div className="detail-row">
                    <span>Subscription End Date:</span>
                    <strong>{user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: EFFECTIVE ACCESS MATRIX & OVERRIDES */}
          {activeTab === 'permissions' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}><FaShieldAlt /> Effective Access Diagnostics Matrix</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Shows resolution chain: Base Profile &rarr; Plan Features &rarr; Allow Overrides &rarr; Deny Overrides &rarr; Final Access
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" onClick={handleResetToDefaults} disabled={savingOverrides}>
                    <FaUndo /> Reset to Defaults
                  </button>
                  <button className="btn-primary" onClick={() => handleSaveOverrides(true)} disabled={savingOverrides}>
                    <FaCheck /> {savingOverrides ? 'Saving...' : 'Save & Revoke Sessions'}
                  </button>
                </div>
              </div>

              {/* Diagnostic Flow Banner */}
              <div style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-subtle, #e4e7ec)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: '700' }}>Base Profile</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {baseProfile?.name || 'Default'} (<code>{baseProfile?.key}</code>)
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: '700' }}>Custom Overrides</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: overrides?.hasOverrides ? '#f59e0b' : '#10b981', marginTop: '4px' }}>
                      {overrides?.hasOverrides ? 'Active Custom Overrides' : 'None (Strict Plan Defaults)'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: '700' }}>Final Visible Pages</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1677ff', marginTop: '4px' }}>
                      {effectivePages.length} pages enabled
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: '700' }}>Final Permissions</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0d9488', marginTop: '4px' }}>
                      {effectivePermissions.length} permissions granted
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Profile Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Override Base Permission Profile (Optional)
                </label>
                <select
                  value={customProfile}
                  onChange={(e) => setCustomProfile(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="">Inherit from Plan Default ({baseProfile?.name})</option>
                  {availableProfiles.map(p => (
                    <option key={p._id} value={p.key}>{p.name} ({p.key}) - {p.category}</option>
                  ))}
                </select>
              </div>

              {/* Module Checklists */}
              <h4 style={{ margin: '20px 0 10px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Granular Page Access & Blacklist Overrides
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Check green to force ALLOW a page, or check red to explicitly DENY/blacklist a page for this specific merchant.
              </p>

              {canonicalMetadata?.pageGroups && Object.entries(canonicalMetadata.pageGroups).map(([grp, pgs]) => (
                <div key={grp} style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-subtle, #e4e7ec)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
                    {grp.replace('_', ' ').toUpperCase()} MODULES
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                    {pgs.map(page => {
                      const isInherited = baseProfile?.pages?.includes(page.key);
                      const isAllowedOverride = allowedPages.includes(page.key);
                      const isDeniedOverride = deniedPages.includes(page.key);
                      const isFinalEffective = (isInherited || isAllowedOverride) && !isDeniedOverride;

                      return (
                        <div 
                          key={page.key} 
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'var(--bg-elevated, #ffffff)',
                            border: `1px solid ${isFinalEffective ? '#1677ff' : '#e4e7ec'}`,
                            borderRadius: '6px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{page.label}</div>
                            <code style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{page.key}</code>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              title="Force Allow Page Override"
                              onClick={() => handleToggleAllowPage(page.key)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                background: isAllowedOverride ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
                                color: isAllowedOverride ? '#ffffff' : '#10b981'
                              }}
                            >
                              Allow
                            </button>
                            <button
                              type="button"
                              title="Force Deny Page Override"
                              onClick={() => handleToggleDenyPage(page.key)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                background: isDeniedOverride ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                                color: isDeniedOverride ? '#ffffff' : '#ef4444'
                              }}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: INTEGRATION HEALTH */}
          {activeTab === 'integrations' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaNetworkWired /> Live Operations & Integration Diagnostics</h3>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>WhatsApp Cloud API:</span>
                  <strong>{user.whatsappConnected ? 'CONNECTED' : 'NOT CONNECTED'}</strong>
                </div>
                <div className="detail-row">
                  <span>Connected Phone Number:</span>
                  <strong>{user.whatsappPhoneNumber || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Active CRM Connectors:</span>
                  <strong>{integrations?.crmConnectionsCount || 0} configured</strong>
                </div>
                {integrations?.crmConnections?.map(conn => (
                  <div key={conn._id} className="detail-row">
                    <span>{conn.provider?.toUpperCase()} ({conn.displayName}):</span>
                    <strong style={{ color: conn.status === 'connected' ? '#10b981' : '#f59e0b' }}>
                      {conn.status?.toUpperCase()}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AI USAGE */}
          {activeTab === 'ai-usage' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaBrain /> AI Token & Resource Consumption</h3>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Gemini Tokens Used:</span>
                  <strong>{(user.geminiTokensUsed || 0).toLocaleString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Gemini Token Limit:</span>
                  <strong>{(user.geminiTokensLimit || 0).toLocaleString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Conversations Processed:</span>
                  <strong>{stats?.totalConversations || 0}</strong>
                </div>
                <div className="detail-row">
                  <span>Broadcast Messages Sent:</span>
                  <strong>{stats?.totalBroadcasts || 0}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="detail-card" style={{ margin: 0 }}>
              <h3><FaChartLine /> Platform Activity Logs</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Detailed session and sync event logs are accessible via Super Admin Audit Logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT SUBSCRIPTION MODAL */}
      {showEditModal && (
        <div className="prof-modal-overlay">
          <div className="prof-modal prof-modal-small">
            <div className="prof-modal-header">
              <h3>Edit Subscription Plan</h3>
              <button className="prof-modal-close" onClick={() => setShowEditModal(false)}><FaTimes /></button>
            </div>
            <div className="prof-modal-body">
              <div className="prof-form-group" style={{ marginBottom: '14px' }}>
                <label>Subscription Plan</label>
                <select
                  value={editForm.subscriptionPlan}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                >
                  {ALL_PLAN_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label} - {opt.category}</option>
                  ))}
                </select>
              </div>
              <div className="prof-form-group" style={{ marginBottom: '14px' }}>
                <label>Status</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="prof-form-group" style={{ marginBottom: '14px' }}>
                <label>Monthly Price (₹)</label>
                <input
                  type="number"
                  value={editForm.monthlyPrice}
                  onChange={(e) => setEditForm({ ...editForm, monthlyPrice: Number(e.target.value) })}
                />
              </div>
              <div className="prof-form-group">
                <label>Gemini Tokens Limit</label>
                <input
                  type="number"
                  value={editForm.geminiTokensLimit}
                  onChange={(e) => setEditForm({ ...editForm, geminiTokensLimit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="prof-modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateSubscription}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="prof-modal-overlay">
          <div className="prof-modal prof-modal-small">
            <div className="prof-modal-header">
              <h3>Apply Special Discount</h3>
              <button className="prof-modal-close" onClick={() => setShowDiscountModal(false)}><FaTimes /></button>
            </div>
            <div className="prof-modal-body">
              <div className="prof-form-group">
                <label>Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="prof-modal-footer">
              <button className="btn-secondary" onClick={() => setShowDiscountModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleApplyDiscount}>Apply Discount</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
