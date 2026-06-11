import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Video, Play, Pause, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { MOCK_SESSIONS } from '../../data/mockData';
import { toast } from 'sonner';

export function OrganizerSessions() {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  const handleStartSession = (sessionId: string) => {
    toast.success('Session started', {
      description: 'The session is now live',
    });
  };

  const handleEndSession = (sessionId: string) => {
    toast.success('Session ended', {
      description: 'The session has been stopped',
    });
  };

  const liveSession = sessions.find((s) => s.isLive);
  const upcomingSessions = sessions.filter((s) => s.status === 'upcoming');
  const endedSessions = sessions.filter((s) => s.status === 'ended');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Control main stage sessions and speakers
          </p>
        </div>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          Create Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Live Now</CardDescription>
            <CardTitle className="text-2xl">{liveSession ? 1 : 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Upcoming</CardDescription>
            <CardTitle className="text-2xl">{upcomingSessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{endedSessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Peak Viewers</CardDescription>
            <CardTitle className="text-2xl">1,850</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Live Session */}
      {liveSession && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500 gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE
                  </Badge>
                  <CardTitle>{liveSession.title}</CardTitle>
                </div>
                <CardDescription>
                  {liveSession.speaker} • {liveSession.viewerCount.toLocaleString()} viewers
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleEndSession(liveSession.id)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between p-4 bg-[--color-surface] rounded-lg border border-[--color-border]"
              >
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{session.title}</h3>
                  <p className="text-sm text-[--color-text-secondary] mb-2">
                    {session.speaker} • {session.speakerTitle}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[--color-text-secondary]">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {session.endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStartSession(session.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Go Live
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
