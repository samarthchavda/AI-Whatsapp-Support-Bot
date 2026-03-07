import React, { useState, useEffect } from 'react';
import { getConversations, updateConversation } from '../services/api';

function Conversations() {
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
      <h1>Conversations</h1>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Escalated</label>
          <select 
            value={filters.escalated} 
            onChange={(e) => setFilters({ ...filters, escalated: e.target.value })}
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
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Messages</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <tr key={conv._id}>
                  <td>{conv.customerName}</td>
                  <td>{conv.customerPhone}</td>
                  <td>{conv.messages.length}</td>
                  <td>
                    <span className={`badge badge-${conv.status}`}>
                      {conv.status}
                    </span>
                    {conv.escalated && (
                      <span className="badge badge-urgent" style={{ marginLeft: '5px' }}>
                        Escalated
                      </span>
                    )}
                  </td>
                  <td>{new Date(conv.createdAt).toLocaleString()}</td>
                  <td>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => viewDetails(conv)}
                      style={{ marginRight: '5px', fontSize: '12px', padding: '5px 10px' }}
                    >
                      View
                    </button>
                    {conv.status === 'active' && (
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleStatusUpdate(conv._id, 'resolved')}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  No conversations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Conversation Details</h2>
              <button className="btn btn-secondary" onClick={closeDetails}>Close</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>Customer:</strong> {selectedConv.customerName}</p>
              <p><strong>Phone:</strong> {selectedConv.customerPhone}</p>
              <p><strong>Status:</strong> <span className={`badge badge-${selectedConv.status}`}>{selectedConv.status}</span></p>
              <p><strong>Created:</strong> {new Date(selectedConv.createdAt).toLocaleString()}</p>
              {selectedConv.escalated && (
                <p><strong>Escalation Reason:</strong> {selectedConv.escalationReason}</p>
              )}
            </div>

            <h3>Messages</h3>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {selectedConv.messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message message-${msg.role}`}
                  style={{
                    marginBottom: '15px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5'
                  }}
                >
                  <div className="message-header">
                    <strong>{msg.role === 'user' ? 'Customer' : 'Assistant'}</strong> • {' '}
                    {new Date(msg.timestamp).toLocaleString()}
                    {msg.intent && msg.intent !== 'other' && (
                      <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666' }}>
                        ({msg.intent.replace(/_/g, ' ')})
                      </span>
                    )}
                  </div>
                  <div className="message-content">{msg.content}</div>
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
