import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import {
  Search,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  MoreHorizontal,
  UserCog,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  company?: string;
  isApproved: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface Stats {
  pending: number;
  approved: number;
  total: number;
}

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-600 border-red-500/30',
  organizer: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  stage_manager: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  host: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  moderator: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  speaker: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  investor: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  startup: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  exhibitor: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
  sponsor: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  attendee: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
  free_visitor: 'bg-slate-500/15 text-slate-500 border-slate-400/30',
};

const ALL_ROLES = [
  'admin', 'organizer', 'stage_manager', 'host', 'moderator',
  'speaker', 'investor', 'startup', 'exhibitor', 'sponsor',
  'attendee', 'free_visitor',
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── User Card Component ──────────────────────────────────────────────────────

function UserCard({
  user,
  isAdmin,
  onApprove,
  onReject,
  onRoleChange,
  onDelete,
  loadingId,
}: {
  user: AdminUser;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
  onDelete: (id: string) => void;
  loadingId: string | null;
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const isLoading = loadingId === user._id;
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative p-4 rounded-xl border border-[--color-border] bg-[--color-surface] hover:bg-[--color-surface-elevated] transition-all duration-200 group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
          user.isApproved ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            {/* Status dots */}
            <div className="flex items-center gap-1">
              {user.isApproved ? (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Approved" />
              ) : (
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" title="Pending" />
              )}
              {!user.isActive && (
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Deactivated" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3 text-[--color-text-secondary]" />
            <p className="text-xs text-[--color-text-secondary] truncate">{user.email}</p>
          </div>

          {user.company && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-[--color-text-secondary]" />
              <p className="text-xs text-[--color-text-secondary] truncate">{user.company}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[10px] h-5 capitalize border ${ROLE_COLORS[user.role] || ''}`}
            >
              {user.role.replace('_', ' ')}
            </Badge>
            {!user.isApproved && (
              <Badge variant="outline" className="text-[10px] h-5 border-yellow-500/30 bg-yellow-500/10 text-yellow-600">
                <Clock className="h-2.5 w-2.5 mr-1" />
                Pending
              </Badge>
            )}
            {!user.isActive && (
              <Badge variant="outline" className="text-[10px] h-5 border-red-500/30 bg-red-500/10 text-red-500">
                Deactivated
              </Badge>
            )}
          </div>

          <p className="text-[10px] text-[--color-text-secondary] mt-1.5 flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(user.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[--color-border]">
        {!user.isApproved ? (
          <Button
            size="sm"
            className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-500 text-white gap-1"
            onClick={() => onApprove(user._id)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
            Approve
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1"
            onClick={() => onReject(user._id)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
            Revoke
          </Button>
        )}

        {/* Role change dropdown — admin only */}
        {isAdmin && (
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              title="Change role"
            >
              <UserCog className="h-3.5 w-3.5" />
            </Button>
            {showRoleMenu && (
              <div className="absolute right-0 bottom-8 z-50 w-40 bg-[--color-surface-elevated] border border-[--color-border] rounded-lg shadow-xl overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-semibold text-[--color-text-secondary] uppercase tracking-wide border-b border-[--color-border]">
                  Change Role
                </p>
                <ScrollArea className="h-48">
                  {ALL_ROLES.map((r) => (
                    <button
                      key={r}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[--color-surface] transition-colors capitalize ${
                        r === user.role ? 'font-semibold text-indigo-500' : ''
                      }`}
                      onClick={() => {
                        onRoleChange(user._id, r);
                        setShowRoleMenu(false);
                      }}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
            onClick={() => onDelete(user._id)}
            disabled={isLoading}
            title="Delete user"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function OrganizerUsers() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [roleFilter, setRoleFilter] = useState('all');

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch users');

      setAllUsers(data.users);
      setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleApprove = async (userId: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAllUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isApproved: true } : u));
      setStats((s) => ({ ...s, pending: s.pending - 1, approved: s.approved + 1 }));
      toast.success(`✅ ${data.user.name} approved successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve user');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/reject`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAllUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isApproved: false } : u));
      setStats((s) => ({ ...s, pending: s.pending + 1, approved: s.approved - 1 }));
      toast.warning(`Access revoked for ${data.user.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke access');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAllUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to "${newRole.replace('_', ' ')}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    const target = allUsers.find((u) => u._id === userId);
    if (!window.confirm(`Delete ${target?.name}? This cannot be undone.`)) return;

    setLoadingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAllUsers((prev) => prev.filter((u) => u._id !== userId));
      setStats((s) => ({ ...s, total: s.total - 1 }));
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setLoadingId(null);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.company || '').toLowerCase().includes(q);
    return matchesSearch;
  });

  const pendingUsers  = filtered.filter((u) => !u.isApproved);
  const approvedUsers = filtered.filter((u) => u.isApproved);

  const sharedCardProps = {
    isAdmin,
    onApprove: handleApprove,
    onReject: handleReject,
    onRoleChange: handleRoleChange,
    onDelete: handleDelete,
    loadingId,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-[--color-text-secondary] mt-1 text-sm">
            Review, approve, and manage all platform users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Total Users</CardDescription>
            <CardTitle className="text-3xl font-bold">{loading ? '—' : stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-1 text-xs text-[--color-text-secondary]">
              <Users className="h-3 w-3" /> All registered
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs text-yellow-600">Pending Approval</CardDescription>
            <CardTitle className="text-3xl font-bold text-yellow-600">
              {loading ? '—' : stats.pending}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-1 text-xs text-yellow-600">
              <Clock className="h-3 w-3" /> Awaiting review
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs text-green-600">Approved</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">
              {loading ? '—' : stats.approved}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <ShieldCheck className="h-3 w-3" /> Full access
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Approval Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {loading || stats.total === 0 ? '—' : `${Math.round((stats.approved / stats.total) * 100)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: stats.total ? `${(stats.approved / stats.total) * 100}%` : '0%' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--color-text-secondary]" />
          <Input
            placeholder="Search by name, email, or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-[--color-border] bg-[--color-surface] text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
        >
          <option value="all">All Roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="pending" className="gap-2 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Pending
            {stats.pending > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2 text-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Approved ({approvedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[--color-text-secondary]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading users…</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[--color-text-secondary]">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-medium">No pending approvals</p>
              <p className="text-sm">All registered users have been reviewed.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[--color-text-secondary]">
                  {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting for approval
                </p>
                {isAdmin && pendingUsers.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-2 text-green-600 border-green-600/30 hover:bg-green-500/10"
                    onClick={async () => {
                      for (const u of pendingUsers) await handleApprove(u._id);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingUsers.map((u) => (
                  <UserCard key={u._id} user={u} {...sharedCardProps} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Approved Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="approved" className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[--color-text-secondary]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading users…</p>
            </div>
          ) : approvedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[--color-text-secondary]">
              <Users className="h-12 w-12" />
              <p className="font-medium">No approved users found</p>
              <p className="text-sm">Try adjusting the search or filters.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[--color-text-secondary] mb-3">
                {approvedUsers.length} approved user{approvedUsers.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {approvedUsers.map((u) => (
                  <UserCard key={u._id} user={u} {...sharedCardProps} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
