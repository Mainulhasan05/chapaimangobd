import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  Shield,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/sms', label: 'SMS Center', icon: MessageSquare },
  { path: '/import', label: 'Excel Import', icon: FileSpreadsheet },
  { path: '/audit-logs', label: 'Audit Logs', icon: Shield },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: '#fff', fontSize: '1.25rem' }}>
            🥭
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sidebar-brand-text" style={{ fontSize: '1rem', lineHeight: 1.2 }}>Chapai Mango</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>chapaimango.bd</span>
          </div>
          <button className="btn-icon btn-ghost menu-toggle" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
              end={item.path === '/'}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 'var(--space-lg)' }}>
            Settings & System
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            onClick={onClose}
          >
            <Settings size={20} />
            Settings
          </NavLink>
        </nav>

        <div style={{
          padding: 'var(--space-md)',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            className="sidebar-link"
            onClick={logout}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
