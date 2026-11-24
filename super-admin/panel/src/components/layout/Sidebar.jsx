import { NavLink, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BrandMark from '../BrandMark';
import { SUPER_ADMIN_NAV } from '../../lib/navigation';
import { useAuth } from '../../lib/auth';
import { initials } from '../../lib/format';

export default function Sidebar({ onNavigate }) {
  const { admin, logout } = useAuth();
  const sections = SUPER_ADMIN_NAV;
  const { pathname } = useLocation();
  const name = admin?.name || admin?.email || 'Admin';

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand"><BrandMark /></div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div className="nav-section" key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            <ul className="nav-list">
              {section.items.map(({ to, label, icon: Icon, end, also }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => `nav-link ${isActive || also?.some((p) => pathname.startsWith(p)) ? 'active' : ''}`}
                    onClick={onNavigate}
                  >
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="nav-link-label">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="account">
          <span className="avatar" aria-hidden="true">{initials(name)}</span>
          <div className="account-text">
            <div className="account-name">{name}</div>
            {admin?.email && admin.email !== name && <div className="account-email">{admin.email}</div>}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
