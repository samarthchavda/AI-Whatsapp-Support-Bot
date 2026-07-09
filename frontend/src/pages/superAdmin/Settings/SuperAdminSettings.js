import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlug, FaSave, FaEye, FaEyeSlash, FaInfoCircle, FaTrash, FaCopy } from 'react-icons/fa';
import api from '../../../services/api';
import '../Dashboard/SuperAdmin.css';
import './SuperAdminSettings.css';

function SuperAdminSettings() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_webhook_verify_token: '',
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [showToken, setShowToken] = useState(false);
  const [showRazorpayKey, setShowRazorpayKey] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const getWebhookUrl = () => {
    const apiBase = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      return `${baseUrl}/api/webhook/whatsapp`;
    }

    return `${window.location.origin}${baseUrl}/api/webhook/whatsapp`;
  };

  const handleCopyWebhook = () => {
    const webhookUrl = getWebhookUrl();
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [loading, setLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingRazorpay, setSavingRazorpay] = useState(false);
  const [hasWhatsAppKeys, setHasWhatsAppKeys] = useState(false);
  const [hasRazorpayKeys, setHasRazorpayKeys] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Protect route
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg('');
      const response = await api.get('/super-admin/settings');
      if (response.data?.success) {
        const settings = response.data.data;
        setFormData({
          whatsapp_access_token: settings.whatsapp_access_token || '',
          whatsapp_phone_number_id: settings.whatsapp_phone_number_id || '',
          whatsapp_business_account_id: settings.whatsapp_business_account_id || '',
          whatsapp_webhook_verify_token: settings.whatsapp_webhook_verify_token || '',
          razorpay_key_id: settings.razorpay_key_id || '',
          razorpay_key_secret: settings.razorpay_key_secret || ''
        });
        setHasWhatsAppKeys(!!(settings.whatsapp_access_token && settings.whatsapp_phone_number_id));
        setHasRazorpayKeys(!!(settings.razorpay_key_id && settings.razorpay_key_secret));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (!silent) setErrorMsg('Failed to load system settings. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    try {
      setSavingWhatsApp(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await api.post('/super-admin/settings', {
        settings: {
          whatsapp_access_token: formData.whatsapp_access_token,
          whatsapp_phone_number_id: formData.whatsapp_phone_number_id,
          whatsapp_business_account_id: formData.whatsapp_business_account_id,
          whatsapp_webhook_verify_token: formData.whatsapp_webhook_verify_token
        }
      });

      if (response.data?.success) {
        setSuccessMsg(hasWhatsAppKeys ? 'System WhatsApp credentials updated successfully! ✅' : 'System WhatsApp credentials saved successfully! ✅');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error saving WhatsApp settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save WhatsApp credentials.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSaveRazorpay = async (e) => {
    e.preventDefault();
    try {
      setSavingRazorpay(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await api.post('/super-admin/settings', {
        settings: {
          razorpay_key_id: formData.razorpay_key_id,
          razorpay_key_secret: formData.razorpay_key_secret
        }
      });

      if (response.data?.success) {
        setSuccessMsg(hasRazorpayKeys ? 'Razorpay Gateway credentials updated successfully! ✅' : 'Razorpay Gateway credentials saved successfully! ✅');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error saving Razorpay settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save Razorpay credentials.');
    } finally {
      setSavingRazorpay(false);
    }
  };

  const handleDeleteWhatsApp = async () => {
    if (!window.confirm('Are you sure you want to delete all WhatsApp settings? This will delete them from the database.')) {
      return;
    }
    try {
      setSavingWhatsApp(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await api.post('/super-admin/settings', {
        settings: {
          whatsapp_access_token: '',
          whatsapp_phone_number_id: '',
          whatsapp_business_account_id: '',
          whatsapp_webhook_verify_token: ''
        }
      });

      if (response.data?.success) {
        setSuccessMsg('System WhatsApp credentials deleted successfully! ✅');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error deleting WhatsApp settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to delete WhatsApp credentials.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleDeleteRazorpay = async () => {
    if (!window.confirm('Are you sure you want to delete all Razorpay settings? This will delete them from the database.')) {
      return;
    }
    try {
      setSavingRazorpay(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await api.post('/super-admin/settings', {
        settings: {
          razorpay_key_id: '',
          razorpay_key_secret: ''
        }
      });

      if (response.data?.success) {
        setSuccessMsg('Razorpay Gateway credentials deleted successfully! ✅');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error deleting Razorpay settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to delete Razorpay credentials.');
    } finally {
      setSavingRazorpay(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="super-admin-settings-container">
      <div className="page-header">
        <h1 className="page-title">
          <FaPlug style={{ color: '#6366f1' }} /> System Connection Settings
        </h1>
        <p className="page-subtitle">Configure the default platform WhatsApp Cloud API credentials and Razorpay payment gateway credentials.</p>
      </div>

      {successMsg && (
        <div className="premium-alert premium-alert-success">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="premium-alert premium-alert-danger">
          {errorMsg}
        </div>
      )}

      {/* Meta WhatsApp Cloud API Credentials */}
      <div className="glass-card">
        <h3 className="section-title">
          Meta WhatsApp Cloud API Credentials
        </h3>

        <form onSubmit={handleSaveWhatsApp} className="settings-form">
          <div className="settings-field">
            <label className="settings-label">Phone Number ID</label>
            <input
              type="text"
              name="whatsapp_phone_number_id"
              value={formData.whatsapp_phone_number_id}
              onChange={handleChange}
              placeholder="e.g. 1140434719159859"
              className="premium-input"
              required
            />
            <span className="field-desc">This is the 15-digit ID provided by Meta for the specific phone number.</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">WhatsApp Business Account ID</label>
            <input
              autoComplete='off'
              type="text"
              name="whatsapp_business_account_id"
              value={formData.whatsapp_business_account_id}
              onChange={handleChange}
              placeholder="e.g. 856186027099439"
              className="premium-input"
              required
            />
            <span className="field-desc">This is the Business Account ID under which your phone number and templates are registered.</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">Webhook Verification Token</label>
            <input
              type="text"
              name="whatsapp_webhook_verify_token"
              value={formData.whatsapp_webhook_verify_token}
              onChange={handleChange}
              placeholder="Enter your webhook verify token"
              className="premium-input"
              required
            />
            <span className="field-desc">Matches the verification token configured in Meta's Webhook settings.</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">WhatsApp Webhook Callback URL</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                readOnly
                value={getWebhookUrl()}
                className="premium-input"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="copy-btn"
              >
                <FaCopy /> {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <span className="field-desc">Copy this URL and configure it as the Callback URL in your Meta WhatsApp Developer console.</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">Meta Access Token (System User Token)</label>
            <div className="input-relative">
              <input
                type={showToken ? 'text' : 'password'}
                name="whatsapp_access_token"
                value={formData.whatsapp_access_token}
                onChange={handleChange}
                placeholder="EAABo4oSoqvkBR..."
                className="premium-input"
                style={{ paddingRight: '50px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="eye-btn"
              >
                {showToken ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span className="field-desc">Generate a permanent system user token in your Business Manager settings with <code>whatsapp_business_messaging</code> permissions.</span>
          </div>

          <div className="info-box">
            <FaInfoCircle style={{ color: '#6366f1', flexShrink: 0 }} />
            <span className="info-text">Saving WhatsApp credentials will override the default WhatsApp settings in your server `.env` file dynamically.</span>
          </div>

          <div className="btn-group">
            {hasWhatsAppKeys ? (
              <>
                <button
                  type="submit"
                  disabled={savingWhatsApp}
                  className="btn-premium-primary"
                >
                  <FaSave /> {savingWhatsApp ? 'Updating WhatsApp...' : 'Update WhatsApp Settings'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWhatsApp}
                  disabled={savingWhatsApp}
                  className="btn-premium-danger"
                >
                  <FaTrash /> Delete Credentials
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={savingWhatsApp}
                className="btn-premium-primary"
                style={{ width: '100%' }}
              >
                <FaSave /> {savingWhatsApp ? 'Saving WhatsApp Settings...' : 'Save WhatsApp Settings'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Razorpay Payment Gateway Credentials */}
      <div className="glass-card razorpay-card">
        <h3 className="section-title">
          Razorpay Payment Gateway Credentials
        </h3>

        <form onSubmit={handleSaveRazorpay} className="settings-form">
          <div className="settings-field">
            <label className="settings-label">Razorpay Key ID</label>
            <div className="input-relative">
              <input
                type={showRazorpayKey ? 'text' : 'password'}
                name="razorpay_key_id"
                value={formData.razorpay_key_id}
                onChange={handleChange}
                placeholder="e.g. rzp_test_xxxxxxxxxxxxxx"
                className="premium-input"
                style={{ paddingRight: '50px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowRazorpayKey(!showRazorpayKey)}
                className="eye-btn"
              >
                {showRazorpayKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span className="field-desc">This is the public Key ID generated from your Razorpay Dashboard Settings.</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">Razorpay Key Secret</label>
            <div className="input-relative">
              <input
                type={showRazorpaySecret ? 'text' : 'password'}
                name="razorpay_key_secret"
                value={formData.razorpay_key_secret}
                onChange={handleChange}
                placeholder="Enter your Razorpay Key Secret"
                className="premium-input"
                style={{ paddingRight: '50px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                className="eye-btn"
              >
                {showRazorpaySecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span className="field-desc">Keep this Key Secret secure. Never expose it to the frontend code.</span>
          </div>

          <div className="info-box rzp-info">
            <FaInfoCircle style={{ color: '#10b981', flexShrink: 0 }} />
            <span className="info-text">Saving Razorpay credentials will override the default Razorpay settings in your server `.env` file dynamically.</span>
          </div>

          <div className="btn-group">
            {hasRazorpayKeys ? (
              <>
                <button
                  type="submit"
                  disabled={savingRazorpay}
                  className="btn-premium-primary"
                >
                  <FaSave /> {savingRazorpay ? 'Updating Razorpay...' : 'Update Razorpay Settings'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRazorpay}
                  disabled={savingRazorpay}
                  className="btn-premium-danger"
                >
                  <FaTrash /> Delete Credentials
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={savingRazorpay}
                className="btn-premium-primary"
                style={{ width: '100%' }}
              >
                <FaSave /> {savingRazorpay ? 'Saving Razorpay Settings...' : 'Save Razorpay Settings'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuperAdminSettings;
