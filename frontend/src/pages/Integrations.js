import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaShopify, FaWordpress, FaPlug, FaCheck, FaTimes, FaCopy, FaTrash, FaSync, FaExternalLinkAlt } from 'react-icons/fa';
import './Integrations.css';

function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState({
    storeUrl: '',
    apiKey: '',
    storeName: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const platforms = [
    {
      id: 'shopify',
      name: 'Shopify',
      icon: <FaShopify />,
      color: '#96bf48',
      description: 'Connect your Shopify store to sync orders automatically',
      setupGuide: 'https://help.shopify.com/en/manual/apps/custom-apps'
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
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/integrations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIntegrations(response.data.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    setSelectedPlatform(platform);
    setFormData({ storeUrl: '', apiKey: '', storeName: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      setSubmitting(true);
      await axios.post(
        'http://localhost:5001/api/integrations',
        {
          platform: selectedPlatform.id,
          ...formData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Integration connected successfully!');
      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to connect integration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) return;

    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`http://localhost:5001/api/integrations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `http://localhost:5001/api/integrations/${id}/regenerate-secret`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Webhook secret regenerated successfully');
      fetchIntegrations();
    } catch (error) {
      alert('Failed to regenerate webhook secret');
    }
  };

  const getIntegrationForPlatform = (platformId) => {
    return integrations.find(i => i.platform === platformId);
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔌 Integrations</h1>
          <p className="page-subtitle">Connect your e-commerce platforms</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading integrations...
        </div>
      ) : (
        <div className="integrations-grid">
          {platforms.map((platform) => {
            const integration = getIntegrationForPlatform(platform.id);
            const isConnected = !!integration;

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
                    <button
                      onClick={() => handleConnect(platform)}
                      className="btn-primary"
                      style={{ width: '100%' }}
                    >
                      <FaPlug /> Connect {platform.name}
                    </button>
                    <a
                      href={platform.setupGuide}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="setup-guide-link"
                    >
                      <FaExternalLinkAlt /> Setup Guide
                    </a>
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

              <div className="form-group">
                <label>API Key *</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  required
                />
                <small>
                  {selectedPlatform.id === 'shopify'
                    ? 'Get your API key from Shopify Admin → Apps → Develop apps'
                    : 'Get your API key from WooCommerce → Settings → Advanced → REST API'}
                </small>
              </div>

              <div className="info-box">
                <strong>📋 Next Steps:</strong>
                <ol>
                  <li>After connecting, you'll receive a unique webhook URL</li>
                  <li>Copy the webhook URL</li>
                  <li>Add it to your {selectedPlatform.name} webhook settings</li>
                  <li>Orders will sync automatically!</li>
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
    </div>
  );
}

export default Integrations;
