import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlug, FaSave, FaEye, FaEyeSlash, FaInfoCircle, FaTrash, FaCopy } from 'react-icons/fa';
import api from '../services/api';
import './SuperAdmin.css';

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
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaPlug style={{ color: '#6366f1' }} /> System Connection Settings
        </h1>
        <p className="page-subtitle">Configure the default platform WhatsApp Cloud API credentials and Razorpay payment gateway credentials.</p>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ padding: '12px 20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#fafafa', borderRadius: '8px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fafafa', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {/* Meta WhatsApp Cloud API Credentials */}
      <div className="super-admin-card" style={{ padding: '32px', background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(63, 63, 70, 0.3)', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fafafa', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Meta WhatsApp Cloud API Credentials
        </h3>

        <form onSubmit={handleSaveWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Phone Number ID</label>
            <input
              type="text"
              name="whatsapp_phone_number_id"
              value={formData.whatsapp_phone_number_id}
              onChange={handleChange}
              placeholder="e.g. 1140434719159859"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>This is the 15-digit ID provided by Meta for the specific phone number.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>WhatsApp Business Account ID</label>
            <input
              type="text"
              name="whatsapp_business_account_id"
              value={formData.whatsapp_business_account_id}
              onChange={handleChange}
              placeholder="e.g. 856186027099439"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>This is the Business Account ID under which your phone number and templates are registered.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Webhook Verification Token</label>
            <input
              type="text"
              name="whatsapp_webhook_verify_token"
              value={formData.whatsapp_webhook_verify_token}
              onChange={handleChange}
              placeholder="Enter your webhook verify token"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>Matches the verification token configured in Meta's Webhook settings.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>WhatsApp Webhook Callback URL</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                readOnly
                value={getWebhookUrl()}
                style={{ width: '100%', padding: '12px 16px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#a1a1aa', cursor: 'default' }}
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                style={{ padding: '12px 20px', background: '#3f3f46', border: 'none', borderRadius: '8px', color: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <FaCopy /> {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Copy this URL and configure it as the Callback URL in your Meta WhatsApp Developer console.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Meta Access Token (System User Token)</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showToken ? 'text' : 'password'}
                name="whatsapp_access_token"
                value={formData.whatsapp_access_token}
                onChange={handleChange}
                placeholder="EAABo4oSoqvkBR..."
                style={{ width: '100%', padding: '12px 50px 12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                {showToken ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Generate a permanent system user token in your Business Manager settings with <code>whatsapp_business_messaging</code> permissions.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <FaInfoCircle style={{ color: '#6366f1', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.4' }}>Saving WhatsApp credentials will override the default WhatsApp settings in your server `.env` file dynamically.</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
            {hasWhatsAppKeys ? (
              <>
                <button
                  type="submit"
                  disabled={savingWhatsApp}
                  className="btn-primary"
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#6366f1', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  <FaSave /> {savingWhatsApp ? 'Updating WhatsApp...' : 'Update WhatsApp Settings'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWhatsApp}
                  disabled={savingWhatsApp}
                  className="btn-danger"
                  style={{ padding: '14px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  <FaTrash /> Delete Credentials
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={savingWhatsApp}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#6366f1', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
              >
                <FaSave /> {savingWhatsApp ? 'Saving WhatsApp Settings...' : 'Save WhatsApp Settings'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Razorpay Payment Gateway Credentials */}
      <div className="super-admin-card" style={{ padding: '32px', background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(63, 63, 70, 0.3)', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fafafa', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Razorpay Payment Gateway Credentials
        </h3>

        <form onSubmit={handleSaveRazorpay} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Razorpay Key ID</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showRazorpayKey ? 'text' : 'password'}
                name="razorpay_key_id"
                value={formData.razorpay_key_id}
                onChange={handleChange}
                placeholder="e.g. rzp_test_xxxxxxxxxxxxxx"
                style={{ width: '100%', padding: '12px 50px 12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowRazorpayKey(!showRazorpayKey)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                {showRazorpayKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#71717a' }}>This is the public Key ID generated from your Razorpay Dashboard Settings.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Razorpay Key Secret</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showRazorpaySecret ? 'text' : 'password'}
                name="razorpay_key_secret"
                value={formData.razorpay_key_secret}
                onChange={handleChange}
                placeholder="Enter your Razorpay Key Secret"
                style={{ width: '100%', padding: '12px 50px 12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                {showRazorpaySecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Keep this Key Secret secure. Never expose it to the frontend code.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <FaInfoCircle style={{ color: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.4' }}>Saving Razorpay credentials will override the default Razorpay settings in your server `.env` file dynamically.</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
            {hasRazorpayKeys ? (
              <>
                <button
                  type="submit"
                  disabled={savingRazorpay}
                  className="btn-primary"
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  <FaSave /> {savingRazorpay ? 'Updating Razorpay...' : 'Update Razorpay Settings'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRazorpay}
                  disabled={savingRazorpay}
                  className="btn-danger"
                  style={{ padding: '14px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  <FaTrash /> Delete Credentials
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={savingRazorpay}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
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
