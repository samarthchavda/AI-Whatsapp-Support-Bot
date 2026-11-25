import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaEye } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminIntegrationHealth.css';

function ChannelStatus({ label, state }) {
  const dotClass =
    state === 'ok' ? 'ok' : state === 'bad' ? 'bad' : '';
  return (
    <span className={`inth-status-cell${state === 'off' ? ' muted' : ''}`}>
      <span className={`inth-dot ${dotClass}`} />
      {label}
    </span>
  );
}

function SuperAdminIntegrationHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIntegrationHealthData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/integration-health');
      setData(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load integration health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrationHealthData(false);
  }, [fetchIntegrationHealthData]);

  const filteredMerchants = useMemo(() => {
    const list = data?.merchants || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (m) =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q) ||
        String(m.whatsappPhone || '').toLowerCase().includes(q) ||
        String(m.whatsappWabaId || '').toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  if (loading && !data) {
    return (
      <div className="inth-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalShopify: 0,
    totalWoo: 0,
    activeIntegrations: 0,
    failedIntegrations: 0,
    whatsappConnectedAccounts: 0,
    whatsappTotalAccounts: filteredMerchants.length,
    totalMessagesAll: 0
  };

  return (
    <div className="inth-page">
      <header className="inth-header">
        <div>
          <div className="inth-breadcrumb">Operations / Integration Health</div>
          <h1 className="inth-title">Integration Health</h1>
          <p className="inth-subtitle">
            Live WhatsApp, Shopify, WooCommerce connections and conversation activity per merchant.
          </p>
        </div>

        <button
          type="button"
          className="inth-refresh-btn"
          onClick={() => fetchIntegrationHealthData(true)}
          disabled={refreshing}
        >
          <FaSyncAlt />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="inth-error-banner">
          <span>{error}</span>
          <button
            type="button"
            className="inth-refresh-btn"
            onClick={() => fetchIntegrationHealthData(true)}
          >
            Retry
          </button>
        </div>
      )}

      <section className="inth-panel">
        <div className="inth-summary-strip">
          <div className="inth-metric">
            <span className="inth-metric-label">WhatsApp connected</span>
            <span className="inth-metric-value">
              {summary.whatsappConnectedAccounts ?? 0} / {summary.whatsappTotalAccounts ?? filteredMerchants.length}
            </span>
            <span className="inth-metric-sub">Merchants online</span>
          </div>

          <div className="inth-metric">
            <span className="inth-metric-label">Shopify stores</span>
            <span className="inth-metric-value">{summary.totalShopify ?? 0}</span>
            <span className="inth-metric-sub">{summary.activeIntegrations ?? 0} active syncs total</span>
          </div>

          <div className="inth-metric">
            <span className="inth-metric-label">WooCommerce stores</span>
            <span className="inth-metric-value">{summary.totalWoo ?? 0}</span>
            <span className="inth-metric-sub">{summary.failedIntegrations ?? 0} inactive</span>
          </div>

          <div className="inth-metric">
            <span className="inth-metric-label">Stored messages</span>
            <span className="inth-metric-value">
              {(summary.totalMessagesAll ?? 0).toLocaleString()}
            </span>
            <span className="inth-metric-sub">Across all conversations</span>
          </div>
        </div>

        <div className="inth-toolbar">
          <h2 className="inth-toolbar-title">
            Merchants ({filteredMerchants.length})
          </h2>
          <input
            type="text"
            className="inth-search"
            placeholder="Search name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredMerchants.length === 0 ? (
          <div className="inth-empty">
            {searchQuery ? `No merchants found matching "${searchQuery}".` : 'No merchants found.'}
          </div>
        ) : (
          <div className="inth-table-wrap">
            <table className="inth-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>WhatsApp</th>
                  <th>Shopify</th>
                  <th>WooCommerce</th>
                  <th className="num">Messages</th>
                  <th>Last Activity</th>
                  <th className="right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant._id}>
                    <td>
                      <div className="inth-merchant-name">{merchant.name}</div>
                      <div className="inth-merchant-email">{merchant.email}</div>
                    </td>
                    <td>
                      <ChannelStatus
                        label={
                          merchant.whatsappConnected
                            ? `Connected${merchant.whatsappNumbersCount > 1 ? ` (${merchant.whatsappNumbersCount})` : ''}`
                            : 'Not connected'
                        }
                        state={merchant.whatsappConnected ? 'ok' : 'off'}
                      />
                      {merchant.whatsappPhone && (
                        <div className="inth-subline">{merchant.whatsappPhone}</div>
                      )}
                    </td>
                    <td>
                      <ChannelStatus
                        label={merchant.shopifyStatus}
                        state={
                          merchant.shopifyStatus === 'Active'
                            ? 'ok'
                            : merchant.shopifyStatus === 'Inactive'
                            ? 'bad'
                            : 'off'
                        }
                      />
                    </td>
                    <td>
                      <ChannelStatus
                        label={merchant.wooStatus}
                        state={
                          merchant.wooStatus === 'Active'
                            ? 'ok'
                            : merchant.wooStatus === 'Inactive'
                            ? 'bad'
                            : 'off'
                        }
                      />
                    </td>
                    <td className="num">
                      {(merchant.totalMessages || 0).toLocaleString()}
                    </td>
                    <td className="inth-date">
                      {merchant.lastSync ? new Date(merchant.lastSync).toLocaleString() : '—'}
                    </td>
                    <td className="right">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/super-admin/merchants/${merchant._id}`)}
                        className="inth-view-btn"
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

export default SuperAdminIntegrationHealth;
