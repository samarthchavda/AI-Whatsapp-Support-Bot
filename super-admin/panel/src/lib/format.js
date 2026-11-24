const nf = new Intl.NumberFormat('en-IN');

export function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? nf.format(n) : '0';
}

export function formatINR(value) {
  return `₹${formatNumber(value)}`;
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthLabel(date = new Date()) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'K';
}
