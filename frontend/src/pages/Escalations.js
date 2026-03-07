import React, { useState, useEffect } from 'react';
import { getEscalations, updateEscalation } from '../services/api';

function Escalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEsc, setSelectedEsc] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });

  useEffect(() => {
    fetchEscalations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, [filters]);

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

  if (loading && escalations.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading escalations...
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Escalations</h1>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority</label>
          <select 
            value={filters.priority} 
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">All</option>
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
                      {esc.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${esc.status}`}>
                      {esc.status}
                    </span>
                  </td>
                  <td>{new Date(esc.createdAt).toLocaleString()}</td>
                  <td>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => viewDetails(esc)}
                      style={{ fontSize: '12px', padding: '5px 10px', marginRight: '5px' }}
                    >
                      View
                    </button>
                    {esc.status === 'pending' && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleStatusUpdate(esc._id, 'in_progress')}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
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
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Escalation Details</h2>
              <button className="btn btn-secondary" onClick={closeDetails}>Close</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>Customer:</strong> {selectedEsc.customerName}</p>
              <p><strong>Phone:</strong> {selectedEsc.customerPhone}</p>
              <p><strong>Reason:</strong> {selectedEsc.reason.replace(/_/g, ' ')}</p>
              <p>
                <strong>Priority:</strong>{' '}
                <span className={`badge badge-${selectedEsc.priority}`}>
                  {selectedEsc.priority}
                </span>
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`badge badge-${selectedEsc.status}`}>
                  {selectedEsc.status}
                </span>
              </p>
              <p><strong>Created:</strong> {new Date(selectedEsc.createdAt).toLocaleString()}</p>
              {selectedEsc.resolvedAt && (
                <p><strong>Resolved:</strong> {new Date(selectedEsc.resolvedAt).toLocaleString()}</p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Description</h3>
              <p style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedEsc.description}
              </p>
            </div>

            {selectedEsc.resolution && (
              <div style={{ marginBottom: '20px' }}>
                <h3>Resolution</h3>
                <p style={{ 
                  backgroundColor: '#d4edda', 
                  padding: '15px', 
                  borderRadius: '5px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedEsc.resolution}
                </p>
              </div>
            )}

            {(selectedEsc.status === 'pending' || selectedEsc.status === 'in_progress') && (
              <form onSubmit={handleResolve}>
                <div className="filter-group">
                  <label>Resolution Notes *</label>
                  <textarea 
                    name="resolution" 
                    required 
                    rows="4"
                    placeholder="Enter resolution details..."
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-success" style={{ marginTop: '10px' }}>
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
