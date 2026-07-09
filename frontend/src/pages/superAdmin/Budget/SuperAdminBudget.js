import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaRobot, 
  FaDollarSign, 
  FaWallet, 
  FaCoins, 
  FaExclamationTriangle, 
  FaArrowLeft 
} from 'react-icons/fa';
import { getSuperAdminAnalytics } from '../../../services/api';
import '../Dashboard/SuperAdmin.css'; // Reuse existing glassmorphic SuperAdmin styles

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

function SuperAdminBudget() {
  const [analytics, setAnalytics] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ geminiApiFundsAdded: 0 });
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const analyticsRes = await getSuperAdminAnalytics();
      setAnalytics(analyticsRes.data.data);

      // Fetch settings
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const settingsRes = await axios.get(`${API_BASE}/super-admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.data.success) {
        setGlobalSettings(settingsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddGeminiFunds = async (e) => {
    e.preventDefault();
    if (!addFundsAmount || isNaN(addFundsAmount) || Number(addFundsAmount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const currentFunds = Number(globalSettings.geminiApiFundsAdded || 0);
    const newFunds = currentFunds + Number(addFundsAmount);
    
    try {
      setSettingsLoading(true);
      const res = await axios.post(
        `${API_BASE}/super-admin/settings`,
        { settings: { geminiApiFundsAdded: newFunds } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setGlobalSettings({ ...globalSettings, geminiApiFundsAdded: newFunds });
        setAddFundsAmount('');
        await fetchData(); // Reload analytics to update estimated/remaining stats
        alert(`Successfully added $${Number(addFundsAmount).toFixed(2)} to Gemini API funds!`);
      }
    } catch (err) {
      alert('Failed to update Gemini API funds');
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fafafa'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container super-admin-page">
      {/* Header and Back Button */}
      <div className="page-header super-admin-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title super-admin-title">
            <FaCoins className="crown-icon" /> Gemini API Cost & Budget
          </h1>
          <p className="page-subtitle">
            Manage your Gemini API key usage billing, token consumption, and added funds.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/super-admin')}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaArrowLeft /> Back to Users
        </button>
      </div>

      {analytics && (
        <>
          {/* Low Funds Warning Alert */}
          {analytics.remainingFunds <= 5 && (
            <div className="budget-alert-warning">
              <FaExclamationTriangle style={{ fontSize: '24px', flexShrink: 0 }} />
              <div>
                <strong>Warning: Gemini API funds are extremely low!</strong> Your remaining balance is only <strong>${Number(analytics.remainingFunds).toFixed(4)}</strong>. Please refill your budget below to prevent bot automated responses from stopping.
              </div>
            </div>
          )}

          {/* Stat Cards Grid */}
          <div className="analytics-cards" style={{ marginBottom: '32px' }}>
            {/* Total Tokens Used */}
            <div className="stat-card gemini" style={{ padding: '24px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <FaRobot />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>Total Tokens Used</h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{analytics.totalGeminiTokens.toLocaleString()}</p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Used by all active merchants</small>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="stat-card cost" style={{ padding: '24px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <FaDollarSign />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>Estimated Cost</h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>${Number(analytics.estimatedGeminiCost).toFixed(4)}</p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calculated at $0.15 / 1M tokens</small>
              </div>
            </div>

            {/* Total Funds Added */}
            <div className="stat-card budget" style={{ padding: '24px' }}>
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <FaWallet />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>Total Funds Added</h3>
                <p className="stat-value" style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>${Number(analytics.geminiApiFundsAdded).toFixed(2)}</p>
                <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total budget added by admin</small>
              </div>
            </div>

            {/* Remaining Balance */}
            <div className={`stat-card budget ${analytics.remainingFunds <= 5 ? 'low-funds' : ''}`} style={{ padding: '24px' }}>
              <div className="stat-icon" style={{ 
                backgroundColor: analytics.remainingFunds <= 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: analytics.remainingFunds <= 5 ? '#ef4444' : '#10b981'
              }}>
                <FaCoins />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>Remaining Balance</h3>
                <p className="stat-value" style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: analytics.remainingFunds <= 5 ? 'var(--danger)' : 'var(--text-primary)' 
                }}>
                  ${Number(analytics.remainingFunds).toFixed(4)}
                </p>
                <small style={{ fontSize: '12px', color: analytics.remainingFunds <= 5 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {analytics.remainingFunds <= 5 ? 'Quota Alert: Action Required' : 'Active and responding'}
                </small>
              </div>
            </div>
          </div>

          {/* Add Budget Refill Card */}
          <div className="budget-refill-card">
            <h3>Refill API Budget Funds</h3>
            <form onSubmit={handleAddGeminiFunds} className="budget-input-group">
              <div className="budget-input-label">Amount ($):</div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 50.00"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                className="budget-input"
              />
              <button
                type="submit"
                disabled={settingsLoading}
                className="budget-btn-submit"
              >
                {settingsLoading ? 'Refilling...' : 'Add Funds'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default SuperAdminBudget;
