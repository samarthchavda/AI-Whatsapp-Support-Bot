import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaHeadset, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaComments, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationCircle, 
  FaWhatsapp, 
  FaEnvelope, 
  FaBook, 
  FaPaperPlane, 
  FaTimes, 
  FaTag, 
  FaCheck, 
  FaExternalLinkAlt, 
  FaSyncAlt,
  FaShieldAlt,
  FaShopify,
  FaCode,
  FaCoins
} from 'react-icons/fa';
import { 
  getSupportTickets, 
  createSupportTicket, 
  getSupportTicketDetails, 
  replySupportTicket, 
  closeSupportTicket 
} from '../../../services/api';
import './SupportCenter.css';

const CATEGORIES = [
  { id: 'technical', label: 'Technical Bug / Issue', icon: FaCode },
  { id: 'shopify_integration', label: 'Shopify Store Integration', icon: FaShopify },
  { id: 'whatsapp_api', label: 'WhatsApp Cloud API', icon: FaWhatsapp },
  { id: 'billing', label: 'Billing & Subscription', icon: FaCoins },
  { id: 'bot_training', label: 'AI Bot Training & FAQs', icon: FaBook },
  { id: 'feature_request', label: 'Feature Suggestion', icon: FaTag },
  { id: 'other', label: 'General Inquiry', icon: FaComments }
];

const PRIORITIES = [
  { id: 'low', label: 'Low', badgeClass: 'priority-low' },
  { id: 'medium', label: 'Medium', badgeClass: 'priority-medium' },
  { id: 'high', label: 'High', badgeClass: 'priority-high' },
  { id: 'urgent', label: 'Urgent 🚨', badgeClass: 'priority-urgent' }
];

export default function SupportCenter({ admin }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'shopify_integration',
    priority: 'medium',
    description: '',
    attachmentUrl: ''
  });

  // Ticket Detail / Reply Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await getSupportTickets(params);
      if (res.data && res.data.success) {
        setTickets(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err.response?.data?.error || 'Unable to load support tickets. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenDetail = async (ticketId) => {
    try {
      const res = await getSupportTicketDetails(ticketId);
      if (res.data && res.data.success) {
        setSelectedTicket(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to open ticket details.');
    }
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      alert('Please fill in both the subject and the problem description.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subject: formData.subject.trim(),
        category: formData.category,
        priority: formData.priority,
        description: formData.description.trim(),
        attachments: formData.attachmentUrl.trim() ? [formData.attachmentUrl.trim()] : []
      };

      const res = await createSupportTicket(payload);
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Support ticket submitted successfully!');
        setFormData({
          subject: '',
          category: 'shopify_integration',
          priority: 'medium',
          description: '',
          attachmentUrl: ''
        });
        setIsCreateModalOpen(false);
        fetchTickets();
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const res = await replySupportTicket(selectedTicket._id, { message: replyText.trim() });
      if (res.data && res.data.success) {
        setSelectedTicket(res.data.data);
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Are you sure you want to mark this support ticket as resolved?')) return;

    try {
      setClosingTicket(true);
      const res = await closeSupportTicket(selectedTicket._id, { resolutionNote: 'Resolved by merchant.' });
      if (res.data && res.data.success) {
        setSelectedTicket(res.data.data);
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close ticket.');
    } finally {
      setClosingTicket(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="status-badge status-open"><FaExclamationCircle /> Open</span>;
      case 'in_progress':
        return <span className="status-badge status-in-progress"><FaClock /> In Progress</span>;
      case 'resolved':
      case 'closed':
        return <span className="status-badge status-resolved"><FaCheckCircle /> Resolved</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getCategoryLabel = (catKey) => {
    const found = CATEGORIES.find(c => c.id === catKey);
    return found ? found.label : catKey;
  };

  return (
    <div className="support-center-page">
      {/* Page Header */}
      <div className="support-header">
        <div className="header-info">
          <div className="title-row">
            <div className="header-icon-box">
              <FaHeadset />
            </div>
            <div>
              <h1 className="support-title">Customer Support & Helpdesk</h1>
              <p className="support-subtitle">
                Submit assistance requests, track ticket status in real-time, or connect directly with our engineering team.
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="btn-create-ticket"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FaPlus /> New Support Request
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="support-alert-success">
          <FaCheck /> {successMsg}
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="support-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper total">
            <FaHeadset />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Tickets</div>
            <div className="stat-value">{stats.total || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper open">
            <FaExclamationCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Open / Awaiting Action</div>
            <div className="stat-value">{stats.open || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper progress">
            <FaClock />
          </div>
          <div className="stat-content">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{stats.in_progress || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper resolved">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Resolved Tickets</div>
            <div className="stat-value">{stats.resolved || 0}</div>
          </div>
        </div>
      </div>

      {/* Quick Direct Help & Knowledge Base Cards */}
      <div className="quick-help-banner">
        <div className="quick-help-card whatsapp-channel">
          <div className="channel-icon">
            <FaWhatsapp />
          </div>
          <div className="channel-info">
            <h3>Urgent WhatsApp Helpdesk</h3>
            <p>Connect with a dedicated integration specialist right away on WhatsApp for live support.</p>
            <a 
              href="https://wa.me/919876543210?text=Hello%20Kwickbot%20Support,%20I%20need%20assistance%20with%20my%20account" 
              target="_blank" 
              rel="noreferrer" 
              className="channel-action-link"
            >
              Chat on WhatsApp <FaExternalLinkAlt />
            </a>
          </div>
        </div>

        <div className="quick-help-card docs-channel">
          <div className="channel-icon">
            <FaBook />
          </div>
          <div className="channel-info">
            <h3>Shopify & Bot Documentation</h3>
            <p>Step-by-step connection guides with screenshots for Shopify custom apps, webhooks & AI training.</p>
            <div className="doc-links-row">
              <a 
                href="/guide/Shopify_Kwickbot_Integration_Guide.pdf" 
                target="_blank" 
                rel="noreferrer" 
                className="doc-pill-btn"
              >
                Shopify Connection Guide (PDF)
              </a>
              <a 
                href="/guide/Kwickbot_AI_Agent_KnowledgeBase_Catalog.pdf" 
                target="_blank" 
                rel="noreferrer" 
                className="doc-pill-btn"
              >
                AI Agent Handbook (PDF)
              </a>
            </div>
          </div>
        </div>

        <div className="quick-help-card sla-channel">
          <div className="channel-icon">
            <FaShieldAlt />
          </div>
          <div className="channel-info">
            <h3>Dedicated Enterprise SLA</h3>
            <p>Your tickets receive priority triage by our core engineering team within <strong>&lt; 2 hours</strong>.</p>
            <span className="email-hint">
              <FaEnvelope /> Direct Email: <strong>support@kwickbot.in</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tickets Management Panel */}
      <div className="support-tickets-panel">
        <div className="panel-toolbar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by Ticket ID (e.g. TKT-1001) or Subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="filter-group">
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <button className="btn-refresh" onClick={fetchTickets} title="Refresh Tickets">
              <FaSyncAlt className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tickets Table / List */}
        {loading ? (
          <div className="support-loading-state">
            <div className="spinner"></div>
            <span>Fetching support tickets...</span>
          </div>
        ) : error ? (
          <div className="support-error-state">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="support-empty-state">
            <div className="empty-icon-circle">
              <FaHeadset />
            </div>
            <h3>No Support Tickets Found</h3>
            <p>
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No tickets match your active filter criteria. Try clearing search filters.'
                : 'Need help with your Shopify integration, WhatsApp Cloud API, or bot settings? Submit a request above!'}
            </p>
            <button 
              className="btn-create-ticket"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <FaPlus /> Create Your First Ticket
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject & Summary</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket._id} className="ticket-row" onClick={() => handleOpenDetail(ticket._id)}>
                    <td className="ticket-id-cell">
                      <span className="ticket-id-badge">{ticket.ticketId}</span>
                    </td>
                    <td className="ticket-subject-cell">
                      <div className="ticket-subject-title">{ticket.subject}</div>
                      <div className="ticket-subject-snippet">{ticket.description}</div>
                    </td>
                    <td>
                      <span className="category-pill">{getCategoryLabel(ticket.category)}</span>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${ticket.priority}`}>
                        {ticket.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="ticket-date-cell">
                      {new Date(ticket.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="text-right action-cell" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-view-thread"
                        onClick={() => handleOpenDetail(ticket._id)}
                      >
                        <FaComments /> View Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create New Support Ticket */}
      {isCreateModalOpen && (
        <div className="support-modal-backdrop" onClick={() => !submitting && setIsCreateModalOpen(false)}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <FaHeadset className="modal-icon" />
                <h3>Submit New Support Request</h3>
              </div>
              <button 
                className="btn-close-modal" 
                onClick={() => !submitting && setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="modal-form">
              <div className="form-group">
                <label>Issue Subject / Title <span className="required">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Products from Shopify not showing images on WhatsApp" 
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>Department / Category <span className="required">*</span></label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label>Priority Level</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Detailed Description & Steps to Reproduce <span className="required">*</span></label>
                <textarea 
                  rows="5"
                  placeholder="Please describe what happened, expected behavior, store name, or relevant phone number..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>Screenshot or Reference URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://imgur.com/... or Google Drive public link" 
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit-ticket"
                  disabled={submitting}
                >
                  <FaPaperPlane /> {submitting ? 'Submitting Request...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Ticket Conversation Thread & Details */}
      {selectedTicket && (
        <div className="support-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="support-modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <span className="ticket-id-badge large">{selectedTicket.ticketId}</span>
                <div className="ticket-header-meta">
                  <h3>{selectedTicket.subject}</h3>
                  <div className="meta-pills">
                    {getStatusBadge(selectedTicket.status)}
                    <span className="category-pill">{getCategoryLabel(selectedTicket.category)}</span>
                    <span className={`priority-badge priority-${selectedTicket.priority}`}>
                      {selectedTicket.priority?.toUpperCase()} Priority
                    </span>
                  </div>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedTicket(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="ticket-thread-body">
              {/* Messages list */}
              <div className="messages-stream">
                {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                  <div 
                    key={msg._id || idx} 
                    className={`message-bubble-wrapper ${msg.sender === 'merchant' ? 'from-merchant' : msg.sender === 'system' ? 'from-system' : 'from-agent'}`}
                  >
                    <div className="message-sender-name">
                      {msg.sender === 'merchant' ? 'You' : msg.sender === 'system' ? 'System Notification' : `Kwickbot Support (${msg.senderName || 'Agent'})`}
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="message-content">
                      {msg.message}
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="message-attachments">
                        {msg.attachments.map((att, aIdx) => (
                          <a key={aIdx} href={att} target="_blank" rel="noreferrer" className="attachment-link">
                            <FaExternalLinkAlt /> View Attachment
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleSendReply} className="reply-form">
                  <textarea 
                    rows="3" 
                    placeholder="Type your reply or additional information here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                  ></textarea>

                  <div className="reply-actions-row">
                    <button 
                      type="button" 
                      className="btn-resolve-ticket"
                      onClick={handleCloseTicket}
                      disabled={closingTicket || selectedTicket.status === 'resolved'}
                    >
                      <FaCheckCircle /> {closingTicket ? 'Closing...' : 'Mark as Resolved'}
                    </button>

                    <button 
                      type="submit" 
                      className="btn-send-reply"
                      disabled={sendingReply || !replyText.trim()}
                    >
                      <FaPaperPlane /> {sendingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
