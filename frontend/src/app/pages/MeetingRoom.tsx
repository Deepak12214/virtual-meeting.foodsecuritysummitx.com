import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Share2,
  PhoneOff,
  Clock,
  Users,
  Settings,
} from 'lucide-react';
import { MOCK_MEETINGS } from '../data/mockData';

export function MeetingRoom() {
  const { meetingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes in seconds

  const meeting = MOCK_MEETINGS.find((m) => m.id === meetingId);

  useEffect(() => {
    if (!meeting) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [meeting]);

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-[--color-text-secondary]">Meeting not found</p>
        <Link to="/meetings">
          <Button className="mt-4">Back to Meetings</Button>
        </Link>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLeaveMeeting = () => {
    navigate('/meetings');
  };

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-[--color-text-secondary] mt-1">
            {meeting.scheduledTime.toLocaleString()}
          </p>
        </div>
        <Link to="/meetings">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meeting.participants.map((participant, index) => (
          <Card key={participant.id}>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
                {/* Mock Video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={`https://images.unsplash.com/photo-${
                      index === 0 ? '1560250097-0b93528c311a' : '1573497019940-1c28c88b4f3e'
                    }?w=800&h=450&fit=crop&crop=faces`}
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>

                {/* Participant Name */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-black/50 backdrop-blur-sm">
                    {participant.name}
                    {participant.id === user?.id && ' (You)'}
                  </Badge>
                </div>

                {/* Audio Indicator */}
                {!audioEnabled && participant.id === user?.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <MicOff className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Timer */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[--color-text-secondary]" />
                <span className="text-lg font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="h-6 w-px bg-[--color-border]"></div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[--color-text-secondary]" />
                <span>{meeting.participants.length} participants</span>
              </div>
            </div>

            {/* Media Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={audioEnabled ? 'default' : 'destructive'}
                size="lg"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="gap-2"
              >
                {audioEnabled ? (
                  <>
                    <Mic className="h-5 w-5" />
                    Mute
                  </>
                ) : (
                  <>
                    <MicOff className="h-5 w-5" />
                    Unmute
                  </>
                )}
              </Button>

              <Button
                variant={videoEnabled ? 'default' : 'secondary'}
                size="lg"
                onClick={() => setVideoEnabled(!videoEnabled)}
                className="gap-2"
              >
                {videoEnabled ? (
                  <>
                    <Video className="h-5 w-5" />
                    Camera On
                  </>
                ) : (
                  <>
                    <VideoOff className="h-5 w-5" />
                    Camera Off
                  </>
                )}
              </Button>

              <Button variant="outline" size="lg" className="gap-2">
                <Share2 className="h-5 w-5" />
                Share Screen
              </Button>

              <div className="h-10 w-px bg-[--color-border]"></div>

              <Button
                variant="destructive"
                size="lg"
                onClick={handleLeaveMeeting}
                className="gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                Leave
              </Button>
            </div>
          </div>

          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="mt-6 pt-6 border-t border-[--color-border]">
              <h3 className="text-sm font-medium mb-3">Organizer Controls</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeRemaining((prev) => prev + 600)}
                >
                  +10 min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeRemaining((prev) => prev + 300)}
                >
                  +5 min
                </Button>
                <Button variant="destructive" size="sm">
                  End Meeting for All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meeting Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Scheduled Time:</dt>
              <dd className="font-medium">
                {meeting.scheduledTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Duration:</dt>
              <dd className="font-medium">{meeting.duration} minutes</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[--color-text-secondary]">Status:</dt>
              <dd>
                <Badge className="bg-green-500">Active</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
