import React, { useState, useEffect, useCallback } from 'react';
import { FaSync, FaSave, FaUndo, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminTrialPolicy.css';

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="tp-switch-row">
      <div>
        <div className="tp-switch-title">{title}</div>
        <div className="tp-switch-desc">{description}</div>
      </div>
      <span className="tp-toggle">
        <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
        <span className="tp-toggle-slider" />
      </span>
    </label>
  );
}

function SuperAdminTrialPolicy() {
  const [policy, setPolicy] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const fetchPolicy = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const res = await api.get('/super-admin/trial-policy');
      const payload = res.data?.data || {};
      setPolicy(payload.policy || null);
      setDefaults(payload.defaults || null);
      setStats(payload.stats || {});
    } catch (err) {
      console.error('Error loading trial policy:', err);
      setError(err.response?.data?.error || 'Failed to load trial policy settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy(false);
  }, [fetchPolicy]);

  const updateField = (key, value) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotice(null);
      const res = await api.put('/super-admin/trial-policy', { policy });
      if (res.data?.data?.policy) {
        setPolicy(res.data.data.policy);
      }
      setNotice({ type: 'success', text: res.data?.message || 'Trial & preview policy saved.' });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save trial policy.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!defaults) return;
    setPolicy({ ...defaults });
    setNotice({ type: 'success', text: 'Defaults loaded. Click "Save Trial Policy" to apply.' });
  };

  if (loading && !policy) {
    return (
      <div className="tp-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const resolvedBannerText = String(policy?.bannerMessage || '')
    .replace(/\{broadcastLimit\}/g, String(policy?.testBroadcastLimit ?? 2))
    .replace(/\{recipientLimit\}/g, String(policy?.testRecipientLimit ?? 5))
    .replace(/\{trialDays\}/g, String(policy?.trialDays ?? 14));

  return (
    <div className="tp-page">
      <div className="tp-header">
        <div>
          <div className="tp-breadcrumb">Platform / Trial &amp; Preview Policy</div>
          <h1 className="tp-title">New User Trial &amp; Preview Settings</h1>
          <p className="tp-subtitle">
            Dynamically control what newly registered merchants get in their trial dashboard, test caps, and permitted features.
          </p>
        </div>

        <button
          type="button"
          className="tp-btn-secondary"
          onClick={() => fetchPolicy(true)}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="tp-notice error">
          <span><FaExclamationTriangle style={{ marginRight: '8px' }} />{error}</span>
          <button type="button" className="tp-btn-secondary" onClick={() => fetchPolicy(false)}>Retry</button>
        </div>
      )}

      {notice && (
        <div className={`tp-notice ${notice.type}`}>
          <span>
            {notice.type === 'success' ? <FaCheckCircle style={{ marginRight: '8px' }} /> : <FaExclamationTriangle style={{ marginRight: '8px' }} />}
            {notice.text}
          </span>
        </div>
      )}

      {!error && policy && (
        <div className="tp-panel">
          <div className="tp-summary-strip">
            <div className="tp-metric">
              <span className="tp-metric-label">Initial signup plan</span>
              <span className="tp-metric-value">{policy.defaultPlan}</span>
              <span className="tp-metric-sub">{policy.trialDays}-day trial window</span>
            </div>
            <div className="tp-metric">
              <span className="tp-metric-label">Preview sandbox</span>
              <span className="tp-metric-value">{policy.enablePreviewMode ? 'Sandbox' : 'Full Plan'}</span>
              <span className="tp-metric-sub">
                {policy.testBroadcastLimit} broadcasts · {policy.testRecipientLimit} contacts/send
              </span>
            </div>
            <div className="tp-metric">
              <span className="tp-metric-label">Current trial users</span>
              <span className="tp-metric-value">{stats.trialMerchantsCount || 0}</span>
              <span className="tp-metric-sub">{stats.selfSignupCount || 0} self-registered accounts</span>
            </div>
            <div className="tp-metric">
              <span className="tp-metric-label">Active paid accounts</span>
              <span className="tp-metric-value">{stats.activePaidCount || 0}</span>
              <span className="tp-metric-sub">Upgraded subscriptions</span>
            </div>
          </div>

          <form className="tp-body" onSubmit={handleSave}>
            <div className="tp-grid-2">
              <div className="tp-section">
                <h3>Trial Window &amp; Broadcast Quotas</h3>
                <p className="tp-section-sub">Applies automatically when new merchants self-register on kwickbot.in.</p>

                <div className="tp-form-grid">
                  <div className="tp-field">
                    <label>Initial Trial Plan</label>
                    <select
                      value={policy.defaultPlan}
                      onChange={(e) => updateField('defaultPlan', e.target.value)}
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="scale">Scale</option>
                    </select>
                  </div>

                  <div className="tp-field">
                    <label>Trial Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={policy.trialDays}
                      onChange={(e) => updateField('trialDays', e.target.value)}
                    />
                    <div className="tp-hint">Valid range: 1 to 90 days</div>
                  </div>

                  <div className="tp-field">
                    <label>Max Test Broadcasts</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={policy.testBroadcastLimit}
                      onChange={(e) => updateField('testBroadcastLimit', e.target.value)}
                    />
                    <div className="tp-hint">Set 0 to block test broadcasts in preview</div>
                  </div>

                  <div className="tp-field">
                    <label>Max Recipients per Test Send</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={policy.testRecipientLimit}
                      onChange={(e) => updateField('testRecipientLimit', e.target.value)}
                    />
                    <div className="tp-hint">CSV contact limit per test campaign</div>
                  </div>
                </div>
              </div>

              <div className="tp-section">
                <h3>Trial Capabilities &amp; Protection</h3>
                <p className="tp-section-sub">Control which write actions and modules are unlocked before paid activation.</p>

                <div className="tp-switch-list">
                  <ToggleRow
                    title="Enable Free Preview Sandbox Mode"
                    description="Restrict new signups to view-only exploration + WhatsApp/template/test broadcast actions until they pay."
                    checked={policy.enablePreviewMode}
                    onChange={(val) => updateField('enablePreviewMode', val)}
                  />
                  <ToggleRow
                    title="Allow AI Auto-Reply & Drafts in Trial"
                    description="Let trial merchants turn on Gemini AI auto-responses before upgrading."
                    checked={policy.allowAiInTrial}
                    onChange={(val) => updateField('allowAiInTrial', val)}
                  />
                  <ToggleRow
                    title="Allow Store Integrations in Trial"
                    description="Allow connecting or editing Shopify & WooCommerce stores during preview."
                    checked={policy.allowStoreConnectInTrial}
                    onChange={(val) => updateField('allowStoreConnectInTrial', val)}
                  />
                  <ToggleRow
                    title="Allow Knowledge Base Edits in Trial"
                    description="Allow uploading FAQs and documents before activating a paid plan."
                    checked={policy.allowKnowledgeBaseInTrial}
                    onChange={(val) => updateField('allowKnowledgeBaseInTrial', val)}
                  />
                  <ToggleRow
                    title="Allow Read-Only Exploration of Paid Pages"
                    description="Show paid pages in sidebar & view-only mode during trial so merchants can preview the full platform."
                    checked={policy.allowAllPagesReadOnly}
                    onChange={(val) => updateField('allowAllPagesReadOnly', val)}
                  />
                </div>
              </div>
            </div>

            <div className="tp-section">
              <h3>Merchant Top Banner &amp; Live Preview</h3>
              <p className="tp-section-sub">
                Supports placeholders: <code>{'{broadcastLimit}'}</code>, <code>{'{recipientLimit}'}</code>, and <code>{'{trialDays}'}</code>.
              </p>

              <div className="tp-form-grid" style={{ marginBottom: '14px' }}>
                <div className="tp-field">
                  <label>Banner Prefix</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={policy.bannerTitle || ''}
                    onChange={(e) => updateField('bannerTitle', e.target.value)}
                  />
                </div>
                <div className="tp-field">
                  <label>Banner Message</label>
                  <input
                    type="text"
                    maxLength={240}
                    value={policy.bannerMessage || ''}
                    onChange={(e) => updateField('bannerMessage', e.target.value)}
                  />
                </div>
              </div>

              <div className="tp-banner-preview">
                <span>
                  <span className="tp-banner-days">{policy.trialDays} days left</span>
                  <strong>{policy.bannerTitle}</strong> {resolvedBannerText}
                </span>
                <span className="tp-banner-cta">Choose a plan</span>
              </div>
            </div>

            <div className="tp-footer">
              <button type="button" className="tp-btn-secondary" onClick={handleResetDefaults}>
                <FaUndo /> Reset to Defaults
              </button>
              <button type="submit" className="tp-btn-primary" disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : 'Save Trial Policy'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default SuperAdminTrialPolicy;
