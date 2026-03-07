import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Orders from './pages/Orders';
import Escalations from './pages/Escalations';
import DemoChat from './pages/DemoChat';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="navbar-content">
            <h1>
              <FaWhatsapp /> WhatsApp Support Bot
            </h1>
            <ul className="nav-links">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/conversations">Conversations</Link></li>
              <li><Link to="/orders">Orders</Link></li>
              <li><Link to="/escalations">Escalations</Link></li>
              <li><Link to="/demo-chat">Demo Chat</Link></li>
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route path="/demo-chat" element={<DemoChat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
