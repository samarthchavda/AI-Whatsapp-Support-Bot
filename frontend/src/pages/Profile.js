import React, { useState, useEffect } from 'react';
import { updateAdminProfile, getAdminProfile } from '../services/api';
import { FaUser, FaStore, FaGlobe, FaSave, FaSun, FaMoon, FaEnvelope, FaPhone, FaLink, FaBuilding, FaDollarSign, FaClock } from 'react-icons/fa';
import './Profile.css';

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
    subscriptionPlan: 'starter',
    subscriptionStatus: 'trial',
    geminiTokensUsed: 0,
    geminiTokensLimit: 10000,
    totalMessagesProcessed: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getAdminProfile();
        if (response.data?.success) {
          const fetchedAdmin = response.data.data.admin;
          setProfileData(fetchedAdmin);
          if (onUpdateAdmin) {
            onUpdateAdmin(fetchedAdmin);
          }
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile details.' });
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
      setMessage({ type: '', text: '' });
      
      const payload = {
        name: profileData.name,
        businessName: profileData.businessName,
        businessPhone: profileData.businessPhone,
        storeUrl: profileData.storeUrl,
        storeCategory: profileData.storeCategory,
        supportEmail: profileData.supportEmail,
        currency: profileData.currency,
        timezone: profileData.timezone,
        theme: profileData.theme
      };

      const response = await updateAdminProfile(payload);
      if (response.data?.success) {
        const updatedAdmin = response.data.data.admin;
        setProfileData(updatedAdmin);
        if (onUpdateAdmin) {
          onUpdateAdmin(updatedAdmin);
        }
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      }
    } catch (error) {
      console.error('Error updating admin profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings.' });
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

      {message.text && (
        <div className={`profile-alert-message alert-${message.type}`}>
          {message.text}
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
                  <label htmlFor="currency">Base Currency</label>
                  <div className="input-with-icon">
                    <FaDollarSign className="input-icon" />
                    <select
                      id="currency"
                      name="currency"
                      value={profileData.currency}
                      onChange={handleChange}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
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

            <div className="form-action-button-row">
              <button type="submit" className="btn-save-profile" disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
