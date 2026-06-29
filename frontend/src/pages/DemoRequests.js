import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaPhone, FaBriefcase, FaCheck, FaTimes, FaEye, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import api from '../services/api';

function DemoRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      
      const response = await api.get('/demo-requests', {
        params
      });
      
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching demo requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this request and create an admin account?')) {
      return;
    }

    try {
      setApproving(true);
      
      const response = await api.post(
        `/demo-requests/${requestId}/approve`,
        {
          subscriptionPlan: 'starter',
          monthlyPrice: 2999,
          geminiTokens: 10000
        }
      );

      alert(`✅ Account created successfully!\n\nEmail: ${response.data.data.credentials.email}\nPassword: ${response.data.data.credentials.password}\n\nCredentials have been sent to the user's email.`);
      
      fetchRequests();
      window.dispatchEvent(new Event('demoRequestUpdated'));
      setShowModal(false);
    } catch (error) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    try {
      await api.post(
        `/demo-requests/${requestId}/reject`,
        { reason }
      );

      alert('Request rejected successfully');
      fetchRequests();
      window.dispatchEvent(new Event('demoRequestUpdated'));
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const getStatusBadge = (status, approved) => {
    if (approved) {
      return (
        <span className="badge-premium badge-approved" style={{
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <FaCheckCircle /> Approved
        </span>
      );
    }

    const statusConfig = {
      pending: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: <FaClock /> },
      rejected: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <FaTimesCircle /> },
      contacted: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: <FaCheckCircle /> }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className="badge-premium" style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}40`
      }}>
        {config.icon} {status}
      </span>
    );
  };

  const RequestModal = ({ request, onClose }) => {
    if (!request) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(24, 24, 27, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(63, 63, 70, 0.5)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{ color: '#fafafa', margin: 0, fontSize: '24px', fontWeight: '700' }}>
              Demo Request Details
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            {getStatusBadge(request.status, request.approved)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Name
              </label>
              <div style={{ color: '#fafafa', fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>
                {request.name}
              </div>
            </div>

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FaEnvelope style={{ marginRight: '6px' }} /> Email
              </label>
              <div style={{ color: '#fafafa', fontSize: '16px', marginTop: '8px' }}>
                {request.email}
              </div>
            </div>

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FaPhone style={{ marginRight: '6px' }} /> Phone
              </label>
              <div style={{ color: '#fafafa', fontSize: '16px', marginTop: '8px' }}>
                {request.phone}
              </div>
            </div>

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FaBriefcase style={{ marginRight: '6px' }} /> Business Name
              </label>
              <div style={{ color: '#fafafa', fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>
                {request.businessName}
              </div>
            </div>

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Website URL
              </label>
              <div style={{ fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>
                <a 
                  href={request.websiteUrl?.startsWith('http') ? request.websiteUrl : 'https://' + request.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#8b5cf6', textDecoration: 'underline' }}
                >
                  {request.websiteUrl}
                </a>
              </div>
            </div>

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Business Details
              </label>
              <div style={{
                color: '#d4d4d8',
                fontSize: '14px',
                marginTop: '8px',
                lineHeight: '1.6',
                background: 'rgba(39, 39, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(63, 63, 70, 0.3)'
              }}>
                {request.businessDetails}
              </div>
            </div>

            {request.notes && (
              <div>
                <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Notes
                </label>
                <div style={{
                  color: '#d4d4d8',
                  fontSize: '14px',
                  marginTop: '8px',
                  lineHeight: '1.6',
                  background: 'rgba(39, 39, 42, 0.6)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(63, 63, 70, 0.3)'
                }}>
                  {request.notes}
                </div>
              </div>
            )}

            <div>
              <label style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Submitted
              </label>
              <div style={{ color: '#fafafa', fontSize: '14px', marginTop: '8px' }}>
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {!request.approved && request.status === 'pending' && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(63, 63, 70, 0.3)'
            }}>
              <button
                onClick={() => handleApprove(request._id)}
                disabled={approving}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: approving ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: approving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <FaCheck /> {approving ? 'Approving...' : 'Approve & Create Account'}
              </button>
              <button
                onClick={() => handleReject(request._id)}
                disabled={approving}
                style={{
                  padding: '14px 24px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: approving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <FaTimes /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading demo requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Demo Requests</h1>
        <p className="page-subtitle">Manage demo requests and create client accounts</p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`demo-filter-btn ${filter === status ? 'active' : ''}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="table-container-premium">
        <div className="table-header-premium">
          <h2>Requests ({requests.length})</h2>
        </div>
        {requests.length > 0 ? (
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id} className="table-row-premium">
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {request.name}
                      </div>
                    </td>
                    <td className="text-muted">{request.email}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{request.businessName}</div>
                      <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                        <a 
                          href={request.websiteUrl?.startsWith('http') ? request.websiteUrl : 'https://' + request.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#8b5cf6', textDecoration: 'underline' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.websiteUrl}
                        </a>
                      </div>
                    </td>
                    <td>{getStatusBadge(request.status, request.approved)}</td>
                    <td className="text-muted">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowModal(true);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaEye /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FaBriefcase />
            </div>
            <h3 className="empty-state-title">No Demo Requests</h3>
            <p className="empty-state-text">
              {filter === 'all' 
                ? 'No demo requests have been submitted yet'
                : `No ${filter} demo requests found`}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <RequestModal
          request={selectedRequest}
          onClose={() => {
            setShowModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

export default DemoRequests;
