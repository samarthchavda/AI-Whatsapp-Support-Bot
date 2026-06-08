import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { FaWhatsapp, FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaRobot, FaSearch, FaBell, FaPlus, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown } from 'react-icons/fa';
import Dashboard from './pages/Dashboard';
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
          <FaWhatsapp />
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
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <FaSignOutAlt /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ admin }) {
  const navigate = useNavigate();
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedAdmin = localStorage.getItem('admin');
    
    if (token && storedAdmin) {
      setIsAuthenticated(true);
      setAdmin(JSON.parse(storedAdmin));
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (adminData) => {
    setIsAuthenticated(true);
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
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
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/book-demo" element={<BookDemo />} />
        
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
                  <TopBar admin={admin} />

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
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/escalations" element={<Escalations />} />
                    <Route path="/broadcast" element={<Broadcast />} />
                    <Route path="/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/whatsapp-connect" element={<WhatsAppConnect />} />
                    <Route path="/demo-chat" element={<DemoChat />} />
                    
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
