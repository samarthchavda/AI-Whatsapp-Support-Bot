import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCode, 
  FaKey, 
  FaBookOpen, 
  FaPlug, 
  FaHistory, 
  FaExclamationTriangle, 
  FaChartLine, 
  FaArrowRight, 
  FaSync,
  FaCheckCircle
} from 'react-icons/fa';
import { getDeveloperUsage, getDeveloperWebhooks } from '../../../services/api';
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './DeveloperPlatform.css';
import '../../../features/merchant/crm/IntegrationDashboard.css';

function ApiDashboard() {
  const { usageLimits, getUsageLimit } = useEffectiveAccess();
  const [usage, setUsage] = useState(null);
  const [webhooksCount, setWebhooksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageRes, webRes] = await Promise.all([
        getDeveloperUsage().catch(() => ({ data: { success: true, data: { currentPeriod: { totalRequests: 0, successfulRequests: 0, failedRequests: 0 } } } })),
        getDeveloperWebhooks().catch(() => ({ data: { success: true, data: [] } }))
      ]);

      if (usageRes.data && usageRes.data.success) {
        setUsage(usageRes.data.data);
      }
      if (webRes.data && webRes.data.success) {
        setWebhooksCount(webRes.data.data?.length || 0);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load developer stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalRequests = usage?.currentPeriod?.totalRequests || 0;
  const successfulRequests = usage?.currentPeriod?.successfulRequests || 0;
  const failedRequests = usage?.currentPeriod?.failedRequests || 0;
  const successRate = totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : '100.0';

  const monthlyApiLimit = getUsageLimit('monthlyApiRequests') || usageLimits?.monthlyApiRequests || 10000;
  const usagePercent = Math.min(100, Math.round((totalRequests / (monthlyApiLimit || 1)) * 100));

  return (
    <div className="dev-container">
      {/* Header */}
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-badge">
            <FaCode /> Developer & API Hub
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>WhatsApp Business API Developer Platform</h1>
              <p>Trigger approved WhatsApp templates, consume outbound webhooks, manage API keys, and monitor usage.</p>
            </div>
            <button className="quick-action-btn" onClick={fetchSummary} disabled={loading}>
              <FaSync className={loading ? 'spin' : ''} /> Refresh
            </button>
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

      {/* Top Stat Cards */}
      <div className="dev-stats-grid">
        <div className="stat-card-saas">
          <div className="stat-icon-wrapper blue">
            <FaCode />
          </div>
          <div className="stat-info">
            <span className="stat-label">Monthly API Requests</span>
            <span className="stat-val">{totalRequests.toLocaleString()}</span>
            <span className="stat-sub">Quota: {monthlyApiLimit.toLocaleString()} ({usagePercent}%)</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper green">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Success Rate</span>
            <span className="stat-val">{successRate}%</span>
            <span className="stat-sub">{successfulRequests.toLocaleString()} successful calls</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper purple">
            <FaPlug />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Webhooks</span>
            <span className="stat-val">{webhooksCount}</span>
            <span className="stat-sub">Configured HTTP listener endpoints</span>
          </div>
        </div>

        <div className="stat-card-saas">
          <div className="stat-icon-wrapper amber">
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Failed Requests</span>
            <span className="stat-val">{failedRequests.toLocaleString()}</span>
            <span className="stat-sub">Client 4xx & Server 5xx</span>
          </div>
        </div>
      </div>

      {/* Developer Portal Modules Navigation */}
      <div className="dev-nav-grid">
        <Link to="/dashboard/developer/api-keys" className="dev-nav-card">
          <div className="dev-nav-icon blue">
            <FaKey />
          </div>
          <h3>API Secret Keys</h3>
          <p>Generate, reveal, rotate, and manage Bearer tokens for authenticating your server requests.</p>
          <span className="dev-nav-link-text">
            Manage Keys <FaArrowRight />
          </span>
        </Link>

        <Link to="/dashboard/developer/docs" className="dev-nav-card">
          <div className="dev-nav-icon emerald">
            <FaBookOpen />
          </div>
          <h3>Interactive API Docs</h3>
          <p>Explore REST endpoints for sending templates, handling inbound messages, and copy code snippets.</p>
          <span className="dev-nav-link-text">
            View Endpoints <FaArrowRight />
          </span>
        </Link>

        <Link to="/dashboard/developer/webhooks" className="dev-nav-card">
          <div className="dev-nav-icon purple">
            <FaPlug />
          </div>
          <h3>Webhook Subscriptions</h3>
          <p>Register HTTPS callback URLs with HMAC SHA-256 signatures to receive real-time delivery and message events.</p>
          <span className="dev-nav-link-text">
            Configure Webhooks <FaArrowRight />
          </span>
        </Link>

        <Link to="/dashboard/developer/logs" className="dev-nav-card">
          <div className="dev-nav-icon blue">
            <FaHistory />
          </div>
          <h3>API Request Logs</h3>
          <p>Real-time audit log of HTTP status codes, latency, client IP addresses, and request headers.</p>
          <span className="dev-nav-link-text">
            View Request Logs <FaArrowRight />
          </span>
        </Link>

        <Link to="/dashboard/developer/failed-webhooks" className="dev-nav-card">
          <div className="dev-nav-icon amber">
            <FaExclamationTriangle />
          </div>
          <h3>Failed Webhook Queue</h3>
          <p>Inspect undelivered webhooks, analyze HTTP response errors, and trigger manual event replays.</p>
          <span className="dev-nav-link-text">
            Inspect Queue <FaArrowRight />
          </span>
        </Link>

        <Link to="/dashboard/developer/usage" className="dev-nav-card">
          <div className="dev-nav-icon emerald">
            <FaChartLine />
          </div>
          <h3>API Usage & Limits</h3>
          <p>Track your rate limit consumption, hourly burst volume, and monthly plan allocation.</p>
          <span className="dev-nav-link-text">
            Analyze Usage <FaArrowRight />
          </span>
        </Link>
      </div>

      {/* Quick Authentication Guide */}
      <div className="integration-section-card">
        <div className="section-header-row">
          <div className="section-title-group">
            <h2>Quick Authentication Guide</h2>
            <p>Every REST API call requires your secret API key passed in the HTTP Authorization header.</p>
          </div>
          <Link to="/dashboard/developer/api-keys" className="quick-action-btn primary" style={{ fontSize: '12px' }}>
            <FaKey /> Manage API Key
          </Link>
        </div>

        <div className="code-container">
          <div className="code-header-bar">
            <span>Sample cURL Request Header</span>
            <span style={{ fontSize: '11px' }}>HTTPS REST API</span>
          </div>
          <pre className="code-body">
{`curl -X POST https://kwickbot.in/api/v1/whatsapp/send-template \\
  -H "Authorization: Bearer YOUR_KWICKBOT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919876543210",
    "templateName": "order_confirmation_v1",
    "language": "en",
    "variables": { "1": "Customer Name", "2": "ORD-12345" }
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default ApiDashboard;
