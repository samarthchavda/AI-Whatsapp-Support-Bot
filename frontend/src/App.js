import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaRobot, FaSearch, FaBell, FaPlus, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown, FaFileAlt, FaShoppingCart, FaCoins, FaUserSecret, FaHeartbeat, FaBullhorn, FaBlog, FaBars, FaSun, FaMoon, FaWhatsapp, FaShieldAlt, FaToggleOn } from 'react-icons/fa';
import api, { clearAuthState, refreshAuth } from './services/api';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Conversations from './pages/Conversations';
import Orders from './pages/Orders';
import Escalations from './pages/Escalations';
import DemoChat from './pages/DemoChat';
import WhatsAppConnect from './pages/WhatsAppConnect';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import BookDemo from './pages/BookDemo';
import KnowledgeBase from './pages/KnowledgeBase';
import LiveChat from './pages/LiveChat';
import Broadcast from './pages/Broadcast';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';
import SuperAdmin from './pages/SuperAdmin';
import LeadsCRM from './pages/LeadsCRM';
import SuperAdminHealth from './pages/SuperAdminHealth';
import SuperAdminAnnouncements from './pages/SuperAdminAnnouncements';
import SuperAdminUserDetail from './pages/SuperAdminUserDetail';
import SuperAdminWhatsAppOps from './pages/SuperAdminWhatsAppOps';
import SuperAdminLiveOps from './pages/SuperAdminLiveOps';
import SuperAdminIntegrationHealth from './pages/SuperAdminIntegrationHealth';
import SuperAdminAIUsage from './pages/SuperAdminAIUsage';
import SuperAdminBillingRevenue from './pages/SuperAdminBillingRevenue';
import SuperAdminAuditLogs from './pages/SuperAdminAuditLogs';
import SuperAdminFeatureFlags from './pages/SuperAdminFeatureFlags';
import PlanManager from './pages/PlanManager';
import DemoRequests from './pages/DemoRequests';
import SuperAdminBudget from './pages/SuperAdminBudget';
import SuperAdminSettings from './pages/SuperAdminSettings';
import Billing from './pages/Billing';
import Templates from './pages/Templates';
import AbandonedCarts from './pages/AbandonedCarts';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import DataDeletion from './pages/DataDeletion';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import SuperAdminBlog from './pages/SuperAdminBlog';
import axios from 'axios';
import './App.css';

function TrafficTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only track public page visits (not dashboard/internal pages)
    if (!location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/login')) {
      const trackVisit = async () => {
        try {
          const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');
          await axios.post(`${API_BASE}/traffic/track`, {
            pagePath: location.pathname,
            referrer: document.referrer || 'Direct'
          });
        } catch (err) {
          // Silent catch
        }
      };
      trackVisit();
    }
  }, [location]);

  return null;
}

function Sidebar({ admin, onLogout, isOpen, onToggle, pendingDemoRequestsCount }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className={`sidebar${isOpen ? ' sidebar-expanded' : ''}`}>
      {/* Toggle Button — outside inner so it floats on the edge */}
      <button
        className="sidebar-toggle-btn"
        onClick={onToggle}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className={`toggle-arrow${isOpen ? ' open' : ''}`}>&#8250;</span>
      </button>

      {/* Inner container clips content overflow during animation */}
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {(() => {
              const isBrandingAllowed = admin && (admin.subscriptionPlan === 'enterprise' || admin.subscriptionPlan === 'custom');
              const customLogo = isBrandingAllowed && admin.customBranding?.logoUrl;
              const customName = isBrandingAllowed && admin.customBranding?.brandName;
              return (
                <>
                  <img 
                    src={customLogo || "/logo.png"} 
                    className="logo-img" 
                    alt={customName ? `${customName} Logo` : "Kwickbot Logo"} 
                    style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, objectFit: 'contain' }} 
                  />
                  {isOpen && <span className="sidebar-brand-name">{customName || "Kwickbot"}</span>}
                </>
              );
            })()}
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Super Admin Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Super Admin</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin" className={isActive('/dashboard/super-admin')} title="Merchant Management">
                    <FaCrown />
                    <span className="nav-label">Merchants</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/leads" className={isActive('/dashboard/super-admin/leads')} title="Leads CRM">
                    <FaUserSecret />
                    <span className="nav-label">Leads CRM</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/demo-requests" className={isActive('/dashboard/demo-requests')} title="Demo Requests">
                    <FaBell />
                    <span className="nav-label">
                      Demo Requests
                      {pendingDemoRequestsCount > 0 && (
                        <span style={{
                          marginLeft: '6px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1
                        }}>
                          {pendingDemoRequestsCount}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/plans" className={isActive('/dashboard/super-admin/plans')} title="Plan Manager">
                    <FaCog />
                    <span className="nav-label">Plan Manager</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/budget" className={isActive('/dashboard/super-admin/budget')} title="Gemini Budget">
                    <FaCoins />
                    <span className="nav-label">AI Budget</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/system-health" className={isActive('/dashboard/super-admin/system-health')} title="System Health">
                    <FaHeartbeat />
                    <span className="nav-label">System Health</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/announcements" className={isActive('/dashboard/super-admin/announcements')} title="System Announcements">
                    <FaBullhorn />
                    <span className="nav-label">Announcements</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/blog" className={isActive('/dashboard/super-admin/blog')} title="Blog Manager">
                    <FaBlog />
                    <span className="nav-label">Blog Manager</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/settings" className={isActive('/dashboard/super-admin/settings')} title="System Connection">
                    <FaPlug />
                    <span className="nav-label">System Connection</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Operations Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Operations</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin/whatsapp-ops" className={isActive('/dashboard/super-admin/whatsapp-ops')} title="WhatsApp Operations">
                    <FaWhatsapp />
                    <span className="nav-label">WhatsApp Operations</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/live-ops" className={isActive('/dashboard/super-admin/live-ops')} title="Live Operations">
                    <FaComments />
                    <span className="nav-label">Live Operations</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/integration-health" className={isActive('/dashboard/super-admin/integration-health')} title="Integration Health">
                    <FaPlug />
                    <span className="nav-label">Integration Health</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* AI Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">AI</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin/ai-usage" className={isActive('/dashboard/super-admin/ai-usage')} title="AI Usage">
                    <FaBrain />
                    <span className="nav-label">AI Usage</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Finance Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Finance</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin/billing-revenue" className={isActive('/dashboard/super-admin/billing-revenue')} title="Billing & Revenue">
                    <FaCoins />
                    <span className="nav-label">Billing & Revenue</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Security Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Security</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin/audit-logs" className={isActive('/dashboard/super-admin/audit-logs')} title="Audit Logs">
                    <FaShieldAlt />
                    <span className="nav-label">Audit Logs</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Platform Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Platform</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin/feature-flags" className={isActive('/dashboard/super-admin/feature-flags')} title="Feature Flags">
                    <FaToggleOn />
                    <span className="nav-label">Feature Flags</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Client Pages */}
          {admin && admin.role !== 'super_admin' && (
            <>
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Main</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard" className={isActive('/dashboard')} title="Dashboard">
                      <FaHome />
                      <span className="nav-label">Dashboard</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/live-chat" className={isActive('/dashboard/live-chat')} title="Live Chat">
                      <FaCommentDots />
                      <span className="nav-label">Live Chat</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/conversations" className={isActive('/dashboard/conversations')} title="Conversations">
                      <FaComments />
                      <span className="nav-label">Conversations</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/orders" className={isActive('/dashboard/orders')} title="Orders">
                      <FaBox />
                      <span className="nav-label">Orders</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/abandoned-carts" className={isActive('/dashboard/abandoned-carts')} title="Abandoned Carts">
                      <FaShoppingCart />
                      <span className="nav-label">Abandoned Carts</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/escalations" className={isActive('/dashboard/escalations')} title="Escalations">
                      <FaExclamationTriangle />
                      <span className="nav-label">
                        Escalations {admin?.subscriptionPlan === 'starter' && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🔒</span>}
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/analytics" className={isActive('/dashboard/analytics')} title="Analytics">
                      <FaChartLine />
                      <span className="nav-label">
                        Analytics {admin?.subscriptionPlan === 'starter' && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🔒</span>}
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Messaging</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard/broadcast" className={isActive('/dashboard/broadcast')} title="Broadcast">
                      <FaBroadcastTower />
                      <span className="nav-label">Broadcast</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/templates" className={isActive('/dashboard/templates')} title="Templates">
                      <FaFileAlt />
                      <span className="nav-label">Templates</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/knowledge-base" className={isActive('/dashboard/knowledge-base')} title="Knowledge Base">
                      <FaBrain />
                      <span className="nav-label">Knowledge Base</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/integrations" className={isActive('/dashboard/integrations')} title="Integrations">
                      <FaCog />
                      <span className="nav-label">Integrations</span>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Account</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard/whatsapp-connect" className={isActive('/dashboard/whatsapp-connect')} title="WhatsApp Connect">
                      <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <FaPlug />
                        <span className="ai-status-indicator" style={{ position: 'absolute', top: '-2px', right: '-4px' }}>
                          <span className="ai-status-dot"></span>
                        </span>
                      </div>
                      <span className="nav-label">WA Connect</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/demo-chat" className={isActive('/dashboard/demo-chat')} title="Demo Chat">
                      <FaRobot />
                      <span className="nav-label">Demo Chat</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/billing" className={isActive('/dashboard/billing')} title="Billing & Plans">
                      <FaCrown style={{ color: '#fbbf24' }} />
                      <span className="nav-label">Billing</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/profile" className={isActive('/dashboard/profile')} title="Profile & Store">
                      <FaUser />
                      <span className="nav-label">Profile</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          )}
        </nav>

        {admin && (
          <div className="sidebar-footer">
            <div className="sidebar-user" title={`${admin.name} (${admin.email})`}>
              <div className="sidebar-user-avatar">
                {admin.name?.charAt(0)?.toUpperCase() || <FaUser />}
              </div>
              {isOpen && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{admin.name?.split(' ')[0]}</span>
                  <span className="sidebar-user-email">{admin.email}</span>
                </div>
              )}
            </div>
            <button className="sidebar-logout-btn" onClick={onLogout} title="Sign out">
              <FaSignOutAlt />
              {isOpen && <span>Logout</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ admin, onUpdateAdmin, isImpersonated, onToggleSidebar, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };



  return (
    <div className="top-bar" style={isImpersonated ? { top: '42px' } : {}}>

      <div className="top-bar-left">
        <button className="mobile-menu-toggle" onClick={onToggleSidebar} aria-label="Toggle Menu">
          <FaBars />
        </button>
        <div className="top-bar-greeting">
          <span className="greeting-text">{greeting()}, {admin?.name?.split(' ')[0] || 'there'}</span>
          <span className="greeting-sub">Here&apos;s your support overview</span>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations, orders, customers..."
          />
        </div>
      </div>

      <div className="top-bar-actions">
        <button 
          className="icon-button theme-toggle-btn" 
          onClick={onToggleTheme} 
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} 
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>


        <button className="icon-button" title="Notifications" aria-label="Notifications">
          <FaBell />
        </button>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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

function ThemeHandler({ admin, theme }) {
  const location = useLocation();

  useEffect(() => {
    const isPublicPath = [
      '/', '/book-demo', '/login', '/about', '/services', '/forgot-password', '/privacy', '/blog', '/data-deletion'
    ].includes(location.pathname) || 
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/blog/');

    if (isPublicPath) {
      document.body.classList.add('dark-theme');
    } else {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }, [location.pathname, theme]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingDemoRequestsCount, setPendingDemoRequestsCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sidebarOpen') === 'true';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dashboard-theme') || 'light';
  });

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

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
          console.error('Refresh auth failed:', error);
          clearAuthState();
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

  const handleLogin = (adminData) => {
    setIsAuthenticated(true);
    setAdmin(adminData);
  };

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

  const isImpersonated = localStorage.getItem('isImpersonated') === 'true';
  const impersonatedUserName = localStorage.getItem('impersonatedUserName') || '';
  const impersonatedUserEmail = localStorage.getItem('impersonatedUserEmail') || '';

  const handleStopImpersonating = () => {
    const originalToken = localStorage.getItem('originalToken');
    const originalAdmin = localStorage.getItem('originalAdmin');
    
    if (originalToken && originalAdmin) {
      localStorage.setItem('token', originalToken);
      localStorage.setItem('accessToken', originalToken);
      localStorage.setItem('admin', originalAdmin);
    }
    
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
    localStorage.removeItem('originalToken');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isImpersonated');
    localStorage.removeItem('impersonatedUserEmail');
    localStorage.removeItem('impersonatedUserName');
    setIsAuthenticated(false);
    setAdmin(null);
  };

  useEffect(() => {
    if (isAuthenticated && admin && admin.role === 'super_admin') {
      const fetchPendingCount = async () => {
        try {
          const response = await api.get('/demo-requests', {
            params: { status: 'pending', limit: 1 }
          });
          if (response.data?.success) {
            setPendingDemoRequestsCount(response.data.total || 0);
          }
        } catch (error) {
          console.error('Error fetching pending demo requests count:', error);
        }
      };

      fetchPendingCount();

      window.addEventListener('demoRequestUpdated', fetchPendingCount);

      const interval = setInterval(fetchPendingCount, 60000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('demoRequestUpdated', fetchPendingCount);
      };
    } else {
      setPendingDemoRequestsCount(0);
    }
  }, [isAuthenticated, admin]);


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
      <TrafficTracker />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/book-demo" element={<BookDemo />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login onLogin={handleLogin} />
          } 
        />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <div className="App">
                 <Sidebar 
                   admin={admin} 
                   onLogout={handleLogout} 
                   isOpen={sidebarOpen} 
                   onToggle={handleToggleSidebar} 
                   pendingDemoRequestsCount={pendingDemoRequestsCount} 
                 />

                <div className={`main-content${sidebarOpen ? ' main-content-expanded' : ''}`}>
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


                  <div className="page-content">
                  <Routes>
                    {/* Default route - redirect based on role */}
                    <Route 
                      path="/" 
                      element={
                        admin && admin.role === 'super_admin' ? 
                          <Navigate to="/dashboard/super-admin" replace /> : 
                          <Dashboard />
                      } 
                    />
                    <Route path="/analytics" element={<Analytics admin={admin} />} />
                    <Route path="/live-chat" element={<LiveChat />} />
                    <Route path="/conversations" element={<Conversations />} />
                    <Route path="/orders" element={<Orders admin={admin} />} />
                    <Route path="/escalations" element={<Escalations admin={admin} />} />
                    <Route path="/broadcast" element={<Broadcast />} />
                    <Route path="/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/integrations" element={<Integrations admin={admin} />} />
                    <Route path="/whatsapp-connect" element={<WhatsAppConnect />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/abandoned-carts" element={<AbandonedCarts admin={admin} />} />
                    <Route path="/demo-chat" element={<DemoChat admin={admin} />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/profile" element={<Profile admin={admin} onUpdateAdmin={handleUpdateAdmin} />} />
                    
                    {/* Super Admin Routes */}
                    {admin && admin.role === 'super_admin' ? (
                      <>
                        <Route path="/super-admin" element={<SuperAdmin />} />
                        <Route path="/super-admin/leads" element={<LeadsCRM />} />
                        <Route path="/super-admin/system-health" element={<SuperAdminHealth />} />
                        <Route path="/super-admin/whatsapp-ops" element={<SuperAdminWhatsAppOps />} />
                        <Route path="/super-admin/live-ops" element={<SuperAdminLiveOps />} />
                        <Route path="/super-admin/integration-health" element={<SuperAdminIntegrationHealth />} />
                        <Route path="/super-admin/ai-usage" element={<SuperAdminAIUsage />} />
                        <Route path="/super-admin/billing-revenue" element={<SuperAdminBillingRevenue />} />
                        <Route path="/super-admin/audit-logs" element={<SuperAdminAuditLogs />} />
                        <Route path="/super-admin/feature-flags" element={<SuperAdminFeatureFlags />} />
                        <Route path="/super-admin/announcements" element={<SuperAdminAnnouncements />} />
                        <Route path="/demo-requests" element={<DemoRequests />} />
                        <Route path="/super-admin/user/:userId" element={<SuperAdminUserDetail />} />
                        <Route path="/super-admin/plans" element={<PlanManager />} />
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
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
