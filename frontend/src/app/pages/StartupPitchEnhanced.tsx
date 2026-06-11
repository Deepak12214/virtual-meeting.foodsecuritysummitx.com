import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Rocket,
  Clock,
  Users,
  TrendingUp,
  Share2,
  AlertCircle,
  SkipForward,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Radio,
} from 'lucide-react';
import { MOCK_STARTUPS, Startup } from '../data/mockData';
import { ControlAuthorityIndicator } from '../components/ControlAuthorityIndicator';
import { OperationalComms } from '../components/OperationalComms';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { EmergencyControls } from '../components/EmergencyControls';

export function StartupPitchEnhanced() {
  const { user, hasAccess } = useAuth();
  const [startups, setStartups] = useState(MOCK_STARTUPS);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const canAccessPitch = hasAccess(['startup', 'investor', 'moderator', 'host', 'organizer', 'admin']);

  // Role checks
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost = user?.role === 'host' || isOrganizer;
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isStartup = user?.role === 'startup';
  const isInvestor = user?.role === 'investor';

  if (!canAccessPitch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Startup Pitch Ceremony</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Watch innovative startups pitch to investors
          </p>
        </div>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription className="mt-2">
                  Startup pitch sessions are only available to startups, investors, and event moderators.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentStartup = startups.find((s) => s.status === 'pitching');
  const waitingStartups = startups.filter((s) => s.status === 'waiting');
  const completedStartups = startups.filter((s) => s.status === 'completed');

  const handleNextStartup = () => {
    if (!currentStartup) return;

    setStartups(
      startups.map((s) => {
        if (s.id === currentStartup.id) {
          return { ...s, status: 'completed' as const };
        }
        if (s.status === 'waiting') {
          const firstWaiting = waitingStartups[0];
          if (s.id === firstWaiting?.id) {
            return { ...s, status: 'pitching' as const };
          }
        }
        return s;
      })
    );
  };

  // Convert startups to queue format
  const startupQueue = startups.map(s => ({
    id: s.id,
    name: s.name,
    title: s.tagline,
    status: s.status === 'pitching' ? 'live' as const :
            s.status === 'waiting' ? 'ready' as const :
            'ready' as const,
    duration: 5,
  }));

  // Control authorities
  const authorities = [
    ...(isAdmin || isOrganizer
      ? [{ role: user?.role || 'admin', name: user?.name || 'Admin', mode: 'full' as const }]
      : []),
    ...(isHost && !isOrganizer
      ? [{ role: 'host', name: user?.name || 'Host', mode: 'presentation' as const }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Startup Pitch Ceremony</h1>
            {currentStartup && (
              <Badge className="bg-red-500 gap-1 px-3 py-1">
                <Radio className="h-3 w-3 animate-pulse" />
                PITCH LIVE
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-2">
            {isHost && 'Host control interface for startup pitch management'}
            {isStartup && !isHost && 'Present your startup to potential investors'}
            {isInvestor && !isHost && 'Discover and connect with innovative startups'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Startups</CardDescription>
            <CardTitle className="text-2xl">{startups.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pitching Now</CardDescription>
            <CardTitle className="text-2xl">{currentStartup ? 1 : 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>In Queue</CardDescription>
            <CardTitle className="text-2xl">{waitingStartups.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{completedStartups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Pitch Area */}
        <div className="lg:col-span-3 space-y-4">
          {currentStartup ? (
            <Card>
              <CardContent className="p-0">
                {/* Video Area */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={currentStartup.logo}
                      alt={currentStartup.name}
                      className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  </div>

                  {/* Live Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="gap-1 bg-red-500">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      PITCHING LIVE
                    </Badge>
                  </div>

                  {/* Startup Logo */}
                  <div className="absolute bottom-4 left-4">
                    <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                      <img
                        src={currentStartup.logo}
                        alt={currentStartup.name}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div className="text-white">
                        <p className="font-semibold">{currentStartup.name}</p>
                        <p className="text-xs opacity-80">{currentStartup.tagline}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Startup Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{currentStartup.name}</h2>
                    <p className="text-lg text-[--color-text-secondary] mb-4">
                      {currentStartup.tagline}
                    </p>
                    <p className="text-[--color-text-secondary]">
                      {currentStartup.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[--color-border]">
                    <div>
                      <p className="text-xs text-[--color-text-secondary]">Founder</p>
                      <p className="font-medium">{currentStartup.founder}</p>
                      <p className="text-xs text-[--color-text-secondary]">
                        {currentStartup.founderTitle}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[--color-text-secondary]">Industry</p>
                      <p className="font-medium">{currentStartup.industry}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--color-text-secondary]">Stage</p>
                      <p className="font-medium">{currentStartup.stage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[--color-text-secondary]">Seeking</p>
                      <p className="font-medium text-green-600">{currentStartup.seeking}</p>
                    </div>
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
                  {waitingStartups.length > 0
                    ? 'Ready to start the next pitch'
                    : 'All pitches completed'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Host Controls */}
          {isHost && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Pitch Host Controls</Badge>
                  <CardTitle className="text-sm">Startup Session Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Button
                    variant={audioEnabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="gap-2"
                  >
                    {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {audioEnabled ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button
                    variant={videoEnabled ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className="gap-2"
                  >
                    {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    Camera
                  </Button>
                  <Button variant="outline" size="sm">
                    Invite Startup
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNextStartup}
                    disabled={!currentStartup}
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Next Pitch
                  </Button>
                  <Button variant="outline" size="sm">
                    Announce
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organizer Controls */}
          {isOrganizer && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500">Organizer Controls</Badge>
                  <CardTitle className="text-sm">Full Ceremony Authority</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                    Start Ceremony
                  </Button>
                  <Button variant="destructive" size="sm">
                    End Ceremony
                  </Button>
                  <Button variant="outline" size="sm">
                    Reorder Queue
                  </Button>
                  <Button variant="outline" size="sm">
                    Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Control Docks */}
        <div className="lg:col-span-1 space-y-4">
          {/* Control Authority */}
          {authorities.length > 0 && <ControlAuthorityIndicator authorities={authorities} />}

          {/* Pitch Timer */}
          {(isHost || isOrganizer) && currentStartup && (
            <AdvancedTimer
              initialSeconds={300}
              type="pitch"
              canControl={isOrganizer}
            />
          )}

          {/* Operational Comms */}
          {(isHost || isOrganizer) && <OperationalComms />}

          {/* Emergency Controls */}
          {isAdmin && <EmergencyControls />}

          {/* Startup Queue */}
          <QueueManagement
            items={startupQueue.filter(s => s.status !== 'live')}
            type="startup"
            canManage={isHost}
            onMakeLive={(id) => {
              setStartups(
                startups.map((s) =>
                  s.id === id ? { ...s, status: 'pitching' as const } : s
                )
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
