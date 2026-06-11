import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Video, Store, Calendar, Rocket, Users, BarChart3, Clock, Play } from 'lucide-react';
import { MOCK_SESSIONS, MOCK_MEETINGS, ANALYTICS_DATA } from '../data/mockData';

export function Dashboard() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Main Stage',
      description: 'Watch live sessions and keynotes',
      icon: Video,
      path: '/stage',
      color: 'from-purple-500 to-pink-500',
      roles: [],
    },
    {
      title: 'Exhibition Hall',
      description: 'Explore sponsor and exhibitor booths',
      icon: Store,
      path: '/exhibition',
      color: 'from-blue-500 to-cyan-500',
      roles: [],
    },
    {
      title: 'Meetings',
      description: 'Join scheduled 1-on-1 meetings',
      icon: Calendar,
      path: '/meetings',
      color: 'from-green-500 to-emerald-500',
      roles: ['paid_delegate', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'organizer', 'admin'],
    },
    {
      title: 'Startup Pitch',
      description: 'Watch or participate in pitch sessions',
      icon: Rocket,
      path: '/pitch',
      color: 'from-orange-500 to-red-500',
      roles: ['startup', 'investor', 'moderator', 'organizer', 'admin'],
    },
  ];

  const visibleActions = quickActions.filter(
    (action) => action.roles.length === 0 || (user && action.roles.includes(user.role))
  );

  const liveSession = MOCK_SESSIONS.find((s) => s.isLive);
  const upcomingMeetings = MOCK_MEETINGS.filter((m) => m.status === 'scheduled').slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Here's what's happening at the event today
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline">{user?.role.replace('_', ' ')}</Badge>
          {user?.company && (
            <Badge variant="secondary">{user.company}</Badge>
          )}
        </div>
      </div>

      {/* Live Now Banner */}
      {liveSession && (
        <Card className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <Badge variant="destructive">LIVE NOW</Badge>
                </div>
                <div>
                  <CardTitle>{liveSession.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {liveSession.speaker} • {liveSession.viewerCount.toLocaleString()} viewers
                  </CardDescription>
                </div>
              </div>
              <Link to="/stage">
                <Button className="gap-2">
                  <Play className="h-4 w-4" />
                  Watch Now
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Event Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Active Users</CardDescription>
              <CardTitle className="text-2xl">{ANALYTICS_DATA.activeUsers.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Stage Viewers</CardDescription>
              <CardTitle className="text-2xl">{ANALYTICS_DATA.stageViewers.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active Meetings</CardDescription>
              <CardTitle className="text-2xl">{ANALYTICS_DATA.activeMeetings}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Booth Visits</CardDescription>
              <CardTitle className="text-2xl">{ANALYTICS_DATA.boothVisits.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && user && ['paid_delegate', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'organizer', 'admin'].includes(user.role) && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Upcoming Meetings</h2>
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{meeting.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {meeting.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {meeting.duration} min
                        </CardDescription>
                      </div>
                    </div>
                    <Link to={`/meetings/${meeting.id}`}>
                      <Button size="sm">Join</Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
