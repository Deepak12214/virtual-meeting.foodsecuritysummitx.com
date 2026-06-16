import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
  useHMSNotifications,
  HMSNotificationTypes,
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
  Radio,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchMeetingById,
  fetchJoinToken,
  registerJoin,
  endMeeting,
  submitLobbyRequest,
  getLobbyStatus,
  getLobbyRequests,
  admitLobbyParticipant,
  denyLobbyParticipant,
  type Meeting,
} from '../services/meetingService';

// ─── Peer Video Tile ──────────────────────────────────────────────────────────

function PeerVideo({ peer }: { peer: HMSPeer }) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return (
    <video
      ref={videoRef as any}
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

  const isCreator =
    (meeting?.creator as any)?._id === user?.id ||
    (meeting?.creator as any)?.id === user?.id ||
    meeting?.creator === user?.id;

  const isOrganizer = localPeer?.roleName === 'broadcaster';

  const [joinStatus, setJoinStatus] = useState<'joining' | 'waiting' | 'admitted' | 'denied'>('joining');
  const [waitingList, setWaitingList] = useState<{ id: string; name: string; userId?: string }[]>([]);

  // ✅ Use store selectors — HMSPeer does NOT have isAudioEnabled/isVideoEnabled directly
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // ── 1. Load meeting details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;

    fetchMeetingById(meetingId)
      .then((data) => {
        if (data.status === 'completed') {
          toast.error('This meeting has already ended.');
          navigate('/meetings');
          return;
        }
        setMeeting(data);
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load meeting details.');
        navigate('/meetings');
      })
      .finally(() => setLoading(false));
  }, [meetingId, navigate]);

  // ── 2. Join 100ms room once meeting data is ready ────────────────────────────
  useEffect(() => {
    if (!meeting || !user) return;

    const roomId = meeting._id ?? meeting.id;
    if (!roomId) return;

    let left = false;

    if (isCreator) {
      setJoinStatus('joining');
      fetchJoinToken(roomId)
        .then(({ token }) => {
          if (left) return;
          return hmsActions.join({
            userName: user.name,
            authToken: token,
            settings: { isAudioMuted: false, isVideoMuted: false },
          });
        })
        .then(() => {
          if (left) return;
          registerJoin(roomId!);
          setJoinStatus('admitted');
          hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
        })
        .catch((err) => {
          console.error('HMS join error:', err);
          setJoinStatus('joining');
        });
    } else {
      // Regular users/guests immediately enter the waiting state and do not join WebRTC yet
      setJoinStatus('waiting');
      
      // Register request in database immediately using their user ID as peerId placeholder
      submitLobbyRequest(roomId, user.id || user.id)
        .catch((err) => {
          console.error('Failed to submit lobby request to database:', err);
        });
    }

    return () => {
      left = true;
      hmsActions.leave().catch(() => {});
    };
  }, [meeting, user, isCreator]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll DB lobby status in case broadcast/signaling messages are missed
  useEffect(() => {
    if (joinStatus !== 'waiting' || !meetingId || isCreator) return;

    let joiningRoom = false;

    const checkStatus = async () => {
      try {
        const res = await getLobbyStatus(meetingId);
        if (res.status === 'approved' && !joiningRoom) {
          joiningRoom = true;
          // Fetch token and join WebRTC room now that we're admitted!
          const { token } = await fetchJoinToken(meetingId);
          await hmsActions.join({
            userName: user?.name || 'Guest',
            authToken: token,
            settings: { isAudioMuted: false, isVideoMuted: false },
          });
          registerJoin(meetingId);
          setJoinStatus('admitted');
          hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
          toast.success('🎉 You have been admitted to the meeting!');
        } else if (res.status === 'rejected') {
          setJoinStatus('denied');
          toast.error('❌ Your request to join was declined.');
        }
      } catch (err) {
        console.error('Error polling lobby status:', err);
        joiningRoom = false;
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [joinStatus, meetingId, hmsActions, isCreator, user]);

  // Re-broadcast join request while waiting in the lobby
  useEffect(() => {
    if (joinStatus !== 'waiting' || !isConnected || !localPeer) return;

    const sendRequest = () => {
      hmsActions.sendBroadcastMessage(
        JSON.stringify({
          action: 'request-join',
          peerId: localPeer.id,
          name: localPeer.name,
          userId: user?.id || user?.id
        }),
        'lobby-control'
      ).catch(() => {});
    };

    sendRequest();

    const interval = setInterval(sendRequest, 5000);
    return () => clearInterval(interval);
  }, [joinStatus, isConnected, localPeer?.id, hmsActions, user]);

  // Host announces presence on connect to wake up any waiting peers
  useEffect(() => {
    if (isConnected && isOrganizer) {
      hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'host-announce' }),
        'lobby-control'
      ).catch(() => {});
    }
  }, [isConnected, isOrganizer, hmsActions]);

  // Host periodically fetches current waitlist requests from MongoDB to sync waitlist
  useEffect(() => {
    if (!isOrganizer || !isConnected || !meetingId) return;

    const syncLobbyRequests = async () => {
      try {
        const requests = await getLobbyRequests(meetingId);
        const formatted = requests.map((req: any) => ({
          id: req.peerId,
          name: req.user.name,
          userId: req.user._id || req.user.id
        }));

        setWaitingList((prev) => {
          const updated = [...prev];
          formatted.forEach((req: any) => {
            if (!updated.some((p) => p.id === req.id)) {
              updated.push(req);
            } else {
              const index = updated.findIndex((p) => p.id === req.id);
              if (index > -1 && !updated[index].userId) {
                updated[index].userId = req.userId;
              }
            }
          });
          return updated.filter((p) => formatted.some((req: any) => req.id === p.id));
        });
      } catch (err) {
        console.error('Error syncing lobby requests from DB:', err);
      }
    };

    syncLobbyRequests();
    const interval = setInterval(syncLobbyRequests, 5000);
    return () => clearInterval(interval);
  }, [isOrganizer, isConnected, meetingId]);

  // Listen for lobby controls (admit / deny / request-join)
  const notification = useHMSNotifications();

  useEffect(() => {
    if (!notification) return;

    switch (notification.type) {
      case HMSNotificationTypes.NEW_MESSAGE: {
        const msg = notification.data;
        if (!msg || msg.type !== 'lobby-control') break;

        let data: any;
        try { data = JSON.parse(msg.message); } catch { break; }

        if (data.action === 'request-join') {
          if (isOrganizer) {
            setWaitingList((prev) => {
              if (prev.some((p) => p.id === data.peerId)) return prev;
              return [...prev, { id: data.peerId, name: data.name, userId: data.userId }];
            });
            toast.info(`🔔 ${data.name} is requesting to join the meeting`);
          }
        } else if (data.action === 'host-announce') {
          // Re-send request if waiting
          if (!isOrganizer && joinStatus === 'waiting' && localPeer) {
            hmsActions.sendBroadcastMessage(
              JSON.stringify({
                action: 'request-join',
                peerId: localPeer.id,
                name: localPeer.name,
                userId: user?.id || user?.id
              }),
              'lobby-control'
            ).catch(() => {});
          }
        } else if (data.action === 'admit') {
          if (localPeer && localPeer.id === data.peerId) {
            setJoinStatus('admitted');
            hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
            // Unmute local media now that we're admitted
            hmsActions.setLocalAudioEnabled(true).catch(() => {});
            hmsActions.setLocalVideoEnabled(true).catch(() => {});
            toast.success('🎉 You have been admitted to the meeting!');
          }
        } else if (data.action === 'deny') {
          if (localPeer && localPeer.id === data.peerId) {
            setJoinStatus('denied');
            hmsActions.leave().catch(() => {});
            toast.error('❌ Your request to join was declined.');
          }
        }
        break;
      }

      case HMSNotificationTypes.PEER_LEFT: {
        const leftPeer = notification.data;
        if (leftPeer) {
          setWaitingList((prev) => prev.filter((p) => p.id !== leftPeer.id));
        }
        break;
      }

      default:
        break;
    }
  }, [notification, isOrganizer, joinStatus, localPeer?.id, hmsActions, user]);

  const admitPeer = async (peerId: string) => {
    try {
      const waitingPeer = waitingList.find((p) => p.id === peerId);

      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'admit', peerId }),
        'lobby-control'
      );

      if (waitingPeer?.userId && meetingId) {
        await admitLobbyParticipant(meetingId, waitingPeer.userId);
      }

      setWaitingList((prev) => prev.filter((p) => p.id !== peerId));
      toast.success('Participant admitted!');
    } catch {
      toast.error('Failed to admit participant');
    }
  };

  const denyPeer = async (peerId: string) => {
    try {
      const waitingPeer = waitingList.find((p) => p.id === peerId);

      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'deny', peerId }),
        'lobby-control'
      ).catch(() => {});

      // Physically kick the peer if they are in the WebRTC room
      try {
        await hmsActions.removePeer(peerId, 'Request denied by host');
      } catch (err) {
        // Safe to ignore if not joined WebRTC yet
      }

      if (waitingPeer?.userId && meetingId) {
        await denyLobbyParticipant(meetingId, waitingPeer.userId);
      }

      setWaitingList((prev) => prev.filter((p) => p.id !== peerId));
      toast.warning('Participant request denied');
    } catch {
      toast.error('Failed to deny request');
    }
  };

  // ── 3. Session countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!meeting) return;

    const calculateTimeRemaining = () => {
      const startTime = new Date(meeting.scheduledTime).getTime();
      const durationMs = (meeting.duration || 30) * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();
      return Math.max(0, Math.floor((endTime - now) / 1000));
    };

    const initialRemaining = calculateTimeRemaining();
    setTimeRemaining(initialRemaining);

    if (initialRemaining <= 0) {
      toast.error('This meeting has reached its 30-minute limit and has ended.');
      if (isOrganizer) {
        handleEndForAll();
      } else {
        handleLeave();
      }
      return;
    }

    const id = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(id);
        toast.error('This meeting has reached its 30-minute limit and has ended.');
        if (isOrganizer) {
          handleEndForAll();
        } else {
          handleLeave();
        }
      }
    }, 1000);

    return () => clearInterval(id);
  }, [meeting, isOrganizer]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (joinStatus === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <Card className="w-full max-w-md border-[--color-border] bg-gradient-to-br from-gray-900/90 to-slate-900/90 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Animated background glow */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-500 rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          <CardHeader className="text-center pb-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-indigo-600/15 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Asking to join...</CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              You will join the meeting as soon as the host admits you.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center relative z-10 pb-8">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left space-y-2">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider font-mono">Meeting Room</p>
              <h3 className="text-base font-bold text-white truncate">{meeting?.title}</h3>
              {meeting?.description && <p className="text-xs text-gray-400 line-clamp-2">{meeting.description}</p>}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 py-2 px-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Please keep this window open while waiting.</span>
            </div>

            <Button
              variant="outline"
              onClick={handleLeave}
              className="w-full border-gray-700 hover:bg-gray-800 text-gray-300 gap-2 h-10"
            >
              <PhoneOff className="w-4 h-4" /> Cancel Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joinStatus === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <Card className="w-full max-w-md border-red-500/30 bg-red-950/20 shadow-2xl relative overflow-hidden backdrop-blur-md text-center p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white font-sans">Request Declined</h2>
          <p className="text-sm text-gray-400 mt-2">
            The host of this meeting has declined your request to join.
          </p>
          <Link to="/meetings" className="block mt-6">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-10">
              Back to Meetings
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Filter out peers that are still in the waiting room
  const visiblePeers = peers.filter((p) => {
    if (p.isLocal) {
      return joinStatus === 'admitted';
    }
    try {
      const meta = JSON.parse(p.metadata || '{}');
      return meta.status === 'admitted' || p.roleName === 'broadcaster';
    } catch {
      return !!p.videoTrack || !!p.audioTrack;
    }
  });

  return (
    <div className="space-y-6">
      {/* Lobby Waiting Room requests for organizer */}
      {isOrganizer && waitingList.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-md animate-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Lobby Waiting Room ({waitingList.length} request{waitingList.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {waitingList.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-black/10 rounded-lg border border-amber-500/10 gap-4 flex-wrap">
                <span className="text-sm font-semibold text-white">{p.name}</span>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white h-8 text-xs font-semibold px-4" onClick={() => admitPeer(p.id)}>Admit</Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs font-semibold px-4" onClick={() => denyPeer(p.id)}>Deny</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
          {visiblePeers.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Users className="w-12 h-12 mb-3 text-gray-400" />
                <p>Waiting for participants to join…</p>
              </CardContent>
            </Card>
          ) : (
            visiblePeers.map((peer) => (
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
                  <span>{visiblePeers.length} peer(s)</span>
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
