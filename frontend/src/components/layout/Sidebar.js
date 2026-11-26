import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown, FaFileAlt, FaShoppingCart, FaCoins, FaHeartbeat, FaBullhorn, FaBlog, FaWhatsapp, FaShieldAlt, FaToggleOn, FaTimes, FaTags, FaUserTag, FaCode, FaUserPlus, FaShopify, FaWordpress, FaHeadset, FaChevronDown, FaChevronRight, FaLock } from 'react-icons/fa';
import { useEffectiveAccess } from '../../context/EffectiveAccessContext';

export default function Sidebar({ admin, onLogout, isOpen, onToggle, onOpen, onClose }) {
  const location = useLocation();
  const effectiveAccess = useEffectiveAccess() || {};
  const { canViewPage, isStoreConnectLocked, isDeveloperApiLocked } = effectiveAccess;
  const isMerchant = Boolean(admin && admin.role !== 'super_admin');
  const isSuperAdminSettingsRoute = location.pathname.startsWith('/dashboard/super-admin/settings');
  const isSuperAdminAuditRoute = location.pathname.startsWith('/dashboard/super-admin/audit-logs');
  const activeAuditPanel = isSuperAdminAuditRoute
    ? (new URLSearchParams(location.search).get('panel') || 'all')
    : null;
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(isSuperAdminSettingsRoute);
  const [auditMenuOpen, setAuditMenuOpen] = useState(isSuperAdminAuditRoute);

  useEffect(() => {
    if (isSuperAdminSettingsRoute) {
      setSettingsMenuOpen(true);
    }
    if (isSuperAdminAuditRoute) {
      setAuditMenuOpen(true);
    }
  }, [isSuperAdminSettingsRoute, isSuperAdminAuditRoute]);

  const isActive = (path) => {
    if (path === '/dashboard/developer' && location.pathname.startsWith('/dashboard/developer/')) return 'active';
    return location.pathname === path ? 'active' : '';
  };
  const isIntegrationActive = (platform) =>
    location.pathname === '/dashboard/integrations' && location.hash === `#${platform}` ? 'active' : '';

  const isPageAllowed = (key) => {
    if (!admin || admin.role === 'super_admin') return true;
    return canViewPage(key);
  };
  const canUseTemplates = isPageAllowed('templates') || isPageAllowed('whatsapp-templates');

  return (
    <div
      className={`sidebar${isOpen ? ' sidebar-expanded' : ''}`}
      onMouseEnter={isMerchant ? () => { if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches !== false) onOpen?.(); } : undefined}
      onMouseLeave={isMerchant ? () => onClose?.() : undefined}
      onClick={isMerchant && isOpen ? (event) => { if (event.target === event.currentTarget) onClose?.(); } : undefined}
      onFocusCapture={isMerchant ? () => onOpen?.() : undefined}
      onBlurCapture={isMerchant ? (event) => { if (!event.currentTarget.contains(event.relatedTarget)) onClose?.(); } : undefined}
    >
      {/* Toggle Button — outside inner so it floats on the edge */}
      <button
        className="sidebar-toggle-btn"
        onClick={onToggle}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isOpen}
        aria-controls="dashboard-sidebar-nav"
      >
        <span className={`toggle-arrow${isOpen ? ' open' : ''}`}>&#8250;</span>
      </button>

      {/* Inner container clips content overflow during animation */}
      <div className="sidebar-inner" onMouseLeave={isMerchant ? () => onClose?.() : undefined}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {(() => {
              const isBrandingAllowed = admin && (admin.subscriptionPlan === 'enterprise' || admin.subscriptionPlan === 'custom');
              const customLogo = isBrandingAllowed && admin.customBranding?.logoUrl;
              const customName = isBrandingAllowed && admin.customBranding?.brandName;
              if (customLogo) {
                return (
                  <>
                    <img 
                      src={customLogo} 
                      className="logo-img" 
                      alt={`${customName || 'Custom'} Logo`} 
                      style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, objectFit: 'contain' }} 
                    />
                    {isOpen && <span className="sidebar-brand-name">{customName}</span>}
                  </>
                );
              }
              return (
                <>
                <img 
                  src={isOpen && !isMerchant ? "/logo-reversed.png" : "/app-icon.png"}
                  className={isOpen ? "sidebar-logo-img" : "logo-img"} 
                  alt="Kwickbot Logo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/app-icon.png';
                  }} 
                  style={{ 
                    height: '34px',
                    width: 'auto', 
                    maxHeight: '34px',
                    maxWidth: isOpen && !isMerchant ? '140px' : '32px',
                    flexShrink: 0, 
                    objectFit: 'contain',
                    display: 'block'
                  }} 
                />
                {isOpen && isMerchant && <span className="sidebar-brand-name">kwickbot</span>}
                </>
              );
            })()}
          </div>
          {isOpen && (
            <button className="sidebar-close-btn" onClick={onToggle} aria-label="Close sidebar">
              <FaTimes />
            </button>
          )}
        </div>

        <nav id="dashboard-sidebar-nav" className="sidebar-nav" aria-label="Dashboard navigation" onClickCapture={isMerchant ? (event) => { if (event.target.closest('a')) onClose?.(); } : undefined}>
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
                  <Link to="/dashboard/super-admin/plans" className={location.pathname.startsWith('/dashboard/super-admin/plans') ? 'active' : ''} title="Plans">
                    <FaCog />
                    <span className="nav-label">Plans</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/coupons" className={isActive('/dashboard/super-admin/coupons')} title="Coupons and offers">
                    <FaTags />
                    <span className="nav-label">Coupons and offers</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/permission-profiles" className={isActive('/dashboard/super-admin/permission-profiles')} title="Permission Profiles">
                    <FaShieldAlt />
                    <span className="nav-label">Permission Profiles</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/customers/onboard" className={isActive('/dashboard/super-admin/customers/onboard')} title="Onboard Merchant">
                    <FaUserPlus />
                    <span className="nav-label">Onboard Merchant</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/super-admin/budget" className={isActive('/dashboard/super-admin/budget')} title="AI Budget & Usage">
                    <FaCoins />
                    <span className="nav-label">AI Budget & Usage</span>
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
                <li className={`nav-submenu-group${settingsMenuOpen ? ' open' : ''}`}>
                  <button
                    type="button"
                    className={`nav-submenu-trigger${isSuperAdminSettingsRoute ? ' active' : ''}`}
                    onClick={() => {
                      if (!isOpen) {
                        (onOpen || onToggle)?.();
                        setSettingsMenuOpen(true);
                        return;
                      }
                      setSettingsMenuOpen((prev) => !prev);
                    }}
                    aria-expanded={settingsMenuOpen}
                    title="Settings"
                  >
                    <FaCog />
                    <span className="nav-label">Settings</span>
                    {isOpen && (
                      <span className="nav-submenu-caret">
                        {settingsMenuOpen ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
                    )}
                  </button>
                  {settingsMenuOpen && isOpen && (
                    <ul className="nav-submenu-list">
                      <li>
                        <Link
                          to="/dashboard/super-admin/settings"
                          className={isActive('/dashboard/super-admin/settings')}
                          title="Integrations"
                        >
                          <FaPlug />
                          <span className="nav-label">Integrations</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
                <li>
                  <Link to="/dashboard/profile" className={isActive('/dashboard/profile')} title="Profile Settings">
                    <FaUser />
                    <span className="nav-label">Profile Settings</span>
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
                <li>
                  <Link to="/dashboard/super-admin/developer-api" className={isActive('/dashboard/super-admin/developer-api')} title="Developer API Hub">
                    <FaCode />
                    <span className="nav-label">Developer API</span>
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
                <li className={`nav-submenu-group${auditMenuOpen ? ' open' : ''}`}>
                  <button
                    type="button"
                    className={`nav-submenu-trigger${isSuperAdminAuditRoute ? ' active' : ''}`}
                    onClick={() => {
                      if (!isOpen) {
                        (onOpen || onToggle)?.();
                        setAuditMenuOpen(true);
                        return;
                      }
                      setAuditMenuOpen((prev) => !prev);
                    }}
                    aria-expanded={auditMenuOpen}
                    title="Audit Logs"
                  >
                    <FaShieldAlt />
                    <span className="nav-label">Audit Logs</span>
                    {isOpen && (
                      <span className="nav-submenu-caret">
                        {auditMenuOpen ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
                    )}
                  </button>
                  {auditMenuOpen && isOpen && (
                    <ul className="nav-submenu-list">
                      <li>
                        <Link
                          to="/dashboard/super-admin/audit-logs"
                          className={activeAuditPanel === 'all' ? 'active' : ''}
                          title="All Audit Logs"
                        >
                          <FaFileAlt />
                          <span className="nav-label">All Logs</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dashboard/super-admin/audit-logs?panel=super_admin"
                          className={activeAuditPanel === 'super_admin' ? 'active' : ''}
                          title="Super Admin Panel Logs"
                        >
                          <FaCrown />
                          <span className="nav-label">Super Admin Panel</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dashboard/super-admin/audit-logs?panel=admin"
                          className={activeAuditPanel === 'admin' ? 'active' : ''}
                          title="Admin Panel Logs"
                        >
                          <FaUser />
                          <span className="nav-label">Admin Panel</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dashboard/super-admin/audit-logs?panel=system"
                          className={activeAuditPanel === 'system' ? 'active' : ''}
                          title="System & Security Logs"
                        >
                          <FaCog />
                          <span className="nav-label">System &amp; Security</span>
                        </Link>
                      </li>
                    </ul>
                  )}
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
                <li>
                  <Link to="/dashboard/super-admin/trial-policy" className={isActive('/dashboard/super-admin/trial-policy')} title="Trial & Preview Policy">
                    <FaShieldAlt />
                    <span className="nav-label">Trial &amp; Preview</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Modular Merchant Navigation - Fully enabled based on plan entitlements */}
          {admin && admin.role !== 'super_admin' && (
            <>
              {/* Overview */}
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Overview</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard" className={isActive('/dashboard')} title="Dashboard">
                      <FaHome />
                      <span className="nav-label">Dashboard</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Daily support work */}
              {(isPageAllowed('live_chat') || isPageAllowed('conversations') || isPageAllowed('live-chat') || isPageAllowed('escalations')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">Inbox</div>}
                  <ul className="nav-links">
                    {(isPageAllowed('live_chat') || isPageAllowed('conversations') || isPageAllowed('live-chat')) && (
                      <li>
                        <Link to="/dashboard/live-chat" className={isActive('/dashboard/live-chat')} title="Live Chat">
                          <FaCommentDots />
                          <span className="nav-label">Chat</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('escalations') && (
                      <li>
                        <Link to="/dashboard/escalations" className={isActive('/dashboard/escalations')} title="Escalations">
                          <FaExclamationTriangle />
                          <span className="nav-label">Escalations</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Store operations */}
              {(isPageAllowed('orders') || isPageAllowed('products') || isPageAllowed('leads') || isPageAllowed('abandoned_carts') || isPageAllowed('abandoned-carts')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">Commerce</div>}
                  <ul className="nav-links">
                    {isPageAllowed('orders') && (
                      <li>
                        <Link to="/dashboard/orders" className={isActive('/dashboard/orders')} title="Orders">
                          <FaBox />
                          <span className="nav-label">Orders</span>
                        </Link>
                      </li>
                    )}
                    {(isPageAllowed('abandoned_carts') || isPageAllowed('abandoned-carts')) && (
                      <li>
                        <Link to="/dashboard/abandoned-carts" className={isActive('/dashboard/abandoned-carts')} title="Abandoned Carts">
                          <FaShoppingCart />
                          <span className="nav-label">Abandoned Carts</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('products') && (
                      <li>
                        <Link to="/dashboard/products" className={isActive('/dashboard/products')} title="Products">
                          <FaTags />
                          <span className="nav-label">Products</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('leads') && (
                      <li>
                        <Link to="/dashboard/leads" className={isActive('/dashboard/leads')} title="WhatsApp Leads">
                          <FaUserTag />
                          <span className="nav-label">Leads</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* AI setup and outbound messaging */}
              {(isPageAllowed('knowledge_base') || isPageAllowed('knowledge-base') || canUseTemplates || isPageAllowed('broadcast')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">Automations</div>}
                  <ul className="nav-links">
                    {(isPageAllowed('knowledge_base') || isPageAllowed('knowledge-base')) && (
                      <li>
                        <Link to="/dashboard/knowledge-base" className={isActive('/dashboard/knowledge-base')} title="Knowledge Base">
                          <FaBrain />
                          <span className="nav-label">Knowledge Base</span>
                        </Link>
                      </li>
                    )}
                    {canUseTemplates && (
                      <li>
                        <Link to="/dashboard/templates" className={isActive('/dashboard/templates')} title="Templates">
                          <FaFileAlt />
                          <span className="nav-label">Templates</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('broadcast') && (
                      <li>
                        <Link to="/dashboard/broadcast" className={isActive('/dashboard/broadcast')} title="Broadcasting">
                          <FaBroadcastTower />
                          <span className="nav-label">Broadcasting</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Insights */}
              {isPageAllowed('analytics') && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">Insights</div>}
                  <ul className="nav-links">
                    <li>
                      <Link to="/dashboard/analytics" className={isActive('/dashboard/analytics')} title="Analytics">
                        <FaChartLine />
                        <span className="nav-label">Analytics</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}

              {/* Connection setup */}
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Connections & Integrations</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard/whatsapp-connect" className={isActive('/dashboard/whatsapp-connect')} title="WhatsApp Connection">
                      <FaWhatsapp />
                      <span className="nav-label">WhatsApp Connection</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/integrations#shopify" className={isIntegrationActive('shopify')} title="Shopify Integration">
                      <FaShopify />
                      <span className="nav-label">Shopify Integration</span>
                      {isOpen && isStoreConnectLocked && (
                        <FaLock aria-hidden="true" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.72 }} />
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/integrations#woocommerce" className={isIntegrationActive('woocommerce')} title="WooCommerce Integration">
                      <FaWordpress />
                      <span className="nav-label">WooCommerce Integration</span>
                      {isOpen && isStoreConnectLocked && (
                        <FaLock aria-hidden="true" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.72 }} />
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/developer" className={isActive('/dashboard/developer')} title="WhatsApp API Connection">
                      <FaCode />
                      <span className="nav-label">WhatsApp API Connection</span>
                      {isOpen && isDeveloperApiLocked && (
                        <FaLock aria-hidden="true" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.72 }} />
                      )}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Account */}
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Account</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard/billing" className={isActive('/dashboard/billing')} title="Billing">
                      <FaCrown />
                      <span className="nav-label">Billing</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/profile" className={isActive('/dashboard/profile')} title="Profile">
                      <FaUser />
                      <span className="nav-label">Profile</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/support" className={isActive('/dashboard/support')} title="Support Center">
                      <FaHeadset />
                      <span className="nav-label">Support Center</span>
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

