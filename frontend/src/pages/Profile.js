import React, { useState, useEffect, useCallback } from 'react';
import { updateAdminProfile, getAdminProfile } from '../services/api';
import { FaUser, FaStore, FaGlobe, FaSave, FaSun, FaMoon, FaEnvelope, FaPhone, FaLink, FaBuilding, FaDollarSign, FaClock, FaRobot, FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import './Profile.css';

// Fields that are editable and should be compared for changes
const EDITABLE_FIELDS = ['name', 'businessName', 'businessPhone', 'storeUrl', 'storeCategory', 'supportEmail', 'timezone'];

function Profile({ admin, onUpdateAdmin }) {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: '',
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

  // Check if any editable field has changed from its original value
  const hasChanges = useCallback(() => {
    return EDITABLE_FIELDS.some(field => {
      const current = (profileData[field] || '').toString().trim();
      const original = (originalData[field] || '').toString().trim();
      return current !== original;
    });
  }, [profileData, originalData]);

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
          // Store a snapshot of the original editable fields
          const snapshot = {};
          EDITABLE_FIELDS.forEach(f => { snapshot[f] = fetchedAdmin[f] || ''; });
          setOriginalData(snapshot);
          if (onUpdateAdmin) {
            onUpdateAdmin(fetchedAdmin);
          }
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        showToast('error', 'Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const payload = {
        name: profileData.name,
        businessName: profileData.businessName,
        businessPhone: profileData.businessPhone,
        storeUrl: profileData.storeUrl,
        storeCategory: profileData.storeCategory,
        supportEmail: profileData.supportEmail,
        currency: profileData.currency,
        timezone: profileData.timezone,
        theme: profileData.theme,
        aiDraftMode: profileData.aiDraftMode
      };

      const response = await updateAdminProfile(payload);
      if (response.data?.success) {
        const updatedAdmin = response.data.data.admin;
        setProfileData(updatedAdmin);
        // Update the original snapshot so hasChanges resets to false
        const snapshot = {};
        EDITABLE_FIELDS.forEach(f => { snapshot[f] = updatedAdmin[f] || ''; });
        setOriginalData(snapshot);
        if (onUpdateAdmin) {
          onUpdateAdmin(updatedAdmin);
        }
        showToast('success', 'Settings saved successfully! ✅');
      }
    } catch (error) {
      console.error('Error updating admin profile:', error);
      showToast('error', error.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (theme) => {
    setProfileData(prev => ({ ...prev, theme }));
    try {
      const response = await updateAdminProfile({ theme });
      if (response.data?.success) {
        const updatedAdmin = response.data.data.admin;
        if (onUpdateAdmin) {
          onUpdateAdmin(updatedAdmin);
        }
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

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
        <h1>Profile & Store Settings</h1>
        <p className="profile-subtitle">Manage your merchant account preferences and store configurations.</p>
      </div>

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
        {/* Left Side: Merchant Info Overview */}
        <div className="profile-info-sidebar">
          <div className="profile-card user-overview-card">
            <div className="user-avatar-large">
              {profileData.name?.charAt(0)?.toUpperCase()}
            </div>
            <h2 className="user-name">{profileData.name}</h2>
            <p className="user-email">{profileData.email}</p>
            <div className="role-plan-badges">
              <span className={`profile-badge role-badge role-${profileData.role}`}>
                {profileData.role?.replace('_', ' ')}
              </span>
              <span className={`profile-badge plan-badge plan-${profileData.subscriptionPlan}`}>
                {profileData.subscriptionPlan?.toUpperCase()} PLAN
              </span>
            </div>

            <div className="overview-stats">
              <div className="stat-row">
                <span>Store Currency:</span>
                <strong style={{ textTransform: 'uppercase' }}>{profileData.currency || 'USD'} (Auto-synced)</strong>
              </div>
              <div className="stat-row">
                <span>Messages Processed:</span>
                <strong>{profileData.totalMessagesProcessed}</strong>
              </div>
              <div className="stat-row">
                <span>Gemini API Usage:</span>
                <strong>{profileData.geminiTokensUsed} / {profileData.geminiTokensLimit} tokens</strong>
              </div>
              <div className="usage-progress-bar-container">
                <div 
                  className="usage-progress-bar-fill"
                  style={{ width: `${Math.min(100, (profileData.geminiTokensUsed / profileData.geminiTokensLimit) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Theme Preference Quick selector */}
          <div className="profile-card theme-preference-card">
            <h3>Theme Preference</h3>
            <div className="theme-toggle-options">
              <button 
                type="button"
                className={`theme-option-btn light-option ${profileData.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <FaSun />
                <span>Light</span>
              </button>
              <button 
                type="button"
                className={`theme-option-btn dark-option ${profileData.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <FaMoon />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration Forms */}
        <div className="profile-forms-main">
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaUser className="section-icon text-accent" />
                <h3>Personal Information</h3>
              </div>
              
              <div className="form-group-grid">
                <div className="form-group full-width">
                  <label htmlFor="name">Full Name</label>
                  <div className="input-with-icon">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaStore className="section-icon text-accent" />
                <h3>Store & Business Details</h3>
              </div>

              <div className="form-group-grid">
                <div className="form-group">
                  <label htmlFor="businessName">Business / Store Name</label>
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
                  <label htmlFor="businessPhone">Store Phone Number</label>
                  <div className="input-with-icon">
                    <FaPhone className="input-icon" />
                    <input
                      type="tel"
                      id="businessPhone"
                      name="businessPhone"
                      value={profileData.businessPhone || ''}
                      onChange={handleChange}
                      placeholder="e.g. +1 (555) 019-2834"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="storeUrl">Store Website URL</label>
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
                  <label htmlFor="storeCategory">Store Category</label>
                  <div className="input-with-icon">
                    <FaStore className="input-icon" />
                    <select
                      id="storeCategory"
                      name="storeCategory"
                      value={profileData.storeCategory || ''}
                      onChange={handleChange}
                    >
                      <option value="">Select Category</option>
                      <option value="Fashion & Apparel">Fashion & Apparel</option>
                      <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                      <option value="Health & Beauty">Health & Beauty</option>
                      <option value="Home & Kitchen">Home & Kitchen</option>
                      <option value="Food & Beverages">Food & Beverages</option>
                      <option value="Services & Consulting">Services & Consulting</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="supportEmail">Customer Support Email</label>
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

            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaGlobe className="section-icon text-accent" />
                <h3>Preferences & Regional</h3>
              </div>

              <div className="form-group-grid">
                <div className="form-group">
                  <label htmlFor="currency">Store Currency</label>
                  <div className="input-with-icon">
                    <FaDollarSign className="input-icon" />
                    <input
                      type="text"
                      id="currency"
                      name="currency"
                      value={`${profileData.currency || 'USD'} (Auto-synced from store)`}
                      disabled
                      style={{ opacity: 0.85, cursor: 'not-allowed', backgroundColor: 'rgba(0,0,0,0.05)' }}
                    />
                  </div>
                </div>

                <div className="form-group">
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

            {/* AI Agent Settings temporarily disabled as per user request
            <div className="profile-card form-section-card">
              <div className="section-title-wrapper">
                <FaRobot className="section-icon text-accent" />
                <h3>AI Agent Settings</h3>
              </div>
              <div className="form-group-checkbox">
                <label className="checkbox-switch-label">
                  <input
                    type="checkbox"
                    id="aiDraftMode"
                    name="aiDraftMode"
                    checked={profileData.aiDraftMode || false}
                    onChange={(e) => {
                      setProfileData(prev => ({
                        ...prev,
                        aiDraftMode: e.target.checked
                      }));
                    }}
                  />
                  <span className="checkbox-slider"></span>
                  <div className="checkbox-text-info">
                    <strong>AI suggested draft replies</strong>
                    <p>Instead of the AI bot replying directly to the customer on WhatsApp, it will generate a suggested reply draft in the Live Chat CRM for human agents to edit and send.</p>
                  </div>
                </label>
              </div>
            </div>
            */}

            {hasChanges() && (
              <div className="form-action-button-row form-action-slide-in">
                <button type="submit" className="btn-save-profile" disabled={saving}>
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
