import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuth } from '../../context/AuthContext';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <header className="main-header">
          <div className="main-header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="main-header-right">
            <button className="btn-icon btn-ghost">
              <Bell size={20} />
            </button>
            <div className="header-user">
              <div className="header-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <span className="header-user-name">{user?.name || 'Admin'}</span>
            </div>
          </div>
        </header>

        <div className="main-body">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
};

export default AppLayout;
