import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShopify, FaWordpress, FaPlug, FaCheck, FaTimes, FaCopy, FaSync, FaExternalLinkAlt, FaLock } from 'react-icons/fa';
import api from '../../../services/api';
import { useOptionalEffectiveAccess } from '../../../context/EffectiveAccessContext';
import TrialFeatureLockBanner from '../../../components/common/TrialFeatureLockBanner';
import './Integrations.css';
import ShopifyGuide from './shopify/ShopifyGuide';
import { SHOPIFY_GUIDE_STEPS } from './shopify/guideSteps';
import { getSyncFeedback, isMountedCommerceWebhookUrl, validateShopifyStoreUrl } from './shopify/integrationUi';

function Integrations({ admin, onUpdateAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveAccess = useOptionalEffectiveAccess();
  const isPreviewFallback = Boolean(
    admin?.role !== 'super_admin' &&
    admin?.selfSignupTrial === true &&
    (admin?.subscriptionStatus !== 'active' || (admin?.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= new Date()))
  );
  const isStoreConnectLocked = effectiveAccess ? effectiveAccess.isStoreConnectLocked : isPreviewFallback;
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  // Onboarding Guide States
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);

  // Keyboard navigation for guide modal
  useEffect(() => {
    if (!isGuideOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentGuideStep((prev) => Math.min(prev + 1, SHOPIFY_GUIDE_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentGuideStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen]);
  const [formData, setFormData] = useState({
    storeUrl: '',
    apiKey: '',
    consumerKey: '',
    consumerSecret: '',
    storeName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');

  const platforms = [
    {
      id: 'shopify',
      name: 'Shopify',
      icon: <FaShopify />,
      color: '#96bf48',
      description: 'Connect your Shopify store to sync orders automatically',
      setupGuide: '/docs/shopify_connection_guide.pdf'
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      icon: <FaWordpress />,
      color: '#96588a',
      description: 'Integrate with your WooCommerce store for seamless order management',
      setupGuide: 'https://woocommerce.com/document/rest-api/'
    }
  ];

  useEffect(() => {
    fetchIntegrations();
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data?.success && onUpdateAdmin) {
        onUpdateAdmin(response.data.data.admin);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setListError('');
      const response = await api.get('/integrations');
      setIntegrations(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setListError('Could not load integrations. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    if (isStoreConnectLocked) {
      navigate('/dashboard/billing');
      return;
    }
    setFormError('');
    setNotice(null);
    setSelectedPlatform(platform);
    setFormData({ storeUrl: '', apiKey: '', consumerKey: '', consumerSecret: '', storeName: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isProfileComplete) {
      setFormError('Complete your Profile & Store settings before connecting.');
      return;
    }

    if (selectedPlatform.id === 'shopify' && !validateShopifyStoreUrl(formData.storeUrl)) {
      setFormError('Enter your HTTPS *.myshopify.com URL or Shopify Admin store URL.');
      return;
    }

    if (selectedPlatform.id === 'shopify' && formData.apiKey.trim().startsWith('shpss_')) {
      setFormError('This is an API secret key. Enter the Shopify Admin API access token instead.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      
      const payload = {
        platform: selectedPlatform.id,
        storeName: formData.storeName,
        storeUrl: formData.storeUrl,
        apiKey: selectedPlatform.id === 'woocommerce' 
          ? `${formData.consumerKey.trim()}:${formData.consumerSecret.trim()}`
          : formData.apiKey
      };

      const response = await api.post(
        '/integrations',
        payload
      );

      const syncSummary = response.data?.data?.syncSummary;
      setNotice(syncSummary?.error
        ? { type: 'warning', message: `Store saved, but the first order sync failed: ${syncSummary.error}` }
        : syncSummary
          ? getSyncFeedback(selectedPlatform.name, syncSummary)
          : { type: 'warning', message: 'Store saved. Order sync and webhook delivery have not been verified.' });
      setShowModal(false);
      await fetchIntegrations();
    } catch (error) {
      const serverError = error.response?.data?.error || '';
      if (serverError.includes('complete your Profile & Store settings')) {
        setFormError('Complete your Profile & Store settings before connecting.');
      } else {
        setFormError(serverError || 'Failed to connect integration.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) return;
    
    try {
      await api.delete(`/integrations/${id}`);
      alert('Integration disconnected successfully');
      fetchIntegrations();
    } catch (error) {
      alert('Failed to disconnect integration');
    }
  };

  const handleCopyWebhook = async (webhookUrl, platform) => {
    if (!isMountedCommerceWebhookUrl(webhookUrl, platform)) {
      setNotice({ type: 'warning', message: 'This webhook URL is not available on the server yet. Do not add it to your store.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setNotice({ type: 'success', message: 'Webhook URL copied.' });
    } catch {
      setNotice({ type: 'error', message: 'Could not copy the webhook URL. Copy it manually.' });
    }
  };

  const handleRegenerateSecret = async (id) => {
    if (!window.confirm('Regenerate webhook secret? You will need to update your store settings.')) return;
    
    try {
      await api.post(
        `/integrations/${id}/regenerate-secret`,
        {},
      );
      alert('Webhook secret regenerated successfully');
      fetchIntegrations();
    } catch (error) {
      alert('Failed to regenerate webhook secret');
    }
  };

  const handleSyncShopifyOrders = async (id) => {
    try {
      setSyncingIntegrationId(id);
      const response = await api.post(
        `/integrations/${id}/sync-shopify-orders`,
        {},
      );

      const summary = response.data?.data || {};
      setNotice(getSyncFeedback('Shopify', summary));
      await fetchIntegrations();
    } catch (error) {
      setNotice({ type: 'error', message: error.response?.data?.error || 'Failed to sync Shopify orders.' });
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handleSyncWooCommerceOrders = async (id) => {
    try {
      setSyncingIntegrationId(id);
      const response = await api.post(
        `/integrations/${id}/sync-woocommerce-orders`,
        {},
      );

      const summary = response.data?.data || {};
      setNotice(getSyncFeedback('WooCommerce', summary));
      await fetchIntegrations();
    } catch (error) {
      setNotice({ type: 'error', message: error.response?.data?.error || 'Failed to sync WooCommerce orders.' });
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const getIntegrationForPlatform = (platformId) => {
    return integrations.find(i => i.platform === platformId);
  };

  const visiblePlatforms = platforms.filter(platform => {
    const isConnected = !!getIntegrationForPlatform(platform.id);
    if (isConnected) return true; // Show already connected ones so they can disconnect
    if (platform.id === 'shopify') {
      return admin?.shopifyEnabled !== false;
    }
    if (platform.id === 'woocommerce') {
      return admin?.woocommerceEnabled !== false;
    }
    return true;
  });
  const requestedPlatform = location.hash.slice(1);
  const requestedPlatformUnavailable = platforms.some(platform => platform.id === requestedPlatform) &&
    !visiblePlatforms.some(platform => platform.id === requestedPlatform);

  useEffect(() => {
    if (!loading && (requestedPlatform === 'shopify' || requestedPlatform === 'woocommerce')) {
      document.getElementById(`integration-${requestedPlatform}`)?.scrollIntoView({ block: 'start' });
    }
  }, [loading, requestedPlatform]);

  const isProfileComplete = !!(admin?.businessName?.trim() && admin?.businessPhone?.trim() && admin?.supportEmail?.trim());

  return (
    <div className="container merchant-data-page integrations-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connect and manage your e-commerce platform integrations.</p>
        </div>
      </div>

      {isStoreConnectLocked && !loading && (
        <TrialFeatureLockBanner
          title="Shopify & WooCommerce Integrations are Locked in Free Trial"
          description="Connect WhatsApp and send test broadcasts during your Free Trial. Activate a paid plan in Billing to connect Shopify or WooCommerce and sync store orders."
        />
      )}

      {notice && (
        <div className={`integration-notice integration-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
          {notice.errors?.length > 0 && <ul>{notice.errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss integration message"><FaTimes /></button>
        </div>
      )}
      {listError && <div className="integration-notice integration-notice-error" role="alert">{listError} <button type="button" onClick={fetchIntegrations}>Retry</button></div>}
      {!loading && requestedPlatformUnavailable && (
        <div className="integration-notice integration-notice-warning" role="status">
          {requestedPlatform === 'shopify' ? 'Shopify' : 'WooCommerce'} is disabled for this account. Contact support to enable this connection.
        </div>
      )}

      {!isProfileComplete && !loading && (
        <div className="integration-profile-alert">
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
            <span>
              <strong>Profile Incomplete:</strong> Please complete your <strong>Profile & Store settings</strong> (Store Name, Phone, and Support Email) before connecting integrations.
            </span>
            <button 
              onClick={() => navigate('/dashboard/profile')} 
              style={{
                background: '#eab308',
                color: '#000',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s ease'
              }}
            >
              Complete Profile
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading integrations...
        </div>
      ) : visiblePlatforms.length === 0 ? (
        <div className="integration-empty-state">
          <FaPlug style={{ fontSize: '48px', marginBottom: '16px' }} />
          <h3>No Integrations Available</h3>
          <p>E-commerce integrations are disabled for your account by the Super Admin. Please contact support.</p>
        </div>
      ) : (
        <div className="integrations-grid">
          {visiblePlatforms.map((platform) => {
            const integration = getIntegrationForPlatform(platform.id);
            const isConnected = !!integration;
            const isPlatformDisabled = 
              (platform.id === 'shopify' && admin?.shopifyEnabled === false) ||
              (platform.id === 'woocommerce' && admin?.woocommerceEnabled === false);

            return (
              <div key={platform.id} id={`integration-${platform.id}`} className="integration-card">
                <div className="integration-header">
                  <div 
                    className="integration-icon"
                    style={{ background: `${platform.color}22`, color: platform.color }}
                  >
                    {platform.icon}
                  </div>
                  <div className="integration-info">
                    <h3>{platform.name}</h3>
                    <p>{platform.description}</p>
                  </div>
                </div>

                {isConnected ? (
                  <div className="integration-connected">
                    {isPlatformDisabled && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '8px', 
                        border: '1px solid rgba(239, 68, 68, 0.4)', 
                        borderRadius: '8px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        marginBottom: '12px',
                        color: '#9b2c1f',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        ⚠️ Access Revoked by Super Admin. Syncing is suspended.
                      </div>
                    )}
                    <div className="connected-badge">
                      <FaCheck /> {integration.isActive ? 'Store saved · webhook not verified' : 'Store inactive'}
                    </div>
                    
                    <div className="integration-details">
                      <div className="detail-row">
                        <span className="detail-label">Store:</span>
                        <span className="detail-value">{integration.metadata?.storeName || integration.storeUrl}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Orders Synced:</span>
                        <span className="detail-value">{integration.metadata?.totalOrdersSynced || 0}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge ${integration.isActive ? 'active' : 'inactive'}`}>
                          {integration.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Last order sync:</span>
                        <span className="detail-value">{integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString() : 'Not yet synced'}</span>
                      </div>
                    </div>

                    <div className="webhook-section">
                      <label>Webhook URL:</label>
                      <div className="webhook-url-container">
                        <input
                          type="text"
                          value={integration.webhookUrl}
                          readOnly
                          className="webhook-url-input"
                        />
                        <button
                          onClick={() => handleCopyWebhook(integration.webhookUrl, platform.id)}
                          className="btn-icon"
                          title="Copy webhook URL"
                          aria-label={`Copy ${platform.name} webhook URL`}
                          disabled={!isMountedCommerceWebhookUrl(integration.webhookUrl, platform.id)}
                        >
                          <FaCopy />
                        </button>
                      </div>
                      <small className="webhook-hint">
                        {isMountedCommerceWebhookUrl(integration.webhookUrl, platform.id)
                          ? `Copy this URL into your ${platform.name} webhook settings.`
                          : 'Webhook setup is pending: this generated URL is not mounted by the server. Order imports can still be run manually.'}
                      </small>
                    </div>

                    <div className="integration-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {platform.id === 'shopify' && (
                        <button
                          onClick={() => handleSyncShopifyOrders(integration._id)}
                          className="btn btn-secondary"
                          disabled={syncingIntegrationId === integration._id}
                        >
                          <FaSync className={syncingIntegrationId === integration._id ? 'spinning' : ''} /> {syncingIntegrationId === integration._id ? 'Syncing...' : 'Sync Orders'}
                        </button>
                      )}
                      {platform.id === 'woocommerce' && (
                        <button
                          onClick={() => handleSyncWooCommerceOrders(integration._id)}
                          className="btn btn-secondary"
                          disabled={syncingIntegrationId === integration._id}
                        >
                          <FaSync className={syncingIntegrationId === integration._id ? 'spinning' : ''} /> {syncingIntegrationId === integration._id ? 'Syncing...' : 'Sync Orders'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(integration._id)}
                        className="btn btn-danger"
                      >
                        <FaTimes /> Disconnect
                      </button>
                    </div>

                    <details style={{ marginTop: '12px', cursor: 'pointer' }}>
                      <summary style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', userSelect: 'none' }}>
                        ⚙️ Advanced Options
                      </summary>
                      <div style={{ padding: '12px 0 0 0' }}>
                        <button
                          onClick={() => handleRegenerateSecret(integration._id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12.5px', padding: '6px 12px', width: '100%' }}
                        >
                          <FaSync /> Regenerate Secret Key
                        </button>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="integration-disconnected">
                    {isStoreConnectLocked ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: '100%', opacity: 0.78, cursor: 'not-allowed', justifyContent: 'center' }}
                          disabled
                          title="Store connections are locked during Free Trial. Activate a paid plan in Billing."
                        >
                          <FaLock /> Locked in Free Trial
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/billing')}
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
                        >
                          Activate Paid Plan to Connect
                        </button>
                      </>
                    ) : !isProfileComplete ? (
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                        disabled
                        title="Please complete your Profile & Store settings first"
                      >
                        <FaLock /> Complete Profile to Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        <FaPlug /> Connect {platform.name}
                      </button>
                    )}
                    {platform.id === 'shopify' ? (
                      <button
                        onClick={() => {
                          setCurrentGuideStep(0);
                          setIsGuideOpen(true);
                        }}
                        className="setup-guide-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          marginTop: '12px',
                          textDecoration: 'underline',
                          justifyContent: 'center',
                          width: '100%',
                          fontFamily: 'inherit'
                        }}
                      >
                        <FaExternalLinkAlt /> Setup Guide
                      </button>
                    ) : (
                      <a
                        href={platform.setupGuide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="setup-guide-link"
                      >
                        <FaExternalLinkAlt /> Setup Guide
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connection Modal */}
      {showModal && selectedPlatform && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Connect {selectedPlatform.name}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {formError && <div className="integration-notice integration-notice-error" role="alert">{formError}</div>}
              <div className="form-group">
                <label>Store Name (Optional)</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="My Awesome Store"
                />
              </div>

              <div className="form-group">
                <label>Store URL *</label>
                <input
                  type="url"
                  value={formData.storeUrl}
                  onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                  placeholder={
                    selectedPlatform.id === 'shopify'
                      ? 'https://your-store.myshopify.com'
                      : 'https://your-store.com'
                  }
                  required
                />
                <small>Enter your full store URL including https://</small>
              </div>

              {selectedPlatform.id === 'woocommerce' ? (
                <>
                  <div className="form-group">
                    <label>Consumer Key *</label>
                    <input
                      type="text"
                      value={formData.consumerKey}
                      onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      required
                    />
                    <small>Get your Consumer Key from WooCommerce → Settings → Advanced → REST API</small>
                  </div>

                  <div className="form-group">
                    <label>Consumer Secret *</label>
                    <input
                      type="password"
                      value={formData.consumerSecret}
                      onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      required
                    />
                    <small>Get your Consumer Secret from WooCommerce → Settings → Advanced → REST API</small>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Admin API Access Token *</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter your Shopify Admin API access token"
                    required
                  />
                  <small>
                    Use the Admin API access token from Shopify Admin → Apps → Develop apps. The store URL must be your *.myshopify.com domain.
                    <br />
                    Need help? <button type="button" onClick={() => { setCurrentGuideStep(0); setIsGuideOpen(true); }} style={{ background: 'none', border: 'none', padding: 0, color: '#96bf48', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}>Open Interactive Setup Guide</button> or <a href="/docs/shopify_connection_guide.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#96bf48', fontWeight: 'bold', textDecoration: 'underline' }}>Download Setup Guide (PDF)</a>.
                  </small>
                </div>
              )}

              <div className="info-box">
                <strong>Next Steps:</strong>
                <ol>
                  <li>Save your store credentials and review the first sync result.</li>
                  <li>Use Sync Orders to import or refresh existing orders.</li>
                  <li>Configure webhooks when the server reports a verified URL.</li>
                </ol>
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGuideOpen && (
        <ShopifyGuide currentGuideStep={currentGuideStep} setCurrentGuideStep={setCurrentGuideStep} onClose={() => setIsGuideOpen(false)} />
      )}
    </div>
  );
}

export default Integrations;
