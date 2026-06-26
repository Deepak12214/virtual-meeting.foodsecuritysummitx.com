import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';
import { useBlocker } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
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
  selectTracksMap,
  useVideo,
  HMSPeer,
  useHMSNotifications,
  HMSNotificationTypes,
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
  Clock,
  Loader2,
  XCircle,
  CheckCircle,
  ArrowRight,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
} from 'lucide-react';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { toast } from 'sonner';
import { fetchPitchRoom, fetchJoinToken, submitLobbyRequest, getLobbyStatus, getLobbyRequests, admitLobbyParticipant, denyLobbyParticipant, type Meeting } from '../services/meetingService';

// ─── Offline screen component ──────────────────────────────────────────────────

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
    <div className={`flex flex-col items-center justify-center text-white p-6 bg-gradient-to-br from-gray-955 via-slate-900 to-gray-955 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-lg animate-pulse">
        <Radio className="w-8 h-8 text-indigo-500" />
      </div>

      {isFutureScheduled ? (
        <div className="text-center space-y-4 max-w-sm font-sans">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Scheduled Live Stream
            </span>
            <h3 className="text-2xl font-bold tracking-tight mt-2 text-white">Stage goes live in</h3>
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
            {defaultDescription || "The Startup Pitch Stage is currently offline. Please check back later or view the scheduled sessions in the lobby."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Peer Video Tiles ─────────────────────────────────────────────────────────

function PeerPitchVideo({ peer }: { peer: HMSPeer }) {
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

function ScreenSharePitchView({ peer }: { peer: HMSPeer }) {
  const trackId = peer.auxiliaryTracks?.[0];
  const { videoRef } = useVideo({ trackId });
  return <video ref={videoRef as any} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

function PresentingPitchPeerTile({
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
      <PeerPitchVideo peer={peer} />

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
            title={isAudioOn ? 'Mute Presenter Audio' : 'Request Unmute Audio'}
          >
            {isAudioOn ? <Mic className="w-3.5 h-3.5 text-green-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-white/10 text-white"
            onClick={handleToggleMuteVideo}
            title={isVideoOn ? 'Stop Presenter Video' : 'Request Start Video'}
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

// ─── Pitch Request Banner ─────────────────────────────────────────────────────

interface PitchRequestBannerProps {
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

function PitchRequestBanner({
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
}: PitchRequestBannerProps) {
  if (requestStatus === 'live') return null;

  const hasError = !!connectionError;
  const connecting = isConnecting && !isConnected && !hasError;

  return (
    <div className="space-y-2">
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
                  : connecting ? 'Connecting to Pitch Stage Server…'
                    : !isMeetingActive ? 'Pitch Stage is Offline'
                      : requestStatus === 'pending' ? 'Waiting for Stage Access…'
                        : requestStatus === 'rejected' ? 'Stage Access Declined'
                          : isConnected ? 'Join Pitch Stage'
                            : 'Stage Server Offline'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasError ? connectionError
                  : connecting ? 'Please wait — establishing secure connection…'
                    : !isMeetingActive ? 'You can only request to join once the stream goes live.'
                      : requestStatus === 'pending' ? 'Organizer notified · You will go live once approved'
                        : requestStatus === 'rejected' ? 'Your request was declined. You may try again.'
                          : isConnected && isApproved ? `Hello ${userName?.split(' ')[0] ?? 'Presenter'} — click Join Stage to start your pitch`
                            : isConnected && !isApproved ? 'Connected — waiting for account approval'
                              : 'Could not reach stage server'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <div className={`hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${isConnected ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : hasError ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
              }`}>
              {isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5 animate-pulse" />}
              {isConnected ? 'Connected' : hasError ? 'Error' : 'Connecting…'}
            </div>

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

            {connecting && !hasError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/30 border border-gray-600/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Connecting…</span>
              </div>
            )}

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

            {!hasError && requestStatus === 'pending' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
                </span>
                <span className="text-xs text-indigo-300 font-medium">In Queue</span>
              </div>
            )}

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

// ─── StartupPitchEnhanced Page ────────────────────────────────────────────────

export function StartupPitchEnhanced() {
  const { user, hasAccess, refreshUser } = useAuth();

  // 100ms hooks
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const amIScreenSharing = useHMSStore(selectIsLocalScreenShared);
  const tracks = useHMSStore(selectTracksMap);

  // Pitch room
  const [pitchMeeting, setPitchMeeting] = useState<Meeting | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [hmsConnecting, setHmsConnecting] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0); // increment to retry
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectedRef = useRef(false); // ref to avoid stale closure in timeout

  // Role checks
  const canAccess = hasAccess([USER_ROLES.STARTUP_PARTICIPANT, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.HOST, USER_ROLES.MODERATOR, USER_ROLES.SPEAKER, USER_ROLES.ATTENDEE, USER_ROLES.SPONSOR, USER_ROLES.EXHIBITOR, USER_ROLES.INVESTOR]);
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  // Lobby / waitlist states for joining the room
  const [joinStatus, setJoinStatus] = useState<'joining' | 'waiting' | 'admitted' | 'denied'>(
    user?.role === USER_ROLES.ADMIN ? 'joining' : 'waiting'
  );
  const [waitingList, setWaitingList] = useState<{ id: string; name: string; userId?: string }[]>([]);
  const isOrganizer = user?.role === USER_ROLES.ORGANIZER || isAdmin;
  const isHost = user?.role === USER_ROLES.HOST || user?.role === USER_ROLES.MODERATOR || isOrganizer;
  const isStartup = user?.role === USER_ROLES.STARTUP_PARTICIPANT;
  const isInvestor = user?.role === USER_ROLES.INVESTOR;

  // A "pure startup participant" is someone who can request to go live (startup, sponsor, exhibitor, investor) and is NOT admin/organizer/host
  const isPureStartup = !!user && [USER_ROLES.STARTUP_PARTICIPANT, USER_ROLES.SPONSOR, USER_ROLES.EXHIBITOR, USER_ROLES.INVESTOR].includes(user.role as any) && !isHost;

  // Store selectors for local media state
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  // Startup queue - updated dynamically from peer metadata & messages
  const [startupQueue, setStartupQueue] = useState<{
    id: string;
    name: string;
    title?: string;
    status: 'ready' | 'not-ready' | 'standby' | 'live';
    duration?: number;
  }[]>([]);

  // Startup participant's own request status
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'live' | 'rejected'>('none');

  // Ref to avoid duplicate queue entries
  const requestSentRef = useRef(false);

  // ── Navigation blocker & confirmation ──────────────────────────────────────────
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      requestStatus === 'live' && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm('Are you sure you want to exit? You are currently live on the stage.');
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (requestStatus === 'live') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to exit?';
        return 'Are you sure you want to exit?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [requestStatus]);

  // Control authority list for the sidebar widget
  const authorities = [
    ...(isAdmin || isOrganizer ? [{ role: user?.role ?? 'admin', name: user?.name ?? 'Admin', mode: 'full' as const }] : []),
  ];

  // ── 1. Load Pitch room (polling every 5 seconds for status updates) ─────────
  useEffect(() => {
    if (!canAccess) return;
    setRoomError(null);

    const getRoom = () => {
      fetchPitchRoom()
        .then(setPitchMeeting)
        .catch((err) => {
          console.error('Failed to load Pitch room:', err);
          setRoomError('Could not load Pitch room. Please refresh.');
        });
    };

    getRoom();
    const interval = setInterval(getRoom, 5000);
    return () => clearInterval(interval);
  }, [canAccess]);

  // ── 2. Join HMS room (with retry support + 20s timeout) ──────────────────────
  useEffect(() => {
    if (!pitchMeeting || !user) return;
    if (pitchMeeting.status !== 'active') {
      hmsActions.leave().catch(() => { });
      return;
    }
    const roomId = pitchMeeting._id ?? pitchMeeting.id;
    if (!roomId) return;

    // Check if the user is authorized to join WebRTC yet (Admin joins directly, others must be admitted)
    const isAdmitted = isAdmin || joinStatus === 'admitted';
    if (!isAdmitted) return;

    let left = false;
    setRoomError(null);
    setHmsConnecting(true);

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
        if (left) {
          console.log('Unmounted during join, leaving pitch stage room...');
          hmsActions.leave().catch(() => { });
        } else {
          setHmsConnecting(false);
        }
      })
      .catch((err) => {
        console.error('HMS pitch join error:', err);
        if (!left) {
          setRoomError(`Pitch connection failed: ${err?.message || 'Unknown error'}. Click Retry.`);
          setHmsConnecting(false);
        }
      });

    return () => {
      left = true;
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      hmsActions.leave().catch(() => { });
    };
  }, [pitchMeeting?._id, pitchMeeting?.id, pitchMeeting?.status, user, connectionAttempt, hmsActions, isAdmin, joinStatus]);

  // Submit join request to lobby for non-admins
  useEffect(() => {
    if (!pitchMeeting || isAdmin || joinStatus !== 'waiting') return;
    const roomId = pitchMeeting._id ?? pitchMeeting.id;
    if (!roomId) return;

    submitLobbyRequest(roomId, user?.id || '')
      .catch((err) => {
        console.error('Failed to submit lobby request for pitch stage:', err);
      });
  }, [pitchMeeting, isAdmin, joinStatus, user?.id]);

  // Poll DB lobby status for non-admins
  useEffect(() => {
    if (joinStatus !== 'waiting' || !pitchMeeting || isAdmin) return;
    const roomId = pitchMeeting._id ?? pitchMeeting.id;
    if (!roomId) return;

    let joiningRoom = false;

    const checkStatus = async () => {
      try {
        const res = await getLobbyStatus(roomId);
        if (res.status === 'approved' && !joiningRoom) {
          joiningRoom = true;
          setJoinStatus('admitted');
          toast.success('🎉 You have been admitted to the Startup Pitch Ceremony!');
        } else if (res.status === 'rejected') {
          setJoinStatus('denied');
          toast.error('❌ Your request to join was declined.');
        }
      } catch (err) {
        console.error('Error polling lobby status for pitch stage:', err);
        joiningRoom = false;
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [joinStatus, pitchMeeting, isAdmin]);

  // Admin periodically fetches current waitlist requests from MongoDB to sync waitlist
  useEffect(() => {
    if (!isAdmin || !isConnected || !pitchMeeting) return;
    const roomId = pitchMeeting._id ?? pitchMeeting.id;
    if (!roomId) return;

    const syncLobbyRequests = async () => {
      try {
        const requests = await getLobbyRequests(roomId);
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
  }, [isAdmin, isConnected, pitchMeeting]);

  const admitPeer = async (peerId: string) => {
    try {
      const waitingPeer = waitingList.find((p) => p.id === peerId);

      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'admit', peerId }),
        'lobby-control'
      );

      const roomId = pitchMeeting?._id ?? pitchMeeting?.id;
      if (waitingPeer?.userId && roomId) {
        await admitLobbyParticipant(roomId, waitingPeer.userId);
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

      const roomId = pitchMeeting?._id ?? pitchMeeting?.id;
      if (waitingPeer?.userId && roomId) {
        await denyLobbyParticipant(roomId, waitingPeer.userId);
      }

      setWaitingList((prev) => prev.filter((p) => p.id !== peerId));
      toast.warning('Participant request denied');
    } catch {
      toast.error('Failed to deny request');
    }
  };

  useEffect(() => {
    isConnectedRef.current = isConnected || false;
    if (isConnected && connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      setHmsConnecting(false);
      setRoomError(null);
    }
  }, [isConnected]);

  const retryConnection = useCallback(() => {
    setRoomError(null);
    setConnectionAttempt((n) => n + 1);
  }, []);

  const handleRefreshSession = useCallback(async () => {
    setIsRefreshingUser(true);
    await refreshUser();
    setIsRefreshingUser(false);
    retryConnection();
  }, [refreshUser, retryConnection]);

  // ── 3. Sync peer metadata for late-joining admins ─────────────────────────────
  useEffect(() => {
    if (!isConnected || !peers || peers.length === 0) return;

    const initialQueue: typeof startupQueue = [];
    peers.forEach((p) => {
      if (p.roleName === 'viewer-on-stage') {
        try {
          const meta = JSON.parse(p.metadata || '{}');
          if (meta.inQueue) {
            initialQueue.push({
              id: p.id,
              name: p.name,
              title: meta.title || 'Startup',
              status: meta.status === 'live' ? 'live' : 'ready',
              duration: 5,
            });
          }
        } catch {
          // ignore
        }
      }
    });

    if (initialQueue.length === 0) return;

    setStartupQueue((prev) => {
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
    if (!isConnected || !localPeer || !isPureStartup) return;
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

  // ── 4b. Sync platformRole to metadata & Auto-mute admin if startups are live ──
  useEffect(() => {
    if (isConnected && localPeer && user) {
      hmsActions.changeMetadata(
        JSON.stringify({
          platformRole: user.role,
          name: user.name,
          company: user.company || '',
          inQueue: isPureStartup ? requestStatus !== 'none' : false,
          status: isPureStartup ? (requestStatus === 'live' ? 'live' : 'viewer') : 'live'
        })
      ).catch((err) => console.error('Error setting metadata on join:', err));
    }
  }, [isConnected, localPeer?.id, user, isPureStartup, requestStatus, hmsActions]);

  useEffect(() => {
    if ((isAdmin || isOrganizer) && isConnected) {
      const hasLiveStartup = peers.some((p) => {
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

      if (hasLiveStartup) {
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
        if (!msg) break;

        if (msg.type === 'lobby-control') {
          let data: any;
          try { data = JSON.parse(msg.message); } catch { break; }

          if (data.action === 'request-join') {
            if (isAdmin) {
              setWaitingList((prev) => {
                if (prev.some((p) => p.id === data.peerId)) return prev;
                return [...prev, { id: data.peerId, name: data.name, userId: data.userId }];
              });
              toast.info(`🔔 ${data.name} is requesting to join the startup pitch stage room`);
            }
          } else if (data.action === 'admit') {
            if (localPeer && localPeer.id === data.peerId) {
              setJoinStatus('admitted');
              toast.success('🎉 You have been admitted to the Startup Pitch Ceremony room!');
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

        if (msg.type !== 'pitch-control') break;

        let data: any;
        try { data = JSON.parse(msg.message); } catch { break; }

        if (data.action === 'join-queue') {
          setStartupQueue((prev) => {
            if (prev.some((item) => item.id === data.peerId)) return prev;
            return [
              ...prev,
              {
                id: data.peerId,
                name: data.name,
                title: data.title || 'Startup',
                status: 'ready',
                duration: 5,
              },
            ];
          });
          if (isHost || isAdmin) {
            toast.info(`🚀 Startup presenter ${data.name} is requesting to join the stage`, {
              duration: 6000,
            });
          }
        }

        if (data.action === 'status-update') {
          const { peerId: targetId, status: newStatus } = data;

          setStartupQueue((prev) => {
            if (newStatus === 'rejected' || newStatus === 'not-ready') return prev.filter((i) => i.id !== targetId);
            return prev.map((i) => (i.id === targetId ? { ...i, status: newStatus } : i));
          });

          if (localPeer && localPeer.id === targetId) {
            if (newStatus === 'live') {
              setRequestStatus('live');
              hmsActions.setLocalAudioEnabled(true);
              hmsActions.setLocalVideoEnabled(true);
              hmsActions.changeMetadata(
                JSON.stringify({
                  inQueue: true,
                  status: 'live',
                  title: user?.company || user?.name || 'Startup',
                  company: user?.company || '',
                  platformRole: user?.role
                })
              ).catch(() => { });
              toast.success('🎉 You are now LIVE on Stage!');
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
              ).catch(() => { });
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
          setStartupQueue((prev) => prev.filter((i) => i.id !== leftPeer.id));
        }
        break;
      }

      default:
        break;
    }
  }, [notification]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const requestToGoLive = async () => {
    if (!localPeer || requestSentRef.current) return;
    try {
      requestSentRef.current = true;
      setRequestStatus('pending');

      await hmsActions.changeMetadata(
        JSON.stringify({
          inQueue: true,
          status: 'ready',
          title: user?.company || user?.name || 'Startup',
          company: user?.company || '',
          platformRole: user?.role
        })
      );

      await hmsActions.sendBroadcastMessage(
        JSON.stringify({
          action: 'join-queue',
          peerId: localPeer.id,
          name: localPeer.name,
          title: user?.company || user?.name || 'Startup',
        }),
        'pitch-control'
      );

      toast.success('Request sent! Waiting for admin to approve.');
    } catch (err) {
      console.error('requestToGoLive error:', err);
      requestSentRef.current = false;
      setRequestStatus('none');
      toast.error('Failed to send request. Please try again.');
    }
  };

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
        'pitch-control'
      );
      toast.success('You left the stage.');
    } catch {
      toast.error('Failed to leave stage');
    }
  };

  const makeStartupLive = async (peerId: string) => {
    try {
      const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
      if (!peer || peer.roleName !== 'viewer-on-stage') {
        await hmsActions.changeRoleOfPeer(peerId, 'viewer-on-stage', true);
      }

      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: 'live' }),
        'pitch-control'
      );
      setStartupQueue((prev) => prev.map((i) => (i.id === peerId ? { ...i, status: 'live' } : i)));
      toast.success('Startup presenter is now live!');
    } catch (err) {
      console.error('Failed to promote startup presenter:', err);
      toast.error('Failed to promote presenter');
    }
  };

  const changeStartupStatus = async (peerId: string, newStatus: 'ready' | 'not-ready') => {
    try {
      if (newStatus === 'not-ready') {
        const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
        if (!peer || peer.roleName !== 'viewer') {
          await hmsActions.changeRoleOfPeer(peerId, 'viewer', true);
        }
      }
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: newStatus }),
        'pitch-control'
      );
      if (newStatus === 'not-ready') {
        setStartupQueue((prev) => prev.filter((i) => i.id !== peerId));
      }
    } catch (err) {
      console.error('Failed to update startup status:', err);
      toast.error('Failed to update status');
    }
  };

  const removeStartupFromStage = async (peerId: string) => {
    try {
      const peer = peers.find((p) => p.id === peerId) || (localPeer?.id === peerId ? localPeer : null);
      if (!peer || peer.roleName !== 'viewer') {
        await hmsActions.changeRoleOfPeer(peerId, 'viewer', true);
      }
      await hmsActions.sendBroadcastMessage(
        JSON.stringify({ action: 'status-update', peerId, status: 'not-ready' }),
        'pitch-control'
      );
      setStartupQueue((prev) => prev.filter((i) => i.id !== peerId));
      toast.success('Startup presenter removed from stage');
    } catch (err) {
      console.error('Failed to remove presenter from stage:', err);
      toast.error('Failed to remove presenter');
    }
  };

  // Access guard
  if (!canAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[--color-text]">Startup Pitch Ceremony</h1>
          <p className="text-[--color-text-secondary] mt-2">Watch innovative startups pitch to investors</p>
        </div>
        <Card className="bg-yellow-500/10 border-yellow-500/20 shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <CardTitle className="text-yellow-700">Access Restricted</CardTitle>
                <CardDescription className="mt-2 text-yellow-600">
                  Startup pitch sessions require an approved account to view.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Media handlers
  const toggleAudio = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  const toggleVideo = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  const toggleScreen = async () => {
    try { await hmsActions.setScreenShareEnabled(!amIScreenSharing); }
    catch { toast.error('Failed to share screen'); }
  };

  const screenSharePeer = peers.find((p) => (p.auxiliaryTracks?.length ?? 0) > 0);

  // Filter presenting peers who are live speakers (not admins/organizers)
  const presentingPeers = (() => {
    const allPeers = localPeer ? [localPeer, ...peers.filter(p => p.id !== localPeer.id)] : peers;

    const isLiveStartup = (p: HMSPeer) => {
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
          // If it is admin, organizer, host, or moderator, they appear on stage ONLY when their camera or microphone is enabled (unmuted)
          if (
            pRole === USER_ROLES.ADMIN ||
            pRole === USER_ROLES.HOST ||
            pRole === USER_ROLES.MODERATOR
          ) {
            const audioTrackEnabled = p.audioTrack ? tracks[p.audioTrack]?.enabled : false;
            const videoTrackEnabled = p.videoTrack ? tracks[p.videoTrack]?.enabled : false;
            return audioTrackEnabled || videoTrackEnabled;
          }
        } catch { }
        return true;
      }
      return false;
    };

    return allPeers.filter((p) => isLiveStartup(p));
  })();

  const broadcastingNow = presentingPeers.length > 0;

  // Determine who is currently presenting or fallback to admin
  // Determine who is currently presenting or fallback to connected Admin/Moderator
  const activePresenterDetails = (() => {
    if (presentingPeers.length > 0) {
      const livePeer = presentingPeers[0];
      try {
        const meta = JSON.parse(livePeer.metadata || '{}');
        return {
          name: livePeer.name,
          role: meta.platformRole || (livePeer.roleName === 'broadcaster' ? 'organizer' : 'startup_participant'),
          company: meta.company || 'Independent',
          isLive: true,
        };
      } catch (e) {
        return {
          name: livePeer.name,
          role: livePeer.roleName === 'broadcaster' ? 'organizer' : 'startup_participant',
          company: 'Independent',
          isLive: true,
        };
      }
    }

    // Fallback: Check connected peers in room for Admin or Moderator
    const allPeers = localPeer ? [localPeer, ...peers.filter(p => p.id !== localPeer.id)] : peers;

    const adminPeer = allPeers.find(p => {
      try {
        const meta = JSON.parse(p.metadata || '{}');
        return meta.platformRole === USER_ROLES.ADMIN;
      } catch {
        return p.isLocal && user?.role === USER_ROLES.ADMIN;
      }
    });

    if (adminPeer) {
      let meta: any = {};
      try { meta = JSON.parse(adminPeer.metadata || '{}'); } catch { }
      return {
        name: adminPeer.name,
        role: meta.platformRole || USER_ROLES.ADMIN,
        company: meta.company || (adminPeer.isLocal ? user?.company : '') || 'Event Host / Administrator',
        isLive: false,
      };
    }

    const moderatorPeer = allPeers.find(p => {
      try {
        const meta = JSON.parse(p.metadata || '{}');
        return meta.platformRole === USER_ROLES.MODERATOR;
      } catch {
        return p.isLocal && user?.role === USER_ROLES.MODERATOR;
      }
    });

    if (moderatorPeer) {
      let meta: any = {};
      try { meta = JSON.parse(moderatorPeer.metadata || '{}'); } catch { }
      return {
        name: moderatorPeer.name,
        role: meta.platformRole || USER_ROLES.MODERATOR,
        company: meta.company || (moderatorPeer.isLocal ? user?.company : '') || 'Event Moderator',
        isLive: false,
      };
    }

    return null;
  })();

  // Presenter Controls visibility
  const localHmsRole = localPeer?.roleName ?? '';
  const hasLiveStartups = presentingPeers.some(p => {
    let meta: any = {};
    try { meta = JSON.parse(p.metadata || '{}'); } catch { }
    const platformRole = meta.platformRole || (p.isLocal ? user?.role : '');
    return platformRole !== 'admin' && platformRole !== 'organizer';
  });

  const showBroadcasterControls =
    isConnected &&
    (
      localHmsRole === 'broadcaster' ||
      isAdmin ||
      isHost ||
      (localHmsRole === 'viewer-on-stage' && requestStatus === 'live')
    );

  // Lobby waiting and denied screens
  if (pitchMeeting?.status === 'active' && !isAdmin && joinStatus === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-2xl relative overflow-hidden rounded-2xl">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-600" />
          
          <CardHeader className="text-center pb-4 pt-6 text-foreground">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Asking to join stage room...</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm text-center">
              You will automatically join the Startup Pitch Stage room as soon as the Admin approves your request.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 text-center pb-8 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border text-left space-y-1 text-foreground">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider font-mono">
                Pitch Stage
              </span>
              <h3 className="text-lg font-extrabold truncate">{pitchMeeting.title}</h3>
              {pitchMeeting.description && <p className="text-xs text-muted-foreground line-clamp-2">{pitchMeeting.description}</p>}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 py-2.5 px-4 rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Please keep this window open while waiting.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pitchMeeting?.status === 'active' && !isAdmin && joinStatus === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4">
        <Card className="w-full max-w-md border-red-500/20 bg-card shadow-2xl relative overflow-hidden rounded-2xl text-center p-8 text-foreground">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold">Request Declined</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            The Admin has declined your request to enter the Startup Pitch Stage room.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* ─── Lobby Waiting Room Popup overlay for Admin ───────────────────── */}
      {isAdmin && waitingList.length > 0 && (
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
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-[--color-text]">{pitchMeeting?.title || 'Startup Pitch Ceremony'}</h1>
            {pitchMeeting?.status === 'active' ? (
              isConnected && broadcastingNow && (
                <Badge className="bg-red-500 gap-1.5 px-3 py-1 text-sm text-white font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  PITCH LIVE
                </Badge>
              )
            ) : pitchMeeting?.status === 'scheduled' && new Date(pitchMeeting.scheduledTime) > new Date() ? (
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
            {!isConnected && pitchMeeting?.status === 'active' && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting…
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-1 text-sm">
            {pitchMeeting?.description || (
              isHost
                ? 'Host control interface — manage startup pitches and live presenters'
                : isStartup
                  ? 'Request stage access and pitch your startup live to investors'
                  : 'Watch innovative startups pitch to investors and answer panel questions'
            )}
          </p>
        </div>

        {isHost && startupQueue.filter((i) => i.status !== 'live').length > 0 && (
          <Badge className="bg-amber-500 text-white gap-1.5 text-sm px-3 py-1.5 animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            {startupQueue.filter((i) => i.status !== 'live').length} startup{startupQueue.filter((i) => i.status !== 'live').length > 1 ? 's' : ''} in queue
          </Badge>
        )}
      </div>

      {roomError && !isPureStartup && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {roomError}
          <button className="ml-auto text-xs underline" onClick={retryConnection}>
            Retry
          </button>
        </div>
      )}

      {/* ── STARTUP: Pitch Request Banner ─────────────────────────────────── */}
      {isPureStartup && requestStatus !== 'live' && (
        <PitchRequestBanner
          requestStatus={requestStatus}
          isConnected={!!isConnected}
          isConnecting={hmsConnecting}
          connectionError={roomError}
          isRefreshingUser={isRefreshingUser}
          onRequest={requestToGoLive}
          onLeave={stopStreaming}
          onRetry={retryConnection}
          onRefreshSession={handleRefreshSession}
          userName={user?.name}
          isApproved={user?.isApproved ?? false}
          isMeetingActive={pitchMeeting?.status === 'active'}
        />
      )}

      {/* ── Main Grid Layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Left/Main Column ───────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="overflow-hidden border-[--color-border] shadow-sm">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">

                {pitchMeeting && pitchMeeting.status !== 'active' ? (
                  <StageOfflineScreen
                    scheduledTime={pitchMeeting.scheduledTime}
                    status={pitchMeeting.status}
                    defaultDescription={pitchMeeting.description}
                    className="absolute inset-0"
                  />
                ) : !isConnected ? (
                  <div className="flex flex-col items-center gap-3 text-white">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Connecting to stage server…</p>
                  </div>
                ) : screenSharePeer ? (
                  <ScreenSharePitchView peer={screenSharePeer} />
                ) : presentingPeers.length > 0 ? (
                  <div
                    className={`grid gap-2 p-2 bg-gray-950 w-full h-full ${presentingPeers.length === 1
                        ? 'grid-cols-1'
                        : presentingPeers.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-2 md:grid-cols-3'
                      }`}
                  >
                    {presentingPeers.map((p) => (
                      <PresentingPitchPeerTile
                        key={p.id}
                        peer={p}
                        isAdminOrOrganizer={isAdmin || isOrganizer}
                        hmsActions={hmsActions}
                        onRemove={removeStartupFromStage}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                      <Radio className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-indigo-400">Pitch Stage is Online</h3>
                    <p className="text-sm text-gray-400 text-center mt-1 max-w-xs">
                      {isPureStartup
                        ? 'Request access above to share your screen and pitch.'
                        : 'Waiting for startup presenters to join screen.'}
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
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{peers.length} connected</span>
                  </div>
                )}
              </div>

              {/* Organizer details */}
              <div className="px-6 py-3.5 border-t border-[--color-border] bg-[--color-surface] text-center text-base md:text-lg text-[--color-text]">
                Organiser{" "}
                <span className="font-bold">(Shubham Parmar)</span> founder of{" "}
                <span className="font-bold">(VertalisX Ventures LLP)</span>
              </div>

              {/* Presenter details below video */}
              {activePresenterDetails && (
                <div className="p-6 border-t border-[--color-border] bg-[--color-surface]">
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Initials Avatar */}
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold font-sans shadow-md border ${activePresenterDetails.isLive
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
              )}
            </CardContent>
          </Card>

          {/* Presenter broadcaster controls */}
          {showBroadcasterControls && (
            <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <Badge className="bg-blue-600 text-white text-xs font-semibold">Broadcasting</Badge>
                    <span className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider">
                      Mic · Cam · Screen Share
                    </span>
                  </div>
                  {isPureStartup && requestStatus === 'live' && (
                    <Button variant="destructive" size="sm" onClick={stopStreaming} className="gap-2 text-xs h-8">
                      <LogOut className="h-3.5 w-3.5" />
                      Leave Stage
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant={isAudioEnabled ? 'default' : 'destructive'} size="sm" onClick={toggleAudio} className="gap-2 text-xs font-bold">
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button variant={isVideoEnabled ? 'default' : 'secondary'} size="sm" onClick={toggleVideo} className="gap-2 text-xs font-bold">
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isVideoEnabled ? 'Stop Cam' : 'Start Cam'}
                  </Button>
                  <Button variant={amIScreenSharing ? 'secondary' : 'outline'} size="sm" onClick={toggleScreen} className="gap-2 text-xs font-bold">
                    <Share2 className="h-4 w-4" />
                    {amIScreenSharing ? 'Stop Share' : 'Share Screen'}
                  </Button>
                  {isOrganizer && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs font-bold"
                      onClick={() => hmsActions.endRoom(false, 'Pitch stage ended by organizer')}
                    >
                      End Stage Room
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Sidebar Column ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Timers Panel */}
          <div className="space-y-3">
            {/* Session Timer (Overall Ceremony Timer) */}
            {(isHost || isOrganizer) && (
              <AdvancedTimer
                type="session"
                canControl={isOrganizer}
                status={pitchMeeting?.status}
                scheduledTime={pitchMeeting?.scheduledTime}
              />
            )}
          </div>

          {/* Startup presenter queue (Admin / Host only) */}
          {isHost && (
            <QueueManagement
              items={startupQueue}
              type="startup"
              canManage={isHost}
              onMakeLive={makeStartupLive}
              onStatusChange={(id, ns) => changeStartupStatus(id, ns)}
              onReorder={(items) => setStartupQueue(items)}
            />
          )}

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
                            <p className="text-xs font-semibold truncate text-[--color-text]">
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
                              <p className="text-xs font-semibold truncate text-[--color-text]">
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
