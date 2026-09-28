import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  FaShieldAlt,
  FaPlus,
  FaEdit,
  FaCopy,
  FaTrash,
  FaSearch,
  FaSync,
  FaCheck,
  FaTimes,
  FaLayerGroup,
  FaUsers,
  FaExclamationTriangle,
  FaLock,
  FaDesktop,
  FaSlidersH
} from 'react-icons/fa';
import './PermissionProfiles.css';

const CATEGORY_MAP = {
  kwickbot_crm: { label: 'Kwickbot CRM', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.1)' },
  crm_integration: { label: 'CRM Integration', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' },
  whatsapp_api: { label: 'WhatsApp API', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  enterprise_custom: { label: 'Enterprise Custom', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  system: { label: 'System Profile', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
};

const INITIAL_FORM_DATA = {
  name: '',
  key: '',
  description: '',
  category: 'crm_integration',
  pages: [],
  permissions: [],
  features: {},
  usageLimitDefaults: {
    monthlyConversations: 500,
    monthlyMessages: 2000,
    monthlyApiRequests: 10000,
    monthlyWebhookDeliveries: 5000,
    monthlyAutomationExecutions: 1000,
    maxWhatsAppConnections: 1,
    maxCrmConnections: 1,
    maxActiveAutomations: 5,
    maxApiKeys: 2,
    geminiTokensPerMonth: 50000
  }
};

export default function PermissionProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'duplicate'
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('pages'); // 'pages' | 'permissions' | 'limits' | 'preview'

  // Archive / Delete Modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [profileToArchive, setProfileToArchive] = useState(null);

  const fetchProfilesAndMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profilesRes, metaRes] = await Promise.all([
        api.get('/super-admin/permission-profiles'),
        api.get('/super-admin/permission-profiles/metadata/canonical')
      ]);

      if (profilesRes.data.success) {
        setProfiles(profilesRes.data.data);
      }
      if (metaRes.data.success) {
        setMetadata(metaRes.data.data);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      setError(err.response?.data?.error || 'Failed to load permission profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfilesAndMetadata();
  }, [fetchProfilesAndMetadata]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM_DATA);
    setActiveModalTab('pages');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (profile) => {
    setModalMode('edit');
    setEditingId(profile._id);
    setFormData({
      name: profile.name,
      key: profile.key,
      description: profile.description || '',
      category: profile.category || 'system',
      pages: Array.isArray(profile.pages) ? [...profile.pages] : [],
      permissions: Array.isArray(profile.permissions) ? [...profile.permissions] : [],
      features: profile.features ? { ...profile.features } : {},
      usageLimitDefaults: profile.usageLimitDefaults ? { ...profile.usageLimitDefaults } : INITIAL_FORM_DATA.usageLimitDefaults,
      isSystemDefault: profile.isSystemDefault
    });
    setActiveModalTab('pages');
    setModalOpen(true);
  };

  // Open Duplicate
  const handleDuplicate = async (profile) => {
    try {
      setSaving(true);
      const res = await api.post(`/super-admin/permission-profiles/${profile._id}/duplicate`);
      if (res.data.success) {
        setSuccessMsg(`Profile duplicated as "${res.data.data.name}"`);
        fetchProfilesAndMetadata();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to duplicate profile');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Page Selection
  const togglePage = (pageKey) => {
    setFormData(prev => {
      const current = prev.pages || [];
      const updated = current.includes(pageKey)
        ? current.filter(p => p !== pageKey)
        : [...current, pageKey];
      return { ...prev, pages: updated };
    });
  };

  // Toggle Permission Selection
  const togglePermission = (permKey) => {
    setFormData(prev => {
      const current = prev.permissions || [];
      const updated = current.includes(permKey)
        ? current.filter(p => p !== permKey)
        : [...current, permKey];
      return { ...prev, permissions: updated };
    });
  };

  // Select / Deselect All in Group
  const togglePageGroup = (groupPages) => {
    const allSelected = groupPages.every(p => formData.pages.includes(p.key));
    if (allSelected) {
      const keysToRemove = new Set(groupPages.map(p => p.key));
      setFormData(prev => ({
        ...prev,
        pages: prev.pages.filter(k => !keysToRemove.has(k))
      }));
    } else {
      const keysToAdd = groupPages.map(p => p.key);
      setFormData(prev => ({
        ...prev,
        pages: Array.from(new Set([...prev.pages, ...keysToAdd]))
      }));
    }
  };

  const togglePermissionGroup = (groupPerms) => {
    const allSelected = groupPerms.every(p => formData.permissions.includes(p.key));
    if (allSelected) {
      const keysToRemove = new Set(groupPerms.map(p => p.key));
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(k => !keysToRemove.has(k))
      }));
    } else {
      const keysToAdd = groupPerms.map(p => p.key);
      setFormData(prev => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...keysToAdd]))
      }));
    }
  };

  // Handle Save (Create or Edit)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Profile name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (modalMode === 'create') {
        const res = await api.post('/super-admin/permission-profiles', formData);
        if (res.data.success) {
          setSuccessMsg('Permission profile created successfully');
          setModalOpen(false);
          fetchProfilesAndMetadata();
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await api.put(`/super-admin/permission-profiles/${editingId}`, formData);
        if (res.data.success) {
          setSuccessMsg('Permission profile updated successfully');
          setModalOpen(false);
          fetchProfilesAndMetadata();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save permission profile');
    } finally {
      setSaving(false);
    }
  };

  // Archive / Delete Action
  const handleArchiveConfirm = async () => {
    if (!profileToArchive) return;
    try {
      setSaving(true);
      const res = await api.delete(`/super-admin/permission-profiles/${profileToArchive._id}?force=true`);
      if (res.data.success) {
        setSuccessMsg(`Profile "${profileToArchive.name}" archived successfully`);
        setArchiveModalOpen(false);
        setProfileToArchive(null);
        fetchProfilesAndMetadata();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive profile');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Summary Metrics
  const totalProfiles = profiles.length;
  const systemProfiles = profiles.filter(p => p.isSystemDefault).length;
  const customProfiles = totalProfiles - systemProfiles;
  const totalAssignedPlans = profiles.reduce((sum, p) => sum + (p.assignedPlansCount || 0), 0);
  const totalAssignedUsers = profiles.reduce((sum, p) => sum + (p.assignedUsersCount || 0), 0);

  return (
    <div className="permission-profiles-container">
      {/* Top Alerts */}
      {error && (
        <div className="prof-alert prof-alert-error">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="prof-alert-close" onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}
      {successMsg && (
        <div className="prof-alert prof-alert-success">
          <FaCheck />
          <span>{successMsg}</span>
          <button className="prof-alert-close" onClick={() => setSuccessMsg(null)}><FaTimes /></button>
        </div>
      )}

      {/* Header */}
      <div className="prof-header">
        <div>
          <h1 className="prof-title">
            <FaShieldAlt className="prof-header-icon" />
            Dynamic Permission Profiles
          </h1>
          <p className="prof-subtitle">
            Configure reusable granular access profiles, modular allowed pages, and capability presets across Kwickbot CRM, CRM Integration, and WhatsApp API plans.
          </p>
        </div>
        <div className="prof-header-actions">
          <button className="prof-btn prof-btn-secondary" onClick={fetchProfilesAndMetadata} disabled={loading}>
            <FaSync className={loading ? 'prof-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="prof-btn prof-btn-primary" onClick={handleOpenCreate}>
            <FaPlus />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="prof-kpi-grid">
        <div className="prof-kpi-card">
          <div className="prof-kpi-icon total"><FaShieldAlt /></div>
          <div>
            <div className="prof-kpi-value">{totalProfiles}</div>
            <div className="prof-kpi-label">Total Profiles</div>
          </div>
        </div>
        <div className="prof-kpi-card">
          <div className="prof-kpi-icon system"><FaLock /></div>
          <div>
            <div className="prof-kpi-value">{systemProfiles}</div>
            <div className="prof-kpi-label">System Defaults</div>
          </div>
        </div>
        <div className="prof-kpi-card">
          <div className="prof-kpi-icon custom"><FaSlidersH /></div>
          <div>
            <div className="prof-kpi-value">{customProfiles}</div>
            <div className="prof-kpi-label">Custom Profiles</div>
          </div>
        </div>
        <div className="prof-kpi-card">
          <div className="prof-kpi-icon plans"><FaLayerGroup /></div>
          <div>
            <div className="prof-kpi-value">{totalAssignedPlans}</div>
            <div className="prof-kpi-label">Assigned Plans</div>
          </div>
        </div>
        <div className="prof-kpi-card">
          <div className="prof-kpi-icon users"><FaUsers /></div>
          <div>
            <div className="prof-kpi-value">{totalAssignedUsers}</div>
            <div className="prof-kpi-label">Active Merchants</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Category Filter */}
      <div className="prof-toolbar">
        <div className="prof-search-box">
          <FaSearch className="prof-search-icon" />
          <input
            type="text"
            placeholder="Search profiles by name, key, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="prof-search-clear" onClick={() => setSearchTerm('')}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="prof-category-filters">
          <button
            className={`prof-filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({profiles.length})
          </button>
          {metadata?.categories?.map(cat => {
            const count = profiles.filter(p => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`prof-filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Cards Grid */}
      {loading ? (
        <div className="prof-loading-state">
          <FaSync className="prof-spin" />
          <p>Loading permission profiles...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="prof-empty-state">
          <FaShieldAlt className="prof-empty-icon" />
          <h3>No permission profiles found</h3>
          <p>No profiles match your search and category filter criteria.</p>
          <button className="prof-btn prof-btn-primary" onClick={handleOpenCreate}>
            <FaPlus /> Create Profile
          </button>
        </div>
      ) : (
        <div className="prof-grid">
          {filteredProfiles.map(profile => {
            const catStyle = CATEGORY_MAP[profile.category] || CATEGORY_MAP.system;
            const pagesCount = profile.pages?.length || 0;
            const permsCount = profile.permissions?.length || 0;

            return (
              <div key={profile._id} className="prof-card">
                <div className="prof-card-header">
                  <div className="prof-card-title-wrap">
                    <h3 className="prof-card-title">{profile.name}</h3>
                    <code className="prof-card-key">{profile.key}</code>
                  </div>
                  <span
                    className="prof-badge"
                    style={{ color: catStyle.color, background: catStyle.bg, borderColor: catStyle.color }}
                  >
                    {catStyle.label}
                  </span>
                </div>

                <p className="prof-card-desc">
                  {profile.description || 'No description provided.'}
                </p>

                <div className="prof-card-stats">
                  <div className="prof-stat-item">
                    <span className="prof-stat-lbl">Assigned Plans</span>
                    <span className="prof-stat-val">
                      <FaLayerGroup /> {profile.assignedPlansCount || 0}
                    </span>
                  </div>
                  <div className="prof-stat-item">
                    <span className="prof-stat-lbl">Active Merchants</span>
                    <span className="prof-stat-val">
                      <FaUsers /> {profile.assignedUsersCount || 0}
                    </span>
                  </div>
                  <div className="prof-stat-item">
                    <span className="prof-stat-lbl">Allowed Pages</span>
                    <span className="prof-stat-val">
                      <FaDesktop /> {pagesCount}
                    </span>
                  </div>
                  <div className="prof-stat-item">
                    <span className="prof-stat-lbl">Permissions</span>
                    <span className="prof-stat-val">
                      <FaSlidersH /> {permsCount}
                    </span>
                  </div>
                </div>

                {/* Page Tags Preview */}
                <div className="prof-pages-preview">
                  <span className="prof-pages-preview-lbl">Module Access:</span>
                  <div className="prof-tags-row">
                    {profile.pages && profile.pages.length > 0 ? (
                      profile.pages.slice(0, 6).map(pg => (
                        <span key={pg} className="prof-page-tag">{pg}</span>
                      ))
                    ) : (
                      <span className="prof-page-tag empty">Deny by default (0 pages)</span>
                    )}
                    {profile.pages && profile.pages.length > 6 && (
                      <span className="prof-page-tag more">+{profile.pages.length - 6} more</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="prof-card-footer">
                  <div className="prof-status-flag">
                    {profile.isSystemDefault ? (
                      <span className="prof-system-badge" title="Built-in platform standard profile">
                        <FaLock /> System Default
                      </span>
                    ) : (
                      <span className="prof-custom-badge">
                        <FaSlidersH /> Custom Profile
                      </span>
                    )}
                  </div>

                  <div className="prof-card-actions">
                    <button
                      className="prof-action-btn"
                      title="Duplicate Profile"
                      onClick={() => handleDuplicate(profile)}
                    >
                      <FaCopy />
                    </button>
                    <button
                      className="prof-action-btn edit"
                      title="Edit Profile"
                      onClick={() => handleOpenEdit(profile)}
                    >
                      <FaEdit /> Edit
                    </button>
                    {!profile.isSystemDefault && (
                      <button
                        className="prof-action-btn danger"
                        title="Archive Profile"
                        onClick={() => {
                          setProfileToArchive(profile);
                          setArchiveModalOpen(true);
                        }}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PROFILE MODAL */}
      {modalOpen && (
        <div className="prof-modal-overlay">
          <div className="prof-modal">
            <div className="prof-modal-header">
              <div className="prof-modal-title-wrap">
                <FaShieldAlt className="prof-modal-icon" />
                <h2>
                  {modalMode === 'create' ? 'Create Permission Profile' : `Edit: ${formData.name}`}
                </h2>
              </div>
              <button className="prof-modal-close" onClick={() => setModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="prof-modal-tabs">
              <button
                className={`prof-modal-tab ${activeModalTab === 'pages' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('pages')}
              >
                1. Allowed Pages ({formData.pages?.length || 0})
              </button>
              <button
                className={`prof-modal-tab ${activeModalTab === 'permissions' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('permissions')}
              >
                2. Granular Permissions ({formData.permissions?.length || 0})
              </button>
              <button
                className={`prof-modal-tab ${activeModalTab === 'limits' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('limits')}
              >
                3. Usage Limits & Info
              </button>
              <button
                className={`prof-modal-tab ${activeModalTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('preview')}
              >
                4. Live Sidebar Preview
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="prof-modal-form">
              <div className="prof-modal-body">
                {/* TAB 1: ALLOWED PAGES & BASIC INFO */}
                {activeModalTab === 'pages' && (
                  <div className="prof-tab-content">
                    {/* Basic Fields */}
                    <div className="prof-form-grid">
                      <div className="prof-form-group">
                        <label>Profile Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              name,
                              key: modalMode === 'create' ? name.toLowerCase().replace(/[^a-z0-9_]+/g, '_') : prev.key
                            }));
                          }}
                          placeholder="e.g., CRM Advanced Automation"
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Profile Key / Identifier *</label>
                        <input
                          type="text"
                          required
                          disabled={modalMode === 'edit' && formData.isSystemDefault}
                          value={formData.key}
                          onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_') }))}
                          placeholder="e.g., crm_advanced_automation"
                        />
                        {modalMode === 'edit' && formData.isSystemDefault && (
                          <small className="prof-hint"><FaLock /> System default key is protected</small>
                        )}
                      </div>
                      <div className="prof-form-group">
                        <label>Solution Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        >
                          {metadata?.categories?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="prof-form-group full-width">
                        <label>Description</label>
                        <textarea
                          rows={2}
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of what capabilities this profile grants..."
                        />
                      </div>
                    </div>

                    {/* Checklists for Pages Grouped */}
                    <h3 className="prof-section-title">Module & Page Permissions</h3>
                    <p className="prof-section-sub">Select the dashboard pages this profile grants merchants access to:</p>

                    {metadata?.pageGroups && Object.entries(metadata.pageGroups).map(([grpKey, grpPages]) => {
                      const allSelected = grpPages.every(p => formData.pages?.includes(p.key));

                      return (
                        <div key={grpKey} className="prof-group-box">
                          <div className="prof-group-header">
                            <div>
                              <h4>{grpKey.replace('_', ' ').toUpperCase()} MODULES</h4>
                              <span className="prof-group-count">
                                {grpPages.filter(p => formData.pages?.includes(p.key)).length} / {grpPages.length} enabled
                              </span>
                            </div>
                            <button
                              type="button"
                              className="prof-group-toggle-btn"
                              onClick={() => togglePageGroup(grpPages)}
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="prof-checkbox-grid">
                            {grpPages.map(page => {
                              const checked = formData.pages?.includes(page.key);
                              return (
                                <label key={page.key} className={`prof-checkbox-card ${checked ? 'checked' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePage(page.key)}
                                  />
                                  <div className="prof-checkbox-info">
                                    <span className="prof-checkbox-title">{page.label}</span>
                                    <span className="prof-checkbox-code">{page.key}</span>
                                    <span className="prof-checkbox-desc">{page.description}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: GRANULAR PERMISSIONS */}
                {activeModalTab === 'permissions' && (
                  <div className="prof-tab-content">
                    <h3 className="prof-section-title">Granular API & Action Permissions</h3>
                    <p className="prof-section-sub">Configure exact machine-readable permission flags granted to this profile:</p>

                    {metadata?.permissionGroups && Object.entries(metadata.permissionGroups).map(([grpKey, grpPerms]) => {
                      const allSelected = grpPerms.every(p => formData.permissions?.includes(p.key));

                      return (
                        <div key={grpKey} className="prof-group-box">
                          <div className="prof-group-header">
                            <div>
                              <h4>{grpKey.replace('_', ' ').toUpperCase()} PERMISSIONS</h4>
                              <span className="prof-group-count">
                                {grpPerms.filter(p => formData.permissions?.includes(p.key)).length} / {grpPerms.length} active
                              </span>
                            </div>
                            <button
                              type="button"
                              className="prof-group-toggle-btn"
                              onClick={() => togglePermissionGroup(grpPerms)}
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="prof-checkbox-grid">
                            {grpPerms.map(perm => {
                              const checked = formData.permissions?.includes(perm.key);
                              return (
                                <label key={perm.key} className={`prof-checkbox-card ${checked ? 'checked' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(perm.key)}
                                  />
                                  <div className="prof-checkbox-info">
                                    <span className="prof-checkbox-title">{perm.label}</span>
                                    <code className="prof-checkbox-code">{perm.key}</code>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 3: USAGE LIMIT DEFAULTS */}
                {activeModalTab === 'limits' && (
                  <div className="prof-tab-content">
                    <h3 className="prof-section-title">Default Resource Quotas</h3>
                    <p className="prof-section-sub">Default monthly limits applied to plans using this profile:</p>

                    <div className="prof-limits-grid">
                      <div className="prof-form-group">
                        <label>Monthly Conversations</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.monthlyConversations ?? 500}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, monthlyConversations: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Monthly Messages</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.monthlyMessages ?? 2000}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, monthlyMessages: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Monthly API Requests</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.monthlyApiRequests ?? 10000}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, monthlyApiRequests: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Monthly Webhook Deliveries</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.monthlyWebhookDeliveries ?? 5000}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, monthlyWebhookDeliveries: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Max WhatsApp Connections</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.maxWhatsAppConnections ?? 1}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, maxWhatsAppConnections: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Max CRM Connections</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.maxCrmConnections ?? 1}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, maxCrmConnections: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>Max Active Automations</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.maxActiveAutomations ?? 5}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, maxActiveAutomations: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div className="prof-form-group">
                        <label>AI Gemini Tokens / Month</label>
                        <input
                          type="number"
                          value={formData.usageLimitDefaults?.geminiTokensPerMonth ?? 50000}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            usageLimitDefaults: { ...prev.usageLimitDefaults, geminiTokensPerMonth: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LIVE SIDEBAR PREVIEW */}
                {activeModalTab === 'preview' && (
                  <div className="prof-tab-content">
                    <h3 className="prof-section-title">Interactive Merchant Sidebar Preview</h3>
                    <p className="prof-section-sub">This shows the exact navigation items visible to a merchant assigned to this profile:</p>

                    <div className="prof-preview-container">
                      <div className="prof-mock-sidebar">
                        <div className="prof-mock-header">
                          <span className="prof-mock-logo">⚡ Kwickbot AI</span>
                          <span className="prof-mock-plan">{formData.name || 'Sample Merchant'}</span>
                        </div>

                        <div className="prof-mock-nav">
                          {/* Standard Modules */}
                          {['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'templates', 'orders', 'leads'].map(pg => {
                            const isAllowed = formData.pages?.includes(pg);
                            return (
                              <div key={pg} className={`prof-mock-item ${isAllowed ? 'allowed' : 'hidden'}`}>
                                <span className="prof-mock-dot" />
                                <span className="prof-mock-name">{pg.replace('-', ' ').toUpperCase()}</span>
                                {!isAllowed && <span className="prof-mock-lock"><FaLock /></span>}
                              </div>
                            );
                          })}

                          {/* CRM Integration Section */}
                          <div className="prof-mock-divider">CRM INTEGRATION</div>
                          {['integration-dashboard', 'crm-connection', 'field-mapping', 'automation-rules', 'whatsapp-templates', 'integration-logs', 'failed-events'].map(pg => {
                            const isAllowed = formData.pages?.includes(pg);
                            return (
                              <div key={pg} className={`prof-mock-item ${isAllowed ? 'allowed' : 'hidden'}`}>
                                <span className="prof-mock-dot" />
                                <span className="prof-mock-name">{pg.replace('-', ' ').toUpperCase()}</span>
                                {!isAllowed && <span className="prof-mock-lock"><FaLock /></span>}
                              </div>
                            );
                          })}

                          {/* WhatsApp API Section */}
                          <div className="prof-mock-divider">WHATSAPP API PLATFORM</div>
                          {['api-dashboard', 'api-keys', 'api-documentation', 'webhook-configuration', 'api-logs', 'failed-webhooks', 'api-usage'].map(pg => {
                            const isAllowed = formData.pages?.includes(pg);
                            return (
                              <div key={pg} className={`prof-mock-item ${isAllowed ? 'allowed' : 'hidden'}`}>
                                <span className="prof-mock-dot" />
                                <span className="prof-mock-name">{pg.replace('-', ' ').toUpperCase()}</span>
                                {!isAllowed && <span className="prof-mock-lock"><FaLock /></span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="prof-preview-summary">
                        <h4>Profile Summary</h4>
                        <div className="prof-preview-metric">
                          <span>Visible Pages:</span>
                          <strong>{formData.pages?.length || 0} pages</strong>
                        </div>
                        <div className="prof-preview-metric">
                          <span>Granular Permissions:</span>
                          <strong>{formData.permissions?.length || 0} keys</strong>
                        </div>
                        <div className="prof-preview-metric">
                          <span>Category:</span>
                          <strong>{CATEGORY_MAP[formData.category]?.label || formData.category}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="prof-modal-footer">
                <button
                  type="button"
                  className="prof-btn prof-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prof-btn prof-btn-primary"
                  disabled={saving}
                >
                  {saving ? <FaSync className="prof-spin" /> : <FaCheck />}
                  <span>{modalMode === 'create' ? 'Create Profile' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModalOpen && profileToArchive && (
        <div className="prof-modal-overlay">
          <div className="prof-modal prof-modal-small">
            <div className="prof-modal-header danger">
              <div className="prof-modal-title-wrap">
                <FaExclamationTriangle className="prof-modal-icon danger" />
                <h2>Archive Permission Profile?</h2>
              </div>
              <button className="prof-modal-close" onClick={() => setArchiveModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="prof-modal-body">
              <p>
                Are you sure you want to archive <strong>{profileToArchive.name}</strong> (<code>{profileToArchive.key}</code>)?
              </p>
              {profileToArchive.assignedPlansCount > 0 && (
                <div className="prof-alert prof-alert-warning">
                  <FaExclamationTriangle />
                  <span>
                    Warning: {profileToArchive.assignedPlansCount} pricing plan(s) currently depend on this profile.
                  </span>
                </div>
              )}
            </div>
            <div className="prof-modal-footer">
              <button
                type="button"
                className="prof-btn prof-btn-secondary"
                onClick={() => setArchiveModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="prof-btn prof-btn-danger"
                onClick={handleArchiveConfirm}
                disabled={saving}
              >
                {saving ? <FaSync className="prof-spin" /> : <FaTrash />}
                <span>Archive Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
