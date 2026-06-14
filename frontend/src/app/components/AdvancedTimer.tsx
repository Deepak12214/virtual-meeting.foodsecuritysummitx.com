import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';

interface AdvancedTimerProps {
  initialSeconds?: number;
  type: 'session' | 'speaker' | 'pitch' | 'break';
  canControl?: boolean;
  onTimeUp?: () => void;
  status?: string;
  scheduledTime?: string | Date;
}

export function AdvancedTimer({
  initialSeconds = 0,
  type,
  canControl = false,
  onTimeUp,
  status,
  scheduledTime
}: AdvancedTimerProps) {
  const isControlledByMeeting = status !== undefined && scheduledTime !== undefined;

  // Local state for when meeting is NOT controlled by meeting status/scheduledTime
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [warningTriggered, setWarningTriggered] = useState(false);

  // Controlled meeting timer state
  const [meetingDisplayText, setMeetingDisplayText] = useState('');
  const [meetingTimerType, setMeetingTimerType] = useState<'countdown' | 'elapsed' | 'offline'>('offline');

  useEffect(() => {
    if (!isRunning || isControlledByMeeting) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, onTimeUp, isControlledByMeeting]);

  useEffect(() => {
    if (isControlledByMeeting) return;
    // Trigger warning at 2 minutes remaining
    if (timeRemaining === 120 && !warningTriggered) {
      setWarningTriggered(true);
    }
  }, [timeRemaining, warningTriggered, isControlledByMeeting]);

  useEffect(() => {
    if (!isControlledByMeeting) return;

    const targetDate = new Date(scheduledTime);
    const initialNow = new Date();
    
    // If status is active, count up from the scheduledTime if it is in the past,
    // or from initialNow (current time when component was set to active) if it is in the future.
    const activeStart = targetDate <= initialNow ? targetDate : initialNow;

    const updateTimer = () => {
      const now = new Date();
      
      if (status === 'active') {
        const diff = now.getTime() - activeStart.getTime();
        const diffMs = diff < 0 ? 0 : diff;
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        
        const pad = (n: number) => String(n).padStart(2, '0');
        if (hours > 0) {
          setMeetingDisplayText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        } else {
          setMeetingDisplayText(`${pad(minutes)}:${pad(seconds)}`);
        }
        setMeetingTimerType('elapsed');
      } else if (status === 'scheduled' && targetDate > now) {
        const diff = targetDate.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        const pad = (n: number) => String(n).padStart(2, '0');
        if (hours > 0) {
          setMeetingDisplayText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        } else {
          setMeetingDisplayText(`${pad(minutes)}:${pad(seconds)}`);
        }
        setMeetingTimerType('countdown');
      } else {
        setMeetingDisplayText('Stream is Offline');
        setMeetingTimerType('offline');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [status, scheduledTime, isControlledByMeeting]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isControlledByMeeting) {
      if (status === 'active') return 'text-emerald-500';
      if (status === 'scheduled' && meetingTimerType === 'countdown') return 'text-amber-500';
      return 'text-gray-400';
    }
    if (timeRemaining === 0) return 'text-red-500';
    if (timeRemaining <= 60) return 'text-red-500';
    if (timeRemaining <= 120) return 'text-yellow-500';
    return 'text-[--color-text]';
  };

  const getTimerBg = () => {
    if (isControlledByMeeting) {
      if (status === 'active') return 'bg-emerald-500/10 border-emerald-500/20';
      if (status === 'scheduled' && meetingTimerType === 'countdown') return 'bg-amber-500/10 border-amber-500/20';
      return 'bg-gray-500/5 border-gray-500/10';
    }
    if (timeRemaining === 0) return 'bg-red-500/20 border-red-500/30';
    if (timeRemaining <= 60) return 'bg-red-500/10 border-red-500/20';
    if (timeRemaining <= 120) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-[--color-surface] border-[--color-border]';
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'session':
        return 'Session Timer';
      case 'speaker':
        return 'Speaker Timer';
      case 'pitch':
        return 'Pitch Timer';
      case 'break':
        return 'Break Timer';
    }
  };

  return (
    <Card className={`${getTimerBg()} transition-colors`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <CardTitle className="text-xs">{getTypeLabel()}</CardTitle>
          </div>
          {isControlledByMeeting ? (
            status === 'active' ? (
              <Badge className="text-[10px] h-4 bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse">
                LIVE
              </Badge>
            ) : status === 'scheduled' && meetingTimerType === 'countdown' ? (
              <Badge className="text-[10px] h-4 bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold">
                SCHEDULED
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] h-4 text-gray-400">
                OFFLINE
              </Badge>
            )
          ) : (
            <Badge variant={isRunning ? 'default' : 'secondary'} className="text-[10px] h-4">
              {isRunning ? 'Running' : 'Paused'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
            {isControlledByMeeting ? meetingDisplayText : formatTime(timeRemaining)}
          </div>
          {isControlledByMeeting ? (
            status === 'active' ? (
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Live duration</p>
            ) : status === 'scheduled' && meetingTimerType === 'countdown' ? (
              <p className="text-[10px] text-amber-600 font-medium mt-1">Starts in (Countdown)</p>
            ) : (
              <p className="text-[10px] text-gray-500 font-medium mt-1">Offline</p>
            )
          ) : (
            <>
              {timeRemaining === 0 && (
                <p className="text-xs text-red-500 font-medium mt-1">TIME UP</p>
              )}
              {timeRemaining > 0 && timeRemaining <= 120 && (
                <p className="text-xs text-yellow-600 font-medium mt-1">
                  {timeRemaining <= 60 ? 'FINAL MINUTE' : 'WARNING: 2 MINUTES'}
                </p>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {!isControlledByMeeting && canControl && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTimeRemaining(initialSeconds);
                  setWarningTriggered(false);
                }}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={() => setTimeRemaining((prev) => prev + 60)}
              >
                <Plus className="h-3 w-3 mr-0.5" />
                1m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={() => setTimeRemaining((prev) => prev + 300)}
              >
                <Plus className="h-3 w-3 mr-0.5" />
                5m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={() => setTimeRemaining((prev) => Math.max(0, prev - 60))}
              >
                <Minus className="h-3 w-3 mr-0.5" />
                1m
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={() => setTimeRemaining((prev) => Math.max(0, prev - 300))}
              >
                <Minus className="h-3 w-3 mr-0.5" />
                5m
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
