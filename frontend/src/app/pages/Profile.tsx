import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { User, Mail, Building2, Shield, Calendar, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function Profile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const startEditing = () => {
    setName(user.name);
    setCompany(user.company || '');
    setPhone(user.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateProfile(name, company, phone);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {isEditing ? (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              ) : (
                <Input id="name" value={user.name} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input id="email" type="email" value={user.email} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              ) : (
                <Input id="phone" value={user.phone || 'N/A'} readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </Label>
              {isEditing ? (
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isSubmitting}
                />
              ) : (
                <Input id="company" value={user.company || 'N/A'} readOnly />
              )}
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
          </div>

          <div className="pt-4 border-t border-[--color-border]">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="ml-2"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={startEditing}>Edit Profile</Button>
            )}
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
              <Badge className="bg-green-500">Allowed</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[--color-surface]">
              <span className="text-sm">Submit Questions</span>
              <Badge className="bg-green-500">Allowed</Badge>
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