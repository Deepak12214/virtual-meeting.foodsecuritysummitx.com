import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  Plus, 
  Share2, 
  Play, 
  Sparkles, 
  Shield, 
  Hourglass, 
  Trash2, 
  Lock, 
  UserPlus, 
  X,
  Search,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMeetings,
  createMeeting,
  updateMeeting,
  searchRegisteredUsers,
  type Meeting,
  type CreateMeetingPayload,
} from '../services/meetingService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function deleteMeeting(meetingId: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete meeting');
}

// Helper to calculate initial rounded schedule date (now + 10 mins)
const getNextRoundedTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// Helper to get formatted human-readable remaining time
const getCountdownText = (targetDate: Date, nowTime: number) => {
  const diffMs = targetDate.getTime() - nowTime;
  if (diffMs <= 0) return 'Starting now...';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `starts in ${diffMins}m ${diffSecs}s`;
  }

  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  if (diffHours < 24) {
    return `starts in ${diffHours}h ${remainingMins}m`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `starts in ${diffDays}d ${diffHours % 24}h`;
};

export function PrivateMeetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Search & Tagging states
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; email: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  // Edit / Manage Invites state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [savingEmails, setSavingEmails] = useState(false);

  // Client-side precise ticker for live updates
  const [currentTime, setCurrentTime] = useState(Date.now());

  const canAccessMeetings = !!user;
  const canCreateMeetings = !!user && user.role === USER_ROLES.ADMIN;

  // ── 1. Debounced user search hook for meeting creation ──────────────────────
  useEffect(() => {
    if (!emailSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    const debounceHandler = setTimeout(async () => {
      try {
        const users = await searchRegisteredUsers(emailSearchQuery);
        setSearchResults(users);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(debounceHandler);
  }, [emailSearchQuery]);

  // ── 2. Live Ticker Hook ──────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── 3. Load Meetings ─────────────────────────────────────────────────────────
  const loadMeetings = async () => {
    try {
      const data = await fetchMeetings({ isPrivate: true });
      setMeetings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch private meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccessMeetings) {
      setLoading(true);
      loadMeetings();
    }
  }, [canAccessMeetings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Handle Create/Schedule Private Meeting ──────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setCreating(true);
    let finalScheduledTime: Date | string = new Date();

    if (isScheduled) {
      if (!scheduledDate) {
        toast.error('Please choose a start date & time');
        setCreating(false);
        return;
      }
      finalScheduledTime = new Date(scheduledDate);
      if (finalScheduledTime.getTime() < Date.now() - 60000) {
        toast.error('Cannot schedule a meeting in the past');
        setCreating(false);
        return;
      }
    }

    const payload: CreateMeetingPayload = {
      title,
      description,
      scheduledTime: isScheduled ? finalScheduledTime.toISOString() : new Date().toISOString(),
      duration: 30, // Locked to 30 mins
      isPrivate: true,
      invitedEmails: invitedEmails
    };

    try {
      const newMeeting = await createMeeting(payload);
      toast.success(
        isScheduled
          ? 'Private meeting scheduled successfully!'
          : 'Instant private meeting created!'
      );
      
      // Reset Form State
      setTitle('');
      setDescription('');
      setIsScheduled(false);
      setScheduledDate('');
      setInvitedEmails([]);
      setEmailSearchQuery('');
      setIsCreateOpen(false);
      
      loadMeetings();

      // For instant rooms, join directly
      if (!isScheduled) {
        navigate(`/meetings/${newMeeting._id ?? newMeeting.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create private meeting');
    } finally {
      setCreating(false);
    }
  };

  // ── 5. Handle Update Invited Emails (Admins) ───────────────────────────────────
  const openManageInvites = (meeting: Meeting) => {
    setEditingMeetingId(meeting._id ?? meeting.id ?? null);
    setEditingEmails(meeting.invitedEmails || []);
    setEmailSearchQuery('');
    setSearchResults([]);
    setIsEditOpen(true);
  };

  const handleSaveInvites = async () => {
    if (!editingMeetingId) return;

    setSavingEmails(true);
    try {
      await updateMeeting(editingMeetingId, { invitedEmails: editingEmails });
      toast.success('Invitations updated successfully!');
      setIsEditOpen(false);
      loadMeetings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update invitations');
    } finally {
      setSavingEmails(false);
    }
  };

  const handleShare = (meeting: Meeting) => {
    const link = `${window.location.origin}/meetings/${meeting._id ?? meeting.id}`;
    navigator.clipboard.writeText(link);
    toast.success('📋 Private meeting link copied to clipboard!');
  };

  // ── 6. Filtering Logic ────────────────────────────────────────────────────────
  const isExpired = (m: Meeting) => {
    const startTime = new Date(m.scheduledTime).getTime();
    const durationMs = (m.duration || 30) * 60 * 1000;
    return currentTime > (startTime + durationMs) || m.status === 'completed';
  };

  const activeMeetings = meetings.filter((m) => {
    if (isExpired(m)) return false;
    const startTime = new Date(m.scheduledTime).getTime();
    return m.status === 'active' || startTime <= currentTime;
  });

  const scheduledMeetings = meetings.filter((m) => {
    if (isExpired(m)) return false;
    const startTime = new Date(m.scheduledTime).getTime();
    return m.status === 'scheduled' && startTime > currentTime;
  });

  // Guard view
  if (!canAccessMeetings) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(76,175,80,0.06),transparent_50%)] pointer-events-none" />
        <Card className="w-full max-w-md bg-card border border-border shadow-2xl relative overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-600" />
          <CardHeader className="text-center pt-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Access Restricted</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Please sign in to access private networking spaces.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] space-y-10 pb-16">
      {/* Decorative top spotlight */}
      <div className="absolute top-[-10%] left-[10%] right-[10%] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider uppercase">
            <Lock className="h-4 w-4 text-emerald-500" />
            Secure Private Discussions
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Private Meetings
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Invited discussions only. These spaces are strictly restricted to selected participants.
          </p>
        </div>

        {canCreateMeetings && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md hover:shadow-emerald-500/10 transition-all border-none py-5 px-6 rounded-xl cursor-pointer">
                <Plus className="h-5 w-5" />
                Create Private Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border border-border shadow-2xl rounded-2xl p-6 text-foreground overflow-visible">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-500" />
                  New Private Meeting
                </DialogTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Only invited users in the database will be allowed to join this 30-minute session.
                </CardDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreate} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Room Title *</label>
                  <Input
                    required
                    placeholder="e.g., Board Meeting / Strategic Sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Agenda details, confidential topics..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl min-h-[80px]"
                  />
                </div>

                {/* Email Invite Autocomplete Section */}
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground">Invite Users (Only Registered Users) *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      className="bg-background border-border text-foreground pl-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-4.5"
                    />
                    {searchingUsers && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-emerald-500" />
                    )}
                  </div>

                  {/* Autocomplete suggestions */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-[100] left-0 right-0 mt-1.5 bg-card border border-border shadow-xl rounded-xl max-h-48 overflow-y-auto divide-y divide-border/60">
                      {searchResults.map((user) => (
                        <div
                          key={user.email}
                          onClick={() => {
                            if (!invitedEmails.includes(user.email)) {
                              setInvitedEmails([...invitedEmails, user.email]);
                            }
                            setEmailSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex flex-col transition-colors text-left"
                        >
                          <span className="text-sm font-semibold text-foreground leading-snug">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags list */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {invitedEmails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1 py-1 px-2.5 rounded-lg text-xs flex items-center font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => setInvitedEmails(invitedEmails.filter((e) => e !== email))}
                          className="hover:text-red-500 bg-transparent border-none p-0 cursor-pointer flex items-center text-inherit font-bold"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {invitedEmails.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No users invited yet. Search and select from above.</span>
                    )}
                  </div>
                </div>

                {/* Scheduling Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Meeting Timing</label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-muted rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setIsScheduled(false)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                        !isScheduled
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsScheduled(true);
                        if (!scheduledDate) {
                          setScheduledDate(getNextRoundedTime());
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                        isScheduled
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      📅 Schedule
                    </button>
                  </div>
                </div>

                {isScheduled && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-3 duration-200">
                    <label className="text-sm font-medium text-foreground">Start Date & Time *</label>
                    <Input
                      type="datetime-local"
                      required={isScheduled}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="bg-background border-border text-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-4 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setInvitedEmails([]);
                    }}
                    className="border-border hover:bg-muted rounded-xl py-5 cursor-pointer text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 shadow-md hover:shadow-emerald-500/10 border-none cursor-pointer"
                  >
                    {creating ? 'Creating...' : isScheduled ? 'Schedule Session' : 'Launch Room'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dynamic Invites Modal for Admin (Editing invites) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border border-border shadow-2xl rounded-2xl p-6 text-foreground overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              Manage Invites
            </DialogTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Add or remove registered database users invited to this private meeting.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-foreground">Invite Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={emailSearchQuery}
                  onChange={(e) => setEmailSearchQuery(e.target.value)}
                  className="bg-background border-border text-foreground pl-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-4.5"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-emerald-500" />
                )}
              </div>

              {/* Autocomplete suggestions */}
              {searchResults.length > 0 && (
                <div className="absolute z-[100] left-0 right-0 mt-1.5 bg-card border border-border shadow-xl rounded-xl max-h-48 overflow-y-auto divide-y divide-border/60">
                  {searchResults.map((user) => (
                    <div
                      key={user.email}
                      onClick={() => {
                        if (!editingEmails.includes(user.email)) {
                          setEditingEmails([...editingEmails, user.email]);
                        }
                        setEmailSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex flex-col transition-colors text-left"
                    >
                      <span className="text-sm font-semibold text-foreground leading-snug">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Current tags */}
              <div className="flex flex-wrap gap-1.5 pt-3">
                {editingEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1 py-1 px-2.5 rounded-lg text-xs flex items-center font-medium"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setEditingEmails(editingEmails.filter((e) => e !== email))}
                      className="hover:text-red-500 bg-transparent border-none p-0 cursor-pointer flex items-center text-inherit font-bold"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {editingEmails.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No users invited. Access is blocked until users are added.</span>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-border hover:bg-muted rounded-xl py-5 cursor-pointer text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={savingEmails}
                onClick={handleSaveInvites}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 shadow-md hover:shadow-emerald-500/10 border-none cursor-pointer"
              >
                {savingEmails ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        <div className="p-6 rounded-2xl bg-card border border-border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Private Rooms</p>
            <p className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">{activeMeetings.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Upcoming Private Sessions</p>
            <p className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">{scheduledMeetings.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
        </div>
      </div>

      {/* Main Lists Layout */}
      {loading ? (
        <div className="py-20 text-center relative z-10">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Fetching private rooms...</p>
        </div>
      ) : (
        <div className="space-y-10 relative z-10">
          
          {/* Section 1: Active Rooms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Active Private Discussions</h2>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Secure spaces active now. Click to join.</p>
              </div>
              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs py-1 px-3">
                {activeMeetings.length} Active
              </Badge>
            </div>

            {activeMeetings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 border border-border border-dashed">
                <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-foreground font-semibold text-lg">No Active Private Rooms</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  You are not currently added to any live private discussions.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeMeetings.map((meeting) => (
                  <PrivateMeetingRow
                    key={meeting._id ?? meeting.id}
                    meeting={meeting}
                    onShare={handleShare}
                    isAdmin={user?.role === USER_ROLES.ADMIN}
                    userId={user?.id ?? user?.id ?? ''}
                    onManageInvites={openManageInvites}
                    onDelete={() => {
                      deleteMeeting(meeting._id ?? meeting.id ?? '').then(() => {
                        toast.success('Meeting deleted');
                        loadMeetings();
                      }).catch((e: any) => toast.error(e.message));
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Upcoming Scheduled Sessions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">Upcoming Private Sessions</h2>
                <p className="text-xs text-muted-foreground">Secure planned syncs. Will activate at scheduled times.</p>
              </div>
              <Badge className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 text-xs py-1 px-3">
                {scheduledMeetings.length} Scheduled
              </Badge>
            </div>

            {scheduledMeetings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 border border-border border-dashed">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-foreground font-semibold text-lg">No Scheduled Sessions</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  No upcoming private meetings scheduled.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {scheduledMeetings.map((meeting) => (
                  <ScheduledPrivateMeetingRow
                    key={meeting._id ?? meeting.id}
                    meeting={meeting}
                    currentTime={currentTime}
                    onShare={handleShare}
                    isAdmin={user?.role === USER_ROLES.ADMIN}
                    userId={user?.id ?? user?.id ?? ''}
                    onManageInvites={openManageInvites}
                    onDelete={() => {
                      deleteMeeting(meeting._id ?? meeting.id ?? '').then(() => {
                        toast.success('Meeting deleted');
                        loadMeetings();
                      }).catch((e: any) => toast.error(e.message));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active Private Meeting Row Component ──────────────────────────────────────
function PrivateMeetingRow({
  meeting,
  onShare,
  isAdmin,
  userId,
  onManageInvites,
  onDelete,
}: {
  meeting: Meeting;
  onShare: (meeting: Meeting) => void;
  isAdmin?: boolean;
  userId?: string;
  onManageInvites: (meeting: Meeting) => void;
  onDelete?: () => void;
}) {
  const canDelete = isAdmin || (userId && meeting.creator?._id === userId) || (userId && (meeting.creator as any) === userId);
  const canManage = isAdmin || (userId && meeting.creator?._id === userId) || (userId && (meeting.creator as any) === userId);

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 hover:border-emerald-500/35 transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden group">
      {/* Decorative vertical stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500" />
      
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <Badge className="bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1 py-0.5 px-2.5 text-[10px] font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            PRIVATE LIVE
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meeting.duration || 30} mins
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[10px] font-bold">
              {meeting.creator?.name?.slice(0, 2).toUpperCase() || 'OP'}
            </span>
            <span>Created by <strong className="text-foreground">{meeting.creator?.name || 'Admin'}</strong></span>
          </div>
        </div>

        <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Lock className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
          {meeting.title}
        </h3>

        {meeting.description && (
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold mt-2 leading-relaxed max-w-4xl p-2">
            {meeting.description}
          </p>
        )}

        {/* Invited Emails Badge List for Info */}
        {isAdmin && meeting.invitedEmails && meeting.invitedEmails.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 items-center">
            <span className="text-xs font-semibold text-muted-foreground mr-1.5">Invited ({meeting.invitedEmails.length}):</span>
            {meeting.invitedEmails.slice(0, 5).map(email => (
              <Badge key={email} variant="outline" className="text-[10px] py-0.5 px-2 bg-slate-50 dark:bg-slate-900 border-slate-200">
                {email}
              </Badge>
            ))}
            {meeting.invitedEmails.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{meeting.invitedEmails.length - 5} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 pl-3 md:pl-0">
        <Link to={`/meetings/${meeting._id ?? meeting.id}`}>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-4.5 px-5 font-bold text-sm shadow-sm hover:shadow-emerald-500/10 border-none cursor-pointer">
            <Play className="h-4 w-4 fill-white" />
            Join Room
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => onShare(meeting)}
          className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl p-4.5 cursor-pointer"
          title="Copy meeting link"
        >
          <Share2 className="h-4 w-4" />
        </Button>

        {canManage && (
          <Button
            variant="outline"
            onClick={() => onManageInvites(meeting)}
            className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl p-4.5 cursor-pointer"
            title="Manage invites"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                title="Delete meeting"
                className="border-red-500/20 hover:bg-red-500/10 text-red-500 hover:text-red-600 rounded-xl p-4.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Private Meeting</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete private meeting "{meeting.title}"? This is permanent and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ─── Scheduled Private Meeting List Row Component ───────────────────────────────────
function ScheduledPrivateMeetingRow({
  meeting,
  currentTime,
  onShare,
  isAdmin,
  userId,
  onManageInvites,
  onDelete,
}: {
  meeting: Meeting;
  currentTime: number;
  onShare: (meeting: Meeting) => void;
  isAdmin?: boolean;
  userId?: string;
  onManageInvites: (meeting: Meeting) => void;
  onDelete?: () => void;
}) {
  const canDelete = isAdmin || (userId && meeting.creator?._id === userId) || (userId && (meeting.creator as any) === userId);
  const canManage = isAdmin || (userId && meeting.creator?._id === userId) || (userId && (meeting.creator as any) === userId);
  const date = new Date(meeting.scheduledTime);
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 hover:border-amber-500/25 transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden group">
      {/* Decorative vertical stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />
      
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <Badge className="bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-500 border border-amber-500/20 gap-1 py-0.5 px-2.5 text-[10px] font-bold uppercase">
            PRIVATE UPCOMING
          </Badge>
          <Badge variant="outline" className="text-amber-600 dark:text-amber-500 border-amber-500/20 bg-amber-500/5 text-[10px] gap-1 flex items-center font-bold px-2 py-0.5">
            <Hourglass className="h-3 w-3 animate-pulse text-amber-500" />
            {getCountdownText(date, currentTime)}
          </Badge>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedDate} @ {formattedTime} ({meeting.duration || 30} min)
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Lock className="h-4.5 w-4.5 text-amber-500 shrink-0" />
          {meeting.title}
        </h3>

        {meeting.description && (
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold mt-2 leading-relaxed max-w-4xl p-2">
            {meeting.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
          <span className="w-4 h-4 rounded-full bg-muted text-foreground flex items-center justify-center text-[9px] font-bold">
            {meeting.creator?.name?.slice(0, 2).toUpperCase() || 'OP'}
          </span>
          <span>Scheduled by <strong className="text-foreground">{meeting.creator?.name || 'Admin'}</strong></span>
        </div>

        {/* Invited Emails Badge List for Info */}
        {isAdmin && meeting.invitedEmails && meeting.invitedEmails.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 items-center">
            <span className="text-xs font-semibold text-muted-foreground mr-1.5">Invited ({meeting.invitedEmails.length}):</span>
            {meeting.invitedEmails.slice(0, 5).map(email => (
              <Badge key={email} variant="outline" className="text-[10px] py-0.5 px-2 bg-slate-50 dark:bg-slate-900 border-slate-200">
                {email}
              </Badge>
            ))}
            {meeting.invitedEmails.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{meeting.invitedEmails.length - 5} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 pl-3 md:pl-0">
        <Button
          variant="outline"
          onClick={() => onShare(meeting)}
          className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl py-4.5 px-4 cursor-pointer text-xs"
          title="Copy meeting link"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Copy Link
        </Button>
        
        <Link to={`/meetings/${meeting._id ?? meeting.id}`}>
          <Button
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl py-4.5 px-4 font-bold text-xs transition-all cursor-pointer"
          >
            Enter Lobby
          </Button>
        </Link>

        {canManage && (
          <Button
            variant="outline"
            onClick={() => onManageInvites(meeting)}
            className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl py-4.5 px-4 cursor-pointer"
            title="Manage invites"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        )}

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                title="Delete meeting"
                className="border-red-500/20 hover:bg-red-500/10 text-red-500 hover:text-red-600 rounded-xl py-4.5 px-4 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Private Meeting</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete scheduled private meeting "{meeting.title}"? This is permanent and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
