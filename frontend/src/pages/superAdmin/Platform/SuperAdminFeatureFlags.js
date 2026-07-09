import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { 
  FaToggleOn, 
  FaToggleOff,
  FaTimesCircle,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import '../Dashboard/SuperAdmin.css'; // Reuse SuperAdmin layout and tables CSS

function SuperAdminFeatureFlags() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interaction & State states
  const [togglingKey, setTogglingKey] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, key: '', name: '', isEnabled: false });
  const [feedback, setFeedback] = useState({ message: '', type: '' }); // type: 'success' | 'error'

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/super-admin/feature-flags');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError(err.response?.data?.error || 'Failed to load Feature Flags configuration');
    } finally {
      setLoading(false);
    }
  };

  const triggerToggleConfirm = (flag) => {
    setConfirmModal({
      show: true,
      key: flag.key,
      name: flag.name,
      isEnabled: flag.isEnabled
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ show: false, key: '', name: '', isEnabled: false });
  };

  const executeToggleFlag = async () => {
    const { key, isEnabled } = confirmModal;
    closeConfirmModal();
    
    try {
      setTogglingKey(key);
      setFeedback({ message: '', type: '' });
      
      const response = await api.post('/super-admin/feature-flags/toggle', {
        key,
        isEnabled: !isEnabled
      });

      if (response.data.success) {
        // Update local state summary and flag state
        setData(prev => {
          if (!prev) return prev;
          const updatedFlags = prev.flags.map(f => {
            if (f.key === key) {
              return { ...f, isEnabled: !isEnabled, updatedAt: new Date() };
            }
            return f;
          });
          const enabledCount = updatedFlags.filter(f => f.isEnabled).length;
          const disabledCount = updatedFlags.length - enabledCount;
          return {
            ...prev,
            flags: updatedFlags,
            summary: {
              ...prev.summary,
              enabledCount,
              disabledCount
            }
          };
        });
        
        setFeedback({
          message: `Successfully ${!isEnabled ? 'enabled' : 'disabled'} feature: "${confirmModal.name}"!`,
          type: 'success'
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setFeedback(prev => prev.message.includes(confirmModal.name) ? { message: '', type: '' } : prev);
        }, 5000);
      }
    } catch (err) {
      console.error('Error toggling feature flag:', err);
      setFeedback({
        message: err.response?.data?.error || `Failed to toggle feature: "${confirmModal.name}"`,
        type: 'error'
      });
    } finally {
      setTogglingKey(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="container">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading Feature Flags configuration...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="detail-card" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <FaTimesCircle style={{ fontSize: '40px', color: '#ef4444', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Error Loading Dashboard</h3>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>{error}</p>
          <button onClick={fetchFeatureFlags} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { flags, summary } = data || {
    flags: [],
    summary: { totalFeatures: 0, enabledCount: 0, disabledCount: 0 }
  };

  return (
    <div className="container super-admin-page">
      <div className="page-header super-admin-header">
        <div>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaToggleOn className="feature-flags-title-icon" style={{ color: '#10b981' }} />
            Feature Flags
          </h1>
          <p className="page-subtitle">Configure system capability rollouts, toggle external synchronizations, and configure platform components</p>
        </div>
      </div>

      {/* Success/Error Feedback Alerts */}
      {feedback.message && (
        <div 
          className={`premium-alert ${feedback.type === 'success' ? 'premium-alert-success' : 'premium-alert-danger'}`}
          style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          {feedback.type === 'success' ? <FaCheckCircle style={{ color: '#10b981' }} /> : <FaTimesCircle style={{ color: '#ef4444' }} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="analytics-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaInfoCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Total Features</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>{summary.totalFeatures}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Declared key flags</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Active (Enabled)</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{summary.enabledCount}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Live system capabilities</small>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ background: 'rgba(113, 113, 122, 0.1)', color: 'var(--text-secondary)', padding: '16px', borderRadius: '12px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaTimesCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Inactive (Disabled)</h3>
            <p className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-secondary)' }}>{summary.disabledCount}</p>
            <small style={{ color: 'var(--text-secondary)' }}>Disabled components</small>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="table-container-premium super-admin-table">
        <div className="table-header-premium super-admin-table-header">
          <h2><FaToggleOn /> System Feature Registry ({flags.length})</h2>
        </div>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Feature Name</th>
                <th>Description</th>
                <th>Scope</th>
                <th>Updated At</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.key}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{flag.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{flag.key}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '320px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {flag.description}
                  </td>
                  <td>
                    <span className="role-badge-pill" style={{ fontSize: '11px' }}>
                      {flag.scope}
                    </span>
                  </td>
                  <td>
                    {flag.updatedAt 
                      ? new Date(flag.updatedAt).toLocaleString() 
                      : 'Never'}
                  </td>
                  <td>
                    <span 
                      className="badge" 
                      style={{ 
                        background: flag.isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-subtle)', 
                        color: flag.isEnabled ? '#10b981' : 'var(--text-secondary)' 
                      }}
                    >
                      {flag.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => triggerToggleConfirm(flag)}
                      disabled={togglingKey === flag.key}
                      className={flag.isEnabled ? 'btn-secondary btn-danger' : 'btn-primary'}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '6px 16px', 
                        fontSize: '12px',
                        minWidth: '96px',
                        justifyContent: 'center',
                        background: flag.isEnabled ? 'rgba(239, 68, 68, 0.12)' : undefined,
                        color: flag.isEnabled ? '#dc2626' : undefined,
                        border: flag.isEnabled ? '1px solid rgba(239, 68, 68, 0.2)' : undefined
                      }}
                    >
                      {togglingKey === flag.key ? (
                        'Updating...'
                      ) : flag.isEnabled ? (
                        <>
                          <FaToggleOff /> Disable
                        </>
                      ) : (
                        <>
                          <FaToggleOn /> Enable
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content glass-card" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaExclamationTriangle style={{ color: '#fbbf24' }} />
              Confirm Feature Toggle
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Are you sure you want to {confirmModal.isEnabled ? 'disable' : 'enable'} the feature <strong>"{confirmModal.name}"</strong>? This will immediately affect global platform behavior.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={closeConfirmModal}
                className="btn-secondary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeToggleFlag}
                className="btn-primary"
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  background: confirmModal.isEnabled ? '#dc2626' : undefined,
                  border: confirmModal.isEnabled ? '1px solid #dc2626' : undefined
                }}
              >
                Yes, {confirmModal.isEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminFeatureFlags;
