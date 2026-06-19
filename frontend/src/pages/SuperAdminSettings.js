import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlug, FaSave, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import api from '../services/api';
import './SuperAdmin.css';

function SuperAdminSettings() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_webhook_verify_token: ''
  });
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Protect route
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    const admin = storedAdmin ? JSON.parse(storedAdmin) : null;
    if (!admin || admin.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const response = await api.get('/super-admin/settings');
      if (response.data?.success) {
        const settings = response.data.data;
        setFormData({
          whatsapp_access_token: settings.whatsapp_access_token || '',
          whatsapp_phone_number_id: settings.whatsapp_phone_number_id || '',
          whatsapp_business_account_id: settings.whatsapp_business_account_id || '',
          whatsapp_webhook_verify_token: settings.whatsapp_webhook_verify_token || ''
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMsg('Failed to load system settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await api.post('/super-admin/settings', {
        settings: formData
      });

      if (response.data?.success) {
        setSuccessMsg('System WhatsApp connection settings updated successfully! ✅');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save system connection settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FaPlug style={{ color: '#6366f1' }} /> System Connection Settings
        </h1>
        <p className="page-subtitle">Configure the default platform WhatsApp Cloud API credentials used for sending system notifications, alerts, and invoices.</p>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ padding: '12px 20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#fafafa', borderRadius: '8px', marginBottom: '24px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ padding: '12px 20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fafafa', borderRadius: '8px', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}

      <div className="super-admin-card" style={{ padding: '32px', background: 'rgba(24, 24, 27, 0.6)', border: '1px solid rgba(63, 63, 70, 0.3)', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fafafa', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Meta WhatsApp Cloud API Credentials
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Phone Number ID</label>
            <input
              type="text"
              name="whatsapp_phone_number_id"
              value={formData.whatsapp_phone_number_id}
              onChange={handleChange}
              placeholder="e.g. 1140434719159859"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>This is the 15-digit ID provided by Meta for the specific phone number.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>WhatsApp Business Account ID</label>
            <input
              type="text"
              name="whatsapp_business_account_id"
              value={formData.whatsapp_business_account_id}
              onChange={handleChange}
              placeholder="e.g. 856186027099439"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>This is the Business Account ID under which your phone number and templates are registered.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Webhook Verification Token</label>
            <input
              type="text"
              name="whatsapp_webhook_verify_token"
              value={formData.whatsapp_webhook_verify_token}
              onChange={handleChange}
              placeholder="Enter your webhook verify token"
              style={{ width: '100%', padding: '12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
              required
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>Matches the verification token configured in Meta's Webhook settings.</span>
          </div>

          <div className="settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Meta Access Token (System User Token)</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showToken ? 'text' : 'password'}
                name="whatsapp_access_token"
                value={formData.whatsapp_access_token}
                onChange={handleChange}
                placeholder="EAABo4oSoqvkBR..."
                style={{ width: '100%', padding: '12px 50px 12px 16px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                {showToken ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#71717a' }}>Generate a permanent system user token in your Business Manager settings with <code>whatsapp_business_messaging</code> permissions.</span>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <FaInfoCircle style={{ color: '#6366f1', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.4' }}>Saving these settings will override any default credentials specified in the server `.env` file. The backend will immediately use these details without requiring a reboot.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#6366f1', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer', marginTop: '16px' }}
          >
            <FaSave /> {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SuperAdminSettings;
