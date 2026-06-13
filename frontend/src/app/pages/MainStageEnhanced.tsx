import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  useHMSNotifications,
  HMSNotificationTypes,
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
  Loader2,
  ArrowRight,
  LogOut,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
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

  if (!peer.videoTrack) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-white p-4">
        <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-2xl border border-indigo-500/20">
          {peer.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <p className="mt-2 text-xs text-gray-400">Camera Off</p>
      </div>
    );
  }

  return <video ref={videoRef} autoPlay playsInline muted={peer.isLocal} className="w-full h-full object-cover" />;
}

function ScreenShareView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ─── Speaker Stage Request Banner ─────────────────────────────────────────────

interface StageRequestBannerProps {
  requestStatus: 'none' | 'pending' | 'live' | 'rejected';
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  isRefreshingUser: boolean;
  onRequest: () => void;
  onLeave: () => void;
  onRetry: () => void;
  onRefreshSession: () => void;
  userName?: string;
  isApproved: boolean;
}

function StageRequestBanner({
  requestStatus,
  isConnected,
  isConnecting,
  connectionError,
  isRefreshingUser,
  onRequest,
  onLeave,
  onRetry,
  onRefreshSession,
  userName,
  isApproved,
}: StageRequestBannerProps) {
  if (requestStatus === 'live') return null;

  const hasError = !!connectionError;
  const connecting = isConnecting && !isConnected && !hasError;

  return (
    <div className="space-y-2">
      {/* Not-approved warning */}
      {!isApproved && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-600 font-medium">
              Account pending approval — ask an organizer to approve your account, then click Check Again
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex-shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-1.5 text-xs h-8 whitespace-nowrap"
            onClick={onRefreshSession}
            disabled={isRefreshingUser}
          >
            {isRefreshingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {isRefreshingUser ? 'Checking…' : 'Check Again'}
          </Button>
        </div>
      )}

      {/* Main banner */}
      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${hasError
            ? 'bg-gradient-to-r from-red-950/70 to-rose-950/70 border-red-500/30'
            : requestStatus === 'pending'
              ? 'bg-gradient-to-r from-indigo-950/80 to-violet-950/80 border-indigo-500/40'
              : requestStatus === 'rejected'
                ? 'bg-gradient-to-r from-red-950/70 to-rose-950/70 border-red-500/30'
                : 'bg-gradient-to-r from-gray-900/90 to-slate-900/90 border-[--color-border]'
          }`}
      >
        {requestStatus === 'pending' && !hasError && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-500/10 rounded-full animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-violet-500/10 rounded-full animate-pulse delay-500" />
          </div>
        )}

        <div className="relative flex items-center justify-between gap-4 p-4 sm:p-5 flex-wrap">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${hasError ? 'bg-red-500/20 text-red-400'
                : connecting ? 'bg-gray-600/40 text-gray-400'
                  : requestStatus === 'pending' ? 'bg-indigo-500/20 text-indigo-400'
                    : requestStatus === 'rejected' ? 'bg-red-500/20 text-red-400'
                      : isConnected && isApproved ? 'bg-green-500/15 text-green-400'
                        : 'bg-gray-700/50 text-gray-400'
              }`}>
              {hasError ? <XCircle className="w-5 h-5" />
                : connecting ? <Loader2 className="w-5 h-5 animate-spin" />
                  : requestStatus === 'pending' ? <Loader2 className="w-5 h-5 animate-spin" />
                    : requestStatus === 'rejected' ? <XCircle className="w-5 h-5" />
                      : <Radio className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {hasError ? 'Connection Failed'
                  : connecting ? 'Connecting to Stage Server…'
                    : requestStatus === 'pending' ? 'Waiting for Stage Access…'
                      : requestStatus === 'rejected' ? 'Stage Access Declined'
                        : isConnected ? 'Join Main Stage'
                          : 'Stage Server Offline'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasError ? connectionError
                  : connecting ? 'Please wait — establishing secure connection…'
                    : requestStatus === 'pending' ? 'Admin notified · You will go live once approved'
                      : requestStatus === 'rejected' ? 'Your request was declined. You may try again.'
                        : isConnected && isApproved ? `Hello ${userName?.split(' ')[0] ?? 'Speaker'} — click Join Stage to send your request`
                          : isConnected && !isApproved ? 'Connected — waiting for account approval'
                            : 'Could not reach stage server'}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Status pill */}
            <div className={`hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${isConnected ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : hasError ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
              }`}>
              {isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5 animate-pulse" />}
              {isConnected ? 'Connected' : hasError ? 'Error' : 'Connecting…'}
            </div>

            {/* Error → Retry + Refresh */}
            {hasError && (
              <>
                <Button size="sm" variant="outline"
                  className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 h-8"
                  onClick={onRetry}>
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
                <Button size="sm"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 h-8"
                  onClick={onRefreshSession} disabled={isRefreshingUser}>
                  {isRefreshingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {isRefreshingUser ? 'Refreshing…' : 'Refresh Session'}
                </Button>
              </>
            )}

            {/* Connecting spinner */}
            {connecting && !hasError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/30 border border-gray-600/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Connecting…</span>
              </div>
            )}

            {/* Connected + approved + none → Join Stage */}
            {!hasError && !connecting && requestStatus === 'none' && (
              <Button
                onClick={onRequest}
                disabled={!isConnected || !isApproved}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm font-semibold disabled:opacity-40 shadow-lg shadow-indigo-500/20"
                title={!isApproved ? 'Account not yet approved by admin' : !isConnected ? 'Connecting to server…' : ''}
              >
                <Radio className="w-4 h-4" />
                Join Stage
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {/* Pending → In Queue */}
            {!hasError && requestStatus === 'pending' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
                </span>
                <span className="text-xs text-indigo-300 font-medium">In Queue</span>
              </div>
            )}

            {/* Rejected → Request Again */}
            {!hasError && requestStatus === 'rejected' && (
              <Button onClick={onRequest} disabled={!isConnected} variant="outline"
                className="text-sm border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2">
                <Radio className="w-4 h-4" /> Request Again
              </Button>
            )}
          </div>
        </div>

        {requestStatus === 'pending' && !hasError && (
          <div className="h-0.5 bg-gray-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MainStageEnhanced Page ───────────────────────────────────────────────────

export function MainStageEnhanced() {
  const { user, hasAccess, refreshUser } = useAuth();

  // Q&A state
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'qa'>('qa');

  // 100ms hooks
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);

  // Stage room
  const [stageMeeting, setStageMeeting] = useState<Meeting | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [hmsConnecting, setHmsConnecting] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0); // increment to retry
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectedRef = useRef(false); // ref to avoid stale closure in timeout

  // Mock session metadata
  const liveSession = MOCK_SESSIONS.find((s) => s.isLive);
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === 'upcoming');

  // Role checks
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost = user?.role === 'host' || isOrganizer;
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isSpeaker = user?.role === 'speaker' || isHost;
  const canAskQ = hasAccess(['attendee', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'host', 'organizer', 'admin']);

  // A "pure speaker" is someone with the speaker role who is NOT also a host/admin/organizer
  const isPureSpeaker = user?.role === 'speaker' && !isHost;

  // Store selectors for local media state
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // Speaker queue — updated in real-time from 100ms messages & peer metadata
  const [speakerQueue, setSpeakerQueue] = useState<{
    id: string;
    name: string;
    title?: string;
    status: 'ready' | 'not-ready' | 'standby' | 'live';
    duration?: number;
  }[]>([]);

  // Speaker's own request status
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'live' | 'rejected'>('none');

  // Ref to avoid duplicate queue entries on rapid re-renders
  const requestSentRef = useRef(false);

  // Control authority list for the sidebar widget
  const authorities = [
    ...(isAdmin || isOrganizer ? [{ role: user?.role ?? 'admin', name: user?.name ?? 'Admin', mode: 'full' as const }] : []),
    ...(isHost && !isOrganizer ? [{ role: 'host', name: user?.name ?? 'Host', mode: 'presentation' as const }] : []),
    ...(isModerator && !isOrganizer && !isHost ? [{ role: 'moderator', name: user?.name ?? 'Moderator', mode: 'limited' as const }] : []),
  ];

  // ── 1. Load Main Stage room ──────────────────────────────────────────────────
  useEffect(() => {
    setRoomError(null);
    fetchMainStageRoom()
      .then(setStageMeeting)
      .catch((err) => {
        console.error('Failed to load Main Stage room:', err);
        setRoomError('Could not load Main Stage room. Please refresh.');
      });
  }, []);

  // ── 2. Join HMS room (with retry support + 15s timeout) ──────────────────────
  useEffect(() => {
    if (!stageMeeting || !user) return;
    const roomId = stageMeeting._id ?? stageMeeting.id;
    if (!roomId) return;

    let left = false;
    setRoomError(null);
    setHmsConnecting(true);

    // 20-second connection timeout — uses ref to avoid stale closure
    connectionTimeoutRef.current = setTimeout(() => {
      if (!left && !isConnectedRef.current) {
        setRoomError('Connection timed out — the 100ms role may be misconfigured. Click Retry.');
        setHmsConnecting(false);
      }
    }, 20000);

    fetchJoinToken(roomId)
      .then(({ token }) => {
        if (left) return;
        return hmsActions.join({
          userName: user.name,
          authToken: token,
          settings: { isAudioMuted: true, isVideoMuted: true },
        });
      })
      .then(() => {
        if (!left) setHmsConnecting(false);
      })
      .catch((err) => {
        console.error('HMS stage join error:', err);
        if (!left) {
          setRoomError(`Stage connection failed: ${err?.message || 'Unknown error'}. Click Retry.`);
          setHmsConnecting(false);
        }
      });

    return () => {
      left = true;
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      hmsActions.leave().catch(() => { });
    };
  }, [stageMeeting, user, connectionAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep isConnectedRef in sync with live isConnected state (fixes stale closure in setTimeout)
  useEffect(() => {
    isConnectedRef.current = isConnected;
    if (isConnected && connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      setHmsConnecting(false);
      setRoomError(null);
    }
  }, [isConnected]);


  /** Retry the HMS connection */
  const retryConnection = useCallback(() => {
    setRoomError(null);
    setConnectionAttempt((n) => n + 1);
  }, []);

  /** Refresh user data from server (picks up isApproved change made by admin) */
  const handleRefreshSession = useCallback(async () => {
    setIsRefreshingUser(true);
    await refreshUser();
    setIsRefreshingUser(false);
    // After refreshing user, also retry HMS connection
    retryConnection();
  }, [refreshUser, retryConnection]);

  // ── 3. Sync peer metadata for late-joining admins ─────────────────────────────
  useEffect(() => {
    if (!isConnected || !peers || peers.length === 0) return;

    const initialQueue: typeof speakerQueue = [];
    peers.forEach((p) => {
      if (p.roleName === 'viewer-on-stage') {
        try {
          const meta = JSON.parse(p.metadata || '{}');
          if (meta.inQueue) {
            initialQueue.push({
              id: p.id,
              name: p.name,
              title: meta.title || 'Speaker',
              status: meta.status === 'live' ? 'live' : 'ready',
              duration: 15,
            });
          }
        } catch {
          // ignore
        }
      }
    });

    if (initialQueue.length === 0) return;

    setSpeakerQueue((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      initialQueue.forEach((item) => {
        if (!map.has(item.id)) map.set(item.id, item);
      });
      const peerIds = new Set(peers.map((p) => p.id));
      return Array.from(map.values()).filter((item) => peerIds.has(item.id));
    });
  }, [isConnected, peers]);

  // ── 4. Restore own request status on re-connect ────────────────────────────
  useEffect(() => {
    if (!isConnected || !localPeer || !isPureSpeaker) return;
    try {
      const meta = JSON.parse(localPeer.metadata || '{}');
      if (meta.inQueue) {
        if (meta.status === 'live') {
          setRequestStatus('live');
          hmsActions.setLocalAudioEnabled(true);
          hmsActions.setLocalVideoEnabled(true);
        } else {
          setRequestStatus('pending');
          requestSentRef.current = true;
        }
      } else {
        setRequestStatus('none');
        requestSentRef.current = false;
      }
    } catch {
      // ignore
    }
  }, [isConnected, localPeer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 5. Real-time 100ms message & peer events ──────────────────────────────
  const notification = useHMSNotifications();

  useEffect(() => {
    if (!notification) return;

    switch (notification.type) {
      case HMSNotificationTypes.NEW_MESSAGE: {
        const msg = notification.data;
        if (!msg || msg.type !== 'stage-control') break;

        let data: any;
        try { data = JSON.parse(msg.message); } catch { break; }

        // ── Speaker joined the queue ──
        if (data.action === 'join-queue') {
          setSpeakerQueue((prev) => {
            if (prev.some((item) => item.id === data.peerId)) return prev;
            return [
              ...prev,
              {
                id: data.peerId,
                name: data.name,
                title: data.title || 'Speaker',
                status: 'ready',
                duration: 15,
              },
            ];
          });
          if (isHost || isModerator || isAdmin) {
            toast.info(`🎙️ ${data.name} is requesting to join the stage`, {
              duration: 6000,
              action: { label: 'View Queue', onClick: () => { } },
            });
          }
        }

        // ── Status update from admin ──
        if (data.action === 'status-update') {
          const { peerId: targetId, status: newStatus } = data;

          setSpeakerQueue((prev) => {
            if (newStatus === 'rejected') return prev.filter((i) => i.id !== targetId);
            return prev.map((i) => (i.id === targetId ? { ...i, status: newStatus } : i));
          });

          // If this message targets ME (local speaker)
          if (localPeer && localPeer.id === targetId) {
            if (newStatus === 'live') {
              setRequestStatus('live');
              hmsActions.setLocalAudioEnabled(true);
              hmsActions.setLocalVideoEnabled(true);
              toast.success('🎉 You are now LIVE on Main Stage!');
            } else if (newStatus === 'not-ready' || newStatus === 'rejected') {
              setRequestStatus(newStatus === 'rejected' ? 'rejected' : 'none');
              requestSentRef.current = false;
              hmsActions.setLocalAudioEnabled(false);
              hmsActions.setLocalVideoEnabled(false);
              if (newStatus === 'rejected') {
                toast.error('Your stage request was declined.');
                setTimeout(() => setRequestStatus('none'), 5000);
              } else {
                toast.warning('You have been removed from the stage.');
              }
            }
          }
        }
        break;
      }

      case HMSNotificationTypes.PEER_LEFT: {
        const leftPeer = notification.data;
        if (leftPeer) {
          setSpeakerQueue((prev) => prev.filter((i) => i.id !== leftPeer.id));
        }
        break;
      }

      default:
        break;
    }
  }, [notification]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Speaker clicks "Join Stage" → sends request, appears in admin queue */
  const requestToGoLive = async () => {
    if (!localPeer || requestSentRef.current) return;
    try {
      requestSentRef.current = true;
      setRequestStatus('pending');

      // 1. Update peer metadata (persists for late-joining admins)
      await hmsActions.changeMetadata(
        JSON.stringify({
          inQueue: true,
          status: 'ready',
          title: user?.company || user?.name || 'Speaker',
        })
      );

      // 2. Broadcast to all peers in the room (including admin)
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({
          action: 'join-queue',
          peerId: localPeer.id,
          name: localPeer.name,
          title: user?.company || user?.name || 'Speaker',
        }),
        'stage-control'
      );

      toast.success('Request sent! Waiting for admin to approve.');
    } catch (err) {
      console.error('requestToGoLive error:', err);
      requestSentRef.current = false;
      setRequestStatus('none');
      toast.error('Failed to send request. Please try again.');
    }
  };

  /** Speaker leaves the stage voluntarily */
  const stopStreaming = async () => {
    if (!localPeer) return;
    try {
      setRequestStatus('none');
      requestSentRef.current = false;

      await hmsActions.setLocalAudioEnabled(false);
      await hmsActions.setLocalVideoEnabled(false);
      await hmsActions.changeMetadata(JSON.stringify({ inQueue: false, status: 'not-ready' }));
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId: localPeer.id, status: 'not-ready' }),
        'stage-control'
      );
      toast.success('You left the stage.');
    } catch {
      toast.error('Failed to leave stage');
    }
  };

  /** Admin promotes a speaker to live */
  const makeSpeakerLive = async (peerId: string) => {
    try {
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: 'live' }),
        'stage-control'
      );
      setSpeakerQueue((prev) => prev.map((i) => (i.id === peerId ? { ...i, status: 'live' } : i)));
      toast.success('Speaker promoted to live!');
    } catch {
      toast.error('Failed to promote speaker');
    }
  };

  /** Admin changes a speaker's queue status */
  const changeSpeakerStatus = async (peerId: string, newStatus: 'ready' | 'not-ready') => {
    try {
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: newStatus }),
        'stage-control'
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Q&A handlers ────────────────────────────────────────────────────────────
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

  const pendingQs = questions.filter((q) => q.status === 'pending');
  const approvedQs = questions.filter((q) => q.status === 'approved');

  // ── Media handlers ──────────────────────────────────────────────────────────
  const toggleAudio = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try { await hmsActions.setScreenShareEnabled(!amIScreenSharing); }
    catch { toast.error('Failed to share screen'); }
  };

  const screenSharePeer = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);

  // ─── peers who should appear on the video stage ────────────────────────────
  // Uses actual 100ms template role names (not platform roles):
  //   broadcaster      → admin/organizer/host/moderator  (always visible)
  //   viewer-on-stage  → speaker (visible only when marked 'live' in metadata)
  const presentingPeers = (() => {
    // Gather all HMS peers (selectPeers may or may not include local peer depending on SDK version)
    const allPeers = localPeer ? [localPeer, ...peers.filter(p => p.id !== localPeer.id)] : peers;

    return allPeers.filter((p) => {
      const hmsRole = p.roleName ?? '';

      // Broadcasters (admin/host/moderator) → always show in stage
      if (hmsRole === 'broadcaster') return true;

      // Speakers (viewer-on-stage) → show only when approved to go live
      if (hmsRole === 'viewer-on-stage') {
        // Local speaker: use React state (metadata update may lag)
        if (p.isLocal) return requestStatus === 'live';
        // Remote speaker: read from metadata
        try {
          const meta = JSON.parse(p.metadata || '{}');
          return meta.status === 'live';
        } catch { return false; }
      }

      return false;
    });
  })();

  const broadcastingNow = presentingPeers.length > 0;

  // Show broadcaster controls if:
  //  - admin/host/moderator (broadcaster role in 100ms)
  //  - OR speaker approved to go live (viewer-on-stage, requestStatus === 'live')
  const localHmsRole = localPeer?.roleName ?? '';
  const showBroadcasterControls =
    isConnected &&
    (localHmsRole === 'broadcaster' ||
      (localHmsRole === 'viewer-on-stage' && requestStatus === 'live'));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">Main Stage</h1>
            {isConnected && broadcastingNow && (
              <Badge className="bg-red-500 gap-1.5 px-3 py-1 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                LIVE
              </Badge>
            )}
            {!isConnected && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting…
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-1 text-sm">
            {isHost
              ? 'Host control interface — manage speakers and the live stage'
              : isPureSpeaker
                ? 'Request stage access and go live in front of the audience'
                : isModerator
                  ? 'Moderator view — manage Q&A and audience interaction'
                  : 'Watch live keynotes, panel discussions, and presentations'}
          </p>
        </div>

        {/* Queue count badge for hosts */}
        {isHost && speakerQueue.filter((i) => i.status !== 'live').length > 0 && (
          <Badge className="bg-amber-500 text-white gap-1.5 text-sm px-3 py-1.5 animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            {speakerQueue.filter((i) => i.status !== 'live').length} speaker{speakerQueue.filter((i) => i.status !== 'live').length > 1 ? 's' : ''} waiting
          </Badge>
        )}
      </div>


      {/* Non-speaker error banner (for hosts/admins) */}
      {roomError && !isPureSpeaker && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {roomError}
          <button
            className="ml-auto text-xs underline"
            onClick={retryConnection}
          >
            Retry
          </button>
        </div>
      )}


      {/* ── SPEAKER: Prominent Stage Request Banner (top, full-width) ──────── */}
      {isPureSpeaker && requestStatus !== 'live' && (
        <StageRequestBanner
          requestStatus={requestStatus}
          isConnected={isConnected}
          isConnecting={hmsConnecting}
          connectionError={roomError}
          isRefreshingUser={isRefreshingUser}
          onRequest={requestToGoLive}
          onLeave={stopStreaming}
          onRetry={retryConnection}
          onRefreshSession={handleRefreshSession}
          userName={user?.name}
          isApproved={user?.isApproved ?? false}
        />

      )}

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Left / Main Column ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Video player */}
          <Card className="overflow-hidden border-[--color-border]">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">

                {!isConnected ? (
                  <div className="flex flex-col items-center gap-3 text-white">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Connecting to stage…</p>
                  </div>

                ) : screenSharePeer ? (
                  <ScreenShareView peer={screenSharePeer} />

                ) : presentingPeers.length === 1 ? (
                  <PeerStageVideo peer={presentingPeers[0]} />

                ) : presentingPeers.length > 1 ? (
                  <div
                    className={`grid gap-2 p-2 bg-gray-950 w-full h-full ${presentingPeers.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2 md:grid-cols-3'
                      }`}
                  >
                    {presentingPeers.map((p) => (
                      <div
                        key={p.id}
                        className="relative w-full min-h-[140px] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center"
                      >
                        <PeerStageVideo peer={p} />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] text-white font-medium">
                          {p.name} {p.isLocal ? '(You)' : ''}
                        </div>
                      </div>
                    ))}
                  </div>

                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                      <Radio className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold">Stage is Offline</h3>
                    <p className="text-sm text-gray-400 text-center mt-1 max-w-xs">
                      {isPureSpeaker
                        ? 'Request access above to go live on this stage.'
                        : 'Waiting for speakers or hosts to go live.'}
                    </p>
                  </div>
                )}

                {/* LIVE badge overlay */}
                {isConnected && broadcastingNow && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    LIVE
                  </div>
                )}

                {/* Peer count */}
                {isConnected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {peers.length} connected
                  </div>
                )}
              </div>

              {/* Session info */}
              {liveSession && (
                <div className="p-4 border-t border-[--color-border]">
                  <h2 className="text-lg font-bold">{liveSession.title}</h2>
                  <p className="text-[--color-text-secondary] mt-0.5 text-sm">{liveSession.description}</p>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
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

          {/* ── SPEAKER LIVE: Broadcaster Controls ──────────────────────── */}
          {showBroadcasterControls && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <Badge className="bg-blue-600 text-white text-xs">Broadcasting</Badge>
                    <span className="text-sm font-medium text-[--color-text-secondary]">
                      Audio · Video · Screen Share
                    </span>
                  </div>
                  {isPureSpeaker && requestStatus === 'live' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={stopStreaming}
                      className="gap-2 text-xs h-8"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Leave Stage
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant={isAudioEnabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={toggleAudio}
                    className="gap-2"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button
                    variant={isVideoEnabled ? 'default' : 'secondary'}
                    size="sm"
                    onClick={toggleVideo}
                    className="gap-2"
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isVideoEnabled ? 'Stop Cam' : 'Start Cam'}
                  </Button>
                  <Button
                    variant={amIScreenSharing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={toggleScreen}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
                  </Button>
                  {isOrganizer && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => hmsActions.endRoom(false, 'Stage ended by organizer')}
                    >
                      End Stage
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {authorities.length > 0 && <ControlAuthorityIndicator authorities={authorities} />}
          {(isHost || isOrganizer) && (
            <AdvancedTimer initialSeconds={3600} type="session" canControl={isOrganizer} />
          )}
          {(isHost || isModerator || isOrganizer) && <OperationalComms />}
          {isAdmin && <EmergencyControls />}

          {/* Speaker Queue — only visible to hosts/admins */}
          {isHost && (
            <QueueManagement
              items={speakerQueue}
              type="speaker"
              canManage={isHost}
              onMakeLive={makeSpeakerLive}
              onStatusChange={(id, ns) => changeSpeakerStatus(id, ns)}
              onReorder={(items) => setSpeakerQueue(items)}
            />
          )}

          {/* Q&A Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Live Q&A
                </CardTitle>
                {isModerator && pendingQs.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {pendingQs.length} pending
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {canAskQ ? 'Submit your questions to the speakers' : 'Q&A available to approved attendees'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canAskQ && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question…"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                    className="text-xs h-8"
                  />
                  <Button size="sm" onClick={submitQuestion} className="h-8 px-3">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {isModerator && pendingQs.length > 0 && (
                <>
                  <div>
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                      Pending ({pendingQs.length})
                    </h4>
                    <ScrollArea className="h-36">
                      <div className="space-y-2 pr-1">
                        {pendingQs.map((q) => (
                          <div key={q.id} className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <p className="text-xs">{q.text}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => moderateQ(q.id, 'approved')}>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => moderateQ(q.id, 'rejected')}>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <h4 className="text-xs font-medium mb-2">Approved ({approvedQs.length})</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-1">
                    {approvedQs.length === 0 ? (
                      <p className="text-xs text-[--color-text-secondary] text-center py-4">No approved questions yet</p>
                    ) : (
                      approvedQs.map((q) => (
                        <div key={q.id} className="p-2 bg-[--color-surface] rounded-lg border border-[--color-border]">
                          <p className="text-xs">{q.text}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                            <span className="text-[10px] text-[--color-text-secondary]">
                              {q.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
