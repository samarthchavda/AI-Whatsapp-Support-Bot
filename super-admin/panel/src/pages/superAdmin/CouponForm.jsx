import { useEffect, useRef, useState } from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';
import Checkbox from '../../components/ui/Checkbox';
import Field from '../../components/ui/Field';
import TextArea from '../../components/ui/TextArea';
import Switch from '../../components/ui/Switch';
import { saApi, errorMessage } from '../../lib/api';
import { categoryLabel } from '../../lib/planCatalog';

// Create or edit a coupon (code merchants type) or an offer (automatic).
// Saves to the new super admin API: POST /coupons or PUT /coupons/:id.
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const randomCode = () => `KB${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function initialForm(kind, existing) {
  return {
    code: existing?.code || (kind === 'coupon' ? randomCode() : ''),
    name: existing?.name || '',
    description: existing?.description || '',
    discountType: existing?.discountType || 'percent',
    discountPercent: existing?.discountPercent ?? 10,
    amountOff: existing?.amountOff ?? 500,
    appliesToPlans: existing?.appliesToPlans || [],
    billingCycles: existing?.billingCycles || [],
    startsAt: toDateInput(existing?.startsAt),
    expiresAt: toDateInput(existing?.expiresAt),
    maxRedemptions: existing?.maxRedemptions ?? '',
    perMerchantLimit: existing?.perMerchantLimit ?? (kind === 'coupon' && !existing ? 1 : ''),
    firstPurchaseOnly: Boolean(existing?.firstPurchaseOnly),
    showOnWebsite: Boolean(existing?.showOnWebsite),
    bannerText: existing?.bannerText || ''
  };
}

export default function CouponForm({ open, kind, existing, plans, onSaved, onClose }) {
  const ref = useRef(null);
  const [form, setForm] = useState(() => initialForm(kind, existing));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setForm(initialForm(kind, existing));
      setError('');
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, kind, existing]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isOffer = kind === 'offer';
  const used = (existing?.redemptionCount || 0) > 0;

  const togglePlan = (name, on) => set({
    appliesToPlans: on ? [...form.appliesToPlans, name] : form.appliesToPlans.filter((p) => p !== name)
  });
  const toggleCycle = (cycle, on) => set({
    billingCycles: on ? [...form.billingCycles, cycle] : form.billingCycles.filter((c) => c !== cycle)
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        kind,
        code: isOffer ? undefined : form.code,
        name: form.name,
        description: form.description,
        discountType: form.discountType,
        discountPercent: form.discountType === 'percent' ? Number(form.discountPercent) : undefined,
        amountOff: form.discountType === 'fixed' ? Number(form.amountOff) : undefined,
        appliesToPlans: form.appliesToPlans,
        billingCycles: form.billingCycles.length === 2 ? [] : form.billingCycles,
        // Start of the start day, end of the end day (local time)
        startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        perMerchantLimit: form.perMerchantLimit === '' ? null : Number(form.perMerchantLimit),
        firstPurchaseOnly: form.firstPurchaseOnly,
        showOnWebsite: form.showOnWebsite,
        bannerText: form.bannerText
      };
      const res = existing
        ? await saApi.put(`/coupons/${existing._id}`, body)
        : await saApi.post('/coupons', body);
      onSaved(res.data?.message || 'Saved');
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const sellablePlans = (plans || []).filter((p) => !p.contactSales && p.monthlyPrice > 0);
  const noun = isOffer ? 'offer' : 'coupon';

  // Same wording the API builds for the website banner
  const off = form.discountType === 'fixed'
    ? `₹${Number(form.amountOff || 0).toLocaleString('en-IN')} off`
    : `${Number(form.discountPercent || 0)}% off`;
  const planPart = form.appliesToPlans.length
    ? ` ${form.appliesToPlans.map((n) => (plans || []).find((p) => p.name === n)?.displayName || n).join(', ')}`
    : ' any plan';
  const cyclePart = form.billingCycles.length === 1 ? ` (${form.billingCycles[0]} billing)` : '';
  const bannerPreview = isOffer
    ? `${form.name || 'Offer'}: ${off}${planPart}${cyclePart}, no code needed`
    : `Use code ${form.code || 'CODE'} to get ${off}${planPart}${cyclePart}`;

  return (
    <dialog ref={ref} className="dialog dialog-wide" onClose={onClose} onCancel={(e) => { if (saving) e.preventDefault(); }}>
      <form className="dialog-body" onSubmit={submit}>
        <h2 className="dialog-title">{existing ? `Edit ${noun}` : `New ${noun}`}</h2>
        <p className="dialog-text">
          {isOffer
            ? 'Applied automatically at checkout to the plans you pick, while it runs. No code needed.'
            : 'Merchants type this code at checkout. If an offer or their own discount is bigger, that one is used instead.'}
        </p>

        <div className="form-grid">
          {!isOffer && (
            <Field
              label="Code"
              value={form.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
              disabled={used}
              hint={used ? 'Already used, so the code is locked' : '3 to 30 letters or numbers'}
              addon={!used && (
                <button type="button" className="field-addon" onClick={() => set({ code: randomCode() })} aria-label="Generate a code" title="Generate a code">
                  <RefreshCw size={16} strokeWidth={1.5} />
                </button>
              )}
            />
          )}
          <Field
            label={isOffer ? 'Offer name' : 'Name (optional)'}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={isOffer ? 'Diwali offer' : 'For your notes'}
            hint={isOffer ? 'Shown to merchants at checkout and on the invoice' : undefined}
          />
        </div>

        <div className="setting-group">
          <div className="setting-group-label">Discount</div>
          <div className="form-grid">
            <div className="field">
              <span className="field-label">Type</span>
              <div className="segmented" role="group" aria-label="Discount type">
                <button type="button" className={form.discountType === 'percent' ? 'is-active' : ''} aria-pressed={form.discountType === 'percent'} onClick={() => set({ discountType: 'percent' })}>Percent</button>
                <button type="button" className={form.discountType === 'fixed' ? 'is-active' : ''} aria-pressed={form.discountType === 'fixed'} onClick={() => set({ discountType: 'fixed' })}>Fixed amount</button>
              </div>
            </div>
            {form.discountType === 'percent' ? (
              <Field label="Percent off" type="number" min="1" max="100" value={form.discountPercent} onChange={(e) => set({ discountPercent: e.target.value })} />
            ) : (
              <Field label="Amount off (₹)" type="number" min="1" value={form.amountOff} onChange={(e) => set({ amountOff: e.target.value })} hint="Never more than the plan price" />
            )}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-group-label">Plans {form.appliesToPlans.length ? `(${form.appliesToPlans.length} selected)` : '(none selected means every plan)'}</div>
          <div className="check-grid">
            {sellablePlans.map((p) => (
              <Checkbox
                key={p.name}
                label={p.displayName}
                desc={categoryLabel(p.category)}
                checked={form.appliesToPlans.includes(p.name)}
                onChange={(on) => togglePlan(p.name, on)}
              />
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-group-label">Billing {form.billingCycles.length === 1 ? '' : '(both when none or both are ticked)'}</div>
          <div className="check-grid">
            <Checkbox label="Monthly" checked={form.billingCycles.includes('monthly')} onChange={(on) => toggleCycle('monthly', on)} />
            <Checkbox label="Yearly" checked={form.billingCycles.includes('yearly')} onChange={(on) => toggleCycle('yearly', on)} />
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-group-label">When</div>
          <div className="form-grid">
            <Field label="Starts" type="date" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} hint="Empty means right away" />
            <Field label="Ends" type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} hint="Empty means no end date" />
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-group-label">Limits</div>
          <div className="form-grid">
            <Field label="Total uses" type="number" min="1" value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} placeholder="No limit" hint={existing ? `Used ${existing.redemptionCount || 0} times so far` : undefined} />
            <Field label="Uses per merchant" type="number" min="1" value={form.perMerchantLimit} onChange={(e) => set({ perMerchantLimit: e.target.value })} placeholder="No limit" />
          </div>
          <Checkbox
            label="New customers only"
            desc="Only for merchants who have never paid before"
            checked={form.firstPurchaseOnly}
            onChange={(on) => set({ firstPurchaseOnly: on })}
          />
        </div>

        <div className="setting-group">
          <div className="setting-group-label">Website</div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Show on website</div>
              <div className="setting-desc">
                {form.showOnWebsite
                  ? 'Shown in the scrolling banner at the top of kwickbot.in while it runs'
                  : `Not shown anywhere. The ${noun} still works at checkout`}
              </div>
            </div>
            <Switch checked={form.showOnWebsite} onChange={(on) => set({ showOnWebsite: on })} label="Show on website" />
          </div>
          {form.showOnWebsite && (
            <>
              <Field
                label="Banner text (optional)"
                value={form.bannerText}
                onChange={(e) => set({ bannerText: e.target.value })}
                placeholder={bannerPreview}
                hint="Leave empty to use the text below"
              />
              <div className="banner-preview" aria-label="Banner preview">{form.bannerText.trim() || bannerPreview}</div>
            </>
          )}
        </div>

        <TextArea label="Internal note (optional)" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />

        {error && (
          <div className="alert alert-error" role="alert">
            <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving' : existing ? 'Save' : `Create ${noun}`}</Button>
        </div>
      </form>
    </dialog>
  );
}
