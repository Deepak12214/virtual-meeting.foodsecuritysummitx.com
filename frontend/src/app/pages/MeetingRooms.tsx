import { useState, useEffect, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { Calendar, Clock, Users, Video, CheckCircle, AlertCircle, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMeetings,
  createMeeting,
  type Meeting,
  type CreateMeetingPayload,
} from '../services/meetingService';

// ─── MeetingRooms Page ────────────────────────────────────────────────────────

export function MeetingRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const canAccessMeetings = !!user;
  const canCreateMeetings = !!user;

  // ── Load meetings ────────────────────────────────────────────────────────────
  const loadMeetings = async () => {
    setLoading(true);
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
    if (canAccessMeetings) loadMeetings();
  }, [canAccessMeetings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create meeting ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    setCreating(true);
    const payload: CreateMeetingPayload = {
      title,
      description,
      scheduledTime: new Date(),
      duration: 30, // Locked to 30 minutes
    };

    try {
      const newMeeting = await createMeeting(payload);
      toast.success('Meeting created successfully!');
      setIsCreateOpen(false);
      setTitle(''); 
      setDescription('');
      loadMeetings();
      // Directly join the newly created meeting room
      navigate(`/meetings/${newMeeting._id ?? newMeeting.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  // ── Access guard ─────────────────────────────────────────────────────────────
  if (!canAccessMeetings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meeting Rooms</h1>
          <p className="text-[--color-text-secondary] mt-2">1-on-1 video meetings and networking sessions</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription className="mt-2">
                  Meeting rooms are only available to approved attendees with paid access.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Check if a meeting is expired
  const isExpired = (m: Meeting) => {
    const startTime = new Date(m.scheduledTime).getTime();
    const durationMs = (m.duration || 30) * 60 * 1000;
    return Date.now() > (startTime + durationMs) || m.status === 'completed';
  };

  // Personal module filter: exclude 'Main Stage Broadcast' and 'Startup Pitch Ceremony'
  const filteredMeetings = meetings.filter(
    (m) => m.title !== 'Main Stage Broadcast' && m.title !== 'Startup Pitch Ceremony'
  );

  const activeMeetings    = filteredMeetings.filter((m) => !isExpired(m) && new Date(m.scheduledTime).getTime() <= Date.now());
  const scheduledMeetings = filteredMeetings.filter((m) => !isExpired(m) && new Date(m.scheduledTime).getTime() > Date.now());
  const completedMeetings = filteredMeetings.filter((m) => isExpired(m));

  const getStatusBadge = (status: Meeting['status'], expired: boolean) => {
    if (expired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    switch (status) {
      case 'active':
        return (
          <Badge className="gap-1 bg-green-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Active
          </Badge>
        );
      case 'scheduled': return <Badge variant="outline">Scheduled</Badge>;
      case 'completed': return <Badge variant="secondary">Expired</Badge>;
    }
  };

  const handleShare = (meeting: Meeting) => {
    const link = `${window.location.origin}/meetings/${meeting._id ?? meeting.id}`;
    navigator.clipboard.writeText(link);
    toast.success('📋 Meeting link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meeting Rooms</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Join your scheduled 1-on-1 meetings and networking sessions
          </p>
        </div>

        {canCreateMeetings && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create a Meeting</DialogTitle>
                <CardDescription>Creates an instant 30-minute meeting room.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input required placeholder="e.g., Food Security Strategy Call" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Meeting goals and agenda…" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Room'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardDescription>Active Now</CardDescription><CardTitle className="text-2xl">{activeMeetings.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Scheduled</CardDescription><CardTitle className="text-2xl">{scheduledMeetings.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Completed / Expired</CardDescription><CardTitle className="text-2xl">{completedMeetings.length}</CardTitle></CardHeader></Card>
      </div>

      {/* Tabs */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[--color-text-secondary]">Loading meetings…</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active ({activeMeetings.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduledMeetings.length})</TabsTrigger>
            <TabsTrigger value="completed">Expired ({completedMeetings.length})</TabsTrigger>
          </TabsList>

          {(['active', 'scheduled', 'completed'] as const).map((tab) => {
            const list = tab === 'active' ? activeMeetings : tab === 'scheduled' ? scheduledMeetings : completedMeetings;
            const EmptyIcon = tab === 'active' ? Video : tab === 'scheduled' ? Calendar : CheckCircle;
            const emptyMsg = tab === 'active' ? 'No active meetings at the moment' : tab === 'scheduled' ? 'No scheduled meetings' : 'No expired meetings yet';

            return (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
                {list.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <EmptyIcon className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
                      <p className="text-[--color-text-secondary]">{emptyMsg}</p>
                    </CardContent>
                  </Card>
                ) : (
                  list.map((meeting) => (
                    <MeetingCard key={meeting._id ?? meeting.id} meeting={meeting} getStatusBadge={getStatusBadge} onShare={handleShare} />
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  getStatusBadge,
  onShare,
}: {
  meeting: Meeting;
  getStatusBadge: (status: Meeting['status'], expired: boolean) => ReactNode;
  onShare: (meeting: Meeting) => void;
}) {
  const date = new Date(meeting.scheduledTime);
  const minutesUntil = Math.floor((date.getTime() - Date.now()) / 60000);
  
  const startTime = date.getTime();
  const durationMs = (meeting.duration || 30) * 60 * 1000;
  const expired = Date.now() > (startTime + durationMs) || meeting.status === 'completed';

  return (
    <Card className={expired ? "opacity-60 bg-slate-900/10 border-slate-900/40" : ""}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              expired ? 'bg-gray-800 text-gray-500' :
              meeting.status === 'active' || date.getTime() <= Date.now() ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
              'bg-gradient-to-br from-blue-500 to-cyan-500'
            }`}>
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className={`text-lg ${expired ? 'line-through text-gray-500' : ''}`}>{meeting.title}</CardTitle>
                {getStatusBadge(meeting.status, expired)}
              </div>
              {meeting.description && (
                <p className="text-sm text-[--color-text-secondary] mb-1">{meeting.description}</p>
              )}
              <div className="flex flex-col gap-1 text-sm text-[--color-text-secondary]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' • '}{meeting.duration} min
                  {!expired && meeting.status === 'scheduled' && minutesUntil > 0 && (
                    <span className="text-xs text-indigo-500 font-medium">(starts in {minutesUntil} min)</span>
                  )}
                </div>
                {meeting.participants?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {meeting.participants.map((p) => p.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!expired && (
              <Button
                variant="outline"
                onClick={() => onShare(meeting)}
                className="gap-1.5 h-9"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            {!expired ? (
              <Link to={`/meetings/${meeting._id ?? meeting.id}`}>
                <Button className="gap-2 h-9">
                  <Video className="h-4 w-4" />
                  Join Now
                </Button>
              </Link>
            ) : (
              <Button variant="outline" disabled className="h-9">Ended</Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
