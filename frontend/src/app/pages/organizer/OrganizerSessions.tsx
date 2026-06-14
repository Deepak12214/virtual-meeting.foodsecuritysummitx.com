import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Video, Rocket, Play, Pause, Edit, Save, Radio, Loader2, X } from 'lucide-react';
import { fetchMainStageRoom, fetchPitchRoom, updateMeeting, type Meeting } from '../../services/meetingService';
import { toast } from 'sonner';

export function OrganizerSessions() {
  const [mainStage, setMainStage] = useState<Meeting | null>(null);
  const [pitchStage, setPitchStage] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingMain, setEditingMain] = useState(false);
  const [editingPitch, setEditingPitch] = useState(false);
  
  const [mainTitle, setMainTitle] = useState('');
  const [mainDesc, setMainDesc] = useState('');
  const [pitchTitle, setPitchTitle] = useState('');
  const [pitchDesc, setPitchDesc] = useState('');

  const [savingMain, setSavingMain] = useState(false);
  const [savingPitch, setSavingPitch] = useState(false);
  const [togglingMain, setTogglingMain] = useState(false);
  const [togglingPitch, setTogglingPitch] = useState(false);

  const loadStages = async () => {
    try {
      const [mainData, pitchData] = await Promise.all([
        fetchMainStageRoom(),
        fetchPitchRoom()
      ]);
      
      setMainStage(mainData);
      setMainTitle(mainData.title);
      setMainDesc(mainData.description || '');
      
      setPitchStage(pitchData);
      setPitchTitle(pitchData.title);
      setPitchDesc(pitchData.description || '');
    } catch (err: any) {
      toast.error('Failed to load stage configurations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleSaveMain = async () => {
    if (!mainStage || !mainStage._id) return;
    setSavingMain(true);
    try {
      const updated = await updateMeeting(mainStage._id, {
        title: mainTitle,
        description: mainDesc
      });
      setMainStage(updated);
      setEditingMain(false);
      toast.success('Main Stage details updated');
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
      const updated = await updateMeeting(pitchStage._id, {
        title: pitchTitle,
        description: pitchDesc
      });
      setPitchStage(updated);
      setEditingPitch(false);
      toast.success('Startup Pitch details updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Startup Pitch stage');
    } finally {
      setSavingPitch(false);
    }
  };

  const handleToggleMainStatus = async () => {
    if (!mainStage || !mainStage._id) return;
    setTogglingMain(true);
    const newStatus = mainStage.status === 'active' ? 'scheduled' : 'active';
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
    const newStatus = pitchStage.status === 'active' ? 'scheduled' : 'active';
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

  const activeCount = [mainStage, pitchStage].filter(s => s?.status === 'active').length;
  const offlineCount = [mainStage, pitchStage].filter(s => s?.status !== 'active').length;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[--color-text-secondary]">Loading stage rooms…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Control live activation, titles, and descriptions of event stages.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stages</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live / Online Now</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offline</CardDescription>
            <CardTitle className="text-2xl text-rose-500">{offlineCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Stage Panel */}
      <Card className={`border-[--color-border] overflow-hidden transition-all duration-300 ${
        mainStage?.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/20' : ''
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-500 flex-shrink-0 mt-1">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge 
                    variant={mainStage?.status === 'active' ? 'default' : 'secondary'}
                    className={mainStage?.status === 'active' ? 'bg-emerald-500 text-white gap-1 px-2.5 py-0.5 animate-pulse' : 'text-gray-400 gap-1 px-2.5 py-0.5'}
                  >
                    <Radio className="h-3 w-3" />
                    {mainStage?.status === 'active' ? 'LIVE NOW' : 'STAGE OFFLINE'}
                  </Badge>
                  <span className="text-xs text-[--color-text-secondary]">Main Stage Broadcast</span>
                </div>
                
                {editingMain ? (
                  <div className="space-y-3 mt-2 max-w-2xl">
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveMain} disabled={savingMain} className="gap-1.5 h-8 text-xs">
                        {savingMain ? <Loader2 className="h-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Details
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingMain(false);
                        setMainTitle(mainStage?.title || '');
                        setMainDesc(mainStage?.description || '');
                      }} className="h-8 text-xs gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold tracking-tight">{mainStage?.title}</h3>
                    <p className="text-sm text-[--color-text-secondary] mt-1 line-clamp-2">{mainStage?.description}</p>
                  </>
                )}
              </div>
            </div>

            {!editingMain && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingMain(true)} className="h-9 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" /> Edit Details
                </Button>
                
                <Button
                  variant={mainStage?.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={handleToggleMainStatus}
                  disabled={togglingMain}
                  className={`h-9 gap-1.5 text-xs min-w-[100px] ${
                    mainStage?.status !== 'active' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : ''
                  }`}
                >
                  {togglingMain ? (
                    <Loader2 className="h-3 animate-spin" />
                  ) : mainStage?.status === 'active' ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Stop Stage
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> Go Live
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Startup Pitch Stage Panel */}
      <Card className={`border-[--color-border] overflow-hidden transition-all duration-300 ${
        pitchStage?.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/20' : ''
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-500 flex-shrink-0 mt-1">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge 
                    variant={pitchStage?.status === 'active' ? 'default' : 'secondary'}
                    className={pitchStage?.status === 'active' ? 'bg-emerald-500 text-white gap-1 px-2.5 py-0.5 animate-pulse' : 'text-gray-400 gap-1 px-2.5 py-0.5'}
                  >
                    <Radio className="h-3 w-3" />
                    {pitchStage?.status === 'active' ? 'LIVE NOW' : 'STAGE OFFLINE'}
                  </Badge>
                  <span className="text-xs text-[--color-text-secondary]">Startup Pitch Ceremony</span>
                </div>
                
                {editingPitch ? (
                  <div className="space-y-3 mt-2 max-w-2xl">
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePitch} disabled={savingPitch} className="gap-1.5 h-8 text-xs">
                        {savingPitch ? <Loader2 className="h-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save Details
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingPitch(false);
                        setPitchTitle(pitchStage?.title || '');
                        setPitchDesc(pitchStage?.description || '');
                      }} className="h-8 text-xs gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold tracking-tight">{pitchStage?.title}</h3>
                    <p className="text-sm text-[--color-text-secondary] mt-1 line-clamp-2">{pitchStage?.description}</p>
                  </>
                )}
              </div>
            </div>

            {!editingPitch && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingPitch(true)} className="h-9 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" /> Edit Details
                </Button>
                
                <Button
                  variant={pitchStage?.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={handleTogglePitchStatus}
                  disabled={togglingPitch}
                  className={`h-9 gap-1.5 text-xs min-w-[100px] ${
                    pitchStage?.status !== 'active' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : ''
                  }`}
                >
                  {togglingPitch ? (
                    <Loader2 className="h-3 animate-spin" />
                  ) : pitchStage?.status === 'active' ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Stop Stage
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> Go Live
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
