import { useState, useEffect, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
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
import { Calendar, Clock, Users, Video, AlertCircle, Plus, Share2, Play, Sparkles, Shield, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMeetings,
  createMeeting,
  type Meeting,
  type CreateMeetingPayload,
} from '../services/meetingService';

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

export function MeetingRooms() {
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

  // Client-side precise ticker for live updates
  const [currentTime, setCurrentTime] = useState(Date.now());

  const canAccessMeetings = !!user;
  const canCreateMeetings = !!user;

  // ── 1. Live Ticker Hook ──────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Load Meetings ─────────────────────────────────────────────────────────
  const loadMeetings = async () => {
    try {
      const data = await fetchMeetings();
      setMeetings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch meetings');
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

  // ── 3. Handle Create/Schedule Meeting ─────────────────────────────────────────
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
    };

    try {
      const newMeeting = await createMeeting(payload);
      toast.success(
        isScheduled
          ? 'Meeting scheduled successfully!'
          : 'Instant meeting room created!'
      );
      
      // Reset Form State
      setTitle('');
      setDescription('');
      setIsScheduled(false);
      setScheduledDate('');
      setIsCreateOpen(false);
      
      loadMeetings();

      // For instant rooms, join directly
      if (!isScheduled) {
        navigate(`/meetings/${newMeeting._id ?? newMeeting.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = (meeting: Meeting) => {
    const link = `${window.location.origin}/meetings/${meeting._id ?? meeting.id}`;
    navigator.clipboard.writeText(link);
    toast.success('📋 Meeting link copied to clipboard!');
  };

  // ── 4. Filtering Logic (Exclude Expired & Non-Personal stage rooms) ───────────
  const filteredMeetings = meetings.filter(
    (m) => m.title !== 'Main Stage Broadcast' && m.title !== 'Startup Pitch Ceremony'
  );

  const isExpired = (m: Meeting) => {
    const startTime = new Date(m.scheduledTime).getTime();
    const durationMs = (m.duration || 30) * 60 * 1000;
    return currentTime > (startTime + durationMs) || m.status === 'completed';
  };

  const activeMeetings = filteredMeetings.filter((m) => {
    if (isExpired(m)) return false;
    const startTime = new Date(m.scheduledTime).getTime();
    return m.status === 'active' || startTime <= currentTime;
  });

  const scheduledMeetings = filteredMeetings.filter((m) => {
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
              Please sign in to access scheduled video meeting rooms and live networking spaces.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] space-y-10 pb-16">
      {/* Decorative top blur spotlight using emerald green */}
      <div className="absolute top-[-10%] left-[10%] right-[10%] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(76,175,80,0.08),transparent_60%)] pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Networking & Video Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Meeting Rooms
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Create instant collaborative video spaces or schedule sessions. All meetings run for 30 minutes.
          </p>
        </div>

        {canCreateMeetings && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md hover:shadow-emerald-500/10 transition-all border-none py-5 px-6 rounded-xl cursor-pointer">
                <Plus className="h-5 w-5" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-card border border-border shadow-2xl rounded-2xl p-6 text-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Start a Discussion</DialogTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Launch an instant video room or schedule a session for the future (30 mins duration).
                </CardDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreate} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Room Title *</label>
                  <Input
                    required
                    placeholder="e.g., Food Security Strategy Session"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Agenda, guidelines, or discussion topics..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl min-h-[90px]"
                  />
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
                    onClick={() => setIsCreateOpen(false)}
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

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        <div className="p-6 rounded-2xl bg-card border border-border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Live Active Rooms</p>
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
            <p className="text-sm font-medium text-muted-foreground">Upcoming Sessions</p>
            <p className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">{scheduledMeetings.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
        </div>
      </div>

      {/* Main Lists Layout in List Format */}
      {loading ? (
        <div className="py-20 text-center relative z-10">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Fetching meeting rooms...</p>
        </div>
      ) : (
        <div className="space-y-10 relative z-10">
          
          {/* Section 1: Active Rooms (List Form) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Active Rooms & Discussions</h2>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Collaborative live spaces. Click to enter immediately.</p>
              </div>
              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs py-1 px-3">
                {activeMeetings.length} Available
              </Badge>
            </div>

            {activeMeetings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 border border-border border-dashed">
                <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-foreground font-semibold text-lg">No Active Rooms</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  There are no live meetings right now. Create an instant room to get started or schedule a session.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeMeetings.map((meeting) => (
                  <ActiveMeetingRow
                    key={meeting._id ?? meeting.id}
                    meeting={meeting}
                    onShare={handleShare}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Upcoming Scheduled Sessions (List Form) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">Upcoming Scheduled Sessions</h2>
                <p className="text-xs text-muted-foreground">Pre-planned virtual events. Will activate automatically when scheduled.</p>
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
                  No upcoming meetings. You can schedule discussions for later using the creation button.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {scheduledMeetings.map((meeting) => (
                  <ScheduledMeetingRow
                    key={meeting._id ?? meeting.id}
                    meeting={meeting}
                    currentTime={currentTime}
                    onShare={handleShare}
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

// ─── Active Meeting List Row Component ──────────────────────────────────────
function ActiveMeetingRow({
  meeting,
  onShare,
}: {
  meeting: Meeting;
  onShare: (meeting: Meeting) => void;
}) {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 hover:border-emerald-500/35 transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden group">
      {/* Decorative vertical colored stripe on the left */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500" />
      
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <Badge className="bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1 py-0.5 px-2.5 text-[10px] font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            LIVE NOW
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
            <span>Created by <strong className="text-foreground">{meeting.creator?.name || 'Organizer'}</strong></span>
          </div>

          {meeting.participants?.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>{meeting.participants.length} joined</span>
              </div>
            </>
          )}
        </div>

        {/* Highlighted Title */}
        <h3 className="text-xl font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">
          {meeting.title}
        </h3>

        {/* Highlighted Description */}
        {meeting.description && (
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold mt-2 leading-relaxed max-w-4xl bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-border">
            {meeting.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
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
      </div>
    </div>
  );
}

// ─── Scheduled Meeting List Row Component ───────────────────────────────────
function ScheduledMeetingRow({
  meeting,
  currentTime,
  onShare,
}: {
  meeting: Meeting;
  currentTime: number;
  onShare: (meeting: Meeting) => void;
}) {
  const date = new Date(meeting.scheduledTime);
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 hover:border-amber-500/25 transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden group">
      {/* Decorative vertical colored stripe on the left */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />
      
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <Badge className="bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-500 border border-amber-500/20 gap-1 py-0.5 px-2.5 text-[10px] font-bold uppercase">
            UPCOMING
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

        {/* Highlighted Title */}
        <h3 className="text-xl font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors tracking-tight">
          {meeting.title}
        </h3>

        {/* Highlighted Description */}
        {meeting.description && (
          <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold mt-2 leading-relaxed max-w-4xl bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-border">
            {meeting.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
          <span className="w-4 h-4 rounded-full bg-muted text-foreground flex items-center justify-center text-[9px] font-bold">
            {meeting.creator?.name?.slice(0, 2).toUpperCase() || 'OP'}
          </span>
          <span>Scheduled by <strong className="text-foreground">{meeting.creator?.name || 'Organizer'}</strong></span>
        </div>
      </div>

      {/* Action Buttons */}
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
      </div>
    </div>
  );
}
