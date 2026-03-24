import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FaWhatsapp, FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaRobot, FaSearch, FaBell, FaPlus } from 'react-icons/fa';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Orders from './pages/Orders';
import Escalations from './pages/Escalations';
import DemoChat from './pages/DemoChat';
import WhatsAppConnect from './pages/WhatsAppConnect';
import './App.css';

function Sidebar() {
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
        <div className="nav-section">
          <div className="nav-section-title">Main</div>
          <ul className="nav-links">
            <li>
              <Link to="/" className={isActive('/')}>
                <FaHome /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/conversations" className={isActive('/conversations')}>
                <FaComments /> Conversations
              </Link>
            </li>
            <li>
              <Link to="/orders" className={isActive('/orders')}>
                <FaBox /> Orders
              </Link>
            </li>
            <li>
              <Link to="/escalations" className={isActive('/escalations')}>
                <FaExclamationTriangle /> Escalations
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="nav-section">
          <div className="nav-section-title">Tools</div>
          <ul className="nav-links">
            <li>
              <Link to="/whatsapp-connect" className={isActive('/whatsapp-connect')}>
                <FaPlug /> WhatsApp Connect
                <span className="ai-status-indicator">
                  <span className="ai-status-dot"></span>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/demo-chat" className={isActive('/demo-chat')}>
                <FaRobot /> Demo Chat
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}

function TopBar() {
  return (
    <div className="top-bar">
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
        <button className="icon-button">
          <FaBell />
          <span className="notification-badge">3</span>
        </button>
        
        <button className="btn-primary">
          <FaPlus /> New Broadcast
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Sidebar />
        
        <div className="main-content">
          <TopBar />
          
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/escalations" element={<Escalations />} />
            <Route path="/whatsapp-connect" element={<WhatsAppConnect />} />
            <Route path="/demo-chat" element={<DemoChat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
