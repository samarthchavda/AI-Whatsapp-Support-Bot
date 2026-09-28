import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaChartLine, 
  FaSync, 
  FaCrown, 
  FaExclamationTriangle
} from 'react-icons/fa';
import { getDeveloperUsage } from '../../../services/api';
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './DeveloperPlatform.css';
import '../IntegrationPlatform/IntegrationDashboard.css';

function ApiUsage() {
  const { usageLimits, getUsageLimit } = useEffectiveAccess();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDeveloperUsage();
      if (res.data && res.data.success) {
        setUsage(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to load usage data');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to fetch API usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const totalRequests = usage?.currentPeriod?.totalRequests || 0;
  const successfulRequests = usage?.currentPeriod?.successfulRequests || 0;
  const failedRequests = usage?.currentPeriod?.failedRequests || 0;

  const monthlyApiLimit = getUsageLimit('monthlyApiRequests') || usageLimits?.monthlyApiRequests || 10000;
  const monthlyWebhookLimit = getUsageLimit('monthlyWebhookDeliveries') || usageLimits?.monthlyWebhookDeliveries || 5000;

  const apiPercent = Math.min(100, Math.round((totalRequests / (monthlyApiLimit || 1)) * 100));

  const getProgressClass = (pct) => {
    if (pct >= 90) return 'quota-progress-fill danger';
    if (pct >= 75) return 'quota-progress-fill warning';
    return 'quota-progress-fill';
  };

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaChartLine /> Traffic & Quota Monitoring
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>API Usage & Rate Limits</h1>
              <p>Monitor your current monthly API quota, webhook deliveries, and endpoint consumption.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="quick-action-btn" onClick={fetchUsage} disabled={loading}>
                <FaSync className={loading ? 'spin' : ''} /> Refresh
              </button>
              <Link to="/dashboard/billing" className="quick-action-btn primary">
                <FaCrown /> Upgrade Plan Limit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && (
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

      {/* Quota Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="integration-section-card">
          <div className="section-header-row" style={{ marginBottom: '14px' }}>
            <div className="section-title-group">
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Monthly API Requests</h3>
              <p>REST API calls processed this billing cycle</p>
            </div>
            <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--accent, #1677ff)' }}>
              {apiPercent}%
            </span>
          </div>

          <div className="quota-progress-wrapper">
            <div className="quota-progress-track">
              <div className={getProgressClass(apiPercent)} style={{ width: `${apiPercent}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary, #667085)', marginTop: '4px' }}>
              <span>{totalRequests.toLocaleString()} used</span>
              <span>{monthlyApiLimit.toLocaleString()} quota</span>
            </div>
          </div>
        </div>

        <div className="integration-section-card">
          <div className="section-header-row" style={{ marginBottom: '14px' }}>
            <div className="section-title-group">
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Outbound Webhooks</h3>
              <p>Real-time delivery events dispatched</p>
            </div>
            <span style={{ fontWeight: '800', fontSize: '18px', color: '#16a36a' }}>
              {Math.min(100, Math.round(((usage?.currentPeriod?.webhookDeliveries || 0) / (monthlyWebhookLimit || 1)) * 100))}%
            </span>
          </div>

          <div className="quota-progress-wrapper">
            <div className="quota-progress-track">
              <div 
                className={getProgressClass(Math.min(100, Math.round(((usage?.currentPeriod?.webhookDeliveries || 0) / (monthlyWebhookLimit || 1)) * 100)))} 
                style={{ width: `${Math.min(100, Math.round(((usage?.currentPeriod?.webhookDeliveries || 0) / (monthlyWebhookLimit || 1)) * 100))}%` }}
              ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary, #667085)', marginTop: '4px' }}>
              <span>{(usage?.currentPeriod?.webhookDeliveries || 0).toLocaleString()} used</span>
              <span>{monthlyWebhookLimit.toLocaleString()} quota</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Summary Metrics */}
      <div className="integration-section-card">
        <div className="section-header-row">
          <div className="section-title-group">
            <h2>Traffic Performance Summary</h2>
            <p>HTTP response distribution for the current cycle</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-muted, #98a2b3)' }}>Total Requests</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary, #101828)', marginTop: '4px' }}>
              {totalRequests.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#16a36a' }}>Successful (2xx)</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a36a', marginTop: '4px' }}>
              {successfulRequests.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#ef4444' }}>Errors (4xx/5xx)</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
              {failedRequests.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input, #f8fafc)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle, #d9e8f7)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--accent, #1677ff)' }}>Avg Response Time</span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent, #1677ff)', marginTop: '4px' }}>
              {usage?.currentPeriod?.avgLatencyMs ? `${Math.round(usage.currentPeriod.avgLatencyMs)} ms` : '< 85 ms'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiUsage;
