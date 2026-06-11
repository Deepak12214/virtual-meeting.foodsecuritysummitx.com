import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Search, CheckCircle, XCircle, Users, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  registeredAt: Date;
}

export function OrganizerUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@startup.com',
      role: 'startup',
      company: 'AI Innovations',
      registeredAt: new Date('2026-05-16T10:30:00'),
    },
    {
      id: '2',
      name: 'Bob Wilson',
      email: 'bob@ventures.com',
      role: 'investor',
      company: 'Future Fund',
      registeredAt: new Date('2026-05-16T14:20:00'),
    },
    {
      id: '3',
      name: 'Carol Martinez',
      email: 'carol@corp.com',
      role: 'exhibitor',
      company: 'DataFlow Systems',
      registeredAt: new Date('2026-05-17T08:15:00'),
    },
  ]);

  const handleApprove = (userId: string) => {
    const user = pendingUsers.find((u) => u.id === userId);
    setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
    toast.success('User approved', {
      description: `${user?.name} has been granted access`,
    });
  };

  const handleReject = (userId: string) => {
    const user = pendingUsers.find((u) => u.id === userId);
    setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
    toast.error('User rejected', {
      description: `${user?.name} has been denied access`,
    });
  };

  const filteredUsers = pendingUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-slide-in-down">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve user registrations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-in-up">
        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-2xl">{pendingUsers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">2,847</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardDescription>Approved Today</CardDescription>
            <CardTitle className="text-2xl">156</CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardHeader>
            <CardDescription>Active Now</CardDescription>
            <CardTitle className="text-2xl">1,423</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Approvals */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>Pending Approvals ({filteredUsers.length})</span>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found' : 'No pending approvals'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-lg transition-all duration-300 hover:border-primary"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {user.role.replace('_', ' ')}
                        </Badge>
                        {user.company && (
                          <Badge variant="secondary">{user.company}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registered {user.registeredAt.toLocaleDateString()} at{' '}
                        {user.registeredAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-green-600 border-green-600 hover:bg-green-50 flex-1 sm:flex-initial"
                      onClick={() => handleApprove(user.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-initial"
                      onClick={() => handleReject(user.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
