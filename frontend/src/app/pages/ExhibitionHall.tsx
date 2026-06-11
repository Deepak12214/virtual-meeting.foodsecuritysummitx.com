import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Store, Search, Users, FileText, Video, Eye, Crown, Award, Medal } from 'lucide-react';
import { MOCK_BOOTHS, Booth } from '../data/mockData';

export function ExhibitionHall() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sponsor' | 'exhibitor'>('all');

  const filteredBooths = MOCK_BOOTHS.filter((booth) => {
    const matchesSearch = booth.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booth.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || booth.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sponsorBooths = filteredBooths.filter((b) => b.category === 'sponsor');
  const exhibitorBooths = filteredBooths.filter((b) => b.category === 'exhibitor');

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'platinum':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'gold':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'silver':
        return <Medal className="h-4 w-4 text-gray-400" />;
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
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Exhibition Hall</h1>
        <p className="text-[--color-text-secondary] mt-2">
          Explore sponsor and exhibitor booths, download brochures, and connect with representatives
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-text-secondary]" />
          <Input
            placeholder="Search booths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === 'sponsor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('sponsor')}
          >
            Sponsors
          </Button>
          <Button
            variant={selectedCategory === 'exhibitor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('exhibitor')}
          >
            Exhibitors
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Booths</CardDescription>
            <CardTitle className="text-2xl">{filteredBooths.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sponsors</CardDescription>
            <CardTitle className="text-2xl">{sponsorBooths.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Exhibitors</CardDescription>
            <CardTitle className="text-2xl">{exhibitorBooths.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Live Now</CardDescription>
            <CardTitle className="text-2xl">
              {filteredBooths.filter((b) => b.isLive).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sponsor Booths (Featured) */}
      {sponsorBooths.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-500" />
            Sponsors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsorBooths.map((booth) => (
              <BoothCard key={booth.id} booth={booth} getTierIcon={getTierIcon} getTierBadge={getTierBadge} />
            ))}
          </div>
        </div>
      )}

      {/* Exhibitor Booths */}
      {exhibitorBooths.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Store className="h-5 w-5" />
            Exhibitors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exhibitorBooths.map((booth) => (
              <BoothCard key={booth.id} booth={booth} getTierIcon={getTierIcon} getTierBadge={getTierBadge} />
            ))}
          </div>
        </div>
      )}

      {filteredBooths.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-4" />
            <p className="text-[--color-text-secondary]">No booths found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BoothCard({
  booth,
  getTierIcon,
  getTierBadge,
}: {
  booth: Booth;
  getTierIcon: (tier?: string) => JSX.Element | null;
  getTierBadge: (tier?: string) => JSX.Element | null;
}) {
  return (
    <Link to={`/exhibition/${booth.id}`}>
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <img
              src={booth.logo}
              alt={booth.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{booth.name}</CardTitle>
                {booth.tier && getTierIcon(booth.tier)}
              </div>
              {booth.tier && getTierBadge(booth.tier)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2">{booth.description}</CardDescription>

          <div className="flex flex-wrap gap-2">
            {booth.isLive && (
              <Badge variant="default" className="gap-1 bg-green-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Live
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {booth.visitCount}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {booth.representatives.length} reps
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {booth.brochures.length} docs
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
