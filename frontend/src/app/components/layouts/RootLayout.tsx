import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, UserRole, ADMIN_LEVEL_ROLES } from '../../constants/roles';
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
  Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { BRAND } from '../../config/branding';
import { fetchMeetings } from '../../services/meetingService';

export function RootLayout() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasPrivateMeetings, setHasPrivateMeetings] = useState(false);

  const navItems: Array<{
    path: string;
    label: string;
    icon: any;
    roles: UserRole[];
  }> = [
    { path: '/', label: 'Dashboard', icon: BarChart3, roles: [] },
    { path: '/stage', label: 'Main Stage', icon: Video, roles: [] },
    { path: '/exhibition', label: 'Exhibition', icon: Store, roles: [] },
    {
      path: '/meetings',
      label: 'Meetings',
      icon: Calendar,
      roles: [],
    },
    {
      path: '/private-meetings',
      label: 'Private Meetings',
      icon: Lock,
      roles: [],
    },
    {
      path: '/pitch',
      label: 'Startup Pitch',
      icon: Rocket,
      roles: [],
    },
    {
      path: '/organizer',
      label: 'Organizer',
      icon: Settings,
      roles: [USER_ROLES.ORGANIZER, USER_ROLES.ADMIN],
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      roles: [USER_ROLES.ADMIN],
    },
  ];

  const currentPath = location.pathname;
  const currentNavItem = navItems.find(
    (item) => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path))
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasPrivateMeetings(false);
      return;
    }

    if (ADMIN_LEVEL_ROLES.includes(user.role)) {
      setHasPrivateMeetings(true);
      return;
    }

    const checkPrivate = async () => {
      try {
        const data = await fetchMeetings({ isPrivate: true });
        const hasActiveOrScheduled = data.some(
          (m) => m.status === 'active' || m.status === 'scheduled'
        );
        setHasPrivateMeetings(hasActiveOrScheduled);
      } catch (err) {
        console.warn('Failed to check private meetings:', err);
      }
    };

    checkPrivate();
    const interval = setInterval(checkPrivate, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (loading) return;

    // Direct user to login if trying to access a restricted path
    const isRestrictedPath =
      currentPath === '/profile' ||
      currentPath.startsWith('/organizer') ||
      currentPath === '/analytics' ||
      currentPath === '/logs' ||
      currentPath.startsWith('/private-meetings') ||
      (currentNavItem && currentNavItem.roles.length > 0);

    if (!isAuthenticated) {
      if (isRestrictedPath) {
        navigate('/auth/login');
      }
    } else if (user) {
      if (currentNavItem && currentNavItem.roles.length > 0 && !currentNavItem.roles.includes(user.role)) {
        navigate('/');
      }
      if (currentPath.startsWith('/private-meetings') && !ADMIN_LEVEL_ROLES.includes(user.role) && !hasPrivateMeetings) {
        navigate('/');
      }
      if (currentPath.startsWith('/organizer') && !( [USER_ROLES.ORGANIZER, USER_ROLES.ADMIN] as UserRole[] ).includes(user.role)) {
        navigate('/');
      }
      if (currentPath === '/analytics' && user.role !== USER_ROLES.ADMIN) {
        navigate('/');
      }
      if (currentPath === '/logs' && !( [USER_ROLES.ORGANIZER, USER_ROLES.ADMIN] as UserRole[] ).includes(user.role)) {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, currentPath, currentNavItem, loading, navigate, hasPrivateMeetings]);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/private-meetings') {
      if (!user) return false;
      if (ADMIN_LEVEL_ROLES.includes(user.role)) return true;
      return hasPrivateMeetings;
    }
    return item.roles.length === 0 || (user && item.roles.includes(user.role));
  });

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
      <aside className="hidden md:flex flex-col w-64 bg-[--color-sidebar] border-r border-[--color-sidebar-border] shrink-0 sticky top-0 h-screen">
        {/* Sidebar Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[--color-sidebar-border] bg-[--color-sidebar]">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className="block relative group no-underline">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {/* Left Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-600 dark:bg-emerald-500 rounded-r-full" />
                  )}
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Profile Menu */}
        <div className="p-4 border-t border-[--color-sidebar-border] bg-[--color-sidebar]">
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-100/40 dark:bg-slate-900/40 border border-[--color-sidebar-border]">
              <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 no-underline">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 text-sm border border-emerald-200/40">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate leading-none mb-1">{user.name}</p>
                  <p className="text-xs text-slate-505 dark:text-slate-400 truncate capitalize leading-none">{user.role.replace('_', ' ')}</p>
                </div>
              </Link>
              <button 
                onClick={handleLogout} 
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg border-none bg-transparent cursor-pointer transition-all"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/auth/login" className="block no-underline">
                <Button variant="ghost" size="sm" className="w-full justify-center rounded-xl border border-[--color-sidebar-border]">
                  Login
                </Button>
              </Link>
              <Link to="/auth/signup" className="block no-underline">
                <Button variant="default" size="sm" className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
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
          <div className="md:hidden border-b border-[--color-sidebar-border] bg-[--color-sidebar] sticky top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
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
                    className="block no-underline"
                  >
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-600 dark:bg-emerald-500 rounded-r-full" />
                      )}
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-[--color-sidebar-border]">
                {isAuthenticated ? (
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer transition-all"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)} className="block no-underline">
                      <Button variant="ghost" size="sm" className="w-full justify-center rounded-xl border border-[--color-sidebar-border]">
                        Login
                      </Button>
                    </Link>
                    <Link to="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="block no-underline">
                      <Button variant="default" size="sm" className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
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
