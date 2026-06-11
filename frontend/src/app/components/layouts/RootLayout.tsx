import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import {
  Video,
  Store,
  Calendar,
  Rocket,
  BarChart3,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { BRAND } from '../../config/branding';

export function RootLayout() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3, roles: [] },
    { path: '/stage', label: 'Main Stage', icon: Video, roles: [] },
    { path: '/exhibition', label: 'Exhibition', icon: Store, roles: [] },
    {
      path: '/meetings',
      label: 'Meetings',
      icon: Calendar,
      roles: ['attendee', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'host', 'organizer', 'admin'],
    },
    {
      path: '/pitch',
      label: 'Startup Pitch',
      icon: Rocket,
      roles: ['startup', 'investor', 'moderator', 'host', 'organizer', 'admin'],
    },
    {
      path: '/organizer',
      label: 'Organizer',
      icon: Settings,
      roles: ['organizer', 'admin'],
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      roles: ['organizer', 'admin', 'exhibitor', 'sponsor'],
    },
    {
      path: '/logs',
      label: 'Op Logs',
      icon: Settings,
      roles: ['organizer', 'admin'],
    },
  ];

  const currentPath = location.pathname;
  const currentNavItem = navItems.find(
    (item) => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path))
  );

  useEffect(() => {
    if (loading) return;

    // Direct user to login if trying to access a restricted path
    const isRestrictedPath =
      currentPath === '/profile' ||
      currentPath.startsWith('/organizer') ||
      currentPath === '/analytics' ||
      currentPath === '/logs' ||
      (currentNavItem && currentNavItem.roles.length > 0);

    if (!isAuthenticated && isRestrictedPath) {
      navigate('/auth/login');
    }
  }, [isAuthenticated, currentPath, currentNavItem, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const visibleNavItems = navItems.filter(
    (item) => item.roles.length === 0 || (user && item.roles.includes(user.role))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-surface] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-surface] flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[--color-surface-elevated] border-r border-[--color-border] shrink-0 sticky top-0 h-screen">
        {/* Sidebar Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[--color-border]">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className="block">
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-3 px-3 py-2 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Profile Menu */}
        <div className="p-4 border-t border-[--color-border] bg-[--color-surface-elevated]">
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between gap-2">
              <Link to="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-85">
                <div className="h-8 w-8 rounded-full bg-[--color-primary]/10 flex items-center justify-center text-[--color-primary] font-semibold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[--color-text-primary] truncate">{user.name}</p>
                  <p className="text-xs text-[--color-text-secondary] truncate capitalize">{user.role}</p>
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2 h-auto" title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/auth/login" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Login
                </Button>
              </Link>
              <Link to="/auth/signup" className="block">
                <Button variant="default" size="sm" className="w-full justify-center">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area & Mobile View Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-[--color-surface-elevated] border-b border-[--color-border] h-16 flex items-center justify-between px-4 sticky top-0 z-50">
          <Link to="/">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-10 w-auto object-contain"
            />
          </Link>
          
          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <Link to="/profile">
                <div className="h-8 w-8 rounded-full bg-[--color-primary]/10 flex items-center justify-center text-[--color-primary] font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[--color-border] bg-[--color-surface-elevated] sticky top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg">
            <nav className="px-4 py-4 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start gap-3"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-[--color-border]">
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="default" size="sm" className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Outlet />
        </main>

        {/* User Status Banner (if not approved) */}
        {user && !user.isApproved && (
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-yellow-500/10 border-t border-yellow-500/20 backdrop-blur z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-sm text-center text-yellow-600">
                Your account is pending approval. Some features may be restricted until an organizer approves your access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
