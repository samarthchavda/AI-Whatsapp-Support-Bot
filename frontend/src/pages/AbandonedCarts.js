import React, { useState, useEffect } from 'react';
import { getAbandonedCarts, getAbandonedCartStats, sendAbandonedCartReminder } from '../services/api';
import { FaShoppingCart, FaCheckCircle, FaPaperPlane, FaClock, FaSearch, FaExternalLinkAlt } from 'react-icons/fa';
import './AbandonedCarts.css';

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
  AED: 'د.إ'
};

const getCurrencySymbol = (currencyCode) => {
  return currencySymbols[currencyCode] || '$';
};

const formatCurrency = (amount, currencyCode) => {
  const code = currencyCode || 'USD';
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code
    }).format(amount);
  } catch (e) {
    const symbol = getCurrencySymbol(code);
    return `${symbol}${Number(amount).toFixed(2)}`;
  }
};

function AbandonedCarts({ admin }) {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [searchInput, setSearchInput] = useState('');

  const storeCurrency = admin?.storeCurrency || 'USD';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchCarts();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search]);

  const fetchCarts = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await getAbandonedCarts(params);
      if (response.data && response.data.success) {
        setCarts(response.data.carts);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load abandoned carts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getAbandonedCartStats();
      if (response.data && response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSendReminder = async (id) => {
    try {
      setSendingReminderId(id);
      const response = await sendAbandonedCartReminder(id);
      if (response.data && response.data.success) {
        alert('WhatsApp recovery reminder sent successfully!');
        fetchCarts();
        fetchStats();
      } else {
        alert(response.data.error || 'Failed to send WhatsApp reminder');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send recovery message');
      console.error(err);
    } finally {
      setSendingReminderId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'recovered':
        return 'status-badge status-recovered';
      case 'reminder_sent':
        return 'status-badge status-reminded';
      default:
        return 'status-badge status-abandoned';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'recovered':
        return 'Recovered';
      case 'reminder_sent':
        return 'Reminded';
      default:
        return 'Abandoned';
    }
  };

  return (
    <div className="abandoned-carts-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Abandoned Cart Recovery</h1>
          <p className="page-subtitle">Track, remind, and recover checkout abandonment automatically over WhatsApp.</p>
        </div>
      </div>

      {/* Analytics KPI Dashboard */}
      {stats && (
        <div className="carts-stats-grid">
          <div className="carts-stat-card glassmorphism-card">
            <div className="carts-stat-icon-wrapper recovery-rate">
              <FaCheckCircle className="carts-stat-icon" />
            </div>
            <div className="carts-stat-details">
              <span className="carts-stat-value">{stats.recoveryRate}%</span>
              <span className="carts-stat-label">Recovery Rate</span>
              <div className="carts-stat-progress-bar-container">
                <div 
                  className="carts-stat-progress-bar-fill" 
                  style={{ width: `${Math.min(stats.recoveryRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="carts-stat-card glassmorphism-card">
            <div className="carts-stat-icon-wrapper recovered-rev">
              <FaShoppingCart className="carts-stat-icon" />
            </div>
            <div className="carts-stat-details">
              <span className="carts-stat-value">{formatCurrency(stats.recoveredRevenue, storeCurrency)}</span>
              <span className="carts-stat-label">Recovered Revenue</span>
              <span className="carts-stat-meta">{stats.recoveredCarts} carts recovered</span>
            </div>
          </div>

          <div className="carts-stat-card glassmorphism-card">
            <div className="carts-stat-icon-wrapper abandoned-rev">
              <FaClock className="carts-stat-icon" />
            </div>
            <div className="carts-stat-details">
              <span className="carts-stat-value">{formatCurrency(stats.abandonedRevenue, storeCurrency)}</span>
              <span className="carts-stat-label">Lost/Abandoned Revenue</span>
              <span className="carts-stat-meta">{stats.abandonedCarts} carts unpaid</span>
            </div>
          </div>

          <div className="carts-stat-card glassmorphism-card">
            <div className="carts-stat-icon-wrapper total-carts">
              <FaPaperPlane className="carts-stat-icon" />
            </div>
            <div className="carts-stat-details">
              <span className="carts-stat-value">{stats.totalCarts}</span>
              <span className="carts-stat-label">Total Carts Tracked</span>
              <span className="carts-stat-meta">{stats.reminderSentCarts} reminders dispatched</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="filters-section glassmorphism-card">
        <div className="carts-search-box">
          <FaSearch className="carts-search-icon" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="abandoned">Abandoned (Unreminded)</option>
            <option value="reminder_sent">Reminded</option>
            <option value="recovered">Recovered</option>
          </select>
        </div>
      </div>

      {/* Carts Table */}
      <div className="table-wrapper glassmorphism-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading checkout records...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchCarts} className="btn-retry">Retry</button>
          </div>
        ) : carts.length === 0 ? (
          <div className="empty-state">
            <FaShoppingCart className="empty-icon" />
            <h3>No Abandoned Carts Found</h3>
            <p>Once customer checkout abandonment events are parsed from Shopify, they will appear here.</p>
          </div>
        ) : (
          <table className="carts-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Cart Details</th>
                <th>Cart Value</th>
                <th>Status</th>
                <th>Date</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((cart) => (
                <tr key={cart._id} className="table-row">
                  <td>
                    <div className="customer-info">
                      <div className="customer-avatar">
                        {cart.customerName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="customer-name">{cart.customerName}</div>
                        <div className="customer-contact">
                          <span>{cart.customerPhone}</span>
                          {cart.customerEmail && <span className="contact-dot">•</span>}
                          {cart.customerEmail && <span>{cart.customerEmail}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cart-items-preview">
                      {cart.items.map((item, idx) => (
                        <div key={idx} className="preview-item">
                          {item.productName} <span className="item-qty">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="cart-value">
                    {formatCurrency(cart.totalAmount, storeCurrency)}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(cart.status)}>
                      {getStatusLabel(cart.status)}
                    </span>
                  </td>
                  <td className="cart-date">
                    {new Date(cart.abandonedAt).toLocaleString()}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {cart.checkoutUrl && (
                        <a 
                          href={cart.checkoutUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-action btn-view-link"
                          title="Open Shopify Checkout Link"
                        >
                          <FaExternalLinkAlt /> View Checkout
                        </a>
                      )}
                      
                      {cart.status !== 'recovered' && (
                        <button
                          onClick={() => handleSendReminder(cart._id)}
                          disabled={sendingReminderId === cart._id}
                          className="btn-action btn-send-reminder"
                        >
                          {sendingReminderId === cart._id ? 'Sending...' : 'Send Reminder'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AbandonedCarts;
