import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  FaUserPlus,
  FaUser,
  FaEnvelope,
  FaLock,
  FaBuilding,
  FaPhone,
  FaLayerGroup,
  FaShieldAlt,
  FaWhatsapp,
  FaNetworkWired,
  FaCheckCircle,
  FaArrowLeft,
  FaArrowRight,
  FaSync,
  FaExclamationTriangle,
  FaTimes,
  FaSlidersH,
  FaTag,
  FaCheck,
  FaEye
} from 'react-icons/fa';
import './CustomerOnboardWizard.css';

const SOLUTION_CATEGORIES = [
  {
    id: 'kwickbot_crm',
    name: 'Kwickbot CRM',
    description: 'All-in-one conversational AI support, live chat, broadcasts, and AI knowledge base.',
    icon: FaUser,
    color: '#1677ff'
  },
  {
    id: 'crm_integration',
    name: 'CRM Integration',
    description: 'Bi-directional CRM/ERP sync (Odoo, HubSpot, Salesforce, Zoho) with automation rules.',
    icon: FaNetworkWired,
    color: '#0d9488'
  },
  {
    id: 'whatsapp_api',
    name: 'WhatsApp API',
    description: 'High-throughput developer platform, REST API keys, custom webhooks, and template APIs.',
    icon: FaWhatsapp,
    color: '#8b5cf6'
  },
  {
    id: 'enterprise_custom',
    name: 'Enterprise Custom',
    description: 'Custom bespoke workflows, dedicated SLAs, white-labeling, and tailored permissions.',
    icon: FaShieldAlt,
    color: '#f59e0b'
  }
];

const STEPS = [
  { step: 1, title: 'Merchant Account', icon: FaUser },
  { step: 2, title: 'Solution Type', icon: FaLayerGroup },
  { step: 3, title: 'Plan & Billing', icon: FaTag },
  { step: 4, title: 'Access & Overrides', icon: FaShieldAlt },
  { step: 5, title: 'WhatsApp Setup', icon: FaWhatsapp },
  { step: 6, title: 'CRM Integration', icon: FaNetworkWired },
  { step: 7, title: 'Review & Verify', icon: FaSlidersH },
  { step: 8, title: 'Activation Mode', icon: FaCheckCircle }
];

export default function CustomerOnboardWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [canonicalMeta, setCanonicalMeta] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Account
    name: '',
    email: '',
    password: '',
    businessName: '',
    phoneNumber: '',

    // Step 2: Solution
    solutionType: 'crm_integration',

    // Step 3: Plan
    pricingPlanId: '',
    subscriptionPlan: 'crm_connect',
    billingCycle: 'monthly',
    monthlyPrice: 2999,
    customDiscount: 0,
    geminiTokensLimit: 100000,

    // Step 4: Permissions & Overrides
    customPermissionProfile: 'crm_connect',
    allowedPages: [],
    allowedPermissions: [],
    deniedPages: [],
    deniedPermissions: [],

    // Step 5: WhatsApp
    whatsappPhoneNumber: '',
    wabaId: '',
    phoneNumberId: '',

    // Step 6: CRM Config
    crmProvider: 'odoo',
    crmApiUrl: '',
    crmApiKey: '',
    crmDatabase: '',
    crmUsername: '',

    // Step 7/8: Activation
    isDraft: false,
    subscriptionStatus: 'active',
    sendWelcomeEmail: true
  });

  // Success result state
  const [createdResult, setCreatedResult] = useState(null);

  // Load plans & profiles metadata
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansRes, profilesRes, metaRes] = await Promise.all([
        api.get('/super-admin/plans'),
        api.get('/super-admin/permission-profiles'),
        api.get('/super-admin/permission-profiles/metadata/canonical')
      ]);

      if (plansRes.data.success) {
        setPlans(plansRes.data.data);
      }
      if (profilesRes.data.success) {
        setProfiles(profilesRes.data.data);
      }
      if (metaRes.data.success) {
        setCanonicalMeta(metaRes.data.data);
      }
    } catch (err) {
      console.error('Error loading onboarding metadata:', err);
      setError(err.response?.data?.error || 'Failed to load plans and metadata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When solution type changes, auto-select first matching plan and profile
  const handleSolutionTypeChange = (catId) => {
    const matchingPlans = plans.filter(p => p.category === catId);
    const firstPlan = matchingPlans[0];
    const matchingProfile = profiles.find(p => p.category === catId);

    setFormData(prev => ({
      ...prev,
      solutionType: catId,
      pricingPlanId: firstPlan?._id || '',
      subscriptionPlan: firstPlan?.name || '',
      monthlyPrice: firstPlan?.monthlyPrice || 0,
      customPermissionProfile: firstPlan?.permissionProfile || matchingProfile?.key || 'default',
      allowedPages: firstPlan?.allowedPages || []
    }));
  };

  // When plan changes, update prices and defaults
  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p._id === planId);
    if (!plan) return;

    setFormData(prev => ({
      ...prev,
      pricingPlanId: plan._id,
      subscriptionPlan: plan.name,
      monthlyPrice: prev.billingCycle === 'yearly' && plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice,
      customPermissionProfile: plan.permissionProfile || 'default',
      allowedPages: Array.isArray(plan.allowedPages) ? [...plan.allowedPages] : [],
      geminiTokensLimit: plan.usageLimits?.geminiTokensPerMonth || 50000
    }));
  };

  // Step Navigation Validation
  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
        setError('Please fill in merchant name, email, and password.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        ...formData,
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim()
      };

      const res = await api.post('/super-admin/customers/onboard', payload);
      if (res.data.success) {
        setCreatedResult(res.data.data);
      }
    } catch (err) {
      console.error('Error submitting customer onboard:', err);
      setError(err.response?.data?.error || 'Failed to complete customer onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered plans for chosen solution type
  const availablePlans = plans.filter(p => p.category === formData.solutionType);

  // Calculate final discounted price
  const basePrice = Number(formData.monthlyPrice) || 0;
  const discount = Number(formData.customDiscount) || 0;
  const finalPrice = Math.max(0, basePrice - (basePrice * discount) / 100);

  if (createdResult) {
    return (
      <div className="onboard-container">
        <div className="onboard-success-card">
          <div className="onboard-success-icon"><FaCheckCircle /></div>
          <h2>Merchant Successfully Onboarded!</h2>
          <p className="onboard-success-subtitle">
            Account for <strong>{createdResult.merchant.name}</strong> ({createdResult.merchant.email}) has been provisioned.
          </p>

          <div className="onboard-summary-details">
            <div className="onboard-detail-row">
              <span>Plan Assigned:</span>
              <strong>{createdResult.merchant.subscriptionPlan}</strong>
            </div>
            <div className="onboard-detail-row">
              <span>Status:</span>
              <span className={`onboard-status-badge ${createdResult.merchant.subscriptionStatus}`}>
                {createdResult.merchant.subscriptionStatus.toUpperCase()}
              </span>
            </div>
            <div className="onboard-detail-row">
              <span>Monthly Billed:</span>
              <strong>₹{createdResult.merchant.monthlyPrice} / month</strong>
            </div>
            {createdResult.crmConnection && (
              <div className="onboard-detail-row">
                <span>CRM Connector:</span>
                <strong>{createdResult.crmConnection.provider.toUpperCase()} (Configured)</strong>
              </div>
            )}
            <div className="onboard-detail-row">
              <span>Effective Pages:</span>
              <strong>{createdResult.effectiveAccess?.effectivePages?.length || 0} pages enabled</strong>
            </div>
          </div>

          <div className="onboard-success-actions">
            <button
              className="onboard-btn onboard-btn-secondary"
              onClick={() => {
                setCreatedResult(null);
                setCurrentStep(1);
                setFormData({
                  ...formData,
                  name: '',
                  email: '',
                  password: '',
                  businessName: '',
                  phoneNumber: ''
                });
              }}
            >
              <FaUserPlus /> Onboard Another Customer
            </button>
            <button
              className="onboard-btn onboard-btn-primary"
              onClick={() => navigate(`/dashboard/super-admin/merchants/${createdResult.merchant._id}`)}
            >
              <FaEye /> View Merchant Profile & Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-container">
      {/* Header */}
      <div className="onboard-header">
        <div>
          <h1 className="onboard-title">
            <FaUserPlus className="onboard-header-icon" />
            Customer Onboarding Wizard
          </h1>
          <p className="onboard-subtitle">
            Provision merchant accounts, assign tailored plans & permission profiles, configure CRM connections, and activate live access in one seamless workflow.
          </p>
        </div>
      </div>

      {/* Progress Bar / Stepper */}
      <div className="onboard-stepper">
        {STEPS.map((s) => {
          const isCurrent = s.step === currentStep;
          const isDone = s.step < currentStep;
          const StepIcon = s.icon;
          return (
            <div
              key={s.step}
              className={`onboard-step-item ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => {
                if (s.step < currentStep) setCurrentStep(s.step);
              }}
            >
              <div className="onboard-step-circle">
                {isDone ? <FaCheck /> : <StepIcon />}
              </div>
              <span className="onboard-step-label">{s.title}</span>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="onboard-alert onboard-alert-error">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="onboard-alert-close" onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}

      {/* Wizard Step Card */}
      <div className="onboard-card">
        {loading ? (
          <div className="onboard-loading">
            <FaSync className="onboard-spin" />
            <p>Loading onboarding catalog...</p>
          </div>
        ) : (
          <div>
            {/* STEP 1: MERCHANT ACCOUNT */}
            {currentStep === 1 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 1: Merchant Account & Credentials</h2>
                <p className="onboard-step-desc">Enter primary identity, business details, and administrator credentials.</p>

                <div className="onboard-form-grid">
                  <div className="onboard-form-group">
                    <label>Full Name *</label>
                    <div className="onboard-input-wrap">
                      <FaUser className="onboard-input-icon" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., Rajesh Kumar"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="onboard-form-group">
                    <label>Email Address *</label>
                    <div className="onboard-input-wrap">
                      <FaEnvelope className="onboard-input-icon" />
                      <input
                        type="email"
                        required
                        placeholder="merchant@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="onboard-form-group">
                    <label>Initial Password *</label>
                    <div className="onboard-input-wrap">
                      <FaLock className="onboard-input-icon" />
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="onboard-form-group">
                    <label>Business / Company Name</label>
                    <div className="onboard-input-wrap">
                      <FaBuilding className="onboard-input-icon" />
                      <input
                        type="text"
                        placeholder="e.g., Nexus Retailers Pvt Ltd"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="onboard-form-group">
                    <label>WhatsApp / Phone Number</label>
                    <div className="onboard-input-wrap">
                      <FaPhone className="onboard-input-icon" />
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SOLUTION CATEGORY */}
            {currentStep === 2 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 2: Choose Solution Category</h2>
                <p className="onboard-step-desc">Select the primary product tier matching this customer's operational requirements:</p>

                <div className="onboard-solution-grid">
                  {SOLUTION_CATEGORIES.map(cat => {
                    const isSelected = formData.solutionType === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className={`onboard-solution-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSolutionTypeChange(cat.id)}
                      >
                        <div className="onboard-solution-icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                          <IconComp />
                        </div>
                        <h3 className="onboard-solution-title">{cat.name}</h3>
                        <p className="onboard-solution-desc">{cat.description}</p>
                        {isSelected && <div className="onboard-selected-tag"><FaCheck /> Selected</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: PLAN & BILLING */}
            {currentStep === 3 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 3: Pricing Plan & Commercials</h2>
                <p className="onboard-step-desc">Select a specific plan for the <strong>{SOLUTION_CATEGORIES.find(c => c.id === formData.solutionType)?.name}</strong> category:</p>

                <div className="onboard-plans-grid">
                  {availablePlans.map(p => {
                    const isSelected = formData.pricingPlanId === p._id || formData.subscriptionPlan === p.name;
                    return (
                      <div
                        key={p._id}
                        className={`onboard-plan-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handlePlanChange(p._id)}
                      >
                        <div className="onboard-plan-header">
                          <h4 className="onboard-plan-name">{p.displayName}</h4>
                          {p.badge && <span className="onboard-plan-badge">{p.badge}</span>}
                        </div>
                        <div className="onboard-plan-price">
                          ₹{p.monthlyPrice} <span className="onboard-plan-period">/ month</span>
                        </div>
                        <p className="onboard-plan-desc">{p.shortDescription || 'Standard feature entitlement'}</p>
                        <div className="onboard-plan-profile-tag">
                          Profile: <code>{p.permissionProfile}</code>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h3 className="onboard-subheading">Commercial Customizations</h3>
                <div className="onboard-form-grid">
                  <div className="onboard-form-group">
                    <label>Billing Cycle</label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    >
                      <option value="monthly">Monthly Recurring</option>
                      <option value="yearly">Yearly (Annual Contract)</option>
                    </select>
                  </div>

                  <div className="onboard-form-group">
                    <label>Base Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>Special Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.customDiscount}
                      onChange={(e) => setFormData({ ...formData, customDiscount: Number(e.target.value) })}
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>Final Monthly Invoice Amount</label>
                    <div className="onboard-calculated-price">
                      ₹{finalPrice} / month {discount > 0 && <span className="onboard-disc-note">({discount}% off ₹{basePrice})</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ACCESS & PERMISSION OVERRIDES */}
            {currentStep === 4 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 4: Permission Profile & Customer Overrides</h2>
                <p className="onboard-step-desc">Configure the base profile and optional merchant-specific access overrides:</p>

                <div className="onboard-form-grid">
                  <div className="onboard-form-group full-width">
                    <label>Base Permission Profile</label>
                    <select
                      value={formData.customPermissionProfile}
                      onChange={(e) => setFormData({ ...formData, customPermissionProfile: e.target.value })}
                    >
                      {profiles.map(prof => (
                        <option key={prof._id} value={prof.key}>
                          {prof.name} ({prof.key}) - {prof.category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="onboard-profile-summary-box">
                  <h4>Selected Profile: <code>{formData.customPermissionProfile}</code></h4>
                  <p>
                    This merchant will inherit defaults from this profile. You can also grant custom page access overrides or restrict specific modules below.
                  </p>
                </div>

                <h3 className="onboard-subheading">Module Access Check (Inherited + Overrides)</h3>
                <div className="onboard-pages-check-grid">
                  {canonicalMeta?.pageGroups && Object.entries(canonicalMeta.pageGroups).map(([grp, pgs]) => (
                    <div key={grp} className="onboard-page-grp">
                      <h5>{grp.replace('_', ' ').toUpperCase()}</h5>
                      {pgs.map(p => {
                        const isSelected = formData.allowedPages?.includes(p.key);
                        return (
                          <label key={p.key} className={`onboard-page-chk ${isSelected ? 'active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const cur = formData.allowedPages || [];
                                const updated = cur.includes(p.key) ? cur.filter(k => k !== p.key) : [...cur, p.key];
                                setFormData({ ...formData, allowedPages: updated });
                              }}
                            />
                            <span>{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: WHATSAPP SETUP */}
            {currentStep === 5 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 5: WhatsApp Cloud API Setup (Optional)</h2>
                <p className="onboard-step-desc">Configure the merchant's Meta Cloud API credentials or leave blank to connect later from the merchant dashboard:</p>

                <div className="onboard-form-grid" data-lpignore="true">
                  <div className="onboard-form-group">
                    <label>WhatsApp Business Phone Number</label>
                    <input
                      type="text"
                      name="onboard_wa_phone_number"
                      placeholder="+91 98765 43210"
                      value={formData.whatsappPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappPhoneNumber: e.target.value })}
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>WhatsApp Business Account ID (WABA ID)</label>
                    <input
                      type="text"
                      name="onboard_waba_account_id"
                      placeholder="e.g., 1084829104928"
                      value={formData.wabaId}
                      onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>Phone Number ID</label>
                    <input
                      type="text"
                      name="onboard_wa_phone_number_id"
                      placeholder="e.g., 1039482019482"
                      value={formData.phoneNumberId}
                      onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: CRM INTEGRATION */}
            {currentStep === 6 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 6: CRM Connector Setup (Optional)</h2>
                <p className="onboard-step-desc">Provision an initial CRM connection for synchronization (e.g. Odoo, HubSpot, Salesforce):</p>

                <div className="onboard-form-grid" data-lpignore="true">
                  <div className="onboard-form-group">
                    <label>CRM Provider</label>
                    <select
                      value={formData.crmProvider}
                      onChange={(e) => setFormData({ ...formData, crmProvider: e.target.value })}
                    >
                      <option value="odoo">Odoo ERP</option>
                      <option value="hubspot">HubSpot CRM</option>
                      <option value="salesforce">Salesforce CRM</option>
                      <option value="zoho">Zoho CRM</option>
                      <option value="custom">Custom REST CRM / Webhook</option>
                    </select>
                  </div>

                  <div className="onboard-form-group">
                    <label>CRM API Base URL</label>
                    <input
                      type="text"
                      name="onboard_crm_api_url"
                      placeholder="https://mycompany.odoo.com"
                      value={formData.crmApiUrl}
                      onChange={(e) => setFormData({ ...formData, crmApiUrl: e.target.value })}
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>API Key / Access Token</label>
                    <input
                      type="password"
                      name="onboard_crm_api_secret_key"
                      placeholder="Secret API key or token"
                      value={formData.crmApiKey}
                      onChange={(e) => setFormData({ ...formData, crmApiKey: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>Database Name (for Odoo)</label>
                    <input
                      type="text"
                      name="onboard_crm_database_name"
                      placeholder="e.g., mycompany-db"
                      value={formData.crmDatabase}
                      onChange={(e) => setFormData({ ...formData, crmDatabase: e.target.value })}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>

                  <div className="onboard-form-group">
                    <label>Username / Login Email (for Odoo)</label>
                    <input
                      type="text"
                      name="onboard_crm_login_user"
                      placeholder="admin@mycompany.com"
                      value={formData.crmUsername}
                      onChange={(e) => setFormData({ ...formData, crmUsername: e.target.value })}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: REVIEW & VERIFY */}
            {currentStep === 7 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 7: Verification & Summary Checklist</h2>
                <p className="onboard-step-desc">Review the configuration before activating the customer:</p>

                <div className="onboard-review-grid">
                  <div className="onboard-review-card">
                    <h4>Merchant Profile</h4>
                    <p><strong>Name:</strong> {formData.name}</p>
                    <p><strong>Email:</strong> {formData.email}</p>
                    <p><strong>Business:</strong> {formData.businessName || 'N/A'}</p>
                    <p><strong>Phone:</strong> {formData.phoneNumber || 'N/A'}</p>
                  </div>

                  <div className="onboard-review-card">
                    <h4>Plan & Commercials</h4>
                    <p><strong>Solution:</strong> {formData.solutionType}</p>
                    <p><strong>Plan:</strong> {formData.subscriptionPlan}</p>
                    <p><strong>Billing:</strong> {formData.billingCycle}</p>
                    <p><strong>Price:</strong> ₹{finalPrice} / month</p>
                  </div>

                  <div className="onboard-review-card">
                    <h4>Permissions</h4>
                    <p><strong>Profile:</strong> {formData.customPermissionProfile}</p>
                    <p><strong>Pages Enabled:</strong> {formData.allowedPages?.length || 'Default'} modules</p>
                  </div>

                  <div className="onboard-review-card">
                    <h4>Integrations</h4>
                    <p><strong>WhatsApp:</strong> {formData.whatsappPhoneNumber ? 'Configured' : 'Pending'}</p>
                    <p><strong>CRM Provider:</strong> {formData.crmApiUrl ? `${formData.crmProvider.toUpperCase()} (Set)` : 'None'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: ACTIVATION MODE */}
            {currentStep === 8 && (
              <div className="onboard-step-content">
                <h2 className="onboard-step-title">Step 8: Final Activation & Notifications</h2>
                <p className="onboard-step-desc">Choose how the merchant account should be published and activated:</p>

                <div className="onboard-activation-options">
                  <label className={`onboard-radio-card ${!formData.isDraft ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="activationMode"
                      checked={!formData.isDraft}
                      onChange={() => setFormData({ ...formData, isDraft: false, subscriptionStatus: 'active' })}
                    />
                    <div>
                      <strong>Activate Immediately (Live Account)</strong>
                      <p>Merchant can log in immediately and use allocated features and quotas.</p>
                    </div>
                  </label>

                  <label className={`onboard-radio-card ${formData.isDraft ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="activationMode"
                      checked={formData.isDraft}
                      onChange={() => setFormData({ ...formData, isDraft: true, subscriptionStatus: 'draft' })}
                    />
                    <div>
                      <strong>Save as Draft (Staging / Pending Review)</strong>
                      <p>Account remains inactive until manually approved and activated.</p>
                    </div>
                  </label>
                </div>

                <div className="onboard-email-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.sendWelcomeEmail}
                      onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                    />
                    <span>Send Welcome & Login Access Email to <strong>{formData.email}</strong></span>
                  </label>
                </div>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="onboard-footer">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="onboard-btn onboard-btn-secondary"
                  onClick={handlePrevStep}
                  disabled={submitting}
                >
                  <FaArrowLeft /> Back
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  className="onboard-btn onboard-btn-primary"
                  onClick={handleNextStep}
                >
                  Next Step <FaArrowRight />
                </button>
              ) : (
                <button
                  type="button"
                  className="onboard-btn onboard-btn-success"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                >
                  {submitting ? <FaSync className="onboard-spin" /> : <FaCheckCircle />}
                  <span>{formData.isDraft ? 'Save Customer Draft' : 'Provision & Activate Customer'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
