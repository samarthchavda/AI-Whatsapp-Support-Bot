import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSave,
  FaEye,
  FaEyeSlash,
  FaTrash,
  FaCopy,
  FaWhatsapp,
  FaBolt,
  FaUndo,
  FaPaperPlane,
  FaChevronRight
} from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminSettings.css';

const BASE_URL =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : window.location.origin);

const TABS = [
  { id: 'ai', label: 'AI Engine' },
  { id: 'smtp', label: 'Email & SMTP' },
  { id: 'meta', label: 'Meta & Webhooks' },
  { id: 'payments', label: 'Payments & GST' }
];

const GEMINI_MODEL_OPTIONS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const OPENAI_MODEL_OPTIONS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];

const TAB_KEYS = {
  ai: [
    'gemini_api_key',
    'gemini_model',
    'openai_api_key',
    'openai_model',
    'ai_max_output_tokens',
    'ai_max_messages_per_minute',
    'usd_to_inr_rate',
    'high_priority_keywords'
  ],
  smtp: [
    'smtp_host',
    'smtp_port',
    'smtp_secure',
    'smtp_user',
    'smtp_pass',
    'resend_api_key',
    'from_email',
    'admin_email',
    'escalation_email'
  ],
  meta: [
    'meta_app_id',
    'meta_config_id',
    'meta_client_secret',
    'meta_webhook_signature_mode',
    'meta_webhook_extra_app_secrets',
    'whatsapp_webhook_verify_token',
    'whatsapp_access_token',
    'whatsapp_phone_number_id',
    'whatsapp_business_account_id',
    'webhook_url',
    'webhook_secret_token',
    'shopify_webhook_secret',
    'woocommerce_webhook_secret'
  ]
};

const SECRET_KEYS = new Set([
  'gemini_api_key',
  'openai_api_key',
  'smtp_pass',
  'resend_api_key',
  'meta_client_secret',
  'meta_webhook_extra_app_secrets',
  'whatsapp_webhook_verify_token',
  'whatsapp_access_token',
  'webhook_secret_token',
  'shopify_webhook_secret',
  'woocommerce_webhook_secret',
  'razorpay_key_id',
  'razorpay_key_secret'
]);

const DEFAULT_BOOTSTRAP_KEYS = [
  'MONGODB_URI',
  'PORT',
  'NODE_ENV',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CREDENTIALS_ENCRYPTION_KEY',
  'FILE_SIGNING_SECRET',
  'SWAGGER_USER',
  'SWAGGER_PASS_HASH',
  'SUPER_ADMIN_API_URL',
  'SUPER_ADMIN_API_KEY'
];

function StatusTag({ source }) {
  if (source === 'db') {
    return (
      <span className="cfg-source cfg-source-db">
        <span className="cfg-dot" />
        Saved in DB
      </span>
    );
  }
  if (source === 'env') {
    return (
      <span className="cfg-source cfg-source-env">
        <span className="cfg-dot" />
        Via .env
      </span>
    );
  }
  if (source === 'default') {
    return <span className="cfg-source">Default</span>;
  }
  return <span className="cfg-source">Not set</span>;
}

function getInitialTab() {
  const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  if (TABS.some((t) => t.id === hash)) return hash;
  return 'ai';
}

function SuperAdminSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Razorpay credentials state
  const [formData, setFormData] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [hasRazorpayKeys, setHasRazorpayKeys] = useState(false);

  // Dynamic integrations state
  const [integrations, setIntegrations] = useState({});
  const [sources, setSources] = useState({});
  const [envDefaults, setEnvDefaults] = useState({});
  const [bootstrapEnvKeys, setBootstrapEnvKeys] = useState(DEFAULT_BOOTSTRAP_KEYS);

  // Secret field visibility toggles
  const [revealed, setRevealed] = useState({});
  const [showRazorpayKey, setShowRazorpayKey] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  // Super Admin WhatsApp connection
  const [superAdminWhatsApp, setSuperAdminWhatsApp] = useState({
    connected: false,
    phoneNumber: null,
    wabaId: null,
    phoneNumberId: null,
    connectedAt: null
  });

  // Invoice business profile
  const [invoiceProfile, setInvoiceProfile] = useState(null);
  const [invoiceStates, setInvoiceStates] = useState([]);
  const [savingInvoiceProfile, setSavingInvoiceProfile] = useState(false);
  const [invoiceProfileMsg, setInvoiceProfileMsg] = useState(null);
  const [previewingInvoice, setPreviewingInvoice] = useState(false);

  // UI feedback
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [savingTab, setSavingTab] = useState('');
  const [savingRazorpay, setSavingRazorpay] = useState(false);
  const [testingAction, setTestingAction] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const fetchSettings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get('/super-admin/settings?includeIntegrations=1');
      if (response.data?.success) {
        const settings = response.data.data || {};
        const nextSources = settings.integrationSources || {};
        const nextEnvDefaults = settings.envDefaults || {};

        const mergedFields = {};
        Object.values(TAB_KEYS)
          .flat()
          .forEach((key) => {
            if (SECRET_KEYS.has(key)) {
              mergedFields[key] = settings[key] || '';
            } else {
              mergedFields[key] =
                settings[key] !== undefined && settings[key] !== ''
                  ? String(settings[key])
                  : String(nextEnvDefaults[key] || '');
            }
          });

        setIntegrations(mergedFields);
        setSources(nextSources);
        setEnvDefaults(nextEnvDefaults);
        if (Array.isArray(settings.bootstrapEnvKeys)) {
          setBootstrapEnvKeys(settings.bootstrapEnvKeys);
        }

        setFormData({
          razorpay_key_id: settings.razorpay_key_id || nextEnvDefaults.razorpay_key_id || '',
          razorpay_key_secret: settings.razorpay_key_secret || ''
        });
        setHasRazorpayKeys(
          nextSources.razorpay_key_id === 'db' || nextSources.razorpay_key_secret === 'db'
        );

        if (settings.invoice_business_profile) setInvoiceProfile(settings.invoice_business_profile);
        if (Array.isArray(settings.invoice_states)) setInvoiceStates(settings.invoice_states);
        if (settings.superAdminWhatsApp) setSuperAdminWhatsApp(settings.superAdminWhatsApp);
        setTestEmailAddress((prev) => prev || mergedFields.admin_email || mergedFields.smtp_user || '');
      }
    } catch (err) {
      if (!silent) {
        setStatusMessage({
          type: 'error',
          text: 'Could not load settings. Reload the page or check backend connectivity.'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setStatusMessage(null);
    window.history.replaceState(null, '', `${window.location.pathname}#${tabId}`);
  };

  const exchangeAuthCode = useCallback(async (code) => {
    try {
      setEmbeddedLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const redirectUri = window.location.href.split('#')[0];
      const res = await fetch(`${BASE_URL}/api/webhook/embedded-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
        setStatusMessage({
          type: 'success',
          text: 'Super Admin WhatsApp Business connected via Meta Embedded Signup.'
        });
        await fetchSettings(true);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to connect Super Admin WhatsApp'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to exchange credentials with backend'
      });
    } finally {
      setEmbeddedLoading(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam && !window.__metaCodeHandled) {
      window.__metaCodeHandled = true;
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      exchangeAuthCode(codeParam);
    }
  }, [exchangeAuthCode]);

  useEffect(() => {
    const activeMetaAppId =
      integrations.meta_app_id || envDefaults.meta_app_id || process.env.REACT_APP_META_APP_ID || '2242808243238982';

    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: activeMetaAppId,
          cookie: true,
          status: false,
          xfbml: true,
          version: 'v25.0'
        });
      }
    };

    if (!document.getElementById('facebook-jssdk')) {
      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs?.parentNode?.insertBefore(js, fjs);
    }

    const handleMetaMessage = (event) => {
      if (event.origin.includes('facebook.com') || event.origin.includes('meta.com')) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH' && data.data) {
            if (data.data.waba_id) window.__metaWabaId = data.data.waba_id;
            if (data.data.phone_number_id) window.__metaPhoneNumberId = data.data.phone_number_id;
          }
        } catch (err) {
          // ignore cross-origin non-JSON payloads
        }
      }
    };
    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
  }, [integrations.meta_app_id, envDefaults.meta_app_id]);

  const getWebhookUrl = () => {
    const apiBase =
      process.env.REACT_APP_API_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5001/api'
        : '/api');
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      return `${baseUrl}/api/webhook/whatsapp`;
    }
    return `${window.location.origin}${baseUrl}/api/webhook/whatsapp`;
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchEmbeddedSignup = () => {
    setEmbeddedLoading(true);
    setStatusMessage(null);

    const appId =
      integrations.meta_app_id ||
      envDefaults.meta_app_id ||
      process.env.REACT_APP_META_APP_ID ||
      '2242808243238982';
    const configId =
      integrations.meta_config_id ||
      envDefaults.meta_config_id ||
      process.env.REACT_APP_META_CONFIG_ID ||
      '1066111046278122';

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
          exchangeAuthCode(response.authResponse.code);
        } else {
          setEmbeddedLoading(false);
        }
      }, loginOptions);
    } else {
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
        setStatusMessage({
          type: 'error',
          text: 'Pop-up window blocked by browser. Allow pop-ups and try again.'
        });
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
              if (code) exchangeAuthCode(code);
            }
          } catch (crossOriginErr) {
            // Expected while cross-origin
          }
        }, 500);
      }
    }
  };

  const handleDisconnectSuperAdmin = async () => {
    if (!window.confirm('Disconnect the Super Admin WhatsApp account?')) {
      return;
    }
    try {
      setLoading(true);
      await api.post('/webhook/disconnect');
      setStatusMessage({ type: 'success', text: 'Super Admin WhatsApp account disconnected.' });
      await fetchSettings(true);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to disconnect WhatsApp account'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setIntegrations((prev) => ({ ...prev, [key]: value }));
  };

  const toggleReveal = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveTab = async (tabId, e) => {
    e?.preventDefault();
    const keys = TAB_KEYS[tabId] || [];
    const payload = {};

    for (const key of keys) {
      const val = integrations[key];
      if (SECRET_KEYS.has(key)) {
        if (val && val !== '******' && String(val).trim() !== '') {
          payload[key] = String(val).trim();
        }
      } else if (val !== undefined) {
        payload[key] = String(val).trim();
      }
    }

    try {
      setSavingTab(tabId);
      setStatusMessage(null);
      const res = await api.post('/super-admin/settings', { settings: payload });
      if (res.data?.success) {
        const label = TABS.find((t) => t.id === tabId)?.label || 'Settings';
        setStatusMessage({
          type: 'success',
          text: `${label} saved to database. Active immediately across services.`
        });
        await fetchSettings(true);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save settings.'
      });
    } finally {
      setSavingTab('');
    }
  };

  const handleResetTabToEnv = async (tabId) => {
    const label = TABS.find((t) => t.id === tabId)?.label || 'this section';
    if (!window.confirm(`Clear ${label} overrides from DB and revert to server .env?`)) {
      return;
    }

    const keys = TAB_KEYS[tabId] || [];
    const payload = {};
    keys.forEach((k) => {
      payload[k] = '';
    });

    try {
      setSavingTab(tabId);
      setStatusMessage(null);
      const res = await api.post('/super-admin/settings', { settings: payload });
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: `${label} cleared from database. Reverted to server .env fallback.`
        });
        await fetchSettings(true);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to reset overrides.'
      });
    } finally {
      setSavingTab('');
    }
  };

  const handleTestGemini = async () => {
    try {
      setTestingAction('gemini');
      setStatusMessage(null);
      const res = await api.post('/super-admin/settings', {
        testAction: 'gemini',
        apiKey: integrations.gemini_api_key,
        model: integrations.gemini_model
      });
      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'Gemini connection verified.'
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Gemini connection failed.'
      });
    } finally {
      setTestingAction('');
    }
  };

  const handleTestSmtp = async () => {
    try {
      setTestingAction('smtp');
      setStatusMessage(null);
      const res = await api.post('/super-admin/settings', {
        testAction: 'smtp',
        testEmail: testEmailAddress
      });
      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'Test email sent.'
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Test email failed.'
      });
    } finally {
      setTestingAction('');
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleInvoiceProfileChange = (e) => {
    const { name, value } = e.target;
    setInvoiceProfile((prev) => ({
      ...prev,
      [name]: name === 'gstin' || name === 'pan' ? value.toUpperCase() : value
    }));
    setInvoiceProfileMsg(null);
  };

  const handleSaveInvoiceProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingInvoiceProfile(true);
      setInvoiceProfileMsg(null);
      await api.post('/super-admin/settings', {
        settings: { invoice_business_profile: invoiceProfile }
      });
      setInvoiceProfileMsg({
        type: 'success',
        text: 'Invoice business details saved.'
      });
      await fetchSettings(true);
    } catch (err) {
      setInvoiceProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save invoice details.'
      });
    } finally {
      setSavingInvoiceProfile(false);
    }
  };

  const handlePreviewInvoice = async () => {
    try {
      setPreviewingInvoice(true);
      const res = await api.get('/invoices/sample/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setInvoiceProfileMsg({
        type: 'error',
        text: 'Could not generate sample invoice.'
      });
    } finally {
      setPreviewingInvoice(false);
    }
  };

  const handleSaveRazorpay = async (e) => {
    e.preventDefault();
    try {
      setSavingRazorpay(true);
      setStatusMessage(null);
      const response = await api.post('/super-admin/settings', {
        settings: {
          razorpay_key_id: formData.razorpay_key_id,
          razorpay_key_secret: formData.razorpay_key_secret
        }
      });
      if (response.data?.success) {
        setStatusMessage({
          type: 'success',
          text: 'Razorpay credentials saved to database.'
        });
        await fetchSettings(true);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save Razorpay credentials.'
      });
    } finally {
      setSavingRazorpay(false);
    }
  };

  const handleDeleteRazorpay = async () => {
    if (!window.confirm('Clear Razorpay credentials from the database and revert to .env?')) {
      return;
    }
    try {
      setSavingRazorpay(true);
      setStatusMessage(null);
      const response = await api.post('/super-admin/settings', {
        settings: {
          razorpay_key_id: '',
          razorpay_key_secret: ''
        }
      });
      if (response.data?.success) {
        setStatusMessage({
          type: 'success',
          text: 'Razorpay overrides cleared.'
        });
        await fetchSettings(true);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete Razorpay credentials.'
      });
    } finally {
      setSavingRazorpay(false);
    }
  };

  const renderSecretInput = ({ keyName, label, placeholder, hint }) => {
    const src = sources[keyName] || 'unset';
    const isVisible = Boolean(revealed[keyName]);
    const effectivePlaceholder =
      src === 'env'
        ? 'Active via .env — enter a value only to override'
        : placeholder;

    return (
      <div className="cfg-field" key={keyName}>
        <div className="cfg-label-row">
          <label className="cfg-label" htmlFor={`cfg-${keyName}`}>
            {label}
          </label>
          <StatusTag source={src} />
        </div>
        <div className="cfg-input-wrap">
          <input
            id={`cfg-${keyName}`}
            type={isVisible ? 'text' : 'password'}
            value={integrations[keyName] || ''}
            onChange={(e) => handleFieldChange(keyName, e.target.value)}
            placeholder={effectivePlaceholder}
            className="cfg-input cfg-input-secret"
            autoComplete="new-password"
            data-lpignore="true"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => toggleReveal(keyName)}
            className="cfg-eye-btn"
            aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
          >
            {isVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {hint && <span className="cfg-hint">{hint}</span>}
      </div>
    );
  };

  const renderTextInput = ({ keyName, label, placeholder, hint, type = 'text' }) => {
    const src = sources[keyName] || 'unset';
    return (
      <div className="cfg-field" key={keyName}>
        <div className="cfg-label-row">
          <label className="cfg-label" htmlFor={`cfg-${keyName}`}>
            {label}
          </label>
          <StatusTag source={src} />
        </div>
        <input
          id={`cfg-${keyName}`}
          type={type}
          value={integrations[keyName] || ''}
          onChange={(e) => handleFieldChange(keyName, e.target.value)}
          placeholder={placeholder}
          className="cfg-input"
          autoComplete="off"
        />
        {hint && <span className="cfg-hint">{hint}</span>}
      </div>
    );
  };

  const tabSources = {
    ai: sources.gemini_api_key || 'unset',
    smtp:
      sources.resend_api_key === 'db' || sources.smtp_pass === 'db'
        ? 'db'
        : sources.resend_api_key === 'env' || sources.smtp_pass === 'env'
        ? 'env'
        : 'unset',
    meta:
      sources.meta_client_secret === 'db' || sources.whatsapp_access_token === 'db'
        ? 'db'
        : sources.meta_client_secret === 'env' || sources.whatsapp_access_token === 'env'
        ? 'env'
        : 'unset',
    payments:
      sources.razorpay_key_id === 'db' && sources.razorpay_key_secret === 'db'
        ? 'db'
        : sources.razorpay_key_id === 'env' || sources.razorpay_key_secret === 'env'
        ? 'env'
        : 'unset'
  };

  if (loading) {
    return (
      <div className="cfg-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="cfg-page">
      <header className="cfg-header">
        <div className="cfg-breadcrumb">Settings / Integrations</div>
        <h1 className="cfg-title">Integrations</h1>
        <p className="cfg-subtitle">
          Values saved here are encrypted in MongoDB and override <code>.env</code> without restarting. Untouched fields keep using <code>.env</code>.
        </p>
      </header>

      {/* Single Tab Switcher (no duplicate summary cards) */}
      <nav className="cfg-tabs" role="tablist" aria-label="Integration sections">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const src = tabSources[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`cfg-tab${isActive ? ' active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              <span
                className={`cfg-tab-dot${
                  src === 'db' ? ' is-db' : src === 'env' ? ' is-env' : ''
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {statusMessage && (
        <div
          role="status"
          className={`cfg-alert ${
            statusMessage.type === 'error' ? 'cfg-alert-error' : 'cfg-alert-success'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* TAB 1: AI ENGINE */}
      {activeTab === 'ai' && (
        <form onSubmit={(e) => handleSaveTab('ai', e)} className="cfg-stack">
          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Model providers</h2>
                <p className="cfg-panel-desc">
                  Primary Gemini credentials with optional OpenAI fallback.
                </p>
              </div>
              <button
                type="button"
                className="cfg-btn-secondary"
                onClick={handleTestGemini}
                disabled={testingAction === 'gemini'}
              >
                <FaBolt />
                {testingAction === 'gemini' ? 'Testing...' : 'Test Gemini'}
              </button>
            </div>

            <div className="cfg-grid-2">
              {renderSecretInput({
                keyName: 'gemini_api_key',
                label: 'Gemini API key',
                placeholder: 'Enter Gemini API key'
              })}

              <div className="cfg-field">
                <div className="cfg-label-row">
                  <label className="cfg-label" htmlFor="cfg-gemini_model">
                    Gemini model
                  </label>
                  <StatusTag source={sources.gemini_model || 'default'} />
                </div>
                <select
                  id="cfg-gemini_model"
                  className="cfg-input"
                  value={integrations.gemini_model || 'gemini-2.5-flash'}
                  onChange={(e) => handleFieldChange('gemini_model', e.target.value)}
                >
                  {GEMINI_MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {renderSecretInput({
                keyName: 'openai_api_key',
                label: 'OpenAI fallback key',
                placeholder: 'Optional sk-... backup key'
              })}

              <div className="cfg-field">
                <div className="cfg-label-row">
                  <label className="cfg-label" htmlFor="cfg-openai_model">
                    OpenAI fallback model
                  </label>
                  <StatusTag source={sources.openai_model || 'default'} />
                </div>
                <select
                  id="cfg-openai_model"
                  className="cfg-input"
                  value={integrations.openai_model || 'gpt-3.5-turbo'}
                  onChange={(e) => handleFieldChange('openai_model', e.target.value)}
                >
                  {OPENAI_MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Limits and escalation rules</h2>
                <p className="cfg-panel-desc">
                  Runtime token limits, per-customer throttling, and keyword triggers.
                </p>
              </div>
            </div>

            <div className="cfg-grid-3">
              {renderTextInput({
                keyName: 'ai_max_output_tokens',
                label: 'Max output tokens',
                type: 'number',
                placeholder: '1000'
              })}
              {renderTextInput({
                keyName: 'ai_max_messages_per_minute',
                label: 'Rate limit (msgs/min)',
                type: 'number',
                placeholder: '10'
              })}
              {renderTextInput({
                keyName: 'usd_to_inr_rate',
                label: 'USD to INR rate',
                type: 'number',
                placeholder: '85'
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              {renderTextInput({
                keyName: 'high_priority_keywords',
                label: 'Escalation trigger keywords',
                placeholder: 'urgent,critical,emergency,refund,complaint,angry,frustrated',
                hint: 'Comma separated keywords that escalate chats to human support.'
              })}
            </div>

            <div className="cfg-actions">
              <button
                type="submit"
                className="cfg-btn-primary"
                disabled={savingTab === 'ai'}
              >
                <FaSave />
                {savingTab === 'ai' ? 'Saving...' : 'Save AI settings'}
              </button>
              <button
                type="button"
                className="cfg-btn-ghost"
                onClick={() => handleResetTabToEnv('ai')}
                disabled={savingTab === 'ai'}
              >
                <FaUndo />
                Reset to .env
              </button>
            </div>
          </section>
        </form>
      )}

      {/* TAB 2: EMAIL & SMTP */}
      {activeTab === 'smtp' && (
        <form onSubmit={(e) => handleSaveTab('smtp', e)} className="cfg-stack">
          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">SMTP transport</h2>
                <p className="cfg-panel-desc">
                  Used for onboarding credentials, escalation notices, and password resets.
                </p>
              </div>
            </div>

            <div className="cfg-grid-3">
              {renderTextInput({
                keyName: 'smtp_host',
                label: 'SMTP host',
                placeholder: 'smtp.hostinger.com'
              })}
              {renderTextInput({
                keyName: 'smtp_port',
                label: 'SMTP port',
                type: 'number',
                placeholder: '465'
              })}
              <div className="cfg-field">
                <div className="cfg-label-row">
                  <label className="cfg-label" htmlFor="cfg-smtp_secure">
                    Security mode
                  </label>
                  <StatusTag source={sources.smtp_secure || 'default'} />
                </div>
                <select
                  id="cfg-smtp_secure"
                  className="cfg-input"
                  value={integrations.smtp_secure || 'false'}
                  onChange={(e) => handleFieldChange('smtp_secure', e.target.value)}
                >
                  <option value="true">SSL / TLS (465)</option>
                  <option value="false">STARTTLS / Auto (587)</option>
                </select>
              </div>
            </div>

            <div className="cfg-grid-2" style={{ marginTop: 16 }}>
              {renderTextInput({
                keyName: 'smtp_user',
                label: 'SMTP username',
                placeholder: 'hello@kwickbot.in'
              })}
              {renderSecretInput({
                keyName: 'smtp_pass',
                label: 'SMTP password',
                placeholder: 'Enter SMTP password'
              })}
            </div>
          </section>

          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Resend API and routing addresses</h2>
                <p className="cfg-panel-desc">
                  Resend overrides SMTP when present. Leave blank to keep using SMTP.
                </p>
              </div>
            </div>

            <div className="cfg-grid-2">
              {renderSecretInput({
                keyName: 'resend_api_key',
                label: 'Resend API key',
                placeholder: 'Optional re_... key'
              })}
              {renderTextInput({
                keyName: 'from_email',
                label: 'From email header',
                placeholder: 'Kwickbot <hello@kwickbot.in>'
              })}
              {renderTextInput({
                keyName: 'admin_email',
                label: 'Admin notification email',
                placeholder: 'hello@kwickbot.in'
              })}
              {renderTextInput({
                keyName: 'escalation_email',
                label: 'Escalation alert email',
                placeholder: 'hello@kwickbot.in'
              })}
            </div>

            <div className="cfg-inline-test">
              <div className="cfg-field" style={{ flex: 1 }}>
                <label className="cfg-label" htmlFor="test-email-recipient">
                  Test recipient
                </label>
                <input
                  id="test-email-recipient"
                  type="email"
                  className="cfg-input"
                  placeholder="Enter email to test saved delivery"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="cfg-btn-secondary"
                onClick={handleTestSmtp}
                disabled={testingAction === 'smtp'}
              >
                <FaPaperPlane />
                {testingAction === 'smtp' ? 'Sending...' : 'Send test email'}
              </button>
            </div>

            <div className="cfg-actions">
              <button
                type="submit"
                className="cfg-btn-primary"
                disabled={savingTab === 'smtp'}
              >
                <FaSave />
                {savingTab === 'smtp' ? 'Saving...' : 'Save email settings'}
              </button>
              <button
                type="button"
                className="cfg-btn-ghost"
                onClick={() => handleResetTabToEnv('smtp')}
                disabled={savingTab === 'smtp'}
              >
                <FaUndo />
                Reset to .env
              </button>
            </div>
          </section>
        </form>
      )}

      {/* TAB 3: META & WEBHOOKS */}
      {activeTab === 'meta' && (
        <div className="cfg-stack">
          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Super Admin WhatsApp number</h2>
                <p className="cfg-panel-desc">
                  Connected via Meta Embedded Signup for the operations assistant on <code>+91 8128420287</code>.
                </p>
              </div>
              <StatusTag source={superAdminWhatsApp.connected ? 'db' : 'unset'} />
            </div>

            <div className="cfg-kv-row">
              <div className="cfg-kv-item">
                <span className="cfg-kv-label">Phone number</span>
                <span className="cfg-kv-value">{superAdminWhatsApp.phoneNumber || 'Not connected'}</span>
              </div>
              <div className="cfg-kv-item">
                <span className="cfg-kv-label">WABA ID</span>
                <code className="cfg-kv-code">{superAdminWhatsApp.wabaId || 'Not connected'}</code>
              </div>
              <div className="cfg-kv-item">
                <span className="cfg-kv-label">State</span>
                <span className="cfg-kv-value">
                  {superAdminWhatsApp.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="cfg-actions">
              <button
                type="button"
                onClick={handleLaunchEmbeddedSignup}
                disabled={embeddedLoading}
                className="cfg-btn-primary"
              >
                <FaWhatsapp />
                {embeddedLoading
                  ? 'Connecting...'
                  : superAdminWhatsApp.connected
                  ? 'Reconnect WhatsApp'
                  : 'Connect WhatsApp'}
              </button>
              {superAdminWhatsApp.connected && (
                <button
                  type="button"
                  onClick={handleDisconnectSuperAdmin}
                  disabled={loading}
                  className="cfg-btn-danger"
                >
                  <FaTrash />
                  Disconnect
                </button>
              )}
            </div>
          </section>

          <form onSubmit={(e) => handleSaveTab('meta', e)} className="cfg-stack">
            <section className="cfg-panel">
              <div className="cfg-panel-head">
                <div>
                  <h2 className="cfg-panel-title">Meta app and webhook security</h2>
                  <p className="cfg-panel-desc">
                    Embedded Signup credentials and X-Hub-Signature-256 verification.
                  </p>
                </div>
              </div>

              <div className="cfg-field" style={{ marginBottom: 16 }}>
                <label className="cfg-label">Webhook callback URL</label>
                <div className="cfg-copy-row">
                  <input type="text" readOnly value={getWebhookUrl()} className="cfg-input" />
                  <button type="button" onClick={handleCopyWebhook} className="cfg-btn-secondary">
                    <FaCopy />
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>

              <div className="cfg-grid-2">
                {renderTextInput({
                  keyName: 'meta_app_id',
                  label: 'Meta App ID',
                  placeholder: '2242808243238982'
                })}
                {renderTextInput({
                  keyName: 'meta_config_id',
                  label: 'Embedded Signup Config ID',
                  placeholder: '1066111046278122'
                })}
                {renderSecretInput({
                  keyName: 'meta_client_secret',
                  label: 'Meta Client Secret',
                  placeholder: 'Enter Meta Client Secret'
                })}
                {renderSecretInput({
                  keyName: 'whatsapp_webhook_verify_token',
                  label: 'Webhook verify token',
                  placeholder: 'wh_vt_...'
                })}
                <div className="cfg-field">
                  <div className="cfg-label-row">
                    <label className="cfg-label" htmlFor="cfg-meta_webhook_signature_mode">
                      Signature verification
                    </label>
                    <StatusTag source={sources.meta_webhook_signature_mode || 'default'} />
                  </div>
                  <select
                    id="cfg-meta_webhook_signature_mode"
                    className="cfg-input"
                    value={integrations.meta_webhook_signature_mode || 'monitor'}
                    onChange={(e) => handleFieldChange('meta_webhook_signature_mode', e.target.value)}
                  >
                    <option value="monitor">monitor (log mismatches, allow traffic)</option>
                    <option value="enforce">enforce (reject invalid signatures)</option>
                    <option value="off">off (disabled)</option>
                  </select>
                </div>
                {renderSecretInput({
                  keyName: 'meta_webhook_extra_app_secrets',
                  label: 'Extra Meta app secrets',
                  placeholder: 'Comma separated secrets'
                })}
              </div>
            </section>

            <section className="cfg-panel">
              <div className="cfg-panel-head">
                <div>
                  <h2 className="cfg-panel-title">System Cloud API fallback and store webhooks</h2>
                  <p className="cfg-panel-desc">
                    Platform fallback token and HMAC secrets for Shopify and WooCommerce.
                  </p>
                </div>
              </div>

              <div className="cfg-grid-2">
                {renderSecretInput({
                  keyName: 'whatsapp_access_token',
                  label: 'System WhatsApp access token',
                  placeholder: 'EAA...'
                })}
                {renderTextInput({
                  keyName: 'whatsapp_phone_number_id',
                  label: 'System phone number ID',
                  placeholder: '1140434719159859'
                })}
                {renderTextInput({
                  keyName: 'whatsapp_business_account_id',
                  label: 'System WABA ID',
                  placeholder: '856186027099439'
                })}
                {renderSecretInput({
                  keyName: 'webhook_secret_token',
                  label: 'Internal webhook secret',
                  placeholder: 'Optional x-webhook-secret'
                })}
                {renderSecretInput({
                  keyName: 'shopify_webhook_secret',
                  label: 'Shopify webhook secret',
                  placeholder: 'Shopify HMAC secret'
                })}
                {renderSecretInput({
                  keyName: 'woocommerce_webhook_secret',
                  label: 'WooCommerce webhook secret',
                  placeholder: 'WooCommerce HMAC secret'
                })}
              </div>

              <div className="cfg-actions">
                <button
                  type="submit"
                  className="cfg-btn-primary"
                  disabled={savingTab === 'meta'}
                >
                  <FaSave />
                  {savingTab === 'meta' ? 'Saving...' : 'Save Meta settings'}
                </button>
                <button
                  type="button"
                  className="cfg-btn-ghost"
                  onClick={() => handleResetTabToEnv('meta')}
                  disabled={savingTab === 'meta'}
                >
                  <FaUndo />
                  Reset to .env
                </button>
              </div>
            </section>
          </form>
        </div>
      )}

      {/* TAB 4: PAYMENTS & GST */}
      {activeTab === 'payments' && (
        <div className="cfg-stack">
          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Razorpay gateway</h2>
                <p className="cfg-panel-desc">
                  Used for plan checkouts and renewals. Encrypted at rest in MongoDB.
                </p>
              </div>
              <StatusTag source={tabSources.payments} />
            </div>

            <form onSubmit={handleSaveRazorpay}>
              <div className="cfg-grid-2">
                <div className="cfg-field">
                  <div className="cfg-label-row">
                    <label className="cfg-label" htmlFor="rzp-key-id">
                      Razorpay Key ID
                    </label>
                    <StatusTag source={sources.razorpay_key_id || 'unset'} />
                  </div>
                  <div className="cfg-input-wrap">
                    <input
                      id="rzp-key-id"
                      type={showRazorpayKey ? 'text' : 'password'}
                      name="razorpay_key_id"
                      value={formData.razorpay_key_id}
                      onChange={handleChange}
                      placeholder={
                        sources.razorpay_key_id === 'env'
                          ? 'Active via .env — enter Key ID to override'
                          : 'rzp_live_...'
                      }
                      className="cfg-input cfg-input-secret"
                      autoComplete="new-password"
                      data-lpignore="true"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpayKey(!showRazorpayKey)}
                      className="cfg-eye-btn"
                      aria-label={showRazorpayKey ? 'Hide Key ID' : 'Show Key ID'}
                    >
                      {showRazorpayKey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="cfg-field">
                  <div className="cfg-label-row">
                    <label className="cfg-label" htmlFor="rzp-key-secret">
                      Razorpay Key Secret
                    </label>
                    <StatusTag source={sources.razorpay_key_secret || 'unset'} />
                  </div>
                  <div className="cfg-input-wrap">
                    <input
                      id="rzp-key-secret"
                      type={showRazorpaySecret ? 'text' : 'password'}
                      name="razorpay_key_secret"
                      value={formData.razorpay_key_secret}
                      onChange={handleChange}
                      placeholder={
                        sources.razorpay_key_secret === 'env'
                          ? 'Active via .env — enter Key Secret to override'
                          : 'Enter Key Secret'
                      }
                      className="cfg-input cfg-input-secret"
                      autoComplete="new-password"
                      data-lpignore="true"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      className="cfg-eye-btn"
                      aria-label={showRazorpaySecret ? 'Hide Key Secret' : 'Show Key Secret'}
                    >
                      {showRazorpaySecret ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="cfg-actions">
                <button type="submit" disabled={savingRazorpay} className="cfg-btn-primary">
                  <FaSave />
                  {savingRazorpay
                    ? 'Saving...'
                    : hasRazorpayKeys
                    ? 'Update Razorpay'
                    : 'Save Razorpay'}
                </button>
                {hasRazorpayKeys && (
                  <button
                    type="button"
                    onClick={handleDeleteRazorpay}
                    disabled={savingRazorpay}
                    className="cfg-btn-danger"
                  >
                    <FaTrash />
                    Clear overrides
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="cfg-panel">
            <div className="cfg-panel-head">
              <div>
                <h2 className="cfg-panel-title">Invoice business profile</h2>
                <p className="cfg-panel-desc">
                  Printed on generated PDF invoices. Existing invoices retain their issued details.
                </p>
              </div>
            </div>

            {invoiceProfile ? (
              <form onSubmit={handleSaveInvoiceProfile} className="cfg-grid-2">
                {[
                  ['legalName', 'Legal business name', 'Registered business name', 200],
                  ['tradeName', 'Trade name', 'Kwickbot', 120],
                  ['gstin', 'GSTIN', '24ABCDE1234F1Z5', 15],
                  ['pan', 'PAN (used when no GSTIN)', 'ABCDE1234F', 10],
                  ['addressLine', 'Registered address', 'Building, street, area', 300],
                  ['city', 'City', '', 120],
                  ['pincode', 'PIN code', '', 6],
                  ['email', 'Billing email', 'hello@kwickbot.in', 120],
                  ['phone', 'Billing phone', '+91 ...', 30],
                  ['website', 'Website', 'kwickbot.in', 120],
                  ['sacCode', 'SAC code', '998314', 10],
                  ['footerNote', 'Footer note', 'Thank you for choosing Kwickbot.', 300]
                ].map(([name, label, placeholder, max]) => (
                  <div
                    className={`cfg-field${name === 'addressLine' || name === 'footerNote' ? ' cfg-span-2' : ''}`}
                    key={name}
                  >
                    <label className="cfg-label" htmlFor={`inv-${name}`}>
                      {label}
                    </label>
                    <input
                      id={`inv-${name}`}
                      className="cfg-input"
                      name={name}
                      value={invoiceProfile[name] ?? ''}
                      onChange={handleInvoiceProfileChange}
                      placeholder={placeholder}
                      maxLength={max}
                    />
                  </div>
                ))}

                <div className="cfg-field">
                  <label className="cfg-label" htmlFor="inv-state">
                    State (place of supply)
                  </label>
                  <select
                    id="inv-state"
                    className="cfg-input"
                    name="state"
                    value={invoiceProfile.state || ''}
                    onChange={handleInvoiceProfileChange}
                  >
                    <option value="">Select state</option>
                    {invoiceStates.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cfg-field">
                  <label className="cfg-label" htmlFor="inv-gstRate">
                    GST rate (%)
                  </label>
                  <input
                    id="inv-gstRate"
                    className="cfg-input"
                    type="number"
                    min="0"
                    max="28"
                    step="0.5"
                    name="gstRate"
                    value={invoiceProfile.gstRate ?? 18}
                    onChange={handleInvoiceProfileChange}
                  />
                </div>

                <div className="cfg-actions cfg-span-2">
                  <button type="submit" className="cfg-btn-primary" disabled={savingInvoiceProfile}>
                    <FaSave />
                    {savingInvoiceProfile ? 'Saving...' : 'Save invoice details'}
                  </button>
                  <button
                    type="button"
                    className="cfg-btn-secondary"
                    onClick={handlePreviewInvoice}
                    disabled={previewingInvoice}
                  >
                    <FaEye />
                    {previewingInvoice ? 'Generating...' : 'Preview sample PDF'}
                  </button>
                </div>

                {invoiceProfileMsg && (
                  <div
                    role="status"
                    className={`cfg-span-2 cfg-alert ${
                      invoiceProfileMsg.type === 'error' ? 'cfg-alert-error' : 'cfg-alert-success'
                    }`}
                  >
                    {invoiceProfileMsg.text}
                  </div>
                )}
              </form>
            ) : (
              <p className="cfg-panel-desc">Loading...</p>
            )}
          </section>
        </div>
      )}

      {/* Quiet collapsible bootstrap reference */}
      <details className="cfg-bootstrap-details">
        <summary className="cfg-bootstrap-summary">
          <FaChevronRight className="cfg-bootstrap-caret" />
          <span>Bootstrap keys kept in server <code>.env</code></span>
          <span className="cfg-bootstrap-count">{bootstrapEnvKeys.length} keys</span>
        </summary>
        <div className="cfg-bootstrap-body">
          <p className="cfg-panel-desc" style={{ marginBottom: 12 }}>
            These keys are required before MongoDB connects or to decrypt stored credentials, so keep them in your server <code>backend/.env</code> file.
          </p>
          <div className="cfg-bootstrap-keys">
            {bootstrapEnvKeys.map((k) => (
              <code key={k} className="cfg-keychip">
                {k}
              </code>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

export default SuperAdminSettings;
