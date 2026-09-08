import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBell, 
  FaExclamationTriangle, 
  FaShoppingCart, 
  FaCalendarCheck, 
  FaBullhorn, 
  FaCheckDouble, 
  FaRedo, 
  FaChevronRight, 
  FaInbox 
} from 'react-icons/fa';
import { getEscalations, getAbandonedCarts } from '../../services/api';
import api from '../../services/api';
import './NotificationDropdown.css';

const currencySymbols = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: '$', AUD: '$', JPY: '¥', AED: 'د.إ'
};

const formatAmount = (amount, code = 'USD') => {
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code
    }).format(amount || 0);
  } catch (e) {
    const symbol = currencySymbols[code] || '$';
    return `${symbol}${Number(amount || 0).toFixed(2)}`;
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function NotificationDropdown({ admin }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'escalations', 'carts', 'alerts'
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const storageKey = `kwickbot_read_notifs_${admin?._id || admin?.id || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const accountId = admin?._id || admin?.id || 'default';
  const isSuperAdmin = admin?.role === 'super_admin';
  const isStarterPlan = (admin?.subscriptionPlan || 'starter').toLowerCase() === 'starter';
  const storeCurrency = admin?.storeCurrency || 'USD';

  // Save read IDs to localStorage
  const saveReadIds = useCallback((newReadSet) => {
    try {
      const storageKey = `kwickbot_read_notifs_${accountId}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newReadSet)));
    } catch (e) {
      console.error('Failed to save notification read state', e);
    }
  }, [accountId]);

  // Fetch real account notifications from live endpoints
  const fetchNotifications = useCallback(async () => {
    if (!admin) return;
    setLoading(true);

    const items = [];

    try {
      // 1. Fetch Escalations (if permitted by plan or super_admin)
      if (!isStarterPlan || isSuperAdmin) {
        try {
          const escRes = await getEscalations({ status: 'open', limit: 10 });
          if (escRes.data?.success && Array.isArray(escRes.data.escalations)) {
            escRes.data.escalations.forEach(item => {
              items.push({
                id: `esc_${item._id}`,
                type: 'escalation',
                title: item.customerName ? `Escalation: ${item.customerName}` : 'Customer Escalation Pending',
                message: item.reason || item.lastMessage || 'Customer requested live human agent response',
                timestamp: item.updatedAt || item.createdAt || new Date().toISOString(),
                targetPath: '/dashboard/escalations',
                itemData: { escalationId: item._id, customerPhone: item.customerPhone },
                iconType: 'escalation'
              });
            });
          }
        } catch (err) {
          // Ignore 403 plan restriction silently
        }
      }

      // 2. Fetch Abandoned Carts (if permitted by plan or super_admin)
      if (!isStarterPlan || isSuperAdmin) {
        try {
          const cartRes = await getAbandonedCarts({ status: 'abandoned', limit: 10 });
          if (cartRes.data?.success && Array.isArray(cartRes.data.carts)) {
            cartRes.data.carts.forEach(item => {
              items.push({
                id: `cart_${item._id}`,
                type: 'abandoned_cart',
                title: item.customerName ? `Abandoned Cart: ${item.customerName}` : 'Abandoned Cart Waiting',
                message: `Cart value ${formatAmount(item.totalAmount, storeCurrency)} is waiting for recovery`,
                timestamp: item.abandonedAt || item.createdAt || new Date().toISOString(),
                targetPath: '/dashboard/abandoned-carts',
                itemData: { cartId: item._id, checkoutUrl: item.checkoutUrl },
                iconType: 'cart'
              });
            });
          }
        } catch (err) {
          // Ignore plan restrictions silently
        }
      }

      // 3. Super Admin specific: Pending Demo Requests
      if (isSuperAdmin) {
        try {
          const demoRes = await api.get('/demo-requests', { params: { status: 'pending', limit: 10 } });
          if (demoRes.data?.success && Array.isArray(demoRes.data.requests)) {
            demoRes.data.requests.forEach(item => {
              items.push({
                id: `demo_${item._id}`,
                type: 'demo_request',
                title: `Demo Request: ${item.name || 'Prospect'}`,
                message: `${item.email || ''} ${item.companyName ? `(${item.companyName})` : ''} requested live demo`,
                timestamp: item.createdAt || new Date().toISOString(),
                targetPath: '/dashboard/demo-requests',
                itemData: { requestId: item._id },
                iconType: 'demo'
              });
            });
          }
        } catch (err) {
          // Ignore errors
        }
      }

      // 4. System Announcements
      try {
        const annRes = await api.get('/dashboard/announcements');
        if (annRes.data?.success && Array.isArray(annRes.data.announcements)) {
          annRes.data.announcements.forEach(item => {
            items.push({
              id: `ann_${item._id}`,
              type: 'announcement',
              title: item.title || 'System Announcement',
              message: item.message,
              timestamp: item.createdAt || new Date().toISOString(),
              targetPath: '/dashboard',
              itemData: { announcementId: item._id },
              iconType: 'announcement'
            });
          });
        }
      } catch (err) {
        // Ignore
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(items);
    } catch (e) {
      console.error('Error loading account notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [admin, isStarterPlan, isSuperAdmin, storeCurrency]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 35000);
    window.addEventListener('escalationUpdated', fetchNotifications);
    window.addEventListener('abandonedCartUpdated', fetchNotifications);
    window.addEventListener('demoRequestUpdated', fetchNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener('escalationUpdated', fetchNotifications);
      window.removeEventListener('abandonedCartUpdated', fetchNotifications);
      window.removeEventListener('demoRequestUpdated', fetchNotifications);
    };
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAsRead = (id) => {
    setReadIds(prev => {
      const updated = new Set(prev);
      updated.add(id);
      saveReadIds(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach(n => updated.add(n.id));
    setReadIds(updated);
    saveReadIds(updated);
  };

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.targetPath) {
      navigate(item.targetPath, { state: { highlightData: item.itemData } });
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'escalations') return n.type === 'escalation';
    if (activeTab === 'carts') return n.type === 'abandoned_cart';
    if (activeTab === 'alerts') return n.type === 'demo_request' || n.type === 'announcement';
    return true;
  });

  const getNotificationIcon = (iconType) => {
    switch (iconType) {
      case 'escalation':
        return <div className="notif-icon-badge escalation"><FaExclamationTriangle /></div>;
      case 'cart':
        return <div className="notif-icon-badge cart"><FaShoppingCart /></div>;
      case 'demo':
        return <div className="notif-icon-badge demo"><FaCalendarCheck /></div>;
      case 'announcement':
      default:
        return <div className="notif-icon-badge announcement"><FaBullhorn /></div>;
    }
  };

  return (
    <div className="notification-dropdown-wrapper" ref={dropdownRef}>
      <button 
        className={`icon-button notif-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Account Notifications"
        aria-label="Account Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notif-badge-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          {/* Panel Header */}
          <div className="notif-panel-header">
            <div className="notif-header-title">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-unread-count-pill">{unreadCount} unread</span>
              )}
            </div>
            <div className="notif-header-actions">
              <button 
                className="notif-action-btn"
                onClick={fetchNotifications} 
                title="Refresh notifications"
              >
                <FaRedo className={loading ? 'spin' : ''} />
              </button>
              {unreadCount > 0 && (
                <button 
                  className="notif-action-btn text-btn" 
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <FaCheckDouble /> Read all
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="notif-tabs">
            <button 
              className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`} 
              onClick={() => setActiveTab('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`notif-tab ${activeTab === 'escalations' ? 'active' : ''}`} 
              onClick={() => setActiveTab('escalations')}
            >
              Escalations
            </button>
            <button 
              className={`notif-tab ${activeTab === 'carts' ? 'active' : ''}`} 
              onClick={() => setActiveTab('carts')}
            >
              Carts
            </button>
            {isSuperAdmin && (
              <button 
                className={`notif-tab ${activeTab === 'alerts' ? 'active' : ''}`} 
                onClick={() => setActiveTab('alerts')}
              >
                Alerts
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="notif-list-container">
            {loading && notifications.length === 0 ? (
              <div className="notif-loading-state">
                <div className="notif-spinner"></div>
                <p>Syncing account notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon"><FaInbox /></div>
                <h4>You're all caught up! ✨</h4>
                <p>No pending escalations or abandoned cart alerts requiring attention right now.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={`notif-card-item ${isUnread ? 'unread' : 'read'}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {getNotificationIcon(item.iconType)}

                    <div className="notif-content">
                      <div className="notif-title-row">
                        <span className="notif-item-title">{item.title}</span>
                        <span className="notif-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                      <p className="notif-item-message">{item.message}</p>
                    </div>

                    <div className="notif-item-arrow">
                      {isUnread && <span className="unread-dot"></span>}
                      <FaChevronRight className="arrow-icon" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="notif-panel-footer">
            <button 
              onClick={() => { setIsOpen(false); navigate('/dashboard/escalations'); }}
              className="notif-footer-link"
            >
              View Escalations
            </button>
            <span className="notif-footer-divider">•</span>
            <button 
              onClick={() => { setIsOpen(false); navigate('/dashboard/abandoned-carts'); }}
              className="notif-footer-link"
            >
              View Abandoned Carts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
