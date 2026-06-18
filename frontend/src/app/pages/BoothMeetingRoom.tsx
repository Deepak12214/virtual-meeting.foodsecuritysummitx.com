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
      ref={videoRef as any}
      autoPlay
      playsInline
      muted={peer.isLocal}
      className="w-full h-full object-cover rounded-2xl"
    />
  );
}

function ScreenShareView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return (
    <video
      ref={videoRef as any}
      autoPlay
      playsInline
      className="w-full h-full object-contain bg-black rounded-2xl"
    />
  );
}

function PeerMuteIcon({ peerId }: { peerId: string }) {
  const isAudioOn = useHMSStore(selectIsPeerAudioEnabled(peerId));
  if (isAudioOn) return null;
  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg border border-red-400/25">
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
  const screenSharePeer = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);

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
            settings: { isAudioMuted: true, isVideoMuted: true },
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
      
      getBoothLobbyStatus(roomId)
        .then((res) => {
          if (left) return;
          if (res.status === 'approved') {
            return fetchBoothMeetingJoinToken(roomId)
              .then(({ token }) => {
                if (left) return;
                return hmsActions.join({
                  userName: user.name,
                  authToken: token,
                  settings: { isAudioMuted: true, isVideoMuted: true },
                });
              })
              .then(() => {
                if (left) return;
                setJoinStatus('admitted');
                hmsActions.changeMetadata(JSON.stringify({ status: 'admitted' })).catch(() => {});
                toast.success('🎉 Connected back to the booth meeting room!');
              });
          } else {
            return submitBoothLobbyRequest(roomId, user.id);
          }
        })
        .catch((err) => {
          console.error('Failed in lobby initiation:', err);
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
            settings: { isAudioMuted: true, isVideoMuted: true },
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Loading meeting configurations...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-20 bg-card border border-border rounded-2xl max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">Meeting Not Found</h3>
        <p className="text-muted-foreground text-sm mt-1">The requested booth meeting room is not active or may have been deleted.</p>
        <Link to="/exhibition">
          <Button className="mt-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border-none">
            Back to Exhibition Hall
          </Button>
        </Link>
      </div>
    );
  }

  if (joinStatus === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(76,175,80,0.06),transparent_50%)] pointer-events-none" />
        <Card className="w-full max-w-md border-border bg-card shadow-2xl relative overflow-hidden rounded-2xl">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-600" />
          
          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Asking to join...</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              You will automatically join the video call as soon as a booth representative approves your request.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 text-center pb-8 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border text-left space-y-1">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">
                Booth Meeting Room
              </span>
              <h3 className="text-lg font-extrabold text-foreground truncate">{meeting.title}</h3>
              {meeting.description && <p className="text-xs text-muted-foreground line-clamp-2">{meeting.description}</p>}
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-border text-left space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Your Profile Shared</p>
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role?.replace('_', ' ')} • {user?.company || 'No Company'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 py-2.5 px-4 rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Please keep this window open while waiting.</span>
            </div>

            <Button
              variant="outline"
              onClick={handleLeave}
              className="w-full border-border hover:bg-muted text-muted-foreground hover:text-foreground gap-2 h-11 rounded-xl cursor-pointer"
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
        <Card className="w-full max-w-md border-red-500/20 bg-card shadow-2xl relative overflow-hidden rounded-2xl text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Request Declined</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            The representative of this booth has declined your request to join the meeting room.
          </p>
          <Button 
            onClick={handleLeave} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11 rounded-xl border-none cursor-pointer mt-6"
          >
            Back to Booth
          </Button>
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
      const meta = p.metadata ? JSON.parse(p.metadata) : {};
      return meta.status === 'admitted' || p.roleName === 'broadcaster';
    } catch {
      return !!p.videoTrack || !!p.audioTrack;
    }
  });

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-8 bg-slate-950 flex flex-col relative overflow-hidden text-white font-sans select-none">
      
      {/* ─── A. Top Bar (Overlay) ──────────────────────────────────────────────── */}
      <div className="bg-slate-950/60 backdrop-blur-md border-b border-slate-900 px-6 h-16 flex items-center justify-between z-20 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase">
            <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
            LIVE BOOTH MEETING
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {meeting.title}
            </h1>
          </div>
        </div>

        <Button onClick={handleLeave} variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-900 gap-1.5 border-none h-9 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Room</span>
        </Button>
      </div>

      {/* ─── B. Lobby Waiting Room Popup overlay for Organizer ───────────────────── */}
      {isOrganizer && waitingList.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 px-4">
          <div className="bg-amber-600/95 backdrop-blur-md text-white border border-amber-500/30 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Lobby Waitlist Request ({waitingList.length})
              </span>
              <span className="text-xs bg-white/20 px-1.5 rounded uppercase text-[9px] font-bold">Lobby Approval</span>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {waitingList.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-black/20 rounded-xl border border-white/5 gap-4">
                  <span className="text-xs font-bold truncate">{p.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-7 px-3 rounded-lg border-none" onClick={() => admitPeer(p.id)}>Admit</Button>
                    <Button size="sm" variant="destructive" className="text-[11px] h-7 px-3 rounded-lg border-none" onClick={() => denyPeer(p.id)}>Deny</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── C. Video Canvas (Expands dynamically to take maximum area) ───────────── */}
      <div className="flex-1 w-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Subtle background ambient light */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(76,175,80,0.03),transparent_60%)] pointer-events-none" />
        
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-emerald-400 text-sm font-semibold tracking-wide animate-pulse">
              Connecting to secure video stream...
            </p>
          </div>
        ) : visiblePeers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-sm">
            <Users className="w-12 h-12 text-slate-500 mb-3" />
            <h4 className="text-white font-bold text-lg">Waiting for connection...</h4>
            <p className="text-slate-500 text-xs mt-1">Other participants have not joined Webrtc yet.</p>
          </div>
        ) : (
          screenSharePeer ? (
            /* Screen Share centerpiece layout */
            <div className="w-full h-full max-h-[82vh] flex flex-col gap-4">
              <div className="flex-1 min-h-[45vh] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-900 bg-black">
                <ScreenShareView peer={screenSharePeer} />
                <div className="absolute bottom-4 left-4 z-10">
                  <Badge className="bg-black/60 backdrop-blur-md text-white text-xs border border-white/5 py-1 px-3 flex items-center gap-1.5 select-none rounded-lg font-semibold">
                    {screenSharePeer.name}'s Screen Share
                  </Badge>
                </div>
              </div>
              <div className="flex-shrink-0 w-full overflow-x-auto py-2 flex gap-3 h-[18vh] max-h-[18vh] items-center justify-start [scrollbar-width:none]">
                {visiblePeers.map((peer) => (
                  <div key={peer.id} className="relative h-full aspect-video rounded-xl overflow-hidden shadow-md border border-slate-900 bg-slate-900 shrink-0">
                    {peer.videoTrack ? (
                      <PeerVideo peer={peer} />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-slate-900 to-slate-800">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center font-extrabold text-sm shadow-inner text-emerald-400">
                          {peer.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-semibold border border-white/5">
                        {peer.name} {peer.isLocal ? '(You)' : ''}
                      </span>
                    </div>
                    <PeerMuteIcon peerId={peer.id} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Regular Grid Layout */
            <div className={`w-full h-full max-h-[82vh] grid gap-4 items-center justify-center ${
              visiblePeers.length === 1 
                ? 'max-w-4xl grid-cols-1' 
                : visiblePeers.length === 2 
                  ? 'max-w-6xl grid-cols-1 md:grid-cols-2' 
                  : 'max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {visiblePeers.map((peer) => (
                <div key={peer.id} className="relative h-full w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-900 bg-slate-900 group">
                  {peer.videoTrack ? (
                    <PeerVideo peer={peer} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gradient-to-br from-slate-900 to-slate-800">
                      <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center font-extrabold text-3xl shadow-inner text-emerald-400">
                        {peer.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-slate-400">Camera Off</p>
                    </div>
                  )}
                  
                  {/* Overlay details */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 z-10">
                    <Badge className="bg-black/60 backdrop-blur-md text-white text-xs border border-white/5 py-1 px-3 flex items-center gap-1.5 select-none rounded-lg font-semibold">
                      {peer.name} {peer.isLocal ? '(You)' : ''}
                      {peer.roleName && (
                        <span className="opacity-80 text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                          {peer.roleName === 'broadcaster' ? 'Host' : 'Viewer'}
                        </span>
                      )}
                    </Badge>
                  </div>
                  <PeerMuteIcon peerId={peer.id} />
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ─── D. Control Bar (Overlay bottom) ─────────────────────────────────────── */}
      {isConnected && (
        <div className="bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20 w-full relative shrink-0 select-none">
          
          {/* Left Side: Timer & Participant Count */}
          <div className="flex items-center gap-3 text-sm text-slate-400 shrink-0">
            <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-white text-sm">
                Live (Unlimited)
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <Users className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">
                {visiblePeers.length} active
              </span>
            </div>
          </div>

          {/* Center: Floating Media Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all cursor-pointer border ${
                isAudioEnabled
                  ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
                  : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
              }`}
              title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all cursor-pointer border ${
                isVideoEnabled
                  ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
                  : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
              }`}
              title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            {isOrganizer && (
              <Button
                variant="ghost"
                onClick={toggleScreen}
                className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all cursor-pointer border ${
                  amIScreenSharing
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/35'
                    : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
                }`}
                title={amIScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}

            <div className="h-8 w-px bg-slate-900 mx-1" />

            {isOrganizer ? (
              <Button
                onClick={handleEndForAll}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2 px-5 py-4 rounded-xl shadow-lg shadow-red-500/10 cursor-pointer border-none h-11"
                title="End meeting for all"
              >
                <PhoneOff className="h-4 w-4" />
                End Room
              </Button>
            ) : (
              <Button
                onClick={handleLeave}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-2 px-5 py-4 rounded-xl shadow-lg shadow-red-500/10 cursor-pointer border-none h-11"
                title="Leave meeting"
              >
                <PhoneOff className="h-4 w-4" />
                Leave Room
              </Button>
            )}
          </div>

          {/* Right Side: Room Info */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs text-slate-500 font-mono select-none px-2">
              Room ID: {meetingId?.slice(-6) || 'Room'}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
