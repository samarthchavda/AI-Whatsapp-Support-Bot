import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlug,
  FaSave,
  FaEye,
  FaEyeSlash,
  FaInfoCircle,
  FaTrash,
  FaCopy,
  FaWhatsapp,
  FaUserCheck,
  FaFileInvoice,
  FaRobot,
  FaEnvelope,
  FaCreditCard,
  FaShieldAlt,
  FaBolt,
  FaUndo,
  FaPaperPlane,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../../services/api';
import '../Dashboard/SuperAdmin.css';
import './SuperAdminSettings.css';

const BASE_URL =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5001' : window.location.origin);

const TABS = [
  { id: 'ai', label: 'AI Engine', icon: FaRobot },
  { id: 'smtp', label: 'Email & SMTP', icon: FaEnvelope },
  { id: 'meta', label: 'Meta & Webhooks', icon: FaWhatsapp },
  { id: 'payments', label: 'Payments & GST', icon: FaCreditCard }
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

function SourceBadge({ source }) {
  if (source === 'db') {
    return <span className="source-pill source-db">● Saved in DB</span>;
  }
  if (source === 'env') {
    return <span className="source-pill source-env">● Active via .env</span>;
  }
  if (source === 'default') {
    return <span className="source-pill source-default">Default</span>;
  }
  return <span className="source-pill source-unset">Not set</span>;
}

function getInitialTab() {
  const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  if (TABS.some((t) => t.id === hash)) return hash;
  return 'ai';
}

function SuperAdminSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Razorpay state (preserved cleanly)
  const [formData, setFormData] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: ''
  });
  const [hasRazorpayKeys, setHasRazorpayKeys] = useState(false);

  // Dynamic integration fields
  const [integrations, setIntegrations] = useState({});
  const [sources, setSources] = useState({});
  const [envDefaults, setEnvDefaults] = useState({});
  const [bootstrapEnvKeys, setBootstrapEnvKeys] = useState(DEFAULT_BOOTSTRAP_KEYS);

  // Visibility toggles for secret inputs
  const [revealed, setRevealed] = useState({});
  const [showRazorpayKey, setShowRazorpayKey] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  // Super Admin WhatsApp Connected state
  const [superAdminWhatsApp, setSuperAdminWhatsApp] = useState({
    connected: false,
    phoneNumber: null,
    wabaId: null,
    phoneNumberId: null,
    connectedAt: null
  });

  // Invoice Business Profile state (preserved cleanly)
  const [invoiceProfile, setInvoiceProfile] = useState(null);
  const [invoiceStates, setInvoiceStates] = useState([]);
  const [savingInvoiceProfile, setSavingInvoiceProfile] = useState(false);
  const [invoiceProfileMsg, setInvoiceProfileMsg] = useState(null);
  const [previewingInvoice, setPreviewingInvoice] = useState(false);

  // UI & action state
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [embeddedLoading, setEmbeddedLoading] = useState(false);
  const [savingTab, setSavingTab] = useState('');
  const [savingRazorpay, setSavingRazorpay] = useState(false);
  const [testingAction, setTestingAction] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testResult, setTestResult] = useState(null);
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

  const fetchSettings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setErrorMsg('');
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
        if (settings.superAdminWhatsApp) {
          setSuperAdminWhatsApp(settings.superAdminWhatsApp);
        }
        if (!testEmailAddress && (mergedFields.admin_email || mergedFields.smtp_user)) {
          setTestEmailAddress(mergedFields.admin_email || mergedFields.smtp_user);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (!silent) setErrorMsg('Failed to load system settings. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [testEmailAddress]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setTestResult(null);
    setErrorMsg('');
    setSuccessMsg('');
    window.history.replaceState(null, '', `${window.location.pathname}#${tabId}`);
  };

  // Exchange Meta OAuth auth code for Super Admin Embedded Signup
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
        setSuccessMsg('Super Admin WhatsApp Business connected successfully via Meta Embedded Signup!');
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
  }, [fetchSettings]);

  // Handle URL query parameters (?code=xxx) if redirected back from Meta OAuth
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

  // Initialize Meta SDK dynamically
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
          if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
            if (data.event === 'FINISH' && data.data) {
              if (data.data.waba_id) window.__metaWabaId = data.data.waba_id;
              if (data.data.phone_number_id) window.__metaPhoneNumberId = data.data.phone_number_id;
            }
          }
        } catch (err) {
          // ignore non-JSON postMessage frames
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
    setErrorMsg('');

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
        setErrorMsg('Pop-up window was blocked by your browser. Please allow pop-ups and try again.');
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
      setErrorMsg(err.response?.data?.error || 'Failed to disconnect WhatsApp account');
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
        // Leave existing encrypted DB secret or .env fallback untouched unless user entered a replacement
        if (val && val !== '******' && String(val).trim() !== '') {
          payload[key] = String(val).trim();
        }
      } else if (val !== undefined) {
        payload[key] = String(val).trim();
      }
    }

    try {
      setSavingTab(tabId);
      setErrorMsg('');
      setSuccessMsg('');
      setTestResult(null);
      const res = await api.post('/super-admin/settings', { settings: payload });
      if (res.data?.success) {
        const label = TABS.find((t) => t.id === tabId)?.label || 'Integration';
        setSuccessMsg(`${label} settings saved & encrypted in database. Taking effect immediately across services.`);
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSavingTab('');
    }
  };

  const handleResetTabToEnv = async (tabId) => {
    const label = TABS.find((t) => t.id === tabId)?.label || 'this section';
    if (
      !window.confirm(
        `Reset ${label} database overrides? Any keys present in your server .env file will immediately take over.`
      )
    ) {
      return;
    }

    const keys = TAB_KEYS[tabId] || [];
    const payload = {};
    keys.forEach((k) => {
      payload[k] = '';
    });

    try {
      setSavingTab(tabId);
      setErrorMsg('');
      setSuccessMsg('');
      setTestResult(null);
      const res = await api.post('/super-admin/settings', { settings: payload });
      if (res.data?.success) {
        setSuccessMsg(`${label} database overrides cleared — reverted to server .env fallback.`);
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reset overrides.');
    } finally {
      setSavingTab('');
    }
  };

  const handleTestGemini = async () => {
    try {
      setTestingAction('gemini');
      setTestResult(null);
      const res = await api.post('/super-admin/settings', {
        testAction: 'gemini',
        apiKey: integrations.gemini_api_key,
        model: integrations.gemini_model
      });
      setTestResult({
        type: 'success',
        text: res.data?.message || 'Gemini connection verified!'
      });
    } catch (err) {
      setTestResult({
        type: 'error',
        text: err.response?.data?.error || 'Gemini test failed. Check API key or model.'
      });
    } finally {
      setTestingAction('');
    }
  };

  const handleTestSmtp = async () => {
    try {
      setTestingAction('smtp');
      setTestResult(null);
      const res = await api.post('/super-admin/settings', {
        testAction: 'smtp',
        testEmail: testEmailAddress
      });
      setTestResult({
        type: 'success',
        text: res.data?.message || 'Test email dispatched successfully!'
      });
    } catch (err) {
      setTestResult({
        type: 'error',
        text: err.response?.data?.error || 'Test email failed. Save valid SMTP/Resend settings first.'
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
        text: 'Invoice business details saved. New invoices will use them.'
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
        text: 'Could not generate the sample invoice. Save your details and try again.'
      });
    } finally {
      setPreviewingInvoice(false);
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
        setSuccessMsg(
          hasRazorpayKeys
            ? 'Razorpay Gateway credentials updated in DB!'
            : 'Razorpay Gateway credentials saved & encrypted in DB!'
        );
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save Razorpay credentials.');
    } finally {
      setSavingRazorpay(false);
    }
  };

  const handleDeleteRazorpay = async () => {
    if (
      !window.confirm(
        'Clear Razorpay credentials from the database? If set in server .env, Razorpay will revert to .env.'
      )
    ) {
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
        setSuccessMsg('Razorpay DB overrides cleared.');
        await fetchSettings(true);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete Razorpay credentials.');
    } finally {
      setSavingRazorpay(false);
    }
  };

  const renderSecretInput = ({ keyName, label, placeholder, hint }) => {
    const src = sources[keyName] || 'unset';
    const isVisible = Boolean(revealed[keyName]);
    const effectivePlaceholder =
      src === 'env'
        ? 'Currently active via .env — enter a new value only to override in DB'
        : placeholder;

    return (
      <div className="settings-field" key={keyName}>
        <div className="field-label-row">
          <label className="settings-label" htmlFor={`cfg-${keyName}`}>
            {label}
          </label>
          <SourceBadge source={src} />
        </div>
        <div className="input-relative">
          <input
            id={`cfg-${keyName}`}
            type={isVisible ? 'text' : 'password'}
            value={integrations[keyName] || ''}
            onChange={(e) => handleFieldChange(keyName, e.target.value)}
            placeholder={effectivePlaceholder}
            className="premium-input"
            style={{ paddingRight: '46px' }}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => toggleReveal(keyName)}
            className="eye-btn"
            aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
          >
            {isVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {hint && <span className="field-desc">{hint}</span>}
      </div>
    );
  };

  const renderTextInput = ({ keyName, label, placeholder, hint, type = 'text' }) => {
    const src = sources[keyName] || 'unset';
    return (
      <div className="settings-field" key={keyName}>
        <div className="field-label-row">
          <label className="settings-label" htmlFor={`cfg-${keyName}`}>
            {label}
          </label>
          <SourceBadge source={src} />
        </div>
        <input
          id={`cfg-${keyName}`}
          type={type}
          value={integrations[keyName] || ''}
          onChange={(e) => handleFieldChange(keyName, e.target.value)}
          placeholder={placeholder}
          className="premium-input"
        />
        {hint && <span className="field-desc">{hint}</span>}
      </div>
    );
  };

  const aiSource = sources.gemini_api_key || 'unset';
  const smtpSource =
    sources.resend_api_key === 'db' || sources.smtp_pass === 'db'
      ? 'db'
      : sources.resend_api_key === 'env' || sources.smtp_pass === 'env'
      ? 'env'
      : 'unset';
  const metaSource =
    sources.meta_client_secret === 'db' || sources.whatsapp_access_token === 'db'
      ? 'db'
      : sources.meta_client_secret === 'env' || sources.whatsapp_access_token === 'env'
      ? 'env'
      : 'unset';
  const paymentSource =
    sources.razorpay_key_id === 'db' && sources.razorpay_key_secret === 'db'
      ? 'db'
      : sources.razorpay_key_id === 'env' || sources.razorpay_key_secret === 'env'
      ? 'env'
      : 'unset';

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="super-admin-settings-container integrations-hub">
      <div className="page-header integrations-header">
        <div>
          <div className="breadcrumb-chip">Settings &rsaquo; Integrations</div>
          <h1 className="page-title">
            <FaPlug style={{ color: '#1677FF' }} /> Platform Integrations
          </h1>
          <p className="page-subtitle">
            Manage AI Engine, Email/SMTP, Meta &amp; Webhooks, and Payments from Super Admin. Saved values are encrypted with AES-256 in MongoDB and override <code>.env</code> with zero downtime; untouched fields continue using your server <code>.env</code>.
          </p>
        </div>
      </div>

      {/* 4-Card Live Status Strip */}
      <div className="integration-status-strip">
        <button
          type="button"
          className={`status-summary-card${activeTab === 'ai' ? ' is-selected' : ''}`}
          onClick={() => selectTab('ai')}
        >
          <div className="status-card-top">
            <span className="status-icon-box ai"><FaRobot /></span>
            <SourceBadge source={aiSource} />
          </div>
          <div className="status-card-title">AI Engine</div>
          <div className="status-card-meta">
            Model: {integrations.gemini_model || 'gemini-2.5-flash'}
          </div>
        </button>

        <button
          type="button"
          className={`status-summary-card${activeTab === 'smtp' ? ' is-selected' : ''}`}
          onClick={() => selectTab('smtp')}
        >
          <div className="status-card-top">
            <span className="status-icon-box smtp"><FaEnvelope /></span>
            <SourceBadge source={smtpSource} />
          </div>
          <div className="status-card-title">Email &amp; SMTP</div>
          <div className="status-card-meta">
            {integrations.smtp_host ? `${integrations.smtp_host}:${integrations.smtp_port || '587'}` : 'Not configured'}
          </div>
        </button>

        <button
          type="button"
          className={`status-summary-card${activeTab === 'meta' ? ' is-selected' : ''}`}
          onClick={() => selectTab('meta')}
        >
          <div className="status-card-top">
            <span className="status-icon-box meta"><FaWhatsapp /></span>
            <SourceBadge source={metaSource} />
          </div>
          <div className="status-card-title">Meta &amp; Webhooks</div>
          <div className="status-card-meta">
            {superAdminWhatsApp.connected
              ? `Connected: ${superAdminWhatsApp.phoneNumber || 'WABA Active'}`
              : `Mode: ${(integrations.meta_webhook_signature_mode || 'monitor').toUpperCase()}`}
          </div>
        </button>

        <button
          type="button"
          className={`status-summary-card${activeTab === 'payments' ? ' is-selected' : ''}`}
          onClick={() => selectTab('payments')}
        >
          <div className="status-card-top">
            <span className="status-icon-box pay"><FaCreditCard /></span>
            <SourceBadge source={paymentSource} />
          </div>
          <div className="status-card-title">Payments &amp; GST</div>
          <div className="status-card-meta">
            {invoiceProfile?.gstin ? `GSTIN: ${invoiceProfile.gstin}` : 'Razorpay & Invoice Profile'}
          </div>
        </button>
      </div>

      {/* 4-Tab Bar */}
      <div className="integration-tabs" role="tablist" aria-label="Integration categories">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`integration-tab-btn${isActive ? ' active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              <Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {successMsg && <div className="premium-alert premium-alert-success">{successMsg}</div>}
      {errorMsg && <div className="premium-alert premium-alert-danger">{errorMsg}</div>}
      {testResult && (
        <div
          className={`premium-alert ${
            testResult.type === 'error' ? 'premium-alert-danger' : 'premium-alert-success'
          }`}
        >
          {testResult.type === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
          <span>{testResult.text}</span>
        </div>
      )}

      {/* TAB 1: AI ENGINE */}
      {activeTab === 'ai' && (
        <form onSubmit={(e) => handleSaveTab('ai', e)} className="integrations-stack">
          <div className="glass-card">
            <div className="card-header-row">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  <FaRobot style={{ color: '#1677FF' }} /> Gemini &amp; OpenAI Credentials
                </h3>
                <p className="field-desc" style={{ margin: 0 }}>
                  Primary LLM for customer replies, translation, and Super Admin WhatsApp operations assistant.
                </p>
              </div>
              <button
                type="button"
                className="btn-test-outline"
                onClick={handleTestGemini}
                disabled={testingAction === 'gemini'}
              >
                <FaBolt /> {testingAction === 'gemini' ? 'Testing Gemini...' : 'Test Gemini Connection'}
              </button>
            </div>

            <div className="form-grid-2" style={{ marginTop: 22 }}>
              {renderSecretInput({
                keyName: 'gemini_api_key',
                label: 'Gemini API Key (GEMINI_API_KEY)',
                placeholder: 'Enter Google Gemini API Key',
                hint: 'Stored encrypted with AES-256. Takes effect immediately without restarting PM2.'
              })}

              <div className="settings-field">
                <div className="field-label-row">
                  <label className="settings-label" htmlFor="cfg-gemini_model">
                    Gemini Model (GEMINI_MODEL)
                  </label>
                  <SourceBadge source={sources.gemini_model || 'default'} />
                </div>
                <select
                  id="cfg-gemini_model"
                  className="premium-input"
                  value={integrations.gemini_model || 'gemini-2.5-flash'}
                  onChange={(e) => handleFieldChange('gemini_model', e.target.value)}
                >
                  {GEMINI_MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="field-desc">Used across AI Bot replies, translation, and cost analytics.</span>
              </div>

              {renderSecretInput({
                keyName: 'openai_api_key',
                label: 'OpenAI Fallback Key (OPENAI_API_KEY)',
                placeholder: 'Optional backup sk-... key',
                hint: 'Used automatically only when Gemini is unavailable or errors out.'
              })}

              <div className="settings-field">
                <div className="field-label-row">
                  <label className="settings-label" htmlFor="cfg-openai_model">
                    OpenAI Fallback Model (OPENAI_MODEL)
                  </label>
                  <SourceBadge source={sources.openai_model || 'default'} />
                </div>
                <select
                  id="cfg-openai_model"
                  className="premium-input"
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
          </div>

          <div className="glass-card">
            <h3 className="section-title" style={{ marginBottom: 18 }}>
              <FaShieldAlt style={{ color: '#6366f1' }} /> AI Guardrails, Escalation &amp; Billing Rate
            </h3>
            <div className="form-grid-3">
              {renderTextInput({
                keyName: 'ai_max_output_tokens',
                label: 'Max Output Tokens',
                type: 'number',
                placeholder: '1000',
                hint: 'Maps to AI_MAX_OUTPUT_TOKENS'
              })}
              {renderTextInput({
                keyName: 'ai_max_messages_per_minute',
                label: 'Customer Rate Limit / Min',
                type: 'number',
                placeholder: '10',
                hint: 'Maps to AI_MAX_MESSAGES_PER_MINUTE'
              })}
              {renderTextInput({
                keyName: 'usd_to_inr_rate',
                label: 'USD to INR Exchange Rate',
                type: 'number',
                placeholder: '85',
                hint: 'Used for INR cost estimates in AI Budget.'
              })}
            </div>
            <div style={{ marginTop: 18 }}>
              {renderTextInput({
                keyName: 'high_priority_keywords',
                label: 'High-Priority Escalation Keywords (comma separated)',
                placeholder: 'urgent,critical,emergency,refund,complaint,angry,frustrated',
                hint: 'Messages containing these words auto-escalate to human support.'
              })}
            </div>

            <div className="btn-group" style={{ marginTop: 22 }}>
              <button
                type="submit"
                className="btn-premium-primary"
                disabled={savingTab === 'ai'}
              >
                <FaSave /> {savingTab === 'ai' ? 'Saving AI Settings...' : 'Save AI Engine Settings'}
              </button>
              <button
                type="button"
                className="btn-reset-env"
                onClick={() => handleResetTabToEnv('ai')}
                disabled={savingTab === 'ai'}
              >
                <FaUndo /> Reset to .env
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: EMAIL & SMTP */}
      {activeTab === 'smtp' && (
        <form onSubmit={(e) => handleSaveTab('smtp', e)} className="integrations-stack">
          <div className="glass-card">
            <div className="card-header-row">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  <FaEnvelope style={{ color: '#1677FF' }} /> Outbound SMTP Server
                </h3>
                <p className="field-desc" style={{ margin: 0 }}>
                  Used for onboarding welcome emails, password resets, escalation alerts, and invoice receipts.
                </p>
              </div>
            </div>

            <div className="form-grid-3" style={{ marginTop: 22 }}>
              {renderTextInput({
                keyName: 'smtp_host',
                label: 'SMTP Host (SMTP_HOST)',
                placeholder: 'smtp.hostinger.com'
              })}
              {renderTextInput({
                keyName: 'smtp_port',
                label: 'SMTP Port (SMTP_PORT)',
                type: 'number',
                placeholder: '465'
              })}
              <div className="settings-field">
                <div className="field-label-row">
                  <label className="settings-label" htmlFor="cfg-smtp_secure">
                    TLS / SSL Mode (SMTP_SECURE)
                  </label>
                  <SourceBadge source={sources.smtp_secure || 'default'} />
                </div>
                <select
                  id="cfg-smtp_secure"
                  className="premium-input"
                  value={integrations.smtp_secure || 'false'}
                  onChange={(e) => handleFieldChange('smtp_secure', e.target.value)}
                >
                  <option value="true">SSL / TLS (Port 465)</option>
                  <option value="false">STARTTLS / Auto (Port 587)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: 18 }}>
              {renderTextInput({
                keyName: 'smtp_user',
                label: 'SMTP Username (SMTP_USER)',
                placeholder: 'hello@kwickbot.in'
              })}
              {renderSecretInput({
                keyName: 'smtp_pass',
                label: 'SMTP Password (SMTP_PASS)',
                placeholder: 'Enter SMTP mailbox password'
              })}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="section-title" style={{ marginBottom: 18 }}>
              <FaPaperPlane style={{ color: '#10b981' }} /> Resend Provider (Optional) &amp; Routing Addresses
            </h3>
            <div className="form-grid-2">
              {renderSecretInput({
                keyName: 'resend_api_key',
                label: 'Resend API Key (RESEND_API_KEY)',
                placeholder: 'Optional re_... key (takes priority over SMTP when set)',
                hint: 'Leave empty to send exclusively through your configured SMTP server.'
              })}
              {renderTextInput({
                keyName: 'from_email',
                label: 'From Email Header (FROM_EMAIL)',
                placeholder: 'Kwickbot <hello@kwickbot.in>'
              })}
              {renderTextInput({
                keyName: 'admin_email',
                label: 'Admin Notification Email (ADMIN_EMAIL)',
                placeholder: 'hello@kwickbot.in'
              })}
              {renderTextInput({
                keyName: 'escalation_email',
                label: 'Fallback Escalation Email (ESCALATION_EMAIL)',
                placeholder: 'hello@kwickbot.in'
              })}
            </div>

            <div className="test-email-bar">
              <div style={{ flex: 1 }}>
                <label className="settings-label" htmlFor="test-email-recipient" style={{ display: 'block', marginBottom: 6 }}>
                  Send Test Email (tests saved DB / .env credentials)
                </label>
                <input
                  id="test-email-recipient"
                  type="email"
                  className="premium-input"
                  placeholder="Enter recipient email address"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-test-outline"
                style={{ alignSelf: 'flex-end', height: 46 }}
                onClick={handleTestSmtp}
                disabled={testingAction === 'smtp'}
              >
                <FaPaperPlane /> {testingAction === 'smtp' ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>

            <div className="btn-group" style={{ marginTop: 22 }}>
              <button
                type="submit"
                className="btn-premium-primary"
                disabled={savingTab === 'smtp'}
              >
                <FaSave /> {savingTab === 'smtp' ? 'Saving Email Settings...' : 'Save Email & SMTP Settings'}
              </button>
              <button
                type="button"
                className="btn-reset-env"
                onClick={() => handleResetTabToEnv('smtp')}
                disabled={savingTab === 'smtp'}
              >
                <FaUndo /> Reset to .env
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: META & WEBHOOKS */}
      {activeTab === 'meta' && (
        <div className="integrations-stack">
          {/* Existing Super Admin Embedded Signup Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <FaWhatsapp style={{ color: '#25d366', fontSize: '24px' }} />
                Super Admin WhatsApp Connection
              </h3>
              <span
                className={`status-badge-saas ${superAdminWhatsApp.connected ? 'status-active' : 'status-trial'}`}
                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '600' }}
              >
                {superAdminWhatsApp.connected ? '● Connected' : '● Disconnected'}
              </span>
            </div>

            <p className="field-desc" style={{ marginBottom: '20px' }}>
              Super Admin uses Meta Embedded Signup for secure 1-click WhatsApp Cloud API onboarding (restricted to <strong>1 active Super Admin connection</strong>).
            </p>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Phone Number</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                    {superAdminWhatsApp.phoneNumber || 'Not connected'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>WABA Account ID</span>
                  <code style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    {superAdminWhatsApp.wabaId || 'Not connected'}
                  </code>
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
              >
                <FaWhatsapp style={{ fontSize: '18px' }} />
                {embeddedLoading
                  ? 'Launching Meta Signup...'
                  : superAdminWhatsApp.connected
                  ? 'Reconnect WhatsApp'
                  : 'Connect WhatsApp'}
              </button>
              {superAdminWhatsApp.connected && (
                <button
                  type="button"
                  onClick={handleDisconnectSuperAdmin}
                  disabled={loading}
                  className="btn-premium-danger"
                >
                  <FaTrash /> Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Authorized Assistant Card */}
          <div className="glass-card">
            <h3 className="section-title" style={{ marginBottom: 16 }}>
              <FaUserCheck style={{ color: '#6366f1' }} /> Super Admin AI Operations Assistant
            </h3>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Authorized Super Admin Phone Number</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>+91 8128420287</div>
                </div>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                  ● Authorized &amp; Active
                </span>
              </div>
            </div>
            <p className="field-desc" style={{ margin: 0 }}>
              Only messages from <strong>+91 8128420287</strong> trigger the Super Admin Operations Assistant. Secrets and tokens are strictly refused.
            </p>
          </div>

          {/* Meta App, Webhook Security & Fallback Cloud API Form */}
          <form onSubmit={(e) => handleSaveTab('meta', e)} className="integrations-stack">
            <div className="glass-card">
              <h3 className="section-title" style={{ marginBottom: 18 }}>
                Meta App Credentials &amp; Webhook Security
              </h3>

              <div className="settings-field" style={{ marginBottom: 18 }}>
                <label className="settings-label">WhatsApp Webhook Callback URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" readOnly value={getWebhookUrl()} className="premium-input" />
                  <button type="button" onClick={handleCopyWebhook} className="copy-btn">
                    <FaCopy /> {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>

              <div className="form-grid-2">
                {renderTextInput({
                  keyName: 'meta_app_id',
                  label: 'Meta App ID (META_APP_ID)',
                  placeholder: '2242808243238982'
                })}
                {renderTextInput({
                  keyName: 'meta_config_id',
                  label: 'Embedded Signup Config ID (META_CONFIG_ID)',
                  placeholder: '1066111046278122'
                })}
                {renderSecretInput({
                  keyName: 'meta_client_secret',
                  label: 'Meta Client Secret (META_CLIENT_SECRET)',
                  placeholder: 'Enter Meta App / Client Secret'
                })}
                {renderSecretInput({
                  keyName: 'whatsapp_webhook_verify_token',
                  label: 'Webhook Verify Token (WEBHOOK_VERIFY_TOKEN)',
                  placeholder: 'wh_vt_...'
                })}
                <div className="settings-field">
                  <div className="field-label-row">
                    <label className="settings-label" htmlFor="cfg-meta_webhook_signature_mode">
                      Webhook Signature Mode (META_WEBHOOK_SIGNATURE_MODE)
                    </label>
                    <SourceBadge source={sources.meta_webhook_signature_mode || 'default'} />
                  </div>
                  <select
                    id="cfg-meta_webhook_signature_mode"
                    className="premium-input"
                    value={integrations.meta_webhook_signature_mode || 'monitor'}
                    onChange={(e) => handleFieldChange('meta_webhook_signature_mode', e.target.value)}
                  >
                    <option value="monitor">monitor (log mismatches, allow traffic)</option>
                    <option value="enforce">enforce (reject unsigned/invalid POSTs)</option>
                    <option value="off">off (skip X-Hub-Signature-256 check)</option>
                  </select>
                </div>
                {renderSecretInput({
                  keyName: 'meta_webhook_extra_app_secrets',
                  label: 'Extra Meta App Secrets (comma separated)',
                  placeholder: 'Optional additional app secrets'
                })}
              </div>
            </div>

            <div className="glass-card">
              <h3 className="section-title" style={{ marginBottom: 18 }}>
                Platform Fallback Cloud API &amp; Store Webhook Secrets
              </h3>
              <div className="form-grid-2">
                {renderSecretInput({
                  keyName: 'whatsapp_access_token',
                  label: 'Fallback System Access Token (WHATSAPP_ACCESS_TOKEN)',
                  placeholder: 'EAA...'
                })}
                {renderTextInput({
                  keyName: 'whatsapp_phone_number_id',
                  label: 'System Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)',
                  placeholder: '1140434719159859'
                })}
                {renderTextInput({
                  keyName: 'whatsapp_business_account_id',
                  label: 'System WABA ID (WHATSAPP_BUSINESS_ACCOUNT_ID)',
                  placeholder: '856186027099439'
                })}
                {renderSecretInput({
                  keyName: 'webhook_secret_token',
                  label: 'Internal Webhook Token (WEBHOOK_SECRET_TOKEN)',
                  placeholder: 'Optional x-webhook-secret token'
                })}
                {renderSecretInput({
                  keyName: 'shopify_webhook_secret',
                  label: 'Shopify Webhook Secret (SHOPIFY_WEBHOOK_SECRET)',
                  placeholder: 'Shopify HMAC secret'
                })}
                {renderSecretInput({
                  keyName: 'woocommerce_webhook_secret',
                  label: 'WooCommerce Webhook Secret (WOOCOMMERCE_WEBHOOK_SECRET)',
                  placeholder: 'WooCommerce HMAC secret'
                })}
              </div>

              <div className="btn-group" style={{ marginTop: 22 }}>
                <button
                  type="submit"
                  className="btn-premium-primary"
                  disabled={savingTab === 'meta'}
                >
                  <FaSave /> {savingTab === 'meta' ? 'Saving Meta & Webhook Settings...' : 'Save Meta & Webhook Settings'}
                </button>
                <button
                  type="button"
                  className="btn-reset-env"
                  onClick={() => handleResetTabToEnv('meta')}
                  disabled={savingTab === 'meta'}
                >
                  <FaUndo /> Reset to .env
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: PAYMENTS & GST */}
      {activeTab === 'payments' && (
        <div className="integrations-stack">
          <div className="glass-card razorpay-card">
            <div className="card-header-row" style={{ marginBottom: 18 }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <FaCreditCard style={{ color: '#1677FF' }} /> Razorpay Payment Gateway Credentials
              </h3>
              <SourceBadge source={paymentSource} />
            </div>

            <form onSubmit={handleSaveRazorpay} className="settings-form">
              <div className="settings-field">
                <div className="field-label-row">
                  <label className="settings-label">Razorpay Key ID</label>
                  <SourceBadge source={sources.razorpay_key_id || 'unset'} />
                </div>
                <div className="input-relative">
                  <input
                    type={showRazorpayKey ? 'text' : 'password'}
                    name="razorpay_key_id"
                    value={formData.razorpay_key_id}
                    onChange={handleChange}
                    placeholder={
                      sources.razorpay_key_id === 'env'
                        ? 'Active via .env — enter key ID to save in DB'
                        : 'e.g. rzp_live_xxxxxxxxxxxxxx'
                    }
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
                <span className="field-desc">Public Key ID from Razorpay Dashboard Settings.</span>
              </div>

              <div className="settings-field">
                <div className="field-label-row">
                  <label className="settings-label">Razorpay Key Secret</label>
                  <SourceBadge source={sources.razorpay_key_secret || 'unset'} />
                </div>
                <div className="input-relative">
                  <input
                    type={showRazorpaySecret ? 'text' : 'password'}
                    name="razorpay_key_secret"
                    value={formData.razorpay_key_secret}
                    onChange={handleChange}
                    placeholder={
                      sources.razorpay_key_secret === 'env'
                        ? 'Active via .env — enter key secret to store encrypted in DB'
                        : 'Enter your Razorpay Key Secret'
                    }
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
                <span className="field-desc">Encrypted at rest with AES-256 and never exposed to client code.</span>
              </div>

              <div className="info-box rzp-info">
                <FaInfoCircle style={{ color: '#10b981', flexShrink: 0 }} />
                <span className="info-text">
                  Saving Razorpay credentials overrides <code>.env</code> dynamically. Deleting DB credentials reverts to <code>.env</code> if set.
                </span>
              </div>

              <div className="btn-group">
                {hasRazorpayKeys ? (
                  <>
                    <button type="submit" disabled={savingRazorpay} className="btn-premium-primary">
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

          {/* Invoice Business Details (GST) */}
          <div className="glass-card">
            <h3 className="section-title">
              <FaFileInvoice style={{ marginRight: 10 }} /> Invoice business details
            </h3>
            <p className="field-desc" style={{ marginTop: -12, marginBottom: 18 }}>
              Printed in the “Billed by” section of every Kwickbot invoice. Add your GSTIN to issue GST tax invoices: plan prices are treated as GST-inclusive and tax is split as CGST + SGST or IGST automatically.
            </p>
            {invoiceProfile ? (
              <form onSubmit={handleSaveInvoiceProfile} className="settings-form invoice-profile-grid">
                {[
                  ['legalName', 'Legal business name *', 'As registered (e.g. company or proprietor name)', 200],
                  ['tradeName', 'Trade name', 'Kwickbot', 120],
                  ['gstin', 'GSTIN', '24ABCDE1234F1Z5', 15],
                  ['pan', 'PAN (shown if no GSTIN)', 'ABCDE1234F', 10],
                  ['addressLine', 'Registered address', 'Building, street, area', 300],
                  ['city', 'City', '', 120],
                  ['pincode', 'PIN code', '', 6],
                  ['email', 'Billing email', 'hello@kwickbot.in', 120],
                  ['phone', 'Billing phone', '+91 …', 30],
                  ['website', 'Website', 'kwickbot.in', 120],
                  ['sacCode', 'SAC code', 'Service accounting code for your service', 10],
                  ['footerNote', 'Footer note', 'Thank you for choosing Kwickbot.', 300]
                ].map(([name, label, placeholder, max]) => (
                  <div
                    className={`settings-field ${name === 'addressLine' || name === 'footerNote' ? 'span-2' : ''}`}
                    key={name}
                  >
                    <label className="settings-label" htmlFor={`inv-${name}`}>
                      {label}
                    </label>
                    <input
                      id={`inv-${name}`}
                      className="premium-input"
                      name={name}
                      value={invoiceProfile[name] ?? ''}
                      onChange={handleInvoiceProfileChange}
                      placeholder={placeholder}
                      maxLength={max}
                    />
                  </div>
                ))}
                <div className="settings-field">
                  <label className="settings-label" htmlFor="inv-state">
                    State (place of supply)
                  </label>
                  <select
                    id="inv-state"
                    className="premium-input"
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
                <div className="settings-field">
                  <label className="settings-label" htmlFor="inv-gstRate">
                    GST rate (%)
                  </label>
                  <input
                    id="inv-gstRate"
                    className="premium-input"
                    type="number"
                    min="0"
                    max="28"
                    step="0.5"
                    name="gstRate"
                    value={invoiceProfile.gstRate ?? 18}
                    onChange={handleInvoiceProfileChange}
                  />
                </div>
                <div className="btn-group span-2">
                  <button type="submit" className="btn-premium-primary" disabled={savingInvoiceProfile}>
                    <FaSave /> {savingInvoiceProfile ? 'Saving…' : 'Save invoice details'}
                  </button>
                  <button
                    type="button"
                    className="btn-reset-env"
                    onClick={handlePreviewInvoice}
                    disabled={previewingInvoice}
                  >
                    <FaEye /> {previewingInvoice ? 'Generating…' : 'Preview sample invoice'}
                  </button>
                </div>
                {invoiceProfileMsg && (
                  <div
                    className="span-2"
                    role="status"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: invoiceProfileMsg.type === 'error' ? 'var(--danger)' : 'var(--success)'
                    }}
                  >
                    {invoiceProfileMsg.text}
                  </div>
                )}
              </form>
            ) : (
              <p className="field-desc">Loading…</p>
            )}
          </div>
        </div>
      )}

      {/* Server Bootstrap Reference Box */}
      <div className="glass-card bootstrap-note-card">
        <div className="bootstrap-note-header">
          <FaLock style={{ color: '#f59e0b' }} />
          <div>
            <strong>Server Bootstrap Keys (Keep in server <code>.env</code>)</strong>
            <div className="field-desc">
              These core infrastructure keys are needed before MongoDB connects or to decrypt stored credentials, so keep them in your server <code>backend/.env</code> file.
            </div>
          </div>
        </div>
        <div className="bootstrap-key-list">
          {bootstrapEnvKeys.map((k) => (
            <code key={k} className="bootstrap-key-chip">
              {k}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminSettings;
