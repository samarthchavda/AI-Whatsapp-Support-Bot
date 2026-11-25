import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRobot,
  FaCoins,
  FaExclamationTriangle,
  FaArrowLeft,
  FaRupeeSign,
  FaChartLine,
  FaSync,
  FaSearch,
  FaEye,
  FaBell
} from 'react-icons/fa';
import api from '../../../services/api';
import '../Dashboard/SuperAdmin.css';
import './SuperAdminBudget.css';

const RANGE_OPTIONS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'all_time', label: 'All Time' }
];

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function SuperAdminBudget() {
  const navigate = useNavigate();
  const [range, setRange] = useState('this_month');
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertInputUsd, setAlertInputUsd] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const fetchBudgetData = useCallback(async (selectedRange = range) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/super-admin/ai-usage', {
        params: { includeBudget: '1', range: selectedRange }
      });
      const budget = res.data?.data?.budget;
      if (!budget) {
        throw new Error('Budget analytics payload missing');
      }
      setBudgetData(budget);
      setAlertInputUsd(budget.monthlyBudgetUsd > 0 ? String(budget.monthlyBudgetUsd) : '');
    } catch (err) {
      console.error('Error fetching AI cost & budget data:', err);
      setError(err.response?.data?.error || 'Failed to load AI cost & revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchBudgetData(range);
  }, [range, fetchBudgetData]);

  const handleSaveAlertThreshold = async (e) => {
    e.preventDefault();
    const numeric = alertInputUsd === '' ? 0 : Number(alertInputUsd);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setAlertMessage('Enter a valid USD threshold (0 or greater).');
      return;
    }

    try {
      setSavingAlert(true);
      setAlertMessage('');
      const res = await api.post('/super-admin/settings', {
        settings: { geminiApiFundsAdded: numeric }
      });
      if (res.data?.success) {
        await fetchBudgetData(range);
        setAlertMessage(numeric > 0 ? `Spend alert set at $${numeric.toFixed(2)}.` : 'Spend alert disabled.');
      }
    } catch (err) {
      setAlertMessage(err.response?.data?.error || 'Could not save spend alert threshold.');
    } finally {
      setSavingAlert(false);
    }
  };

  const filteredMerchants = useMemo(() => {
    const list = budgetData?.merchants || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.businessName || '').toLowerCase().includes(q) ||
      (m.subscriptionPlan || '').toLowerCase().includes(q)
    );
  }, [budgetData, searchQuery]);

  const maxChartValue = useMemo(() => {
    const rows = budgetData?.dailyTrend || [];
    return Math.max(1, ...rows.map((d) => Math.max(d.revenueInr || 0, d.costInr || 0)));
  }, [budgetData]);

  if (loading && !budgetData) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fafafa' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const summary = budgetData?.summary || {};
  const monthlyBudgetUsd = budgetData?.monthlyBudgetUsd || 0;
  const budgetAlertTriggered = monthlyBudgetUsd > 0 && (summary.totalCostUsd || 0) >= monthlyBudgetUsd * 0.8;

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title super-admin-title">
            <FaCoins className="crown-icon" /> AI Cost, Revenue &amp; Margin
          </h1>
          <p className="page-subtitle">
            Real Gemini &amp; OpenAI token usage from AILog compared against verified subscription invoice revenue.
          </p>
        </div>

        <div className="sa-budget-toolbar">
          <div className="sa-budget-tabs" role="tablist" aria-label="Timeframe filter">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`sa-budget-tab ${range === opt.key ? 'active' : ''}`}
                onClick={() => setRange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchBudgetData(range)}
            className="btn-secondary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaSync className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/super-admin')}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaArrowLeft /> Back to Merchants
          </button>
        </div>
      </div>

      {error && (
        <div className="budget-alert-warning" style={{ marginBottom: '20px' }}>
          <FaExclamationTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {budgetAlertTriggered && (
        <div className="budget-alert-warning" style={{ marginBottom: '20px' }}>
          <FaExclamationTriangle style={{ fontSize: '22px', flexShrink: 0 }} />
          <div>
            <strong>Google AI Spend Alert:</strong> Actual AI cost (${Number(summary.totalCostUsd || 0).toFixed(4)}) has reached{' '}
            <strong>{budgetData.budgetUsedPct}%</strong> of your ${monthlyBudgetUsd.toFixed(2)} alert threshold.
          </div>
        </div>
      )}

      {budgetData && (
        <>
          {/* 4 Real KPI Cards */}
          <div className="analytics-cards" style={{ marginBottom: '24px' }}>
            <div className="stat-card budget" style={{ padding: '22px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <FaRupeeSign />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                  Subscription Revenue
                </h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {formatInr(summary.totalRevenueInr)}
                </p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {summary.paidInvoicesCount || 0} paid invoice{summary.paidInvoicesCount === 1 ? '' : 's'} in range
                </small>
              </div>
            </div>

            <div className="stat-card cost" style={{ padding: '22px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <FaCoins />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                  Actual AI API Cost
                </h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {formatInr(summary.totalCostInr)}{' '}
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                    (${Number(summary.totalCostUsd || 0).toFixed(4)})
                  </span>
                </p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  From exact input/output tokens · 1 USD = ₹{budgetData.usdToInr}
                </small>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '22px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
                <FaChartLine />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                  Net Margin After AI Cost
                </h3>
                <p
                  className="stat-value"
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: (summary.netMarginInr || 0) >= 0 ? '#34d399' : '#f87171'
                  }}
                >
                  {formatInr(summary.netMarginInr)}
                </p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {summary.totalRevenueInr > 0 ? `${summary.marginPct}% margin` : 'No paid invoices in range'}
                </small>
              </div>
            </div>

            <div className="stat-card gemini" style={{ padding: '22px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <FaRobot />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                  Tokens Consumed (AILog)
                </h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {(summary.totalTokens || 0).toLocaleString()}
                </p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {(summary.totalPromptTokens || 0).toLocaleString()} in · {(summary.totalCompletionTokens || 0).toLocaleString()} out · {summary.totalAiCalls || 0} calls
                </small>
              </div>
            </div>
          </div>

          {/* 7-Day Trend + Model Breakdown & Google Spend Alert */}
          <div className="sa-budget-grid-2">
            <div className="sa-budget-panel">
              <div className="sa-budget-panel-head">
                <div>
                  <h3 className="sa-budget-panel-title">Last 7 Days: Revenue vs AI Cost</h3>
                  <p className="sa-budget-panel-sub">Daily paid invoices compared with actual AI API spend (UTC)</p>
                </div>
                <div className="sa-budget-legend">
                  <span><span className="sa-legend-dot" style={{ background: '#10b981' }} />Revenue (₹)</span>
                  <span><span className="sa-legend-dot" style={{ background: '#f59e0b' }} />AI Cost (₹)</span>
                </div>
              </div>

              <div className="sa-budget-chart">
                {(budgetData.dailyTrend || []).map((day) => {
                  const revHeight = day.revenueInr > 0 ? Math.max(8, Math.round((day.revenueInr / maxChartValue) * 125)) : 2;
                  const costHeight = day.costInr > 0 ? Math.max(8, Math.round((day.costInr / maxChartValue) * 125)) : 2;
                  return (
                    <div key={day.date} className="sa-chart-col" title={`${day.date}\nRevenue: ${formatInr(day.revenueInr)}\nAI Cost: ${formatInr(day.costInr)} ($${day.costUsd})\nTokens: ${day.tokens.toLocaleString()}`}>
                      <div className="sa-chart-val">
                        {day.revenueInr > 0 ? `₹${Math.round(day.revenueInr)}` : `${day.tokens.toLocaleString()}t`}
                      </div>
                      <div className="sa-chart-bars">
                        <div className="sa-bar sa-bar-rev" style={{ height: `${revHeight}px` }} />
                        <div className="sa-bar sa-bar-cost" style={{ height: `${costHeight}px` }} />
                      </div>
                      <div className="sa-chart-label">{day.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sa-budget-panel">
              <div className="sa-budget-panel-head">
                <div>
                  <h3 className="sa-budget-panel-title">Model Breakdown &amp; Alert Cap</h3>
                  <p className="sa-budget-panel-sub">Exact usage split by AI model</p>
                </div>
              </div>

              <div className="sa-model-list">
                {(budgetData.modelBreakdown || []).length === 0 ? (
                  <div className="sa-model-row">
                    <span style={{ color: 'var(--text-secondary)' }}>No AILog activity recorded in this period.</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Cycle counter: {(summary.activeCycleTokensUsed || 0).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  budgetData.modelBreakdown.map((item) => (
                    <div key={item.modelKey} className="sa-model-row">
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.model}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {item.totalTokens.toLocaleString()} tokens · {item.calls} calls
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatInr(item.costInr)}</div>
                        <div style={{ color: 'var(--text-muted)' }}>${Number(item.costUsd).toFixed(4)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="sa-alert-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <FaBell style={{ color: '#f59e0b' }} /> Monthly Google Spend Alert (USD)
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Shows a warning banner at 80% spend. Google Cloud bills your linked card directly; set 0 to disable.
                </p>
                <form onSubmit={handleSaveAlertThreshold} className="sa-alert-form">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50.00"
                    value={alertInputUsd}
                    onChange={(e) => setAlertInputUsd(e.target.value)}
                  />
                  <button type="submit" disabled={savingAlert} className="budget-btn-submit">
                    {savingAlert ? 'Saving...' : 'Save Alert'}
                  </button>
                </form>
                {alertMessage && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#34d399' }}>{alertMessage}</div>
                )}
              </div>
            </div>
          </div>

          {/* Per-Merchant AI Cost & Quota Table */}
          <div className="table-container-premium super-admin-table">
            <div className="table-header-premium super-admin-table-header">
              <h2><FaRobot /> Per-Merchant AI Usage &amp; Cost ({filteredMerchants.length})</h2>
              <div className="super-admin-search">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search merchant, email, or plan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Plan</th>
                    <th>Current Cycle Quota</th>
                    <th>Tokens (Selected Range)</th>
                    <th>Actual AI Cost</th>
                    <th>Paid Revenue</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="super-admin-empty">
                        No merchants found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredMerchants.map((m) => {
                      const pillClass = m.quotaStatus === 'Limit Reached'
                        ? 'crit'
                        : m.quotaStatus === 'Near Limit'
                          ? 'warn'
                          : m.quotaStatus === 'Unlimited'
                            ? 'muted'
                            : 'ok';
                      return (
                        <tr key={m._id}>
                          <td>
                            <div className="user-info-cell">
                              <span className="user-info-name">{m.businessName || m.name}</span>
                              <span className="user-info-email">{m.email}</span>
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{m.subscriptionPlan}</td>
                          <td>
                            {m.isUnlimited
                              ? `${m.cycleTokensUsed.toLocaleString()} / Unlimited`
                              : `${m.cycleTokensUsed.toLocaleString()} / ${m.cycleTokensLimit.toLocaleString()} (${m.quotaPct}%)`}
                          </td>
                          <td>
                            <strong>{m.totalTokens.toLocaleString()}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {m.aiCalls} AI call{m.aiCalls === 1 ? '' : 's'}
                            </div>
                          </td>
                          <td>
                            <strong>{formatInr(m.costInr)}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${Number(m.costUsd).toFixed(4)}</div>
                          </td>
                          <td>{formatInr(m.revenueInr)}</td>
                          <td>
                            <span className={`sa-status-pill ${pillClass}`}>{m.quotaStatus}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="action-btn-sm"
                              onClick={() => navigate(`/dashboard/super-admin/merchants/${m._id}`)}
                              title="Open merchant details"
                            >
                              <FaEye /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SuperAdminBudget;
