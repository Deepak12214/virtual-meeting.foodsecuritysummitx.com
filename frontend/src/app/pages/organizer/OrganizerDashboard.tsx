import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  Video,
  Calendar,
  Store,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Radio,
  Rocket,
  Play,
  Pause,
  Edit,
  Save,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { fetchMeetings, fetchMainStageRoom, fetchPitchRoom, updateMeeting, type Meeting } from '../../services/meetingService';
import { fetchBooths, type Booth } from '../../services/boothService';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const formatForDatetimeInput = (dateString?: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Format to local YYYY-MM-DDTHH:MM
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
  return localISOTime;
};

const getStageBadge = (stage: Meeting | null) => {
  if (!stage) return { text: 'OFFLINE', className: 'text-gray-400 gap-1 px-2.5 py-0.5 text-[10px] font-medium' };
  if (stage.status === 'active') {
    return { text: 'ONLINE', className: 'bg-emerald-500 hover:bg-emerald-600 text-white gap-1 px-2.5 py-0.5 animate-pulse text-[10px] font-bold' };
  }
  if (stage.status === 'scheduled' && new Date(stage.scheduledTime) > new Date()) {
    return { text: 'SCHEDULED', className: 'bg-amber-500/20 border border-amber-500/30 text-amber-500 gap-1 px-2.5 py-0.5 text-[10px] font-bold' };
  }
  return { text: 'OFFLINE', className: 'text-gray-400 gap-1 px-2.5 py-0.5 text-[10px] font-medium' };
};

export function OrganizerDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [mainStage, setMainStage] = useState<Meeting | null>(null);
  const [pitchStage, setPitchStage] = useState<Meeting | null>(null);
  const [userStats, setUserStats] = useState<{ pending: number; approved: number; total: number }>({ pending: 0, approved: 0, total: 0 });

  // Edit states for live stages
  const [editingMain, setEditingMain] = useState(false);
  const [editingPitch, setEditingPitch] = useState(false);
  
  const [mainTitle, setMainTitle] = useState('');
  const [mainDesc, setMainDesc] = useState('');
  const [mainScheduleTime, setMainScheduleTime] = useState('');
  const [pitchTitle, setPitchTitle] = useState('');
  const [pitchDesc, setPitchDesc] = useState('');
  const [pitchScheduleTime, setPitchScheduleTime] = useState('');

  const [savingMain, setSavingMain] = useState(false);
  const [savingPitch, setSavingPitch] = useState(false);
  const [togglingMain, setTogglingMain] = useState(false);
  const [togglingPitch, setTogglingPitch] = useState(false);

  useEffect(() => {
    fetchMeetings()
      .then(setMeetings)
      .catch((err) => console.warn('Failed to load meetings in OrganizerDashboard:', err));
    
    fetchBooths()
      .then(setBooths)
      .catch((err) => console.warn('Failed to load booths in OrganizerDashboard:', err));

    fetchMainStageRoom()
      .then((data) => {
        setMainStage(data);
        setMainTitle(data.title);
        setMainDesc(data.description || '');
        setMainScheduleTime(formatForDatetimeInput(data.scheduledTime));
      })
      .catch((err) => console.warn('Failed to load main stage in Dashboard:', err));

    fetchPitchRoom()
      .then((data) => {
        setPitchStage(data);
        setPitchTitle(data.title);
        setPitchDesc(data.description || '');
        setPitchScheduleTime(formatForDatetimeInput(data.scheduledTime));
      })
      .catch((err) => console.warn('Failed to load pitch stage in Dashboard:', err));

    fetch(`${API_URL}/admin/users?limit=1`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setUserStats(data.stats);
        }
      })
      .catch((err) => console.warn('Failed to load user stats in Dashboard:', err));
  }, []);

  const handleSaveMain = async () => {
    if (!mainStage || !mainStage._id) return;
    setSavingMain(true);
    try {
      const scheduledDate = mainScheduleTime ? new Date(mainScheduleTime) : new Date();
      const now = new Date();
      // If scheduled time is in the future, set status to 'scheduled' automatically
      const newStatus = scheduledDate > now ? 'scheduled' : mainStage.status;

      const updated = await updateMeeting(mainStage._id, {
        title: mainTitle,
        description: mainDesc,
        scheduledTime: scheduledDate.toISOString(),
        status: newStatus
      });
      setMainStage(updated);
      setEditingMain(false);
      toast.success(scheduledDate > now 
        ? `Main Stage scheduled successfully for ${scheduledDate.toLocaleString()}`
        : 'Main Stage details updated'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Main Stage');
    } finally {
      setSavingMain(false);
    }
  };

  const handleSavePitch = async () => {
    if (!pitchStage || !pitchStage._id) return;
    setSavingPitch(true);
    try {
      const scheduledDate = pitchScheduleTime ? new Date(pitchScheduleTime) : new Date();
      const now = new Date();
      // If scheduled time is in the future, set status to 'scheduled' automatically
      const newStatus = scheduledDate > now ? 'scheduled' : pitchStage.status;

      const updated = await updateMeeting(pitchStage._id, {
        title: pitchTitle,
        description: pitchDesc,
        scheduledTime: scheduledDate.toISOString(),
        status: newStatus
      });
      setPitchStage(updated);
      setEditingPitch(false);
      toast.success(scheduledDate > now 
        ? `Startup Pitch Stage scheduled successfully for ${scheduledDate.toLocaleString()}`
        : 'Startup Pitch Stage details updated'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Startup Pitch stage');
    } finally {
      setSavingPitch(false);
    }
  };

  const handleToggleMainStatus = async () => {
    if (!mainStage || !mainStage._id) return;
    setTogglingMain(true);
    const newStatus = mainStage.status === 'active' ? 'completed' : 'active';
    try {
      const updated = await updateMeeting(mainStage._id, { status: newStatus });
      setMainStage(updated);
      toast.success(`Main Stage is now ${newStatus === 'active' ? 'Online' : 'Offline'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Main Stage status');
    } finally {
      setTogglingMain(false);
    }
  };

  const handleTogglePitchStatus = async () => {
    if (!pitchStage || !pitchStage._id) return;
    setTogglingPitch(true);
    const newStatus = pitchStage.status === 'active' ? 'completed' : 'active';
    try {
      const updated = await updateMeeting(pitchStage._id, { status: newStatus });
      setPitchStage(updated);
      toast.success(`Startup Pitch Stage is now ${newStatus === 'active' ? 'Online' : 'Offline'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Startup Pitch status');
    } finally {
      setTogglingPitch(false);
    }
  };

  const activeMeetingsCount = meetings.filter((m) => m.status === 'active').length;


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Event management and operational controls
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl font-bold">{userStats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-[--color-text-secondary]">
              <Users className="h-3.5 w-3.5" />
              <span>Registered accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved Users</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-500">{userStats.approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Access granted</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Booths</CardDescription>
            <CardTitle className="text-3xl font-bold">{booths.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-[--color-text-secondary]">
              <Store className="h-3.5 w-3.5" />
              <span>Created booths</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Meetings</CardDescription>
            <CardTitle className="text-3xl font-bold text-indigo-500">{activeMeetingsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-indigo-600">
              <Activity className="h-3.5 w-3.5" />
              <span>{meetings.length} total scheduled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approvals Status */}
      <Card className="">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base font-semibold">User Access Control</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div>
              <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Pending Approvals</p>
              <p className="text-3xl font-extrabold text-yellow-600 mt-1">{userStats.pending}</p>
              <p className="text-[10px] text-[--color-text-secondary] mt-1">Users awaiting account review</p>
            </div>
            <Link to="/organizer/users">
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-4 h-9 font-medium">
                Review & Approve
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved Access</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{userStats.approved}</p>
              <p className="text-[10px] text-[--color-text-secondary] mt-1">Platform access granted</p>
            </div>
            <Link to="/organizer/users">
              <Button size="sm" variant="outline" className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-500/10 text-xs px-4 h-9 font-medium">
                Manage Users
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Event Stages Status */}
      <Card className="border-[--color-border]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Event Stages Status</CardTitle>
            <CardDescription>Live status and dynamic controls for broadcast rooms</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Stage */}
            <div className={`p-5 rounded-xl border border-[--color-border] bg-[--color-surface] flex flex-col justify-between min-h-[220px] transition-colors ${
              mainStage?.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/20' : ''
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-[--color-text-secondary] font-medium">
                    <Video className="h-4 w-4 text-indigo-500" />
                    <span>Main Stage Broadcast</span>
                  </div>
                  {(() => {
                    const badge = getStageBadge(mainStage);
                    return (
                      <Badge className={badge.className}>
                        <Radio className="h-2.5 w-2.5" />
                        {badge.text}
                      </Badge>
                    );
                  })()}
                </div>

                {editingMain ? (
                  <div className="space-y-3 mt-2">
                    <Input 
                      value={mainTitle}
                      onChange={(e) => setMainTitle(e.target.value)}
                      placeholder="Main Stage Title"
                      className="text-sm font-semibold h-9"
                    />
                    <Textarea 
                      value={mainDesc}
                      onChange={(e) => setMainDesc(e.target.value)}
                      placeholder="Main Stage Description"
                      className="text-sm min-h-16 resize-y"
                    />
                    <div className="space-y-1">
                      <label className="text-[10px] text-[--color-text-secondary] font-semibold uppercase tracking-wider">Schedule Auto-Live Time</label>
                      <Input 
                        type="datetime-local"
                        value={mainScheduleTime}
                        onChange={(e) => setMainScheduleTime(e.target.value)}
                        className="text-sm h-9 bg-[--color-surface] border-[--color-border] text-[--color-text-primary]"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveMain} disabled={savingMain} className="gap-1.5 h-8 text-xs">
                        {savingMain ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Details
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingMain(false);
                        setMainTitle(mainStage?.title || '');
                        setMainDesc(mainStage?.description || '');
                        setMainScheduleTime(formatForDatetimeInput(mainStage?.scheduledTime));
                      }} className="h-8 text-xs gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="font-bold text-lg text-[--color-text-primary] line-clamp-1">{mainStage?.title || 'Main Stage Broadcast'}</h4>
                    <p className="text-xs text-[--color-text-secondary] mt-2 line-clamp-3 min-h-[48px]">{mainStage?.description || 'No description set'}</p>
                    
                    {mainStage?.status === 'scheduled' && new Date(mainStage.scheduledTime) > new Date() && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg w-full">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Goes live at {new Date(mainStage.scheduledTime).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                    {mainStage?.status === 'active' && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-full">
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                        <span>Active since {new Date(mainStage.scheduledTime).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!editingMain && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[--color-border]/50">
                  <Button variant="outline" size="sm" onClick={() => setEditingMain(true)} className="h-8 gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit & Schedule
                  </Button>
                  
                  <Button
                    variant={mainStage?.status === 'active' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleToggleMainStatus}
                    disabled={togglingMain}
                    className={`h-8 gap-1.5 text-xs min-w-[100px] ${
                      mainStage?.status !== 'active' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : ''
                    }`}
                  >
                    {togglingMain ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : mainStage?.status === 'active' ? (
                      <>
                        <Pause className="h-3 w-3" /> Stop Stage
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" /> Go Live
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Startup Pitch */}
            <div className={`p-5 rounded-xl border border-[--color-border] bg-[--color-surface] flex flex-col justify-between min-h-[220px] transition-colors ${
              pitchStage?.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/20' : ''
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-[--color-text-secondary] font-medium">
                    <Rocket className="h-4 w-4 text-indigo-500" />
                    <span>Startup Pitch Ceremony</span>
                  </div>
                  {(() => {
                    const badge = getStageBadge(pitchStage);
                    return (
                      <Badge className={badge.className}>
                        <Radio className="h-2.5 w-2.5" />
                        {badge.text}
                      </Badge>
                    );
                  })()}
                </div>

                {editingPitch ? (
                  <div className="space-y-3 mt-2">
                    <Input 
                      value={pitchTitle}
                      onChange={(e) => setPitchTitle(e.target.value)}
                      placeholder="Startup Pitch Title"
                      className="text-sm font-semibold h-9"
                    />
                    <Textarea 
                      value={pitchDesc}
                      onChange={(e) => setPitchDesc(e.target.value)}
                      placeholder="Startup Pitch Description"
                      className="text-sm min-h-16 resize-y"
                    />
                    <div className="space-y-1">
                      <label className="text-[10px] text-[--color-text-secondary] font-semibold uppercase tracking-wider">Schedule Auto-Live Time</label>
                      <Input 
                        type="datetime-local"
                        value={pitchScheduleTime}
                        onChange={(e) => setPitchScheduleTime(e.target.value)}
                        className="text-sm h-9 bg-[--color-surface] border-[--color-border] text-[--color-text-primary]"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSavePitch} disabled={savingPitch} className="gap-1.5 h-8 text-xs">
                        {savingPitch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Details
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingPitch(false);
                        setPitchTitle(pitchStage?.title || '');
                        setPitchDesc(pitchStage?.description || '');
                        setPitchScheduleTime(formatForDatetimeInput(pitchStage?.scheduledTime));
                      }} className="h-8 text-xs gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="font-bold text-lg text-[--color-text-primary] line-clamp-1">{pitchStage?.title || 'Startup Pitch Ceremony'}</h4>
                    <p className="text-xs text-[--color-text-secondary] mt-2 line-clamp-3 min-h-[48px]">{pitchStage?.description || 'No description set'}</p>
                    
                    {pitchStage?.status === 'scheduled' && new Date(pitchStage.scheduledTime) > new Date() && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg w-full">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Goes live at {new Date(pitchStage.scheduledTime).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                    {pitchStage?.status === 'active' && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-full">
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                        <span>Active since {new Date(pitchStage.scheduledTime).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!editingPitch && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[--color-border]/50">
                  <Button variant="outline" size="sm" onClick={() => setEditingPitch(true)} className="h-8 gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit & Schedule
                  </Button>
                  
                  <Button
                    variant={pitchStage?.status === 'active' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleTogglePitchStatus}
                    disabled={togglingPitch}
                    className={`h-8 gap-1.5 text-xs min-w-[100px] ${
                      pitchStage?.status !== 'active' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : ''
                    }`}
                  >
                    {togglingPitch ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : pitchStage?.status === 'active' ? (
                      <>
                        <Pause className="h-3 w-3" /> Stop Stage
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" /> Go Live
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
