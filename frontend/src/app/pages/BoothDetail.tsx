import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  Loader2,
  Edit,
  Trash2,
  Plus,
  FileText,
  Clock,
  Phone,
  Mail,
  UserCheck,
  DownloadCloud,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchBoothById,
  updateBooth,
  uploadBrochureFile,
  createBoothMeeting,
  endBoothMeeting,
  logBoothLead,
  fetchBoothLeads,
  claimBooth,
  getImageUrl,
  uploadGenericFile,
  type Booth,
  type Lead
} from '../services/boothService';

export function BoothDetail() {
  const { boothId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'leads'>('details');

  // Edit states
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editBrochures, setEditBrochures] = useState<{ name: string; url: string; file?: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Load booth details
  const loadBoothDetails = async () => {
    if (!boothId) return;
    try {
      const data = await fetchBoothById(boothId);
      setBooth(data);
      setEditName(data.name || '');
      setEditLogoUrl(data.logo || '');
      setEditDescription(data.description || '');
      setEditBrochures(data.brochures || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load booth details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (booth) {
      setEditName(booth.name || '');
      setEditLogoUrl(booth.logo || '');
      setEditLogoFile(null);
      setEditDescription(booth.description || '');
      setEditBrochures(booth.brochures || []);
    }
    setEditOpen(true);
  };

  useEffect(() => {
    loadBoothDetails();
  }, [boothId]);

  // Representative auth check
  const isRep = booth && user && (
    user.role === 'admin' ||
    (booth.representatives && booth.representatives.some((r: any) => (r._id || r) === user.id)) ||
    (user.company && user.company.trim().toLowerCase() === booth.name.trim().toLowerCase())
  );

  // Check if current user is eligible to claim representative rights
  const canClaim = booth && user && !isRep && (
    user.role === 'exhibitor' || user.role === 'sponsor' || user.role === 'admin'
  );

  // Claim representative rights
  const handleClaimBooth = async () => {
    if (!boothId) return;
    setClaiming(true);
    try {
      await claimBooth(boothId);
      toast.success('🎉 You have claimed representative rights for this booth!');
      loadBoothDetails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to claim booth rights.');
    } finally {
      setClaiming(false);
    }
  };

  // Fetch leads
  const loadLeads = async () => {
    if (!boothId || !isRep) return;
    setLoadingLeads(true);
    try {
      const data = await fetchBoothLeads(boothId);
      setLeads(data);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isRep && activeTab === 'leads') {
      loadLeads();
    }
  }, [isRep, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
      </div>
    );
  }

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

  // Live meeting actions
  const handleStartMeeting = async () => {
    try {
      toast.promise(createBoothMeeting(booth.id), {
        loading: 'Starting video meeting room...',
        success: ({ meeting }) => {
          loadBoothDetails();
          navigate(`/exhibition/meeting/${meeting._id || meeting.id}`);
          return 'Meeting room started! Redirecting...';
        },
        error: 'Failed to start meeting room. Please try again.'
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleEndMeeting = async () => {
    try {
      await endBoothMeeting(booth.id);
      toast.success('Live meeting ended successfully.');
      loadBoothDetails();
    } catch (err: any) {
      toast.error('Failed to end live meeting.');
    }
  };

  const handleJoinMeeting = async () => {
    const meetingId = booth.meeting?._id || booth.meeting?.id || booth.meeting;
    if (!meetingId) {
      toast.error('No active meeting found for this booth.');
      return;
    }

    if (!isRep) {
      await logBoothLead(booth.id, 'join_meeting');
    }

    toast.success('Joining live meeting...');
    navigate(`/exhibition/meeting/${meetingId}`);
  };

  // Brochure download action
  const handleDownload = async (brochureName: string, brochureUrl: string) => {
    if (!isRep) {
      await logBoothLead(booth.id, 'download_brochure', brochureName);
    }
    toast.success(`Downloading: ${brochureName}`);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = getImageUrl(brochureUrl);
    link.setAttribute('download', brochureName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Editing booth logic
  const handleSaveDetails = async () => {
    if (!editName.trim()) {
      toast.error('Booth name is required.');
      return;
    }
    setUploading(true);
    try {
      // Upload Logo if changed
      let finalLogoUrl = editLogoUrl;
      if (editLogoFile) {
        finalLogoUrl = await uploadGenericFile(editLogoFile);
      }

      const updatedBrochures = await Promise.all(
        editBrochures.map(async (bro) => {
          if (bro.file) {
            const uploadedUrl = await uploadBrochureFile(booth.id, bro.file);
            return { name: bro.name, url: uploadedUrl };
          }
          return { name: bro.name, url: bro.url };
        })
      );

      await updateBooth(booth.id, {
        name: editName.trim(),
        logo: finalLogoUrl,
        description: editDescription,
        brochures: updatedBrochures
      });

      toast.success('Booth details updated successfully!');
      setEditOpen(false);
      loadBoothDetails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update booth details.');
    } finally {
      setUploading(false);
    }
  };

  const addBrochureRow = () => {
    if (editBrochures.length >= 3) {
      toast.warning('Maximum of 3 brochures allowed.');
      return;
    }
    setEditBrochures([...editBrochures, { name: '', url: '' }]);
  };

  const removeBrochureRow = (index: number) => {
    setEditBrochures(editBrochures.filter((_, i) => i !== index));
  };

  const updateBrochureField = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...editBrochures];
    updated[index] = { ...updated[index], [field]: value };
    setEditBrochures(updated);
  };

  const handleFileChange = (index: number, file: File) => {
    const updated = [...editBrochures];
    updated[index] = { ...updated[index], name: updated[index].name || file.name.replace(/\.[^/.]+$/, ""), file };
    setEditBrochures(updated);
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
      {/* Back Button & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link to="/exhibition">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted border-none rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            Back to Exhibition Hall
          </Button>
        </Link>
        
        {isRep && (
          <div className="flex gap-2 bg-muted/30 p-1.5 rounded-xl border border-border">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('details')}
              className={`rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-none'
              }`}
            >
              Booth Details
            </Button>
            <Button
              variant={activeTab === 'leads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('leads')}
              className={`gap-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeTab === 'leads'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-none'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Leads Tracker
              {leads.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                  {leads.length}
                </Badge>
              )}
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'details' ? (
        <>
          {/* Booth Header Card */}
          <Card className="border-border bg-card/60 backdrop-blur-md overflow-hidden relative shadow-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            <CardContent className="p-6 md:p-8 pt-8">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="relative group shrink-0 mx-auto md:mx-0">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
                  <img
                    src={getImageUrl(booth.logo)}
                    alt={booth.name}
                    className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border border-border/50 bg-white/10 dark:bg-black/20 shadow-md"
                  />
                </div>
                
                <div className="flex-1 space-y-3 min-w-0 text-center md:text-left">
                  <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{booth.name}</h1>
                    {booth.tier && getTierIcon(booth.tier)}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                    {booth.tier && getTierBadge(booth.tier)}
                    {booth.isLive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold gap-1.5 animate-pulse rounded-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Room Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-2.5 py-0.5 text-[11px]">Offline</Badge>
                    )}
                    <Badge variant="secondary" className="gap-1.5 text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 px-2.5 py-0.5">
                      <Eye className="h-3.5 w-3.5" />
                      {booth.visitCount} visits
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
                    {booth.description}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 self-stretch md:self-center justify-center md:items-end">
                  {isRep && (
                    <Button variant="outline" className="gap-2 border-border hover:bg-muted text-foreground font-semibold rounded-xl h-10 w-full md:w-auto cursor-pointer" onClick={handleOpenEdit}>
                      <Edit className="h-4 w-4" />
                      Edit Booth Details
                    </Button>
                  )}
                  {canClaim && (
                    <Button variant="secondary" className="gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl h-10 w-full md:w-auto cursor-pointer" onClick={handleClaimBooth} disabled={claiming}>
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Claim representative rights
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Connect with Representatives */}
              <Card className={`border-border bg-card/40 backdrop-blur-md shadow-sm transition-all duration-300 ${booth.isLive ? "border-emerald-500/30 bg-emerald-500/[0.01]" : ""}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-foreground">Connect with Representatives</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Join a live video meeting to discuss solutions, request details, and ask questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {booth.isLive ? (
                    <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl border border-emerald-500/20 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Video className="h-5 w-5 text-emerald-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">Live Room is Active!</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Connect now to speak directly with an exhibitor representative. Your profile information will be shared with the representatives.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/10 rounded-xl h-11 cursor-pointer" size="lg" onClick={handleJoinMeeting}>
                          <Video className="h-4 w-4" />
                          Join Live Meeting
                        </Button>
                        {isRep && (
                          <Button variant="destructive" size="lg" className="font-semibold rounded-xl h-11 cursor-pointer" onClick={handleEndMeeting}>
                            End Meeting
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/60">
                        <Video className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">No live meeting active at the moment</p>
                        <p className="text-xs text-muted-foreground">Booth representatives are currently offline. Check back later.</p>
                      </div>
                      {isRep && (
                        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-10 shadow-lg shadow-emerald-500/10 cursor-pointer" size="lg" onClick={handleStartMeeting}>
                          <Video className="h-4 w-4" />
                          Start Live Meeting
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Brochures & Downloads */}
              <Card className="border-border bg-card/40 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-foreground">Download Brochures</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Access product specifications, platform resources, and case studies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {booth.brochures && booth.brochures.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {booth.brochures.map((brochure, index) => (
                        <div
                          key={index}
                          className="group flex items-center justify-between p-4 bg-muted/20 border border-border rounded-2xl hover:bg-muted/40 hover:border-emerald-500/25 transition-all duration-350 shadow-sm"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shrink-0">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-sm text-foreground block truncate group-hover:text-emerald-500 transition-colors leading-normal">{brochure.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">PDF Document</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-border hover:bg-muted text-foreground font-semibold rounded-xl shrink-0 h-9 cursor-pointer"
                            onClick={() => handleDownload(brochure.name, brochure.url)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl">
                      <p className="text-sm text-muted-foreground">No brochures available for download at the moment.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Privacy Notice */}
              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/15 rounded-2xl flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Lead Sharing Notice</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    By connecting to the live meeting or downloading documents, your basic profile details (Name, Contact, Company, and Role) will be shared with the representatives of {booth.name} for business follow-up.
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Representatives Card */}
              <Card className="border-border bg-card/40 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    Representatives
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {booth.representatives && booth.representatives.length > 0 ? (
                      booth.representatives.map((rep: any, index: number) => (
                        <div key={index} className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-muted/30 transition-all duration-200">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-extrabold shadow-sm border border-emerald-400/20">
                            {rep.name ? rep.name.split(' ').map((n: string) => n[0]).join('') : 'R'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground leading-normal">{rep.name || 'Representative'}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {rep.role ? rep.role.replace('_', ' ') : 'Representative'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground/80">
                        <p className="text-xs">No active representatives. Active representatives will be auto-linked.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Your Profile Card */}
              {user && (
                <Card className="border-border bg-card/40 backdrop-blur-md shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-foreground">Your Profile Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs pt-0">
                    <div className="flex justify-between border-b border-border pb-2.5">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-bold text-foreground">{user.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2.5">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-bold text-foreground truncate max-w-[160px]">{user.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2.5">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-bold text-foreground">{user.phone}</span>
                    </div>
                    {user.company && (
                      <div className="flex justify-between border-b border-border pb-2.5">
                        <span className="text-muted-foreground">Company</span>
                        <span className="font-bold text-foreground">{user.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span className="font-bold text-foreground capitalize">{user.role.replace('_', ' ')}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Leads Tracker Dashboard */
        <Card className="border-border bg-card/60 backdrop-blur-md shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground">Visitor Leads Tracker</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Real-time list of visitors who joined meetings or downloaded resources from your booth.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadLeads} className="gap-2 border-border hover:bg-muted text-foreground font-semibold rounded-xl h-9 self-start sm:self-center cursor-pointer" disabled={loadingLeads}>
                <Loader2 className={`h-4 w-4 ${loadingLeads ? 'animate-spin' : ''}`} />
                Sync Leads
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingLeads ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : leads.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-muted/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground border-b border-border text-xs uppercase tracking-wider font-bold">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Visitor Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Contact Details</th>
                      <th className="p-4">Interaction Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {leads.map((lead) => {
                      const visitor = lead.user;
                      if (!visitor) return null;
                      return (
                        <tr key={lead._id || Math.random().toString()} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-emerald-500" />
                              {new Date(lead.timestamp).toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4 font-bold whitespace-nowrap">
                            {visitor.name}
                          </td>
                          <td className="p-4 whitespace-nowrap capitalize text-xs">
                            {visitor.role.replace('_', ' ')}
                          </td>
                          <td className="p-4 whitespace-nowrap font-semibold text-xs">
                            {visitor.company || '-'}
                          </td>
                          <td className="p-4 text-xs space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono">{visitor.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono">{visitor.phone}</span>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {lead.action === 'join_meeting' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 gap-1 py-1 rounded-lg text-xs font-semibold">
                                <Video className="h-3.5 w-3.5" />
                                Joined Video Meeting
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 gap-1 py-1 rounded-lg text-xs font-semibold max-w-[220px] truncate">
                                <DownloadCloud className="h-3.5 w-3.5" />
                                Brochure: {lead.details || 'Document'}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-muted/5">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/45 mb-3 animate-pulse" />
                <h4 className="font-bold text-sm text-foreground mb-1">No Visitor Leads Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">Visitor interactions (downloads or meeting room entries) will automatically register here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Details Overlay Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-card border border-border text-foreground shadow-2xl relative overflow-hidden animate-scale-in rounded-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-xl font-bold">Edit Booth Details</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Modify your brand name, logo image, company description, and upload brochures (max 3).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-h-[75vh] overflow-y-auto pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booth Title</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter booth name..."
                    className="bg-muted/30 border-border text-foreground placeholder-muted-foreground/70 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booth Logo</label>
                  <div className="flex items-center gap-3">
                    {editLogoUrl && (
                      <img
                        src={editLogoFile ? URL.createObjectURL(editLogoFile) : getImageUrl(editLogoUrl)}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-border/50 shrink-0"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditLogoFile(file);
                          setEditLogoUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="text-xs bg-muted/30 border-border text-foreground focus:ring-emerald-500 focus:border-emerald-500 flex-1 pt-2 rounded-xl h-10 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booth Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter a descriptive pitch for your company, vision, or products..."
                  rows={4}
                  className="bg-muted/30 border-border text-foreground placeholder-muted-foreground/70 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
                />
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brochure PDFs (Max 3)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border hover:bg-muted text-foreground font-semibold rounded-lg h-8 px-3 cursor-pointer"
                    onClick={addBrochureRow}
                    disabled={editBrochures.length >= 3}
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Add Brochure
                  </Button>
                </div>

                <div className="space-y-3">
                  {editBrochures.map((brochure, index) => (
                    <div key={index} className="p-4 bg-muted/10 rounded-xl border border-border space-y-3 relative">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Brochure #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBrochureRow(index)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Custom Name/Title</span>
                          <Input
                            placeholder="e.g. Platform Whitepaper"
                            value={brochure.name}
                            onChange={(e) => updateBrochureField(index, 'name', e.target.value)}
                            className="bg-card border-border text-foreground placeholder-muted-foreground/70 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-10"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Upload PDF File</span>
                          {brochure.url && !brochure.file ? (
                            <div className="flex items-center justify-between h-10 px-3 bg-muted/30 border border-border rounded-xl text-xs">
                              <span className="truncate max-w-[150px] text-foreground font-medium">{brochure.name || 'Uploaded Document'}</span>
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none font-bold py-0.5 px-2">Ready</Badge>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileChange(index, file);
                              }}
                              className="text-xs bg-card border-border text-foreground focus:ring-emerald-500 focus:border-emerald-500 pt-2 rounded-xl h-10 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {editBrochures.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6 bg-muted/10 rounded-xl border border-dashed border-border">
                      No brochures added yet. Click "Add Brochure" to upload one.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={uploading} className="border-border text-foreground hover:bg-muted font-semibold rounded-xl h-10 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleSaveDetails} disabled={uploading} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-10 px-4 cursor-pointer">
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
