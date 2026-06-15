import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaRobot, FaSearch, FaBell, FaPlus, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown, FaFileAlt, FaSun, FaMoon, FaShoppingCart } from 'react-icons/fa';
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
import SuperAdminUserDetail from './pages/SuperAdminUserDetail';
import PlanManager from './pages/PlanManager';
import DemoRequests from './pages/DemoRequests';
import Billing from './pages/Billing';
import Templates from './pages/Templates';
import AbandonedCarts from './pages/AbandonedCarts';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import './App.css';

function Sidebar({ admin, onLogout }) {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FaCommentDots />
          <span>Support Bot</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {/* Super Admin Section */}
        {admin && admin.role === 'super_admin' && (
          <div className="nav-section">
            <div className="nav-section-title" style={{ color: '#f59e0b' }}>
              <FaCrown /> Super Admin
            </div>
            <ul className="nav-links">
              <li>
                <Link to="/dashboard/super-admin" className={isActive('/dashboard/super-admin')}>
                  <FaCrown /> User Management
                </Link>
              </li>
              <li>
                <Link to="/dashboard/demo-requests" className={isActive('/dashboard/demo-requests')}>
                  <FaBell /> Demo Requests
                </Link>
              </li>
              <li>
                <Link to="/dashboard/super-admin/plans" className={isActive('/dashboard/super-admin/plans')}>
                  <FaCog /> Plan Manager
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* Client Pages - Only show for non-super_admin users */}
        {admin && admin.role !== 'super_admin' && (
          <>
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard" className={isActive('/dashboard')}>
                    <FaHome /> Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/analytics" className={isActive('/dashboard/analytics')}>
                    <FaChartLine /> Analytics
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/live-chat" className={isActive('/dashboard/live-chat')}>
                    <FaCommentDots /> Live Chat
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/conversations" className={isActive('/dashboard/conversations')}>
                    <FaComments /> Conversations
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/orders" className={isActive('/dashboard/orders')}>
                    <FaBox /> Orders
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/escalations" className={isActive('/dashboard/escalations')}>
                    <FaExclamationTriangle /> Escalations
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/billing" className={isActive('/dashboard/billing')}>
                    <FaCrown style={{ color: '#fbbf24' }} /> Billing & Plans
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/profile" className={isActive('/dashboard/profile')}>
                    <FaUser /> Profile & Store
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="nav-section">
              <div className="nav-section-title">Tools</div>
              <ul className="nav-links">
                <li>
                  <Link to="/dashboard/broadcast" className={isActive('/dashboard/broadcast')}>
                    <FaBroadcastTower /> Broadcast
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/knowledge-base" className={isActive('/dashboard/knowledge-base')}>
                    <FaBrain /> Knowledge Base
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/integrations" className={isActive('/dashboard/integrations')}>
                    <FaCog /> Integrations
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/whatsapp-connect" className={isActive('/dashboard/whatsapp-connect')}>
                    <FaPlug /> WhatsApp Connect
                    <span className="ai-status-indicator">
                      <span className="ai-status-dot"></span>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/templates" className={isActive('/dashboard/templates')}>
                    <FaFileAlt /> Templates
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/abandoned-carts" className={isActive('/dashboard/abandoned-carts')}>
                    <FaShoppingCart /> Abandoned Carts
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/demo-chat" className={isActive('/dashboard/demo-chat')}>
                    <FaRobot /> Demo Chat
                  </Link>
                </li>
              </ul>
            </div>
          </>
        )}
      </nav>

      {admin && (
        <div className="sidebar-footer">
          <Link to="/dashboard/profile" style={{ textDecoration: 'none', display: 'block' }}>
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {admin.name?.charAt(0)?.toUpperCase() || <FaUser />}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{admin.name}</div>
                <div className="sidebar-user-email">{admin.email}</div>
                {admin.role && (
                  <span className={`sidebar-role-badge role-${admin.role}`}>
                    {admin.role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </Link>
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <FaSignOutAlt /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ admin, onUpdateAdmin }) {
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
    <div className="top-bar">
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
    const isPublicPath = ['/', '/book-demo', '/login', '/about', '/services', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password');
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

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout API failures and continue clearing local state.
    }

    clearAuthState();
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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/book-demo" element={<BookDemo />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        
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
                <Sidebar admin={admin} onLogout={handleLogout} />
                
                <div className="main-content">
                  <TopBar admin={admin} onUpdateAdmin={handleUpdateAdmin} />

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
                    <Route path="/demo-requests" element={<DemoRequests />} />
                    <Route path="/super-admin/user/:userId" element={<SuperAdminUserDetail />} />
                    <Route path="/super-admin/plans" element={<PlanManager />} />
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
