import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShopify, FaWordpress, FaPlug, FaCheck, FaTimes, FaCopy, FaTrash, FaSync, FaExternalLinkAlt, FaLock } from 'react-icons/fa';
import api from '../services/api';
import './Integrations.css';

const SHOPIFY_GUIDE_STEPS = [
  {
    step: 1,
    title: "Open Shopify Settings",
    description: "Log in to your Shopify Store Admin. In the bottom-left corner of the dashboard sidebar, click on the Settings gear icon.",
    image: "/guide/shopify/step-1.png"
  },
  {
    step: 2,
    title: "Apps and Sales Channels",
    description: "In the Settings side menu, locate and click on Apps and sales channels to manage integrations.",
    image: "/guide/shopify/step-2.png"
  },
  {
    step: 3,
    title: "Access Custom App Development",
    description: "Click on the Develop apps button in the top right header to begin custom app configuration.",
    image: "/guide/shopify/step-3.png"
  },
  {
    step: 4,
    title: "Create App Instance",
    description: "Click Create an app. In the modal, specify an App name (e.g. 'WhatsApp Support Bot') and select the Developer email. Click Create app.",
    image: "/guide/shopify/step-4.png"
  },
  {
    step: 5,
    title: "Configure Admin API Scopes",
    description: "In the App Configuration screen, locate Admin API integration and click on the Configure Admin API integration button.",
    image: "/guide/shopify/step-5.png"
  },
  {
    step: 6,
    title: "Select Access Permissions",
    description: "Check the boxes for read_orders, read_products, read_customers, and read_fulfillments. Scroll down and click Save.",
    image: "/guide/shopify/step-6.png"
  },
  {
    step: 7,
    title: "Install Custom App",
    description: "Go back to the top of the app overview tab. In the top-right corner of the page, click on the Install app button.",
    image: "/guide/shopify/step-7.png"
  },
  {
    step: 8,
    title: "Confirm App Installation",
    description: "Review the API access warnings and confirm installation by clicking Install in the modal popup dialog.",
    image: "/guide/shopify/step-8.png"
  },
  {
    step: 9,
    title: "Retrieve API Credentials",
    description: "Select the API credentials tab. Under the Admin API access token card, you will find the hidden token fields.",
    image: "/guide/shopify/step-9.png"
  },
  {
    step: 10,
    title: "Reveal Access Token once",
    description: "Click on the Reveal token once link to display your secure credentials. This will only be shown once.",
    image: "/guide/shopify/step-10.png"
  },
  {
    step: 11,
    title: "Copy Admin Access Token",
    description: "Copy the revealed access token (which begins with 'shpat_') and save it securely. Note: It cannot be displayed again.",
    image: "/guide/shopify/step-11.png"
  },
  {
    step: 12,
    title: "Note API Keys",
    description: "Under the API credentials card, you can also view and copy the API key and API secret key if required.",
    image: "/guide/shopify/step-12.png"
  },
  {
    step: 13,
    title: "Connect on Support Bot Dashboard",
    description: "Open your WhatsApp Support Bot Dashboard. Navigate to Integrations -> Shopify -> click Connect Shopify.",
    image: "/guide/shopify/step-13.png"
  },
  {
    step: 14,
    title: "Input Store URL & Token",
    description: "Enter your Shopify Store URL (e.g. https://your-store.myshopify.com) and paste the Admin API Token. Click Connect.",
    image: "/guide/shopify/step-14.png"
  },
  {
    step: 15,
    title: "Retrieve unique Webhook URL",
    description: "After connecting, your integration status will show 'Connected'. Copy the generated unique Webhook URL.",
    image: "/guide/shopify/step-15.png"
  },
  {
    step: 16,
    title: "Configure Webhooks in Shopify Settings",
    description: "In Shopify Admin -> Settings -> Notifications -> Webhooks -> click Create Webhook. Paste the copied URL, select Order update (orders/update), JSON, and click Save. No other events are required.",
    image: "/guide/shopify/step-16.png"
  }
];

function Integrations({ admin, onUpdateAdmin }) {
  const navigate = useNavigate();
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
      const response = await api.get('/integrations');
      setIntegrations(response.data.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    setSelectedPlatform(platform);
    setFormData({ storeUrl: '', apiKey: '', consumerKey: '', consumerSecret: '', storeName: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isProfileComplete) {
      alert('First complete your profile');
      return;
    }

    if (selectedPlatform.id === 'shopify' && formData.apiKey.trim().startsWith('shpss_')) {
      alert('Error: The token you entered starts with "shpss_", which is a Shopify API Secret Key. You must enter the Admin API Access Token (which usually starts with "shpat_") instead. You can find this token under Shopify Admin → Apps → Develop apps.');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        platform: selectedPlatform.id,
        storeName: formData.storeName,
        storeUrl: formData.storeUrl,
        apiKey: selectedPlatform.id === 'woocommerce' 
          ? `${formData.consumerKey.trim()}:${formData.consumerSecret.trim()}`
          : formData.apiKey
      };

      await api.post(
        '/integrations',
        payload
      );

      alert('Integration connected successfully!');
      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      const serverError = error.response?.data?.error || '';
      if (serverError.includes('complete your Profile & Store settings')) {
        alert('First complete your profile');
      } else {
        alert(serverError || 'Failed to connect integration');
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

  const handleCopyWebhook = (webhookUrl) => {
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL copied to clipboard!');
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
      alert(`Shopify sync completed. Fetched: ${summary.fetched || 0}, Created: ${summary.created || 0}, Updated: ${summary.updated || 0}`);
      fetchIntegrations();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to sync Shopify orders');
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
      alert(`WooCommerce sync completed. Fetched: ${summary.fetched || 0}, Created: ${summary.created || 0}, Updated: ${summary.updated || 0}`);
      fetchIntegrations();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to sync WooCommerce orders');
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

  const isProfileComplete = !!(admin?.businessName?.trim() && admin?.businessPhone?.trim() && admin?.supportEmail?.trim());

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔌 Integrations</h1>
          <p className="page-subtitle">Connect your e-commerce platforms</p>
        </div>
      </div>

      {!isProfileComplete && !loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: 'rgba(234, 179, 8, 0.15)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '12px',
          color: '#fef08a',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
            <span>
              <strong>Profile Incomplete:</strong> Please complete your <strong>Profile & Store settings</strong> (Store Name, Phone, and Support Email) before connecting integrations.
            </span>
            <button 
              onClick={() => navigate('/profile')} 
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
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading integrations...
        </div>
      ) : visiblePlatforms.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 40px', 
          background: 'rgba(39, 39, 42, 0.2)', 
          border: '1px dashed rgba(63, 63, 70, 0.4)', 
          borderRadius: '16px', 
          color: '#a1a1aa',
          margin: '20px 0'
        }}>
          <FaPlug style={{ fontSize: '48px', color: '#71717a', marginBottom: '16px' }} />
          <h3 style={{ color: '#fafafa', fontWeight: '600' }}>No Integrations Available</h3>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#71717a' }}>E-commerce integrations are disabled for your account by the Super Admin. Please contact support.</p>
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
              <div key={platform.id} className="integration-card">
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
                        color: '#f87171',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        ⚠️ Access Revoked by Super Admin. Syncing is suspended.
                      </div>
                    )}
                    <div className="connected-badge">
                      <FaCheck /> Connected
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
                          onClick={() => handleCopyWebhook(integration.webhookUrl)}
                          className="btn-icon"
                          title="Copy to clipboard"
                        >
                          <FaCopy />
                        </button>
                      </div>
                      <small className="webhook-hint">
                        Copy this URL and paste it in your {platform.name} webhook settings
                      </small>
                    </div>

                    <div className="integration-actions">
                      {platform.id === 'shopify' && (
                        <button
                          onClick={() => handleSyncShopifyOrders(integration._id)}
                          className="btn-secondary"
                          disabled={syncingIntegrationId === integration._id}
                        >
                          <FaSync /> {syncingIntegrationId === integration._id ? 'Syncing...' : 'Sync Orders'}
                        </button>
                      )}
                      {platform.id === 'woocommerce' && (
                        <button
                          onClick={() => handleSyncWooCommerceOrders(integration._id)}
                          className="btn-secondary"
                          disabled={syncingIntegrationId === integration._id}
                        >
                          <FaSync /> {syncingIntegrationId === integration._id ? 'Syncing...' : 'Sync Orders'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRegenerateSecret(integration._id)}
                        className="btn-secondary"
                      >
                        <FaSync /> Regenerate Secret
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration._id)}
                        className="btn-danger"
                      >
                        <FaTimes /> Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="integration-disconnected">
                    {!isProfileComplete ? (
                      <button
                        className="btn-primary"
                        style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed', background: '#3f3f46', color: '#a1a1aa' }}
                        disabled
                        title="Please complete your Profile & Store settings first"
                      >
                        <FaLock /> Complete Profile to Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="btn-primary"
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
                          color: '#a1a1aa',
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
                <strong>📋 Next Steps:</strong>
                <ol>
                  <li>After connecting, you'll receive a unique webhook URL</li>
                  <li>Copy the webhook URL</li>
                  <li>Add it to your {selectedPlatform.name} webhook settings</li>
                  <li>Use Sync Orders to import existing Shopify orders</li>
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

      {/* Interactive Onboarding Guide Modal */}
      {isGuideOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1100px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaShopify style={{ color: '#96bf48' }} /> Shopify App Integration Guide
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Step {currentGuideStep + 1} of {SHOPIFY_GUIDE_STEPS.length}: {SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                </p>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                &times;
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e2e8f0'
            }}>
              <div style={{
                height: '100%',
                width: `${((currentGuideStep + 1) / SHOPIFY_GUIDE_STEPS.length) * 100}%`,
                backgroundColor: '#96bf48',
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            {/* Body */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
              overflow: 'hidden'
            }}>
              {/* Left Pane: Screenshot */}
              <div style={{
                backgroundColor: '#f1f5f9',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRight: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                <img
                  src={SHOPIFY_GUIDE_STEPS[currentGuideStep].image}
                  alt={SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              {/* Right Pane: Content / Description */}
              <div style={{
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto',
                backgroundColor: '#ffffff'
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '16px'
                  }}>
                    STEP {currentGuideStep + 1}
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', lineHeight: '1.3' }}>
                    {SHOPIFY_GUIDE_STEPS[currentGuideStep].title}
                  </h3>

                  <div style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line'
                  }}>
                    {SHOPIFY_GUIDE_STEPS[currentGuideStep].description}
                  </div>
                </div>

                {/* Quick Helper Tips */}
                <div style={{
                  marginTop: '24px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: '4px solid #96bf48',
                  fontSize: '13px',
                  color: '#475569'
                }}>
                  <strong>💡 Pro-Tip:</strong> Use Left & Right Arrow keys on your keyboard to navigate between steps.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setCurrentGuideStep((prev) => Math.max(prev - 1, 0))}
                disabled={currentGuideStep === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: currentGuideStep === 0 ? '#cbd5e1' : '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: currentGuideStep === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Previous Step
              </button>

              {/* Dots */}
              <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {SHOPIFY_GUIDE_STEPS.map((step, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCurrentGuideStep(idx)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: currentGuideStep === idx ? '#96bf48' : '#cbd5e1',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Step ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentGuideStep === SHOPIFY_GUIDE_STEPS.length - 1) {
                    setIsGuideOpen(false);
                  } else {
                    setCurrentGuideStep((prev) => Math.min(prev + 1, SHOPIFY_GUIDE_STEPS.length - 1));
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#96bf48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {currentGuideStep === SHOPIFY_GUIDE_STEPS.length - 1 ? 'Finish Setup' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Integrations;
