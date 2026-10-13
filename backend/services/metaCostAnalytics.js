// Meta's pricing analytics is the billing source. Local chats are retained for
// only 24 hours and cannot be used to reconstruct a monthly Meta invoice.
const CATEGORIES = ['marketing', 'utility', 'authentication', 'service'];
const FREE_SERVICE_LIMIT = 1000;
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getPoints = (payload) => {
  const analytics = payload?.pricing_analytics || payload;
  const groups = Array.isArray(analytics?.data) ? analytics.data :
    Array.isArray(analytics) ? analytics : Array.isArray(payload?.data) ? payload.data : [];
  return groups.flatMap((group) => group?.data_points || (group?.pricing_category ? [group] : []))
    .concat(Array.isArray(analytics?.data_points) ? analytics.data_points : []);
};

const getCategory = (value) => {
  const name = String(value || '').toLowerCase();
  if (name.startsWith('marketing')) return 'marketing';
  if (name.startsWith('utility')) return 'utility';
  if (name.startsWith('authentication')) return 'authentication';
  if (name.startsWith('service')) return 'service';
  return null;
};

const getCost = (point) => {
  const raw = typeof point.cost === 'object' ? point.cost?.value : point.cost;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

// Rates must be copied from the current official Meta INR rate card by the
// operator. Never silently fall back to a stale marketing/service rate.
const getConfiguredInrRates = () => {
  try {
    const parsed = JSON.parse(process.env.META_INR_RATE_CARD_JSON || '{}');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.effectiveDate || '')) return null;
    if (!CATEGORIES.every((category) => Number.isFinite(parsed[category]) && parsed[category] >= 0)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
};

const summarize = (points, { currency, inrRates, period, localDeliveredMessages = 0, phoneNumberId } = {}) => {
  const categories = Object.fromEntries(CATEGORIES.map((category) => [category, { count: 0, cost: 0, rate: null }]));
  const daily = new Map();
  const phones = new Map();
  let missingCost = false;
  let estimated = false;
  const missingCategories = new Set();
  const estimatedCategories = new Set();
  let unknownCategories = 0;

  for (const point of points) {
    const category = getCategory(point.pricing_category || point.category);
    const count = Number(point.volume);
    if (!category || !Number.isFinite(count) || count < 0) {
      unknownCategories += 1;
      missingCost = true;
      continue;
    }
    const phone = String(point.phone_number || phoneNumberId || 'connected-number');
    const type = String(point.pricing_type || '').toUpperCase();
    const isFree = type.startsWith('FREE_');
    const date = new Date(Number(point.start) < 1e11 ? Number(point.start) * 1000 : point.start);
    const dayKey = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    const country = String(point.country || '').toUpperCase();
    let cost = getCost(point);
    if (cost === null && isFree) cost = 0;
    if (cost === null && type === 'REGULAR' && currency === 'INR' && country === 'IN' && inrRates) {
      cost = count * inrRates[category];
      estimated = true;
      estimatedCategories.add(category);
    }
    if (cost === null) {
      missingCost = true;
      missingCategories.add(category);
    }
    categories[category].count += count;
    if (cost !== null) categories[category].cost += cost;
    if (category === 'service') {
      const item = phones.get(phone) || { phoneNumber: phone, used: 0, limit: FREE_SERVICE_LIMIT, freeReported: false };
      if (type === 'FREE_CUSTOMER_SERVICE') {
        item.used += count;
        item.freeReported = true;
      }
      phones.set(phone, item);
    }
    if (dayKey) {
      const row = daily.get(dayKey) || { date: dayKey, marketing: 0, utility: 0, authentication: 0, service: 0, cost: 0, costAvailable: true };
      row[category] += count;
      if (cost === null) row.costAvailable = false;
      else row.cost += cost;
      daily.set(dayKey, row);
    }
  }

  const freeTierKnown = [...phones.values()].every((phone) => phone.freeReported);
  const freeTierUsed = freeTierKnown ? [...phones.values()].reduce((sum, phone) => sum + phone.used, 0) : null;
  const service = categories.service;
  service.totalCount = service.count;
  service.freeTierUsed = freeTierUsed;
  service.freeTierLimit = Math.max(1, phones.size) * FREE_SERVICE_LIMIT;
  service.billableCount = points.reduce((sum, point) => {
    const volume = Number(point.volume);
    return getCategory(point.pricing_category || point.category) === 'service' &&
      String(point.pricing_type || '').toUpperCase() === 'REGULAR' && Number.isFinite(volume)
      ? sum + volume : sum;
  }, 0);
  const totalRaw = CATEGORIES.reduce((sum, category) => sum + categories[category].cost, 0);
  for (const category of CATEGORIES) {
    const item = categories[category];
    item.cost = missingCategories.has(category) ? null : roundMoney(item.cost);
    item.rate = estimatedCategories.has(category) ? inrRates[category] : null;
  }
  const total = missingCost ? null : roundMoney(totalRaw);
  const dailyBreakdown = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map((row) => ({
    ...row, cost: row.costAvailable ? roundMoney(row.cost) : null
  }));
  return {
    period,
    currency: currency || null,
    source: missingCost ? 'unavailable' : estimated ? 'rate_card_estimate' : 'meta_analytics',
    totalEstimatedCost: total,
    categories,
    dailyBreakdown,
    freeTier: { used: freeTierUsed, known: freeTierKnown, limit: Math.max(1, phones.size) * FREE_SERVICE_LIMIT, phones: [...phones.values()].map(({ freeReported, ...phone }) => phone) },
    localDeliveredMessages,
    warning: unknownCategories ? `${unknownCategories} Meta analytics row(s) use an unrecognized category and are excluded from the displayed total.` : null,
    metaBillingUrl: 'https://business.facebook.com/billing_hub'
  };
};

module.exports = { FREE_SERVICE_LIMIT, getPoints, getConfiguredInrRates, summarize };
