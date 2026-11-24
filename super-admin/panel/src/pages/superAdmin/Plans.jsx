import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveRestore, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { saApi, errorMessage } from '../../lib/api';
import { formatINR, formatNumber } from '../../lib/format';
import { CATEGORIES, categoryLabel } from '../../lib/planCatalog';

// Every plan, from the new super admin API (GET /plans with subscriber counts
// and readiness checks). Standard plans are archived instead of deleted.
export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [archived, setArchived] = useState(null); // null = not showing

  const load = useCallback(async () => {
    try {
      const res = await saApi.get('/plans');
      setPlans(res.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load plans.'));
      setPlans([]);
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

  const visible = useMemo(() => {
    const list = (plans || []).filter((p) => category === 'all' || p.category === category);
    return [...list].sort((a, b) => (a.category === b.category ? (a.displayOrder || 0) - (b.displayOrder || 0) : a.category.localeCompare(b.category)));
  }, [plans, category]);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      await load();
      setNotice({ tone: 'success', message });
    } catch (err) {
      setNotice({ tone: 'error', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const showArchived = async (on) => {
    if (!on) return setArchived(null);
    try {
      const res = await saApi.get('/plans/archived');
      setArchived(res.data?.data || []);
    } catch (err) {
      setNotice({ tone: 'error', message: errorMessage(err) });
    }
    return undefined;
  };

  const restore = (plan) => run(async () => {
    await saApi.post(`/plans/${plan._id}/restore`);
    setArchived((list) => (list || []).filter((p) => p._id !== plan._id));
  }, `${plan.displayName} restored as a draft`);

  const togglePublish = (plan) => run(
    () => saApi.patch(`/plans/${plan._id}/status`, { isPublished: !plan.isPublished }),
    plan.isPublished ? `${plan.displayName} is now hidden from the pricing page` : `${plan.displayName} is now on the pricing page`
  );

  const duplicate = (plan) => run(() => saApi.post(`/plans/${plan._id}/duplicate`), `Copy of ${plan.displayName} created as a draft`);

  // Swap display order with the neighbour in the same category
  const move = (plan, direction) => {
    const sameCategory = visible.filter((p) => p.category === plan.category);
    const index = sameCategory.findIndex((p) => p._id === plan._id);
    const other = sameCategory[index + direction];
    if (!other) return;
    const reordered = [...sameCategory];
    reordered[index] = other;
    reordered[index + direction] = plan;
    run(
      () => saApi.post('/plans/reorder', { planOrders: reordered.map((p, i) => ({ id: p._id, displayOrder: i + 1 })) }),
      'Order saved'
    );
  };

  const priceText = (p) => {
    if (p.contactSales || !p.monthlyPrice) return 'Contact sales';
    return `${formatINR(p.monthlyPrice)} / mo`;
  };

  const statusTag = (p) => {
    if (!p.isActive) return <span className="tag tag-bad">Inactive</span>;
    if (p.isPublished) return <span className="tag tag-good">Published</span>;
    return <span className="tag">Draft</span>;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Plans</h1>
          <p className="page-sub">Prices, pages, features and limits merchants get on each plan</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => navigate('/dashboard/super-admin/plans/new')}>
          New plan
        </Button>
      </div>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Card pad={false} className="table-card">
        <div className="table-toolbar">
          <div className="segmented" role="group" aria-label="Filter by type">
            {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
              <button key={c.value} type="button" className={category === c.value ? 'is-active' : ''} aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => showArchived(archived === null)}>
            {archived === null ? 'Show archived' : 'Back to plans'}
          </Button>
        </div>

        {archived !== null ? (
          archived.length === 0 ? (
            <EmptyState title="No archived plans">Standard plans you archive show up here and can be restored.</EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Archived plan</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="num-col">Price</th>
                    <th scope="col"><span className="sr-only">Restore</span></th>
                  </tr>
                </thead>
                <tbody>
                  {archived.map((p) => (
                    <tr key={p._id}>
                      <td><div className="cell-title">{p.displayName}</div><div className="cell-meta mono">{p.name}</div></td>
                      <td className="cell-meta-col">{categoryLabel(p.category)}</td>
                      <td className="num-col num">{priceText(p)}</td>
                      <td>
                        <Button variant="secondary" size="sm" icon={<ArchiveRestore size={16} strokeWidth={1.5} />} disabled={busy} onClick={() => restore(p)}>
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : plans === null ? (
          <div className="table-skeleton">
            {[0, 1, 2, 3].map((i) => <span key={i} className="skeleton" style={{ height: 16, width: `${80 - i * 10}%` }} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No plans here yet"
            action={<Button variant="secondary" onClick={() => navigate('/dashboard/super-admin/plans/new')}>Create a plan</Button>}
          >
            Plans you create appear here. Publish a plan to show it on the pricing page.
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num-col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num-col">Subscribers</th>
                  <th scope="col">Check</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const sameCategory = visible.filter((x) => x.category === p.category);
                  const index = sameCategory.findIndex((x) => x._id === p._id);
                  const issues = p.validation?.issues || [];
                  return (
                    <tr key={p._id} className="is-link" onClick={() => navigate(`/dashboard/super-admin/plans/${p._id}`)}>
                      <td>
                        <div className="cell-title">
                          {p.displayName}
                          {p.isPopular && <span className="tag" style={{ marginLeft: 8 }}>Popular</span>}
                        </div>
                        <div className="cell-meta mono">{p.name}</div>
                      </td>
                      <td className="cell-meta-col">{categoryLabel(p.category)}</td>
                      <td className="num-col num">
                        {priceText(p)}
                        {p.setupFee > 0 && <div className="cell-meta">+ {formatINR(p.setupFee)} setup</div>}
                      </td>
                      <td>{statusTag(p)}</td>
                      <td className="num-col num">{formatNumber(p.activeSubscribersCount || 0)}</td>
                      <td>
                        {p.validation?.status === 'Ready' || !issues.length ? (
                          <span className="tag tag-good">Ready</span>
                        ) : (
                          <span className={`tag ${p.validation?.status === 'Invalid' ? 'tag-bad' : 'tag-warn'}`} title={issues.join('\n')}>
                            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                          </span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="icon-actions">
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Move up" title="Move up" disabled={busy || index === 0} onClick={() => move(p, -1)}>
                            <ArrowUp size={16} strokeWidth={1.5} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Move down" title="Move down" disabled={busy || index === sameCategory.length - 1} onClick={() => move(p, 1)}>
                            <ArrowDown size={16} strokeWidth={1.5} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={p.isPublished ? 'Hide from pricing page' : 'Publish'} title={p.isPublished ? 'Hide from pricing page' : 'Publish'} disabled={busy} onClick={() => togglePublish(p)}>
                            {p.isPublished ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Duplicate" title="Duplicate as draft" disabled={busy} onClick={() => duplicate(p)}>
                            <Copy size={16} strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            aria-label="Delete"
                            title={p.activeSubscribersCount > 0 ? 'Has subscribers: hide it instead' : p.isStandard ? 'Archive' : 'Delete'}
                            disabled={busy || p.activeSubscribersCount > 0}
                            onClick={() => setConfirmDelete(p)}
                          >
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

      {notice && (
        <div className={`toast alert alert-${notice.tone}`} role="status"><span>{notice.message}</span></div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`${confirmDelete?.isStandard ? 'Archive' : 'Delete'} ${confirmDelete?.displayName}?`}
        confirmLabel={confirmDelete?.isStandard ? 'Archive plan' : 'Delete plan'}
        danger
        confirmText={confirmDelete?.name}
        onConfirm={async () => {
          const res = await saApi.delete(`/plans/${confirmDelete._id}`);
          await load();
          setNotice({ tone: 'success', message: res.data?.message || `${confirmDelete.displayName} deleted` });
        }}
        onClose={() => setConfirmDelete(null)}
      >
        {confirmDelete?.isStandard
          ? 'Standard plans are archived: hidden from the pricing page and checkout. You can restore it from Archived.'
          : 'The plan is removed for good. Merchants without an active subscription on it are not affected.'}
      </ConfirmDialog>
    </>
  );
}
