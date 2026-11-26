import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaKey, 
  FaCopy, 
  FaCheck, 
  FaSync, 
  FaShieldAlt, 
  FaEye, 
  FaEyeSlash, 
  FaExclamationTriangle,
  FaTimes,
  FaLock
} from 'react-icons/fa';
import { getApiKey, regenerateApiKey } from '../../../services/api';
import { useOptionalEffectiveAccess } from '../../../context/EffectiveAccessContext';
import TrialFeatureLockBanner from '../../../components/common/TrialFeatureLockBanner';
import './DeveloperPlatform.css';
import './PlatformDashboard.css';
import './DeveloperTheme.css';
import DeveloperBackLink from './DeveloperBackLink';

function ApiKeyManager() {
  const { isDeveloperApiLocked, isPreviewSandbox } = useOptionalEffectiveAccess() || {};
  const [apiKey, setApiKey] = useState('Loading...');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [rotating, setRotating] = useState(false);

  const fetchKey = useCallback(async () => {
    if (isDeveloperApiLocked) {
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getApiKey();
      if (res.data && res.data.success && res.data.apiKey) {
        setApiKey(res.data.apiKey);
      } else {
        setError('Failed to retrieve API key');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to fetch API key');
    } finally {
      setLoading(false);
    }
  }, [isDeveloperApiLocked]);

  useEffect(() => {
    fetchKey();
  }, [fetchKey]);

  const handleCopy = () => {
    if (!apiKey || apiKey === 'Loading...') return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = async (customKey = null) => {
    try {
      setRotating(true);
      const payload = customKey ? { customKey } : {};
      const res = await regenerateApiKey(payload);
      if (res.data && res.data.success && res.data.apiKey) {
        setApiKey(res.data.apiKey);
        setShowRotateModal(false);
        setCustomKeyInput('');
        setShowKey(true);
        alert('API Key regenerated successfully. Update your server applications with the new key.');
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to regenerate API Key');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="dev-container">
      <DeveloperBackLink />
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaKey /> Authentication Credentials
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>API Key Management</h1>
              <p>Your secret API key authenticates all REST API requests sent from your backend services to Kwickbot.</p>
            </div>
          </div>
        </div>
      </div>

      {isDeveloperApiLocked && (
        <TrialFeatureLockBanner
          title={isPreviewSandbox ? 'API Keys are Locked in Free Trial' : 'API Keys Require the Growth Plan'}
          description={
            isPreviewSandbox
              ? 'Generating, revealing, or rotating production API secret keys is locked during Free Trial. Activate the Growth Plan in Billing to integrate your backend via REST API.'
              : 'Your current plan does not include REST API keys. Upgrade to the Growth Plan in Billing to generate and manage your API secret key.'
          }
        />
      )}

      {error && !isDeveloperApiLocked && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Main Key Box Card */}
      <div className="integration-section-card">
        <div className="section-header-row">
          <div className="section-title-group">
            <h2>Live Production Secret Key</h2>
            <p>Use this Bearer token in the <code>Authorization</code> header of your API requests</p>
          </div>
          {isDeveloperApiLocked ? (
            <Link to="/dashboard/billing" className="quick-action-btn primary" style={{ textDecoration: 'none' }}>
              <FaLock /> Locked · Upgrade to Growth
            </Link>
          ) : (
            <button 
              className="quick-action-btn primary"
              onClick={() => setShowRotateModal(true)}
            >
              <FaSync /> Regenerate Key
            </button>
          )}
        </div>

        {isDeveloperApiLocked ? (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            border: '1px dashed rgba(217, 119, 6, 0.45)',
            background: 'rgba(217, 119, 6, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, color: 'var(--text-primary, #101828)' }}>
              <FaLock style={{ color: '#d97706' }} />
              <span>kw_live_•••••••••••••••••••••••••••••••• (Locked until Growth Plan is active)</span>
            </div>
            <Link to="/dashboard/billing" className="quick-action-btn" style={{ textDecoration: 'none' }}>
              Go to Billing
            </Link>
          </div>
        ) : (
          <div className="api-key-display-row">
            <div className="api-key-value-box">
              {loading ? 'Fetching secret key...' : (showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••••••••••')}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="quick-action-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Reveal key'}
              >
                {showKey ? <FaEyeSlash /> : <FaEye />} {showKey ? 'Hide' : 'Reveal'}
              </button>
              <button 
                className="quick-action-btn"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <FaCheck style={{ color: '#16a36a' }} /> : <FaCopy />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Usage in HTTP Requests</h4>
          <div className="code-container">
            <div className="code-header-bar">
              <span>Authorization Header</span>
              <span>HTTP Header</span>
            </div>
            <pre className="code-body">
Authorization: Bearer {showKey ? apiKey : '<YOUR_KWICKBOT_API_KEY>'}
            </pre>
          </div>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="integration-section-card">
        <div className="section-header-row" style={{ marginBottom: '14px' }}>
          <div className="section-title-group">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShieldAlt style={{ color: 'var(--accent, #1677ff)' }} /> API Key Security Guidelines
            </h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#16a36a' }}>
              ✓ Store in Server Environment Variables
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary, #667085)', lineHeight: 1.5 }}>
              Always store your API key in secure environment variables (<code>.env</code>) on backend servers (Node.js, Python, PHP, Ruby).
            </p>
          </div>

          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#ef4444' }}>
              ✕ Never Expose in Client-Side Code
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary, #667085)', lineHeight: 1.5 }}>
              Do not bundle API keys in browser JavaScript, React, mobile apps, or public GitHub repositories.
            </p>
          </div>

          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#f59e0b' }}>
              ⚡ Regular Key Rotation
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary, #667085)', lineHeight: 1.5 }}>
              Rotate your API key periodically or immediately if an employee with key access leaves your organization.
            </p>
          </div>
        </div>
      </div>

      {/* Rotate Key Modal */}
      {showRotateModal && (
        <div className="modal-backdrop-saas" onClick={() => setShowRotateModal(false)}>
          <div className="modal-dialog-saas" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header-saas">
              <h3><FaLock style={{ color: 'var(--accent, #1677ff)' }} /> Regenerate Secret API Key</h3>
              <button className="modal-close-btn" onClick={() => setShowRotateModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-saas">
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#d97706',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.5
              }}>
                <strong>Warning:</strong> Regenerating your API key will immediately invalidate the current key. Any external systems or scripts using the old key will fail until updated.
              </div>

              <div className="form-group-saas">
                <label>Custom API Key (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. kw_live_custom_key_12345" 
                  value={customKeyInput}
                  onChange={e => setCustomKeyInput(e.target.value)}
                />
                <span className="form-hint">Leave blank to auto-generate a cryptographically secure random key.</span>
              </div>
            </div>

            <div className="modal-footer-saas">
              <button 
                type="button" 
                className="quick-action-btn" 
                onClick={() => setShowRotateModal(false)}
                disabled={rotating}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="quick-action-btn primary" 
                disabled={rotating}
                onClick={() => handleRegenerateKey(customKeyInput.trim() || null)}
              >
                {rotating ? 'Regenerating...' : (customKeyInput.trim() ? 'Save Custom Key' : 'Generate New Key')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeyManager;
