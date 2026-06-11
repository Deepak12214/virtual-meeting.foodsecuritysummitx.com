import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  MessageSquare,
  Users,
  Play,
  Volume2,
  Maximize,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Radio,
} from 'lucide-react';
import { MOCK_SESSIONS, MOCK_QUESTIONS, Question } from '../data/mockData';
import { ControlAuthorityIndicator } from '../components/ControlAuthorityIndicator';
import { OperationalComms } from '../components/OperationalComms';
import { AdvancedTimer } from '../components/AdvancedTimer';
import { QueueManagement } from '../components/QueueManagement';
import { EmergencyControls } from '../components/EmergencyControls';

export function MainStageEnhanced() {
  const { user, hasAccess } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [activeTab, setActiveTab] = useState('live');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const liveSession = MOCK_SESSIONS.find((s) => s.isLive);
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === 'upcoming');

  // Role checks
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' || isAdmin;
  const isHost = user?.role === 'host' || isOrganizer;
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isSpeaker = user?.role === 'speaker' || isHost;
  const canAskQuestions = hasAccess(['attendee', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'host', 'organizer', 'admin']);

  // Mock speaker queue
  const speakerQueue = [
    { id: 's1', name: 'Dr. James Mitchell', title: 'Chief Innovation Officer', status: 'ready' as const, duration: 45 },
    { id: 's2', name: 'Rachel Kumar', title: 'Head of AI Research', status: 'not-ready' as const, duration: 30 },
    { id: 's3', name: 'Marcus Chen', title: 'Serial Entrepreneur', status: 'standby' as const, duration: 60 },
  ];

  const handleSubmitQuestion = () => {
    if (!newQuestion.trim()) return;

    const question: Question = {
      id: `q${questions.length + 1}`,
      text: newQuestion,
      askedBy: user?.name || 'Anonymous',
      timestamp: new Date(),
      status: 'pending',
    };

    setQuestions([...questions, question]);
    setNewQuestion('');
  };

  const handleModerateQuestion = (questionId: string, status: 'approved' | 'rejected') => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, status } : q
      )
    );
  };

  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const approvedQuestions = questions.filter((q) => q.status === 'approved');

  // Control authorities for display
  const authorities = [
    ...(isAdmin || isOrganizer
      ? [{ role: user?.role || 'admin', name: user?.name || 'Admin', mode: 'full' as const }]
      : []),
    ...(isHost && !isOrganizer
      ? [{ role: 'host', name: user?.name || 'Host', mode: 'presentation' as const }]
      : []),
    ...(isModerator && !isOrganizer && !isHost
      ? [{ role: 'moderator', name: user?.name || 'Moderator', mode: 'limited' as const }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Main Stage</h1>
            {liveSession?.isLive && (
              <Badge className="bg-red-500 gap-1 px-3 py-1">
                <Radio className="h-3 w-3 animate-pulse" />
                BROADCASTING
              </Badge>
            )}
          </div>
          <p className="text-[--color-text-secondary] mt-2">
            {isHost && 'Host control interface for session management'}
            {isModerator && !isHost && 'Moderator control interface for Q&A and audience management'}
            {!isHost && !isModerator && 'Watch live sessions, keynotes, and panel discussions'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Video Player */}
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-lg overflow-hidden">
                {/* Mock Video Player */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop"
                    alt="Conference stage"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>

                {/* Live Badge */}
                {liveSession?.isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE
                  </div>
                )}

                {/* Viewer Count */}
                {liveSession && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg">
                    <Eye className="h-4 w-4" />
                    <span>{liveSession.viewerCount.toLocaleString()}</span>
                  </div>
                )}

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <span className="text-white text-sm">1:23:45</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              {liveSession && (
                <div className="p-4">
                  <h2 className="text-xl font-bold">{liveSession.title}</h2>
                  <p className="text-[--color-text-secondary] mt-1">
                    {liveSession.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {liveSession.speaker.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{liveSession.speaker}</p>
                        <p className="text-xs text-[--color-text-secondary]">
                          {liveSession.speakerTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Host Controls */}
          {isHost && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Host Controls</Badge>
                  <CardTitle className="text-sm">Session Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant={audioEnabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="gap-2"
                  >
                    {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {audioEnabled ? 'Mute' : 'Unmute'}
                  </Button>
                  <Button
                    variant={videoEnabled ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className="gap-2"
                  >
                    {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    Camera
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    Backstage
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organizer/Admin Controls */}
          {isOrganizer && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500">Organizer Controls</Badge>
                  <CardTitle className="text-sm">Full Session Authority</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                    Go Live
                  </Button>
                  <Button variant="destructive" size="sm">
                    End Session
                  </Button>
                  <Button variant="outline" size="sm">
                    Add Speaker
                  </Button>
                  <Button variant="outline" size="sm">
                    Announce
                  </Button>
                  <Button variant="outline" size="sm">
                    Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Control Docks */}
        <div className="lg:col-span-1 space-y-4">
          {/* Control Authority */}
          {authorities.length > 0 && <ControlAuthorityIndicator authorities={authorities} />}

          {/* Timer */}
          {(isHost || isOrganizer) && (
            <AdvancedTimer
              initialSeconds={3600}
              type="session"
              canControl={isOrganizer}
            />
          )}

          {/* Operational Comms */}
          {(isHost || isModerator || isOrganizer) && <OperationalComms />}

          {/* Emergency Controls (Admin/Organizer Only) */}
          {isAdmin && <EmergencyControls />}

          {/* Speaker Queue (Host/Organizer) */}
          {isHost && (
            <QueueManagement
              items={speakerQueue}
              type="speaker"
              canManage={isOrganizer}
            />
          )}

          {/* Q&A Management */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="live">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A
                {pendingQuestions.length > 0 && isModerator && (
                  <Badge variant="destructive" className="ml-2 h-4 text-[10px]">
                    {pendingQuestions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs">Live Q&A</CardTitle>
                  <CardDescription className="text-xs">
                    {canAskQuestions
                      ? 'Submit questions to speakers'
                      : 'Q&A available to approved attendees'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Question Input */}
                  {canAskQuestions && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your question..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuestion()}
                        className="text-xs h-8"
                      />
                      <Button size="sm" onClick={handleSubmitQuestion} className="h-8">
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Moderator Queue */}
                  {isModerator && pendingQuestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        Pending Approval ({pendingQuestions.length})
                      </h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {pendingQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
                            >
                              <p className="text-xs">{q.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-[--color-text-secondary]">
                                  {q.askedBy}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2"
                                    onClick={() => handleModerateQuestion(q.id, 'approved')}
                                  >
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-2"
                                    onClick={() => handleModerateQuestion(q.id, 'rejected')}
                                  >
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <Separator />

                  {/* Approved Questions */}
                  <div>
                    <h4 className="text-xs font-medium mb-2">Questions ({approvedQuestions.length})</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {approvedQuestions.length === 0 ? (
                          <p className="text-xs text-[--color-text-secondary] text-center py-4">
                            No questions yet
                          </p>
                        ) : (
                          approvedQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="p-2 bg-[--color-surface] rounded-lg border border-[--color-border]"
                            >
                              <p className="text-xs">{q.text}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-[--color-text-secondary]">
                                  {q.askedBy}
                                </span>
                                <span className="text-[10px] text-[--color-text-secondary]">
                                  {q.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
