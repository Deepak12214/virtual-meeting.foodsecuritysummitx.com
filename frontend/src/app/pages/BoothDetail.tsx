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
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Exhibition Hall
          </Button>
        </Link>
        
        {isRep && (
          <div className="flex gap-2 bg-[--color-surface] p-1 rounded-lg border border-[--color-border]">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('details')}
            >
              Booth Details
            </Button>
            <Button
              variant={activeTab === 'leads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('leads')}
              className="gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              Leads Tracker
              {leads.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
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
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <img
                  src={getImageUrl(booth.logo)}
                  alt={booth.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border border-[--color-border] shadow-sm"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{booth.name}</h1>
                    {booth.tier && getTierIcon(booth.tier)}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    {booth.tier && getTierBadge(booth.tier)}
                    {booth.isLive ? (
                      <Badge className="gap-1 bg-green-500 text-white animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Live Room Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      {booth.visitCount} visits
                    </Badge>
                  </div>
                  
                  <p className="text-[--color-text-secondary] leading-relaxed max-w-3xl">
                    {booth.description}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 self-start md:self-center">
                  {isRep && (
                    <Button variant="outline" className="gap-2" onClick={handleOpenEdit}>
                      <Edit className="h-4 w-4" />
                      Edit Booth Details
                    </Button>
                  )}
                  {canClaim && (
                    <Button variant="secondary" className="gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20" onClick={handleClaimBooth} disabled={claiming}>
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Claim representative rights
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Connect with Representatives */}
              <Card className={booth.isLive ? "border-green-500/30 bg-green-500/[0.02]" : ""}>
                <CardHeader>
                  <CardTitle className="text-xl">Connect with Representatives</CardTitle>
                  <CardDescription>
                    Join a live video meeting to discuss solutions, request details, and ask questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booth.isLive ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-sm font-semibold text-green-600 mb-1">
                          Live room is active!
                        </p>
                        <p className="text-xs text-[--color-text-secondary]">
                          When you join, your profile information will be shared with the exhibitor representatives.
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" size="lg" onClick={handleJoinMeeting}>
                          <Video className="h-5 w-5" />
                          Join Live Meeting
                        </Button>
                        {isRep && (
                          <Button variant="destructive" size="lg" onClick={handleEndMeeting}>
                            End Meeting
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-6 bg-[--color-surface] rounded-lg border border-[--color-border] text-center">
                        <p className="text-sm text-[--color-text-secondary] mb-4">
                          No live meeting room is active at the moment.
                        </p>
                        {isRep && (
                          <Button className="gap-2" size="lg" onClick={handleStartMeeting}>
                            <Video className="h-5 w-5" />
                            Start Live Meeting
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Brochures & Downloads */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Download Brochures</CardTitle>
                  <CardDescription>
                    Access product specifications, platform resources, and case studies.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {booth.brochures && booth.brochures.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {booth.brochures.map((brochure, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-[--color-surface] rounded-lg border border-[--color-border] hover:bg-[--color-surface-elevated] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm block">{brochure.name}</span>
                              <span className="text-[10px] text-[--color-text-secondary]">PDF Document</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleDownload(brochure.name, brochure.url)}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-[--color-surface] rounded-lg border border-[--color-border] text-center">
                      <p className="text-sm text-[--color-text-secondary]">No brochures available for download.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Privacy Notice */}
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-600">Lead Sharing Notice</h4>
                      <p className="text-xs text-[--color-text-secondary] mt-1">
                        By connecting to the live meeting or downloading documents, your basic profile details (Name, Contact, Company, and Role) will be shared with the representatives of {booth.name} for business follow-up.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Representatives Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-[--color-text-secondary]" />
                    Representatives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {booth.representatives && booth.representatives.length > 0 ? (
                      booth.representatives.map((rep: any, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-sm">
                            {rep.name ? rep.name.split(' ').map((n: string) => n[0]).join('') : 'R'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{rep.name || 'Representative'}</p>
                            <p className="text-xs text-[--color-text-secondary] capitalize">
                              {rep.role ? rep.role.replace('_', ' ') : 'Representative'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-[--color-text-secondary]">No logged representatives. Active reps will be auto-linked.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Your Profile Card */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-[--color-border] pb-2">
                      <span className="text-[--color-text-secondary]">Name</span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-[--color-border] pb-2">
                      <span className="text-[--color-text-secondary]">Email</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between border-b border-[--color-border] pb-2">
                      <span className="text-[--color-text-secondary]">Phone</span>
                      <span className="font-medium">{user.phone}</span>
                    </div>
                    {user.company && (
                      <div className="flex justify-between border-b border-[--color-border] pb-2">
                        <span className="text-[--color-text-secondary]">Company</span>
                        <span className="font-medium">{user.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[--color-text-secondary]">Role</span>
                      <span className="font-medium capitalize">{user.role.replace('_', ' ')}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Leads Tracker Dashboard */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Visitor Leads Tracker</CardTitle>
                <CardDescription>
                  Real-time list of visitors who joined meetings or downloaded resources from your booth.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadLeads} className="gap-1.5" disabled={loadingLeads}>
                <Loader2 className={`h-4 w-4 ${loadingLeads ? 'animate-spin' : ''}`} />
                Sync Leads
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-[--color-primary]" />
              </div>
            ) : leads.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[--color-border]">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[--color-surface-elevated] text-[--color-text-secondary] border-b border-[--color-border]">
                      <th className="p-4 font-semibold">Date & Time</th>
                      <th className="p-4 font-semibold">Visitor Name</th>
                      <th className="p-4 font-semibold">Role</th>
                      <th className="p-4 font-semibold">Company</th>
                      <th className="p-4 font-semibold">Contact Details</th>
                      <th className="p-4 font-semibold">Interaction Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {leads.map((lead) => {
                      const visitor = lead.user;
                      if (!visitor) return null;
                      return (
                        <tr key={lead._id || Math.random().toString()} className="hover:bg-[--color-surface]/50 transition-colors">
                          <td className="p-4 whitespace-nowrap text-xs text-[--color-text-secondary]">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(lead.timestamp).toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4 font-medium whitespace-nowrap">
                            {visitor.name}
                          </td>
                          <td className="p-4 whitespace-nowrap capitalize text-xs">
                            {visitor.role.replace('_', ' ')}
                          </td>
                          <td className="p-4 whitespace-nowrap font-medium text-xs">
                            {visitor.company || '-'}
                          </td>
                          <td className="p-4 text-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-[--color-text-secondary]" />
                              {visitor.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-[--color-text-secondary]" />
                              {visitor.phone}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {lead.action === 'join_meeting' ? (
                              <Badge className="bg-green-500 text-white gap-1 py-1">
                                <Video className="h-3 w-3" />
                                Joined Video Meeting
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500 text-white gap-1 py-1">
                                <DownloadCloud className="h-3 w-3" />
                                Downloaded Brochure: {lead.details || 'Document'}
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
              <div className="p-12 text-center border border-dashed border-[--color-border] rounded-lg">
                <Users className="h-12 w-12 mx-auto text-[--color-text-secondary] mb-3" />
                <h4 className="font-semibold text-sm mb-1">No Leads Found</h4>
                <p className="text-xs text-[--color-text-secondary]">Leads will automatically show up when users click download or enter meetings.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Details Overlay Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border border-slate-200 text-slate-900 shadow-2xl relative overflow-hidden">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-900">Edit Booth Details</CardTitle>
              <CardDescription className="text-slate-500">
                Modify name, logo, description, and upload up to 3 brochures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[75vh] overflow-y-auto pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Booth Title (Card Title)</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter booth name..."
                    className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Booth Logo</label>
                  <div className="flex items-center gap-3">
                    {editLogoUrl && (
                      <img
                        src={editLogoFile ? URL.createObjectURL(editLogoFile) : getImageUrl(editLogoUrl)}
                        alt="Preview"
                        className="w-10 h-10 rounded-md object-cover border border-slate-200"
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
                      className="text-xs bg-white border border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 flex-1"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Booth Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter a descriptive pitch for your booth..."
                  rows={4}
                  className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-black">Brochure PDFs (Max 3)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-slate-300 text-black hover:bg-primary"
                    onClick={addBrochureRow}
                    disabled={editBrochures.length >= 3}
                  >
                    <Plus className="h-4 w-4" />
                    Add Brochure
                  </Button>
                </div>

                <div className="space-y-3">
                  {editBrochures.map((brochure, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 relative">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-xs font-semibold text-slate-500">Brochure #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBrochureRow(index)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Custom Name/Title</span>
                          <Input
                            placeholder="e.g. Platform Whitepaper"
                            value={brochure.name}
                            onChange={(e) => updateBrochureField(index, 'name', e.target.value)}
                            className="bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-slate-500">Upload PDF File</span>
                          {brochure.url && !brochure.file ? (
                            <div className="flex items-center justify-between h-9 px-3 bg-white border border-slate-200 rounded-md text-xs">
                              <span className="truncate max-w-[150px] text-slate-700 font-medium">{brochure.name || 'Uploaded Document'}</span>
                              <Badge className="bg-blue-500/10 text-blue-600 border-none hover:bg-blue-500/10 font-normal">Ready</Badge>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileChange(index, file);
                              }}
                              className="text-xs bg-white border border-slate-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {editBrochures.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No brochures added yet. Click "Add Brochure" to upload one.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={uploading} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                  Cancel
                </Button>
                <Button onClick={handleSaveDetails} disabled={uploading} className="gap-2 bg-primary hover:bg-primary-dark text-white">
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
