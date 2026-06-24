import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Store, Search, Users, FileText, Video, Eye, Crown, Award, Medal, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { fetchBooths, createBooth, uploadGenericFile, getImageUrl, type Booth } from '../services/boothService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function deleteBooth(boothId: string): Promise<void> {
  const res = await fetch(`${API_URL}/booths/${boothId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete booth');
}
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';
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
        return <Crown className="h-4 w-4 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />;
      case 'gold':
        return <Award className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      case 'silver':
        return <Medal className="h-4 w-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'platinum':
        return <Badge className="bg-purple-600/15 text-purple-400 border border-purple-500/25 px-2 py-0.5 text-[10px] font-bold">Platinum Partner</Badge>;
      case 'gold':
        return <Badge className="bg-amber-600/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold">Gold Partner</Badge>;
      case 'silver':
        return <Badge className="bg-slate-600/15 text-slate-400 border border-slate-500/25 px-2 py-0.5 text-[10px] font-bold">Silver Partner</Badge>;
      default:
        return null;
    }
  };

  const userHasBooth = user && booths.some((b) =>
    b.representatives && b.representatives.some((r) => {
      const repId = typeof r === 'object' ? (r._id || r.id) : r;
      const currentUserId = user.id;
      return String(repId) === String(currentUserId);
    })
  );

  const canCreate = user && 
    ['admin', 'exhibitor', 'sponsor'].includes(user.role) && 
    (user.role === USER_ROLES.ADMIN || !userHasBooth);

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
        tier: undefined,
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
          <h1 className="text-3xl font-bold text-[--color-text]">Exhibition Hall</h1>
          <p className="text-[--color-text-secondary] mt-2 text-sm max-w-2xl leading-relaxed">
            Explore premium sponsor and exhibitor booths, download product documents, and connect directly with industry representatives in live rooms.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setAddOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all duration-200 self-start md:self-center shadow-lg shadow-emerald-500/10">
            <Plus className="h-4 w-4" />
            Add virtual Booth
          </Button>
        )}
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Booths', value: filteredBooths.length, info: 'Active booths' },
          { label: 'Sponsors', value: sponsorBooths.length, info: 'Featured partners' },
          { label: 'Exhibitors', value: exhibitorBooths.length, info: 'Registered showcase' },
          { label: 'Live Now', value: filteredBooths.filter((b) => b.isLive).length, info: 'Broadcasting live', isGreen: true },
        ].map(({ label, value, info, isGreen }) => (
          <Card key={label} className="border-[--color-border] bg-[--color-surface] shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider">{label}</CardDescription>
              <CardTitle className={`text-3xl font-extrabold tracking-tight ${isGreen ? 'text-emerald-500 dark:text-emerald-400' : 'text-[--color-text]'}`}>{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-[--color-text-secondary]">{info}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[--color-surface] p-3 rounded-xl border border-[--color-border]/65 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-text-secondary]" />
          <Input
            placeholder="Search booths, category, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-[--color-surface-elevated] border-[--color-border] text-[--color-text] placeholder-[--color-text-secondary]/70 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-1.5 shrink-0">
          {[
            { id: 'all' as const, label: 'All Showcase' },
            { id: 'sponsor' as const, label: 'Sponsors' },
            { id: 'exhibitor' as const, label: 'Exhibitors' },
          ].map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-10 px-4 rounded-lg font-semibold text-xs border ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                  : 'border-[--color-border] hover:bg-[--color-surface-elevated] text-[--color-text-secondary] hover:text-[--color-text]'
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sponsor Booths (Featured Section) */}
      {sponsorBooths.length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-lg font-bold text-[--color-text] flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <span>Premium Partners & Sponsors</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sponsorBooths.map((booth) => (
              <BoothCard key={booth.id} booth={booth} getTierIcon={getTierIcon} getTierBadge={getTierBadge} isAdmin={user?.role === 'admin'} userId={user?.id ?? user?.id ?? ''} onDelete={() => { deleteBooth(booth.id).then(() => { toast.success('Booth deleted'); loadBooths(); }).catch((e: any) => toast.error(e.message)); }} />
            ))}
          </div>
        </div>
      )}

      {/* Exhibitor Booths (Showcase Section) */}
      {exhibitorBooths.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[--color-border]/50">
          <h2 className="text-lg font-bold text-[--color-text] flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-500" />
            <span>Exhibitors & Product Showcase</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exhibitorBooths.map((booth) => (
              <BoothCard key={booth.id} booth={booth} getTierIcon={getTierIcon} getTierBadge={getTierBadge} isAdmin={user?.role === 'admin'} userId={user?.id ?? user?.id ?? ''} onDelete={() => { deleteBooth(booth.id).then(() => { toast.success('Booth deleted'); loadBooths(); }).catch((e: any) => toast.error(e.message)); }} />
            ))}
          </div>
        </div>
      )}

      {filteredBooths.length === 0 && (
        <Card className="border-[--color-border] bg-[--color-surface]">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-500/5 flex items-center justify-center mx-auto border border-dashed border-[--color-border]">
              <Store className="h-8 w-8 text-[--color-text-secondary]/70" />
            </div>
            <h3 className="text-sm font-bold text-[--color-text]">No Booths Found</h3>
            <p className="text-xs text-[--color-text-secondary] max-w-xs mx-auto">Try refining your search queries or selecting another filter category above.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Booth Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 text-slate-900 shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setAddOpen(false)} 
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Create Virtual Booth</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Deploy a brand booth to showcase products. You will be assigned as a representative.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleCreateBooth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Booth Name</label>
                  <Input
                    placeholder="e.g. Acme Tech Solutions"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500 h-10 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="exhibitor" className="bg-white text-slate-900">Exhibitor</option>
                    <option value="sponsor" className="bg-white text-slate-900">Sponsor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Description</label>
                  <Textarea
                    placeholder="Detail your company products, services, or core vision..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Logo Image File</label>
                  {newLogo ? (
                    <div className="flex items-center justify-between h-10 px-3 border border-slate-300 rounded-lg bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <img src={getImageUrl(newLogo)} alt="Uploaded logo preview" className="w-6 h-6 rounded object-cover" />
                        <span className="text-slate-500 truncate max-w-[200px]">Logo Ready</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setNewLogo('')} className="text-rose-500 hover:text-rose-600 h-7 px-2">
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
                        className="bg-white border border-slate-300 text-slate-900 focus:ring-emerald-500 focus:border-emerald-500 h-10 rounded-lg text-xs pt-2"
                      />
                      {uploadingLogo && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={submitting} className="border-slate-300  text-slate-700 h-9 text-xs font-semibold bg-white">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || uploadingLogo} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-9 text-xs font-semibold px-4">
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
  isAdmin,
  userId,
  onDelete,
}: {
  booth: Booth;
  getTierIcon: (tier?: string) => ReactNode;
  getTierBadge: (tier?: string) => ReactNode;
  isAdmin?: boolean;
  userId?: string;
  onDelete?: () => void;
}) {
  // Show delete button to admins OR to the user who is a representative of this booth
  const isRep = userId && booth.representatives?.some((r) => {
    const repId = typeof r === 'object' ? (r._id || r.id) : r;
    return String(repId) === String(userId);
  });
  const canDelete = isAdmin || isRep;
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete booth "${booth.name}"? This is permanent and cannot be undone.`)) return;
    onDelete?.();
  };
  return (
    <Link to={`/exhibition/${booth.id}`} className="no-underline group block h-full">
      <Card className="border-[--color-border] bg-[--color-surface] hover:border-emerald-500/30 hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-350 h-full flex flex-col justify-between shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3.5">
            <img
              src={getImageUrl(booth.logo)}
              alt={booth.name}
              className="w-14 h-14 rounded-lg object-contain bg-white/20 border border-[--color-border]/40 p-1 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CardTitle className="text-base font-bold truncate text-[--color-text] group-hover:text-emerald-500 transition-colors leading-tight">
                  {booth.name}
                </CardTitle>
                {booth.tier && getTierIcon(booth.tier)}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {booth.tier && getTierBadge(booth.tier)}
                {booth.isLive && (
                  <Badge variant="default" className="gap-1 bg-emerald-500 hover:bg-emerald-600 border-none px-2 py-0.5 text-[10px] text-white font-bold animate-pulse shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>
                    Live Room
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <CardDescription className="line-clamp-2 text-xs text-[--color-text-secondary] leading-relaxed">
            {booth.description}
          </CardDescription>

          <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-[--color-border]/45">
            <div className="flex items-center gap-3.5 text-[10px] font-semibold text-[--color-text-secondary] uppercase tracking-wider">
              <div className="flex items-center gap-1 hover:text-[--color-text] transition-colors">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <span>{booth.representatives.length} Reps</span>
              </div>
              <div className="flex items-center gap-1 hover:text-[--color-text] transition-colors">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>{booth.brochures.length} Docs</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 h-5 px-1.5 bg-slate-500/10 border-transparent hover:bg-slate-500/15 text-[10px] font-medium text-[--color-text-secondary]">
                <Eye className="h-3 w-3 text-indigo-400" />
                <span>{booth.visitCount} Views</span>
              </Badge>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  title="Delete booth"
                  className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
