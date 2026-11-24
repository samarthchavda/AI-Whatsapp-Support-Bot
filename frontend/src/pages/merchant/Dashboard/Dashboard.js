import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import { FaArrowRight, FaBoxOpen, FaBroadcastTower, FaChartLine, FaComments, FaFileAlt, FaPaperPlane, FaShoppingCart, FaStore, FaSyncAlt, FaWhatsapp } from 'react-icons/fa';
import { getDashboardStats } from '../../../services/api';
import { fetchStoreConnections } from '../../../services/storeConnections';
import MetaCostTracker from './MetaCostTracker';
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
  const [storeConnections, setStoreConnections] = useState({ loading: true, error: '', shopify: null, woocommerce: null });

  const fetchStats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getDashboardStats();
      if (!response.data?.orders || !response.data?.usage) throw new Error('Incomplete dashboard response');
      setStats(response.data);
      setError(null);
    } catch (err) {
      if (!silent) setError('Dashboard data could not be loaded. Please try again.');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refreshStoreConnections = useCallback(async () => {
    setStoreConnections(previous => ({ ...previous, loading: true, error: '' }));
    try {
      const connections = await fetchStoreConnections();
      setStoreConnections({ loading: false, error: '', ...connections });
    } catch (err) {
      setStoreConnections({ loading: false, error: err.response?.data?.error || err.message || 'Connection status unavailable.', shopify: null, woocommerce: null });
    }
  }, []);

  const refreshDashboard = () => {
    fetchStats(true);
    refreshStoreConnections();
  };

  useEffect(() => {
    fetchStats();
    refreshStoreConnections();
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const refresh = () => fetchStats(true);
    socket.on('new_message', refresh);
    socket.on('escalation_created', refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchStats, refreshStoreConnections]);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading dashboard...</span></div>;
  if (error && !stats) return <div className="merchant-dashboard"><div className="merchant-dashboard-error">{error}<button onClick={() => fetchStats()}>Retry</button></div></div>;

  const usage = stats?.usage || {};
  const limits = usage.limits || {};
  const charges = usage.charges || {};
  const recentConversations = stats?.recentConversations || [];
  const recentBroadcasts = stats?.recentBroadcasts || [];
  const orders = stats?.orders || {};
  const hasShopify = Boolean(storeConnections.shopify);
  const hasWooCommerce = Boolean(storeConnections.woocommerce);

  return (
    <div className="merchant-dashboard">
      <div className="merchant-dashboard-hero">
        <div>
          <div className="merchant-dashboard-eyebrow"><FaChartLine /> MERCHANT OVERVIEW</div>
          <h1>Dashboard</h1>
          <p>Messages, conversations, usage and costs for your Kwickbot workspace.</p>
          <div className="merchant-dashboard-plan">
            <span>Workspace overview</span><span>·</span>
            <span>{usage.subscriptionStatus || 'Active'}</span><span>·</span>
            <span>{usage.billingCycle || 'monthly'} billing</span>
          </div>
        </div>
        <button type="button" className="merchant-dashboard-refresh" onClick={refreshDashboard} aria-label="Refresh dashboard"><FaSyncAlt /> Refresh</button>
      </div>

      <div className="merchant-dashboard-metrics">
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon blue"><FaComments /></span><span className="merchant-dashboard-metric-label">Conversations this cycle</span><strong>{formatCount(usage.conversations)}</strong><small>Recorded for your plan quota</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon violet"><FaPaperPlane /></span><span className="merchant-dashboard-metric-label">AI replies processed</span><strong>{formatCount(usage.aiRepliesProcessed)}</strong><small>AI usage, not all outgoing messages</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon green"><FaBroadcastTower /></span><span className="merchant-dashboard-metric-label">Broadcast messages sent</span><strong>{formatCount(usage.broadcastMessagesSent)}</strong><small>{formatCount(usage.broadcastCampaignsCreated)} campaigns created this cycle</small></div>
        <div className="merchant-dashboard-metric"><span className="merchant-dashboard-metric-icon amber"><FaWhatsapp /></span><span className="merchant-dashboard-metric-label">Open chats</span><strong>{formatCount(stats?.conversations?.active)}</strong><small>Current retained conversations</small></div>
      </div>

      <div className="merchant-dashboard-panels merchant-dashboard-commerce">
        <section className="merchant-dashboard-panel">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">STORE SETUP</span><h2>Store connections</h2></div><Link to="/dashboard/integrations">Manage stores <FaArrowRight /></Link></div>
          {storeConnections.loading ? <p className="merchant-dashboard-fineprint">Checking connected stores…</p> : storeConnections.error ? <div className="merchant-dashboard-inline-error" role="alert">{storeConnections.error}<button type="button" onClick={refreshStoreConnections}>Retry</button></div> : <>
            <div className="merchant-dashboard-store-row"><FaStore /><div><strong>Shopify</strong><span>{hasShopify ? storeConnections.shopify.metadata?.storeName || storeConnections.shopify.storeUrl : 'Connect to sync products and recover abandoned carts'}</span></div><b className={hasShopify ? 'connected' : ''}>{hasShopify ? 'Active' : 'Not connected'}</b></div>
            <div className="merchant-dashboard-store-row"><FaStore /><div><strong>WooCommerce</strong><span>{hasWooCommerce ? storeConnections.woocommerce.metadata?.storeName || storeConnections.woocommerce.storeUrl : 'Connect to sync store orders'}</span></div><b className={hasWooCommerce ? 'connected' : ''}>{hasWooCommerce ? 'Active' : 'Not connected'}</b></div>
            {!hasShopify && <p className="merchant-dashboard-setup-note"><FaShoppingCart /> Products and abandoned carts need an active Shopify connection.</p>}
          </>}
          <div className="merchant-dashboard-shortcuts"><Link to="/dashboard/products"><FaBoxOpen /> Products</Link><Link to="/dashboard/abandoned-carts"><FaShoppingCart /> Abandoned carts</Link></div>
        </section>
        <section className="merchant-dashboard-panel">
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">COMMERCE</span><h2>Orders overview</h2></div><Link to="/dashboard/orders">View orders <FaArrowRight /></Link></div>
          <p className="merchant-dashboard-fineprint">Current orders from your workspace, including manual and synced orders.</p>
          <div className="merchant-dashboard-order-grid">
            <div><strong>{formatCount(orders.total)}</strong><span>Total orders</span></div>
            <div><strong>{formatCount(orders.pending)}</strong><span>Pending</span></div>
            <div><strong>{formatCount(orders.shipped)}</strong><span>Shipped</span></div>
            <div><strong>{formatCount(orders.delivered)}</strong><span>Delivered</span></div>
          </div>
          {Number(orders.total) === 0 && !hasShopify && !hasWooCommerce && !storeConnections.loading && !storeConnections.error && <p className="merchant-dashboard-setup-note">Connect a store and sync orders in Integrations, or add an order manually.</p>}
        </section>
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
          <div className="merchant-dashboard-panel-header"><div><span className="merchant-dashboard-kicker">SUBSCRIPTION</span><h2>Kwickbot plan rate</h2></div></div>
          <div className="merchant-dashboard-cost-row"><span>Configured Kwickbot plan rate <small>Monthly equivalent</small></span><strong>{charges.configuredMonthlyRate == null ? 'Not set' : formatMoney(charges.configuredMonthlyRate, charges.currency)}</strong></div>
          <p className="merchant-dashboard-cost-note">This is your Kwickbot subscription rate. Meta messaging charges are separate and shown in the tracker below.</p>
          <Link to="/dashboard/billing" className="merchant-dashboard-text-link">View billing & plan <FaArrowRight /></Link>
        </section>
      </div>

      <MetaCostTracker />

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
    </div>
  );
}

export default Dashboard;
