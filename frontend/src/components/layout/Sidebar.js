import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaComments, FaBox, FaExclamationTriangle, FaPlug, FaBell, FaSignOutAlt, FaUser, FaBrain, FaCommentDots, FaBroadcastTower, FaChartLine, FaCog, FaCrown, FaFileAlt, FaShoppingCart, FaCoins, FaUserSecret, FaHeartbeat, FaBullhorn, FaBlog, FaWhatsapp, FaShieldAlt, FaToggleOn, FaTimes, FaTags, FaUserTag, FaCode, FaBookOpen, FaKey, FaUserPlus } from 'react-icons/fa';
import { useEffectiveAccess } from '../../context/EffectiveAccessContext';

export default function Sidebar({ admin, onLogout, isOpen, onToggle, pendingDemoRequestsCount }) {
  const location = useLocation();
  const { canViewPage } = useEffectiveAccess();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const isPageAllowed = (key) => {
    if (!admin || admin.role === 'super_admin') return true;
    return canViewPage(key);
  };
  const canUseTemplates = isPageAllowed('templates') || isPageAllowed('whatsapp-templates');

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
                <img 
                  src={isOpen ? "/logo-reversed.png" : "/app-icon.png"} 
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
                    maxWidth: isOpen ? '140px' : '32px', 
                    flexShrink: 0, 
                    objectFit: 'contain',
                    display: 'block'
                  }} 
                />
              );
            })()}
          </div>
          {isOpen && (
            <button className="sidebar-close-btn" onClick={onToggle} aria-label="Close sidebar">
              <FaTimes />
            </button>
          )}
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
                <li>
                  <Link to="/dashboard/super-admin/developer-api" className={isActive('/dashboard/super-admin/developer-api')} title="Developer API Hub">
                    <FaCode />
                    <span className="nav-label">Developer API</span>
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

              {/* Customer Messaging */}
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">Customer Messaging</div>}
                <ul className="nav-links">
                  {(isPageAllowed('live_chat') || isPageAllowed('conversations') || isPageAllowed('live-chat')) && (
                    <li>
                      <Link to="/dashboard/live-chat" className={isActive('/dashboard/live-chat')} title="Live Chat">
                        <FaCommentDots />
                        <span className="nav-label">Chat</span>
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

              {/* WhatsApp Setup */}
              <div className="nav-section">
                {isOpen && <div className="nav-section-title">WhatsApp Setup</div>}
                <ul className="nav-links">
                  <li>
                    <Link to="/dashboard/whatsapp-connect" className={isActive('/dashboard/whatsapp-connect')} title="WhatsApp Connection">
                      <FaWhatsapp />
                      <span className="nav-label">WhatsApp Connection</span>
                    </Link>
                  </li>
                  {isPageAllowed('integrations') && (
                    <li>
                      <Link to="/dashboard/integrations" className={isActive('/dashboard/integrations')} title="Store Integrations">
                        <FaCog />
                        <span className="nav-label">Integrations</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Commerce & CRM */}
              {(isPageAllowed('orders') || isPageAllowed('products') || isPageAllowed('leads') || isPageAllowed('abandoned_carts') || isPageAllowed('abandoned-carts') || isPageAllowed('escalations')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">Commerce & CRM</div>}
                  <ul className="nav-links">
                    {isPageAllowed('orders') && (
                      <li>
                        <Link to="/dashboard/orders" className={isActive('/dashboard/orders')} title="Orders">
                          <FaBox />
                          <span className="nav-label">Orders</span>
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
                    {(isPageAllowed('abandoned_carts') || isPageAllowed('abandoned-carts')) && (
                      <li>
                        <Link to="/dashboard/abandoned-carts" className={isActive('/dashboard/abandoned-carts')} title="Abandoned Carts">
                          <FaShoppingCart />
                          <span className="nav-label">Abandoned Carts</span>
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

              {/* AI Section */}
              {(isPageAllowed('knowledge_base') || isPageAllowed('knowledge-base')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">AI Knowledge</div>}
                  <ul className="nav-links">
                    <li>
                      <Link to="/dashboard/knowledge-base" className={isActive('/dashboard/knowledge-base')} title="Knowledge Base">
                        <FaBrain />
                        <span className="nav-label">Knowledge Base</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              )}

              {/* WhatsApp API / Developer Section */}
              {(isPageAllowed('api-dashboard') || isPageAllowed('api-keys') || isPageAllowed('api-documentation') || isPageAllowed('webhook-configuration') || isPageAllowed('api-logs') || isPageAllowed('failed-webhooks') || isPageAllowed('api-usage') || isPageAllowed('developer-api')) && (
                <div className="nav-section">
                  {isOpen && <div className="nav-section-title">WhatsApp API</div>}
                  <ul className="nav-links">
                    {(isPageAllowed('api-dashboard') || isPageAllowed('developer-api')) && (
                      <li>
                        <Link to="/dashboard/developer" className={isActive('/dashboard/developer')} title="API Dashboard">
                          <FaCode />
                          <span className="nav-label">API Dashboard</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('api-keys') && (
                      <li>
                        <Link to="/dashboard/developer/api-keys" className={isActive('/dashboard/developer/api-keys')} title="API Keys">
                          <FaKey />
                          <span className="nav-label">API Keys</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('api-documentation') && (
                      <li>
                        <Link to="/dashboard/developer/docs" className={isActive('/dashboard/developer/docs')} title="Interactive API Docs">
                          <FaBookOpen />
                          <span className="nav-label">API Documentation</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('webhook-configuration') && (
                      <li>
                        <Link to="/dashboard/developer/webhooks" className={isActive('/dashboard/developer/webhooks')} title="Webhooks">
                          <FaPlug />
                          <span className="nav-label">Webhooks</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('api-logs') && (
                      <li>
                        <Link to="/dashboard/developer/logs" className={isActive('/dashboard/developer/logs')} title="API Logs">
                          <FaFileAlt />
                          <span className="nav-label">API Logs</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('failed-webhooks') && (
                      <li>
                        <Link to="/dashboard/developer/failed-webhooks" className={isActive('/dashboard/developer/failed-webhooks')} title="Failed Webhooks">
                          <FaExclamationTriangle />
                          <span className="nav-label">Failed Webhooks</span>
                        </Link>
                      </li>
                    )}
                    {isPageAllowed('api-usage') && (
                      <li>
                        <Link to="/dashboard/developer/usage" className={isActive('/dashboard/developer/usage')} title="Usage & Limits">
                          <FaChartLine />
                          <span className="nav-label">API Usage</span>
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

