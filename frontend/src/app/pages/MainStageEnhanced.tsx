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
  selectIsPeerAudioEnabled,
  selectIsPeerVideoEnabled,
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
import { LiveQA } from '../components/LiveQA';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { toast } from 'sonner';
import { fetchMainStageRoom, fetchJoinToken, type Meeting } from '../services/meetingService';

interface StageOfflineScreenProps {
  scheduledTime?: string | Date;
  status?: string;
  defaultDescription?: string;
  className?: string;
}

export function StageOfflineScreen({ scheduledTime, status, defaultDescription, className = '' }: StageOfflineScreenProps) {
  const [countdownText, setCountdownText] = useState('');
  const [isFutureScheduled, setIsFutureScheduled] = useState(false);

  useEffect(() => {
    if (!scheduledTime || status !== 'scheduled') {
      setIsFutureScheduled(false);
      return;
    }

    const targetDate = new Date(scheduledTime);
    const updateCountdown = () => {
      const now = new Date();
      if (targetDate > now) {
        setIsFutureScheduled(true);
        const diff = targetDate.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setIsFutureScheduled(false);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [scheduledTime, status]);

  const formattedStartTime = scheduledTime 
    ? new Date(scheduledTime).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '';

  return (
    <div className={`flex flex-col items-center justify-center text-white p-6 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-lg animate-pulse">
        <Radio className="w-8 h-8 text-indigo-500" />
      </div>
      
      {isFutureScheduled ? (
        <div className="text-center space-y-4 max-w-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Scheduled Live Stream
            </span>
            <h3 className="text-2xl font-bold tracking-tight mt-2">Stage goes live in</h3>
          </div>
          
          <div className="text-4xl font-mono font-extrabold tracking-wider text-indigo-400 drop-shadow-md bg-black/30 px-6 py-3 rounded-2xl border border-white/5 inline-block">
            {countdownText}
          </div>
          
          <p className="text-sm text-gray-400">
            Starting at: <span className="font-semibold text-gray-200">{formattedStartTime}</span>
          </p>
        </div>
      ) : (
        <div className="text-center max-w-sm">
          <h3 className="text-xl font-bold tracking-tight">Stage is Offline</h3>
          <p className="text-sm text-gray-400 mt-2">
            {defaultDescription || "This stage is currently offline. Please check back later or view the scheduled sessions in the lobby."}
          </p>
        </div>
      )}
    </div>
  );
}

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

  return <video ref={videoRef as any} autoPlay playsInline muted={peer.isLocal} className="w-full h-full object-cover" />;
}

function ScreenShareView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef as any} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ─── Presenting Peer Video Tile with Admin Controls ──────────────────────────

function PresentingPeerTile({
  peer,
  isAdminOrOrganizer,
  hmsActions,
  onRemove,
}: {
  peer: HMSPeer;
  isAdminOrOrganizer: boolean;
  hmsActions: ReturnType<typeof useHMSActions>;
  onRemove: (peerId: string) => void;
}) {
  const isAudioOn = useHMSStore(selectIsPeerAudioEnabled(peer.id));
  const isVideoOn = useHMSStore(selectIsPeerVideoEnabled(peer.id));

  const handleToggleMuteAudio = async () => {
    if (!peer.audioTrack) return;
    try {
      await hmsActions.setRemoteTrackEnabled(peer.audioTrack, !isAudioOn);
      toast.success(`${peer.name}'s audio has been ${isAudioOn ? 'muted' : 'unmuted'}`);
    } catch {
      toast.error('Failed to change remote audio state');
    }
  };

  const handleToggleMuteVideo = async () => {
    if (!peer.videoTrack) return;
    try {
      await hmsActions.setRemoteTrackEnabled(peer.videoTrack, !isVideoOn);
      toast.success(`${peer.name}'s video has been ${isVideoOn ? 'stopped' : 'started'}`);
    } catch {
      toast.error('Failed to change remote video state');
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center group">
      <PeerStageVideo peer={peer} />

      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] text-white font-medium flex items-center gap-1.5">
        <span>{peer.name} {peer.isLocal ? '(You)' : ''}</span>
        {!isAudioOn && <MicOff className="w-3 h-3 text-red-500" />}
        {!isVideoOn && <VideoOff className="w-3 h-3 text-red-500" />}
      </div>

      {isAdminOrOrganizer && !peer.isLocal && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-white/10 text-white"
            onClick={handleToggleMuteAudio}
            title={isAudioOn ? 'Mute Speaker Audio' : 'Request Unmute Audio'}
          >
            {isAudioOn ? <Mic className="w-3.5 h-3.5 text-green-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-white/10 text-white"
            onClick={handleToggleMuteVideo}
            title={isVideoOn ? 'Stop Speaker Video' : 'Request Start Video'}
          >
            {isVideoOn ? <Video className="w-3.5 h-3.5 text-green-400" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-400 text-white"
            onClick={() => onRemove(peer.id)}
            title="Remove from Stage"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
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
  isMeetingActive: boolean;
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
  isMeetingActive,
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
                : !isMeetingActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : requestStatus === 'pending' ? 'bg-indigo-500/20 text-indigo-400'
                    : requestStatus === 'rejected' ? 'bg-red-500/20 text-red-400'
                      : isConnected && isApproved ? 'bg-green-500/15 text-green-400'
                        : 'bg-gray-700/50 text-gray-400'
              }`}>
              {hasError ? <XCircle className="w-5 h-5" />
                : connecting ? <Loader2 className="w-5 h-5 animate-spin" />
                  : !isMeetingActive ? <Radio className="w-5 h-5 text-amber-500" />
                    : requestStatus === 'pending' ? <Loader2 className="w-5 h-5 animate-spin" />
                      : requestStatus === 'rejected' ? <XCircle className="w-5 h-5" />
                        : <Radio className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {hasError ? 'Connection Failed'
                  : connecting ? 'Connecting to Stage Server…'
                    : !isMeetingActive ? 'Stage is Offline'
                      : requestStatus === 'pending' ? 'Waiting for Stage Access…'
                        : requestStatus === 'rejected' ? 'Stage Access Declined'
                          : isConnected ? 'Join Main Stage'
                            : 'Stage Server Offline'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasError ? connectionError
                  : connecting ? 'Please wait — establishing secure connection…'
                    : !isMeetingActive ? 'You can only request to join once the stream goes live.'
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
                disabled={!isConnected || !isApproved || !isMeetingActive}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm font-semibold disabled:opacity-40 shadow-lg shadow-indigo-500/20"
                title={!isApproved ? 'Account not yet approved by admin' : !isMeetingActive ? 'Stage is offline' : !isConnected ? 'Connecting to server…' : ''}
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
              <Button onClick={onRequest} disabled={!isConnected || !isMeetingActive} variant="outline"
                className="text-sm border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                title={!isMeetingActive ? 'Stage is offline' : ''}
              >
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

function ParticipantMediaStatus({ peerId }: { peerId: string }) {
  const isAudioOn = useHMSStore(selectIsPeerAudioEnabled(peerId));
  const isVideoOn = useHMSStore(selectIsPeerVideoEnabled(peerId));
  return (
    <div className="flex items-center gap-1">
      {isAudioOn ? (
        <Mic className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <MicOff className="h-3.5 w-3.5 text-red-400" />
      )}
      {isVideoOn ? (
        <Video className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <VideoOff className="h-3.5 w-3.5 text-red-400" />
      )}
    </div>
  );
}

// ─── MainStageEnhanced Page ───────────────────────────────────────────────────

export function MainStageEnhanced() {
  const { user, hasAccess, refreshUser } = useAuth();

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



  // Role checks
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost = user?.role === 'host' || isOrganizer;
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isSpeaker = user?.role === 'speaker' || isHost;
  const canAskQ = hasAccess(['attendee', 'startup_participant', 'exhibitor', 'sponsor', 'speaker', 'organizer', 'admin', 'host', 'moderator']);

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
  ];

  // ── 1. Load Main Stage room (polling every 5 seconds for status updates) ──────
  useEffect(() => {
    setRoomError(null);
    const getRoom = () => {
      fetchMainStageRoom()
        .then(setStageMeeting)
        .catch((err) => {
          console.error('Failed to load Main Stage room:', err);
          setRoomError('Could not load Main Stage room. Please refresh.');
        });
    };

    getRoom();
    const interval = setInterval(getRoom, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Join HMS room (with retry support + 15s timeout) ──────────────────────
  useEffect(() => {
    if (!stageMeeting || !user) return;
    if (user.role === 'attendee') return;
    if (stageMeeting.status !== 'active') {
      hmsActions.leave().catch(() => {});
      return;
    }
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
      hmsActions.leave().catch(() => {});
    };
  }, [stageMeeting?._id, stageMeeting?.id, stageMeeting?.status, user, connectionAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep isConnectedRef in sync with live isConnected state (fixes stale closure in setTimeout)
  useEffect(() => {
    isConnectedRef.current = isConnected || false;
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

  // ── 4b. Sync platformRole to metadata & Auto-mute admin if speakers are live ──
  useEffect(() => {
    if (isConnected && localPeer && user) {
      hmsActions.changeMetadata(
        JSON.stringify({
          platformRole: user.role,
          name: user.name,
          inQueue: isPureSpeaker ? requestStatus !== 'none' : false,
          status: isPureSpeaker ? (requestStatus === 'live' ? 'live' : 'viewer') : 'live'
        })
      ).catch((err) => console.error('Error setting metadata on join:', err));
    }
  }, [isConnected, localPeer?.id, user, isPureSpeaker, requestStatus, hmsActions]);

  useEffect(() => {
    if ((isAdmin || isOrganizer) && isConnected) {
      // Find if there is any active live speaker (non-admin/non-organizer peer live on stage)
      const hasLiveSpeaker = peers.some((p) => {
        if (p.isLocal) return false;
        if (p.roleName === 'viewer-on-stage') {
          try {
            const meta = JSON.parse(p.metadata || '{}');
            return meta.status === 'live';
          } catch {
            return false;
          }
        }
        return false;
      });

      if (hasLiveSpeaker) {
        if (isAudioEnabled) hmsActions.setLocalAudioEnabled(false);
        if (isVideoEnabled) hmsActions.setLocalVideoEnabled(false);
      }
    }
  }, [peers, isConnected, isAudioEnabled, isVideoEnabled, isAdmin, isOrganizer, hmsActions]);

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
            if (newStatus === 'rejected' || newStatus === 'not-ready') return prev.filter((i) => i.id !== targetId);
            return prev.map((i) => (i.id === targetId ? { ...i, status: newStatus } : i));
          });

          // If this message targets ME (local speaker)
          if (localPeer && localPeer.id === targetId) {
            if (newStatus === 'live') {
              setRequestStatus('live');
              hmsActions.setLocalAudioEnabled(true);
              hmsActions.setLocalVideoEnabled(true);
              hmsActions.changeMetadata(
                JSON.stringify({
                  inQueue: true,
                  status: 'live',
                  title: user?.company || user?.name || 'Speaker',
                  platformRole: user?.role
                })
              ).catch(() => {});
              toast.success('🎉 You are now LIVE on Main Stage!');
            } else if (newStatus === 'not-ready' || newStatus === 'rejected') {
              setRequestStatus(newStatus === 'rejected' ? 'rejected' : 'none');
              requestSentRef.current = false;
              hmsActions.setLocalAudioEnabled(false);
              hmsActions.setLocalVideoEnabled(false);
              hmsActions.changeMetadata(
                JSON.stringify({
                  inQueue: false,
                  status: 'not-ready',
                  platformRole: user?.role
                })
              ).catch(() => {});
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
          platformRole: user?.role
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
      await hmsActions.changeMetadata(JSON.stringify({ inQueue: false, status: 'not-ready', platformRole: user?.role }));
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
      // Find peer in room to check current role
      const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
      if (!peer || peer.roleName !== 'viewer-on-stage') {
        // Only change role if they are not already viewer-on-stage
        await hmsActions.changeRoleOfPeer(peerId, 'viewer-on-stage', true);
      }
      
      // Send broadcast message to bring them live
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: 'live' }),
        'stage-control'
      );
      setSpeakerQueue((prev) => prev.map((i) => (i.id === peerId ? { ...i, status: 'live' } : i)));
      toast.success('Speaker promoted to live!');
    } catch (err) {
      console.error('Failed to promote speaker:', err);
      toast.error('Failed to promote speaker');
    }
  };

  /** Admin changes a speaker's queue status */
  const changeSpeakerStatus = async (peerId: string, newStatus: 'ready' | 'not-ready') => {
    try {
      if (newStatus === 'not-ready') {
        const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
        if (!peer || peer.roleName !== 'viewer') {
          // Change role back to viewer
          await hmsActions.changeRoleOfPeer(peerId, 'viewer', true);
        }
      }
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: newStatus }),
        'stage-control'
      );
      if (newStatus === 'not-ready') {
        setSpeakerQueue((prev) => prev.filter((i) => i.id !== peerId));
      }
    } catch (err) {
      console.error('Failed to update speaker status:', err);
      toast.error('Failed to update status');
    }
  };

  /** Admin removes a speaker from stage and resets them in the queue */
  const removeSpeakerFromStage = async (peerId: string) => {
    try {
      const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
      if (!peer || peer.roleName !== 'viewer') {
        // Change role back to viewer
        await hmsActions.changeRoleOfPeer(peerId, 'viewer', true);
      }
      // Notify peer
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: 'not-ready' }),
        'stage-control'
      );
      // Update local speakerQueue status to filter out the speaker
      setSpeakerQueue((prev) => prev.filter((i) => i.id !== peerId));
      toast.success('Speaker removed from stage');
    } catch (err) {
      console.error('Failed to remove speaker from stage:', err);
      toast.error('Failed to remove speaker from stage');
    }
  };



  // ── Media handlers ──────────────────────────────────────────────────────────
  const toggleAudio = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try { await hmsActions.setScreenShareEnabled(!amIScreenSharing); }
    catch { toast.error('Failed to share screen'); }
  };

  const screenSharePeer = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);

  // ─── peers who should appear on the video stage ────────────────────────────
  const presentingPeers = (() => {
    const allPeers = localPeer ? [localPeer, ...peers.filter(p => p.id !== localPeer.id)] : peers;

    // Helper to determine if a peer is a live speaker/presenter (non-admin)
    const isLiveSpeaker = (p: HMSPeer) => {
      if (p.roleName === 'viewer-on-stage') {
        if (p.isLocal) return requestStatus === 'live';
        try {
          const meta = JSON.parse(p.metadata || '{}');
          return meta.status === 'live';
        } catch {
          return false;
        }
      }
      if (p.roleName === 'broadcaster') {
        try {
          const meta = JSON.parse(p.metadata || '{}');
          const pRole = meta.platformRole;
          if (pRole === 'admin' || pRole === 'organizer') return false;
        } catch {}
        if (p.isLocal && (isAdmin || isOrganizer)) return false;
        return true;
      }
      return false;
    };

    // Check if there is any live speaker currently in the room
    const hasLiveSpeakers = allPeers.some(p => isLiveSpeaker(p));

    return allPeers.filter((p) => {
      return isLiveSpeaker(p);
    });
  })();

  const broadcastingNow = presentingPeers.length > 0;

  // Determine who is currently presenting or fallback to admin
  const activePresenterDetails = (() => {
    if (presentingPeers.length > 0) {
      const livePeer = presentingPeers[0];
      try {
        const meta = JSON.parse(livePeer.metadata || '{}');
        return {
          name: livePeer.name,
          role: meta.platformRole || (livePeer.roleName === 'broadcaster' ? 'organizer' : 'speaker'),
          company: meta.company || 'Independent',
          isLive: true,
        };
      } catch (e) {
        return {
          name: livePeer.name,
          role: livePeer.roleName === 'broadcaster' ? 'organizer' : 'speaker',
          company: 'Independent',
          isLive: true,
        };
      }
    }

    // Fallback: Default admin/creator details
    return {
      name: stageMeeting?.creator?.name || 'Administrator',
      role: stageMeeting?.creator?.role || 'organizer',
      company: 'Event Host / Administrator',
      isLive: false,
    };
  })();

  // Show broadcaster controls if admin/host/moderator AND there are no live speakers, or if speaker is live
  const localHmsRole = localPeer?.roleName ?? '';

  const hasLiveSpeakers = presentingPeers.some(p => {
    let meta: any = {};
    try { meta = JSON.parse(p.metadata || '{}'); } catch {}
    const platformRole = meta.platformRole || (p.isLocal ? user?.role : '');
    return platformRole !== 'admin' && platformRole !== 'organizer';
  });

  const showBroadcasterControls =
    isConnected &&
    (
      ((localHmsRole === 'broadcaster' || isAdmin || isOrganizer) && !hasLiveSpeakers) ||
      (localHmsRole === 'viewer-on-stage' && requestStatus === 'live')
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{stageMeeting?.title || 'Main Stage'}</h1>
            {stageMeeting?.status === 'active' ? (
              isConnected && broadcastingNow && (
                <Badge className="bg-red-500 gap-1.5 px-3 py-1 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  LIVE
                </Badge>
              )
            ) : stageMeeting?.status === 'scheduled' && new Date(stageMeeting.scheduledTime) > new Date() ? (
              <Badge variant="secondary" className="bg-amber-500/10 border-amber-500/25 text-amber-500 gap-1.5 text-xs font-semibold px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                SCHEDULED
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-rose-500/10 border-rose-500/25 text-rose-500 gap-1.5 text-xs font-semibold px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                STAGE OFFLINE
              </Badge>
            )}
            {!isConnected && stageMeeting?.status === 'active' && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting…
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-1 text-sm">
            {stageMeeting?.description || (
              isHost
                ? 'Host control interface — manage speakers and the live stage'
                : isPureSpeaker
                  ? 'Request stage access and go live in front of the audience'
                  : isModerator
                    ? 'Moderator view — manage Q&A and audience interaction'
                    : 'Watch live keynotes, panel discussions, and presentations'
            )}
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
          isMeetingActive={stageMeeting?.status === 'active'}
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

                {user?.role === 'attendee' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 bg-gradient-to-br from-gray-955 via-slate-900 to-gray-955">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-lg">
                      <AlertCircle className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-red-400">Access Restricted</h3>
                    <p className="text-sm text-gray-400 text-center mt-2 max-w-sm">
                      As an attendee, you cannot join the Main Stage live meeting call. However, you can submit questions for the session in the Q&A panel on the right.
                    </p>
                  </div>
                ) : stageMeeting && stageMeeting.status !== 'active' ? (
                  <StageOfflineScreen
                    scheduledTime={stageMeeting.scheduledTime}
                    status={stageMeeting.status}
                    defaultDescription={stageMeeting.description}
                    className="absolute inset-0"
                  />
                ) : !isConnected ? (
                  <div className="flex flex-col items-center gap-3 text-white">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Connecting to stage…</p>
                  </div>

                ) : screenSharePeer ? (
                  <ScreenShareView peer={screenSharePeer} />

                ) : presentingPeers.length > 0 ? (
                  <div
                    className={`grid gap-2 p-2 bg-gray-950 w-full h-full ${
                      presentingPeers.length === 1
                        ? 'grid-cols-1'
                        : presentingPeers.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2 md:grid-cols-3'
                    }`}
                  >
                    {presentingPeers.map((p) => (
                      <PresentingPeerTile
                        key={p.id}
                        peer={p}
                        isAdminOrOrganizer={isAdmin || isOrganizer}
                        hmsActions={hmsActions}
                        onRemove={removeSpeakerFromStage}
                      />
                    ))}
                  </div>

                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                      <Radio className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-indigo-400">Stage is Online</h3>
                    <p className="text-sm text-gray-400 text-center mt-1 max-w-xs">
                      {isPureSpeaker
                        ? 'Request access above to go live on this stage.'
                        : 'Waiting for speakers or hosts to join screen.'}
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

              {/* Presenter details below video */}
              <div className="p-6 border-t border-[--color-border] bg-[--color-surface]">
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Initials Avatar */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold font-sans shadow-md border ${
                      activePresenterDetails.isLive
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/25 animate-pulse'
                        : 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600/35'
                    }`}>
                      {activePresenterDetails.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>

                    <div className="space-y-1 min-w-[200px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold tracking-tight text-[--color-text]">
                          {activePresenterDetails.name}
                        </h2>
                        {activePresenterDetails.isLive ? (
                          <Badge className="bg-red-500 text-white font-semibold text-[10px] px-2 py-0.5 animate-pulse">
                            LIVE PRESENTER
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-[--color-text-secondary] border-[--color-border]">
                            STAGE OWNER
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-indigo-500">
                        {activePresenterDetails.company}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 mt-2 border-t border-[--color-border]/50">
                    {[
                      { label: 'Role', value: activePresenterDetails.role.replace('_', ' ').toUpperCase() },
                      { label: 'Company / Organization', value: activePresenterDetails.company },
                      { label: 'Status', value: activePresenterDetails.isLive ? 'ACTIVE ON STAGE' : 'STANDBY / HOST' }
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <p className="text-[10px] font-bold text-[--color-text-secondary] uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-[--color-text]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
          {(isHost || isOrganizer) && (
            <AdvancedTimer 
              type="session" 
              canControl={isOrganizer} 
              status={stageMeeting?.status}
              scheduledTime={stageMeeting?.scheduledTime}
            />
          )}

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

          {/* Live Q&A Panel */}
          <LiveQA
            meetingId={stageMeeting?._id || stageMeeting?.id || ''}
            isModerator={isModerator}
            canAskQ={canAskQ}
          />

          {/* Active Participants Panel */}
          {isConnected && (
            <Card className="border-[--color-border] bg-[--color-surface-card] text-[--color-text]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span>Participants ({peers.length + (localPeer ? 1 : 0)})</span>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Users currently joined in this session
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-48 px-4 pb-4">
                  <div className="space-y-2.5">
                    {/* Render local peer first */}
                    {localPeer && (
                      <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 animate-fade-in">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                            {localPeer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-white">
                              {localPeer.name} (You)
                            </p>
                            <p className="text-[9px] text-gray-400 capitalize">
                              {(user?.role || 'attendee').replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAudioEnabled ? (
                            <Mic className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <MicOff className="h-3.5 w-3.5 text-red-400" />
                          )}
                          {isVideoEnabled ? (
                            <Video className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <VideoOff className="h-3.5 w-3.5 text-red-400" />
                          )}
                        </div>
                      </div>
                    )}
                    {/* Render other peers */}
                    {peers.filter(p => p.id !== localPeer?.id).map((peer) => {
                      let peerRole = 'attendee';
                      try {
                        const meta = JSON.parse(peer.metadata || '{}');
                        peerRole = meta.platformRole || (peer.roleName === 'broadcaster' ? 'organizer' : 'attendee');
                      } catch {
                        peerRole = peer.roleName === 'broadcaster' ? 'organizer' : 'attendee';
                      }

                      return (
                        <div key={peer.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 animate-fade-in">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-gray-400">
                              {peer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate text-white">
                                {peer.name}
                              </p>
                              <p className="text-[9px] text-gray-400 capitalize">
                                {peerRole.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                          <ParticipantMediaStatus peerId={peer.id} />
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
