import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Switch from '../../components/ui/Switch';
import { saApi, errorMessage } from '../../lib/api';
import { formatDate, formatINR, formatNumber } from '../../lib/format';
import CouponForm from './CouponForm';

// Coupons (codes merchants type) and offers (automatic discounts).
// Data from the new super admin API: GET /coupons and GET /plans.
const TABS = [
  { value: 'coupon', label: 'Coupons' },
  { value: 'offer', label: 'Offers' }
];

function statusOf(c, now = new Date()) {
  if (!c.isActive) return { label: 'Off', tone: '' };
  if (c.startsAt && new Date(c.startsAt) > now) return { label: 'Scheduled', tone: '' };
  if (c.expiresAt && new Date(c.expiresAt) < now) return { label: 'Ended', tone: 'tag-bad' };
  if (c.maxRedemptions && (c.redemptionCount || 0) >= c.maxRedemptions) return { label: 'Used up', tone: 'tag-warn' };
  return { label: 'Running', tone: 'tag-good' };
}

export default function Coupons() {
  const [tab, setTab] = useState('coupon');
  const [items, setItems] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { existing }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [couponsRes, plansRes] = await Promise.all([saApi.get('/coupons'), saApi.get('/plans')]);
      setItems(couponsRes.data?.data || []);
      setPlans(plansRes.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load coupons.'));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), notice.tone === 'error' ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const planName = (name) => plans.find((p) => p.name === name)?.displayName || name;
  const visible = useMemo(() => (items || []).filter((c) => (c.kind || 'coupon') === tab), [items, tab]);
  const counts = useMemo(() => ({
    coupon: (items || []).filter((c) => (c.kind || 'coupon') === 'coupon').length,
    offer: (items || []).filter((c) => c.kind === 'offer').length
  }), [items]);

  const toggle = async (c) => {
    setBusyId(c._id);
    try {
      await saApi.post(`/coupons/${c._id}/toggle`);
      await load();
      setNotice({ tone: 'success', message: `${c.name || c.code} turned ${c.isActive ? 'off' : 'on'}` });
    } catch (err) {
      setNotice({ tone: 'error', message: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const discountText = (c) => (c.discountType === 'fixed' ? `${formatINR(c.amountOff)} off` : `${c.discountPercent}% off`);
  const appliesText = (c) => {
    const planPart = c.appliesToPlans?.length ? c.appliesToPlans.map(planName).join(', ') : 'All plans';
    const cyclePart = c.billingCycles?.length === 1 ? ` · ${c.billingCycles[0]} only` : '';
    return planPart + cyclePart;
  };
  const whenText = (c) => {
    if (!c.startsAt && !c.expiresAt) return 'No end date';
    if (c.startsAt && c.expiresAt) return `${formatDate(c.startsAt)} – ${formatDate(c.expiresAt)}`;
    return c.expiresAt ? `Until ${formatDate(c.expiresAt)}` : `From ${formatDate(c.startsAt)}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Coupons and offers</h1>
          <p className="page-sub">Coupons need a code. Offers apply on their own. Merchants always get the single biggest discount.</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setForm({ existing: null })}>
          {tab === 'offer' ? 'New offer' : 'New coupon'}
        </Button>
      </div>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Card pad={false} className="table-card">
        <div className="table-toolbar">
          <div className="segmented" role="group" aria-label="Coupons or offers">
            {TABS.map((t) => (
              <button key={t.value} type="button" className={tab === t.value ? 'is-active' : ''} aria-pressed={tab === t.value} onClick={() => setTab(t.value)}>
                {t.label} <span className="muted num" style={{ marginLeft: 4 }}>{counts[t.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {items === null ? (
          <div className="table-skeleton">
            {[0, 1, 2].map((i) => <span key={i} className="skeleton" style={{ height: 16, width: `${75 - i * 10}%` }} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={tab === 'offer' ? 'No offers yet' : 'No coupons yet'}
            action={<Button variant="secondary" onClick={() => setForm({ existing: null })}>{tab === 'offer' ? 'Create an offer' : 'Create a coupon'}</Button>}
          >
            {tab === 'offer'
              ? 'An offer discounts chosen plans automatically for a period, like a festival sale.'
              : 'A coupon gives a discount to merchants who type its code at checkout.'}
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{tab === 'offer' ? 'Offer' : 'Code'}</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Applies to</th>
                  <th scope="col">When</th>
                  <th scope="col" className="num-col">Uses</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const status = statusOf(c);
                  return (
                    <tr key={c._id} className="is-link" onClick={() => setForm({ existing: c })}>
                      <td>
                        <div className={`cell-title ${tab === 'coupon' ? 'mono' : ''}`}>{tab === 'coupon' ? c.code : c.name || 'Offer'}</div>
                        {(tab === 'coupon' ? c.name : c.description) && <div className="cell-meta">{tab === 'coupon' ? c.name : c.description}</div>}
                        {c.firstPurchaseOnly && <div className="cell-meta">New customers only</div>}
                        {c.showOnWebsite && <div className="cell-meta" style={{ color: 'var(--accent-ink)' }}>On website banner</div>}
                      </td>
                      <td className="num">{discountText(c)}</td>
                      <td><div className="cell-meta-col" style={{ maxWidth: 240, whiteSpace: 'normal' }}>{appliesText(c)}</div></td>
                      <td className="cell-meta-col num">{whenText(c)}</td>
                      <td className="num-col num">
                        {formatNumber(c.redemptionCount || 0)}{c.maxRedemptions ? ` / ${formatNumber(c.maxRedemptions)}` : ''}
                      </td>
                      <td><span className={`tag ${status.tone}`}>{status.label}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="icon-actions">
                          <Switch checked={Boolean(c.isActive)} onChange={() => toggle(c)} disabled={busyId === c._id} label={`${c.name || c.code} on or off`} />
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Edit" title="Edit" onClick={() => setForm({ existing: c })}>
                            <Pencil size={16} strokeWidth={1.5} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Delete" title="Delete" onClick={() => setConfirmDelete(c)}>
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CouponForm
        open={Boolean(form)}
        kind={form?.existing?.kind || tab}
        existing={form?.existing || null}
        plans={plans}
        onSaved={(message) => { setNotice({ tone: 'success', message }); load(); }}
        onClose={() => setForm(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete ${confirmDelete?.name || confirmDelete?.code}?`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await saApi.delete(`/coupons/${confirmDelete._id}`);
          await load();
          setNotice({ tone: 'success', message: 'Deleted' });
        }}
        onClose={() => setConfirmDelete(null)}
      >
        {confirmDelete?.redemptionCount
          ? `It was used ${confirmDelete.redemptionCount} times. Past invoices keep showing it. To stop new uses but keep the record, turn it off instead.`
          : 'It stops working right away.'}
      </ConfirmDialog>

      {notice && <div className={`toast alert alert-${notice.tone}`} role="status"><span>{notice.message}</span></div>}
    </>
  );
}
