import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  selectIsPeerAudioEnabled,
  useVideo,
  HMSPeer,
} from '@100mslive/react-sdk';
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Share2,
  PhoneOff,
  Clock,
  Users,
} from 'lucide-react';
import { MOCK_MEETINGS } from '../data/mockData';
import {
  fetchMeetingById,
  fetchJoinToken,
  registerJoin,
  endMeeting,
  type Meeting,
} from '../services/meetingService';

// ─── Peer Video Tile ──────────────────────────────────────────────────────────

function PeerVideo({ peer }: { peer: HMSPeer }) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={peer.isLocal}
      className="w-full h-full object-cover"
    />
  );
}

/**
 * PeerMuteIcon — renders a red mic-off badge if the peer is muted.
 * Uses selectIsPeerAudioEnabled(peerId) because HMSPeer has NO isAudioEnabled property.
 */
function PeerMuteIcon({ peerId }: { peerId: string }) {
  const isAudioOn = useHMSStore(selectIsPeerAudioEnabled(peerId));
  if (isAudioOn) return null;
  return (
    <div className="absolute top-4 right-4">
      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
        <MicOff className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

// ─── MeetingRoom Page ─────────────────────────────────────────────────────────

export function MeetingRoom() {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 100ms hooks
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(1800);

  // ✅ Use store selectors — HMSPeer does NOT have isAudioEnabled/isVideoEnabled directly
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // ── 1. Load meeting details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;

    fetchMeetingById(meetingId)
      .then(setMeeting)
      .catch(() => {
        // Fallback to mock data
        const mock = MOCK_MEETINGS.find((m) => m.id === meetingId);
        if (mock) setMeeting(mock as unknown as Meeting);
      })
      .finally(() => setLoading(false));
  }, [meetingId]);

  // ── 2. Join 100ms room once meeting data is ready ────────────────────────────
  useEffect(() => {
    if (!meeting || !user) return;

    const roomId = meeting._id ?? meeting.id;
    if (!roomId) return;

    let left = false;

    fetchJoinToken(roomId)
      .then(({ token }) => {
        if (left) return;
        return hmsActions.join({
          userName: user.name,
          authToken: token,
          settings: { isAudioMuted: false, isVideoMuted: false },
        });
      })
      .then(() => registerJoin(roomId!))
      .catch((err) => console.error('HMS join error:', err));

    return () => {
      left = true;
      hmsActions.leave().catch(() => {});
    };
  }, [meeting, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Session countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!meeting) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [meeting]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleLeave = async () => {
    await hmsActions.leave().catch(() => {});
    navigate('/meetings');
  };

  const handleEndForAll = async () => {
    const roomId = meeting?._id ?? meeting?.id;
    try {
      await hmsActions.endRoom(false, 'Meeting ended by organizer');
      if (roomId) await endMeeting(roomId);
    } catch (err) {
      console.error('End meeting error:', err);
    }
    navigate('/meetings');
  };

  const toggleAudio = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try {
      await hmsActions.setScreenShareEnabled(!amIScreenSharing);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[--color-text-secondary]">Loading meeting...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-[--color-text-secondary]">Meeting not found</p>
        <Link to="/meetings">
          <Button className="mt-4">Back to Meetings</Button>
        </Link>
      </div>
    );
  }

  const isOrganizer =
    user?.role === 'organizer' ||
    user?.role === 'admin' ||
    (meeting.creator as any)?.id === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          {meeting.description && (
            <p className="text-[--color-text-secondary] mt-1 text-sm">{meeting.description}</p>
          )}
        </div>
        <Button onClick={handleLeave} variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Video Grid */}
      {!isConnected ? (
        <Card className="border-indigo-600/20 bg-indigo-950/10">
          <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[--color-text-secondary] text-sm">Connecting to secure video stream…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {peers.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Users className="w-12 h-12 mb-3 text-gray-400" />
                <p>Waiting for participants to join…</p>
              </CardContent>
            </Card>
          ) : (
            peers.map((peer) => (
              <Card key={peer.id} className="overflow-hidden border-[--color-border]">
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                    {peer.videoTrack ? (
                      <PeerVideo peer={peer} />
                    ) : (
                      <div className="flex flex-col items-center text-white">
                        <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-2xl">
                          {peer.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <p className="mt-2 text-xs text-gray-400">Camera Off</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-black/50 backdrop-blur-sm text-white text-xs flex items-center gap-1.5">
                        {peer.name} {peer.isLocal ? '(You)' : ''}
                        {peer.roleName && (
                          <span className="opacity-75 uppercase text-[9px] bg-white/20 px-1 rounded">
                            {peer.roleName}
                          </span>
                        )}
                      </Badge>
                    </div>
                    <PeerMuteIcon peerId={peer.id} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Controls Bar */}
      {isConnected && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Timer & stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[--color-text-secondary]" />
                  <span className="text-lg font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
                <div className="h-6 w-px bg-[--color-border]" />
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[--color-text-secondary]" />
                  <span>{peers.length} peer(s)</span>
                </div>
              </div>

              {/* Media buttons */}
              <div className="flex items-center gap-2">
                <Button variant={isAudioEnabled ? 'default' : 'destructive'} size="lg" onClick={toggleAudio} className="gap-2">
                  {isAudioEnabled ? <><Mic className="h-5 w-5" />Mute</> : <><MicOff className="h-5 w-5" />Unmute</>}
                </Button>
                <Button variant={isVideoEnabled ? 'default' : 'secondary'} size="lg" onClick={toggleVideo} className="gap-2">
                  {isVideoEnabled ? <><Video className="h-5 w-5" />Camera On</> : <><VideoOff className="h-5 w-5" />Camera Off</>}
                </Button>
                <Button variant={amIScreenSharing ? 'secondary' : 'outline'} size="lg" onClick={toggleScreen} className="gap-2">
                  <Share2 className="h-5 w-5" />
                  {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
                </Button>
                <div className="h-10 w-px bg-[--color-border]" />
                <Button variant="destructive" size="lg" onClick={handleLeave} className="gap-2">
                  <PhoneOff className="h-5 w-5" />Leave
                </Button>
              </div>
            </div>

            {/* Organizer section */}
            {isOrganizer && (
              <div className="mt-6 pt-6 border-t border-[--color-border]">
                <h3 className="text-sm font-medium mb-3">Organizer Controls</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTimeRemaining((p) => p + 600)}>+10 min</Button>
                  <Button variant="outline" size="sm" onClick={() => setTimeRemaining((p) => p + 300)}>+5 min</Button>
                  <Button variant="destructive" size="sm" onClick={handleEndForAll}>End Meeting for All</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Provider:</dt>
              <dd className="font-medium">100ms.live WebRTC</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Duration:</dt>
              <dd className="font-medium">{meeting.duration} minutes</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Room ID:</dt>
              <dd className="font-mono text-xs">{meeting.hmsRoomId ?? 'Unprovisioned'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
