import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  selectIsLocalScreenShared,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  useVideo,
  HMSPeer,
} from '@100mslive/react-sdk';
import {
  Rocket,
  Share2,
  AlertCircle,
  SkipForward,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Radio,
} from 'lucide-react';
import { MOCK_STARTUPS } from '../data/mockData';
import { ControlAuthorityIndicator } from '../components/ControlAuthorityIndicator';
import { OperationalComms } from '../components/OperationalComms';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { EmergencyControls } from '../components/EmergencyControls';
import { toast } from 'sonner';
import { fetchPitchRoom, fetchJoinToken, type Meeting } from '../services/meetingService';

// ─── Peer Video Tiles ─────────────────────────────────────────────────────────

function PeerPitchVideo({ peer }: { peer: HMSPeer }) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
}

function ScreenSharePitchView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ─── StartupPitchEnhanced Page ────────────────────────────────────────────────

export function StartupPitchEnhanced() {
  const { user, hasAccess } = useAuth();
  const [startups, setStartups] = useState(MOCK_STARTUPS);

  // 100ms hooks
  const hmsActions       = useHMSActions();
  const isConnected      = useHMSStore(selectIsConnectedToRoom);
  const peers            = useHMSStore(selectPeers);
  const localPeer        = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);

  // Pitch room
  const [pitchMeeting, setPitchMeeting] = useState<Meeting | null>(null);

  // Role checks
  const canAccess   = hasAccess(['startup', 'investor', 'moderator', 'host', 'organizer', 'admin']);
  const isAdmin     = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost      = user?.role === 'host' || isOrganizer;
  const isStartup   = user?.role === 'startup';
  const isInvestor  = user?.role === 'investor';

  // ✅ Use store selectors — HMSPeer does NOT have isAudioEnabled/isVideoEnabled directly
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // ── 1. Load Pitch room ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!canAccess) return;

    fetchPitchRoom()
      .then(setPitchMeeting)
      .catch((err) => console.error('Failed to load Pitch room:', err));
  }, [canAccess]);

  // ── 2. Join HMS room ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pitchMeeting || !user) return;
    const roomId = pitchMeeting._id ?? pitchMeeting.id;
    if (!roomId) return;

    let left = false;

    fetchJoinToken(roomId)
      .then(({ token }) => {
        if (left) return;
        return hmsActions.join({
          userName: user.name,
          authToken: token,
          settings: { isAudioMuted: true, isVideoMuted: true },
        });
      })
      .catch((err) => console.error('HMS pitch join error:', err));

    return () => { left = true; hmsActions.leave().catch(() => {}); };
  }, [pitchMeeting, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Access guard ─────────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Startup Pitch Ceremony</h1>
          <p className="text-[--color-text-secondary] mt-2">Watch innovative startups pitch to investors</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription className="mt-2">
                  Available to startups, investors, and event moderators only.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Startup queue helpers ────────────────────────────────────────────────────
  const currentStartup   = startups.find((s) => s.status === 'pitching');
  const waitingStartups  = startups.filter((s) => s.status === 'waiting');
  const completedStartups = startups.filter((s) => s.status === 'completed');

  const handleNextStartup = () => {
    if (!currentStartup) return;
    setStartups((prev) =>
      prev.map((s) => {
        if (s.id === currentStartup.id) return { ...s, status: 'completed' as const };
        if (s.status === 'waiting' && s.id === waitingStartups[0]?.id) return { ...s, status: 'pitching' as const };
        return s;
      })
    );
  };

  // ── Media handlers ────────────────────────────────────────────────────────────
  const toggleAudio  = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo  = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try { await hmsActions.setScreenShareEnabled(!amIScreenSharing); }
    catch { toast.error('Failed to share screen'); }
  };

  const screenSharePeer = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);
  const presentingPeer  = peers.find((p) => p.videoTrack);

  // Queue format for QueueManagement component
  const startupQueue = startups.map((s) => ({
    id: s.id,
    name: s.name,
    title: s.tagline,
    status: s.status === 'pitching' ? 'live' as const : 'ready' as const,
    duration: 5,
  }));

  const authorities = [
    ...(isAdmin || isOrganizer ? [{ role: user?.role ?? 'admin', name: user?.name ?? 'Admin', mode: 'full' as const }] : []),
    ...(isHost && !isOrganizer  ? [{ role: 'host', name: user?.name ?? 'Host', mode: 'presentation' as const }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Startup Pitch Ceremony</h1>
            {currentStartup && (
              <Badge className="bg-red-500 gap-1 px-3 py-1">
                <Radio className="h-3 w-3 animate-pulse" /> PITCH LIVE
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-2">
            {isHost ? 'Host control interface for startup pitch management'
              : isStartup ? 'Present your startup to potential investors'
              : isInvestor ? 'Discover and connect with innovative startups'
              : ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Startups',  value: startups.length },
          { label: 'Pitching Now',    value: currentStartup ? 1 : 0 },
          { label: 'In Queue',        value: waitingStartups.length },
          { label: 'Completed',       value: completedStartups.length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main pitch area */}
        <div className="lg:col-span-3 space-y-4">
          {currentStartup ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Video area */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                  {!isConnected ? (
                    <div className="flex flex-col items-center justify-center text-white space-y-4">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-400">Connecting to Pitch Ceremony room…</p>
                    </div>
                  ) : screenSharePeer ? (
                    <ScreenSharePitchView peer={screenSharePeer} />
                  ) : presentingPeer ? (
                    <PeerPitchVideo peer={presentingPeer} />
                  ) : (
                    /* Fallback: show startup logo */
                    <>
                      <img src={currentStartup.logo} alt={currentStartup.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </>
                  )}

                  {/* Live badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="gap-1 bg-red-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      PITCHING LIVE
                    </Badge>
                  </div>

                  {/* Startup overlay */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <img src={currentStartup.logo} alt={currentStartup.name} className="w-10 h-10 rounded-lg object-contain bg-white/20" />
                    <div className="text-white">
                      <p className="font-semibold">{currentStartup.name}</p>
                      <p className="text-xs opacity-80">{currentStartup.tagline}</p>
                    </div>
                  </div>
                </div>

                {/* Startup details */}
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{currentStartup.name}</h2>
                    <p className="text-lg text-[--color-text-secondary] mb-4">{currentStartup.tagline}</p>
                    <p className="text-[--color-text-secondary]">{currentStartup.description}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[--color-border]">
                    {[
                      { label: 'Founder',  value: currentStartup.founder, sub: currentStartup.founderTitle },
                      { label: 'Industry', value: currentStartup.industry },
                      { label: 'Stage',    value: currentStartup.stage },
                      { label: 'Seeking',  value: currentStartup.seeking, green: true },
                    ].map(({ label, value, sub, green }) => (
                      <div key={label}>
                        <p className="text-xs text-[--color-text-secondary]">{label}</p>
                        <p className={`font-medium ${green ? 'text-green-600' : ''}`}>{value}</p>
                        {sub && <p className="text-xs text-[--color-text-secondary]">{sub}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-24 text-center">
                <Rocket className="h-16 w-16 mx-auto text-[--color-text-secondary] mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Pitch</h3>
                <p className="text-[--color-text-secondary]">
                  {waitingStartups.length > 0 ? 'Ready to start the next pitch' : 'All pitches completed'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Presenter / host broadcast controls */}
          {isConnected && (isStartup || isHost) && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Presenter Controls</Badge>
                  <CardTitle className="text-sm">Audio / Video / Share</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant={isAudioEnabled ? 'default' : 'destructive'} size="sm" onClick={toggleAudio} className="gap-2">
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button variant={isVideoEnabled ? 'default' : 'secondary'} size="sm" onClick={toggleVideo} className="gap-2">
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isVideoEnabled ? 'Stop Cam' : 'Start Cam'}
                  </Button>
                  <Button variant={amIScreenSharing ? 'secondary' : 'outline'} size="sm" onClick={toggleScreen} className="gap-2">
                    <Share2 className="h-4 w-4" /> Share Screen
                  </Button>
                  {isHost && (
                    <Button variant="default" size="sm" onClick={handleNextStartup} disabled={!currentStartup}>
                      <SkipForward className="h-4 w-4 mr-1" /> Next Pitch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {authorities.length > 0 && <ControlAuthorityIndicator authorities={authorities} />}
          {(isHost || isOrganizer) && currentStartup && <AdvancedTimer initialSeconds={300} type="pitch" canControl={isOrganizer} />}
          {(isHost || isOrganizer) && <OperationalComms />}
          {isAdmin && <EmergencyControls />}
          <QueueManagement
            items={startupQueue.filter((s) => s.status !== 'live')}
            type="startup"
            canManage={isHost}
            onMakeLive={(id) => setStartups((prev) => prev.map((s) => s.id === id ? { ...s, status: 'pitching' as const } : s))}
          />
        </div>
      </div>
    </div>
  );
}
