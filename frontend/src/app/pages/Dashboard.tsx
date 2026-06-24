import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, UserRole } from '../constants/roles';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Video, 
  Store, 
  Calendar, 
  Rocket, 
  Clock, 
  Play, 
  Radio, 
  ArrowRight, 
  Activity, 
  Users, 
  Network 
} from 'lucide-react';
import { fetchMeetings, fetchMainStageRoom, fetchPitchRoom, type Meeting } from '../services/meetingService';
import { fetchBooths, type Booth } from '../services/boothService';

interface StageStatus {
  status: 'live' | 'scheduled' | 'offline';
  label: string;
  badgeClass: string;
  buttonText: string;
  buttonVariant: 'default' | 'outline' | 'secondary';
  timeText?: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [mainStage, setMainStage] = useState<Meeting | null>(null);
  const [pitchStage, setPitchStage] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [meetingsData, boothsData, mainStageData, pitchStageData] = await Promise.all([
          fetchMeetings().catch(() => []),
          fetchBooths().catch(() => []),
          fetchMainStageRoom().catch(() => null),
          fetchPitchRoom().catch(() => null),
        ]);

        setMeetings(meetingsData);
        setBooths(boothsData);
        setMainStage(mainStageData);
        setPitchStage(pitchStageData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStageStatus = (stage: Meeting | null): StageStatus => {
    if (!stage) {
      return {
        status: 'offline',
        label: 'OFFLINE',
        badgeClass: 'bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400',
        buttonText: 'Enter Stage',
        buttonVariant: 'outline'
      };
    }

    if (stage.status === 'active') {
      return {
        status: 'live',
        label: 'LIVE NOW',
        badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold',
        buttonText: 'Join Live Stage',
        buttonVariant: 'default'
      };
    }

    if (stage.status === 'scheduled') {
      const time = new Date(stage.scheduledTime);
      const isToday = time.toDateString() === new Date().toDateString();
      const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedDate = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return {
        status: 'scheduled',
        label: 'SCHEDULED',
        badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500',
        buttonText: `Starts at ${formattedTime}`,
        buttonVariant: 'secondary',
        timeText: isToday ? `Today at ${formattedTime}` : `${formattedDate} at ${formattedTime}`
      };
    }

    return {
      status: 'offline',
      label: 'OFFLINE',
      badgeClass: 'bg-slate-500/10 border-slate-500/20 text-slate-500 dark:text-slate-400',
      buttonText: 'Enter Stage',
      buttonVariant: 'outline'
    };
  };

  const quickActions: Array<{
    title: string;
    description: string;
    icon: any;
    path: string;
    color: string;
    hoverBorder: string;
    hoverGlow: string;
    roles: UserRole[];
  }> = [
    {
      title: 'Main Stage',
      description: 'Watch keynotes and live panel discussions.',
      icon: Video,
      path: '/stage',
      color: 'from-emerald-500 to-green-600',
      hoverBorder: 'hover:border-emerald-500/30',
      hoverGlow: 'hover:shadow-lg hover:shadow-emerald-500/5',
      roles: [],
    },
    {
      title: 'Exhibition Hall',
      description: 'Interact with sponsor and exhibitor booths.',
      icon: Store,
      path: '/exhibition',
      color: 'from-teal-500 to-emerald-600',
      hoverBorder: 'hover:border-teal-500/30',
      hoverGlow: 'hover:shadow-lg hover:shadow-teal-500/5',
      roles: [],
    },
    {
      title: 'Meetings',
      description: 'Manage and join scheduled 1-on-1 calls.',
      icon: Calendar,
      path: '/meetings',
      color: 'from-green-600 to-emerald-700',
      hoverBorder: 'hover:border-green-600/30',
      hoverGlow: 'hover:shadow-lg hover:shadow-green-500/5',
      roles: [
        USER_ROLES.ATTENDEE,
        USER_ROLES.STARTUP_PARTICIPANT,
        USER_ROLES.EXHIBITOR,
        USER_ROLES.SPONSOR,
        USER_ROLES.SPEAKER,
        USER_ROLES.ORGANIZER,
        USER_ROLES.ADMIN,
      ],
    },
    {
      title: 'Startup Pitch',
      description: 'Watch startup pitches and investor reviews.',
      icon: Rocket,
      path: '/pitch',
      color: 'from-lime-500 to-green-600',
      hoverBorder: 'hover:border-lime-500/30',
      hoverGlow: 'hover:shadow-lg hover:shadow-lime-500/5',
      roles: [
        USER_ROLES.STARTUP_PARTICIPANT,
        USER_ROLES.ORGANIZER,
        USER_ROLES.ADMIN,
        USER_ROLES.ATTENDEE,
      ],
    },
  ];

  const visibleActions = quickActions.filter(
    (action) => action.roles.length === 0 || (user && action.roles.includes(user.role))
  );

  const mainStageStatus = getStageStatus(mainStage);
  const pitchStageStatus = getStageStatus(pitchStage);

  const liveStagesCount = 
    (mainStage?.status === 'active' ? 1 : 0) + 
    (pitchStage?.status === 'active' ? 1 : 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-1">
      {/* Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50/70 via-emerald-50/20 to-slate-50/70 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-955 border border-emerald-500/10 dark:border-emerald-500/20 p-6 md:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-72 h-72 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs px-2.5 py-0.5 rounded-full capitalize font-semibold shadow-inner">
              {user?.role.replace('_', ' ')}
            </Badge>
            {user?.company && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {user.company}
              </Badge>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground bg-clip-text">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
              Glad to have you here. There are currently <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{liveStagesCount} live stages</span> active, and you have <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{meetings.length} scheduled sessions</span> registered.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast Stages Overview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Live Stage Streams</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Main Stage Card */}
          <Link to="/stage" className="group block">
            <Card className="relative h-full overflow-hidden bg-card text-card-foreground border-border hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md dark:hover:shadow-emerald-950/10">
              <div className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Stage Room</span>
                    <Badge className={mainStageStatus.badgeClass}>
                      {mainStageStatus.status === 'live' && (
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      {mainStageStatus.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {mainStage?.title || 'Main Stage Broadcast'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {mainStage?.description || 'Watch live keynotes, panel discussions, and expert presentations.'}
                    </p>
                  </div>
                  
                  {mainStageStatus.timeText && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg w-fit dark:text-amber-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{mainStageStatus.timeText}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                  <span className="text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium inline-flex items-center gap-1">
                    Enter Stage <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                  <Button size="sm" variant={mainStageStatus.buttonVariant} className={`h-8 px-3 text-xs pointer-events-none ${mainStageStatus.status === 'live' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}>
                    {mainStageStatus.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          </Link>

          {/* Startup Pitch Card */}
          <Link to="/pitch" className="group block">
            <Card className="relative h-full overflow-hidden bg-card text-card-foreground border-border hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md dark:hover:shadow-green-950/10">
              <div className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Pitch Stage</span>
                    <Badge className={pitchStageStatus.badgeClass}>
                      {pitchStageStatus.status === 'live' && (
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      )}
                      {pitchStageStatus.label}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {pitchStage?.title || 'Startup Pitch Ceremony'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {pitchStage?.description || 'Explore novel startup submissions, view slides, and watch live pitches.'}
                    </p>
                  </div>

                  {pitchStageStatus.timeText && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg w-fit dark:text-amber-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{pitchStageStatus.timeText}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                  <span className="text-xs text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 font-medium inline-flex items-center gap-1">
                    Enter Stage <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                  <Button size="sm" variant={pitchStageStatus.buttonVariant} className={`h-8 px-3 text-xs pointer-events-none ${pitchStageStatus.status === 'live' ? 'bg-green-600 hover:bg-green-500 text-white' : ''}`}>
                    {pitchStageStatus.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">Event Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path} className="group">
                <Card className={`hover:shadow-md transition-all duration-300 ${action.hoverBorder} ${action.hoverGlow} cursor-pointer h-full bg-card border-border text-card-foreground`}>
                  <CardHeader className="p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3.5 shadow-sm shadow-slate-900/10`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-bold">{action.title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live Event Stats */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">Event Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="p-5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Network className="h-3.5 w-3.5 text-emerald-500" />
                Exhibition Booths
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2">{booths.length}</h3>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="p-5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Radio className="h-3.5 w-3.5 text-green-500" />
                Live Exhibitors
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2">{booths.filter(b => b.isLive).length}</h3>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="p-5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-teal-500" />
                Scheduled Meetings
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2">{meetings.length}</h3>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground border-border">
            <CardContent className="p-5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Users className="h-3.5 w-3.5 text-lime-500" />
                Live Stages
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2">{liveStagesCount}</h3>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
