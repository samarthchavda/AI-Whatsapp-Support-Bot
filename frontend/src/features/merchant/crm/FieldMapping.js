import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FaExchangeAlt, 
  FaPlus, 
  FaTrash, 
  FaSave, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaPlug,
  FaSync
} from 'react-icons/fa';
import { 
  getCrmConnections, 
  getFieldMappings, 
  createFieldMapping, 
  updateFieldMapping, 
  deleteFieldMapping 
} from '../../../services/api';
import { useEffectiveAccess } from '../../../context/EffectiveAccessContext';
import './IntegrationDashboard.css';

const TRANSFORMATIONS = [
  { id: 'direct', name: 'Direct Copy (No change)' },
  { id: 'phone_e164', name: 'E.164 Phone Format (+91...)' },
  { id: 'lowercase', name: 'Lowercase' },
  { id: 'uppercase', name: 'Uppercase' },
  { id: 'date_format', name: 'Standard Date/Time' },
  { id: 'json_extract', name: 'Extract JSON Property' }
];

const ENTITY_TYPES = [
  { id: 'contact', name: 'Contact / Customer' },
  { id: 'lead', name: 'CRM Lead / Inquiry' },
  { id: 'order', name: 'Sales Order / Invoice' },
  { id: 'deal', name: 'Opportunity / Deal' },
  { id: 'ticket', name: 'Support Ticket / Escalation' },
  { id: 'custom', name: 'Custom Entity' }
];

const CRM_CONNECT_DEFAULT_ROWS = [
  { sourceField: 'customer_phone', targetField: 'phone', transformation: 'phone_e164', defaultValue: '' },
  { sourceField: 'customer_name', targetField: 'contact_name', transformation: 'direct', defaultValue: '' }
];

const normalizePlanKey = (plan) => String(plan || '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

function FieldMapping() {
  const { subscription } = useEffectiveAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const storedPlan = JSON.parse(localStorage.getItem('admin') || '{}')?.subscriptionPlan;
  const planKey = normalizePlanKey(subscription?.planSlug || subscription?.planName || storedPlan);
  const isCrmConnectPlan = planKey === 'crm_connect';
  const [connections, setConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(searchParams.get('connectionId') || '');
  const [mappingsList, setMappingsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active editing mapping form
  const [editingMappingId, setEditingMappingId] = useState(null);
  const [entityType, setEntityType] = useState(isCrmConnectPlan ? 'lead' : 'contact');
  const [direction, setDirection] = useState(isCrmConnectPlan ? 'kwickbot_to_crm' : 'bidirectional');
  const [fieldRows, setFieldRows] = useState(isCrmConnectPlan ? CRM_CONNECT_DEFAULT_ROWS : [
    { sourceField: 'phone', targetField: 'customer_phone', transformation: 'phone_e164', defaultValue: '' },
    { sourceField: 'name', targetField: 'customer_name', transformation: 'direct', defaultValue: '' }
  ]);
  const [saving, setSaving] = useState(false);

  const fetchConnectionsAndMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const connRes = await getCrmConnections();
      if (connRes.data && connRes.data.success) {
        const conns = connRes.data.data || [];
        setConnections(conns);

        let activeConnId = selectedConnectionId;
        if (!activeConnId && conns.length > 0) {
          activeConnId = conns[0]._id;
          setSelectedConnectionId(activeConnId);
          setSearchParams({ connectionId: activeConnId });
        }

        if (activeConnId) {
          const mapRes = await getFieldMappings(activeConnId);
          if (mapRes.data && mapRes.data.success) {
            setMappingsList(mapRes.data.data || []);
          }
        }
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load field mappings');
    } finally {
      setLoading(false);
    }
  }, [selectedConnectionId, setSearchParams]);

  useEffect(() => {
    fetchConnectionsAndMappings();
  }, [fetchConnectionsAndMappings]);

  // Effective access loads asynchronously. Once CRM Connect is identified,
  // immediately reset the editor to its only permitted Odoo Lead mapping.
  useEffect(() => {
    if (isCrmConnectPlan) {
      setEntityType('lead');
      setDirection('kwickbot_to_crm');
      setFieldRows(CRM_CONNECT_DEFAULT_ROWS);
    }
  }, [isCrmConnectPlan]);

  const handleConnectionChange = async (connId) => {
    setSelectedConnectionId(connId);
    setSearchParams({ connectionId: connId });
    setEditingMappingId(null);
    try {
      setLoading(true);
      const mapRes = await getFieldMappings(connId);
      if (mapRes.data && mapRes.data.success) {
        setMappingsList(mapRes.data.data || []);
      }
    } catch (err) {
      setError('Failed to load mappings for this connection');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setFieldRows(prev => [
      ...prev,
      { sourceField: '', targetField: '', transformation: 'direct', defaultValue: '' }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (fieldRows.length === 1) {
      alert('At least one field mapping row is required');
      return;
    }
    setFieldRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index, field, value) => {
    setFieldRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectMappingForEdit = (mapping) => {
    setEditingMappingId(mapping._id);
    setEntityType(isCrmConnectPlan ? 'lead' : (mapping.entityType || 'contact'));
    setDirection(isCrmConnectPlan ? 'kwickbot_to_crm' : (mapping.direction || 'bidirectional'));
    setFieldRows(mapping.mappings && mapping.mappings.length > 0 ? mapping.mappings : [
      { sourceField: '', targetField: '', transformation: 'direct', defaultValue: '' }
    ]);
  };

  const handleResetForm = () => {
    setEditingMappingId(null);
    setEntityType(isCrmConnectPlan ? 'lead' : 'contact');
    setDirection(isCrmConnectPlan ? 'kwickbot_to_crm' : 'bidirectional');
    setFieldRows(isCrmConnectPlan ? CRM_CONNECT_DEFAULT_ROWS : [
      { sourceField: 'phone', targetField: 'customer_phone', transformation: 'phone_e164', defaultValue: '' },
      { sourceField: 'name', targetField: 'customer_name', transformation: 'direct', defaultValue: '' }
    ]);
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!selectedConnectionId) {
      alert('Please select a CRM connection first');
      return;
    }

    const invalidRow = fieldRows.find(r => !r.sourceField.trim() || !r.targetField.trim());
    if (invalidRow) {
      alert('All mapping rows must have both Source Field and Target Field populated');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        entityType: isCrmConnectPlan ? 'lead' : entityType,
        direction: isCrmConnectPlan ? 'kwickbot_to_crm' : direction,
        mappings: fieldRows
      };

      if (editingMappingId) {
        await updateFieldMapping(editingMappingId, payload);
        setSuccessMsg('Field mapping updated successfully');
      } else {
        await createFieldMapping(selectedConnectionId, payload);
        setSuccessMsg('Field mapping rule created successfully');
      }

      // Reload mappings
      const mapRes = await getFieldMappings(selectedConnectionId);
      if (mapRes.data && mapRes.data.success) {
        setMappingsList(mapRes.data.data || []);
      }
      handleResetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save field mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Are you sure you want to delete this field mapping?')) return;
    try {
      await deleteFieldMapping(id);
      setMappingsList(prev => prev.filter(m => m._id !== id));
      if (editingMappingId === id) {
        handleResetForm();
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete mapping');
    }
  };

  return (
    <div className="integration-container">
      {/* Header */}
      <div className="integration-header">
        <div className="integration-header-content">
          <div className="integration-badge">
            <FaExchangeAlt /> Field Mapping Studio
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>{isCrmConnectPlan ? 'Safe Odoo Lead Mapping' : 'Dynamic CRM Field Transformations'}</h1>
              <p>{isCrmConnectPlan ? 'Map WhatsApp enquiry details to an Odoo lead. This plan cannot create contacts, orders, quotations, or invoices.' : 'Map CRM schema fields (Odoo, Zoho, HubSpot, Salesforce) with Kwickbot WhatsApp variables and customer attributes.'}</p>
            </div>
            <button className="quick-action-btn" onClick={fetchConnectionsAndMappings} disabled={loading}>
              <FaSync className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: 'rgba(22, 163, 106, 0.12)',
          border: '1px solid rgba(22, 163, 106, 0.3)',
          color: '#16a36a',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaCheckCircle /> {successMsg}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {isCrmConnectPlan && (
        <div style={{
          background: 'rgba(22, 119, 255, 0.08)', border: '1px solid rgba(22, 119, 255, 0.22)',
          color: 'var(--text-secondary, #475467)', padding: '12px 16px', borderRadius: '10px',
          marginBottom: '20px', fontSize: '13px', lineHeight: 1.55
        }}>
          <strong style={{ color: 'var(--text-primary, #101828)' }}>CRM Connect safety:</strong> WhatsApp enquiry → Odoo lead only. Existing contacts can be linked, but Kwickbot never creates or edits contacts, sales orders, quotations, or invoices on this plan.
        </div>
      )}

      {/* CRM Connection Selector */}
      <div className="integration-section-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary, #101828)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaPlug style={{ color: 'var(--accent, #1677ff)' }} /> Active CRM Connection:
          </label>
          {connections.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--text-muted, #98a2b3)' }}>
              No CRM connection found. Please create a connection first.
            </span>
          ) : (
            <select 
              value={selectedConnectionId} 
              onChange={e => handleConnectionChange(e.target.value)}
              style={{
                background: 'var(--bg-input, #f8fafc)',
                border: '1px solid var(--border-subtle, #d9e8f7)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-primary, #101828)',
                minWidth: '260px'
              }}
            >
              {connections.map(c => (
                <option key={c._id} value={c._id}>
                  {c.displayName} ({c.provider.toUpperCase()})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: '24px' }}>
        {/* Mapping Editor Card */}
        <div className="integration-section-card">
          <div className="section-header-row">
            <div className="section-title-group">
              <h2>{editingMappingId ? 'Edit Field Mapping' : 'Create Field Mapping Schema'}</h2>
              <p>{isCrmConnectPlan ? 'Configure the approved WhatsApp-to-Odoo lead fields.' : 'Define bidirectional data mapping and format transformations'}</p>
            </div>
            {editingMappingId && (
              <button className="quick-action-btn" onClick={handleResetForm} style={{ fontSize: '12px' }}>
                + New Mapping
              </button>
            )}
          </div>

          <form onSubmit={handleSaveMapping} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isCrmConnectPlan ? (
              <div style={{ padding: '14px 16px', border: '1px solid rgba(22, 119, 255, 0.22)', borderRadius: '10px', background: 'rgba(22, 119, 255, 0.05)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #667085)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>What happens for each new WhatsApp enquiry</div>
                <div style={{ marginTop: '6px', fontSize: '15px', color: 'var(--text-primary, #101828)', fontWeight: '700' }}>WhatsApp enquiry <span style={{ color: 'var(--accent, #1677ff)' }}>→</span> Odoo CRM Lead</div>
                <div style={{ marginTop: '4px', fontSize: '12.5px', color: 'var(--text-secondary, #475467)' }}>This is fixed for CRM Connect. No contact, quotation, invoice, or sales order is created.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group-saas">
                  <label>Entity Type *</label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)}>
                    {ENTITY_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-saas">
                  <label>Sync Direction *</label>
                  <select value={direction} onChange={e => setDirection(e.target.value)}>
                    <option value="bidirectional">Bidirectional (CRM &harr; Kwickbot)</option>
                    <option value="crm_to_kwickbot">Inbound (CRM &rarr; Kwickbot)</option>
                    <option value="kwickbot_to_crm">Outbound (Kwickbot &rarr; CRM)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Field Rows Table */}
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                Field Mapping Table ({fieldRows.length} fields)
              </label>

              <div className="integration-table-container">
                <table className="integration-table">
                  <thead>
                    <tr>
                      <th>{isCrmConnectPlan ? 'Kwickbot Field (Source)' : 'CRM Field (Source)'}</th>
                      <th>{isCrmConnectPlan ? 'Odoo Lead Field (Target)' : 'Kwickbot Field (Target)'}</th>
                      <th>Transformation</th>
                      <th>Default Value</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <input 
                            type="text" 
                            placeholder="e.g. phone, mobile" 
                            value={row.sourceField}
                            onChange={e => handleRowChange(idx, 'sourceField', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: '1px solid var(--border-subtle, #d9e8f7)', borderRadius: '6px' }}
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            placeholder="e.g. customer_phone" 
                            value={row.targetField}
                            onChange={e => handleRowChange(idx, 'targetField', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: '1px solid var(--border-subtle, #d9e8f7)', borderRadius: '6px' }}
                            required
                          />
                        </td>
                        <td>
                          <select 
                            value={row.transformation || 'direct'}
                            onChange={e => handleRowChange(idx, 'transformation', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-subtle, #d9e8f7)', borderRadius: '6px' }}
                          >
                            {TRANSFORMATIONS.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            placeholder="Optional fallback" 
                            value={row.defaultValue || ''}
                            onChange={e => handleRowChange(idx, 'defaultValue', e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-subtle, #d9e8f7)', borderRadius: '6px' }}
                          />
                        </td>
                        <td>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveRow(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                            title="Remove row"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="quick-action-btn" onClick={handleAddRow}>
                  <FaPlus /> Add Field Row
                </button>
                <button type="submit" className="quick-action-btn primary" disabled={saving}>
                  <FaSave /> {saving ? 'Saving...' : (editingMappingId ? 'Update Mapping' : 'Save Mapping')}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Mappings List */}
        <div className="integration-section-card">
          <div className="section-header-row" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Active Mappings ({mappingsList.length})</h3>
          </div>

          {mappingsList.length === 0 ? (
            <div className="empty-state-card" style={{ padding: '24px 12px' }}>
              <FaExchangeAlt className="empty-state-icon" style={{ fontSize: '28px' }} />
              <p style={{ fontSize: '12.5px', margin: 0 }}>No field mappings configured for this connection yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mappingsList.map(m => (
                <div 
                  key={m._id} 
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: editingMappingId === m._id ? '2px solid var(--accent, #1677ff)' : '1px solid var(--border-subtle, #d9e8f7)',
                    background: 'var(--bg-input, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', textTransform: 'capitalize' }}>
                      {m.entityType} Entity
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #98a2b3)', textTransform: 'uppercase', fontWeight: '600' }}>
                      {m.direction}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #667085)' }}>
                    {m.mappings?.length || 0} fields mapped
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    <button 
                      className="quick-action-btn" 
                      style={{ padding: '4px 10px', fontSize: '11.5px' }}
                      onClick={() => handleSelectMappingForEdit(m)}
                    >
                      Edit
                    </button>
                    <button 
                      className="quick-action-btn" 
                      style={{ padding: '4px 10px', fontSize: '11.5px', color: '#ef4444', borderColor: '#ef4444' }}
                      onClick={() => handleDeleteMapping(m._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FieldMapping;
