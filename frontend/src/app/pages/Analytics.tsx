import { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  TrendingUp,
  Video,
  Calendar,
  Store,
  Activity,
  FileDown,
  MessageSquare,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  Award,
  ArrowRight
} from 'lucide-react';
import { fetchAnalytics, AnalyticsData } from '../services/analyticsService';
import { getRoleLabel } from '../constants/roles';

// Harmonic green and warm accent colors matching the app color combinations
const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export function Analytics() {
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'last7days' | 'lastmonth' | 'custom'>('last7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics(filter, startDate, endDate);
      setData(result);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load live analytics statistics from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Querying live database metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-card border border-red-200 dark:border-red-900/30 rounded-2xl shadow-sm text-center space-y-4">
        <div className="p-3 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full w-fit mx-auto">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Analytics Error</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadData} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full rounded-xl py-2 font-semibold">
          Retry Connection
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const activeData = data;

  // Calculate meeting stats
  const totalMeetingsCount = activeData.meetings.totalMeetings;
  const completedMeetingsCount = activeData.meetings.completed;
  const completionRate = totalMeetingsCount > 0 
    ? Math.round((completedMeetingsCount / totalMeetingsCount) * 100) 
    : 100;

  // Role labels helper
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'organizer': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'speaker': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'exhibitor': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'sponsor': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'startup participant':
      case 'startup_participant': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-1 text-foreground">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Control Center
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1 animate-fade-in">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time event insights, session views, 1-on-1 networking, and sponsor booth metrics.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 border px-3 py-1.5 rounded-full">
            <div className="animate-spin h-3.5 w-3.5 border-b-2 border-emerald-500 rounded-full"></div>
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* ── Filters Row ── */}
      <div className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-foreground">Filter by Date Range:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'last7days', label: 'Last 7 Days' },
              { key: 'lastmonth', label: 'Last Month' },
              { key: 'custom', label: 'Custom Date' }
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
                  filter === item.key
                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range inputs */}
        {filter === 'custom' && (
          <div className="flex items-center gap-4 flex-wrap pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Start:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">End:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background border-border text-xs rounded-xl"
              />
            </div>
            {(startDate || endDate) && (
              <Badge className="bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 text-xs">
                Applying custom range
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ── Key Metrics Snapshot ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="User Registrations"
          value={activeData.users.totalRegistrations}
          sub="during selected period"
          icon={<Users className="h-5 w-5 text-emerald-500" />}
          trend={<span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> Live DB</span>}
        />
        <MetricCard
          title="Active Users"
          value={activeData.users.activeUsers}
          sub="total active accounts"
          icon={<Activity className="h-5 w-5 text-emerald-500" />}
          trend={<span className="text-muted-foreground">Registered base</span>}
        />
        <MetricCard
          title="Networking Meetings"
          value={totalMeetingsCount}
          sub="1-on-1 networking created"
          icon={<Calendar className="h-5 w-5 text-emerald-500" />}
          trend={<span className="text-emerald-600 font-semibold">{completionRate}% completed</span>}
        />
        <MetricCard
          title="Booth Interactions"
          value={activeData.booths.totalVisits}
          sub="total actions in period"
          icon={<Store className="h-5 w-5 text-emerald-500" />}
          trend={<span className="text-muted-foreground">{activeData.booths.brochureDownloads} downloads</span>}
        />
      </div>

      {/* ── Categorized Analytics Tabs ── */}
      <Tabs defaultValue="user" className="w-full relative z-10">
        <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-border h-fit">
          <TabsTrigger value="user" className="py-2.5 rounded-xl text-xs font-bold cursor-pointer">User Analytics</TabsTrigger>
          <TabsTrigger value="session" className="py-2.5 rounded-xl text-xs font-bold cursor-pointer">Session Analytics</TabsTrigger>
          <TabsTrigger value="meeting" className="py-2.5 rounded-xl text-xs font-bold cursor-pointer">Meeting Analytics</TabsTrigger>
          <TabsTrigger value="booth" className="py-2.5 rounded-xl text-xs font-bold cursor-pointer">Booth Analytics</TabsTrigger>
          <TabsTrigger value="engagement" className="py-2.5 rounded-xl text-xs font-bold cursor-pointer">Engagement Reports</TabsTrigger>
        </TabsList>

        {/* 1. User Analytics Tab */}
        <TabsContent value="user" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">User Registrations Trend</CardTitle>
                <CardDescription>Visual growth of users across the selected interval</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {activeData.users.historyData && activeData.users.historyData.length > 0 ? (
                    <LineChart data={activeData.users.historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Registrations" />
                    </LineChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No trend data available for this range.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Registration by Role</CardTitle>
                <CardDescription>Role distribution breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={activeData.users.roleData} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={70} fill="#10b981">
                      {activeData.users.roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-xs h-[100px] overflow-y-auto pr-1">
                  {activeData.users.roleData.map((item, index) => (
                    <div key={item.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{item.role}</span>
                      </div>
                      <span className="font-bold text-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registered Users List */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Registered Users List</CardTitle>
                <CardDescription>Attendees and representatives created in selected filter</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">{activeData.users.recentUsers.length} users</Badge>
            </CardHeader>
            <CardContent>
              {activeData.users.recentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-muted-foreground uppercase bg-slate-50/50">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4 text-right">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {activeData.users.recentUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{user.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{user.company || '—'}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                            {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No users registered during this period.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Session Analytics Tab */}
        <TabsContent value="session" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Broadcast Stages Peak Viewers</CardTitle>
                <CardDescription>Comparison of concurrent live stream viewership</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Main Stage Broadcast', Peak: activeData.engagement.mainStage.viewersCount },
                    { name: 'Startup Pitch Ceremony', Peak: activeData.engagement.pitchStage.viewersCount },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="Peak" fill="#10b981" radius={[8, 8, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Session Overview</CardTitle>
                <CardDescription>Live streaming insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">Main Stage Viewers</p>
                    <p className="text-2xl font-extrabold text-foreground">{activeData.engagement.mainStage.viewersCount}</p>
                  </div>
                  <Video className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">Pitch Stage Viewers</p>
                    <p className="text-2xl font-extrabold text-foreground">{activeData.engagement.pitchStage.viewersCount}</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-amber-500 opacity-80" />
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Session Stream Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Live Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Meeting Analytics Tab */}
        <TabsContent value="meeting" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">1-on-1 Meetings Completion Activity</CardTitle>
                <CardDescription>Meetings scheduled vs completed successfully</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {activeData.meetings.historyData && activeData.meetings.historyData.length > 0 ? (
                    <LineChart data={activeData.meetings.historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} name="Completed Meetings" />
                    </LineChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No completed meeting data for this range.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Meeting Metrics</CardTitle>
                <CardDescription>Video networking parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">Total Call Hours:</span>
                  </div>
                  <span className="font-bold text-foreground">{activeData.meetings.totalHours} hrs</span>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">Unique Call Participants:</span>
                  </div>
                  <span className="font-bold text-foreground">{activeData.meetings.uniqueParticipants} users</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">Completion Rate:</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meeting Log Details */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">1-on-1 Networking Meeting Logs</CardTitle>
                <CardDescription>Meeting instances created during selected range</CardDescription>
              </div>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200">{totalMeetingsCount} sessions</Badge>
            </CardHeader>
            <CardContent>
              {activeData.meetings.list.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-muted-foreground uppercase bg-slate-50/50">
                        <th className="py-3 px-4">Meeting Title</th>
                        <th className="py-3 px-4">Host</th>
                        <th className="py-3 px-4">Scheduled Start</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Participants</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {activeData.meetings.list.map((meeting) => (
                        <tr key={meeting._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{meeting.title}</td>
                          <td className="py-3 px-4 text-muted-foreground">{meeting.creator ? meeting.creator.name : '—'}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {new Date(meeting.scheduledTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{meeting.duration} min</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              meeting.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                              meeting.status === 'active' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {meeting.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground">{meeting.participants ? meeting.participants.length : 0} joined</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No meetings created for this period.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Booth Analytics Tab */}
        <TabsContent value="booth" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Top Visited Exhibition Booths</CardTitle>
                <CardDescription>User visits distribution across leading brand booths</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {activeData.booths.topBooths && activeData.booths.topBooths.length > 0 ? (
                    <BarChart data={activeData.booths.topBooths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} interval={0} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} name="Interactions" />
                    </BarChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No booth interactions logged in this range.</div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Exhibition Engagement</CardTitle>
                <CardDescription>Booth interactions count</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">Brochure Downloads</p>
                    <p className="text-2xl font-extrabold text-foreground">{activeData.booths.brochureDownloads}</p>
                  </div>
                  <FileDown className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Total Brands:</span>
                  <span className="font-semibold text-foreground">{activeData.booths.totalBooths} ({activeData.booths.sponsors} Sponsors, {activeData.booths.exhibitors} Exhibitors)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Visits / Interaction Clicks:</span>
                  <span className="font-semibold text-foreground">{activeData.booths.totalVisits}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exhibition Booths Directory & Stats */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Brand Booth Directory & Statistics</CardTitle>
                <CardDescription>Visits and brochures downloads audit</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">{activeData.booths.totalBooths} booths registered</Badge>
            </CardHeader>
            <CardContent>
              {activeData.booths.list.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-muted-foreground uppercase bg-slate-50/50">
                        <th className="py-3 px-4">Booth Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4 text-center">Reps Assigned</th>
                        <th className="py-3 px-4 text-center">Downloads (Period)</th>
                        <th className="py-3 px-4 text-center">Interactions (Period)</th>
                        <th className="py-3 px-4 text-right">Cumulative Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {activeData.booths.list.map((booth) => (
                        <tr key={booth.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{booth.name}</td>
                          <td className="py-3 px-4 capitalize text-muted-foreground">{booth.category}</td>
                          <td className="py-3 px-4">
                            {booth.tier ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${
                                booth.tier === 'platinum' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                                booth.tier === 'gold' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                              }`}>
                                {booth.tier}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground font-semibold">{booth.representativeCount} reps</td>
                          <td className="py-3 px-4 text-center font-bold text-foreground">{booth.rangeDownloads}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600">{booth.rangeInteractions}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground font-semibold">{booth.cumulativeVisits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">No sponsor or exhibitor booths registered.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Engagement Reports Tab */}
        <TabsContent value="engagement" className="space-y-6 mt-6">
          {/* Main Stage & Startup Pitch Engagement Report (User Requirement) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Stage Engagement Card */}
            <Card className="border-border shadow-sm hover:border-emerald-500/20 transition-all duration-300">
              <CardHeader className="bg-emerald-500/5 border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">
                      Stage Type: Broadcast
                    </span>
                    <CardTitle className="text-xl font-extrabold text-foreground mt-1">Main Stage Broadcast</CardTitle>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/15">
                    <Video className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-border">
                    <p className="text-2xl font-extrabold text-foreground">{activeData.engagement.mainStage.viewersCount}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Total Viewers</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-border">
                    <p className="text-2xl font-extrabold text-foreground">{activeData.engagement.mainStage.totalQuestions}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Questions Asked</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-500/15 text-emerald-600">
                    <p className="text-2xl font-extrabold">{activeData.engagement.mainStage.approvedQuestions}</p>
                    <p className="text-[10px] font-bold uppercase mt-1">Approved Q&A</p>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Question Approval Rate</span>
                      <span className="font-bold text-foreground">
                        {activeData.engagement.mainStage.totalQuestions > 0
                          ? `${Math.round((activeData.engagement.mainStage.approvedQuestions / activeData.engagement.mainStage.totalQuestions) * 100)}%`
                          : '100%'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ 
                          width: `${activeData.engagement.mainStage.totalQuestions > 0 
                            ? (activeData.engagement.mainStage.approvedQuestions / activeData.engagement.mainStage.totalQuestions) * 100 
                            : 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Startup Pitch Stage Engagement Card */}
            <Card className="border-border shadow-sm hover:border-amber-500/20 transition-all duration-300">
              <CardHeader className="bg-amber-500/5 border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full">
                      Stage Type: Pitching
                    </span>
                    <CardTitle className="text-xl font-extrabold text-foreground mt-1">Startup Pitch Ceremony</CardTitle>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/15">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-border">
                    <p className="text-2xl font-extrabold text-foreground">{activeData.engagement.pitchStage.viewersCount}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Stream Viewers</p>
                  </div>
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-500/15 text-amber-600">
                    <p className="text-2xl font-extrabold">{activeData.engagement.pitchStage.stageCount}</p>
                    <p className="text-[10px] font-bold uppercase mt-1">Joined Stage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline & Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Recent Engagement Actions</CardTitle>
                <CardDescription>Live user interaction timeline log</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {activeData.engagement.timeline && activeData.engagement.timeline.length > 0 ? (
                    activeData.engagement.timeline.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-xl hover:bg-slate-100/30 transition-all"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground">{item.action}</p>
                          <p className="text-xs text-muted-foreground">{item.user}</p>
                        </div>
                        <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-none text-[10px]">
                          {item.time}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">No engagement actions registered in this period.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Engagement Scores</CardTitle>
                <CardDescription>Core interaction markers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Total Questions Submitted (Stages)</span>
                    <span className="font-bold text-foreground">
                      {activeData.engagement.mainStage.totalQuestions + activeData.engagement.pitchStage.totalQuestions}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ 
                        width: `${Math.min(100, ((activeData.engagement.mainStage.totalQuestions + activeData.engagement.pitchStage.totalQuestions) / Math.max(1, activeData.users.totalRegistrations)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Brochure Downloads Rate</span>
                    <span className="font-bold text-foreground">
                      {activeData.users.totalRegistrations > 0
                        ? `${((activeData.booths.brochureDownloads / activeData.users.totalRegistrations) * 100).toFixed(0)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ 
                        width: `${Math.min(100, (activeData.users.totalRegistrations > 0 
                          ? (activeData.booths.brochureDownloads / activeData.users.totalRegistrations) * 100 
                          : 0))}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">Total Interactive Users:</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {activeData.meetings.uniqueParticipants + activeData.engagement.mainStage.viewersCount + activeData.engagement.pitchStage.viewersCount} users
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Metric Card Helper ───
function MetricCard({
  title,
  value,
  sub,
  icon,
  trend,
}: {
  title: string;
  value: number;
  sub: string;
  icon: ReactNode;
  trend: ReactNode;
}) {
  return (
    <Card className="border border-border shadow-sm hover:border-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</CardDescription>
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/15">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-extrabold text-foreground">{value.toLocaleString()}</CardTitle>
        <div className="flex items-center justify-between text-xs mt-2 border-t border-border/60 pt-2 text-muted-foreground">
          <span>{sub}</span>
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}
