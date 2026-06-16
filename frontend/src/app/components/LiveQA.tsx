import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { MessageSquare, Send, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchQuestions, submitQuestion, approveQuestion, rejectQuestion, Question } from '../services/questionService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface LiveQAProps {
  meetingId: string;
  isModerator: boolean;
  canAskQ: boolean;
}

export function LiveQA({ meetingId, isModerator, canAskQ }: LiveQAProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownKey = `last_q_time_${meetingId}`;

  // Poll questions
  const loadQuestions = useCallback(async () => {
    if (!meetingId) return;
    try {
      const data = await fetchQuestions(meetingId);
      setQuestions(data);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  }, [meetingId]);

  useEffect(() => {
    loadQuestions();
    const interval = setInterval(loadQuestions, 3000);
    return () => clearInterval(interval);
  }, [loadQuestions]);

  // Handle local cooldown initialization and ticking
  useEffect(() => {
    const checkCooldown = () => {
      const lastQTimeStr = localStorage.getItem(cooldownKey);
      if (lastQTimeStr) {
        const lastQTime = parseInt(lastQTimeStr, 10);
        const now = Date.now();
        const difference = now - lastQTime;
        const cooldownPeriod = 2 * 60 * 1000; // 2 minutes

        if (difference < cooldownPeriod) {
          setCooldown(Math.ceil((cooldownPeriod - difference) / 1000));
        } else {
          setCooldown(0);
        }
      } else {
        setCooldown(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [cooldownKey]);

  const handleSubmit = async () => {
    if (!newQuestion.trim() || submitting) return;

    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before asking another question.`);
      return;
    }

    setSubmitting(true);
    try {
      await submitQuestion(meetingId, newQuestion.trim());
      toast.success('Question submitted for moderation');
      setNewQuestion('');
      
      // Save last submit time to localStorage
      localStorage.setItem(cooldownKey, Date.now().toString());
      setCooldown(120);

      // Reload immediately
      await loadQuestions();
    } catch (err: any) {
      // If server returned 429 too many requests
      if (err.message && err.message.includes('wait')) {
        // Find if server returned seconds in message or set 120 seconds default
        const match = err.message.match(/(\d+)\s+seconds/);
        const seconds = match ? parseInt(match[1], 10) : 120;
        localStorage.setItem(cooldownKey, (Date.now() - (120 - seconds) * 1000).toString());
        setCooldown(seconds);
      }
      toast.error(err.message || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveQuestion(id);
      toast.success('Question approved');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve question');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectQuestion(id);
      toast.success('Question rejected');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject question');
    }
  };

  const pendingQs = questions.filter((q) => q.status === 'pending');
  const approvedQs = questions.filter((q) => q.status === 'approved');

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card className="border-[--color-border] bg-[--color-surface-card] text-[--color-text]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Live Q&A
          </CardTitle>
          {isModerator && pendingQs.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {pendingQs.length} pending
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {canAskQ 
            ? cooldown > 0 
              ? `Cooldown: Wait ${formatCooldown(cooldown)} before next question`
              : 'Submit your questions to the speakers' 
            : 'Q&A available to approved attendees'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canAskQ && (
          <div className="flex gap-2">
            <Input
              placeholder={cooldown > 0 ? `Wait ${formatCooldown(cooldown)}…` : 'Ask a question…'}
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={submitting || cooldown > 0}
              className="text-xs h-8"
            />
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={submitting || cooldown > 0 || !newQuestion.trim()} 
              className="h-8 px-3"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}

        {isModerator && pendingQs.length > 0 && (
          <>
            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Pending ({pendingQs.length})
              </h4>
              <ScrollArea className="h-64">
                <div className="space-y-2 pr-1">
                  {pendingQs.map((q) => (
                    <div key={q.id} className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <p className="text-xs">{q.text}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-5 px-1.5 hover:bg-green-500/20" 
                            onClick={() => handleApprove(q.id)}
                            title="Approve"
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-5 px-1.5 hover:bg-red-500/20" 
                            onClick={() => handleReject(q.id)}
                            title="Reject & Delete"
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
            <Separator />
          </>
        )}

        {!isModerator && questions.some(q => (q.status === 'pending' || q.status === 'rejected') && (q.askedById === user?.id || q.askedById === user?.id)) && (
          <>
            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5 text-indigo-400">
                <AlertCircle className="h-3 w-3" />
                My Submissions ({questions.filter(q => (q.status === 'pending' || q.status === 'rejected') && (q.askedById === user?.id || q.askedById === user?.id)).length})
              </h4>
              <div className="space-y-2 pr-1 max-h-64 overflow-y-auto">
                {questions
                  .filter(q => (q.status === 'pending' || q.status === 'rejected') && (q.askedById === user?.id || q.askedById === user?.id))
                  .map((q) => (
                    <div 
                      key={q.id} 
                      className={`p-2 rounded-lg border text-xs ${
                        q.status === 'pending' 
                          ? 'bg-yellow-500/10 border-yellow-500/20' 
                          : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <p className="text-xs">{q.text}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-[--color-text-secondary]">Asked by you</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] px-1.5 py-0 h-4 border-0 ${
                            q.status === 'pending'
                              ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/15'
                              : 'text-red-500 bg-red-500/10 hover:bg-red-500/15'
                          }`}
                        >
                          {q.status === 'pending' ? 'Pending Approval' : 'Rejected'}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <Separator className="my-2" />
          </>
        )}

        <div>
          <h4 className="text-xs font-medium mb-2">Approved ({approvedQs.length})</h4>
          <ScrollArea className="h-[450px]">
            <div className="space-y-2 pr-1">
              {approvedQs.length === 0 ? (
                <p className="text-xs text-[--color-text-secondary] text-center py-4">No approved questions yet</p>
              ) : (
                approvedQs.map((q) => (
                  <div key={q.id} className="p-2 bg-[--color-surface] rounded-lg border border-[--color-border]">
                    <p className="text-xs">{q.text}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-[--color-text-secondary]">{q.askedBy}</span>
                      <span className="text-[10px] text-[--color-text-secondary]">
                        {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
  );
}
