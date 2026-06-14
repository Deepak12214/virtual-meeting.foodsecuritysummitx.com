/**
 * meetingService.ts
 * Centralized API service for all 100ms meeting-related API calls.
 * Import and call these functions from pages — no raw fetch() in components.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeetingParticipant {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
}

export interface Meeting {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  scheduledTime: string | Date;
  duration: number;
  status: 'active' | 'scheduled' | 'completed';
  hmsRoomId?: string;
  creator?: MeetingParticipant;
  participants: MeetingParticipant[];
}

export interface TokenResponse {
  token: string;
  hmsRoomId: string;
  role: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledTime: Date | string;
  duration: number;
}

// ─── Meeting List ─────────────────────────────────────────────────────────────

/**
 * Fetch all meetings from the backend.
 */
export async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch(`${API_URL}/meetings`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch meetings');
  return data.meetings as Meeting[];
}

// ─── Single Meeting ───────────────────────────────────────────────────────────

/**
 * Fetch a single meeting by ID.
 */
export async function fetchMeetingById(meetingId: string): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch meeting');
  return data.meeting as Meeting;
}

// ─── Create Meeting ───────────────────────────────────────────────────────────

/**
 * Create / schedule a new meeting. Returns the created meeting.
 */
export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create meeting');
  return data.meeting as Meeting;
}

// ─── Join Token ───────────────────────────────────────────────────────────────

/**
 * Request a secure 100ms join token for a meeting.
 * Returns the signed JWT token and the mapped 100ms role.
 */
export async function fetchJoinToken(meetingId: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/token`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate join token');
  return { token: data.token, hmsRoomId: data.hmsRoomId, role: data.role };
}

// ─── Register Join ────────────────────────────────────────────────────────────

/**
 * Register that the current user has joined a meeting in the DB.
 * Fire-and-forget safe; errors are swallowed.
 */
export async function registerJoin(meetingId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/meetings/${meetingId}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.warn('registerJoin failed silently:', err);
  }
}

// ─── End Meeting ──────────────────────────────────────────────────────────────

/**
 * End a meeting (sets status → completed in DB).
 */
export async function endMeeting(meetingId: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to end meeting');
}

/**
 * Update meeting details (title, description, status).
 */
export async function updateMeeting(
  meetingId: string,
  payload: { title?: string; description?: string; status?: 'active' | 'scheduled' | 'completed' }
): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update meeting details');
  return data.meeting as Meeting;
}

// ─── Special Rooms ────────────────────────────────────────────────────────────

/**
 * Get or auto-create the Main Stage broadcast room.
 */
export async function fetchMainStageRoom(): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/main-stage/room`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Main Stage room');
  return data.meeting as Meeting;
}

/**
 * Get or auto-create the Startup Pitch Ceremony room.
 */
export async function fetchPitchRoom(): Promise<Meeting> {
  const res = await fetch(`${API_URL}/meetings/pitch/room`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Pitch Ceremony room');
  return data.meeting as Meeting;
}

// ─── Lobby / Waiting Room ──────────────────────────────────────────────────────

/**
 * Submit a join request to the meeting lobby
 */
export async function submitLobbyRequest(meetingId: string, peerId: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/lobby/request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ peerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit lobby request');
}

/**
 * Check current user's lobby request status
 */
export async function getLobbyStatus(meetingId: string): Promise<{ status: string; peerId: string | null }> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/lobby/status`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch lobby status');
  return { status: data.status, peerId: data.peerId };
}

/**
 * Get all pending lobby requests (Organizer only)
 */
export async function getLobbyRequests(meetingId: string): Promise<any[]> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/lobby/requests`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch lobby requests');
  return data.requests;
}

/**
 * Admit a participant from the lobby (Organizer only)
 */
export async function admitLobbyParticipant(meetingId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/lobby/admit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to admit participant');
}

/**
 * Deny a participant from the lobby (Organizer only)
 */
export async function denyLobbyParticipant(meetingId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/lobby/deny`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deny participant');
}

