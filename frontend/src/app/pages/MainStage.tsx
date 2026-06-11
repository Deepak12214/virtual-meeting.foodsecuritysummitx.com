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
  Clock,
  Play,
  Pause,
  Volume2,
  Maximize,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { MOCK_SESSIONS, MOCK_QUESTIONS, Question } from '../data/mockData';

export function MainStage() {
  const { user, hasAccess } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [activeTab, setActiveTab] = useState('live');

  const liveSession = MOCK_SESSIONS.find((s) => s.isLive);
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === 'upcoming');

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isOrganizer;
  const isSpeaker = user?.role === 'speaker' || isOrganizer;
  const canAskQuestions = hasAccess(['paid_delegate', 'startup', 'investor', 'exhibitor', 'sponsor', 'speaker', 'moderator', 'organizer', 'admin']);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Main Stage</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Watch live sessions, keynotes, and panel discussions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Speaker/Organizer Controls */}
          {(isSpeaker || isOrganizer) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isOrganizer ? 'Organizer Controls' : 'Speaker Controls'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Mic className="h-4 w-4" />
                    Mute
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Video className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share Screen
                  </Button>
                  {isOrganizer && (
                    <>
                      <Button variant="destructive" size="sm">
                        End Session
                      </Button>
                      <Button variant="default" size="sm" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Start Timer
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="live">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </TabsTrigger>
            </TabsList>

            {/* Q&A Tab */}
            <TabsContent value="live" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Live Q&A</CardTitle>
                  <CardDescription>
                    {canAskQuestions
                      ? 'Ask questions to the speaker'
                      : 'Only approved attendees can ask questions'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Input */}
                  {canAskQuestions && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your question..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuestion()}
                      />
                      <Button size="sm" onClick={handleSubmitQuestion}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Moderator Queue */}
                  {isModerator && pendingQuestions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Pending Approval ({pendingQuestions.length})
                      </h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {pendingQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
                            >
                              <p className="text-sm">{q.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-[--color-text-secondary]">
                                  {q.askedBy}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => handleModerateQuestion(q.id, 'approved')}
                                  >
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
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
                    <h4 className="font-medium mb-2">Questions ({approvedQuestions.length})</h4>
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {approvedQuestions.length === 0 ? (
                          <p className="text-sm text-[--color-text-secondary] text-center py-4">
                            No questions yet
                          </p>
                        ) : (
                          approvedQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="p-3 bg-[--color-surface-elevated] rounded-lg border border-[--color-border]"
                            >
                              <p className="text-sm">{q.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-[--color-text-secondary]">
                                  {q.askedBy}
                                </span>
                                <span className="text-xs text-[--color-text-secondary]">
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

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upcoming Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {upcomingSessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-3 bg-[--color-surface-elevated] rounded-lg border border-[--color-border]"
                        >
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 mt-1 text-[--color-text-secondary]" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{session.title}</p>
                              <p className="text-xs text-[--color-text-secondary] mt-1">
                                {session.speaker}
                              </p>
                              <p className="text-xs text-[--color-text-secondary] mt-1">
                                {session.startTime.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {' - '}
                                {session.endTime.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
