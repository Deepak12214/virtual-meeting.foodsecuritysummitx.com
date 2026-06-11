import { useParams, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  ArrowLeft,
  Video,
  Download,
  Users,
  Eye,
  CheckCircle,
  Crown,
  Award,
  Medal,
} from 'lucide-react';
import { MOCK_BOOTHS } from '../data/mockData';
import { toast } from 'sonner';

export function BoothDetail() {
  const { boothId } = useParams();
  const { user } = useAuth();
  const booth = MOCK_BOOTHS.find((b) => b.id === boothId);

  if (!booth) {
    return (
      <div className="text-center py-12">
        <p className="text-[--color-text-secondary]">Booth not found</p>
        <Link to="/exhibition">
          <Button className="mt-4">Back to Exhibition Hall</Button>
        </Link>
      </div>
    );
  }

  const handleJoinMeeting = () => {
    toast.success('Joining booth meeting...', {
      description: `Your profile has been shared with ${booth.name}`,
    });
  };

  const handleDownload = (brochureName: string) => {
    toast.success('Downloading...', {
      description: brochureName,
    });
  };

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'platinum':
        return <Crown className="h-5 w-5 text-purple-500" />;
      case 'gold':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'silver':
        return <Medal className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'platinum':
        return <Badge className="bg-purple-500">Platinum Sponsor</Badge>;
      case 'gold':
        return <Badge className="bg-yellow-500">Gold Sponsor</Badge>;
      case 'silver':
        return <Badge className="bg-gray-400">Silver Sponsor</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/exhibition">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Exhibition Hall
        </Button>
      </Link>

      {/* Booth Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={booth.logo}
              alt={booth.name}
              className="w-32 h-32 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{booth.name}</h1>
                {booth.tier && getTierIcon(booth.tier)}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {booth.tier && getTierBadge(booth.tier)}
                {booth.isLive && (
                  <Badge className="gap-1 bg-green-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" />
                  {booth.visitCount} visits
                </Badge>
              </div>
              <p className="text-[--color-text-secondary]">{booth.description}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Join Meeting */}
          <Card>
            <CardHeader>
              <CardTitle>Connect with Representatives</CardTitle>
              <CardDescription>
                Join a live meeting to discuss solutions and ask questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {booth.isLive ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm font-medium text-green-600 mb-2">
                      Representatives are available now!
                    </p>
                    <p className="text-xs text-[--color-text-secondary]">
                      When you join, your profile will be automatically shared with the booth representatives.
                    </p>
                  </div>
                  <Button className="w-full gap-2" size="lg" onClick={handleJoinMeeting}>
                    <Video className="h-4 w-4" />
                    Join Live Meeting
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-[--color-surface] rounded-lg border border-[--color-border] text-center">
                  <p className="text-sm text-[--color-text-secondary]">
                    No representatives available at the moment. Please check back later or download brochures below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brochures */}
          <Card>
            <CardHeader>
              <CardTitle>Download Brochures</CardTitle>
              <CardDescription>
                Access product information and resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {booth.brochures.map((brochure, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[--color-surface] rounded-lg border border-[--color-border] hover:bg-[--color-surface-elevated] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium">{brochure.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(brochure.name)}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lead Sharing Notice */}
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <CardTitle className="text-base">Lead Sharing</CardTitle>
                  <CardDescription className="mt-1">
                    When you interact with this booth (join meetings or download brochures), your basic profile information (name, email, company, role) will be shared with {booth.name} for follow-up purposes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Representatives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Representatives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {booth.representatives.map((rep, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                      {rep.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{rep.name}</p>
                      <p className="text-xs text-[--color-text-secondary]">{rep.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Your Profile Preview */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Profile</CardTitle>
                <CardDescription>
                  This information will be shared with booth representatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[--color-text-secondary]">Name:</span>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-[--color-text-secondary]">Email:</span>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  {user.company && (
                    <div>
                      <span className="text-[--color-text-secondary]">Company:</span>
                      <p className="font-medium">{user.company}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[--color-text-secondary]">Role:</span>
                    <p className="font-medium capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
