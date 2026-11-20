import React from 'react';
import { FaBars, FaSearch } from 'react-icons/fa';
import NotificationDropdown from '../NotificationDropdown/NotificationDropdown';

export default function TopBar({ admin, onUpdateAdmin, isImpersonated, onToggleSidebar, theme, onToggleTheme }) {
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
        <NotificationDropdown admin={admin} />
      </div>
    </div>
  );
}

// Protected Route Component
