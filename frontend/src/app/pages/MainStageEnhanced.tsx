import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
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
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  MessageSquare,
  Users,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { MOCK_SESSIONS, MOCK_QUESTIONS, Question } from '../data/mockData';
import { ControlAuthorityIndicator } from '../components/ControlAuthorityIndicator';
import { OperationalComms } from '../components/OperationalComms';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { EmergencyControls } from '../components/EmergencyControls';
import { toast } from 'sonner';
import { fetchMainStageRoom, fetchJoinToken, type Meeting } from '../services/meetingService';

// ─── Peer Video ───────────────────────────────────────────────────────────────

function PeerStageVideo({ peer }: { peer: HMSPeer }) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return <video ref={videoRef} autoPlay playsInline muted={peer.isLocal} className="w-full h-full object-cover" />;
}

function ScreenShareView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ─── MainStageEnhanced Page ───────────────────────────────────────────────────

export function MainStageEnhanced() {
  const { user, hasAccess } = useAuth();

  // Q&A state
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [activeTab, setActiveTab] = useState('live');

  // 100ms hooks
  const hmsActions = useHMSActions();
  const isConnected    = useHMSStore(selectIsConnectedToRoom);
  const peers          = useHMSStore(selectPeers);
  const localPeer      = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);

  // Stage room
  const [stageMeeting, setStageMeeting] = useState<Meeting | null>(null);

  // Mock session metadata
  const liveSession      = MOCK_SESSIONS.find((s) => s.isLive);
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === 'upcoming');

  // Role checks
  const isAdmin     = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost      = user?.role === 'host' || isOrganizer;
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isSpeaker   = user?.role === 'speaker' || isHost;
  const canAskQ     = hasAccess(['attendee', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'host', 'organizer', 'admin']);

  // ✅ HMSPeer has NO isAudioEnabled/isVideoEnabled — use store selectors
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // Speaker queue (mock)
  const speakerQueue = [
    { id: 's1', name: 'Dr. James Mitchell', title: 'Chief Innovation Officer', status: 'ready' as const, duration: 45 },
    { id: 's2', name: 'Rachel Kumar',        title: 'Head of AI Research',      status: 'not-ready' as const, duration: 30 },
    { id: 's3', name: 'Marcus Chen',         title: 'Serial Entrepreneur',      status: 'standby' as const, duration: 60 },
  ];

  // Control authority list
  const authorities = [
    ...(isAdmin || isOrganizer ? [{ role: user?.role ?? 'admin', name: user?.name ?? 'Admin', mode: 'full' as const }] : []),
    ...(isHost && !isOrganizer  ? [{ role: 'host',      name: user?.name ?? 'Host',      mode: 'presentation' as const }] : []),
    ...(isModerator && !isOrganizer && !isHost ? [{ role: 'moderator', name: user?.name ?? 'Moderator', mode: 'limited' as const }] : []),
  ];

  // ── 1. Load Main Stage room ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMainStageRoom()
      .then(setStageMeeting)
      .catch((err) => console.error('Failed to load Main Stage room:', err));
  }, []);

  // ── 2. Join HMS room ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stageMeeting || !user) return;
    const roomId = stageMeeting._id ?? stageMeeting.id;
    if (!roomId) return;

    let left = false;

    fetchJoinToken(roomId)
      .then(({ token }) => {
        if (left) return;
        return hmsActions.join({
          userName: user.name,
          authToken: token,
          settings: { isAudioMuted: isHost || isSpeaker, isVideoMuted: isHost || isSpeaker },
        });
      })
      .catch((err) => console.error('HMS stage join error:', err));

    return () => { left = true; hmsActions.leave().catch(() => {}); };
  }, [stageMeeting, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Q&A handlers ─────────────────────────────────────────────────────────────
  const submitQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions((prev) => [
      ...prev,
      { id: `q${prev.length + 1}`, text: newQuestion, askedBy: user?.name ?? 'Anonymous', timestamp: new Date(), status: 'pending' },
    ]);
    setNewQuestion('');
  };
  const moderateQ = (id: string, status: 'approved' | 'rejected') =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));

  const pendingQs  = questions.filter((q) => q.status === 'pending');
  const approvedQs = questions.filter((q) => q.status === 'approved');

  // ── Media handlers ────────────────────────────────────────────────────────────
  const toggleAudio  = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo  = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try { await hmsActions.setScreenShareEnabled(!amIScreenSharing); }
    catch { toast.error('Failed to share screen'); }
  };

  const screenSharePeer  = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);
  const presentingPeer   = peers.find((p) => p.videoTrack && ['host', 'speaker', 'moderator'].includes(p.roleName ?? ''));
  const broadcastingNow  = peers.some((p) => p.videoTrack || p.audioTrack);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Main Stage</h1>
            {isConnected && broadcastingNow && (
              <Badge className="bg-red-500 gap-1 px-3 py-1">
                <Radio className="h-3 w-3 animate-pulse" /> BROADCASTING
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-2">
            {isHost ? 'Host control interface for session management'
              : isModerator ? 'Moderator interface for Q&A and audience management'
              : 'Watch live sessions, keynotes, and panel discussions'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Video player card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                {!isConnected ? (
                  <div className="flex flex-col items-center justify-center text-white space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Connecting to stage stream…</p>
                  </div>
                ) : screenSharePeer ? (
                  <ScreenShareView peer={screenSharePeer} />
                ) : presentingPeer ? (
                  <PeerStageVideo peer={presentingPeer} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white p-6">
                    <Radio className="w-16 h-16 text-indigo-500 mb-3 animate-pulse" />
                    <h3 className="text-lg font-bold">Main Stage Broadcast is Offline</h3>
                    <p className="text-sm text-gray-400 text-center mt-1 max-w-sm">
                      Please wait for the speakers or hosts to go live.
                    </p>
                  </div>
                )}

                {isConnected && broadcastingNow && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    LIVE
                  </div>
                )}
                {isConnected && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs">
                    <Users className="h-4 w-4" />
                    {peers.length} on stage
                  </div>
                )}
              </div>

              {liveSession && (
                <div className="p-4">
                  <h2 className="text-xl font-bold">{liveSession.title}</h2>
                  <p className="text-[--color-text-secondary] mt-1 text-sm">{liveSession.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                      {liveSession.speaker.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{liveSession.speaker}</p>
                      <p className="text-xs text-[--color-text-secondary]">{liveSession.speakerTitle}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Broadcaster controls (host / speaker) */}
          {isConnected && (isSpeaker || isHost) && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Broadcaster Controls</Badge>
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
                  {isOrganizer && (
                    <Button variant="destructive" size="sm" onClick={() => hmsActions.endRoom(false, 'Stage ended by organizer')}>
                      End Stage
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
          {(isHost || isOrganizer) && <AdvancedTimer initialSeconds={3600} type="session" canControl={isOrganizer} />}
          {(isHost || isModerator || isOrganizer) && <OperationalComms />}
          {isAdmin && <EmergencyControls />}
          {isHost && <QueueManagement items={speakerQueue} type="speaker" canManage={isOrganizer} />}

          {/* Q&A panel */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="live">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A
                {pendingQs.length > 0 && isModerator && (
                  <Badge variant="destructive" className="ml-2 h-4 text-[10px]">{pendingQs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="live">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs">Live Q&A</CardTitle>
                  <CardDescription className="text-xs">
                    {canAskQ ? 'Submit questions to speakers' : 'Q&A available to approved attendees'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canAskQ && (
                    <div className="flex gap-2">
                      <Input placeholder="Your question…" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitQuestion()} className="text-xs h-8" />
                      <Button size="sm" onClick={submitQuestion} className="h-8"><Send className="h-3 w-3" /></Button>
                    </div>
                  )}
                  {isModerator && pendingQs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        Pending ({pendingQs.length})
                      </h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {pendingQs.map((q) => (
                            <div key={q.id} className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <p className="text-xs">{q.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-5 px-2" onClick={() => moderateQ(q.id, 'approved')}><CheckCircle className="h-3 w-3 text-green-500" /></Button>
                                  <Button size="sm" variant="ghost" className="h-5 px-2" onClick={() => moderateQ(q.id, 'rejected')}><XCircle className="h-3 w-3 text-red-500" /></Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium mb-2">Approved ({approvedQs.length})</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {approvedQs.length === 0 ? (
                          <p className="text-xs text-[--color-text-secondary] text-center py-4">No questions yet</p>
                        ) : (
                          approvedQs.map((q) => (
                            <div key={q.id} className="p-2 bg-[--color-surface] rounded-lg border border-[--color-border]">
                              <p className="text-xs">{q.text}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                                <span className="text-[10px] text-[--color-text-secondary]">{q.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
