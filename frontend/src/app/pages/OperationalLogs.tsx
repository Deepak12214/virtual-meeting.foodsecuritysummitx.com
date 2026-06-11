import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  FileText,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Shield,
  Activity,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  user: string;
  role: string;
  action: string;
  target?: string;
  status: 'success' | 'warning' | 'error';
  details?: string;
  category: 'permission' | 'moderation' | 'session' | 'emergency' | 'timer' | 'user';
}

export function OperationalLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date('2026-05-17T09:45:23'),
      user: 'David Kumar',
      role: 'Organizer',
      action: 'Session Started',
      target: 'Opening Keynote',
      status: 'success',
      details: 'Session went live successfully',
      category: 'session',
    },
    {
      id: '2',
      timestamp: new Date('2026-05-17T09:50:15'),
      user: 'James Mitchell',
      role: 'Moderator',
      action: 'Question Approved',
      target: 'Question #q1',
      status: 'success',
      details: 'Q&A moderation action',
      category: 'moderation',
    },
    {
      id: '3',
      timestamp: new Date('2026-05-17T09:52:30'),
      user: 'Rachel Green',
      role: 'Host',
      action: 'Speaker Introduced',
      target: 'Dr. James Mitchell',
      status: 'success',
      details: 'Speaker transition completed',
      category: 'session',
    },
    {
      id: '4',
      timestamp: new Date('2026-05-17T09:55:00'),
      user: 'David Kumar',
      role: 'Organizer',
      action: 'Timer Extended',
      target: 'Session Timer',
      status: 'warning',
      details: 'Extended by 10 minutes due to Q&A overflow',
      category: 'timer',
    },
    {
      id: '5',
      timestamp: new Date('2026-05-17T10:00:45'),
      user: 'James Mitchell',
      role: 'Moderator',
      action: 'Question Rejected',
      target: 'Question #q2',
      status: 'warning',
      details: 'Inappropriate content flagged',
      category: 'moderation',
    },
    {
      id: '6',
      timestamp: new Date('2026-05-17T10:05:12'),
      user: 'Sarah Chen',
      role: 'Admin',
      action: 'Emergency Mode Activated',
      target: 'Main Stage',
      status: 'error',
      details: 'Technical issue required emergency controls',
      category: 'emergency',
    },
    {
      id: '7',
      timestamp: new Date('2026-05-17T10:06:00'),
      user: 'Sarah Chen',
      role: 'Admin',
      action: 'All Participants Muted',
      target: 'Main Stage',
      status: 'error',
      details: 'Emergency mute during technical issue',
      category: 'emergency',
    },
    {
      id: '8',
      timestamp: new Date('2026-05-17T10:10:30'),
      user: 'Sarah Chen',
      role: 'Admin',
      action: 'Emergency Mode Deactivated',
      target: 'Main Stage',
      status: 'success',
      details: 'Normal operations resumed',
      category: 'emergency',
    },
    {
      id: '9',
      timestamp: new Date('2026-05-17T10:15:00'),
      user: 'David Kumar',
      role: 'Organizer',
      action: 'User Approved',
      target: 'alice@startup.com',
      status: 'success',
      details: 'Manual approval granted',
      category: 'user',
    },
    {
      id: '10',
      timestamp: new Date('2026-05-17T10:20:00'),
      user: 'David Kumar',
      role: 'Organizer',
      action: 'Permission Granted',
      target: 'Rachel Green - Host Access',
      status: 'success',
      details: 'Temporary host permission for afternoon session',
      category: 'permission',
    },
  ];

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Critical</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      permission: 'bg-purple-500',
      moderation: 'bg-blue-500',
      session: 'bg-green-500',
      emergency: 'bg-red-500',
      timer: 'bg-orange-500',
      user: 'bg-cyan-500',
    };

    return (
      <Badge className={`${colors[category]} text-white text-[10px]`}>
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operational Activity Logs</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Audit trail of all operational actions and system events
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-2xl">{mockLogs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Success</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {mockLogs.filter((l) => l.status === 'success').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {mockLogs.filter((l) => l.status === 'warning').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {mockLogs.filter((l) => l.status === 'error').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-text-secondary]" />
          <Input
            placeholder="Search logs by action, user, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === 'session' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('session')}
          >
            Session
          </Button>
          <Button
            variant={selectedCategory === 'moderation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('moderation')}
          >
            Moderation
          </Button>
          <Button
            variant={selectedCategory === 'emergency' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('emergency')}
          >
            Emergency
          </Button>
          <Button
            variant={selectedCategory === 'permission' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('permission')}
          >
            Permission
          </Button>
        </div>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
          <CardDescription>Real-time audit trail of all operational actions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
                  <p className="text-[--color-text-secondary]">No logs found matching your criteria</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-[--color-surface] rounded-lg border border-[--color-border] hover:bg-[--color-surface-elevated] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(log.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{log.action}</h3>
                            {getCategoryBadge(log.category)}
                            {getStatusBadge(log.status)}
                          </div>

                          {log.target && (
                            <p className="text-sm text-[--color-text-secondary] mb-1">
                              Target: {log.target}
                            </p>
                          )}

                          {log.details && (
                            <p className="text-sm text-[--color-text-secondary] mb-2">
                              {log.details}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-[--color-text-secondary]">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user}
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {log.role}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
