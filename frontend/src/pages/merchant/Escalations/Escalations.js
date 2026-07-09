import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEscalations, updateEscalation } from '../../../services/api';

function Escalations({ admin }) {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEsc, setSelectedEsc] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });

  const plan = (admin?.subscriptionPlan || JSON.parse(localStorage.getItem('admin') || '{}')?.subscriptionPlan || 'starter').toLowerCase();

  useEffect(() => {
    if (plan !== 'starter') {
      fetchEscalations();
      // Refresh every 30 seconds
      const interval = setInterval(fetchEscalations, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [filters, plan]);

  const fetchEscalations = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;

      const response = await getEscalations(params);
      setEscalations(response.data.escalations);
      setError(null);
    } catch (err) {
      setError('Failed to load escalations');
      console.error('Error fetching escalations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, resolution = null) => {
    try {
      const data = { status: newStatus };
      if (resolution) data.resolution = resolution;

      await updateEscalation(id, data);
      fetchEscalations();
      setSelectedEsc(null);
      alert('Escalation updated successfully');
    } catch (err) {
      alert('Failed to update escalation');
      console.error('Error updating escalation:', err);
    }
  };

  const viewDetails = (esc) => {
    setSelectedEsc(esc);
  };

  const closeDetails = () => {
    setSelectedEsc(null);
  };

  const handleResolve = (e) => {
    e.preventDefault();
    const resolution = e.target.resolution.value;
    if (resolution) {
      handleStatusUpdate(selectedEsc._id, 'resolved', resolution);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading escalations...
      </div>
    );
  }

  if (plan === 'starter') {
    return (
      <div className="container" style={{ position: 'relative' }}>
        <h1>Escalations</h1>
        
        <div className="escalations-paywall-card" style={{
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
            Handoff Escalations is Locked
          </h2>
          <p style={{ maxWidth: '550px', margin: '0 auto 24px', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
            Upgrade your plan to the Professional or Enterprise tier to unlock Live Chat human escalations, configure automatic sentiment takeover alerts, and manage tickets.
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
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Escalations</h1>
          <p className="page-subtitle">Review and manage conversations transferred to human support.</p>
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Priority</label>
          <select 
            value={filters.priority} 
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', minWidth: '130px' }}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Escalations Table */}
      <div className="table-container">
        <div className="table-header">
          <h2>All Escalations ({escalations.length})</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Reason</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {escalations.length > 0 ? (
              escalations.map((esc) => (
                <tr key={esc._id}>
                  <td>{esc.customerName}</td>
                  <td>{esc.customerPhone}</td>
                  <td>{esc.reason.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge badge-${esc.priority}`}>
                      {esc.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${esc.status}`}>
                      {esc.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(esc.createdAt).toLocaleString()}</td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => viewDetails(esc)}
                      style={{ fontSize: '12.5px', padding: '6px 12px', marginRight: '6px' }}
                    >
                      View
                    </button>
                    {esc.status === 'pending' && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleStatusUpdate(esc._id, 'in_progress')}
                        style={{ fontSize: '12.5px', padding: '6px 12px' }}
                      >
                        Start
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No escalations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Escalation Details Modal */}
      {selectedEsc && (
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
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)' }}>Escalation Details</h2>
              <button className="btn btn-secondary" onClick={closeDetails}>Close</button>
            </div>

            <div style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {selectedEsc.customerName}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Phone:</strong> {selectedEsc.customerPhone}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> {selectedEsc.reason.replace(/_/g, ' ')}</p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Priority:</strong>{' '}
                <span className={`badge badge-${selectedEsc.priority}`}>
                  {selectedEsc.priority.toUpperCase()}
                </span>
              </p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>{' '}
                <span className={`badge badge-${selectedEsc.status}`}>
                  {selectedEsc.status.replace('_', ' ').toUpperCase()}
                </span>
              </p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Created:</strong> {new Date(selectedEsc.createdAt).toLocaleString()}</p>
              {selectedEsc.resolvedAt && (
                <p><strong style={{ color: 'var(--text-primary)' }}>Resolved:</strong> {new Date(selectedEsc.resolvedAt).toLocaleString()}</p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>Description</h3>
              <p style={{ 
                backgroundColor: 'var(--bg-input)', 
                color: 'var(--text-primary)',
                padding: '15px', 
                borderRadius: '8px',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border)'
              }}>
                {selectedEsc.description}
              </p>
            </div>

            {selectedEsc.resolution && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>Resolution</h3>
                <p style={{ 
                  backgroundColor: 'rgba(22, 163, 74, 0.08)', 
                  color: 'var(--success)',
                  padding: '15px', 
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(22, 163, 74, 0.2)'
                }}>
                  {selectedEsc.resolution}
                </p>
              </div>
            )}

            {(selectedEsc.status === 'pending' || selectedEsc.status === 'in_progress') && (
              <form onSubmit={handleResolve}>
                <div className="filter-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Resolution Notes *</label>
                  <textarea 
                    name="resolution" 
                    required 
                    rows="4"
                    placeholder="Enter resolution details..."
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-success">
                  Mark as Resolved
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Escalations;
