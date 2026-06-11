import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AlertTriangle,
  MicOff,
  MessageSquareOff,
  Video,
  Ban,
  Power,
  Shield,
  AlertOctagon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

export function EmergencyControls() {
  const [emergencyMode, setEmergencyMode] = useState(false);

  const handleMuteAll = () => {
    toast.warning('All participants muted', {
      description: 'Emergency: All microphones have been disabled',
    });
  };

  const handleDisableQA = () => {
    toast.warning('Q&A disabled', {
      description: 'Question submissions have been disabled',
    });
  };

  const handleDisableChat = () => {
    toast.warning('Chat disabled', {
      description: 'Chat has been disabled for all participants',
    });
  };

  const handlePauseLivestream = () => {
    toast.error('Livestream paused', {
      description: 'Main stage livestream has been paused',
    });
  };

  const handleFreezeAccess = () => {
    toast.error('Room access frozen', {
      description: 'All room access has been frozen',
    });
  };

  const handleEndSession = () => {
    toast.error('Session terminated', {
      description: 'Emergency session termination executed',
    });
  };

  const toggleEmergencyMode = () => {
    setEmergencyMode(!emergencyMode);
    if (!emergencyMode) {
      toast.error('Emergency Mode Activated', {
        description: 'All emergency controls are now available',
      });
    } else {
      toast.success('Emergency Mode Deactivated', {
        description: 'Normal operations resumed',
      });
    }
  };

  return (
    <Card className={emergencyMode ? 'border-red-500 bg-red-500/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <CardTitle className="text-sm">Emergency Controls</CardTitle>
          </div>
          <Badge variant={emergencyMode ? 'destructive' : 'outline'} className="text-[10px]">
            {emergencyMode ? 'ACTIVE' : 'Standby'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Admin-only emergency operational controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Emergency Mode Toggle */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant={emergencyMode ? 'destructive' : 'outline'}
              className="w-full"
              size="sm"
            >
              <AlertOctagon className="h-4 w-4 mr-2" />
              {emergencyMode ? 'Deactivate' : 'Activate'} Emergency Mode
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {emergencyMode ? 'Deactivate' : 'Activate'} Emergency Mode?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {emergencyMode
                  ? 'This will return all systems to normal operation.'
                  : 'This will enable all emergency controls. Use only in critical situations.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={toggleEmergencyMode}>
                {emergencyMode ? 'Deactivate' : 'Activate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {emergencyMode && (
          <>
            <div className="h-px bg-red-500/20" />

            {/* Emergency Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-600">Emergency Actions</p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleMuteAll}
                >
                  <MicOff className="h-3 w-3 mr-1" />
                  Mute All
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleDisableQA}
                >
                  <MessageSquareOff className="h-3 w-3 mr-1" />
                  Disable Q&A
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleDisableChat}
                >
                  <MessageSquareOff className="h-3 w-3 mr-1" />
                  Disable Chat
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handlePauseLivestream}
                >
                  <Video className="h-3 w-3 mr-1" />
                  Pause Stream
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleFreezeAccess}
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Freeze Access
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="text-xs h-8">
                      <Power className="h-3 w-3 mr-1" />
                      End Session
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Emergency Session Termination</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately terminate the current session and disconnect all
                        participants. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEndSession} className="bg-red-500">
                        Terminate Session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
              <p className="text-[10px] text-yellow-700 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                All emergency actions are logged and auditable
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
