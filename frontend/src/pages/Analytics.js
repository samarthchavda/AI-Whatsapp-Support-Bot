import React, { useState, useEffect } from 'react';
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
import { FaChartBar, FaChartPie, FaSmile, FaSync } from 'react-icons/fa';
import './Analytics.css';

function Analytics() {
  const [conversationsData, setConversationsData] = useState([]);
  const [resolutionData, setResolutionData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all analytics data using central API client
      const [conversationsRes, resolutionRes, sentimentRes] = await Promise.all([
        api.get('/analytics/conversations-per-day'),
        api.get('/analytics/resolution-rate'),
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

  // Prepare pie chart data for sentiment breakdown
  const sentimentPieData = sentimentData?.breakdown ? [
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

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Analytics Overview</h1>
          <p className="page-subtitle">Insights and performance metrics</p>
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
            <div className="sentiment-emoji">
              {sentimentData?.emoji || '😐'}
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
                <span className="breakdown-label">😊 Happy</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill happy"
                    style={{ width: `${sentimentData.breakdown.happy}%` }}
                  ></div>
                </div>
                <span className="breakdown-value">{sentimentData.breakdown.happy.toFixed(0)}%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">😐 Neutral</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill neutral"
                    style={{ width: `${sentimentData.breakdown.neutral}%` }}
                  ></div>
                </div>
                <span className="breakdown-value">{sentimentData.breakdown.neutral.toFixed(0)}%</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">😤 Frustrated</span>
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
            <h3><FaChartBar /> Conversations (Last 7 Days)</h3>
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                  outerRadius={80}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
