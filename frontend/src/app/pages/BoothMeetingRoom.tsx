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
  fetchBoothMeetingById,
  fetchBoothMeetingJoinToken,
  submitBoothLobbyRequest,
  getBoothLobbyStatus,
  getBoothLobbyRequests,
  admitBoothLobbyParticipant,
  denyBoothLobbyParticipant,
  type BoothMeeting
} from '../services/boothService';

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

// ─── BoothMeetingRoom Page ─────────────────────────────────────────────────────

export function BoothMeetingRoom() {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 100ms hooks
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);

  const [meeting, setMeeting] = useState<BoothMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if current user is the host/creator of this booth meeting
  const isCreator =
    (meeting?.creator as any)?._id === user?.id ||
    (meeting?.creator as any)?.id === user?.id ||
    meeting?.creator === user?.id;

  const isOrganizer = localPeer?.roleName === 'broadcaster';

  const [joinStatus, setJoinStatus] = useState<'joining' | 'waiting' | 'admitted' | 'denied'>('joining');
  const [waitingList, setWaitingList] = useState<{ id: string; name: string; userId?: string }[]>([]);

  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // ── 1. Load meeting details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;

    fetchBoothMeetingById(meetingId)
      .then((data) => {
        if (data.status === 'completed') {
          toast.error('This booth meeting has already ended.');
          navigate('/exhibition');
          return;
        }
        setMeeting(data);
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load booth meeting details.');
        navigate('/exhibition');
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
      fetchBoothMeetingJoinToken(roomId)
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
          setJoinStatus('admitted');
          hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
        })
        .catch((err) => {
          console.error('HMS join error:', err);
          setJoinStatus('joining');
        });
    } else {
      setJoinStatus('waiting');
      
      submitBoothLobbyRequest(roomId, user.id)
        .catch((err) => {
          console.error('Failed to submit lobby request:', err);
        });
    }

    return () => {
      left = true;
      hmsActions.leave().catch(() => {});
    };
  }, [meeting, user, isCreator]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll DB lobby status for visitors
  useEffect(() => {
    if (joinStatus !== 'waiting' || !meetingId || isCreator) return;

    let joiningRoom = false;

    const checkStatus = async () => {
      try {
        const res = await getBoothLobbyStatus(meetingId);
        if (res.status === 'approved' && !joiningRoom) {
          joiningRoom = true;
          const { token } = await fetchBoothMeetingJoinToken(meetingId);
          await hmsActions.join({
            userName: user?.name || 'Guest',
            authToken: token,
            settings: { isAudioMuted: false, isVideoMuted: false },
          });
          setJoinStatus('admitted');
          hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
          toast.success('🎉 You have been admitted to the booth meeting!');
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

  // Re-broadcast request in waiting queue
  useEffect(() => {
    if (joinStatus !== 'waiting' || !isConnected || !localPeer) return;

    const sendRequest = () => {
      hmsActions.sendBroadcastMessage(
        JSON.stringify({
          action: 'request-join',
          peerId: localPeer.id,
          name: localPeer.name,
          userId: user?.id
        }),
        'lobby-control'
      ).catch(() => {});
    };

    sendRequest();

    const interval = setInterval(sendRequest, 5000);
    return () => clearInterval(interval);
  }, [joinStatus, isConnected, localPeer?.id, hmsActions, user]);

  // Host presence wake-up
  useEffect(() => {
    if (isConnected && isOrganizer) {
      hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'host-announce' }),
        'lobby-control'
      ).catch(() => {});
    }
  }, [isConnected, isOrganizer, hmsActions]);

  // Host pulls waitlist requests from MongoDB
  useEffect(() => {
    if (!isOrganizer || !isConnected || !meetingId) return;

    const syncLobbyRequests = async () => {
      try {
        const requests = await getBoothLobbyRequests(meetingId);
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
        console.error('Error syncing lobby requests:', err);
      }
    };

    syncLobbyRequests();
    const interval = setInterval(syncLobbyRequests, 5000);
    return () => clearInterval(interval);
  }, [isOrganizer, isConnected, meetingId]);

  // Listen for lobby signalling controls
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
          if (!isOrganizer && joinStatus === 'waiting' && localPeer) {
            hmsActions.sendBroadcastMessage(
              JSON.stringify({
                action: 'request-join',
                peerId: localPeer.id,
                name: localPeer.name,
                userId: user?.id
              }),
              'lobby-control'
            ).catch(() => {});
          }
        } else if (data.action === 'admit') {
          if (localPeer && localPeer.id === data.peerId) {
            setJoinStatus('admitted');
            hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
            hmsActions.setLocalAudioEnabled(true).catch(() => {});
            hmsActions.setLocalVideoEnabled(true).catch(() => {});
            toast.success('🎉 You have been admitted to the booth meeting!');
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
        await admitBoothLobbyParticipant(meetingId, waitingPeer.userId);
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

      try {
        await hmsActions.removePeer(peerId, 'Request denied by host');
      } catch (err) {
        // ignore if not joined WebRTC yet
      }

      if (waitingPeer?.userId && meetingId) {
        await denyBoothLobbyParticipant(meetingId, waitingPeer.userId);
      }

      setWaitingList((prev) => prev.filter((p) => p.id !== peerId));
      toast.warning('Participant request denied');
    } catch {
      toast.error('Failed to deny request');
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  
  const handleLeave = async () => {
    await hmsActions.leave().catch(() => {});
    navigate(`/exhibition/${meeting?.booth?._id || meeting?.booth?.id || ''}`);
  };

  const handleEndForAll = async () => {
    const roomId = meeting?._id ?? meeting?.id;
    try {
      await hmsActions.endRoom(false, 'Meeting ended by organizer');
    } catch (err) {
      console.warn('HMS endRoom error:', err);
    }
    await hmsActions.leave().catch(() => {});
    navigate(`/exhibition/${meeting?.booth?._id || meeting?.booth?.id || ''}`);
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  };

  const toggleScreen = async () => {
    await hmsActions.setScreenShareEnabled(!amIScreenSharing);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Meeting Not Found</h2>
        <p className="text-[--color-text-secondary] mt-2">The request room meeting is not active.</p>
        <Link to="/exhibition">
          <Button className="mt-6">Back to Exhibition Hall</Button>
        </Link>
      </div>
    );
  }

  // Filter out lobby wait peers from the visible screens
  const admittedPeers = peers.filter((p) => {
    try {
      const meta = p.metadata ? JSON.parse(p.metadata) : {};
      return meta.status === 'admitted';
    } catch {
      return true; // fallback
    }
  });

  const visiblePeers = isOrganizer ? admittedPeers : admittedPeers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/exhibition/${meeting.booth?._id || meeting.booth?.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="text-xs text-[--color-text-secondary]">
              Booth Interaction Room • {meeting.booth?.name || 'Exhibitor Booth'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white animate-pulse">Live</Badge>
        </div>
      </div>

      {/* ── Waiting Lobby Screen ── */}
      {joinStatus === 'waiting' && (
        <Card className="max-w-md mx-auto py-12 text-center  shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-purple-500/10" />
          <CardContent className="space-y-6 relative z-10">
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-indigo-400" />
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">Lobby Waiting Room</CardTitle>
              <CardDescription>
                You will be connected automatically once a booth representative admits you.
              </CardDescription>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-left border border-slate-200 space-y-2">
              <p className="text-xs text-slate-500 uppercase font-semibold">Your Profile Shared</p>
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-600">{user?.email}</p>
              <p className="text-xs text-slate-600 capitalize">{user?.role?.replace('_', ' ')} • {user?.company || 'No Company'}</p>
            </div>
            <Button variant="outline" onClick={handleLeave} className="w-full">
              Cancel & Leave
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Access Denied Screen ── */}
      {joinStatus === 'denied' && (
        <Card className="max-w-md mx-auto py-12 text-center border-red-500/30 bg-red-500/[0.02]">
          <CardContent className="space-y-6">
            <XCircle className="h-16 w-16 mx-auto text-red-500" />
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">Access Denied</CardTitle>
              <CardDescription>
                The representative of the booth declined your request to join the meeting room.
              </CardDescription>
            </div>
            <Button onClick={handleLeave} className="w-full">
              Back to Booth
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active Video Grid ── */}
      {joinStatus === 'admitted' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Stream Panel */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visiblePeers.map((peer) => (
                <Card key={peer.id} className="relative aspect-video overflow-hidden bg-black/90 border-none group shadow-lg">
                  <CardContent className="p-0 h-full w-full">
                    <PeerVideo peer={peer} />
                    <div className="absolute bottom-4 left-4 z-10">
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
                  </CardContent>
                </Card>
              ))}

              {visiblePeers.length === 0 && (
                <div className="col-span-2 aspect-video bg-black/95 rounded-xl border border-[--color-border] flex flex-col items-center justify-center text-center p-6">
                  <Radio className="h-12 w-12 text-[--color-text-secondary] animate-pulse mb-3" />
                  <p className="font-semibold text-sm">Waiting for live video feed...</p>
                  <p className="text-xs text-[--color-text-secondary] mt-1">
                    Connecting to representatives and active video streams.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Organizer Lobby Controller Panel */}
          {isOrganizer && (
            <div className="lg:col-span-1">
              <Card className="h-full border-[--color-border] bg-[--color-surface]">
                <CardHeader className="border-b border-[--color-border] pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-[--color-primary]" />
                    Lobby Admission Requests
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Admit or deny attendees waiting to join your live booth room.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {waitingList.map((peer) => (
                      <div key={peer.id} className="flex flex-col gap-2 p-3 bg-[--color-surface-elevated] rounded-lg border border-[--color-border] text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold">{peer.name}</span>
                          <span className="text-[10px] text-[--color-text-secondary]">Attendee waiting</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 text-[11px] h-7 bg-green-600 hover:bg-green-700" onClick={() => admitPeer(peer.id)}>
                            Admit
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => denyPeer(peer.id)}>
                            Deny
                          </Button>
                        </div>
                      </div>
                    ))}
                    {waitingList.length === 0 && (
                      <div className="text-center py-12 text-[--color-text-secondary]">
                        <CheckCircle className="h-8 w-8 text-green-500/40 mx-auto mb-2" />
                        <p className="text-xs">Lobby Queue is Empty</p>
                        <p className="text-[10px] text-[--color-text-secondary] mt-1">Pending requests will show up here.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Controls Bar */}
      {isConnected && joinStatus === 'admitted' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[--color-text-secondary]" />
                  <span className="text-lg font-mono font-semibold">Live (Unlimited)</span>
                </div>
                <div className="h-6 w-px bg-[--color-border]" />
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[--color-text-secondary]" />
                  <span>{visiblePeers.length} peer(s)</span>
                </div>
              </div>

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
                {isOrganizer ? (
                  <Button variant="destructive" size="lg" onClick={handleEndForAll} className="gap-2">
                    <PhoneOff className="h-5 w-5" />End Room
                  </Button>
                ) : (
                  <Button variant="destructive" size="lg" onClick={handleLeave} className="gap-2">
                    <PhoneOff className="h-5 w-5" />Leave
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
