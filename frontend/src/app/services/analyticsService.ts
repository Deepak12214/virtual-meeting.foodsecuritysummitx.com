/**
 * analyticsService.ts
 * Centralized API service for database-backed Analytics Dashboard.
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

export interface UserAnalytics {
  totalRegistrations: number;
  activeUsers: number;
  roleData: { role: string; count: number }[];
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    role: string;
    company?: string;
    createdAt: string;
  }[];
  historyData: { label: string; value: number }[];
}

export interface MeetingAnalytics {
  totalMeetings: number;
  scheduled: number;
  active: number;
  completed: number;
  totalHours: number;
  uniqueParticipants: number;
  list: {
    _id: string;
    title: string;
    description?: string;
    status: string;
    scheduledTime: string;
    duration: number;
    creator?: { name: string; email: string; role: string };
    participants: { name: string; email: string; role: string }[];
  }[];
  historyData: { label: string; value: number }[];
}

export interface BoothAnalyticsItem {
  id: string;
  name: string;
  category: 'sponsor' | 'exhibitor';
  tier?: string;
  cumulativeVisits: number;
  rangeInteractions: number;
  rangeDownloads: number;
  representativeCount: number;
}

export interface BoothAnalytics {
  totalBooths: number;
  sponsors: number;
  exhibitors: number;
  totalVisits: number;
  brochureDownloads: number;
  topBooths: { name: string; count: number }[];
  list: BoothAnalyticsItem[];
}

export interface EngagementAnalytics {
  mainStage: {
    viewersCount: number;
    totalQuestions: number;
    approvedQuestions: number;
  };
  pitchStage: {
    viewersCount: number;
    totalQuestions: number;
    approvedQuestions: number;
  };
  timeline: {
    action: string;
    user: string;
    time: string;
  }[];
}

export interface AnalyticsData {
  users: UserAnalytics;
  meetings: MeetingAnalytics;
  booths: BoothAnalytics;
  engagement: EngagementAnalytics;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Fetch event analytics based on date filter and custom date range.
 */
export async function fetchAnalytics(
  filter: 'today' | 'yesterday' | 'last7days' | 'lastmonth' | 'custom',
  startDate?: string,
  endDate?: string
): Promise<AnalyticsData> {
  const params = new URLSearchParams({ filter });
  if (filter === 'custom') {
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
  }

  const res = await fetch(`${API_URL}/analytics?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch analytics statistics');
  }
  return data.data as AnalyticsData;
}
