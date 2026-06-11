import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  Video,
  Calendar,
  Store,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { ANALYTICS_DATA, MOCK_SESSIONS, MOCK_MEETINGS, MOCK_BOOTHS } from '../../data/mockData';

export function OrganizerDashboard() {
  const pendingApprovals = 12;
  const activeSessions = MOCK_SESSIONS.filter((s) => s.isLive).length;
  const activeMeetings = MOCK_MEETINGS.filter((m) => m.status === 'active').length;
  const liveBooths = MOCK_BOOTHS.filter((b) => b.isLive).length;

  const quickActions = [
    {
      title: 'Manage Users',
      description: `${pendingApprovals} pending approvals`,
      icon: Users,
      path: '/organizer/users',
      color: 'from-blue-500 to-cyan-500',
      badge: pendingApprovals,
    },
    {
      title: 'Manage Sessions',
      description: `${activeSessions} live now`,
      icon: Video,
      path: '/organizer/sessions',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Manage Meetings',
      description: `${activeMeetings} active meetings`,
      icon: Calendar,
      path: '/organizer/meetings',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Manage Booths',
      description: `${liveBooths} booths live`,
      icon: Store,
      path: '/organizer/booths',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Event management and operational controls
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Registrations</CardDescription>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.totalRegistrations.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.activeUsers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>50% engagement rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stage Viewers</CardDescription>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.stageViewers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-[--color-text-secondary]">
              <Activity className="h-3 w-3" />
              <span>Peak: 1,850 viewers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Meetings</CardDescription>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.activeMeetings}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-[--color-text-secondary]">
              <Activity className="h-3 w-3" />
              <span>156 total scheduled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-base">Pending Approvals</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 mb-2">{pendingApprovals}</p>
            <Link to="/organizer/users">
              <Button variant="outline" size="sm" className="w-full">
                Review Now
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Live Sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 mb-2">{activeSessions}</p>
            <Link to="/organizer/sessions">
              <Button variant="outline" size="sm" className="w-full">
                Manage Sessions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Upcoming Sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 mb-2">
              {MOCK_SESSIONS.filter((s) => s.status === 'upcoming').length}
            </p>
            <Link to="/organizer/sessions">
              <Button variant="outline" size="sm" className="w-full">
                View Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      {action.badge && (
                        <Badge variant="destructive">{action.badge}</Badge>
                      )}
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                action: 'New user registration',
                user: 'john.smith@example.com',
                time: '2 minutes ago',
                type: 'user',
              },
              {
                action: 'Session started',
                user: 'Opening Keynote',
                time: '15 minutes ago',
                type: 'session',
              },
              {
                action: 'Meeting scheduled',
                user: 'Investor Meeting - Alpha Ventures',
                time: '1 hour ago',
                type: 'meeting',
              },
              {
                action: 'Booth activated',
                user: 'Global Tech Corp',
                time: '2 hours ago',
                type: 'booth',
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-[--color-surface] rounded-lg"
              >
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-[--color-text-secondary]">{activity.user}</p>
                </div>
                <span className="text-xs text-[--color-text-secondary]">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
