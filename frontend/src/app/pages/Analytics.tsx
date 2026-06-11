import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Video, Calendar, Store, Activity } from 'lucide-react';
import { ANALYTICS_DATA } from '../data/mockData';

export function Analytics() {
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Event insights and engagement metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Registrations</CardDescription>
              <Users className="h-4 w-4 text-[--color-text-secondary]" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.totalRegistrations.toLocaleString()}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Active Users</CardDescription>
              <Activity className="h-4 w-4 text-[--color-text-secondary]" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.activeUsers.toLocaleString()}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-[--color-text-secondary] mt-1">
              <span>50% engagement rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Stage Viewers</CardDescription>
              <Video className="h-4 w-4 text-[--color-text-secondary]" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.stageViewers.toLocaleString()}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-[--color-text-secondary] mt-1">
              <span>Peak: 1,850 viewers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Active Meetings</CardDescription>
              <Calendar className="h-4 w-4 text-[--color-text-secondary]" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{ANALYTICS_DATA.activeMeetings}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-[--color-text-secondary] mt-1">
              <span>156 total scheduled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="engagement" className="w-full">
        <TabsList>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6 mt-6">
          {/* Engagement Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Over Time</CardTitle>
              <CardDescription>Active users throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ANALYTICS_DATA.engagementOverTime}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Active Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
                <CardDescription>User engagement by feature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Main Stage</span>
                      <span className="text-sm font-medium">{ANALYTICS_DATA.stageViewers}</span>
                    </div>
                    <div className="h-2 bg-[--color-surface] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(ANALYTICS_DATA.stageViewers / ANALYTICS_DATA.activeUsers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Exhibition Hall</span>
                      <span className="text-sm font-medium">{ANALYTICS_DATA.boothVisits}</span>
                    </div>
                    <div className="h-2 bg-[--color-surface] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(ANALYTICS_DATA.boothVisits / ANALYTICS_DATA.activeUsers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Meetings</span>
                      <span className="text-sm font-medium">{ANALYTICS_DATA.activeMeetings}</span>
                    </div>
                    <div className="h-2 bg-[--color-surface] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(ANALYTICS_DATA.activeMeetings / ANALYTICS_DATA.activeUsers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Startup Pitch</span>
                      <span className="text-sm font-medium">{ANALYTICS_DATA.startupRoomActivity}</span>
                    </div>
                    <div className="h-2 bg-[--color-surface] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${(ANALYTICS_DATA.startupRoomActivity / ANALYTICS_DATA.activeUsers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[--color-text-secondary]">Avg. Session Duration</span>
                    <span className="text-lg font-semibold">42:15</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[--color-text-secondary]">Booth Visit Rate</span>
                    <span className="text-lg font-semibold">62%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[--color-text-secondary]">Meeting Completion</span>
                    <span className="text-lg font-semibold">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[--color-text-secondary]">Q&A Participation</span>
                    <span className="text-lg font-semibold">38%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6 mt-6">
          {/* Registrations by Role */}
          <Card>
            <CardHeader>
              <CardTitle>Registrations by Role</CardTitle>
              <CardDescription>User distribution across different roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ANALYTICS_DATA.registrationsByRole}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {ANALYTICS_DATA.registrationsByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col justify-center space-y-2">
                  {ANALYTICS_DATA.registrationsByRole.map((item, index) => (
                    <div key={item.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm">{item.role}</span>
                      </div>
                      <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent user actions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'New registration', user: 'john.smith@example.com', time: '2 min ago' },
                  { action: 'Joined main stage', user: 'sarah.jones@company.com', time: '5 min ago' },
                  { action: 'Visited booth', user: 'mike.chen@startup.io', time: '8 min ago' },
                  { action: 'Meeting started', user: 'lisa.wang@ventures.com', time: '12 min ago' },
                  { action: 'Question submitted', user: 'david.park@tech.co', time: '15 min ago' },
                  { action: 'Brochure downloaded', user: 'emma.wilson@ai.com', time: '18 min ago' },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[--color-surface] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{activity.action}</p>
                      <p className="text-xs text-[--color-text-secondary]">{activity.user}</p>
                    </div>
                    <span className="text-xs text-[--color-text-secondary]">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
