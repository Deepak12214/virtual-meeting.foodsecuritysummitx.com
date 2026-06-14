import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

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

  // Reset page when tab/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, roleFilter]);

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

  // Pagination lists
  const currentTabUsers = activeTab === 'pending' ? pendingUsers : approvedUsers;
  const totalPages = Math.ceil(currentTabUsers.length / pageSize);
  const paginatedUsers = currentTabUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                      if (window.confirm(`Approve all ${pendingUsers.length} pending users?`)) {
                        for (const u of pendingUsers) await handleApprove(u._id);
                      }
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve All
                  </Button>
                )}
              </div>
              
              {/* User List Table */}
              <div className="rounded-xl border border-[--color-border] overflow-hidden bg-[--color-surface] shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[--color-surface-elevated]">
                      <TableRow>
                        <TableHead className="w-[60px] pl-4">User</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Requested Role</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => {
                        const initials = u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                        const isLoading = loadingId === u._id;
                        return (
                          <TableRow key={u._id} className="hover:bg-muted/30">
                            <TableCell className="pl-4">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-xs">
                                {initials}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-sm text-[--color-text-primary] flex items-center gap-1.5">
                                  {u.name}
                                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" title="Pending Approval" />
                                </p>
                                <p className="text-xs text-[--color-text-secondary] mt-0.5">{u.email}</p>
                                {u.company && (
                                  <p className="text-[10px] text-[--color-text-secondary] mt-0.5 font-medium italic">{u.company}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] capitalize border ${ROLE_COLORS[u.role] || ''}`}>
                                {u.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-[--color-text-secondary]">
                              {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-green-600 hover:bg-green-500 text-white gap-1"
                                  onClick={() => handleApprove(u._id)}
                                  disabled={isLoading}
                                >
                                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                  Approve
                                </Button>
                                
                                {isAdmin && (
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                    disabled={isLoading}
                                    className="h-7 px-1.5 rounded-md border border-[--color-border] bg-[--color-surface] text-[11px] text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-indigo-500/40 capitalize"
                                  >
                                    {ALL_ROLES.map((r) => (
                                      <option key={r} value={r} className="capitalize">
                                        {r.replace('_', ' ')}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                    onClick={() => handleDelete(u._id)}
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-[--color-text-secondary]">
                    Showing {Math.min(pendingUsers.length, (currentPage - 1) * pageSize + 1)} to {Math.min(pendingUsers.length, currentPage * pageSize)} of {pendingUsers.length} users
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
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
              
              {/* User List Table */}
              <div className="rounded-xl border border-[--color-border] overflow-hidden bg-[--color-surface] shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[--color-surface-elevated]">
                      <TableRow>
                        <TableHead className="w-[60px] pl-4">User</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Platform Role</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => {
                        const initials = u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                        const isLoading = loadingId === u._id;
                        return (
                          <TableRow key={u._id} className="hover:bg-muted/30">
                            <TableCell className="pl-4">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {initials}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-sm text-[--color-text-primary] flex items-center gap-1.5">
                                  {u.name}
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Approved Access" />
                                </p>
                                <p className="text-xs text-[--color-text-secondary] mt-0.5">{u.email}</p>
                                {u.company && (
                                  <p className="text-[10px] text-[--color-text-secondary] mt-0.5 font-medium italic">{u.company}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] capitalize border ${ROLE_COLORS[u.role] || ''}`}>
                                {u.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-[--color-text-secondary]">
                              {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                                  onClick={() => handleReject(u._id)}
                                  disabled={isLoading}
                                >
                                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                                  Revoke
                                </Button>
                                
                                {isAdmin && (
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                    disabled={isLoading}
                                    className="h-7 px-1.5 rounded-md border border-[--color-border] bg-[--color-surface] text-[11px] text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-indigo-500/40 capitalize"
                                  >
                                    {ALL_ROLES.map((r) => (
                                      <option key={r} value={r} className="capitalize">
                                        {r.replace('_', ' ')}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                    onClick={() => handleDelete(u._id)}
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-[--color-text-secondary]">
                    Showing {Math.min(approvedUsers.length, (currentPage - 1) * pageSize + 1)} to {Math.min(approvedUsers.length, currentPage * pageSize)} of {approvedUsers.length} users
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
