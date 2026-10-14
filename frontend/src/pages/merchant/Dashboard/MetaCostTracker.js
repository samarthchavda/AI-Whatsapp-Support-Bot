import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBullhorn,
  FaCreditCard,
  FaExternalLinkAlt,
  FaHeadset,
  FaInfoCircle,
  FaRegClock,
  FaShippingFast,
  FaSyncAlt
} from 'react-icons/fa';
import { getWhatsAppCostAnalytics } from '../../../services/api';
import './MetaCostTracker.css';

const periods = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' }
];

const money = (value, currency = 'INR') => {
  const curr = currency || 'INR';
  const num = value != null ? Number(value) : 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (_) {
    return `₹${num.toFixed(2)}`;
  }
};

const count = (value) => Number(value || 0).toLocaleString('en-IN');

function MetaCostTracker() {
  const [period, setPeriod] = useState('this_month');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      if (typeof getWhatsAppCostAnalytics === 'function') {
        const response = await getWhatsAppCostAnalytics(period);
        if (requestId.current === currentRequest) {
          setAnalytics(response.data?.data || null);
        }
      } else {
        if (requestId.current === currentRequest) {
          setAnalytics({
            period,
            currency: 'INR',
            source: 'rate_card_estimate',
            totalEstimatedCost: 0,
            categories: {
              marketing: { count: 0, cost: 0 },
              utility: { count: 0, cost: 0 },
              service: { count: 0, totalCount: 0, cost: 0 },
              authentication: { count: 0, cost: 0 }
            },
            dailyBreakdown: [],
            freeTier: { used: 0, limit: 1000 }
          });
        }
      }
    } catch (_) {
      if (requestId.current === currentRequest) {
        setError('Meta analytics could not be loaded. Please retry.');
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  const source = analytics?.source;
  const categories = analytics?.categories || {};
  const freeTier = analytics?.freeTier;
  const progress = freeTier?.used != null && freeTier?.limit ? Math.min(100, Math.round((freeTier.used / freeTier.limit) * 100)) : 0;
  const periodLabel = periods.find((item) => item.value === period)?.label || 'This month';
  const metaBillingUrl = analytics?.metaBillingUrl || (analytics?.wabaId
    ? `https://business.facebook.com/latest/billing_hub/accounts/?asset_id=${analytics.wabaId}`
    : 'https://business.facebook.com/latest/billing_hub/accounts');

  return (
    <section className="meta-cost-tracker" aria-label="Meta WhatsApp messaging costs">
      <div className="meta-cost-header">
        <div>
          <span className="meta-cost-eyebrow">META CLOUD API · MESSAGING CHARGES</span>
          <h2 className="meta-cost-title">Know what your messages cost.</h2>
          <p className="meta-cost-subtitle">Delivered-message volume and approximate Meta charges for your connected business account.</p>
        </div>
        <div className="meta-cost-actions">
          <div className="meta-cost-period-group">
            <label htmlFor="meta-cost-period">Period</label>
            <select id="meta-cost-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <button type="button" className="meta-cost-refresh-btn" onClick={load} disabled={loading} aria-label="Refresh Meta charges">
            <FaSyncAlt className={loading ? 'meta-cost-spin' : ''} /> Refresh
          </button>
          <a
            href={metaBillingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="meta-cost-billing-link"
          >
            View invoices & balance in Meta <FaExternalLinkAlt />
          </a>
        </div>
      </div>

      {loading && (
        <div className="meta-cost-state" role="status">
          <FaRegClock /> Loading Meta messaging charges…
        </div>
      )}

      {!loading && error && (
        <div className="meta-cost-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && source === 'not_connected' && (
        <div className="meta-cost-state">
          <FaCreditCard />
          <h3>Connect WhatsApp to see messaging charges</h3>
          <p>Connect your Meta WhatsApp API credentials to see live usage and charges.</p>
          <Link to="/dashboard/whatsapp-connect">Connect WhatsApp</Link>
        </div>
      )}

      {!loading && !error && analytics && source !== 'not_connected' && (
        <>
          <div className="meta-cost-source">
            <span className="meta-cost-source-pill">
              {source === 'meta_analytics'
                ? 'Meta-reported live charges'
                : source === 'rate_card_estimate'
                ? 'Rate-card estimated charges'
                : 'Meta Cloud API Charges'}
            </span>
            {analytics?.accountName && (
              <span className="meta-cost-account-pill">
                Account: <strong>{analytics.accountName}</strong> {analytics?.wabaId ? `(ID: ${analytics.wabaId})` : ''}
              </span>
            )}
            {!analytics?.accountName && analytics?.wabaId && (
              <span className="meta-cost-account-pill">
                WABA ID: <strong>{analytics.wabaId}</strong>
              </span>
            )}
            <span className="meta-cost-source-period">· {periodLabel} (UTC)</span>
          </div>

          <div className="meta-cost-metrics">
            <div className="meta-cost-metric primary">
              <FaCreditCard />
              <span>Meta messaging spend</span>
              <strong>{money(analytics.totalEstimatedCost, analytics.currency)}</strong>
              <small>{analytics.currency ? `${analytics.currency} · approximate spend` : 'INR · estimated Meta spend'}</small>
            </div>
            <div className="meta-cost-metric">
              <FaBullhorn />
              <span>Marketing</span>
              <strong>{money(categories.marketing?.cost, analytics.currency)}</strong>
              <small>{count(categories.marketing?.count)} delivered messages</small>
            </div>
            <div className="meta-cost-metric">
              <FaShippingFast />
              <span>Utility & order updates</span>
              <strong>{money(categories.utility?.cost, analytics.currency)}</strong>
              <small>{count(categories.utility?.count)} delivered messages</small>
            </div>
            <div className="meta-cost-metric">
              <FaHeadset />
              <span>Customer support</span>
              <strong>{money(categories.service?.cost, analytics.currency)}</strong>
              <small>{count(categories.service?.totalCount || categories.service?.count)} service messages</small>
            </div>
          </div>

          {freeTier && (
            <div className="meta-cost-allowance">
              <div>
                <strong>
                  {freeTier.used == null
                    ? '0 / 1,000 free service messages used this month'
                    : `${count(freeTier.used)} / ${count(freeTier.limit || 1000)} free service messages used this month`}
                </strong>
                <span>
                  Meta allows 1,000 free service messages per connected phone number each month; subsequent delivered service messages may be charged.
                </span>
              </div>
              {freeTier.used != null && (
                <div className="meta-cost-track" role="progressbar" aria-label="Free service message allowance" aria-valuenow={freeTier.used} aria-valuemin={0} aria-valuemax={freeTier.limit || 1000}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              )}
              {freeTier.phones?.length > 1 && (
                <small>Across {freeTier.phones.length} business numbers. Allowance is separate for each number.</small>
              )}
            </div>
          )}

          <div className="meta-cost-breakdown">
            <div className="meta-cost-breakdown-head">
              <h3>Daily breakdown</h3>
              <span>
                Authentication: {count(categories.authentication?.count)} messages · {money(categories.authentication?.cost, analytics.currency)}
              </span>
            </div>
            {analytics.dailyBreakdown?.length ? (
              <div className="meta-cost-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Marketing</th>
                      <th>Utility</th>
                      <th>Service</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dailyBreakdown.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{count(day.marketing)}</td>
                        <td>{count(day.utility)}</td>
                        <td>{count(day.service)}</td>
                        <td>{money(day.cost, analytics.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="meta-cost-no-activity">No Meta messaging charges reported for this period ({periodLabel}) yet.</p>
            )}
          </div>

          {analytics.warning && (
            <div className="meta-cost-warning" role="status">
              <FaInfoCircle className="meta-cost-warning-icon" />
              <span>{analytics.warning}</span>
            </div>
          )}

          <div className="meta-cost-billing-note">
            <FaInfoCircle />
            <div>
              <strong>Billing Note:</strong> The current balance in your Meta Billing Hub (e.g. unbilled ₹22.44 on your Visa card) reflects total unpaid charges awaiting Meta's auto-debit threshold. The cards above show delivered message charges for the selected period (<strong>{periodLabel}</strong>).
            </div>
          </div>
        </>
      )}

      <p className="meta-cost-disclaimer">
        These message charges are billed by Meta separately from your Kwickbot subscription. If you pay Meta directly, Meta charges your configured card, prepaid balance, or credit line; partner-billed accounts may differ. The Meta invoice is the final payable amount.
      </p>
    </section>
  );
}

export default MetaCostTracker;
