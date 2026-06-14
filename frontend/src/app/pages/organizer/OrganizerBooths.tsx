import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Store, Eye, Users, Plus, Edit, Loader2 } from 'lucide-react';
import { fetchBooths, type Booth } from '../../services/boothService';

export function OrganizerBooths() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooths()
      .then(setBooths)
      .catch((err) => console.warn('Failed to fetch booths:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booth Management</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Manage sponsor and exhibitor booths
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Booth
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Booths</CardDescription>
            <CardTitle className="text-2xl">{booths.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Live Now</CardDescription>
            <CardTitle className="text-2xl">
              {booths.filter((b) => b.isLive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Visits</CardDescription>
            <CardTitle className="text-2xl">891</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg. Visit Duration</CardDescription>
            <CardTitle className="text-2xl">3:42</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Booth List */}
      <Card>
        <CardHeader>
          <CardTitle>All Booths</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {booths.map((booth) => (
              <div
                key={booth.id}
                className="flex items-start justify-between p-4 bg-[--color-surface] rounded-lg border border-[--color-border]"
              >
                <div className="flex items-start gap-3 flex-1">
                  <img
                    src={booth.logo}
                    alt={booth.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{booth.name}</h3>
                      {booth.tier && (
                        <Badge variant="secondary" className="capitalize">
                          {booth.tier}
                        </Badge>
                      )}
                      {booth.isLive && (
                        <Badge className="bg-green-500 gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[--color-text-secondary] mb-2">
                      {booth.category === 'sponsor' ? 'Sponsor' : 'Exhibitor'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[--color-text-secondary]">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {booth.visitCount} visits
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {booth.representatives.length} representatives
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Analytics
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
