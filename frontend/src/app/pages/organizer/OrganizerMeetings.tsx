import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, Clock, Users, Plus } from 'lucide-react';
import { fetchMeetings, type Meeting } from '../../services/meetingService';
import { toast } from 'sonner';

export function OrganizerMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeetings = async () => {
    try {
      const data = await fetchMeetings();
      setMeetings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const totalMeetings = meetings.length;
  const activeMeetings = meetings.filter((m) => m.status === 'active').length;
  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled').length;
  const completedMeetings = meetings.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meeting Management</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Schedule and manage 1-on-1 meetings
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Meetings</CardDescription>
            <CardTitle className="text-2xl">{totalMeetings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Now</CardDescription>
            <CardTitle className="text-2xl">{activeMeetings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Scheduled Today</CardDescription>
            <CardTitle className="text-2xl">{scheduledMeetings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{completedMeetings}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Meeting List */}
      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[--color-text-secondary]">Loading meetings…</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
              <p className="text-[--color-text-secondary]">No meetings scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id ?? meeting.id}
                  className="flex items-start justify-between p-4 bg-[--color-surface] rounded-lg border border-[--color-border]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{meeting.title}</h3>
                      <Badge
                        variant={
                          meeting.status === 'active'
                            ? 'default'
                            : meeting.status === 'scheduled'
                            ? 'outline'
                            : 'secondary'
                        }
                        className={meeting.status === 'active' ? 'bg-green-500' : ''}
                      >
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[--color-text-secondary]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(meeting.scheduledTime).toLocaleString()}
                      </div>
                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {meeting.participants.map((p) => p.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
