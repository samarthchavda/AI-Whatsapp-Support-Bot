import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaBullhorn, 
  FaArrowLeft, 
  FaTrash,
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';
import './SuperAdmin.css'; // Reuse existing glassmorphic SuperAdmin styles

const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;

function SuperAdminAnnouncements() {
  const navigate = useNavigate();
  const storedAdmin = localStorage.getItem('admin');
  const admin = storedAdmin ? JSON.parse(storedAdmin) : null;

  // Protect route
  useEffect(() => {
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [admin, navigate]);

  // System Announcements states
  const getAnnouncementBadgeStyle = (type) => {
    const styles = {
      danger: { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
      warning: { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      success: { background: 'rgba(16, 185, 129, 0.1)', color: '#059669' },
      info: { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }
    };
    return styles[type] || { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' };
  };

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    expiresAt: '',
    isActive: true
  });

  const fetchAnnouncements = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      setAnnouncementsLoading(true);
      const res = await axios.get(`${API_BASE}/super-admin/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      const res = await axios.post(`${API_BASE}/super-admin/announcements`, newAnnouncement, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert('Announcement created successfully!');
        setNewAnnouncement({
          title: '',
          content: '',
          type: 'info',
          expiresAt: '',
          isActive: true
        });
        fetchAnnouncements();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create announcement');
    }
  };

  const handleToggleAnnouncement = async (annId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      const res = await axios.post(`${API_BASE}/super-admin/announcements/${annId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        fetchAnnouncements();
      }
    } catch (err) {
      alert('Failed to toggle announcement status');
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    try {
      const res = await axios.delete(`${API_BASE}/super-admin/announcements/${annId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert('Announcement deleted');
        fetchAnnouncements();
      }
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  if (announcementsLoading && announcements.length === 0) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fafafa'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container super-admin-page">
      {/* Header and Back Button */}
      <div className="page-header super-admin-header" style={{ marginBottom: '28px' }}>
        <div>
          <button 
            onClick={() => navigate('/dashboard/super-admin')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              padding: 0,
              marginBottom: '12px'
            }}
          >
            <FaArrowLeft /> Back to Super Admin
          </button>
          <h1 className="page-title super-admin-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaBullhorn className="announcements-icon" style={{ color: '#8b5cf6' }} />
            System Announcements Manager
          </h1>
          <p className="page-subtitle">Configure, publish, and schedule notice banners for all merchant workspaces</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'start' }}>
        {/* Create announcement form */}
        <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
          <div className="table-header-premium super-admin-table-header">
            <h2>📣 Publish Announcement</h2>
          </div>
          <div style={{ padding: '24px', textAlign: 'left' }}>
            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-default)', 
                    borderRadius: '10px', 
                    color: 'var(--text-primary)' 
                  }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Message Content *</label>
                <textarea
                  required
                  placeholder="e.g. We will be performing database upgrades tonight at 2 AM UTC..."
                  rows="4"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-default)', 
                    borderRadius: '10px', 
                    color: 'var(--text-primary)', 
                    resize: 'vertical' 
                  }}
                />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Severity Type</label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-default)', 
                      borderRadius: '10px', 
                      color: 'var(--text-primary)' 
                    }}
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="success">Success (Green)</option>
                    <option value="danger">Danger (Red)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Expiry Date</label>
                  <input
                    type="datetime-local"
                    value={newAnnouncement.expiresAt}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-default)', 
                      borderRadius: '10px', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: '600' }}>
                Publish Banner
              </button>
            </form>
          </div>
        </div>

        {/* List of announcements */}
        <div className="table-container-premium super-admin-table" style={{ margin: 0 }}>
          <div className="table-header-premium super-admin-table-header">
            <h2>📣 Active Announcements ({announcements.length})</h2>
          </div>
          <div style={{ padding: '24px' }}>
            {announcementsLoading ? (
              <div style={{ color: '#71717a', textAlign: 'center', padding: '20px' }}>Refreshing announcements list...</div>
            ) : announcements.length === 0 ? (
              <div style={{ color: '#71717a', textAlign: 'center', padding: '20px' }}>No system announcements created yet.</div>
            ) : (
              <div className="table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Announcement</th>
                      <th>Type</th>
                      <th>Active</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(ann => (
                      <tr key={ann._id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{ann.title}</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', whiteSpace: 'normal', maxWidth: '300px', display: 'block', wordBreak: 'break-word' }}>
                              {ann.content}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span 
                            className="badge"
                            style={{ 
                              ...getAnnouncementBadgeStyle(ann.type),
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px'
                            }}
                          >
                            {ann.type}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleAnnouncement(ann._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: ann.isActive ? '#10b981' : '#71717a' }}
                          >
                            {ann.isActive ? <FaToggleOn /> : <FaToggleOff />}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {ann.expiresAt ? new Date(ann.expiresAt).toLocaleString() : 'Never'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann._id)}
                            className="btn-icon btn-danger"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminAnnouncements;
