import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaEye } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminLiveOps.css';

function SuperAdminLiveOps() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLiveOpsData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/live-operations');
      setData(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load Live Operations data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveOpsData(false);
  }, [fetchLiveOpsData]);

  const filteredMerchants = useMemo(() => {
    const list = data?.merchants || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (m) =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  if (loading && !data) {
    return (
      <div className="liveops-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalConversations: 0,
    totalMessages: 0,
    totalAiReplies: 0,
    activeConversations: 0,
    escalatedConversations: 0,
    totalEscalations: 0
  };

  return (
    <div className="liveops-page">
      <header className="liveops-header">
        <div>
          <div className="liveops-breadcrumb">Operations / Live Operations</div>
          <h1 className="liveops-title">Live Operations</h1>
          <p className="liveops-subtitle">
            Recent chat sessions (24h retention), logged AI replies, and customer escalations.
          </p>
        </div>

        <button
          type="button"
          className="liveops-refresh-btn"
          onClick={() => fetchLiveOpsData(true)}
          disabled={refreshing}
        >
          <FaSyncAlt />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="liveops-error-banner">
          <span>{error}</span>
          <button
            type="button"
            className="liveops-refresh-btn"
            onClick={() => fetchLiveOpsData(true)}
          >
            Retry
          </button>
        </div>
      )}

      <section className="liveops-panel">
        <div className="liveops-summary-strip">
          <div className="liveops-metric">
            <span className="liveops-metric-label">Active chats (24h)</span>
            <span className="liveops-metric-value">
              {(summary.activeConversations ?? 0).toLocaleString()}
            </span>
            <span className="liveops-metric-sub">
              {(summary.totalConversations ?? 0).toLocaleString()} recent sessions
            </span>
          </div>

          <div className="liveops-metric">
            <span className="liveops-metric-label">Open escalations</span>
            <span className="liveops-metric-value">
              {(summary.escalatedConversations ?? 0).toLocaleString()}
            </span>
            <span className="liveops-metric-sub">
              {(summary.totalEscalations ?? 0).toLocaleString()} total logged
            </span>
          </div>

          <div className="liveops-metric">
            <span className="liveops-metric-label">AI replies logged</span>
            <span className="liveops-metric-value">
              {(summary.totalAiReplies ?? 0).toLocaleString()}
            </span>
            <span className="liveops-metric-sub">Historical AILog entries</span>
          </div>

          <div className="liveops-metric">
            <span className="liveops-metric-label">24h chat messages</span>
            <span className="liveops-metric-value">
              {(summary.totalMessages ?? 0).toLocaleString()}
            </span>
            <span className="liveops-metric-sub">Active session messages</span>
          </div>
        </div>

        <div className="liveops-toolbar">
          <h2 className="liveops-toolbar-title">
            Merchants ({filteredMerchants.length})
          </h2>
          <input
            type="text"
            className="liveops-search"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredMerchants.length === 0 ? (
          <div className="liveops-empty">
            {searchQuery ? `No merchants found matching "${searchQuery}".` : 'No merchants found.'}
          </div>
        ) : (
          <div className="liveops-table-wrap">
            <table className="liveops-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Active Chats (24h)</th>
                  <th className="num">AI Replies</th>
                  <th>Open Escalations</th>
                  <th>Last Chat / AI Activity</th>
                  <th className="right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant._id}>
                    <td>
                      <div className="liveops-merchant-name">{merchant.name}</div>
                      <div className="liveops-merchant-email">{merchant.email}</div>
                    </td>
                    <td>
                      <span
                        className={`liveops-status-cell${
                          merchant.activeConversationsCount > 0 ? '' : ' muted'
                        }`}
                      >
                        <span
                          className={`liveops-dot ${
                            merchant.activeConversationsCount > 0 ? 'active' : ''
                          }`}
                        />
                        {merchant.activeConversationsCount || 0} active
                      </span>
                      <div className="liveops-sub">
                        {merchant.conversationsCount || 0} sessions · {merchant.messagesCount || 0} msgs
                      </div>
                    </td>
                    <td className="num">
                      {(merchant.aiRepliesCount || 0).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`liveops-status-cell${
                          merchant.escalatedConversationsCount > 0 ? '' : ' muted'
                        }`}
                      >
                        <span
                          className={`liveops-dot ${
                            merchant.escalatedConversationsCount > 0 ? 'warn' : ''
                          }`}
                        />
                        {merchant.escalatedConversationsCount || 0} open
                      </span>
                      <div className="liveops-sub">
                        {merchant.totalEscalationsCount || 0} total
                      </div>
                    </td>
                    <td className="liveops-date">
                      {merchant.lastActivity
                        ? new Date(merchant.lastActivity).toLocaleString()
                        : '—'}
                    </td>
                    <td className="right">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/super-admin/merchants/${merchant._id}`)}
                        className="liveops-view-btn"
                      >
                        <FaEye />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default SuperAdminLiveOps;
