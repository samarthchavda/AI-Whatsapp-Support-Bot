import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import Field from '../components/Field';
import SelectField from '../components/SelectField';
import StatCard from '../components/StatCard';
import api, { errorMessage, getStoredAdmin, getStoredToken } from '../lib/saApi';
import { formatDate, formatNumber } from '../lib/format';
import { LEGACY_DASHBOARD_URL } from '../lib/legacy';
import PageAccessCard from './merchant/PageAccessCard';
import FeatureSwitchesCard from './merchant/FeatureSwitchesCard';
import WhatsAppStoresCard from './merchant/WhatsAppStoresCard';

// Uses only endpoints the current super admin panel already calls:
// GET /super-admin/users/:id, PUT .../subscription, POST .../toggle-status,
// .../impersonate, .../revoke-sessions, .../reset-tokens, DELETE /users/:id
const STATUS_OPTIONS = ['trial', 'active', 'inactive', 'cancelled'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));
const titleCase = (v = '') => v.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function subscriptionForm(user) {
  return {
    subscriptionPlan: user?.subscriptionPlan || 'starter',
    subscriptionStatus: user?.subscriptionStatus || 'trial',
    monthlyPrice: user?.monthlyPrice ?? 0,
    customDiscount: user?.customDiscount ?? 0,
    geminiTokensLimit: user?.geminiTokensLimit ?? 50000
  };
}

// Same storage steps as the current panel's "Login as merchant", then the
// merchant dashboard opens as that merchant and shows its exit bar.
function startImpersonation(token, user) {
  const originalToken = getStoredToken();
  const originalAdmin = localStorage.getItem('admin');
  try {
    sessionStorage.setItem('originalToken', originalToken || '');
    if (originalAdmin) sessionStorage.setItem('originalAdmin', originalAdmin);
    sessionStorage.setItem('isImpersonated', 'true');
    sessionStorage.setItem('impersonatedUserEmail', user.email);
    sessionStorage.setItem('impersonatedUserName', user.name || '');
  } catch {
    // session storage unavailable
  }
  localStorage.setItem('token', token);
  localStorage.setItem('accessToken', token);
  localStorage.setItem('isImpersonated', 'true');
  localStorage.setItem('impersonatedUserEmail', user.email);
  localStorage.setItem('impersonatedUserName', user.name || '');
  localStorage.setItem('admin', JSON.stringify(user));
  window.location.assign(`${LEGACY_DASHBOARD_URL}/dashboard`);
}

const sameOriginAsMerchantDashboard = () => {
  if (!LEGACY_DASHBOARD_URL) return true;
  try {
    return new URL(LEGACY_DASHBOARD_URL).origin === window.location.origin;
  } catch {
    return false;
  }
};

export default function MerchantDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(subscriptionForm(null));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/super-admin/users/${userId}`);
      setData(res.data?.data || null);
      setForm(subscriptionForm(res.data?.data?.user));
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load this merchant.'));
    }
  }, [userId]);

  // Notices show as a toast and clear themselves
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), notice.tone === 'error' ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const patchUser = (patch) => setData((d) => (d ? { ...d, user: { ...d.user, ...patch } } : d));

  useEffect(() => {
    load();
    api.get('/auth/plans/public').then((res) => setPlans(res.data?.data || [])).catch(() => setPlans([]));
  }, [load]);

  const user = data?.user;
  const stats = data?.stats || {};
  const displayName = user?.businessName || user?.name || user?.email || 'Merchant';
  const me = getStoredAdmin();

  const planOptions = (() => {
    const options = plans.map((p) => ({ value: p.name, label: p.displayName || titleCase(p.name) }));
    if (user?.subscriptionPlan && !options.some((o) => o.value === user.subscriptionPlan)) {
      options.unshift({ value: user.subscriptionPlan, label: titleCase(user.subscriptionPlan) });
    }
    return options.length ? options : [{ value: form.subscriptionPlan, label: titleCase(form.subscriptionPlan) }];
  })();

  const done = (message) => setNotice({ tone: 'success', message });

  const saveSubscription = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api.put(`/super-admin/users/${userId}/subscription`, {
        ...form,
        monthlyPrice: Number(form.monthlyPrice) || 0,
        customDiscount: Number(form.customDiscount) || 0,
        geminiTokensLimit: Number(form.geminiTokensLimit)
      });
      await load();
      done('Plan and billing saved');
    } catch (err) {
      setNotice({ tone: 'error', message: errorMessage(err, 'Could not save the plan.') });
    } finally {
      setSaving(false);
    }
  };

  const dirty = user && JSON.stringify(subscriptionForm(user)) !== JSON.stringify({
    ...form,
    monthlyPrice: Number(form.monthlyPrice) || 0,
    customDiscount: Number(form.customDiscount) || 0,
    geminiTokensLimit: Number(form.geminiTokensLimit)
  });

  const actions = {
    impersonate: {
      title: `Log in as ${displayName}?`,
      body: 'You will see their dashboard exactly as they do. This is recorded in the audit log. Use the exit bar at the top of their dashboard to come back.',
      confirmLabel: 'Log in as merchant',
      run: async () => {
        const res = await api.post(`/super-admin/users/${userId}/impersonate`);
        const token = res.data?.data?.token;
        if (!token) throw new Error('The server did not return a session for this merchant.');
        startImpersonation(token, { ...user, ...(res.data?.data?.user || {}) });
      }
    },
    toggle: {
      title: user?.isActive === false ? `Activate ${displayName}?` : `Deactivate ${displayName}?`,
      body: user?.isActive === false
        ? 'They can log in and use the dashboard and API again.'
        : 'They are signed out everywhere and cannot log in or use the API until you activate them again.',
      confirmLabel: user?.isActive === false ? 'Activate' : 'Deactivate',
      danger: user?.isActive !== false,
      run: async () => {
        await api.post(`/super-admin/users/${userId}/toggle-status`);
        await load();
        done(user?.isActive === false ? 'Merchant activated' : 'Merchant deactivated');
      }
    },
    sessions: {
      title: 'Log out all sessions?',
      body: `${displayName} is signed out on every device and has to log in again.`,
      confirmLabel: 'Log out everywhere',
      run: async () => {
        await api.post(`/super-admin/users/${userId}/revoke-sessions`);
        done('All sessions logged out');
      }
    },
    tokens: {
      title: 'Reset AI token usage?',
      body: `This month's AI token count goes back to 0 (now ${formatNumber(user?.geminiTokensUsed || 0)}). AI replies resume if they were paused at the limit.`,
      confirmLabel: 'Reset usage',
      run: async () => {
        await api.post(`/super-admin/users/${userId}/reset-tokens`);
        await load();
        done('AI token usage reset');
      }
    },
    remove: {
      title: `Delete ${displayName}?`,
      body: 'The account is removed permanently and cannot be restored. Their conversations, orders and invoices stay in the database but nobody can log in to them.',
      confirmLabel: 'Delete merchant',
      danger: true,
      confirmText: user?.email,
      run: async () => {
        await api.delete(`/super-admin/users/${userId}`);
        navigate('/dashboard/super-admin', { replace: true, state: { notice: `${displayName} was deleted` } });
      }
    }
  };

  const openAction = (key) => {
    setNotice(null);
    if (key === 'impersonate' && !sameOriginAsMerchantDashboard()) {
      setNotice({ tone: 'error', message: 'Log in as merchant works when this panel runs on the same domain as the merchant dashboard. Use the current dashboard for now.' });
      return;
    }
    setDialog(key);
  };

  if (loadError && !user) {
    return (
      <>
        <Link to="/dashboard/super-admin" className="sa-back-link"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Merchants</Link>
        <div className="sa-alert sa-alert-error" role="alert"><CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" /><span>{loadError}</span></div>
      </>
    );
  }

  const active = dialog ? actions[dialog] : null;
  const isSelf = me?._id && user?._id && me._id === user._id;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/dashboard/super-admin" className="sa-back-link"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Merchants</Link>
        <Link to={`/dashboard/super-admin/classic/merchants/${userId}`} className="sa-back-link">Classic view</Link>
      </div>

      <div className="sa-page-head">
        <div>
          {user ? <h1 className="sa-page-title">{displayName}</h1> : <span className="sa-skeleton" style={{ display: 'block', width: 280, height: 32 }} />}
          {user && <p className="sa-page-sub">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>}
          {user && (
            <div className="sa-title-tags">
              <span className="sa-tag">{titleCase(user.subscriptionStatus || 'trial')}</span>
              {user.isActive === false && <span className="sa-tag" style={{ color: 'var(--sa-negative)' }}>Deactivated</span>}
              <span className="sa-tag">
                <span className={`sa-dot ${user.whatsappConnected ? 'sa-is-on' : ''}`} aria-hidden="true" style={{ marginRight: 8 }} />
                {user.whatsappConnected ? 'WhatsApp connected' : 'WhatsApp not connected'}
              </span>
            </div>
          )}
        </div>
        {user && !isSelf && (
          <Button variant="primary" onClick={() => openAction('impersonate')} disabled={user.isActive === false} title={user.isActive === false ? 'Activate the merchant first' : undefined}>
            Log in as merchant
          </Button>
        )}
      </div>

      {notice && (
        <div className={`sa-toast sa-alert sa-alert-${notice.tone}`} role="status">
          {notice.tone === 'error' && <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="sa-grid-stats">
        <StatCard label="Conversations" value={stats.totalConversations || 0} meta="All time" loading={!user} />
        <StatCard label="Orders" value={stats.totalOrders || 0} meta="Synced from their store" loading={!user} />
        <StatCard label="Broadcasts" value={stats.totalBroadcasts || 0} meta="Campaigns created" loading={!user} />
        <StatCard
          label="AI tokens this month"
          value={user?.geminiTokensUsed || 0}
          limit={user?.geminiTokensLimit}
          loading={!user}
        />
      </div>

      <div className="sa-grid-detail">
        <Card title="Plan and billing">
          <form onSubmit={saveSubscription}>
            <div className="sa-form-grid">
              <SelectField label="Plan" value={form.subscriptionPlan} options={planOptions} onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })} disabled={!user} />
              <SelectField
                label="Subscription status"
                value={form.subscriptionStatus}
                options={STATUS_OPTIONS}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                hint={form.subscriptionStatus === 'active' && user?.subscriptionStatus !== 'active' ? 'Saving as Active starts a 30-day period from today' : undefined}
                disabled={!user}
              />
              <Field label="Monthly price (₹)" type="number" min="0" inputMode="numeric" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} disabled={!user} />
              <Field label="Discount (%)" type="number" min="0" max="100" inputMode="numeric" value={form.customDiscount} onChange={(e) => setForm({ ...form, customDiscount: e.target.value })} disabled={!user} />
              <Field
                label="AI token limit / month"
                type="number"
                min="-1"
                inputMode="numeric"
                value={form.geminiTokensLimit}
                onChange={(e) => setForm({ ...form, geminiTokensLimit: e.target.value })}
                hint="-1 means no limit"
                disabled={!user}
              />
            </div>
            <div className="sa-card-actions">
              <Button variant="secondary" disabled={!dirty || saving} onClick={() => setForm(subscriptionForm(user))}>Discard</Button>
              <Button type="submit" variant="primary" disabled={!dirty || saving}>{saving ? 'Saving' : 'Save changes'}</Button>
            </div>
          </form>
        </Card>

        <div className="sa-stack">
          <Card title="Account">
            {user ? (
              <dl className="sa-kv">
                <dt>Owner</dt><dd>{user.name || '–'}</dd>
                <dt>Joined</dt><dd className="sa-num">{formatDate(user.createdAt) || '–'}</dd>
                <dt>Last login</dt><dd className="sa-num">{formatDate(user.lastLogin) || 'Never'}</dd>
                <dt>Period ends</dt>
                <dd className="sa-num">
                  {user.subscriptionEndDate ? `${formatDate(user.subscriptionEndDate)}${stats.daysUntilExpiry != null ? ` · ${stats.daysUntilExpiry} days` : ''}` : '–'}
                </dd>
                <dt>WhatsApp numbers</dt><dd className="sa-num">{formatNumber((user.whatsappConnections || []).filter((c) => c.isActive !== false).length)}</dd>
                <dt>Merchant ID</dt><dd className="sa-mono sa-muted" style={{ fontSize: 12 }}>{user._id}</dd>
              </dl>
            ) : (
              <span className="sa-skeleton" style={{ display: 'block', height: 120 }} />
            )}
          </Card>

          <Card title="Account actions">
            <div className="sa-rows-actions">
              <div className="sa-action-row">
                <div className="sa-action-text">
                  <div className="sa-action-title">{user?.isActive === false ? 'Activate account' : 'Deactivate account'}</div>
                  <div className="sa-action-desc">{user?.isActive === false ? 'Lets them log in and use the API again' : 'Blocks login and API access and signs them out'}</div>
                </div>
                <Button variant={user?.isActive === false ? 'secondary' : 'danger-quiet'} size="sm" onClick={() => openAction('toggle')} disabled={!user || isSelf}>
                  {user?.isActive === false ? 'Activate' : 'Deactivate'}
                </Button>
              </div>
              <div className="sa-action-row">
                <div className="sa-action-text">
                  <div className="sa-action-title">Log out all sessions</div>
                  <div className="sa-action-desc">Signs them out on every device</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openAction('sessions')} disabled={!user}>Log out</Button>
              </div>
              <div className="sa-action-row">
                <div className="sa-action-text">
                  <div className="sa-action-title">Reset AI token usage</div>
                  <div className="sa-action-desc">Sets this month's AI usage back to 0</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => openAction('tokens')} disabled={!user}>Reset</Button>
              </div>
              <div className="sa-action-row">
                <div className="sa-action-text">
                  <div className="sa-action-title">Delete merchant</div>
                  <div className="sa-action-desc">Removes the account permanently</div>
                </div>
                <Button variant="danger-quiet" size="sm" onClick={() => openAction('remove')} disabled={!user || isSelf}>Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="sa-grid-detail">
        <PageAccessCard userId={userId} onNotice={setNotice} />
        <div className="sa-stack">
          <FeatureSwitchesCard userId={userId} user={user} onUserChange={patchUser} onNotice={setNotice} />
          <WhatsAppStoresCard userId={userId} user={user} onReload={load} onNotice={setNotice} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(active)}
        title={active?.title}
        confirmLabel={active?.confirmLabel}
        danger={active?.danger}
        confirmText={active?.confirmText}
        onConfirm={active ? active.run : async () => {}}
        onClose={() => setDialog(null)}
      >
        {active?.body}
      </ConfirmDialog>
    </>
  );
}
