import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import api from '../../../services/api';
import './SuperAdminAnnouncements.css';

function SuperAdminAnnouncements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    expiresAt: '',
    isActive: true
  });

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/announcements');
      if (res.data?.success) {
        setAnnouncements(res.data.data || []);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Could not load announcements.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setStatusMessage(null);
      const res = await api.post('/super-admin/announcements', newAnnouncement);
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: 'Announcement published to merchant dashboards and notification bells.'
        });
        setNewAnnouncement({
          title: '',
          content: '',
          type: 'info',
          expiresAt: '',
          isActive: true
        });
        await fetchAnnouncements();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to publish announcement.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnnouncement = async (annId) => {
    try {
      setStatusMessage(null);
      const res = await api.post(`/super-admin/announcements/${annId}/toggle`, {});
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: res.data.message || 'Announcement status updated.'
        });
        await fetchAnnouncements();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update announcement status.'
      });
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      setStatusMessage(null);
      const res = await api.delete(`/super-admin/announcements/${annId}`);
      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: 'Announcement deleted.'
        });
        await fetchAnnouncements();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to delete announcement.'
      });
    }
  };

  const getRowState = (ann) => {
    const isExpired = Boolean(ann.expiresAt && new Date(ann.expiresAt) <= new Date());
    if (!ann.isActive) return { label: 'Paused', dotClass: '' };
    if (isExpired) return { label: 'Expired', dotClass: 'expired' };
    return { label: 'Active', dotClass: 'active' };
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="ann-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="ann-page">
      <header className="ann-header">
        <div className="ann-breadcrumb">Super Admin / Announcements</div>
        <h1 className="ann-title">System Announcements</h1>
        <p className="ann-subtitle">
          Publish notice banners shown at the top of merchant workspaces and inside the notification bell.
        </p>
      </header>

      {statusMessage && (
        <div
          role="status"
          className={`ann-alert ${statusMessage.type === 'error' ? 'error' : 'success'}`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="ann-grid">
        {/* Publish form + Live Banner Preview */}
        <section className="ann-panel">
          <div className="ann-panel-head">
            <h2 className="ann-panel-title">New announcement</h2>
          </div>

          <form onSubmit={handleCreateAnnouncement} className="ann-form" autoComplete="off">
            <div className="ann-field">
              <label className="ann-label" htmlFor="ann-title-input">
                Title
              </label>
              <input
                id="ann-title-input"
                type="text"
                className="ann-input"
                required
                placeholder="Scheduled maintenance"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
            </div>

            <div className="ann-field">
              <label className="ann-label" htmlFor="ann-content-input">
                Message
              </label>
              <textarea
                id="ann-content-input"
                className="ann-textarea"
                required
                placeholder="Database upgrades tonight between 2:00 AM and 2:30 AM IST."
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              />
            </div>

            <div className="ann-form-row">
              <div className="ann-field">
                <label className="ann-label" htmlFor="ann-type-select">
                  Severity
                </label>
                <select
                  id="ann-type-select"
                  className="ann-input"
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="danger">Critical</option>
                </select>
              </div>

              <div className="ann-field">
                <label className="ann-label" htmlFor="ann-expiry-input">
                  Expires (optional)
                </label>
                <input
                  id="ann-expiry-input"
                  type="datetime-local"
                  className="ann-input"
                  value={newAnnouncement.expiresAt}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="ann-preview-box">
              <span className="ann-label">Merchant banner preview</span>
              <div className="ann-preview-strip">
                <div className={`system-announcement-banner banner-${newAnnouncement.type}`}>
                  <div className="announcement-content">
                    <span className="announcement-badge">{newAnnouncement.type}</span>
                    <span>
                      <strong>{newAnnouncement.title || 'Announcement title'}</strong>
                      {': '}
                      {newAnnouncement.content || 'Your notice message will appear here for all merchants.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="ann-submit-btn" disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish banner'}
            </button>
          </form>
        </section>

        {/* All announcements list */}
        <section className="ann-panel">
          <div className="ann-panel-head">
            <h2 className="ann-panel-title">All announcements</h2>
            <span className="ann-count">{announcements.length} total</span>
          </div>

          {loading ? (
            <div className="ann-empty">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="ann-empty">No system announcements created yet.</div>
          ) : (
            <div className="ann-table-wrap">
              <table className="ann-table">
                <thead>
                  <tr>
                    <th>Announcement</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((ann) => {
                    const rowState = getRowState(ann);
                    return (
                      <tr key={ann._id}>
                        <td>
                          <div className="ann-item-title">{ann.title}</div>
                          <div className="ann-item-content">{ann.content}</div>
                        </td>
                        <td>
                          <span className="ann-type-label">{ann.type}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ann-status-btn"
                            onClick={() => handleToggleAnnouncement(ann._id)}
                            title={ann.isActive ? 'Click to pause' : 'Click to activate'}
                          >
                            <span className={`ann-dot ${rowState.dotClass}`} />
                            {rowState.label}
                          </button>
                        </td>
                        <td className="ann-date">
                          {ann.expiresAt ? new Date(ann.expiresAt).toLocaleString() : 'Never'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann._id)}
                            className="ann-delete-btn"
                            aria-label="Delete announcement"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SuperAdminAnnouncements;
