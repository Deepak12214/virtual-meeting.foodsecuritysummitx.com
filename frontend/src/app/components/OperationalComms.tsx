import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { MessageSquare, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface CommMessage {
  id: string;
  from: string;
  role: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'alert' | 'notification';
  priority?: 'normal' | 'high' | 'urgent';
}

export function OperationalComms() {
  const [messages, setMessages] = useState<CommMessage[]>([
    {
      id: '1',
      from: 'David Kumar',
      role: 'Organizer',
      message: 'All set for keynote. Ready to go live in 2 minutes.',
      timestamp: new Date(Date.now() - 120000),
      type: 'message',
      priority: 'normal',
    },
    {
      id: '2',
      from: 'System',
      role: 'System',
      message: 'Speaker joined backstage',
      timestamp: new Date(Date.now() - 60000),
      type: 'notification',
      priority: 'normal',
    },
    {
      id: '3',
      from: 'Rachel Green',
      role: 'Host',
      message: 'Audio check complete. Ready to introduce speaker.',
      timestamp: new Date(Date.now() - 30000),
      type: 'message',
      priority: 'normal',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const message: CommMessage = {
      id: `${messages.length + 1}`,
      from: 'You',
      role: 'Organizer',
      message: newMessage,
      timestamp: new Date(),
      type: 'message',
      priority: 'normal',
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'notification':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      default:
        return <MessageSquare className="h-3 w-3 text-[--color-text-secondary]" />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority || priority === 'normal') return null;

    return (
      <Badge
        variant={priority === 'urgent' ? 'destructive' : 'default'}
        className="text-[10px] h-4"
      >
        {priority}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <CardTitle className="text-sm">Operational Comms</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {messages.length} messages
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Private communication with event team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages */}
        <ScrollArea className="h-48 pr-3">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg ${
                  msg.from === 'You'
                    ? 'bg-blue-500/10 border border-blue-500/20 ml-4'
                    : 'bg-[--color-surface] border border-[--color-border] mr-4'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {getMessageIcon(msg.type)}
                    <span className="text-xs font-medium">{msg.from}</span>
                    <span className="text-[10px] text-[--color-text-secondary]">
                      • {msg.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getPriorityBadge(msg.priority)}
                    <span className="text-[10px] text-[--color-text-secondary]">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[--color-text]">{msg.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Send message to team..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="text-xs h-8"
          />
          <Button size="sm" onClick={handleSend} className="h-8 px-3">
            <Send className="h-3 w-3" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Alert
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
            <Clock className="h-3 w-3 mr-1" />
            Timer
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
