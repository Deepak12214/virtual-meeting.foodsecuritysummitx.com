import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Store, Search, Users, FileText, Video, Eye, Crown, Award, Medal, Loader2, Plus } from 'lucide-react';
import { fetchBooths, createBooth, uploadGenericFile, getImageUrl, type Booth } from '../services/boothService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function ExhibitionHall() {
  const { user } = useAuth();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sponsor' | 'exhibitor'>('all');

  // Add Booth Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'sponsor' | 'exhibitor'>('exhibitor');
  const [newTier, setNewTier] = useState<'platinum' | 'gold' | 'silver'>('silver');
  const [newDescription, setNewDescription] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadGenericFile(file);
      setNewLogo(url);
      toast.success('Logo image uploaded successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload logo image.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const loadBooths = () => {
    setLoading(true);
    fetchBooths()
      .then((data) => setBooths(data))
      .catch((err) => console.error('Error fetching booths:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooths();
  }, []);

  const filteredBooths = booths.filter((booth) => {
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

  const userHasBooth = user && booths.some((b) =>
    b.representatives && b.representatives.some((r) => {
      const repId = typeof r === 'object' ? (r._id || r.id) : r;
      const currentUserId = user._id || user.id;
      return String(repId) === String(currentUserId);
    })
  );

  const canCreate = user && 
    ['admin', 'exhibitor', 'sponsor'].includes(user.role) && 
    (user.role === 'admin' || !userHasBooth);

  const handleCreateBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      toast.error('Please enter a booth name');
      return;
    }
    setSubmitting(true);
    try {
      await createBooth({
        name: newName,
        category: newCategory,
        tier: newCategory === 'sponsor' ? newTier : undefined,
        description: newDescription,
        logo: newLogo,
        brochures: []
      });
      toast.success('Exhibitor booth created successfully!');
      setAddOpen(false);
      setNewName('');
      setNewDescription('');
      setNewLogo('');
      loadBooths();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create booth');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Exhibition Hall</h1>
          <p className="text-[--color-text-secondary] mt-2">
            Explore sponsor and exhibitor booths, download brochures, and connect with representatives
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setAddOpen(true)} className="gap-2 bg-primary hover:bg-primary/80 self-start md:self-center">
            <Plus className="h-4 w-4" />
            Add Exhibitor
          </Button>
        )}
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

      {/* Add Booth Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 text-slate-900 shadow-2xl relative">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900">Add Sponsor or Exhibitor Booth</CardTitle>
              <CardDescription className="text-slate-500">
                Create a virtual booth. As the creator, you will automatically be added as a representative.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateBooth} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Booth Name</label>
                  <Input
                    placeholder="e.g. InnovateLab Technologies"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="exhibitor">Exhibitor</option>
                      <option value="sponsor">Sponsor</option>
                    </select>
                  </div>

                  {newCategory === 'sponsor' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Tier</label>
                      <select
                        value={newTier}
                        onChange={(e) => setNewTier(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="platinum">Platinum</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <Textarea
                    placeholder="Short description of products or platform..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Logo Image File</label>
                  {newLogo ? (
                    <div className="flex items-center justify-between h-10 px-3 border border-slate-200 rounded-md bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <img src={getImageUrl(newLogo)} alt="Uploaded logo preview" className="w-6 h-6 rounded object-cover" />
                        <span className="text-slate-600 truncate max-w-[200px]">Logo Ready</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setNewLogo('')} className="text-red-500 hover:text-red-600 h-7 px-2">
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        required
                        disabled={uploadingLogo}
                        className="bg-white border border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {uploadingLogo && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={submitting} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || uploadingLogo} className="gap-2 bg-primary hover:bg-primary/80 text-white">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Booth
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
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
  getTierIcon: (tier?: string) => ReactNode;
  getTierBadge: (tier?: string) => ReactNode;
}) {
  return (
    <Link to={`/exhibition/${booth.id}`}>
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <img
              src={getImageUrl(booth.logo)}
              alt={booth.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg truncate">{booth.name}</CardTitle>
                {booth.tier && getTierIcon(booth.tier)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {booth.tier && getTierBadge(booth.tier)}
                {booth.isLive && (
                  <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600 border-none px-2 py-0.5 text-xs font-semibold animate-in fade-in zoom-in duration-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live Exhibitor
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2">{booth.description}</CardDescription>

          <div className="flex flex-wrap gap-2">

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
