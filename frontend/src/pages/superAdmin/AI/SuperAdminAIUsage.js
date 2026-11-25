import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaEye, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminAIUsage.css';

function formatActivityDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function SuperAdminAIUsage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAIUsageData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const response = await api.get('/super-admin/ai-usage');
      setData(response.data?.data || null);
    } catch (err) {
      console.error('Error fetching AI Usage data:', err);
      setError(err.response?.data?.error || 'Failed to load AI usage metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAIUsageData(false);
  }, [fetchAIUsageData]);

  const merchants = useMemo(() => data?.merchants || [], [data]);
  const summary = data?.summary || {};
  const modelBreakdown = summary.modelBreakdown || [];

  const filteredMerchants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return merchants.filter((m) => {
      if (statusFilter === 'near_limit' && m.status !== 'Warning' && m.status !== 'Critical') {
        return false;
      }
      if (statusFilter === 'unlimited' && m.status !== 'Unlimited') {
        return false;
      }
      if (statusFilter === 'active' && (m.loggedCalls || 0) === 0 && (m.geminiTokensUsed || 0) === 0) {
        return false;
      }
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.businessName || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.aiModel || '').toLowerCase().includes(q)
      );
    });
  }, [merchants, searchQuery, statusFilter]);

  if (loading && !data) {
    return (
      <div className="aiusage-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="aiusage-page">
      <div className="aiusage-header">
        <div>
          <div className="aiusage-breadcrumb">AI / AI Usage</div>
          <h1 className="aiusage-title">AI Usage Monitoring</h1>
          <p className="aiusage-subtitle">
            Real-time token quotas, logged AILog requests, and model execution activity across merchants.
          </p>
        </div>

        <button
          type="button"
          className="aiusage-refresh-btn"
          onClick={() => fetchAIUsageData(true)}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="aiusage-error-box">
          <span><FaExclamationTriangle style={{ marginRight: '8px' }} />{error}</span>
          <button type="button" className="aiusage-refresh-btn" onClick={() => fetchAIUsageData(false)}>
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="aiusage-panel">
          <div className="aiusage-summary-strip">
            <div className="aiusage-metric">
              <span className="aiusage-metric-label">Logged AI tokens (AILog)</span>
              <span className="aiusage-metric-value">{(summary.totalLoggedTokens || 0).toLocaleString()}</span>
              <span className="aiusage-metric-sub">
                {(summary.totalLoggedCalls || 0).toLocaleString()} calls ({(summary.totalAiGeneratedCalls || 0).toLocaleString()} AI)
              </span>
            </div>

            <div className="aiusage-metric">
              <span className="aiusage-metric-label">Current cycle quota used</span>
              <span className="aiusage-metric-value">{(summary.totalUsed || 0).toLocaleString()}</span>
              <span className="aiusage-metric-sub">
                Of {(summary.totalLimit || 0).toLocaleString()} limited cap
              </span>
            </div>

            <div className="aiusage-metric">
              <span className="aiusage-metric-label">Near or over limit</span>
              <span className="aiusage-metric-value">{summary.nearLimitCount || 0}</span>
              <span className="aiusage-metric-sub">
                Avg {summary.avgUsagePct || 0}% across limited accounts
              </span>
            </div>

            <div className="aiusage-metric">
              <span className="aiusage-metric-label">AI errors / Unattributed</span>
              <span className="aiusage-metric-value">{summary.totalFailedCalls || 0}</span>
              <span className="aiusage-metric-sub">
                {(summary.systemLoggedCalls || 0).toLocaleString()} system/demo log calls
              </span>
            </div>
          </div>

          {modelBreakdown.length > 0 && (
            <div className="aiusage-models-bar">
              <span className="aiusage-models-label">Logged models:</span>
              {modelBreakdown.map((item) => (
                <span key={item.model} className="aiusage-model-chip">
                  <strong>{item.model}</strong>
                  <span>{item.calls.toLocaleString()} calls · {item.totalTokens.toLocaleString()} tok</span>
                </span>
              ))}
            </div>
          )}

          <div className="aiusage-toolbar">
            <div className="aiusage-filter-tabs">
              {[
                { key: 'all', label: `All (${merchants.length})` },
                { key: 'active', label: 'Has Activity' },
                { key: 'near_limit', label: 'Near Limit' },
                { key: 'unlimited', label: 'Unlimited' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`aiusage-filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="aiusage-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Search merchant, email, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="aiusage-table-wrap">
            <table className="aiusage-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Model / Plan</th>
                  <th>Current Cycle Quota</th>
                  <th>Logged Activity (AILog)</th>
                  <th>Status</th>
                  <th>Last AI Activity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                      No merchants match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => {
                    const isUnlimited = merchant.geminiTokensLimit === -1 || merchant.geminiTokensLimit === Infinity;
                    const barClass = merchant.status === 'Critical' ? 'crit' : merchant.status === 'Warning' ? 'warn' : '';
                    const pillClass =
                      merchant.status === 'Critical'
                        ? 'crit'
                        : merchant.status === 'Warning'
                          ? 'warn'
                          : merchant.status === 'Unlimited'
                            ? 'muted'
                            : 'ok';

                    return (
                      <tr key={merchant._id}>
                        <td>
                          <div className="aiusage-merchant-name">{merchant.businessName || merchant.name}</div>
                          <div className="aiusage-merchant-sub">{merchant.email}</div>
                        </td>
                        <td>
                          <div>{merchant.aiModel || 'gemini-2.5-flash'}</div>
                          <div className="aiusage-merchant-sub" style={{ textTransform: 'capitalize' }}>
                            {merchant.subscriptionPlan || 'starter'}
                          </div>
                        </td>
                        <td className="aiusage-quota-cell">
                          {isUnlimited ? (
                            <div className="aiusage-quota-nums">
                              <span>{(merchant.geminiTokensUsed || 0).toLocaleString()}</span>
                              <span style={{ color: 'var(--text-muted)' }}>Unlimited</span>
                            </div>
                          ) : (
                            <>
                              <div className="aiusage-quota-nums">
                                <span>
                                  {(merchant.geminiTokensUsed || 0).toLocaleString()} / {(merchant.geminiTokensLimit || 0).toLocaleString()}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>{merchant.usagePct}%</span>
                              </div>
                              <div className="aiusage-quota-bar">
                                <div
                                  className={`aiusage-quota-fill ${barClass}`}
                                  style={{ width: `${Math.min(merchant.usagePct || 0, 100)}%` }}
                                />
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          <div>
                            <strong>{(merchant.loggedTokens || 0).toLocaleString()}</strong> tokens
                          </div>
                          <div className="aiusage-merchant-sub">
                            {(merchant.loggedCalls || 0).toLocaleString()} calls ({(merchant.aiGeneratedCalls || 0).toLocaleString()} AI)
                          </div>
                        </td>
                        <td>
                          <span className={`aiusage-status-pill ${pillClass}`}>{merchant.status}</span>
                          {merchant.failedCalls > 0 && (
                            <div className="aiusage-err-sub">{merchant.failedCalls} error{merchant.failedCalls === 1 ? '' : 's'}</div>
                          )}
                        </td>
                        <td>{formatActivityDate(merchant.lastAiAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="aiusage-view-btn"
                            onClick={() => navigate(`/dashboard/super-admin/merchants/${merchant._id}?tab=ai-usage`)}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminAIUsage;
