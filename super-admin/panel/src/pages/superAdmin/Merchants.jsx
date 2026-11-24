import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import api, { errorMessage } from '../../lib/api';
import { formatDate, formatINR, formatNumber } from '../../lib/format';
import { LEGACY_DASHBOARD_URL } from '../../lib/navigation';

// Reads the same endpoints as the current super admin dashboard:
// /super-admin/analytics and /super-admin/users. Plan names come from the
// public plans list, which has no side effects.
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trial', label: 'Trial' },
  { id: 'inactive', label: 'Inactive' }
];

const titleCase = (value = '') => value.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function Merchants() {
  const navigate = useNavigate();
  const location = useLocation();
  // A one-time notice (like "X was deleted"), cleared from history so a refresh doesn't repeat it
  const [notice] = useState(location.state?.notice || null);
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState(null);
  const [planNames, setPlanNames] = useState({});
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.get('/super-admin/analytics'), api.get('/super-admin/users'), api.get('/auth/plans/public')])
      .then(([analyticsRes, usersRes, plansRes]) => {
        if (cancelled) return;
        if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data?.data || null);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data?.data || []);
        else {
          setUsers([]);
          setError(errorMessage(usersRes.reason, 'Could not load merchants. Refresh the page.'));
        }
        if (plansRes.status === 'fulfilled') {
          const names = {};
          (plansRes.value.data?.data || []).forEach((plan) => { names[plan.name] = plan.displayName; });
          setPlanNames(names);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const merchants = useMemo(() => (users || []).filter((u) => u.role !== 'super_admin'), [users]);

  const byPlan = useMemo(() => {
    const counts = {};
    merchants.forEach((m) => {
      const key = m.subscriptionPlan || 'none';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [merchants]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merchants.filter((m) => {
      const status = m.subscriptionStatus || 'trial';
      const statusOk = statusFilter === 'all'
        || (statusFilter === 'inactive' ? ['inactive', 'cancelled', 'expired', 'suspended'].includes(status) : status === statusFilter);
      if (!statusOk) return false;
      if (!q) return true;
      return [m.businessName, m.name, m.email, m.phone].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [merchants, query, statusFilter]);

  const loading = users === null;
  const statsLoading = analytics === null && !error && loading;
  const planLabel = (name) => planNames[name] || (name === 'none' ? 'No plan' : titleCase(name));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Merchants</h1>
          <p className="page-sub">Every store on Kwickbot, its plan and its WhatsApp status</p>
        </div>
        <a className="btn btn-primary" href={`${LEGACY_DASHBOARD_URL}/dashboard/super-admin/customers/onboard`}>
          Onboard merchant
        </a>
      </div>

      {notice && <div className="alert alert-success" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-stats">
        <StatCard
          label="Merchants"
          value={analytics?.totalUsers ?? merchants.length}
          meta={analytics ? `${formatNumber(analytics.recentSignups)} joined in the last 7 days` : undefined}
          loading={statsLoading}
          unavailable={!analytics && !loading && Boolean(error)}
        />
        <StatCard
          label="Revenue collected"
          display={analytics ? formatINR(Math.round(Number(analytics.totalRevenue) || 0)) : undefined}
          meta="Paid invoices, all time"
          loading={statsLoading}
          unavailable={!analytics && !statsLoading}
        />
        <StatCard
          label="WhatsApp connected"
          value={analytics?.totalActiveBots ?? merchants.filter((m) => m.whatsappConnected).length}
          meta={`of ${formatNumber(analytics?.totalUsers ?? merchants.length)} merchants`}
          loading={statsLoading}
          unavailable={!analytics && !loading && Boolean(error)}
        />
        <StatCard
          label="Messages processed"
          value={analytics?.totalMessagesProcessed ?? 0}
          meta="Across all merchants"
          loading={statsLoading}
          unavailable={!analytics && !statsLoading}
        />
      </div>

      <div className="grid-split grid-split-wide">
        <Card pad={false} className="table-card">
          <div className="table-toolbar">
            <div className="search">
              <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              <input
                className="input"
                type="search"
                placeholder="Search"
                aria-label="Search merchants by name, email or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="segmented" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={statusFilter === f.id ? 'is-active' : ''}
                  aria-pressed={statusFilter === f.id}
                  onClick={() => setStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="table-skeleton">
              {[0, 1, 2, 3, 4].map((i) => <span key={i} className="skeleton" style={{ height: 16, width: `${80 - i * 8}%` }} />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState title={merchants.length ? 'No merchants match' : 'No merchants yet'}>
              {merchants.length ? 'Try another name or status.' : 'Merchants appear here once they sign up or are onboarded.'}
            </EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Merchant</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Status</th>
                    <th scope="col">WhatsApp</th>
                    <th scope="col" className="num-col">Conversations</th>
                    <th scope="col" className="num-col">Paid</th>
                    <th scope="col">Joined</th>
                    <th scope="col"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => (
                    <tr key={m._id} className="is-link" onClick={() => navigate(`/dashboard/super-admin/merchants/${m._id}`)}>
                      <td>
                        <div className="cell-title">{m.businessName || m.name || 'Unnamed store'}</div>
                        <div className="cell-meta">{m.email}</div>
                      </td>
                      <td>{planLabel(m.subscriptionPlan || 'none')}</td>
                      <td><span className="tag">{titleCase(m.subscriptionStatus || 'trial')}</span></td>
                      <td>
                        <span className="cell-status">
                          <span className={`dot ${m.whatsappConnected ? 'is-on' : ''}`} aria-hidden="true" />
                          {m.whatsappConnected ? 'Connected' : 'Not connected'}
                        </span>
                      </td>
                      <td className="num-col num">{formatNumber(m.monthlyConversationsCount || 0)}</td>
                      <td className="num-col num">{formatINR(Math.round(m.actualRevenue || 0))}</td>
                      <td className="cell-meta-col">{formatDate(m.createdAt)}</td>
                      <td>
                        <Link
                          className="btn btn-ghost btn-icon btn-sm"
                          to={`/dashboard/super-admin/merchants/${m._id}`}
                          aria-label={`Open ${m.businessName || m.name || m.email}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && visible.length > 0 && (
            <div className="table-foot">{formatNumber(visible.length)} of {formatNumber(merchants.length)} merchants</div>
          )}
        </Card>

        <Card title="Merchants by plan">
          {loading ? (
            <span className="skeleton" style={{ display: 'block', width: '70%', height: 16 }} />
          ) : byPlan.length === 0 ? (
            <p className="secondary">No merchants yet</p>
          ) : (
            <ul className="bars">
              {byPlan.map(([plan, count], index) => (
                <li key={plan}>
                  <div className="bars-row">
                    <span>{planLabel(plan)}</span>
                    <span className="num secondary">{formatNumber(count)}</span>
                  </div>
                  <div className={`bar ${index === 0 ? 'is-lead' : ''}`}>
                    <span style={{ width: `${Math.max(4, Math.round((count / merchants.length) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
