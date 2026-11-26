import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { FaChartBar, FaChartPie, FaSmile, FaSync, FaMeh, FaFrown } from 'react-icons/fa';
import './Analytics.css';

function Analytics({ admin }) {
  const [conversationsData, setConversationsData] = useState([]);
  const [resolutionData, setResolutionData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);

  const plan = (admin?.subscriptionPlan || JSON.parse(localStorage.getItem('admin') || '{}')?.subscriptionPlan || 'starter').toLowerCase();

  useEffect(() => {
    if (plan !== 'starter') {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [plan, selectedDays]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all analytics data using central API client
      const [conversationsRes, resolutionRes, sentimentRes] = await Promise.all([
        api.get(`/analytics/conversations-per-day?days=${selectedDays}`),
        api.get(`/analytics/resolution-rate?days=${selectedDays}`),
        api.get('/analytics/sentiment')
      ]);

      setConversationsData(conversationsRes.data.data);
      setResolutionData(resolutionRes.data.data);
      setSentimentData(sentimentRes.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      alert('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const refreshSentiment = async () => {
    try {
      setSentimentLoading(true);
      const response = await api.get('/analytics/sentiment');
      setSentimentData(response.data.data);
    } catch (error) {
      console.error('Error refreshing sentiment:', error);
      alert('Failed to refresh sentiment analysis');
    } finally {
      setSentimentLoading(false);
    }
  };

  // Colors for charts
  const COLORS = {
    aiResolved: '#3d5a22',
    humanEscalated: '#b47720',
    happy: '#3d7a40',
    neutral: '#759950',
    frustrated: '#a44738'
  };

  // Prepare pie chart data for resolution rate
  const resolutionPieData = resolutionData ? [
    { name: 'AI Resolved', value: resolutionData.aiResolved, percentage: resolutionData.aiResolvedPercentage },
    { name: 'Human Escalated', value: resolutionData.humanEscalated, percentage: resolutionData.humanEscalatedPercentage }
  ] : [];

  // Prepare pie chart data for sentiment breakdown — filter out 0% slices to avoid label overlap
  const sentimentPieData = sentimentData?.breakdown ? [
    { name: 'Happy', value: sentimentData.breakdown.happy },
    { name: 'Neutral', value: sentimentData.breakdown.neutral },
    { name: 'Frustrated', value: sentimentData.breakdown.frustrated }
  ].filter(d => d.value > 0) : [];

  // Full list for legend (including zeros)
  const sentimentLegendData = sentimentData?.breakdown ? [
    { name: 'Happy', value: sentimentData.breakdown.happy },
    { name: 'Neutral', value: sentimentData.breakdown.neutral },
    { name: 'Frustrated', value: sentimentData.breakdown.frustrated }
  ] : [];

  if (loading) {
    return (
      <div className="container merchant-data-page analytics-page">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (plan === 'starter') {
    return (
      <div className="container merchant-data-page analytics-page" style={{ position: 'relative' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics Overview</h1>
            <p className="page-subtitle">Insights and performance metrics</p>
          </div>
        </div>
        
        <div className="analytics-paywall-card">
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h2>
            Advanced Analytics is Locked
          </h2>
          <p>
            Upgrade your plan to the Growth Plan to unlock real-time message volume charts, resolution ratios, and sentiment analysis for your customers.
          </p>
          <Link to="/dashboard/billing" className="btn btn-primary">
            Upgrade Subscription Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container merchant-data-page analytics-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Analytics Overview</h1>
          <p className="page-subtitle">Insights and performance metrics</p>
        </div>
        <div>
          <select 
            value={selectedDays} 
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              padding: '10px 20px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'border-color 0.2s ease'
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={15}>Last 15 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Sentiment Widget */}
      <div className="analytics-grid">
        <div className="sentiment-widget">
          <div className="widget-header">
            <div>
              <h3><FaSmile /> Customer Sentiment</h3>
              <p>Based on last {sentimentData?.totalMessages || 0} messages</p>
            </div>
            <button 
              className="btn-secondary"
              onClick={refreshSentiment}
              disabled={sentimentLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaSync className={sentimentLoading ? 'spinning' : ''} />
              {sentimentLoading ? 'Analyzing...' : 'Refresh'}
            </button>
          </div>
          
          <div className="sentiment-display">
            <div className="sentiment-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {sentimentData?.sentiment === 'happy' && <FaSmile style={{ color: COLORS.happy }} />}
              {sentimentData?.sentiment === 'neutral' && <FaMeh style={{ color: COLORS.neutral }} />}
              {sentimentData?.sentiment === 'frustrated' && <FaFrown style={{ color: COLORS.frustrated }} />}
              {!sentimentData?.sentiment && <FaMeh style={{ color: COLORS.neutral }} />}
            </div>
            <div className="sentiment-info">
              <h2 className={`sentiment-${sentimentData?.sentiment || 'neutral'}`}>
                {!sentimentData?.totalMessages ? 'No data yet' : sentimentData?.sentiment ?
                  sentimentData.sentiment.charAt(0).toUpperCase() + sentimentData.sentiment.slice(1) 
                  : 'Neutral'}
              </h2>
              <p>{sentimentData?.totalMessages ? `Confidence: ${sentimentData?.confidence ? (sentimentData.confidence * 100).toFixed(0) : 0}%` : 'Sentiment appears after customer messages arrive.'}</p>
            </div>
          </div>

          {sentimentData?.breakdown && (
            <div className="sentiment-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Happy</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill happy"
                    style={{ width: `${sentimentData.breakdown.happy}%` }}
                  ></div>
                </div>
                <span className="breakdown-value">{sentimentData.breakdown.happy.toFixed(0)}%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Neutral</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill neutral"
                    style={{ width: `${sentimentData.breakdown.neutral}%` }}
                  ></div>
                </div>
                <span className="breakdown-value">{sentimentData.breakdown.neutral.toFixed(0)}%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Frustrated</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill frustrated"
                    style={{ width: `${sentimentData.breakdown.frustrated}%` }}
                  ></div>
                </div>
                <span className="breakdown-value">{sentimentData.breakdown.frustrated.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {sentimentData?.reasoning && (
            <div className="sentiment-reasoning">
              <strong>Analysis:</strong> {sentimentData.reasoning}
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">
        {/* Conversations Bar Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3><FaChartBar /> Conversations (Last {selectedDays} Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversationsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce8cd" />
              <XAxis 
                dataKey="day" 
                stroke="#556447"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#556447"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #d4e1c1',
                  borderRadius: '8px',
                  color: '#1d2a13'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#729e4d"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution Rate Pie Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3><FaChartPie /> Resolution Rate</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={resolutionPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#729e4d"
                dataKey="value"
              >
                {resolutionPieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? COLORS.aiResolved : COLORS.humanEscalated} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #d4e1c1',
                  borderRadius: '8px',
                  color: '#1d2a13'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: COLORS.aiResolved }}></span>
              <span>AI Resolved: {resolutionData?.aiResolved || 0}</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: COLORS.humanEscalated }}></span>
              <span>Human Escalated: {resolutionData?.humanEscalated || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Breakdown Pie Chart */}
      {sentimentData?.breakdown && (
        <div className="analytics-grid">
          <div className="chart-container full-width">
            <div className="chart-header">
              <h3><FaChartPie /> Sentiment Distribution</h3>
            </div>
            {sentimentPieData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No sentiment data available yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={sentimentPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      fill="#729e4d"
                      dataKey="value"
                    >
                      {sentimentPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[entry.name.toLowerCase()]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #d4e1c1',
                        borderRadius: '8px',
                        color: '#1d2a13'
                      }}
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Clean legend below the chart */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', paddingBottom: '16px', flexWrap: 'wrap' }}>
                  {sentimentLegendData.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[item.name.toLowerCase()], display: 'inline-block', flexShrink: 0 }} />
                      <span>{item.name}: <strong style={{ color: 'var(--text-primary)' }}>{item.value.toFixed(1)}%</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
