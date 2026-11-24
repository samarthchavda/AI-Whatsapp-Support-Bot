import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import Field from '../components/Field';
import LimitField from '../components/LimitField';
import SelectField from '../components/SelectField';
import Switch from '../components/Switch';
import TextArea from '../components/TextArea';
import api, { saApi, errorMessage } from '../lib/saApi';
import { formatINR } from '../lib/format';
import { CATEGORIES, FEATURE_GROUPS, LIMIT_GROUPS, emptyPlan, yearlySaving } from '../lib/planCatalog';

// Create or edit a plan through the new super admin API (POST /plans,
// PUT /plans/:id). The page list and permission profiles are read from the main backend.
const PAGE_GROUP_LABELS = {
  kwickbot_crm: 'E-commerce pages',
  crm_integration: 'CRM pages',
  whatsapp_api: 'WhatsApp API pages',
  account_shared: 'Account pages'
};

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

export default function PlanEditor() {
  const { planId } = useParams();
  const isNew = !planId;
  const navigate = useNavigate();
  const [plan, setPlan] = useState(isNew ? emptyPlan() : null);
  const [original, setOriginal] = useState(null);
  const [pageGroups, setPageGroups] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, profilesRes, plansRes] = await Promise.all([
          api.get('/super-admin/permission-profiles/metadata/canonical'),
          api.get('/super-admin/permission-profiles').catch(() => ({ data: { data: [] } })),
          isNew ? Promise.resolve(null) : saApi.get('/plans')
        ]);
        if (cancelled) return;
        setPageGroups(metaRes.data?.data?.pageGroups || {});
        setProfiles(profilesRes.data?.data || []);
        if (!isNew) {
          const found = (plansRes.data?.data || []).find((p) => p._id === planId);
          if (!found) throw new Error('This plan no longer exists.');
          const base = emptyPlan();
          const merged = {
            ...base,
            ...found,
            features: { ...base.features, ...(found.features || {}) },
            usageLimits: { ...base.usageLimits, ...(found.usageLimits || {}) },
            allowedPages: found.allowedPages || [],
            allowedBillingCycles: found.allowedBillingCycles || ['monthly', 'yearly'],
            badge: found.badge || ''
          };
          setPlan(merged);
          setOriginal(merged);
        }
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err, 'Could not load this plan.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, planId]);

  const set = (patch) => setPlan((p) => ({ ...p, ...patch }));
  const setFeature = (key, on) => setPlan((p) => ({ ...p, features: { ...p.features, [key]: on } }));
  const setLimit = (key, value) => setPlan((p) => ({ ...p, usageLimits: { ...p.usageLimits, [key]: value } }));

  const shownPageGroups = useMemo(() => {
    if (!plan) return [];
    const groups = [plan.category, 'account_shared']
      .filter((key, i, all) => pageGroups[key] && all.indexOf(key) === i)
      .map((key) => ({ key, label: PAGE_GROUP_LABELS[key] || key, pages: pageGroups[key] }));
    // Pages already on the plan that aren't in the standard list stay visible
    const known = new Set(groups.flatMap((g) => g.pages.map((p) => p.key)));
    const extra = (plan.allowedPages || []).filter((key) => !known.has(key));
    if (extra.length) {
      groups.push({ key: 'other', label: 'Other pages on this plan', pages: extra.map((key) => ({ key, label: key, description: '' })) });
    }
    return groups;
  }, [plan, pageGroups]);

  const togglePage = (key, on) => setPlan((p) => {
    const pages = new Set(p.allowedPages || []);
    if (on) pages.add(key);
    else pages.delete(key);
    return { ...p, allowedPages: [...pages] };
  });

  const toggleCycle = (cycle, on) => setPlan((p) => {
    const cycles = new Set(p.allowedBillingCycles || []);
    if (on) cycles.add(cycle);
    else cycles.delete(cycle);
    return { ...p, allowedBillingCycles: ['monthly', 'yearly'].filter((c) => cycles.has(c)) };
  });

  const dirty = isNew || (plan && original && JSON.stringify(plan) !== JSON.stringify(original));
  const subscribers = plan?.activeSubscribersCount || 0;

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const body = {
        ...plan,
        name: (plan.name || plan.displayName).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        monthlyPrice: num(plan.monthlyPrice),
        yearlyPrice: plan.yearlyPrice === '' || plan.yearlyPrice === null ? null : num(plan.yearlyPrice),
        setupFee: num(plan.setupFee),
        connectorMaintenanceFee: num(plan.connectorMaintenanceFee),
        trialDays: plan.trialEnabled ? num(plan.trialDays) : 0,
        badge: plan.badge?.trim() || null
      };
      // Fields the list adds or the database owns
      ['_id', '__v', 'createdAt', 'updatedAt', 'activeSubscribersCount', 'validation', 'managedBySuperAdmin', 'isStandard', 'archived'].forEach((k) => delete body[k]);
      if (isNew) delete body.slug;
      const res = isNew
        ? await saApi.post('/plans', body)
        : await saApi.put(`/plans/${planId}`, body);
      setWarnings(res.data?.warnings || []);
      const saved = res.data?.data;
      if (isNew && saved?._id) {
        navigate(`/dashboard/super-admin/plans/${saved._id}`, { replace: true });
        return;
      }
      const merged = { ...plan, ...saved, badge: saved?.badge || '' };
      setPlan(merged);
      setOriginal(merged);
      setNotice('Plan saved');
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setSaveError(errorMessage(err, 'Could not save the plan.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <>
        <Link to="/dashboard/super-admin/plans" className="sa-back-link"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Plans</Link>
        <div className="sa-alert sa-alert-error" role="alert"><CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" /><span>{loadError}</span></div>
      </>
    );
  }
  if (!plan) {
    return <span className="sa-skeleton" style={{ display: 'block', height: 400 }} />;
  }

  const saving_ = yearlySaving(num(plan.monthlyPrice), num(plan.yearlyPrice));
  const issues = plan.validation?.issues || [];

  return (
    <div className="sa-editor">
      <Link to="/dashboard/super-admin/plans" className="sa-back-link"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Plans</Link>
      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">{isNew ? 'New plan' : plan.displayName || 'Plan'}</h1>
          <p className="sa-page-sub">
            {isNew ? 'Saved as a draft until you publish it' : `${subscribers} active ${subscribers === 1 ? 'subscriber' : 'subscribers'}`}
          </p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="sa-alert" style={{ background: 'var(--sa-raised)', color: 'var(--sa-warning)' }}>
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>{warnings.join(' ')}</span>
        </div>
      )}

      {!isNew && issues.length > 0 && (
        <div className="sa-alert" style={{ background: 'var(--sa-raised)', color: 'var(--sa-text-2)' }}>
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <strong style={{ color: 'var(--sa-text)', fontWeight: 500 }}>Check before publishing</strong>
            <ul className="sa-issues">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </div>
      )}

      <Card title="Basics">
        <div className="sa-form-grid">
          <Field label="Plan name" value={plan.displayName} onChange={(e) => set({ displayName: e.target.value })} placeholder="Growth" />
          <Field
            label="Internal name"
            value={plan.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={(plan.displayName || '').toLowerCase().replace(/[^a-z0-9]+/g, '_')}
            hint={subscribers > 0 ? 'Locked: merchants are subscribed under this name' : 'Lowercase, used by the system. Leave empty to use the plan name'}
            disabled={subscribers > 0}
          />
          <SelectField label="Type" value={plan.category} options={CATEGORIES} onChange={(e) => set({ category: e.target.value })} />
          <Field label="Badge" value={plan.badge} onChange={(e) => set({ badge: e.target.value })} placeholder="Optional, e.g. Best value" />
          <div className="sa-span-all">
            <Field label="Short description" value={plan.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} placeholder="One line shown under the plan name" />
          </div>
          <div className="sa-span-all">
            <TextArea label="Long description" value={plan.detailedDescription} onChange={(e) => set({ detailedDescription: e.target.value })} />
          </div>
        </div>
        <div className="sa-setting-row" style={{ marginTop: 16 }}>
          <div>
            <div className="sa-setting-label">Most popular</div>
            <div className="sa-setting-desc">Highlights this plan on the pricing page</div>
          </div>
          <Switch checked={Boolean(plan.isPopular)} onChange={(on) => set({ isPopular: on })} label="Most popular" />
        </div>
      </Card>

      <Card title="Pricing">
        <div className="sa-setting-row">
          <div>
            <div className="sa-setting-label">Contact sales</div>
            <div className="sa-setting-desc">No online checkout. The pricing page shows "Talk to sales" instead of a price</div>
          </div>
          <Switch checked={Boolean(plan.contactSales)} onChange={(on) => set({ contactSales: on })} label="Contact sales" />
        </div>
        <div className="sa-form-grid-3" style={{ marginTop: 16 }}>
          <Field label="Monthly price (₹)" type="number" min="0" value={plan.monthlyPrice} onChange={(e) => set({ monthlyPrice: e.target.value })} disabled={plan.contactSales} />
          <Field
            label="Yearly price (₹)"
            type="number"
            min="0"
            value={plan.yearlyPrice ?? ''}
            onChange={(e) => set({ yearlyPrice: e.target.value })}
            placeholder="Optional"
            hint={saving_ > 0 ? `${saving_}% less than paying monthly` : num(plan.yearlyPrice) > 0 && num(plan.monthlyPrice) > 0 ? 'Not cheaper than 12 months' : undefined}
            disabled={plan.contactSales}
          />
          <Field label="One-time setup fee (₹)" type="number" min="0" value={plan.setupFee} onChange={(e) => set({ setupFee: e.target.value })} />
          <Field label="Connector fee (₹ / month)" type="number" min="0" value={plan.connectorMaintenanceFee} onChange={(e) => set({ connectorMaintenanceFee: e.target.value })} hint="Shown on the pricing page, not charged at checkout" />
        </div>
        <div className="sa-setting-group" style={{ marginTop: 16 }}>
          <div className="sa-setting-group-label">Billing options</div>
          <div className="sa-check-grid">
            <Checkbox label="Monthly" checked={plan.allowedBillingCycles.includes('monthly')} onChange={(on) => toggleCycle('monthly', on)} />
            <Checkbox label="Yearly" checked={plan.allowedBillingCycles.includes('yearly')} onChange={(on) => toggleCycle('yearly', on)} />
          </div>
        </div>
        <div className="sa-setting-row" style={{ marginTop: 8 }}>
          <div>
            <div className="sa-setting-label">Free trial</div>
            <div className="sa-setting-desc">{plan.trialEnabled ? `${num(plan.trialDays)} days free before the first payment` : 'No trial'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {plan.trialEnabled && (
              <input className="sa-input" style={{ width: 88 }} type="number" min="1" aria-label="Trial days" value={plan.trialDays} onChange={(e) => set({ trialDays: e.target.value })} />
            )}
            <Switch checked={Boolean(plan.trialEnabled)} onChange={(on) => set({ trialEnabled: on, trialDays: on ? num(plan.trialDays) || 14 : 0 })} label="Free trial" />
          </div>
        </div>
        {!plan.contactSales && num(plan.monthlyPrice) > 0 && (
          <p className="sa-field-hint" style={{ marginTop: 12 }}>
            Checkout: {formatINR(num(plan.monthlyPrice))} / month{num(plan.yearlyPrice) > 0 ? ` or ${formatINR(num(plan.yearlyPrice))} / year` : ''}
            {num(plan.setupFee) > 0 ? `, plus ${formatINR(num(plan.setupFee))} once` : ''}. Coupons and offers come off the plan price, not the setup fee.
          </p>
        )}
      </Card>

      <Card title="Pages merchants can open">
        <p className="sa-card-sub">
          {plan.allowedPages.length
            ? `${plan.allowedPages.length} pages selected. Merchants on this plan see exactly these pages.`
            : 'No pages selected: merchants get the pages of the permission profile below.'}
        </p>
        {shownPageGroups.map((group) => (
          <div className="sa-setting-group" key={group.key}>
            <div className="sa-setting-group-label">{group.label}</div>
            <div className="sa-check-grid">
              {group.pages.map((page) => (
                <Checkbox
                  key={page.key}
                  label={page.label}
                  desc={page.description}
                  checked={plan.allowedPages.includes(page.key)}
                  onChange={(on) => togglePage(page.key, on)}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="sa-form-grid" style={{ marginTop: 16 }}>
          <SelectField
            label="Permission profile"
            value={plan.permissionProfile || 'default'}
            onChange={(e) => set({ permissionProfile: e.target.value })}
            options={[
              { value: 'default', label: 'Default' },
              ...profiles.map((p) => ({ value: p.key, label: p.name }))
            ].filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i)}
            hint="Used for anything the page list above doesn't decide"
          />
        </div>
      </Card>

      <Card title="Features">
        {FEATURE_GROUPS.map((group) => (
          <div className="sa-setting-group" key={group.label}>
            <div className="sa-setting-group-label">{group.label}</div>
            <div className="sa-check-grid">
              {group.items.map(([key, label]) => (
                <Checkbox key={key} label={label} checked={Boolean(plan.features[key])} onChange={(on) => setFeature(key, on)} />
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Limits">
        <p className="sa-card-sub">Per merchant. Tick Unlimited for no limit.</p>
        {LIMIT_GROUPS.map((group) => (
          <div className="sa-setting-group" key={group.label}>
            <div className="sa-setting-group-label">{group.label}</div>
            <div className="sa-form-grid">
              {group.items.map(([key, label, hint]) => (
                <LimitField key={key} label={label} hint={hint} value={plan.usageLimits[key]} onChange={(v) => setLimit(key, v)} />
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Support">
        <div className="sa-form-grid">
          <Field label="Support level" value={plan.supportLevel} onChange={(e) => set({ supportLevel: e.target.value })} />
          <Field label="Response time (SLA)" value={plan.sla} onChange={(e) => set({ sla: e.target.value })} />
        </div>
      </Card>

      <Card title="Visibility">
        <div className="sa-setting-row">
          <div>
            <div className="sa-setting-label">Published</div>
            <div className="sa-setting-desc">Shown on the pricing page and available at checkout</div>
          </div>
          <Switch checked={Boolean(plan.isPublished)} onChange={(on) => set({ isPublished: on })} label="Published" />
        </div>
        <div className="sa-setting-row">
          <div>
            <div className="sa-setting-label">Active</div>
            <div className="sa-setting-desc">Off stops new purchases; current subscribers keep their plan</div>
          </div>
          <Switch checked={Boolean(plan.isActive)} onChange={(on) => set({ isActive: on })} label="Active" />
        </div>
      </Card>

      <div className="sa-save-bar">
        <span className="sa-save-bar-note">
          {saveError ? <span style={{ color: 'var(--sa-negative)' }}>{saveError}</span> : notice || (dirty ? 'Unsaved changes' : 'All changes saved')}
        </span>
        <Button variant="secondary" onClick={() => (isNew ? navigate('/dashboard/super-admin/plans') : setPlan(original))} disabled={saving || (!isNew && !dirty)}>
          {isNew ? 'Cancel' : 'Discard'}
        </Button>
        <Button variant="primary" onClick={save} disabled={saving || !dirty || !plan.displayName?.trim()}>
          {saving ? 'Saving' : isNew ? 'Create plan' : 'Save plan'}
        </Button>
      </div>
    </div>
  );
}
