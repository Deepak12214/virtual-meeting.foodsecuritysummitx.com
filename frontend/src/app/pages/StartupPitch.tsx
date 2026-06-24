import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Rocket,
  Clock,
  Users,
  TrendingUp,
  Share2,
  AlertCircle,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
} from 'lucide-react';
import { MOCK_STARTUPS, Startup } from '../data/mockData';

export function StartupPitch() {
  const { user, hasAccess } = useAuth();
  const [startups, setStartups] = useState(MOCK_STARTUPS);
  const [pitchTimer, setPitchTimer] = useState(300); // 5 minutes in seconds

  const canAccessPitch = hasAccess(['startup_participant', 'organizer', 'admin']);
  const isOrganizer = user?.role === USER_ROLES.ORGANIZER || user?.role === USER_ROLES.ADMIN;
  const isModerator = isOrganizer;
  const isStartup = user?.role === USER_ROLES.STARTUP_PARTICIPANT;
  const isInvestor = false;

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
                  Startup pitch sessions are only available to startups and organizers.
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
    setPitchTimer(300);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Startup Pitch Ceremony</h1>
        <p className="text-[--color-text-secondary] mt-2">
          {isStartup && 'Present your startup to potential investors'}
          {isInvestor && 'Discover and connect with innovative startups'}
          {isModerator && 'Manage the pitch ceremony and startup rotation'}
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pitch Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current Pitch */}
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

                  {/* Timer */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="h-4 w-4" />
                      <span className="text-lg font-mono font-semibold">
                        {formatTime(pitchTimer)}
                      </span>
                    </div>
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
                {isModerator && waitingStartups.length > 0 && (
                  <Button className="mt-4" onClick={handleNextStartup}>
                    Start Next Pitch
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Moderator Controls */}
          {isModerator && currentStartup && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Moderator Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPitchTimer((prev) => prev + 60)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    +1 min
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPitchTimer((prev) => prev + 120)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    +2 min
                  </Button>
                  <Button variant="default" size="sm" onClick={handleNextStartup}>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Startup
                  </Button>
                  <Button variant="destructive" size="sm">
                    End Ceremony
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Up Next ({waitingStartups.length})</span>
                {isModerator && (
                  <Button size="sm" variant="ghost">
                    Reorder
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {waitingStartups.length === 0 ? (
                    <p className="text-sm text-[--color-text-secondary] text-center py-8">
                      No startups in queue
                    </p>
                  ) : (
                    waitingStartups.map((startup, index) => (
                      <div
                        key={startup.id}
                        className="flex items-start gap-3 p-3 bg-[--color-surface] rounded-lg border border-[--color-border]"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[--color-primary] text-white text-xs font-semibold">
                          {index + 1}
                        </div>
                        <img
                          src={startup.logo}
                          alt={startup.name}
                          className="w-10 h-10 rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{startup.name}</p>
                          <p className="text-xs text-[--color-text-secondary] truncate">
                            {startup.industry}
                          </p>
                          <p className="text-xs text-green-600 mt-1">{startup.seeking}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Completed */}
          {completedStartups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Completed ({completedStartups.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {completedStartups.map((startup) => (
                      <div
                        key={startup.id}
                        className="flex items-center gap-2 p-2 bg-[--color-surface] rounded-lg"
                      >
                        <img
                          src={startup.logo}
                          alt={startup.name}
                          className="w-8 h-8 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{startup.name}</p>
                          <p className="text-xs text-[--color-text-secondary]">
                            {startup.industry}
                          </p>
                        </div>
                      </div>
                    ))}
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
