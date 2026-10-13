import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { FaSync, FaSearch, FaFilter, FaCheckCircle, FaExclamationCircle, FaProjectDiagram, FaInfoCircle, FaFileAlt, FaPlus, FaTimes, FaSpinner, FaWhatsapp, FaImage, FaLink, FaPhoneAlt, FaEye, FaTrash } from 'react-icons/fa';
import './Templates.css';

const createEmptyDraft = () => ({
  name: '',
  category: 'UTILITY',
  language: 'en_US',
  header: { type: 'NONE', text: '', mediaHandle: '' },
  body: '',
  footer: '',
  buttons: [],
  buttonMode: 'NONE',
  variableSamples: []
});

const getVariables = (text = '') => [...new Set(
  [...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]))
)].sort((a, b) => a - b);

const sanitizeTemplateName = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 512);

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState(createEmptyDraft);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/whatsapp/templates');
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to retrieve templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/whatsapp/templates/sync');
      alert(response.data.message || 'Real Meta templates synced successfully!');
      fetchTemplates();
    } catch (error) {
      console.error('Error syncing templates:', error);
      alert('Failed to sync templates with Meta API');
    } finally {
      setSyncing(false);
    }
  };

  const handleMapEvent = async (templateId, eventValue) => {
    try {
      // Send value as null if 'None' is chosen
      const mappedValue = eventValue === 'none' ? null : eventValue;
      
      const response = await api.put(`/whatsapp/templates/${templateId}/map`, {
        mappedEvent: mappedValue
      });
      
      alert(response.data.message || 'Mapping updated successfully!');
      fetchTemplates(); // Reload to update UI across other templates (in case of override)
    } catch (error) {
      console.error('Error mapping template:', error);
      alert(error.response?.data?.error || 'Failed to update template mapping');
    }
  };

  const handleDeleteTemplate = async (template) => {
    const confirmed = window.confirm(
      `Remove “${template.name}” from the Kwickbot template list?\n\nThis does not delete the template in Meta Business Manager. Syncing with Meta can add it back.`
    );
    if (!confirmed) return;

    try {
      setDeletingTemplateId(template._id);
      await api.delete(`/whatsapp/templates/${template._id}`);
      if (previewTemplate?._id === template._id) setPreviewTemplate(null);
      setToast('Template removed from your Kwickbot list.');
      setTimeout(() => setToast(''), 5000);
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(error.response?.data?.error || 'Failed to remove the template. Please try again.');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const openCreateModal = () => {
    setDraft(createEmptyDraft());
    setCreateError('');
    setShowCreateModal(true);
  };

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const updateBody = (body) => {
    const variables = getVariables(body);
    setDraft((current) => ({
      ...current,
      body,
      variableSamples: variables.map((variable, index) => current.variableSamples[index] || '')
    }));
  };

  const addVariable = () => {
    const currentVariables = getVariables(draft.body);
    const nextVariable = (currentVariables[currentVariables.length - 1] || 0) + 1;
    updateBody(`${draft.body}${draft.body && !draft.body.endsWith(' ') ? ' ' : ''}{{${nextVariable}}}`);
  };

  const setButtonMode = (buttonMode) => {
    updateDraft({ buttonMode, buttons: [] });
  };

  const addButton = () => {
    const isQuickReply = draft.buttonMode === 'QUICK_REPLY';
    const max = isQuickReply ? 3 : 2;
    if (draft.buttons.length >= max) return;
    updateDraft({
      buttons: [...draft.buttons, isQuickReply
        ? { type: 'QUICK_REPLY', text: '' }
        : { type: 'URL', text: '', url: '' }]
    });
  };

  const updateButton = (index, patch) => {
    updateDraft({ buttons: draft.buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, ...patch } : button) });
  };

  const removeButton = (index) => updateDraft({ buttons: draft.buttons.filter((_, buttonIndex) => buttonIndex !== index) });

  const handleCreateTemplate = async (event) => {
    event.preventDefault();
    setCreateError('');
    if (!draft.name || !draft.body) {
      setCreateError('Template name and body text are required.');
      return;
    }

    try {
      setSubmittingTemplate(true);
      const response = await api.post('/whatsapp/templates', {
        name: draft.name,
        category: draft.category,
        language: draft.language,
        header: draft.header.type === 'NONE' ? null : draft.header,
        body: draft.body,
        footer: draft.footer,
        buttons: draft.buttons,
        variableSamples: draft.variableSamples
      });
      setShowCreateModal(false);
      setToast(response.data.message || 'Template submitted to Meta for review.');
      setTimeout(() => setToast(''), 5000);
      fetchTemplates();
    } catch (error) {
      setCreateError(error.response?.data?.error || 'Template could not be submitted. Please review the fields and try again.');
    } finally {
      setSubmittingTemplate(false);
    }
  };

  const renderPreviewBody = (text) => String(text || 'Your template message preview will appear here.')
    .split(/(\{\{\d+\}\})/g)
    .map((part, index) => /^\{\{\d+\}\}$/.test(part)
      ? <mark className="template-variable-highlight" key={`${part}-${index}`}>{part}</mark>
      : part);

  const getStatusBadge = (status) => {
    const statusMap = {
      APPROVED: { className: 'badge-active', label: 'Approved' },
      PENDING: { className: 'badge-pending', label: 'Pending Meta Review' },
      REJECTED: { className: 'badge-escalated', label: 'Rejected' },
      PAUSED: { className: 'badge-cancelled', label: 'Paused' }
    };
    
    const config = statusMap[status] || { className: 'badge-cancelled', label: status };
    
    return (
      <span className={`badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const filteredTemplates = templates.filter(tpl => {
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tpl.components.some(c => c.text && c.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'ALL' || tpl.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || tpl.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderComponent = (comp) => {
    if (comp.type === 'HEADER') {
      return (
        <div key="header" className="template-preview-header">
          <strong>Header:</strong> {comp.text}
        </div>
      );
    }
    if (comp.type === 'BODY') {
      return (
        <div key="body" className="template-preview-body">
          <p>{comp.text}</p>
        </div>
      );
    }
    if (comp.type === 'FOOTER') {
      return (
        <div key="footer" className="template-preview-footer">
          <small>{comp.text}</small>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">WhatsApp Templates</h1>
          <p className="page-subtitle">Fetch real Meta-approved templates and map automation triggers.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={openCreateModal} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
            <FaPlus /> Create Template
          </button>
          <button
            onClick={handleSync}
            className="btn btn-primary sync-btn"
            disabled={syncing}
          >
            <FaSync className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing...' : 'Sync with Meta'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tmpl-filter-bar">
        <div className="tmpl-search-wrapper">
          <FaSearch className="tmpl-search-icon" />
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tmpl-search-input"
          />
        </div>

        <div className="tmpl-filters-container">
          <div className="tmpl-filter-group">
            <FaFilter className="tmpl-filter-icon" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tmpl-filter-select"
            >
              <option value="ALL">All Categories</option>
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div className="tmpl-filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="tmpl-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Template list */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#71717a' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Retrieving template records from Meta API...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <FaFileAlt style={{ fontSize: '48px', color: '#a1a1aa', marginBottom: '16px' }} />
          <h3>No Real Templates Found</h3>
          <p>Create your first template here, then Meta will review it before it can be sent to customers.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button onClick={openCreateModal} className="btn btn-primary">
              <FaPlus /> Create Template
            </button>
            <button onClick={handleSync} className="btn btn-secondary">
              <FaSync /> Sync Real Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((tpl) => (
            <div key={tpl._id} className="template-card">
              <div className="template-card-header">
                <div className="template-title-wrapper">
                  <h3 className="template-name">{tpl.name}</h3>
                  <div className="template-list-meta">
                    <span className="template-category-tag">{tpl.category}</span>
                    <span className="template-language-label">{tpl.language}</span>
                    {tpl.mappedEvent && <span className="mapping-active-badge"><FaCheckCircle /> Trigger mapped</span>}
                  </div>
                </div>
                <div className="template-list-actions">
                  {getStatusBadge(tpl.status)}
                  <button type="button" className="template-action-button preview" onClick={() => setPreviewTemplate(tpl)}>
                    <FaEye /> Preview
                  </button>
                  <button
                    type="button"
                    className="template-action-button delete"
                    onClick={() => handleDeleteTemplate(tpl)}
                    disabled={deletingTemplateId === tpl._id}
                  >
                    {deletingTemplateId === tpl._id ? <FaSpinner className="spinning" /> : <FaTrash />}
                    {deletingTemplateId === tpl._id ? 'Removing…' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Mapped Event Config */}
              {/* <div className="template-mapping-section">
                <label className="mapping-label">
                  <FaProjectDiagram /> Map to Trigger Event:
                </label>
                <select
                  value={tpl.mappedEvent || 'none'}
                  onChange={(e) => handleMapEvent(tpl._id, e.target.value)}
                  className="mapping-select"
                >
                  <option value="none">None (Manual Dispatch Only)</option>
                  <option value="order_confirmation">E-Commerce: Order Confirmed</option>
                  <option value="order_shipped">E-Commerce: Order Shipped</option>
                  <option value="order_delivered">E-Commerce: Order Delivered</option>
                  <option value="order_cancelled">E-Commerce: Order Cancelled</option>
                  <option value="abandoned_cart">E-Commerce: Abandoned Cart</option>
                </select>
              </div> */}

            </div>
          ))}
        </div>
      )}

      {/* Info notice */}
      <div className="info-notice-box">
        <FaInfoCircle />
        <div>
          <strong>Info on Variables:</strong> Message templates use placeholders like <code>{"{{1}}"}</code> or <code>{"{{2}}"}</code>. During webhook events (like Shopify order confirmation), these variables are automatically populated with real-time merchant parameters (e.g., customer name, order number, tracking ID).
        </div>
      </div>

      {toast && <div className="template-toast"><FaCheckCircle /> {toast}</div>}

      {previewTemplate && (
        <div className="template-modal-overlay" role="dialog" aria-modal="true" aria-label={`Preview ${previewTemplate.name}`}>
          <div className="template-preview-modal">
            <div className="template-modal-header">
              <div>
                <h2><FaWhatsapp /> {previewTemplate.name}</h2>
                <p>{previewTemplate.category} · {previewTemplate.language} · {getStatusBadge(previewTemplate.status)}</p>
              </div>
              <button type="button" className="template-modal-close" onClick={() => setPreviewTemplate(null)} aria-label="Close template preview"><FaTimes /></button>
            </div>
            <div className="template-preview-modal-content">
              <div className="template-phone-preview">
                <div className="template-preview-title"><FaEye /> WhatsApp message preview</div>
                <div className="template-phone-screen">
                  <div className="template-phone-topbar"><span>Business</span><span>● ● ●</span></div>
                  <div className="template-chat-bubble template-saved-chat-bubble">
                    {previewTemplate.components.map(renderComponent)}
                    <time>10:30 AM ✓✓</time>
                  </div>
                </div>
              </div>
              <aside className="template-preview-details">
                <span className="preview-label">Template details</span>
                <div><strong>Status</strong>{getStatusBadge(previewTemplate.status)}</div>
                <div><strong>Category</strong><span>{previewTemplate.category}</span></div>
                <div><strong>Language</strong><code>{previewTemplate.language}</code></div>
                <div><strong>Trigger</strong><span>{previewTemplate.mappedEvent ? previewTemplate.mappedEvent.replaceAll('_', ' ') : 'Manual dispatch only'}</span></div>
                <button type="button" className="template-action-button delete preview-delete" onClick={() => handleDeleteTemplate(previewTemplate)} disabled={deletingTemplateId === previewTemplate._id}>
                  <FaTrash /> Remove from Kwickbot list
                </button>
              </aside>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="template-modal-overlay" role="dialog" aria-modal="true" aria-label="Create WhatsApp message template">
          <form className="template-create-modal" onSubmit={handleCreateTemplate}>
            <div className="template-modal-header">
              <div>
                <h2><FaFileAlt /> Create WhatsApp Message Template</h2>
                <p>Submit a template directly to your connected Meta Business account for review.</p>
              </div>
              <button type="button" className="template-modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close create template modal"><FaTimes /></button>
            </div>

            {createError && <div className="template-create-error"><FaExclamationCircle /> {createError}</div>}

            <div className="template-modal-grid">
              <section className="template-form-column">
                <div className="template-form-row template-form-row-two">
                  <label>
                    Template Name *
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: sanitizeTemplateName(event.target.value) })}
                      placeholder="order_update"
                      pattern="[a-z0-9_]+"
                      required
                    />
                    <small>Lowercase letters, numbers and underscores only.</small>
                  </label>
                  <label>
                    Category *
                    <select value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })}>
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </label>
                </div>

                <label>
                  Language *
                  <select value={draft.language} onChange={(event) => updateDraft({ language: event.target.value })}>
                    <option value="en_US">English (US)</option>
                    <option value="en_GB">English (UK)</option>
                    <option value="hi">Hindi</option>
                    <option value="gu">Gujarati</option>
                    <option value="mr">Marathi</option>
                  </select>
                </label>

                <label>
                  Header (Optional)
                  <select value={draft.header.type} onChange={(event) => updateDraft({ header: { type: event.target.value, text: '', mediaHandle: '' } })}>
                    <option value="NONE">No header</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                  </select>
                </label>
                {draft.header.type === 'TEXT' && (
                  <label>
                    Header Text
                    <input maxLength="60" value={draft.header.text} onChange={(event) => updateDraft({ header: { ...draft.header, text: event.target.value } })} placeholder="Your order is on its way" required />
                  </label>
                )}
                {draft.header.type === 'IMAGE' && (
                  <label>
                    <span><FaImage /> Meta Image Media Handle</span>
                    <input value={draft.header.mediaHandle} onChange={(event) => updateDraft({ header: { ...draft.header, mediaHandle: event.target.value } })} placeholder="Paste the approved Meta media handle" required />
                    <small>Meta requires an uploaded media handle to submit an image-header template.</small>
                  </label>
                )}

                <label>
                  <span className="template-label-with-action">Body Text * <button type="button" onClick={addVariable}>+ Add Variable</button></span>
                  <textarea value={draft.body} onChange={(event) => updateBody(event.target.value)} placeholder="Hello {{1}}, your order {{2}} is ready." rows="6" maxLength="1024" required />
                  <small>{draft.body.length}/1024 characters. Use sequential values such as {'{{1}}'}, {'{{2}}'}.</small>
                </label>

                {getVariables(draft.body).length > 0 && (
                  <div className="template-variable-samples">
                    <strong>Sample values for Meta review</strong>
                    <p>These are examples only; they will not be sent to customers.</p>
                    {getVariables(draft.body).map((variable, index) => (
                      <label key={variable}>
                        {'{{'}{variable}{'}}'} sample *
                        <input
                          value={draft.variableSamples[index] || ''}
                          onChange={(event) => {
                            const variableSamples = [...draft.variableSamples];
                            variableSamples[index] = event.target.value;
                            updateDraft({ variableSamples });
                          }}
                          placeholder={`Example value for {{${variable}}}`}
                          required
                        />
                      </label>
                    ))}
                  </div>
                )}

                <label>
                  Footer (Optional)
                  <input value={draft.footer} onChange={(event) => updateDraft({ footer: event.target.value })} maxLength="60" placeholder="Reply STOP to opt out" />
                </label>

                <div className="template-buttons-builder">
                  <div className="template-label-with-action">
                    <strong>Buttons (Optional)</strong>
                    <select value={draft.buttonMode} onChange={(event) => setButtonMode(event.target.value)}>
                      <option value="NONE">No buttons</option>
                      <option value="QUICK_REPLY">Quick replies (max 3)</option>
                      <option value="CTA">Call to action (max 2)</option>
                    </select>
                  </div>
                  {draft.buttons.map((button, index) => (
                    <div className="template-button-row" key={`${button.type}-${index}`}>
                      <select value={button.type} onChange={(event) => updateButton(index, { type: event.target.value, url: '', phone_number: '' })} disabled={draft.buttonMode === 'QUICK_REPLY'}>
                        {draft.buttonMode === 'QUICK_REPLY' ? <option value="QUICK_REPLY">Quick reply</option> : <><option value="URL">Visit website</option><option value="PHONE_NUMBER">Call phone</option></>}
                      </select>
                      <input value={button.text} onChange={(event) => updateButton(index, { text: event.target.value })} maxLength="25" placeholder="Button label" required />
                      {button.type === 'URL' && <input value={button.url || ''} onChange={(event) => updateButton(index, { url: event.target.value })} placeholder="https://example.com" required />}
                      {button.type === 'PHONE_NUMBER' && <input value={button.phone_number || ''} onChange={(event) => updateButton(index, { phone_number: event.target.value })} placeholder="+919876543210" required />}
                      <button type="button" className="template-remove-button" onClick={() => removeButton(index)} aria-label="Remove button"><FaTimes /></button>
                    </div>
                  ))}
                  {draft.buttonMode !== 'NONE' && draft.buttons.length < (draft.buttonMode === 'QUICK_REPLY' ? 3 : 2) && (
                    <button type="button" className="template-add-button" onClick={addButton}><FaPlus /> Add button</button>
                  )}
                </div>
              </section>

              <aside className="template-phone-preview">
                <div className="template-preview-title"><FaWhatsapp /> Live WhatsApp Preview</div>
                <div className="template-phone-screen">
                  <div className="template-phone-topbar"><span>Business</span><span>● ● ●</span></div>
                  <div className="template-chat-bubble">
                    {draft.header.type === 'IMAGE' && <div className="template-image-placeholder"><FaImage /> Image header</div>}
                    {draft.header.type === 'TEXT' && draft.header.text && <strong className="template-chat-header">{draft.header.text}</strong>}
                    <p>{renderPreviewBody(draft.body)}</p>
                    {draft.footer && <small>{draft.footer}</small>}
                    <time>10:30 AM ✓✓</time>
                    {draft.buttons.length > 0 && <div className="template-preview-buttons">{draft.buttons.map((button, index) => <span key={index}>{button.type === 'URL' ? <FaLink /> : button.type === 'PHONE_NUMBER' ? <FaPhoneAlt /> : null} {button.text || 'Button label'}</span>)}</div>}
                  </div>
                </div>
                <p className="template-preview-note">Meta will review the final content and buttons before approving this template.</p>
              </aside>
            </div>

            <div className="template-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submittingTemplate}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submittingTemplate}>
                {submittingTemplate ? <><FaSpinner className="spinning" /> Submitting to Meta…</> : <><FaWhatsapp /> Submit for Meta Review</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Templates;
