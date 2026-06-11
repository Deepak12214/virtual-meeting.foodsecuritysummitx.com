import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, Users, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { MOCK_MEETINGS, Meeting } from '../data/mockData';

export function MeetingRooms() {
  const { user, hasAccess } = useAuth();

  const canAccessMeetings = hasAccess(['paid_delegate', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'organizer', 'admin']);

  if (!canAccessMeetings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meeting Rooms</h1>
          <p className="text-[--color-text-secondary] mt-2">
            1-on-1 video meetings and networking sessions
          </p>
        </div>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription className="mt-2">
                  Meeting rooms are only available to approved attendees with paid access.
                  Free visitors can watch the main stage and browse the exhibition hall.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeMeetings = MOCK_MEETINGS.filter((m) => m.status === 'active');
  const scheduledMeetings = MOCK_MEETINGS.filter((m) => m.status === 'scheduled');
  const completedMeetings = MOCK_MEETINGS.filter((m) => m.status === 'completed');

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="gap-1 bg-green-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Active
          </Badge>
        );
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Meeting Rooms</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Join your scheduled 1-on-1 meetings and networking sessions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Active Now</CardDescription>
            <CardTitle className="text-2xl">{activeMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Scheduled</CardDescription>
            <CardTitle className="text-2xl">{scheduledMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{completedMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Meetings Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({activeMeetings.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledMeetings.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {activeMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
                <p className="text-[--color-text-secondary]">No active meetings at the moment</p>
              </CardContent>
            </Card>
          ) : (
            activeMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} getStatusBadge={getStatusBadge} />
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4 mt-6">
          {scheduledMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
                <p className="text-[--color-text-secondary]">No scheduled meetings</p>
              </CardContent>
            </Card>
          ) : (
            scheduledMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} getStatusBadge={getStatusBadge} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
                <p className="text-[--color-text-secondary]">No completed meetings yet</p>
              </CardContent>
            </Card>
          ) : (
            completedMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} getStatusBadge={getStatusBadge} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeetingCard({
  meeting,
  getStatusBadge,
}: {
  meeting: Meeting;
  getStatusBadge: (status: Meeting['status']) => JSX.Element;
}) {
  const timeUntilMeeting = meeting.scheduledTime.getTime() - new Date().getTime();
  const minutesUntil = Math.floor(timeUntilMeeting / 1000 / 60);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              meeting.status === 'active' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
              meeting.status === 'scheduled' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
              'bg-gradient-to-br from-gray-500 to-gray-600'
            }`}>
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                {getStatusBadge(meeting.status)}
              </div>
              <div className="flex flex-col gap-1 text-sm text-[--color-text-secondary]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {meeting.scheduledTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' • '}
                  {meeting.duration} minutes
                  {meeting.status === 'scheduled' && minutesUntil > 0 && (
                    <span className="text-xs">
                      (starts in {minutesUntil} min)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {meeting.participants.map((p) => p.name).join(', ')}
                </div>
              </div>
            </div>
          </div>

          <div>
            {meeting.status === 'active' || meeting.status === 'scheduled' ? (
              <Link to={`/meetings/${meeting.id}`}>
                <Button className="gap-2">
                  <Video className="h-4 w-4" />
                  {meeting.status === 'active' ? 'Join Now' : 'View Details'}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Ended
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
