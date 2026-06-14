/**
 * boothService.ts
 * Centralized API service for all booth/exhibitor-related API calls.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Brochure {
  name: string;
  url: string;
}

export interface LeadUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  role: string;
}

export interface Lead {
  _id?: string;
  user: LeadUser;
  action: 'join_meeting' | 'download_brochure';
  details?: string;
  timestamp: string;
}

export interface Booth {
  id: string;
  _id: string;
  name: string;
  category: 'sponsor' | 'exhibitor';
  tier?: 'platinum' | 'gold' | 'silver';
  logo: string;
  description: string;
  brochures: Brochure[];
  representatives: any[];
  isLive: boolean;
  visitCount: number;
  meeting?: any;
}

export interface BoothMeeting {
  id?: string;
  _id?: string;
  booth: any;
  title: string;
  description?: string;
  status: 'active' | 'completed';
  hmsRoomId: string;
  creator: any;
  participants: any[];
}

export interface TokenResponse {
  token: string;
  hmsRoomId: string;
  role: string;
}

// ─── Service API Calls ─────────────────────────────────────────────────────────

/**
 * Fetch all booths from the database.
 */
export async function fetchBooths(): Promise<Booth[]> {
  const res = await fetch(`${API_URL}/booths`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch booths');
  return data.booths as Booth[];
}

/**
 * Create a new custom booth (admin/exhibitor/sponsor only).
 */
export async function createBooth(payload: {
  name: string;
  category: 'sponsor' | 'exhibitor';
  tier?: 'platinum' | 'gold' | 'silver';
  description?: string;
  logo?: string;
  brochures?: Brochure[];
}): Promise<Booth> {
  const res = await fetch(`${API_URL}/booths`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create booth');
  return data.booth as Booth;
}

/**
 * Claim representative rights of a booth (exhibitors/sponsors/admins).
 */
export async function claimBooth(id: string): Promise<Booth> {
  const res = await fetch(`${API_URL}/booths/${id}/claim`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to claim booth');
  return data.booth as Booth;
}

/**
 * Fetch details for a single booth by ID.
 */
export async function fetchBoothById(id: string): Promise<Booth> {
  const res = await fetch(`${API_URL}/booths/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch booth');
  return data.booth as Booth;
}

/**
 * Update booth details (restricted to reps & admins).
 */
export async function updateBooth(id: string, payload: { description?: string; brochures?: Brochure[] }): Promise<Booth> {
  const res = await fetch(`${API_URL}/booths/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update booth');
  return data.booth as Booth;
}

/**
 * Upload brochure PDF file (restricted to reps & admins).
 */
/**
 * Upload any image or pdf file generally.
 */
export async function uploadGenericFile(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/booths/upload-file`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to upload file');
  return data.url as string;
}

export async function uploadBrochureFile(id: string, file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('brochure', file);

  const res = await fetch(`${API_URL}/booths/${id}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to upload file');
  return data.url as string;
}

/**
 * Create/provision live meeting room for booth (unlimited timer).
 */
export async function createBoothMeeting(id: string): Promise<{ booth: Booth; meeting: BoothMeeting }> {
  const res = await fetch(`${API_URL}/booths/${id}/meeting/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start live meeting');
  return { booth: data.booth, meeting: data.meeting };
}

/**
 * End active meeting room for booth.
 */
export async function endBoothMeeting(id: string): Promise<Booth> {
  const res = await fetch(`${API_URL}/booths/${id}/meeting/end`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to end live meeting');
  return data.booth as Booth;
}

/**
 * Fetch booth meeting details by ID.
 */
export async function fetchBoothMeetingById(meetingId: string): Promise<BoothMeeting> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch booth meeting');
  return data.meeting as BoothMeeting;
}

/**
 * Get join token for Booth Meeting.
 */
export async function fetchBoothMeetingJoinToken(meetingId: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/token`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate booth meeting token');
  return { token: data.token, hmsRoomId: data.hmsRoomId, role: data.role };
}

/**
 * Log a new visitor lead (Downloaded brochure / joined live meeting).
 * Fail-silent safe.
 */
export async function logBoothLead(id: string, action: 'join_meeting' | 'download_brochure', details?: string): Promise<void> {
  try {
    await fetch(`${API_URL}/booths/${id}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, details }),
    });
  } catch (err) {
    console.warn('logBoothLead failed silently:', err);
  }
}

/**
 * Fetch all visitor leads for a booth (restricted to reps & admins).
 */
export async function fetchBoothLeads(id: string): Promise<Lead[]> {
  const res = await fetch(`${API_URL}/booths/${id}/leads`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch booth leads');
  return data.leads as Lead[];
}

// ─── Booth Meeting Lobby Queue Requests ──────────────────────────────────────

export async function submitBoothLobbyRequest(meetingId: string, peerId: string): Promise<void> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/lobby/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit lobby request');
}

export async function getBoothLobbyStatus(meetingId: string): Promise<{ status: string; peerId: string | null }> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/lobby/status`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch lobby status');
  return { status: data.status, peerId: data.peerId };
}

export async function getBoothLobbyRequests(meetingId: string): Promise<any[]> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/lobby/requests`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch lobby requests');
  return data.requests;
}

export async function admitBoothLobbyParticipant(meetingId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/lobby/admit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to admit participant');
}

export async function denyBoothLobbyParticipant(meetingId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/booths/meeting/${meetingId}/lobby/deny`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deny participant');
}
