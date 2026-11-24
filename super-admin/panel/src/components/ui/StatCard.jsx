import { formatNumber } from '../../lib/format';

// A label, one figure and what it compares to. Numbers only, no decoration.
// `display` replaces the formatted value (for money); `limit` adds a usage meter.
export default function StatCard({ label, value, display, limit, meta, loading, unavailable }) {
  const hasLimit = typeof limit === 'number' && limit > 0;
  const share = hasLimit ? Math.min(100, Math.round(((value || 0) / limit) * 100)) : null;
  const metaText = unavailable
    ? 'Not available'
    : meta ?? (hasLimit ? `of ${formatNumber(limit)} this month` : limit === -1 ? 'No monthly limit' : '');

  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      {loading ? (
        <span className="skeleton" style={{ width: '50%', height: 28 }} />
      ) : unavailable ? (
        <span className="stat-figure muted">–</span>
      ) : (
        <span className="stat-figure">{display ?? formatNumber(value)}</span>
      )}
      {share !== null && !loading && !unavailable && (
        <div className={`meter ${share >= 80 ? 'is-high' : ''}`} role="presentation">
          <span style={{ width: `${share}%` }} />
        </div>
      )}
      {loading ? <span className="skeleton" style={{ width: '70%', height: 12 }} /> : <span className="stat-meta">{metaText}</span>}
    </div>
  );
}
