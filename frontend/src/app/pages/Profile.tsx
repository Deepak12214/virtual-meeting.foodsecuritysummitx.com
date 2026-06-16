import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { User, Mail, Building2, Shield, Calendar } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Manage your account information
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-semibold">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-1">{user.name}</CardTitle>
              <CardDescription className="text-base">{user.email}</CardDescription>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="capitalize">
                  {user.role.replace('_', ' ')}
                </Badge>
                {user.company && (
                  <Badge variant="secondary">{user.company}</Badge>
                )}
                {user.isApproved ? (
                  <Badge className="bg-green-500">Approved</Badge>
                ) : (
                  <Badge variant="destructive">Pending Approval</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your registration information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input id="name" value={user.name} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input id="email" type="email" value={user.email} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Input
                id="role"
                value={user.role.replace('_', ' ')}
                readOnly
                className="capitalize"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </Label>
              <Input id="company" value={user.company || 'N/A'} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registered" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Registered
              </Label>
              <Input
                id="registered"
                value={new Date(user.createdAt).toLocaleDateString()}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account Status
              </Label>
              <Input
                id="status"
                value={user.isApproved ? 'Approved' : 'Pending Approval'}
                readOnly
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[--color-border]">
            <Button disabled>Edit Profile</Button>
            <p className="text-xs text-[--color-text-secondary] mt-2">
              Profile editing is currently disabled in the demo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Access Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Access Permissions</CardTitle>
          <CardDescription>Features available to your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Watch Main Stage</span>
              <Badge className="bg-green-500">Allowed</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Browse Exhibition Hall</span>
              <Badge className="bg-green-500">Allowed</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Join Meetings</span>
              <Badge className="bg-green-500">
                Allowed
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Submit Questions</span>
              <Badge className="bg-green-500">
                Allowed
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Access Startup Pitch</span>
              <Badge className={['startup_participant', 'organizer', 'admin'].includes(user.role) ? 'bg-green-500' : 'bg-red-500'}>
                {['startup_participant', 'organizer', 'admin'].includes(user.role) ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}