import React, { useState, useEffect } from 'react';
import { getConversations, updateConversation } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

function Conversations() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    escalated: ''
  });

  useEffect(() => {
    fetchConversations();
  }, [filters]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.escalated) params.escalated = filters.escalated;

      const response = await getConversations(params);
      setConversations(response.data.conversations);
      setError(null);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateConversation(id, { status: newStatus });
      fetchConversations();
      alert('Conversation status updated successfully');
    } catch (err) {
      alert('Failed to update conversation status');
      console.error('Error updating conversation:', err);
    }
  };

  const viewDetails = (conv) => {
    setSelectedConv(conv);
  };

  const closeDetails = () => {
    setSelectedConv(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading conversations...
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Conversations</h1>
          <p className="page-subtitle">Review and manage customer conversations handled by your AI assistant.</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-toolbar" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', minWidth: '130px' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Escalated</label>
          <select 
            value={filters.escalated} 
            onChange={(e) => setFilters({ ...filters, escalated: e.target.value })}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', minWidth: '130px' }}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Conversations Table */}
      <div className="table-container">
        <div className="table-header">
          <h2>All Conversations ({conversations.length})</h2>
        </div>
        
        {conversations.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Conversations</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Customer conversations will appear here after your WhatsApp connection becomes active.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/dashboard/whatsapp-connect')}
            >
              Connect WhatsApp
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Messages</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => (
                <tr key={conv._id}>
                  <td><strong>{conv.customerName}</strong></td>
                  <td>{conv.customerPhone}</td>
                  <td>{conv.messages.length}</td>
                  <td>
                    <span className={`badge badge-${conv.status}`}>
                      {conv.status.toUpperCase()}
                    </span>
                    {conv.escalated && (
                      <span className="badge badge-urgent" style={{ marginLeft: '5px' }}>
                        ESCALATED
                      </span>
                    )}
                  </td>
                  <td>{new Date(conv.createdAt).toLocaleString()}</td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => viewDetails(conv)}
                      style={{ marginRight: '6px', fontSize: '12.5px', padding: '6px 12px' }}
                    >
                      View
                    </button>
                    {conv.status === 'active' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleStatusUpdate(conv._id, 'resolved')}
                        style={{ fontSize: '12.5px', padding: '6px 12px' }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conversation Details Modal */}
      {selectedConv && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)' }}>Conversation Details</h2>
              <button className="btn btn-secondary" onClick={closeDetails}>Close</button>
            </div>

            <div style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {selectedConv.customerName}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Phone:</strong> {selectedConv.customerPhone}</p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>{' '}
                <span className={`badge badge-${selectedConv.status}`}>{selectedConv.status.toUpperCase()}</span>
                {selectedConv.escalated && (
                  <span className="badge badge-urgent" style={{ marginLeft: '5px' }}>ESCALATED</span>
                )}
              </p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Created:</strong> {new Date(selectedConv.createdAt).toLocaleString()}</p>
              {selectedConv.escalated && selectedConv.escalationReason && (
                <p><strong style={{ color: 'var(--text-primary)' }}>Escalation Reason:</strong> {selectedConv.escalationReason}</p>
              )}
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Messages</h3>
            <div style={{ maxHeight: '400px', overflow: 'auto', paddingRight: '8px' }}>
              {selectedConv.messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message message-${msg.role}`}
                  style={{
                    marginBottom: '15px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: msg.role === 'user' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div className="message-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{msg.role === 'user' ? 'Customer' : 'Assistant'}</strong> • {' '}
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                    {msg.intent && msg.intent !== 'other' && (
                      <span style={{ fontWeight: '600', color: 'var(--brand)' }}>
                        ({msg.intent.replace(/_/g, ' ').toUpperCase()})
                      </span>
                    )}
                  </div>
                  <div className="message-content" style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Conversations;
