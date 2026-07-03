import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
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
    aiResolved: '#10b981',
    humanEscalated: '#f59e0b',
    happy: '#10b981',
    neutral: '#6366f1',
    frustrated: '#ef4444'
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
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (plan === 'starter') {
    return (
      <div className="container" style={{ position: 'relative' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics Overview</h1>
            <p className="page-subtitle">Insights and performance metrics</p>
          </div>
        </div>
        
        <div className="analytics-paywall-card" style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed rgba(236, 72, 153, 0.3)',
          borderRadius: '16px',
          padding: '60px 20px',
          textAlign: 'center',
          marginTop: '30px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f472b6', marginBottom: '10px' }}>
            Advanced Analytics is Locked
          </h2>
          <p style={{ maxWidth: '500px', margin: '0 auto 24px', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Upgrade your plan to the Professional or Enterprise tier to unlock real-time message volume charts, resolution ratios, and sentiment analysis for your customers.
          </p>
          <Link to="/dashboard/billing" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            color: 'white',
            fontWeight: 'bold',
            padding: '12px 30px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
            transition: 'all 0.2s ease'
          }}>
            Upgrade Subscription Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
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
              {sentimentData?.sentiment === 'happy' && <FaSmile style={{ color: '#10b981' }} />}
              {sentimentData?.sentiment === 'neutral' && <FaMeh style={{ color: '#6366f1' }} />}
              {sentimentData?.sentiment === 'frustrated' && <FaFrown style={{ color: '#ef4444' }} />}
              {!sentimentData?.sentiment && <FaMeh style={{ color: '#6366f1' }} />}
            </div>
            <div className="sentiment-info">
              <h2 className={`sentiment-${sentimentData?.sentiment || 'neutral'}`}>
                {sentimentData?.sentiment ? 
                  sentimentData.sentiment.charAt(0).toUpperCase() + sentimentData.sentiment.slice(1) 
                  : 'Neutral'}
              </h2>
              <p>Confidence: {sentimentData?.confidence ? (sentimentData.confidence * 100).toFixed(0) : 0}%</p>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.3)" />
              <XAxis 
                dataKey="day" 
                stroke="#a1a1aa"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#a1a1aa"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(39, 39, 42, 0.95)',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '8px',
                  color: '#fafafa'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#6366f1"
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
                fill="#8884d8"
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
                  background: 'rgba(39, 39, 42, 0.95)',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '8px',
                  color: '#fafafa'
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#71717a', fontSize: '14px' }}>
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
                      fill="#8884d8"
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
                        background: 'rgba(39, 39, 42, 0.95)',
                        border: '1px solid rgba(63, 63, 70, 0.5)',
                        borderRadius: '8px',
                        color: '#fafafa'
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
