import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlug, FaSave, FaEye, FaEyeSlash, FaInfoCircle, FaTrash, FaCopy, FaWhatsapp, FaCheckCircle, FaExclamationTriangle, FaUserCheck, FaSyncAlt } from 'react-icons/fa';
import api from '../../../services/api';
import '../Dashboard/SuperAdmin.css';
import './SuperAdminSettings.css';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5001' : window.location.origin);

function SuperAdminSettings() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [superAdminWhatsApp, setSuperAdminWhatsApp] = useState({
    connected: false,
    phoneNumber: null,
    wabaId: null,
    phoneNumberId: null,
    connectedAt: null
  });

  const [showRazorpayKey, setShowRazorpayKey] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [savingRazorpay, setSavingRazorpay] = useState(false);
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

  // Handle URL query parameters (?code=xxx) if redirected back from Meta OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam && !window.__metaCodeHandled) {
      window.__metaCodeHandled = true;
      console.log('✅ Captured Meta authorization code from URL parameters for Super Admin');
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      exchangeAuthCode(codeParam);
    }
  }, []);

  // Initialize Meta SDK dynamically
  useEffect(() => {
    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: process.env.REACT_APP_META_APP_ID || '2242808243238982',
          cookie: true,
          status: false,
          xfbml: true,
          version: 'v25.0'
        });
      }
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    const handleMetaMessage = (event) => {
      if (event.origin.includes('facebook.com') || event.origin.includes('meta.com')) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
            if (data.event === 'FINISH' && data.data) {
              if (data.data.waba_id) window.__metaWabaId = data.data.waba_id;
              if (data.data.phone_number_id) window.__metaPhoneNumberId = data.data.phone_number_id;
            }
          }
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
  }, []);

  const fetchSettings = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg('');
      const response = await api.get('/super-admin/settings');
      if (response.data?.success) {
        const settings = response.data.data;
        setFormData({
          razorpay_key_id: settings.razorpay_key_id || '',
          razorpay_key_secret: settings.razorpay_key_secret || ''
        });
        setHasRazorpayKeys(!!(settings.razorpay_key_id && settings.razorpay_key_secret));
        if (settings.superAdminWhatsApp) {
          setSuperAdminWhatsApp(settings.superAdminWhatsApp);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (!silent) setErrorMsg('Failed to load system settings. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

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

  const handleLaunchEmbeddedSignup = () => {
    setEmbeddedLoading(true);
    setErrorMsg('');

    const appId = process.env.REACT_APP_META_APP_ID || '2242808243238982';
    const configId = process.env.REACT_APP_META_CONFIG_ID || '1066111046278122';

    const loginOptions = {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3'
      }
    };

    const rawUri = window.location.href.split('#')[0].split('?')[0];
    const redirectUri = encodeURIComponent(rawUri);
    const extrasStr = encodeURIComponent(JSON.stringify(loginOptions.extras));
    const oauthUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&config_id=${configId}&redirect_uri=${redirectUri}&response_type=code&extras=${extrasStr}`;

    if (window.FB) {
      window.FB.login((response) => {
        if (response && response.authResponse && response.authResponse.code) {
          console.log('✅ Received Auth Code from Facebook SDK for Super Admin');
          exchangeAuthCode(response.authResponse.code);
        } else {
          console.warn('⚠️ FB.login popup closed or did not return auth code:', response);
          setEmbeddedLoading(false);
        }
      }, loginOptions);
    } else {
      openOAuthPopup(oauthUrl);
    }
  };

  const openOAuthPopup = (oauthUrl) => {
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      'MetaWhatsAppSuperAdminSignup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Pop-up window was blocked by your browser. Please allow pop-ups for kwickbot.in and try again.');
      setEmbeddedLoading(false);
    } else {
      const checkPopupInterval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopupInterval);
            setEmbeddedLoading(false);
            return;
          }
          if (popup.location && popup.location.href.includes('code=')) {
            const popupUrl = new URL(popup.location.href);
            const code = popupUrl.searchParams.get('code');
            popup.close();
            clearInterval(checkPopupInterval);
            if (code) {
              console.log('✅ Captured authorization code from popup window for Super Admin');
              exchangeAuthCode(code);
            }
          }
        } catch (crossOriginErr) {
          // Expected cross-origin restriction while user is on facebook.com
        }
      }, 500);
    }
  };

  const exchangeAuthCode = async (code) => {
    try {
      setEmbeddedLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const redirectUri = window.location.href.split('#')[0];
      const res = await fetch(`${BASE_URL}/api/webhook/embedded-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          redirectUri,
          wabaId: window.__metaWabaId || null,
          phoneNumberId: window.__metaPhoneNumberId || null
        })
      });

      if (!res.ok) {
        let errorData = {};
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { error: `HTTP ${res.status} occurred` };
        }
        throw new Error(errorData.error || errorData.message || 'Super Admin Embedded Signup failed');
      }

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('🎉 Super Admin WhatsApp Business connected successfully via Meta Embedded Signup!');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setErrorMsg(data.error || 'Failed to connect Super Admin WhatsApp');
      }
    } catch (err) {
      console.error('Super Admin exchange error:', err);
      setErrorMsg(err.message || 'Failed to exchange credentials with backend');
    } finally {
      setEmbeddedLoading(false);
    }
  };

  const handleDisconnectSuperAdmin = async () => {
    if (!window.confirm('Are you sure you want to disconnect the Super Admin WhatsApp account?')) {
      return;
    }
    try {
      setLoading(true);
      await api.post('/webhook/disconnect');
      setSuccessMsg('Super Admin WhatsApp account disconnected successfully.');
      await fetchSettings(true);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error disconnecting Super Admin WhatsApp:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to disconnect WhatsApp account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  const handleDeleteRazorpay = async () => {
    if (!window.confirm('Are you sure you want to delete Razorpay settings? This will delete them from the database.')) {
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
        <p className="page-subtitle">Manage Super Admin WhatsApp connection via Meta Embedded Signup and Razorpay payment gateway credentials.</p>
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

      {/* Super Admin WhatsApp Connection Card */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaWhatsapp style={{ color: '#25d366', fontSize: '24px' }} />
            Super Admin WhatsApp Connection
          </h3>
          <span className={`status-badge-saas ${superAdminWhatsApp.connected ? 'status-active' : 'status-trial'}`} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '600' }}>
            {superAdminWhatsApp.connected ? '● Connected' : '● Disconnected'}
          </span>
        </div>

        <p className="field-desc" style={{ marginBottom: '20px' }}>
          Super Admin uses Meta Embedded Signup for secure 1-click WhatsApp Cloud API onboarding. Super Admin is restricted to <strong>exactly 1 active WhatsApp connection</strong>.
        </p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Phone Number</span>
              <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{superAdminWhatsApp.phoneNumber || 'Not connected'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>WABA Account ID</span>
              <code style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{superAdminWhatsApp.wabaId || 'Not connected'}</code>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Connection State</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: superAdminWhatsApp.connected ? '#10b981' : '#ef4444' }}>
                {superAdminWhatsApp.connected ? 'Active & Ready' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleLaunchEmbeddedSignup}
            disabled={embeddedLoading}
            className="btn-premium-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FaWhatsapp style={{ fontSize: '18px' }} />
            {embeddedLoading ? 'Launching Meta Signup...' : superAdminWhatsApp.connected ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
          </button>

          {superAdminWhatsApp.connected && (
            <button
              type="button"
              onClick={handleDisconnectSuperAdmin}
              disabled={loading}
              className="btn-premium-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <FaTrash /> Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Authorized Super Admin Assistant Card */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaUserCheck style={{ color: '#6366f1' }} /> Super Admin AI Operations Assistant
        </h3>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Authorized Super Admin Phone Number</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>+91 8128420287</div>
            </div>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
              ● Authorized & Active
            </span>
          </div>
        </div>
        <p className="field-desc" style={{ margin: 0 }}>
          Only messages received from <strong>+91 8128420287</strong> on the Super Admin WhatsApp connection will trigger the Super Admin AI Operations Assistant. The assistant queries live backend databases (System Health, Revenue, Merchant Accounts, active connections, and errors). Requests for secrets (passwords, tokens, keys) are strictly refused.
        </p>
      </div>

      {/* Webhook Configuration Details */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <h3 className="section-title">
          WhatsApp Webhook Configuration Details
        </h3>
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
          <span className="field-desc">This Callback URL is automatically subscribed when you connect via Meta Embedded Signup.</span>
        </div>
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
            <span className="info-text">Saving Razorpay credentials will override default Razorpay settings in your server `.env` file dynamically.</span>
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
