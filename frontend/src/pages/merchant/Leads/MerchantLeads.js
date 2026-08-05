import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUserTag, FaSearch, FaFilter, FaLock, FaCrown, FaWhatsapp, FaCheckCircle, FaClock, FaCommentDots, FaTrashAlt, FaPhoneAlt, FaLayerGroup } from 'react-icons/fa';
import api from '../../../services/api';
import './MerchantLeads.css';

const MerchantLeads = ({ admin }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedMessage, setRestrictedMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });

  useEffect(() => {
    // Check client-side plan gating first
    if (admin && admin.subscriptionPlan === 'starter') {
      setIsRestricted(true);
      setRestrictedMessage('WhatsApp Product Leads CRM is exclusively available on Growth and Scale plans.');
      setLoading(false);
      return;
    }

    fetchLeads();
  }, [admin, statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchant-leads', {
        params: { status: statusFilter, search: searchTerm }
      });
      
      setLeads(res.data.data || []);
      setMetrics(res.data.metrics || { total: 0, new: 0, contacted: 0, converted: 0 });
      setIsRestricted(false);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'PLAN_RESTRICTED') {
        setIsRestricted(true);
        setRestrictedMessage(err.response.data.message);
      } else {
        console.error('Error fetching merchant leads:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.patch(`/merchant-leads/${leadId}/status`, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      fetchLeads();
    } catch (err) {
      alert('Failed to update lead status');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead record?')) return;
    try {
      await api.delete(`/merchant-leads/${leadId}`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.userMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="merchant-leads-container">
      {/* Page Header */}
      <div className="merchant-leads-header">
        <div>
          <h1 className="merchant-leads-title">
            <FaUserTag className="header-icon" /> WhatsApp Product Inquiry Leads
          </h1>
          <p className="merchant-leads-subtitle">
            Capture, track, and convert every customer who inquires about products on WhatsApp in real-time.
          </p>
        </div>
      </div>

      {/* Plan Gating Banner for Starter Plan */}
      {isRestricted ? (
        <div className="leads-restricted-card">
          <div className="restricted-icon-box">
            <FaLock />
          </div>
          <h2 className="restricted-title">WhatsApp Product Leads CRM</h2>
          <p className="restricted-description">
            {restrictedMessage || 'This feature is exclusively available on Growth and Scale plans. Upgrade now to view live WhatsApp product leads, customer phone numbers, and inquiry histories.'}
          </p>
          <Link to="/dashboard/billing" className="upgrade-plan-btn">
            <FaCrown /> Upgrade to Growth Plan
          </Link>
        </div>
      ) : (
        <>
          {/* Top Metrics Cards */}
          <div className="leads-metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-box total-icon">
                <FaLayerGroup />
              </div>
              <div>
                <div className="metric-value">{metrics.total}</div>
                <div className="metric-label">Total WhatsApp Leads Captured</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box new-icon">
                <FaClock />
              </div>
              <div>
                <div className="metric-value">{metrics.new}</div>
                <div className="metric-label">New Uncontacted Leads</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box contacted-icon">
                <FaCommentDots />
              </div>
              <div>
                <div className="metric-value">{metrics.contacted}</div>
                <div className="metric-label">In Conversation / Contacted</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-box converted-icon">
                <FaCheckCircle />
              </div>
              <div>
                <div className="metric-value">{metrics.converted}</div>
                <div className="metric-label">Converted Sales</div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="leads-controls-bar">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search leads by phone, customer name, or question..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="leads-search-input"
              />
            </div>

            <div className="filter-select-wrapper">
              <FaFilter className="filter-icon" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter-select"
              >
                <option value="all">All Lead Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Leads Table / Cards */}
          {loading ? (
            <div className="leads-loading">
              <div className="spinner"></div>
              <p>Loading WhatsApp Product Leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="leads-empty-card">
              <FaUserTag className="empty-icon" />
              <h3>No WhatsApp Product Leads Found</h3>
              <p>When customers ask product questions on WhatsApp, their contact details and inquiry history will automatically appear here!</p>
            </div>
          ) : (
            <div className="leads-table-wrapper">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Product / Inquiry</th>
                    <th>Customer Message</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead._id}>
                      <td>
                        <div className="customer-info-box">
                          <FaPhoneAlt className="phone-icon" />
                          <div>
                            <div className="customer-phone">{lead.customerPhone}</div>
                            <div className="customer-name">{lead.customerName || 'WhatsApp Customer'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="product-tag">{lead.productName}</span>
                      </td>
                      <td>
                        <div className="message-snippet" title={lead.userMessage}>
                          "{lead.userMessage}"
                        </div>
                      </td>
                      <td>
                        <span className="lead-date">
                          {new Date(lead.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                      <td>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`lead-status-dropdown status-${lead.status}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td>
                        <div className="lead-action-btns">
                          <a 
                            href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="wa-direct-btn"
                            title="Chat on WhatsApp"
                          >
                            <FaWhatsapp /> Reply
                          </a>
                          <button 
                            className="delete-lead-btn"
                            onClick={() => handleDeleteLead(lead._id)}
                            title="Delete Lead Record"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MerchantLeads;
