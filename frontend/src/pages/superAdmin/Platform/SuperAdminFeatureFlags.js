import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaToggleOn,
  FaToggleOff,
  FaSync,
  FaSearch,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminFeatureFlags.css';

function SuperAdminFeatureFlags() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [togglingKey, setTogglingKey] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchFeatureFlags = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const response = await api.get('/super-admin/feature-flags');
      setData(response.data?.data || null);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err.response?.data?.error || 'Failed to load feature flags');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatureFlags(false);
  }, [fetchFeatureFlags]);

  const executeToggleFlag = async () => {
    if (!confirmModal) return;
    const { key, name, isEnabled } = confirmModal;
    setConfirmModal(null);

    try {
      setTogglingKey(key);
      setFeedback(null);

      const response = await api.post('/super-admin/feature-flags/toggle', {
        key,
        isEnabled: !isEnabled
      });

      if (response.data?.success) {
        setData((prev) => {
          if (!prev) return prev;
          const updatedFlags = prev.flags.map((f) =>
            f.key === key ? { ...f, isEnabled: !isEnabled, updatedAt: new Date() } : f
          );
          const enabledCount = updatedFlags.filter((f) => f.isEnabled).length;
          return {
            ...prev,
            flags: updatedFlags,
            summary: {
              ...prev.summary,
              enabledCount,
              disabledCount: updatedFlags.length - enabledCount
            }
          };
        });

        setFeedback({
          type: 'success',
          text: `${!isEnabled ? 'Enabled' : 'Disabled'} "${name}".`
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Error toggling feature flag:', err);
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || `Failed to update "${name}".`
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const flags = useMemo(() => data?.flags || [], [data]);
  const summary = data?.summary || { totalFeatures: 0, enabledCount: 0, disabledCount: 0 };

  const filteredFlags = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return flags.filter((flag) => {
      if (statusFilter === 'enabled' && !flag.isEnabled) return false;
      if (statusFilter === 'disabled' && flag.isEnabled) return false;
      if (!q) return true;
      return (
        (flag.name || '').toLowerCase().includes(q) ||
        (flag.key || '').toLowerCase().includes(q) ||
        (flag.description || '').toLowerCase().includes(q) ||
        (flag.scope || '').toLowerCase().includes(q)
      );
    });
  }, [flags, statusFilter, searchQuery]);

  if (loading && !data) {
    return (
      <div className="ff-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="ff-page">
      <div className="ff-header">
        <div>
          <div className="ff-breadcrumb">Platform / Feature Flags</div>
          <h1 className="ff-title">Feature Flags</h1>
          <p className="ff-subtitle">
            Live runtime switches enforced across AI auto-replies, store webhooks, campaigns, templates, and public signups.
          </p>
        </div>

        <button
          type="button"
          className="ff-refresh-btn"
          onClick={() => fetchFeatureFlags(true)}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ff-notice error">
          <span><FaExclamationTriangle style={{ marginRight: '8px' }} />{error}</span>
          <button type="button" className="ff-refresh-btn" onClick={() => fetchFeatureFlags(false)}>
            Retry
          </button>
        </div>
      )}

      {feedback && (
        <div className={`ff-notice ${feedback.type}`}>
          <span>
            {feedback.type === 'success' ? <FaCheckCircle style={{ marginRight: '8px' }} /> : <FaExclamationTriangle style={{ marginRight: '8px' }} />}
            {feedback.text}
          </span>
        </div>
      )}

      {!error && (
        <div className="ff-panel">
          <div className="ff-summary-strip">
            <div className="ff-metric">
              <span className="ff-metric-label">Declared platform flags</span>
              <span className="ff-metric-value">{summary.totalFeatures}</span>
              <span className="ff-metric-sub">Enforced in runtime code</span>
            </div>
            <div className="ff-metric">
              <span className="ff-metric-label">Enabled</span>
              <span className="ff-metric-value" style={{ color: '#34d399' }}>{summary.enabledCount}</span>
              <span className="ff-metric-sub">Active across platform</span>
            </div>
            <div className="ff-metric">
              <span className="ff-metric-label">Disabled</span>
              <span className="ff-metric-value">{summary.disabledCount}</span>
              <span className="ff-metric-sub">Paused / kill-switch active</span>
            </div>
          </div>

          <div className="ff-toolbar">
            <div className="ff-filter-tabs">
              {[
                { key: 'all', label: `All (${summary.totalFeatures})` },
                { key: 'enabled', label: `Enabled (${summary.enabledCount})` },
                { key: 'disabled', label: `Disabled (${summary.disabledCount})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`ff-filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="ff-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search feature, key, or scope..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="ff-table-wrap">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Description</th>
                  <th>Enforcement</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlags.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No feature flags match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredFlags.map((flag) => (
                    <tr key={flag.key}>
                      <td>
                        <div className="ff-flag-name">{flag.name}</div>
                        <div className="ff-flag-key">{flag.key}</div>
                      </td>
                      <td className="ff-flag-desc">{flag.description}</td>
                      <td>
                        <span className="ff-scope-pill">{flag.scope}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {flag.updatedAt ? new Date(flag.updatedAt).toLocaleString('en-IN') : 'Default'}
                      </td>
                      <td>
                        <span className={`ff-status-pill ${flag.isEnabled ? 'on' : 'off'}`}>
                          {flag.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setConfirmModal(flag)}
                          disabled={togglingKey === flag.key}
                          className={`ff-toggle-btn ${flag.isEnabled ? 'disable' : 'enable'}`}
                        >
                          {togglingKey === flag.key ? (
                            'Updating...'
                          ) : flag.isEnabled ? (
                            <>
                              <FaToggleOff /> Disable
                            </>
                          ) : (
                            <>
                              <FaToggleOn /> Enable
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="ff-modal-backdrop">
          <div className="ff-modal">
            <h3>
              <FaExclamationTriangle style={{ color: '#fbbf24' }} />
              Confirm Feature Toggle
            </h3>
            <p>
              Are you sure you want to {confirmModal.isEnabled ? 'disable' : 'enable'}{' '}
              <strong>&quot;{confirmModal.name}&quot;</strong>? This takes effect immediately across the platform.
            </p>
            <div className="ff-modal-actions">
              <button
                type="button"
                className="ff-refresh-btn"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeToggleFlag}
                className={`ff-toggle-btn ${confirmModal.isEnabled ? 'disable' : 'enable'}`}
              >
                Yes, {confirmModal.isEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminFeatureFlags;
