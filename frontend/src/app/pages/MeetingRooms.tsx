import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router';
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
import { Calendar, Clock, Users, Video, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { MOCK_MEETINGS } from '../data/mockData';
import { toast } from 'sonner';
import {
  fetchMeetings,
  createMeeting,
  type Meeting,
  type CreateMeetingPayload,
} from '../services/meetingService';

// ─── MeetingRooms Page ────────────────────────────────────────────────────────

export function MeetingRooms() {
  const { user, hasAccess } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  const canAccessMeetings = hasAccess([
    'attendee', 'startup', 'investor', 'exhibitor', 'sponsor',
    'speaker', 'moderator', 'organizer', 'admin', 'host',
  ]);
  const canCreateMeetings =
    user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'host';

  // ── Load meetings ────────────────────────────────────────────────────────────
  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await fetchMeetings();
      setMeetings(data);
    } catch {
      setMeetings(MOCK_MEETINGS as unknown as Meeting[]);
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
      scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
      duration,
    };

    try {
      await createMeeting(payload);
      toast.success('Meeting scheduled successfully!');
      setIsCreateOpen(false);
      setTitle(''); setDescription(''); setScheduledTime(''); setDuration(30);
      loadMeetings();
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

  const activeMeetings    = meetings.filter((m) => m.status === 'active');
  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled');
  const completedMeetings = meetings.filter((m) => m.status === 'completed');

  const getStatusBadge = (status: Meeting['status']) => {
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
      case 'completed': return <Badge variant="secondary">Completed</Badge>;
    }
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
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule a Meeting</DialogTitle>
                <CardDescription>Creates a new 100ms.live room and meeting slot.</CardDescription>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date & Time</label>
                    <Input type="datetime-local" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (mins)</label>
                    <Input type="number" required min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'Scheduling…' : 'Create Room'}</Button>
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
        <Card><CardHeader><CardDescription>Completed</CardDescription><CardTitle className="text-2xl">{completedMeetings.length}</CardTitle></CardHeader></Card>
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
            <TabsTrigger value="completed">Completed ({completedMeetings.length})</TabsTrigger>
          </TabsList>

          {(['active', 'scheduled', 'completed'] as const).map((tab) => {
            const list = tab === 'active' ? activeMeetings : tab === 'scheduled' ? scheduledMeetings : completedMeetings;
            const EmptyIcon = tab === 'active' ? Video : tab === 'scheduled' ? Calendar : CheckCircle;
            const emptyMsg = tab === 'active' ? 'No active meetings at the moment' : tab === 'scheduled' ? 'No scheduled meetings' : 'No completed meetings yet';

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
                    <MeetingCard key={meeting._id ?? meeting.id} meeting={meeting} getStatusBadge={getStatusBadge} />
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
}: {
  meeting: Meeting;
  getStatusBadge: (status: Meeting['status']) => ReactNode;
}) {
  const date = new Date(meeting.scheduledTime);
  const minutesUntil = Math.floor((date.getTime() - Date.now()) / 60000);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              meeting.status === 'active'    ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
              meeting.status === 'scheduled' ? 'bg-gradient-to-br from-blue-500 to-cyan-500'    :
                                               'bg-gradient-to-br from-gray-500 to-gray-600'
            }`}>
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                {getStatusBadge(meeting.status)}
              </div>
              {meeting.description && (
                <p className="text-sm text-[--color-text-secondary] mb-1">{meeting.description}</p>
              )}
              <div className="flex flex-col gap-1 text-sm text-[--color-text-secondary]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' • '}{meeting.duration} min
                  {meeting.status === 'scheduled' && minutesUntil > 0 && (
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

          <div>
            {meeting.status !== 'completed' ? (
              <Link to={`/meetings/${meeting._id ?? meeting.id}`}>
                <Button className="gap-2">
                  <Video className="h-4 w-4" />
                  {meeting.status === 'active' ? 'Join Now' : 'View Details'}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>Ended</Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
