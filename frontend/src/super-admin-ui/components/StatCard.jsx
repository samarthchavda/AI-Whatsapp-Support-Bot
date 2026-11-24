import { formatNumber } from '../lib/format';

// A label, one figure and what it compares to. Numbers only, no decoration.
// `display` replaces the formatted value (for money); `limit` adds a usage meter.
export default function StatCard({ label, value, display, limit, meta, loading, unavailable }) {
  const hasLimit = typeof limit === 'number' && limit > 0;
  const share = hasLimit ? Math.min(100, Math.round(((value || 0) / limit) * 100)) : null;
  const metaText = unavailable
    ? 'Not available'
    : meta ?? (hasLimit ? `of ${formatNumber(limit)} this month` : limit === -1 ? 'No monthly limit' : '');

  return (
    <div className="sa-card sa-stat">
      <span className="sa-stat-label">{label}</span>
      {loading ? (
        <span className="sa-skeleton" style={{ width: '50%', height: 28 }} />
      ) : unavailable ? (
        <span className="sa-stat-figure sa-muted">–</span>
      ) : (
        <span className="sa-stat-figure">{display ?? formatNumber(value)}</span>
      )}
      {share !== null && !loading && !unavailable && (
        <div className={`sa-meter ${share >= 80 ? 'sa-is-high' : ''}`} role="presentation">
          <span style={{ width: `${share}%` }} />
        </div>
      )}
      {loading ? <span className="sa-skeleton" style={{ width: '70%', height: 12 }} /> : <span className="sa-stat-meta">{metaText}</span>}
    </div>
  );
}
