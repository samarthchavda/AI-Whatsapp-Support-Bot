import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaRobot, FaSearch, FaBell, FaPlus, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown, FaFileAlt, FaSun, FaMoon, FaShoppingCart, FaCoins, FaUserSecret, FaHeartbeat, FaBullhorn, FaBlog } from 'react-icons/fa';
import api, { clearAuthState, refreshAuth, updateAdminProfile } from './services/api';
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

function Sidebar({ admin, onLogout, isOpen, onToggle }) {
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
            <img src="/logo.png" className="logo-img" alt="Kwickbot Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
            {isOpen && <span className="sidebar-brand-name">Kwickbot</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Super Admin Section */}
          {admin && admin.role === 'super_admin' && (
            <div className="nav-section">
              {isOpen && <div className="nav-section-title">Super Admin</div>}
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/super-admin" className={isActive('/dashboard/super-admin')} title="User Management">
                    <FaCrown />
                    <span className="nav-label">Users</span>
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
                    <span className="nav-label">Demo Requests</span>
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
                  <Link to="/dashboard/super-admin/health" className={isActive('/dashboard/super-admin/health')} title="Connection Health">
                    <FaHeartbeat />
                    <span className="nav-label">Health</span>
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
                      <span className="nav-label">Escalations</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/analytics" className={isActive('/dashboard/analytics')} title="Analytics">
                      <FaChartLine />
                      <span className="nav-label">Analytics</span>
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

function TopBar({ admin, onUpdateAdmin, isImpersonated }) {
  const navigate = useNavigate();
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleTheme = async () => {
    if (!admin) return;
    const newTheme = admin.theme === 'dark' ? 'light' : 'dark';
    try {
      const response = await updateAdminProfile({ theme: newTheme });
      if (response.data?.success) {
        onUpdateAdmin(response.data.data.admin);
      }
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    }
  };

  return (
    <div className="top-bar" style={isImpersonated ? { top: '42px' } : {}}>

      <div className="top-bar-left">
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
          className="icon-button theme-toggle" 
          onClick={toggleTheme} 
          title={`Switch to ${admin?.theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-label="Toggle Theme"
        >
          {admin?.theme === 'dark' ? <FaSun /> : <FaMoon />}
        </button>

        <button className="icon-button" title="Notifications" aria-label="Notifications">
          <FaBell />
        </button>

        {admin?.role !== 'super_admin' && (
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard/broadcast')}
          >
            <FaPlus /> New Broadcast
          </button>
        )}
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

function ThemeHandler({ admin }) {
  const location = useLocation();

  useEffect(() => {
    const isPublicPath = [
      '/', '/book-demo', '/login', '/about', '/services', '/forgot-password', '/privacy', '/blog'
    ].includes(location.pathname) || 
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/blog/');

    if (isPublicPath) {
      document.body.classList.add('dark-theme');
    } else if (admin && admin.theme) {
      document.body.classList.toggle('dark-theme', admin.theme === 'dark');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [admin, location.pathname]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('sidebarOpen') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
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
      <ThemeHandler admin={admin} />
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
                <Sidebar admin={admin} onLogout={handleLogout} isOpen={sidebarOpen} onToggle={handleToggleSidebar} />

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
                  <TopBar admin={admin} onUpdateAdmin={handleUpdateAdmin} isImpersonated={isImpersonated} />


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
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/live-chat" element={<LiveChat />} />
                    <Route path="/conversations" element={<Conversations />} />
                    <Route path="/orders" element={<Orders admin={admin} />} />
                    <Route path="/escalations" element={<Escalations />} />
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
                    <Route path="/super-admin" element={<SuperAdmin />} />
                    <Route path="/super-admin/leads" element={<LeadsCRM />} />
                    <Route path="/super-admin/health" element={<SuperAdminHealth />} />
                    <Route path="/super-admin/announcements" element={<SuperAdminAnnouncements />} />
                    <Route path="/demo-requests" element={<DemoRequests />} />
                    <Route path="/super-admin/user/:userId" element={<SuperAdminUserDetail />} />
                    <Route path="/super-admin/plans" element={<PlanManager />} />
                    <Route path="/super-admin/budget" element={<SuperAdminBudget />} />
                    <Route path="/super-admin/blog" element={<SuperAdminBlog />} />
                    <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
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
