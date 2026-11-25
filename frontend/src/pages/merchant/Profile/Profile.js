import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { updateAdminProfile, getAdminProfile, changeAdminPassword } from '../../../services/api';
import {
  FaUser,
  FaStore,
  FaGlobe,
  FaSave,
  FaEnvelope,
  FaPhone,
  FaLink,
  FaBuilding,
  FaDollarSign,
  FaClock,
  FaRobot,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaPalette,
  FaLock,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import './Profile.css';

const MERCHANT_EDITABLE_FIELDS = [
  'name',
  'businessName',
  'businessPhone',
  'storeUrl',
  'storeCategory',
  'supportEmail',
  'timezone',
  'aiDraftMode'
];

const SUPER_ADMIN_EDITABLE_FIELDS = ['name', 'timezone'];

function Profile({ admin, onUpdateAdmin }) {
  const onUpdateAdminRef = useRef(onUpdateAdmin);
  onUpdateAdminRef.current = onUpdateAdmin;

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: admin?.role || '',
    businessName: '',
    businessPhone: '',
    storeUrl: '',
    storeCategory: '',
    supportEmail: '',
    currency: 'USD',
    timezone: 'UTC',
    theme: 'light',
    aiDraftMode: false,
    subscriptionPlan: 'starter',
    subscriptionStatus: 'trial',
    geminiTokensUsed: 0,
    geminiTokensLimit: 10000,
    totalMessagesProcessed: 0
  });
  const [originalData, setOriginalData] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', text: '' });

  // Change password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Custom Branding States (merchants only)
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [removeCredits, setRemoveCredits] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  const isSuperAdmin = profileData.role === 'super_admin';

  const buildSnapshot = useCallback((data) => {
    const fields =
      data?.role === 'super_admin' ? SUPER_ADMIN_EDITABLE_FIELDS : MERCHANT_EDITABLE_FIELDS;
    const snap = {};
    fields.forEach((f) => {
      if (f === 'aiDraftMode') {
        snap[f] = Boolean(data?.[f]);
      } else {
        snap[f] = (data?.[f] || '').toString();
      }
    });
    return snap;
  }, []);

  const hasChanges = useCallback(() => {
    const fields = isSuperAdmin ? SUPER_ADMIN_EDITABLE_FIELDS : MERCHANT_EDITABLE_FIELDS;
    return fields.some((field) => {
      if (field === 'aiDraftMode') {
        return Boolean(profileData[field]) !== Boolean(originalData[field]);
      }
      const current = (profileData[field] || '').toString().trim();
      const original = (originalData[field] || '').toString().trim();
      return current !== original;
    });
  }, [isSuperAdmin, profileData, originalData]);

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: '', text: '' }), 3500);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getAdminProfile();
        if (response.data?.success) {
          const fetchedAdmin = response.data.data.admin;
          setProfileData(fetchedAdmin);
          setBrandName(fetchedAdmin.customBranding?.brandName || '');
          setLogoUrl(fetchedAdmin.customBranding?.logoUrl || '');
          setRemoveCredits(fetchedAdmin.customBranding?.removeCredits || false);
          setOriginalData(buildSnapshot(fetchedAdmin));
          onUpdateAdminRef.current?.(fetchedAdmin);
        }
      } catch (error) {
        showToast('error', 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [buildSnapshot]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = isSuperAdmin
        ? {
            name: profileData.name,
            timezone: profileData.timezone
          }
        : {
            name: profileData.name,
            businessName: profileData.businessName,
            businessPhone: profileData.businessPhone,
            storeUrl: profileData.storeUrl,
            storeCategory: profileData.storeCategory,
            supportEmail: profileData.supportEmail,
            currency: profileData.currency,
            timezone: profileData.timezone,
            theme: profileData.theme,
            aiDraftMode: Boolean(profileData.aiDraftMode)
          };

      const response = await updateAdminProfile(payload);
      if (response.data?.success) {
        const updatedAdmin = response.data.data.admin;
        setProfileData(updatedAdmin);
        setOriginalData(buildSnapshot(updatedAdmin));
        onUpdateAdminRef.current?.(updatedAdmin);
        showToast('success', 'Settings saved.');
      }
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        text: 'New password must be at least 6 characters long.'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        text: 'New password and confirmation do not match.'
      });
      return;
    }

    try {
      setChangingPassword(true);
      const res = await changeAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.data?.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordFeedback({
          type: 'success',
          text: 'Password updated. All other active sessions have been signed out.'
        });
      }
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Could not update password.'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    try {
      setSavingBranding(true);
      const response = await updateAdminProfile({
        customBranding: {
          brandName,
          logoUrl,
          removeCredits
        }
      });
      if (response.data?.success) {
        const updatedAdmin = response.data.data.admin;
        setProfileData(updatedAdmin);
        setBrandName(updatedAdmin.customBranding?.brandName || '');
        setLogoUrl(updatedAdmin.customBranding?.logoUrl || '');
        setRemoveCredits(updatedAdmin.customBranding?.removeCredits || false);
        onUpdateAdminRef.current?.(updatedAdmin);
        showToast('success', 'Custom branding saved.');
      }
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Failed to save branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const PLAN_LIMITS = {
    starter: { tokens: 100000, messages: 500 },
    professional: { tokens: 500000, messages: 2500 },
    enterprise: { tokens: 2000000, messages: 10000 },
    custom: { tokens: Infinity, messages: Infinity }
  };

  const plan = (profileData.subscriptionPlan || 'starter').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const tokenLimit = profileData.geminiTokensLimit || limits.tokens;
  const messageLimit = limits.messages;
  const tokensUsed = profileData.geminiTokensUsed || 0;
  const messagesProcessed = profileData.totalMessagesProcessed || 0;
  const tokenUsagePercent = tokenLimit === Infinity ? 0 : Math.round((tokensUsed / tokenLimit) * 100);
  const messageUsagePercent = messageLimit === Infinity ? 0 : Math.round((messagesProcessed / messageLimit) * 100);
  const isApproachingLimit = tokenUsagePercent >= 90 || messageUsagePercent >= 90;
  const isLimitBreached = tokensUsed >= tokenLimit || messagesProcessed >= messageLimit;

  if (loading) {
    return (
      <div className="profile-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header-section">
        <h1>{isSuperAdmin ? 'Account & Security' : 'Profile & Store Settings'}</h1>
        <p className="profile-subtitle">
          {isSuperAdmin
            ? 'Manage your Super Admin profile details, timezone, and account password.'
            : 'Manage your merchant account preferences and store configurations.'}
        </p>
      </div>

      {/* Quota Limit Warning / Critical Banner (Merchants only) */}
      {!isSuperAdmin &&
        (isLimitBreached ? (
          <div className="profile-alert-message alert-error" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <FaTimesCircle style={{ fontSize: '20px', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '15px' }}>Monthly AI limits reached — Bot paused</strong>
              <span style={{ fontSize: '13px', opacity: 0.95 }}>
                Your automated support bot is paused after reaching 100% of monthly limits.{' '}
                <Link to="/dashboard/billing" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}>
                  Upgrade your plan
                </Link>{' '}
                to reactivate it.
              </span>
            </div>
          </div>
        ) : isApproachingLimit ? (
          <div className="profile-alert-message alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <FaTimesCircle style={{ fontSize: '20px', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '15px' }}>Approaching monthly limits (Over 90% used)</strong>
              <span style={{ fontSize: '13px', opacity: 0.95 }}>
                Your account has consumed more than 90% of monthly limits. Consider{' '}
                <Link to="/dashboard/billing" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}>
                  upgrading your plan
                </Link>.
              </span>
            </div>
          </div>
        ) : null)}

      {/* Floating Toast Popup */}
      {toast.show && (
        <div className={`profile-toast profile-toast-${toast.type}`}>
          <div className="profile-toast-icon">
            {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
          </div>
          <span className="profile-toast-text">{toast.text}</span>
          <button className="profile-toast-close" onClick={() => setToast({ show: false, type: '', text: '' })}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="profile-grid">
        {/* Left Side: Account Overview */}
        <div className="profile-info-sidebar">
          <div className="profile-card user-overview-card">
            <div className="user-avatar-large">
              {profileData.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <h2 className="user-name">{profileData.name}</h2>
            <p className="user-email">{profileData.email}</p>
            <div className="role-plan-badges">
              <span className={`profile-badge role-badge role-${profileData.role}`}>
                {profileData.role?.replace('_', ' ')}
              </span>
              {!isSuperAdmin && (
                <span className={`profile-badge plan-badge plan-${profileData.subscriptionPlan}`}>
                  {profileData.subscriptionPlan?.toUpperCase()} PLAN
                </span>
              )}
            </div>

            {!isSuperAdmin && (
              <div className="overview-stats">
                <div className="stat-row">
                  <span>Store Currency:</span>
                  <strong style={{ textTransform: 'uppercase' }}>{profileData.currency || 'USD'} (Auto-synced)</strong>
                </div>

                <div className="stat-usage-section" style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', width: '100%' }}>
                  <div className="stat-row" style={{ marginBottom: '6px' }}>
                    <span>Gemini Token Usage:</span>
                    <strong>{tokensUsed.toLocaleString()} / {tokenLimit === Infinity ? 'Unlimited' : tokenLimit.toLocaleString()}</strong>
                  </div>
                  <div className="usage-progress-bar-container" style={{ marginBottom: '14px' }}>
                    <div
                      className="usage-progress-bar-fill"
                      style={{
                        width: `${tokenLimit === Infinity ? 0 : Math.min(100, (tokensUsed / tokenLimit) * 100)}%`,
                        background: tokenLimit !== Infinity && tokensUsed / tokenLimit >= 0.9 ? 'var(--danger)' : undefined
                      }}
                    ></div>
                  </div>

                  <div className="stat-row" style={{ marginBottom: '6px' }}>
                    <span>Messages Processed:</span>
                    <strong>{messagesProcessed.toLocaleString()} / {messageLimit === Infinity ? 'Unlimited' : messageLimit.toLocaleString()}</strong>
                  </div>
                  <div className="usage-progress-bar-container" style={{ marginBottom: '14px' }}>
                    <div
                      className="usage-progress-bar-fill"
                      style={{
                        width: `${messageLimit === Infinity ? 0 : Math.min(100, (messagesProcessed / messageLimit) * 100)}%`,
                        background: messageLimit !== Infinity && messagesProcessed / messageLimit >= 0.9 ? 'var(--danger)' : undefined
                      }}
                    ></div>
                  </div>

                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <Link
                      to="/dashboard/billing"
                      style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      Manage Subscriptions &amp; Billing
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Profile Forms & Password Security */}
        <div className="profile-forms-main">
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaUser className="section-icon" style={{ color: 'var(--text-secondary)' }} />
                <h3>Personal Information</h3>
              </div>

              <div className="form-group-grid">
                <div className="form-group">
                  <label htmlFor="name">Full name</label>
                  <div className="input-with-icon">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      placeholder="Full name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Account email</label>
                  <div className="input-with-icon">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      id="email"
                      value={profileData.email || ''}
                      disabled
                      style={{ opacity: 0.75, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="profile-card form-section-card">
                <div className="section-title-wrapper">
                  <FaStore className="section-icon" style={{ color: 'var(--text-secondary)' }} />
                  <h3>Store &amp; Business Details</h3>
                </div>

                <div className="form-group-grid">
                  <div className="form-group">
                    <label htmlFor="businessName">Business / Store name</label>
                    <div className="input-with-icon">
                      <FaBuilding className="input-icon" />
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        value={profileData.businessName || ''}
                        onChange={handleChange}
                        placeholder="e.g. Acme Retailers"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="businessPhone">Store phone number</label>
                    <div className="input-with-icon">
                      <FaPhone className="input-icon" />
                      <input
                        type="tel"
                        id="businessPhone"
                        name="businessPhone"
                        value={profileData.businessPhone || ''}
                        onChange={handleChange}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="storeUrl">Store website URL</label>
                    <div className="input-with-icon">
                      <FaLink className="input-icon" />
                      <input
                        type="url"
                        id="storeUrl"
                        name="storeUrl"
                        value={profileData.storeUrl || ''}
                        onChange={handleChange}
                        placeholder="e.g. https://mystore.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="storeCategory">Store category</label>
                    <div className="input-with-icon">
                      <FaStore className="input-icon" />
                      <select
                        id="storeCategory"
                        name="storeCategory"
                        value={profileData.storeCategory || ''}
                        onChange={handleChange}
                      >
                        <option value="">Select Category</option>
                        <option value="Fashion & Apparel">Fashion &amp; Apparel</option>
                        <option value="Electronics & Gadgets">Electronics &amp; Gadgets</option>
                        <option value="Health & Beauty">Health &amp; Beauty</option>
                        <option value="Home & Kitchen">Home &amp; Kitchen</option>
                        <option value="Food & Beverages">Food &amp; Beverages</option>
                        <option value="Services & Consulting">Services &amp; Consulting</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="supportEmail">Customer support email</label>
                    <div className="input-with-icon">
                      <FaEnvelope className="input-icon" />
                      <input
                        type="email"
                        id="supportEmail"
                        name="supportEmail"
                        value={profileData.supportEmail || ''}
                        onChange={handleChange}
                        placeholder="e.g. support@mystore.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaGlobe className="section-icon" style={{ color: 'var(--text-secondary)' }} />
                <h3>Preferences &amp; Regional</h3>
              </div>

              <div className="form-group-grid">
                {!isSuperAdmin && (
                  <div className="form-group">
                    <label htmlFor="currency">Store currency</label>
                    <div className="input-with-icon">
                      <FaDollarSign className="input-icon" />
                      <input
                        type="text"
                        id="currency"
                        name="currency"
                        value={`${profileData.currency || 'USD'} (Auto-synced from store)`}
                        disabled
                        style={{ opacity: 0.75, cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                )}

                <div className={`form-group${isSuperAdmin ? ' full-width' : ''}`}>
                  <label htmlFor="timezone">Timezone</label>
                  <div className="input-with-icon">
                    <FaClock className="input-icon" />
                    <select
                      id="timezone"
                      name="timezone"
                      value={profileData.timezone}
                      onChange={handleChange}
                    >
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">EST (New York)</option>
                      <option value="America/Chicago">CST (Chicago)</option>
                      <option value="America/Denver">MST (Denver)</option>
                      <option value="America/Los_Angeles">PST (Los Angeles)</option>
                      <option value="Europe/London">GMT/BST (London)</option>
                      <option value="Asia/Kolkata">IST (Kolkata)</option>
                      <option value="Asia/Dubai">GST (Dubai)</option>
                      <option value="Asia/Singapore">SGT (Singapore)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="profile-card form-section-card">
                <div className="section-title-wrapper">
                  <FaRobot className="section-icon" style={{ color: 'var(--text-secondary)' }} />
                  <h3>AI Agent Settings</h3>
                </div>
                <div className="form-group-checkbox">
                  <label className="checkbox-switch-label">
                    <input
                      type="checkbox"
                      id="aiDraftMode"
                      name="aiDraftMode"
                      checked={Boolean(profileData.aiDraftMode)}
                      onChange={(e) => {
                        setProfileData((prev) => ({
                          ...prev,
                          aiDraftMode: e.target.checked
                        }));
                      }}
                    />
                    <span className="checkbox-slider"></span>
                    <div className="checkbox-text-info">
                      <strong>AI suggested draft replies</strong>
                      <p>
                        Instead of replying directly to customers on WhatsApp, generate a draft reply in Live Chat for human agents to review and send.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {hasChanges() && (
              <div className="form-action-button-row form-action-slide-in">
                <button type="submit" className="btn-save-profile" disabled={saving}>
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>

          {/* Change Password Section (Super Admin & Merchants) */}
          <form onSubmit={handleChangePassword} className="profile-card form-section-card profile-password-card">
            <div className="section-title-wrapper">
              <FaLock className="section-icon" style={{ color: 'var(--text-secondary)' }} />
              <h3>Security &amp; Password</h3>
            </div>

            <div className="form-group-grid">
              <div className="form-group full-width">
                <label htmlFor="currentPassword">Current password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    id="currentPassword"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="profile-eye-btn"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPw ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    id="newPassword"
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="profile-eye-btn"
                    onClick={() => setShowNewPw((v) => !v)}
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    {showNewPw ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    id="confirmPassword"
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            {passwordFeedback && (
              <div role="status" className={`profile-inline-feedback ${passwordFeedback.type}`}>
                {passwordFeedback.text}
              </div>
            )}

            <div className="form-action-button-row" style={{ marginTop: '18px' }}>
              <button type="submit" className="btn-save-profile" disabled={changingPassword}>
                <FaLock /> {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Custom Branding Card (Merchants only) */}
          {!isSuperAdmin && (
            <div className="profile-card form-section-card branding-section-card" style={{ marginTop: '25px' }}>
              <div className="section-title-wrapper">
                <FaPalette className="section-icon" style={{ color: 'var(--text-secondary)' }} />
                <h3>Custom Branding (White-Labeling)</h3>
              </div>

              {!(plan === 'enterprise' || plan === 'custom') ? (
                <div className="branding-locked-overlay">
                  <div className="locked-content">
                    <span className="lock-icon"><FaLock /></span>
                    <h4>Scale Plan Feature Only</h4>
                    <p>Upgrade your subscription to replace Kwickbot branding with your own brand name and logo.</p>
                    <Link to="/dashboard/billing" className="btn-upgrade-branding">
                      Upgrade Subscription Plan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="form-group-grid">
                  <div className="form-group">
                    <label htmlFor="brandName">Custom brand name</label>
                    <input
                      type="text"
                      id="brandName"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Acme Support"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="logoUrl">Custom logo URL</label>
                    <input
                      type="url"
                      id="logoUrl"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="e.g. https://mystore.com/logo.png"
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: '10px' }}>
                    <label className="checkbox-switch-label">
                      <input
                        type="checkbox"
                        checked={removeCredits}
                        onChange={(e) => setRemoveCredits(e.target.checked)}
                      />
                      <span className="checkbox-slider"></span>
                      <div className="checkbox-text-info">
                        <strong>Remove Kwickbot Branding</strong>
                        <p>Strip "Powered by Kwickbot" and credit labels from this dashboard.</p>
                      </div>
                    </label>
                  </div>

                  {(brandName !== (profileData.customBranding?.brandName || '') ||
                    logoUrl !== (profileData.customBranding?.logoUrl || '') ||
                    removeCredits !== (profileData.customBranding?.removeCredits || false)) && (
                    <div className="branding-action-row" style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                      <button
                        type="button"
                        className="btn-save-branding"
                        onClick={handleSaveBranding}
                        disabled={savingBranding}
                      >
                        <FaSave /> {savingBranding ? 'Saving...' : 'Save Branding'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
