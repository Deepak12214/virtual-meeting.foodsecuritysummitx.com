import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';

interface AdvancedTimerProps {
  initialSeconds: number;
  type: 'session' | 'speaker' | 'pitch' | 'break';
  canControl?: boolean;
  onTimeUp?: () => void;
}

export function AdvancedTimer({
  initialSeconds,
  type,
  canControl = false,
  onTimeUp
}: AdvancedTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [warningTriggered, setWarningTriggered] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

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
  }, [isRunning, onTimeUp]);

  useEffect(() => {
    // Trigger warning at 2 minutes remaining
    if (timeRemaining === 120 && !warningTriggered) {
      setWarningTriggered(true);
    }
  }, [timeRemaining, warningTriggered]);

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
    if (timeRemaining === 0) return 'text-red-500';
    if (timeRemaining <= 60) return 'text-red-500';
    if (timeRemaining <= 120) return 'text-yellow-500';
    return 'text-[--color-text]';
  };

  const getTimerBg = () => {
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
          <Badge variant={isRunning ? 'default' : 'secondary'} className="text-[10px] h-4">
            {isRunning ? 'Running' : 'Paused'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono font-bold ${getTimerColor()}`}>
            {formatTime(timeRemaining)}
          </div>
          {timeRemaining === 0 && (
            <p className="text-xs text-red-500 font-medium mt-1">TIME UP</p>
          )}
          {timeRemaining > 0 && timeRemaining <= 120 && (
            <p className="text-xs text-yellow-600 font-medium mt-1">
              {timeRemaining <= 60 ? 'FINAL MINUTE' : 'WARNING: 2 MINUTES'}
            </p>
          )}
        </div>

        {/* Controls */}
        {canControl && (
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
