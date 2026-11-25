const Admin = require('../models/Admin');
const AILog = require('../models/AILog');
const Invoice = require('../models/Invoice');
const GlobalSettings = require('../models/GlobalSettings');

// Official per-1M-token USD pricing used for cost estimation.
// Input and output tokens are priced separately because output tokens cost more.
const MODEL_RATES_PER_1M_USD = {
  'gemini-2.5-flash': { input: 0.15, output: 0.60, label: 'Gemini 2.5 Flash' },
  'gemini-2.5-pro': { input: 1.25, output: 10.00, label: 'Gemini 2.5 Pro' },
  'gemini-2.0-flash': { input: 0.10, output: 0.40, label: 'Gemini 2.0 Flash' },
  'gemini-1.5-flash': { input: 0.075, output: 0.30, label: 'Gemini 1.5 Flash' },
  'gemini-1.5-pro': { input: 1.25, output: 5.00, label: 'Gemini 1.5 Pro' },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50, label: 'OpenAI GPT-3.5 Turbo' },
  'gpt-4o-mini': { input: 0.15, output: 0.60, label: 'OpenAI GPT-4o Mini' },
  'gpt-4o': { input: 2.50, output: 10.00, label: 'OpenAI GPT-4o' }
};

const DEFAULT_GEMINI_RATE = MODEL_RATES_PER_1M_USD['gemini-2.5-flash'];
const BUDGET_ALERT_KEY = 'geminiApiFundsAdded';

function getUsdToInrRate() {
  const envRate = Number(process.env.USD_TO_INR_RATE);
  return Number.isFinite(envRate) && envRate > 0 ? envRate : 85;
}

function getModelRates(aiModel = '') {
  const normalized = String(aiModel || '').trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'fallback' || normalized === 'ratelimit') {
    return null;
  }
  if (MODEL_RATES_PER_1M_USD[normalized]) {
    return { key: normalized, ...MODEL_RATES_PER_1M_USD[normalized] };
  }
  const matchedKey = Object.keys(MODEL_RATES_PER_1M_USD).find((k) => normalized.includes(k));
  if (matchedKey) {
    return { key: matchedKey, ...MODEL_RATES_PER_1M_USD[matchedKey] };
  }
  if (normalized.includes('gemini')) {
    return { key: normalized, ...DEFAULT_GEMINI_RATE, label: aiModel };
  }
  if (normalized.includes('gpt')) {
    return { key: normalized, ...MODEL_RATES_PER_1M_USD['gpt-3.5-turbo'], label: aiModel };
  }
  return { key: normalized, ...DEFAULT_GEMINI_RATE, label: aiModel };
}

function computeTokenCostUsd({ aiModel, promptTokens = 0, completionTokens = 0, totalTokens = 0 }) {
  const rates = getModelRates(aiModel);
  if (!rates) return 0;

  const prompt = Number(promptTokens) || 0;
  const completion = Number(completionTokens) || 0;
  const total = Number(totalTokens) || 0;

  // If breakdown is missing on older rows, split 70% input / 30% output
  if (prompt === 0 && completion === 0 && total > 0) {
    const estInput = total * 0.7;
    const estOutput = total * 0.3;
    return (estInput * rates.input + estOutput * rates.output) / 1_000_000;
  }

  return (prompt * rates.input + completion * rates.output) / 1_000_000;
}

function getRangeWindow(range = 'this_month', now = new Date()) {
  const normalized = ['this_month', 'last_30_days', 'all_time'].includes(range) ? range : 'this_month';
  if (normalized === 'this_month') {
    return {
      range: normalized,
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
      endDate: now
    };
  }
  if (normalized === 'last_30_days') {
    return {
      range: normalized,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: now
    };
  }
  return { range: 'all_time', startDate: null, endDate: now };
}

function formatUtcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function getSuperAdminAiBudget({ range = 'this_month', now = new Date() } = {}) {
  const usdToInr = getUsdToInrRate();
  const windowInfo = getRangeWindow(range, now);
  const dateFilter = windowInfo.startDate ? { $gte: windowInfo.startDate, $lte: windowInfo.endDate } : null;

  const aiMatch = dateFilter ? { createdAt: dateFilter } : {};
  const invoiceDateMatch = dateFilter
    ? {
        $or: [
          { paidDate: dateFilter },
          { paidDate: null, issuedDate: dateFilter },
          { paidDate: { $exists: false }, issuedDate: { $exists: false }, createdAt: dateFilter }
        ]
      }
    : {};

  const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));

  const [
    merchants,
    aiByMerchantModel,
    aiDailyRaw,
    paidInvoices,
    dailyInvoicesRaw,
    budgetAlertSetting
  ] = await Promise.all([
    Admin.find({ role: 'admin' })
      .select('name email businessName subscriptionPlan subscriptionStatus geminiTokensUsed geminiTokensLimit lastTokenReset monthlyPrice createdAt')
      .lean(),
    AILog.aggregate([
      { $match: aiMatch },
      {
        $group: {
          _id: { admin: '$admin', aiModel: { $ifNull: ['$aiModel', 'none'] } },
          promptTokens: { $sum: { $ifNull: ['$promptTokens', 0] } },
          completionTokens: { $sum: { $ifNull: ['$completionTokens', 0] } },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          calls: { $sum: 1 }
        }
      }
    ]),
    AILog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo, $lte: now } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            aiModel: { $ifNull: ['$aiModel', 'none'] }
          },
          promptTokens: { $sum: { $ifNull: ['$promptTokens', 0] } },
          completionTokens: { $sum: { $ifNull: ['$completionTokens', 0] } },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          calls: { $sum: 1 }
        }
      }
    ]),
    Invoice.find({
      $and: [
        { $or: [{ paymentStatus: 'completed' }, { status: 'paid' }] },
        ...(dateFilter ? [invoiceDateMatch] : [])
      ]
    })
      .select('customerId totalAmount paidDate issuedDate createdAt')
      .lean(),
    Invoice.aggregate([
      {
        $match: {
          $or: [{ paymentStatus: 'completed' }, { status: 'paid' }]
        }
      },
      {
        $addFields: {
          effectivePaidAt: { $ifNull: ['$paidDate', { $ifNull: ['$issuedDate', '$createdAt'] }] }
        }
      },
      {
        $match: {
          effectivePaidAt: { $gte: sevenDaysAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$effectivePaidAt', timezone: 'UTC' } },
          revenueInr: { $sum: { $ifNull: ['$totalAmount', 0] } },
          invoices: { $sum: 1 }
        }
      }
    ]),
    GlobalSettings.findOne({ key: BUDGET_ALERT_KEY }).lean()
  ]);

  const merchantMap = new Map();
  merchants.forEach((m) => {
    merchantMap.set(String(m._id), {
      _id: m._id,
      name: m.name,
      email: m.email,
      businessName: m.businessName || '',
      subscriptionPlan: m.subscriptionPlan || 'starter',
      subscriptionStatus: m.subscriptionStatus || 'trial',
      cycleTokensUsed: m.geminiTokensUsed || 0,
      cycleTokensLimit: m.geminiTokensLimit ?? 50000,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      aiCalls: 0,
      costUsd: 0,
      costInr: 0,
      revenueInr: 0,
      invoicesCount: 0
    });
  });

  const modelBreakdownMap = new Map();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalAiCalls = 0;
  let totalCostUsd = 0;

  aiByMerchantModel.forEach((row) => {
    const aiModel = row._id?.aiModel || 'none';
    const prompt = row.promptTokens || 0;
    const completion = row.completionTokens || 0;
    const total = row.totalTokens || (prompt + completion);
    const calls = row.calls || 0;
    const costUsd = computeTokenCostUsd({
      aiModel,
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total
    });

    totalPromptTokens += prompt;
    totalCompletionTokens += completion;
    totalTokens += total;
    totalAiCalls += calls;
    totalCostUsd += costUsd;

    const rates = getModelRates(aiModel);
    if (rates || total > 0) {
      const mKey = rates ? rates.key : 'non_ai';
      const existingModel = modelBreakdownMap.get(mKey) || {
        model: rates ? rates.label : 'Cached / Rule-based',
        modelKey: mKey,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        calls: 0,
        costUsd: 0,
        costInr: 0
      };
      existingModel.promptTokens += prompt;
      existingModel.completionTokens += completion;
      existingModel.totalTokens += total;
      existingModel.calls += calls;
      existingModel.costUsd += costUsd;
      existingModel.costInr = Number((existingModel.costUsd * usdToInr).toFixed(2));
      modelBreakdownMap.set(mKey, existingModel);
    }

    const adminKey = row._id?.admin ? String(row._id.admin) : null;
    if (adminKey && merchantMap.has(adminKey)) {
      const m = merchantMap.get(adminKey);
      m.promptTokens += prompt;
      m.completionTokens += completion;
      m.totalTokens += total;
      m.aiCalls += calls;
      m.costUsd += costUsd;
      m.costInr = Number((m.costUsd * usdToInr).toFixed(2));
    }
  });

  let totalRevenueInr = 0;
  paidInvoices.forEach((inv) => {
    const amount = Number(inv.totalAmount) || 0;
    totalRevenueInr += amount;
    const custKey = inv.customerId ? String(inv.customerId) : null;
    if (custKey && merchantMap.has(custKey)) {
      const m = merchantMap.get(custKey);
      m.revenueInr += amount;
      m.invoicesCount += 1;
    }
  });

  // Build continuous 7-day trend
  const dailyMap = new Map();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = formatUtcDay(d);
    dailyMap.set(key, {
      date: key,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
      tokens: 0,
      calls: 0,
      costUsd: 0,
      costInr: 0,
      revenueInr: 0
    });
  }

  aiDailyRaw.forEach((row) => {
    const dayKey = row._id?.day;
    if (!dailyMap.has(dayKey)) return;
    const entry = dailyMap.get(dayKey);
    const total = row.totalTokens || ((row.promptTokens || 0) + (row.completionTokens || 0));
    const costUsd = computeTokenCostUsd({
      aiModel: row._id?.aiModel,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      totalTokens: total
    });
    entry.tokens += total;
    entry.calls += row.calls || 0;
    entry.costUsd += costUsd;
    entry.costInr = Number((entry.costUsd * usdToInr).toFixed(2));
  });

  dailyInvoicesRaw.forEach((row) => {
    if (!dailyMap.has(row._id)) return;
    dailyMap.get(row._id).revenueInr += Number(row.revenueInr) || 0;
  });

  const dailyTrend = Array.from(dailyMap.values()).map((d) => ({
    ...d,
    costUsd: Number(d.costUsd.toFixed(4)),
    costInr: Number(d.costInr.toFixed(2)),
    revenueInr: Number(d.revenueInr.toFixed(2))
  }));

  const merchantRows = Array.from(merchantMap.values())
    .map((m) => {
      const isUnlimited = m.cycleTokensLimit === -1 || m.cycleTokensLimit === Infinity;
      const quotaPct = !isUnlimited && m.cycleTokensLimit > 0
        ? Number(((m.cycleTokensUsed / m.cycleTokensLimit) * 100).toFixed(1))
        : 0;
      let quotaStatus = 'Active';
      if (isUnlimited) quotaStatus = 'Unlimited';
      else if (quotaPct >= 100) quotaStatus = 'Limit Reached';
      else if (quotaPct >= 80) quotaStatus = 'Near Limit';

      return {
        ...m,
        costUsd: Number(m.costUsd.toFixed(4)),
        costInr: Number((m.costUsd * usdToInr).toFixed(2)),
        revenueInr: Number(m.revenueInr.toFixed(2)),
        netMarginInr: Number((m.revenueInr - m.costUsd * usdToInr).toFixed(2)),
        isUnlimited,
        quotaPct,
        quotaStatus
      };
    })
    .sort((a, b) => (b.costUsd - a.costUsd) || (b.cycleTokensUsed - a.cycleTokensUsed));

  const totalCostInr = Number((totalCostUsd * usdToInr).toFixed(2));
  const netMarginInr = Number((totalRevenueInr - totalCostInr).toFixed(2));
  const marginPct = totalRevenueInr > 0
    ? Number(((netMarginInr / totalRevenueInr) * 100).toFixed(1))
    : 0;

  const monthlyBudgetUsd = budgetAlertSetting && Number(budgetAlertSetting.value) > 0
    ? Number(budgetAlertSetting.value)
    : 0;
  const activeCycleTokensUsed = merchants.reduce((sum, m) => sum + (m.geminiTokensUsed || 0), 0);

  return {
    range: windowInfo.range,
    usdToInr,
    monthlyBudgetUsd,
    budgetUsedPct: monthlyBudgetUsd > 0 ? Number(((totalCostUsd / monthlyBudgetUsd) * 100).toFixed(1)) : 0,
    summary: {
      totalRevenueInr: Number(totalRevenueInr.toFixed(2)),
      paidInvoicesCount: paidInvoices.length,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      totalCostInr,
      netMarginInr,
      marginPct,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalAiCalls,
      activeCycleTokensUsed
    },
    modelBreakdown: Array.from(modelBreakdownMap.values())
      .map((item) => ({ ...item, costUsd: Number(item.costUsd.toFixed(4)) }))
      .sort((a, b) => b.costUsd - a.costUsd),
    dailyTrend,
    merchants: merchantRows
  };
}

module.exports = {
  MODEL_RATES_PER_1M_USD,
  BUDGET_ALERT_KEY,
  getUsdToInrRate,
  getModelRates,
  computeTokenCostUsd,
  getRangeWindow,
  getSuperAdminAiBudget
};
