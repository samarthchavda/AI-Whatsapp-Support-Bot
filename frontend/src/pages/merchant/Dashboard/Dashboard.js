import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import { FaArrowRight, FaBroadcastTower, FaChartLine, FaComments, FaFileAlt, FaPaperPlane, FaSyncAlt, FaWhatsapp } from 'react-icons/fa';
import { getDashboardStats } from '../../../services/api';
import './Dashboard.css';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : window.location.origin);

const formatCount = (value) => Number(value || 0).toLocaleString('en-IN');
const formatMoney = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

function UsageMeter({ label, value, limit, detail }) {
  const hasLimit = typeof limit === 'number' && limit >= 0;
  const limitLabel = limit == null ? 'Not set' : hasLimit ? formatCount(limit) : 'Unlimited';
  const percent = hasLimit && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  return (
    <div className="merchant-usage-meter">
      <div className="merchant-usage-line">
        <div><strong>{label}</strong><span>{detail}</span></div>
        <b>{formatCount(value)} <small>/ {limitLabel}</small></b>
      </div>
      <div className="merchant-usage-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={hasLimit ? limit : undefined}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getDashboardStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      if (!silent) setError('Dashboard data could not be loaded. Please try again.');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const refresh = () => fetchStats(true);
    socket.on('new_message', refresh);
    socket.on('escalation_created', refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchStats]);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading dashboard...</span></div>;
  if (error && !stats) return <div className="merchant-dashboard"><div className="merchant-dashboard-error">{error}<button onClick={() => fetchStats()}>Retry</button></div></div>;

  const usage = stats?.usage || {};
  const limits = usage.limits || {};
  const charges = usage.charges || {};
  const recentConversations = stats?.recentConversations || [];
  const recentBroadcasts = stats?.recentBroadcasts || [];

  return (
    <div className="merchant-dashboard">
      <div className="merchant-dashboard-hero">
        <div>
          <div className="merchant-dashboard-eyebrow"><FaChartLine /> MERCHANT OVERVIEW</div>
          <h1>Dashboard</h1>
          <p>Live activity, plan usage and costs for your own Kwickbot workspace.</p>
          <div className="merchant-dashboard-plan">
            <span>{usage.planName || 'Current plan'}</span><span>·</span>
            <span>{usage.subscriptionStatus || 'Active'}</span><span>·</span>
            <span>{usage.billingCycle || 'monthly'} billing</span>
          </div>
        </div>
        <button type="button" className="merchant-dashboard-refresh" onClick={() => fetchStats(true)} aria-label="Refresh dashboard"><FaSyncAlt /> Refresh</button>
      </div>

      <div className="merchant-dashboard-metrics">
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon blue"><FaComments /></span><span className="merchant-dashboard-metric-label">Conversations this cycle</span><strong>{formatCount(usage.conversations)}</strong><small>Recorded for your plan quota</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon violet"><FaPaperPlane /></span><span className="merchant-dashboard-metric-label">AI replies processed</span><strong>{formatCount(usage.aiRepliesProcessed)}</strong><small>AI usage, not all outgoing messages</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon green"><FaBroadcastTower /></span><span className="merchant-dashboard-metric-label">Broadcast messages sent</span><strong>{formatCount(usage.broadcastMessagesSent)}</strong><small>{formatCount(usage.broadcastCampaignsCreated)} campaigns created this cycle</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon amber"><FaWhatsapp /></span><span className="merchant-dashboard-metric-label">Open chats</span><strong>{formatCount(stats?.conversations?.active)}</strong><small>Current retained conversations</small></div>
      </div>

      <div className="merchant-dashboard-panels">
        <section className="merchant-dashboard-panel">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">USAGE</span><h2>Plan limits</h2></div><span className="merchant-dashboard-period">Rolling 30-day cycle</span></div>
          <UsageMeter label="WhatsApp conversations" value={usage.conversations || 0} limit={limits.conversations} detail="Started during the current usage cycle" />
          <UsageMeter label="AI message quota" value={usage.aiRepliesProcessed || 0} limit={limits.messages} detail="Replies processed by the AI assistant" />
          {typeof limits.broadcastCampaigns === 'number' && limits.broadcastCampaigns !== 0 && <UsageMeter label="Broadcast campaigns" value={usage.broadcastCampaignsCreated || 0} limit={limits.broadcastCampaigns} detail="Campaigns created this cycle" />}
          {typeof limits.broadcastMessages === 'number' && limits.broadcastMessages !== 0 && <UsageMeter label="Broadcast messages" value={usage.broadcastMessagesSent || 0} limit={limits.broadcastMessages} detail="Successfully sent broadcast messages" />}
          {usage.periodStartedAt && <p className="merchant-dashboard-fineprint">Usage counter last reset {new Date(usage.periodStartedAt).toLocaleDateString('en-IN')}.</p>}
        </section>

        <section className="merchant-dashboard-panel merchant-dashboard-cost">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">COSTS</span><h2>Plan & Meta charges</h2></div></div>
          <div className="merchant-dashboard-cost-row"><span>Configured Kwickbot plan rate <small>Monthly equivalent</small></span><strong>{charges.configuredMonthlyRate == null ? 'Not set' : formatMoney(charges.configuredMonthlyRate, charges.currency)}</strong></div>
          <div className="merchant-dashboard-cost-row"><span>Actual Meta WhatsApp charges <small>Billed directly by Meta</small></span><strong className="merchant-dashboard-unavailable">Not available</strong></div>
          <p className="merchant-dashboard-cost-note">Meta billing is not connected to Kwickbot, so this page cannot show or estimate your actual Meta charges. Check your Meta Business billing statement for the payable amount.</p>
          <Link to="/dashboard/billing" className="merchant-dashboard-text-link">View billing & plan <FaArrowRight /></Link>
        </section>
      </div>

      <div className="merchant-dashboard-panels">
        <section className="merchant-dashboard-panel">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">ACTIVITY</span><h2>Recent chats</h2></div><Link to="/dashboard/live-chat">Open chat <FaArrowRight /></Link></div>
          <p className="merchant-dashboard-fineprint">Chats are retained for 24 hours after inactivity; plan usage above is tracked separately.</p>
          {recentConversations.length ? recentConversations.map((conv) => <div className="merchant-dashboard-activity" key={conv._id}><div className="merchant-dashboard-avatar">{(conv.customerName || '?').slice(0, 1).toUpperCase()}</div><div><strong>{conv.customerName || 'WhatsApp customer'}</strong><span>{conv.status || 'active'} · {conv.updatedAt ? new Date(conv.updatedAt).toLocaleString('en-IN') : ''}</span></div></div>) : <div className="merchant-dashboard-empty">No recent chats yet.</div>}
        </section>
        <section className="merchant-dashboard-panel">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">CAMPAIGNS</span><h2>Recent broadcasts</h2></div><Link to="/dashboard/broadcast">View broadcasts <FaArrowRight /></Link></div>
          {recentBroadcasts.length ? recentBroadcasts.map((campaign) => <div className="merchant-dashboard-activity" key={campaign._id}><div className="merchant-dashboard-avatar green"><FaBroadcastTower /></div><div><strong>{campaign.title}</strong><span>{campaign.status} · {formatCount(campaign.sentCount)} sent · {formatCount(campaign.failedCount)} failed</span></div></div>) : <div className="merchant-dashboard-empty">No broadcasts created yet.</div>}
          <div className="merchant-dashboard-shortcuts"><Link to="/dashboard/templates"><FaFileAlt /> Templates</Link><Link to="/dashboard/whatsapp-connect"><FaWhatsapp /> WhatsApp connection</Link></div>
        </section>
      </div>
      {usage.planCategory === 'crm_integration' && <p className="merchant-dashboard-footnote">Your CRM remains connected in the background. This dashboard shows Kwickbot messaging usage, not your CRM's own records or charges.</p>}
    </div>
  );
}

export default Dashboard;
