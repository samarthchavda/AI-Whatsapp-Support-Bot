import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import api, { clearAuthState, refreshAuth } from './services/api';
import io from 'socket.io-client';
import Dashboard from './pages/merchant/Dashboard/Dashboard';
import Profile from './pages/merchant/Profile/Profile';
import Conversations from './pages/merchant/Conversations/Conversations';
import Orders from './pages/merchant/Orders/Orders';
import Escalations from './pages/merchant/Escalations/Escalations';
import WhatsAppConnect from './pages/merchant/WhatsAppConnect/WhatsAppConnect';
import KnowledgeBase from './pages/merchant/KnowledgeBase/KnowledgeBase';
import LiveChat from './pages/merchant/LiveChat/LiveChat';
import Broadcast from './pages/merchant/Broadcast/Broadcast';
import Analytics from './pages/merchant/Analytics/Analytics';
import Integrations from './pages/merchant/Integrations/Integrations';
import DeveloperApi from './pages/merchant/DeveloperApi/DeveloperApi';
import SuperAdmin from './pages/superAdmin/Dashboard/SuperAdmin';
import SuperAdminHealth from './pages/superAdmin/SystemHealth/SuperAdminHealth';
import SuperAdminAnnouncements from './pages/superAdmin/Announcements/SuperAdminAnnouncements';
import SuperAdminUserDetail from './pages/superAdmin/Merchants/SuperAdminUserDetail';
import SuperAdminLiveOps from './pages/superAdmin/Operations/SuperAdminLiveOps';
import SuperAdminIntegrationHealth from './pages/superAdmin/Operations/SuperAdminIntegrationHealth';
import SuperAdminBillingRevenue from './pages/superAdmin/Finance/SuperAdminBillingRevenue';
import SuperAdminAuditLogs from './pages/superAdmin/Security/SuperAdminAuditLogs';
import SuperAdminFeatureFlags from './pages/superAdmin/Platform/SuperAdminFeatureFlags';
import SuperAdminTrialPolicy from './pages/superAdmin/Platform/SuperAdminTrialPolicy';
import PlanManager from './pages/superAdmin/PlanManager/PlanManager';
import PermissionProfiles from './pages/superAdmin/PermissionProfiles/PermissionProfiles';
import CustomerOnboardWizard from './pages/superAdmin/OnboardingWizard/CustomerOnboardWizard';
import SuperAdminBudget from './pages/superAdmin/Budget/SuperAdminBudget';
import SuperAdminSettings from './pages/superAdmin/Settings/SuperAdminSettings';
import Billing from './pages/merchant/Billing/Billing';
import Templates from './pages/merchant/Templates/Templates';
import AbandonedCarts from './pages/merchant/AbandonedCarts/AbandonedCarts';
import SuperAdminBlog from './pages/superAdmin/Blog/SuperAdminBlog';
import Products from './pages/merchant/Products/Products';
import MerchantLeads from './pages/merchant/Leads/MerchantLeads';
import Contacts from './pages/merchant/Contacts/Contacts';
import SupportCenter from './pages/merchant/SupportCenter/SupportCenter';

// Access Control & Platform Module Imports
import { EffectiveAccessProvider, useEffectiveAccess } from './context/EffectiveAccessContext';
import ProtectedFeatureRoute from './components/ProtectedFeatureRoute/ProtectedFeatureRoute';
import { SaMerchants, SaMerchantDetail, SaPlans, SaPlanEditor, SaCoupons } from './super-admin-ui';

// WhatsApp API / Developer Platform Pages
import ApiDashboard from './pages/merchant/DeveloperPlatform/ApiDashboard';
import ApiKeyManager from './pages/merchant/DeveloperPlatform/ApiKeyManager';
import ApiDocs from './pages/merchant/DeveloperPlatform/ApiDocs';
import WebhookConfig from './pages/merchant/DeveloperPlatform/WebhookConfig';
import ApiLogs from './pages/merchant/DeveloperPlatform/ApiLogs';
import FailedWebhooks from './pages/merchant/DeveloperPlatform/FailedWebhooks';
import ApiUsage from './pages/merchant/DeveloperPlatform/ApiUsage';

import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import './App.css';
import './MerchantTheme.css';
import './MerchantDataPages.css';

function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

function ProtectedRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <ExternalRedirect to="/login" />;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_TOKEN_KEY = 'token';

const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

const decodeJwtPayload = (token) => {
  const payload = token.split('.')[1];

  if (!payload) {
    return null;
  }

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(window.atob(paddedBase64));
};

const isJwtExpired = (token) => {
  try {
    const decodedPayload = decodeJwtPayload(token);
    return !decodedPayload || (typeof decodedPayload.exp === 'number' && decodedPayload.exp * 1000 <= Date.now());
  } catch (error) {
    return true;
  }
};

function ThemeHandler({ admin }) {
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('dark-theme');
    document.body.classList.toggle('merchant-theme', Boolean(admin && admin.role !== 'super_admin'));
    return () => document.body.classList.remove('merchant-theme');
  }, [location.pathname, admin]);

  return null;
}

function DefaultDashboardLanding({ admin }) {
  if (admin && admin.role === 'super_admin') {
    return <Navigate to="/dashboard/super-admin" replace />;
  }
  return <Dashboard />;
}

const MERCHANT_VISIBLE_PATHS = new Set([
  '/dashboard',
  '/dashboard/live-chat',
  '/dashboard/conversations',
  '/dashboard/contacts',
  '/dashboard/templates',
  '/dashboard/broadcast',
  '/dashboard/knowledge-base',
  '/dashboard/orders',
  '/dashboard/products',
  '/dashboard/abandoned-carts',
  '/dashboard/leads',
  '/dashboard/escalations',
  '/dashboard/analytics',
  '/dashboard/whatsapp-connect',
  '/dashboard/integrations',
  '/dashboard/developer',
  '/dashboard/developer/api-keys',
  '/dashboard/developer/docs',
  '/dashboard/developer/webhooks',
  '/dashboard/developer/logs',
  '/dashboard/developer/failed-webhooks',
  '/dashboard/developer/usage',
  '/dashboard/billing',
  '/dashboard/profile',
  '/dashboard/support'
]);

function PreviewBanner({ admin }) {
  const access = useEffectiveAccess();
  if (!admin || admin.role === 'super_admin') return null;
  const expired = Boolean(admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= new Date());
  const isTrialStatus = admin.subscriptionStatus === 'trial';
  const isPreviewSandbox = admin.selfSignupTrial === true && (admin.subscriptionStatus !== 'active' || expired);

  if (!isTrialStatus && !isPreviewSandbox) return null;

  const policy = access?.trialPolicy || {};
  const daysLeft = admin.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(admin.subscriptionEndDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  let title = policy.bannerTitle || 'Free preview:';
  let message;

  if (isPreviewSandbox) {
    const rawMessage = policy.bannerMessage || 'Connect WhatsApp and send up to {broadcastLimit} test broadcasts. Other pages are view-only until you activate a plan.';
    message = String(rawMessage)
      .replace(/\{broadcastLimit\}/g, String(policy.testBroadcastLimit ?? 2))
      .replace(/\{recipientLimit\}/g, String(policy.testRecipientLimit ?? 5))
      .replace(/\{trialDays\}/g, String(policy.trialDays ?? 14));
  } else {
    const planLabel = String(admin.subscriptionPlan || 'starter').replace(/^\w/, (c) => c.toUpperCase());
    title = `${planLabel} Trial:`;
    message = expired
      ? 'Your trial period has ended. Choose a paid plan in Billing to keep your workspace active.'
      : 'Your trial workspace is active. Activate a paid plan anytime before the trial ends to avoid interruption.';
  }

  return (
    <div className="merchant-preview-banner" role="status">
      <span>
        {daysLeft !== null && (
          <strong style={{ marginRight: '8px', color: daysLeft === 0 ? '#dc2626' : '#2f5420' }}>
            {daysLeft === 0 ? 'Trial ended ·' : `${daysLeft}d left ·`}
          </strong>
        )}
        <strong>{title}</strong> {message}
      </span>
      <Link to="/dashboard/billing">{expired ? 'Activate plan' : 'Choose a plan'}</Link>
    </div>
  );
}

function TrialStatusPopup({ admin }) {
  const access = useEffectiveAccess();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('kwickbot_trial_popup_dismissed') === '1');

  if (!admin || admin.role === 'super_admin' || dismissed) return null;
  const expired = Boolean(admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= new Date());
  const isTrialStatus = admin.subscriptionStatus === 'trial';
  const isPreviewSandbox = admin.selfSignupTrial === true && (admin.subscriptionStatus !== 'active' || expired);
  if (!isTrialStatus && !isPreviewSandbox) return null;

  const policy = access?.trialPolicy || {};
  const daysLeft = admin.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(admin.subscriptionEndDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : (policy.trialDays ?? 14);
  const planLabel = String(admin.subscriptionPlan || 'starter').replace(/^\w/, (c) => c.toUpperCase());
  const endDateStr = admin.subscriptionEndDate
    ? new Date(admin.subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const closePopup = () => {
    sessionStorage.setItem('kwickbot_trial_popup_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trial Status"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#1d2a13',
          border: '1px solid #c8dcb7',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 700,
              background: expired ? '#fee2e2' : '#eef5e4',
              color: expired ? '#b91c1c' : '#2f5420'
            }}
          >
            {expired ? 'TRIAL ENDED' : `${daysLeft} DAYS LEFT IN TRIAL`}
          </span>
          <button
            type="button"
            onClick={closePopup}
            aria-label="Close trial notice"
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#556447' }}
          >
            ✕
          </button>
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#1d2a13' }}>
          {expired ? `Your ${planLabel} trial has ended` : `Welcome to your ${planLabel} Free Trial`}
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: '#3a4a2e', lineHeight: 1.55 }}>
          {isPreviewSandbox
            ? `You are in Free Preview mode (up to ${policy.testBroadcastLimit ?? 2} test broadcasts for ${policy.testRecipientLimit ?? 5} contacts each). Trial ends ${endDateStr}.`
            : `Your ${planLabel} trial runs until ${endDateStr}. Upgrade or activate your plan anytime in Billing to avoid service interruption.`}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={closePopup}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              background: '#f5f8ef',
              border: '1px solid #d4e3c5',
              color: '#263b1d',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Continue Trial
          </button>
          <Link
            to="/dashboard/billing"
            onClick={closePopup}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#2a3d18',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Activate Plan
          </Link>
        </div>
      </div>
    </div>
  );
}

function MerchantPageGate({ admin, children }) {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/$/, '') || '/dashboard';
  if (admin?.role !== 'super_admin' && !MERCHANT_VISIBLE_PATHS.has(normalizedPath)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sidebarOpen') === 'true';
  });
  const [merchantSidebarOpen, setMerchantSidebarOpen] = useState(false);
  const [previewGateMessage, setPreviewGateMessage] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dashboard-theme') || 'dark';
  });

  const handleToggleSidebar = () => {
    if (admin?.role !== 'super_admin') {
      setMerchantSidebarOpen(prev => !prev);
      return;
    }
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

  const isMerchantPortal = Boolean(admin && admin.role !== 'super_admin');
  const activeSidebarOpen = isMerchantPortal ? merchantSidebarOpen : sidebarOpen;

  useEffect(() => {
    const onPreviewGate = (event) => setPreviewGateMessage(event.detail?.message || 'Choose a plan to use this feature.');
    window.addEventListener('kwickbot:preview-gate', onPreviewGate);
    return () => window.removeEventListener('kwickbot:preview-gate', onPreviewGate);
  }, []);

  useEffect(() => {
    if (!merchantSidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMerchantSidebarOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [merchantSidebarOpen]);

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('dashboard-theme', next);
      return next;
    });
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAdmin = localStorage.getItem('admin');
        const storedToken = getStoredAccessToken();

        if (
          storedToken && 
          storedToken !== 'undefined' && 
          storedToken !== 'null' && 
          storedAdmin && 
          storedAdmin !== 'undefined' && 
          storedAdmin !== 'null' && 
          !isJwtExpired(storedToken)
        ) {
          try {
            const parsedAdmin = JSON.parse(storedAdmin);
            if (parsedAdmin) {
              setIsAuthenticated(true);
              setAdmin(parsedAdmin);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing stored admin payload:', e);
            clearAuthState();
          }
        }

        const isDashboardRoute = window.location.pathname.startsWith('/dashboard');
        const hasSessionTrace = (storedToken && storedToken !== 'undefined' && storedToken !== 'null') || 
                                (storedAdmin && storedAdmin !== 'undefined' && storedAdmin !== 'null');

        if (hasSessionTrace || isDashboardRoute) {
          try {
            const response = await refreshAuth();
            const refreshedToken = response;
            const refreshedAdmin = localStorage.getItem('admin');

            if (
              refreshedToken && 
              refreshedToken !== 'undefined' && 
              refreshedToken !== 'null' && 
              refreshedAdmin && 
              refreshedAdmin !== 'undefined' && 
              refreshedAdmin !== 'null'
            ) {
              const parsedAdmin = JSON.parse(refreshedAdmin);
              setIsAuthenticated(true);
              setAdmin(parsedAdmin);
              setLoading(false);
              return;
            }
          } catch (error) {
            if (hasSessionTrace) {
              console.warn('Session expired. Please log in again.');
            }
            clearAuthState();
          }
        }
      } catch (globalError) {
        console.error('Global auth initialization error:', globalError);
        clearAuthState();
      }

      setIsAuthenticated(false);
      setAdmin(null);
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleUpdateAdmin = (updatedAdmin) => {
    setAdmin(updatedAdmin);
    localStorage.setItem('admin', JSON.stringify(updatedAdmin));
  };

  // Real-time subscription sync & profile refresh from Super Admin
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Refresh profile from server on load to catch instant Super Admin updates
    const syncProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        if (res.data?.data?.admin) {
          const freshAdmin = res.data.data.admin;
          setAdmin(prev => {
            const updated = { ...(prev || {}), ...freshAdmin };
            localStorage.setItem('admin', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        // silent catch
      }
    };
    syncProfile();

    // 2. Listen to real-time Socket.IO subscription & permission updates from Super Admin
    const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || (window.location.hostname === 'localhost' ? 'http://localhost:5001' : window.location.origin);
    const token = getStoredAccessToken();
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined
    });

    socket.on('user_subscription_updated', (data) => {
      const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
      if (currentAdmin && (currentAdmin._id === data.userId || currentAdmin.id === data.userId)) {
        console.log('⚡ Instant subscription update received from Super Admin:', data);
        const updatedAdmin = {
          ...currentAdmin,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionStatus: data.subscriptionStatus,
          monthlyPrice: data.monthlyPrice,
          geminiTokensLimit: data.geminiTokensLimit
        };
        setAdmin(updatedAdmin);
        localStorage.setItem('admin', JSON.stringify(updatedAdmin));
        window.dispatchEvent(new CustomEvent('kwickbot:effective-access-updated'));
      }
    });

    socket.on('effective_access_updated', (data) => {
      const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
      if (!data?.userId || currentAdmin._id === data.userId || currentAdmin.id === data.userId) {
        syncProfile();
        window.dispatchEvent(new CustomEvent('kwickbot:effective-access-updated'));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const [activeAnnouncements, setActiveAnnouncements] = useState([]);

  useEffect(() => {
    if (isAuthenticated && admin && admin.role !== 'super_admin') {
      api.get('/dashboard/announcements')
        .then(res => {
          if (res.data.success) {
            setActiveAnnouncements(res.data.data);
          }
        })
        .catch(err => console.error('Error fetching announcements:', err));
    } else {
      setActiveAnnouncements([]);
    }
  }, [isAuthenticated, admin]);

  const handleDismissAnnouncement = (id) => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    dismissed.push(id);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
    setActiveAnnouncements(prev => prev.filter(ann => ann._id !== id));
  };

  const isImpersonated = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('isImpersonated') === 'true') || localStorage.getItem('isImpersonated') === 'true';
  const impersonatedUserName = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('impersonatedUserName')) || localStorage.getItem('impersonatedUserName') || '';
  const impersonatedUserEmail = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('impersonatedUserEmail')) || localStorage.getItem('impersonatedUserEmail') || '';

  const handleStopImpersonating = () => {
    const originalToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('originalToken')) || localStorage.getItem('originalToken');
    const originalAdmin = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('originalAdmin')) || localStorage.getItem('originalAdmin');
    
    if (originalToken && originalAdmin) {
      localStorage.setItem('token', originalToken);
      localStorage.setItem('accessToken', originalToken);
      localStorage.setItem('admin', originalAdmin);
    }
    
    try {
      sessionStorage.removeItem('originalToken');
      sessionStorage.removeItem('originalAdmin');
      sessionStorage.removeItem('isImpersonated');
      sessionStorage.removeItem('impersonatedUserEmail');
      sessionStorage.removeItem('impersonatedUserName');
    } catch (e) {}

    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isImpersonated');
    localStorage.removeItem('impersonatedUserEmail');
    localStorage.removeItem('impersonatedUserName');
    
    alert('Returned to Super Admin session. Redirecting...');
    window.location.href = '/dashboard/super-admin';
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout API failures and continue clearing local state.
    }

    clearAuthState();
    try {
      sessionStorage.clear();
    } catch (e) {}

    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isImpersonated');
    localStorage.removeItem('impersonatedUserEmail');
    localStorage.removeItem('impersonatedUserName');
    window.location.replace('/login');
  };


  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
        color: '#fafafa'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeHandler admin={admin} theme={theme} />
      <Routes>
        {/* Protected Routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EffectiveAccessProvider admin={admin}>
                <div className={`App${isMerchantPortal ? ' merchant-portal' : ''}`}>
                  <Sidebar 
                    admin={admin} 
                    onLogout={handleLogout} 
                    isOpen={activeSidebarOpen}
                    onToggle={handleToggleSidebar} 
                    onOpen={isMerchantPortal ? () => setMerchantSidebarOpen(true) : undefined}
                    onClose={isMerchantPortal ? () => setMerchantSidebarOpen(false) : undefined}
                  />

                  {activeSidebarOpen && !isMerchantPortal && (
                    <div className="sidebar-backdrop" onClick={handleToggleSidebar} />
                  )}

                  <div className={`main-content${sidebarOpen && !isMerchantPortal ? ' main-content-expanded' : ''}`}>
                  {isImpersonated && (
                    <div className="impersonation-banner">
                      <div className="impersonation-content">
                        <span className="impersonation-badge">Impersonating</span>
                        <span>
                          Active session as <strong>{impersonatedUserName}</strong> ({impersonatedUserEmail})
                        </span>
                      </div>
                      <button 
                        className="impersonation-exit-btn"
                        onClick={handleStopImpersonating}
                      >
                        <FaSignOutAlt /> Return to Super Admin
                      </button>
                    </div>
                  )}
                  {activeAnnouncements.map(ann => {
                    const dismissedList = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
                    if (dismissedList.includes(ann._id)) return null;

                    return (
                      <div key={ann._id} className={`system-announcement-banner banner-${ann.type}`}>
                        <div className="announcement-content">
                          <span className="announcement-badge">{ann.type}</span>
                          <span><strong>{ann.title}</strong>: {ann.content}</span>
                        </div>
                        <button className="announcement-close-btn" onClick={() => handleDismissAnnouncement(ann._id)}>
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <TopBar 
                    admin={admin} 
                    onUpdateAdmin={handleUpdateAdmin} 
                    isImpersonated={isImpersonated} 
                    onToggleSidebar={handleToggleSidebar} 
                    theme={theme}
                    onToggleTheme={handleToggleTheme}
                  />

                  <PreviewBanner admin={admin} />
                  <TrialStatusPopup admin={admin} />

                  {previewGateMessage && <div className="merchant-preview-action-gate" role="alert">
                    <span>{previewGateMessage}</span>
                    <Link to="/dashboard/billing" onClick={() => setPreviewGateMessage('')}>View plans</Link>
                    <button type="button" onClick={() => setPreviewGateMessage('')} aria-label="Dismiss plan message">×</button>
                  </div>}


                  <div className="page-content">
                  <MerchantPageGate admin={admin}>
                  <Routes>
                    {/* Default route - redirect based on role or effective access */}
                    <Route 
                      path="/" 
                      element={<DefaultDashboardLanding admin={admin} />} 
                    />
                    <Route 
                      path="/analytics" 
                      element={
                        <ProtectedFeatureRoute pageKey="analytics" title="Analytics" requiredFeature="Analytics & Reports">
                          <Analytics admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route path="/conversations" element={<Conversations />} />
                    <Route path="/contacts" element={<ProtectedFeatureRoute pageKey="contacts" title="WhatsApp Contacts" requiredFeature="Growth Plan"><Contacts admin={admin} /></ProtectedFeatureRoute>} />
                    <Route path="/live-chat" element={<LiveChat admin={admin} />} />
                    <Route 
                      path="/orders" 
                      element={
                        <ProtectedFeatureRoute pageKey="orders" title="Orders" requiredFeature="Order Tracking">
                          <Orders admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/products" 
                      element={
                        <ProtectedFeatureRoute pageKey="products" title="Products Catalog" requiredFeature="Catalog Management">
                          <Products admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/leads" 
                      element={
                        <ProtectedFeatureRoute pageKey="leads" title="Leads" requiredFeature="Leads Management">
                          <MerchantLeads admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/escalations" 
                      element={
                        <ProtectedFeatureRoute pageKey="escalations" title="Human Escalations" requiredFeature="Human Escalation">
                          <Escalations admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/broadcast" 
                      element={<Broadcast />} 
                    />
                    <Route 
                      path="/knowledge-base" 
                      element={
                        <ProtectedFeatureRoute pageKey="knowledge-base" title="Knowledge Base" requiredFeature="Knowledge Base Training">
                          <KnowledgeBase />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/integrations" 
                      element={
                        <ProtectedFeatureRoute pageKey="integrations" title="Store Integrations" requiredFeature="Store Integrations">
                          <Integrations admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route path="/developer-api" element={<DeveloperApi admin={admin} />} />
                    <Route path="/whatsapp-connect" element={<WhatsAppConnect />} />
                    <Route path="/templates" element={<Templates admin={admin} />} />
                    <Route 
                      path="/abandoned-carts" 
                      element={
                        <ProtectedFeatureRoute pageKey="abandoned_carts" title="Abandoned Carts" requiredFeature="Cart Recovery">
                          <AbandonedCarts admin={admin} />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/profile" element={<Profile admin={admin} onUpdateAdmin={handleUpdateAdmin} />} />
                    <Route path="/support" element={<SupportCenter admin={admin} />} />

                    {/* WhatsApp API Developer Routes */}
                    <Route 
                      path="/developer" 
                      element={
                        <ProtectedFeatureRoute pageKey="api-dashboard" title="WhatsApp API Hub" requiredFeature="WhatsApp API Plan">
                          <ApiDashboard />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/api-keys" 
                      element={
                        <ProtectedFeatureRoute pageKey="api-keys" title="API Keys" requiredFeature="WhatsApp API Plan">
                          <ApiKeyManager />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/docs" 
                      element={
                        <ProtectedFeatureRoute pageKey="api-documentation" title="API Documentation" requiredFeature="WhatsApp API Plan">
                          <ApiDocs />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/webhooks" 
                      element={
                        <ProtectedFeatureRoute pageKey="webhook-configuration" title="Outbound Webhooks" requiredFeature="WhatsApp API Plan">
                          <WebhookConfig />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/logs" 
                      element={
                        <ProtectedFeatureRoute pageKey="api-logs" title="API Request Logs" requiredFeature="WhatsApp API Plan">
                          <ApiLogs />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/failed-webhooks" 
                      element={
                        <ProtectedFeatureRoute pageKey="failed-webhooks" title="Failed Webhooks" requiredFeature="WhatsApp API Plan">
                          <FailedWebhooks />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    <Route 
                      path="/developer/usage" 
                      element={
                        <ProtectedFeatureRoute pageKey="api-usage" title="API Usage & Limits" requiredFeature="WhatsApp API Plan">
                          <ApiUsage />
                        </ProtectedFeatureRoute>
                      } 
                    />
                    
                    {/* Super Admin Routes */}
                    {admin && admin.role === 'super_admin' ? (
                      <>
                        {/* New design (super-admin-ui). The old pages stay under /classic */}
                        <Route path="/super-admin" element={<SaMerchants />} />
                        <Route path="/super-admin/classic" element={<SuperAdmin />} />
                        <Route path="/super-admin/system-health" element={<SuperAdminHealth />} />
                        <Route path="/super-admin/whatsapp-ops" element={<Navigate to="/dashboard/super-admin/integration-health" replace />} />
                        <Route path="/super-admin/live-ops" element={<SuperAdminLiveOps />} />
                        <Route path="/super-admin/integration-health" element={<SuperAdminIntegrationHealth />} />
                        <Route path="/super-admin/ai-usage" element={<Navigate to="/dashboard/super-admin/budget" replace />} />
                        <Route path="/super-admin/billing-revenue" element={<SuperAdminBillingRevenue />} />
                        <Route path="/super-admin/audit-logs" element={<SuperAdminAuditLogs />} />
                        <Route path="/super-admin/feature-flags" element={<SuperAdminFeatureFlags />} />
                        <Route path="/super-admin/trial-policy" element={<SuperAdminTrialPolicy />} />
                        <Route path="/super-admin/announcements" element={<SuperAdminAnnouncements />} />
                        <Route path="/super-admin/user/:userId" element={<SaMerchantDetail />} />
                        <Route path="/super-admin/merchants/:userId" element={<SaMerchantDetail />} />
                        <Route path="/super-admin/classic/merchants/:userId" element={<SuperAdminUserDetail />} />
                        <Route path="/super-admin/plans" element={<SaPlans />} />
                        <Route path="/super-admin/plans/new" element={<SaPlanEditor />} />
                        <Route path="/super-admin/plans/:planId" element={<SaPlanEditor />} />
                        <Route path="/super-admin/coupons" element={<SaCoupons />} />
                        <Route path="/super-admin/classic/plans" element={<PlanManager />} />
                        <Route path="/super-admin/permission-profiles" element={<PermissionProfiles />} />
                        <Route path="/super-admin/customers/onboard" element={<CustomerOnboardWizard />} />
                        <Route path="/super-admin/onboard" element={<CustomerOnboardWizard />} />
                        <Route path="/super-admin/developer-api" element={<DeveloperApi admin={admin} />} />
                        <Route path="/super-admin/budget" element={<SuperAdminBudget />} />
                        <Route path="/super-admin/blog" element={<SuperAdminBlog />} />
                        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
                      </>
                    ) : (
                      <>
                        <Route path="/super-admin/*" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/demo-requests" element={<Navigate to="/dashboard" replace />} />
                      </>
                    )}
                  </Routes>
                  </MerchantPageGate>
                  </div>
                </div>
              </div>
            </EffectiveAccessProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<ExternalRedirect to="/" />} />
    </Routes>
  </Router>
  );
}

export default App;
