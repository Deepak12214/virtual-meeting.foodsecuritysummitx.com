/**
 * questionService.ts
 * Centralized API service for all Live Q&A operations.
 * Import and call these functions from components — no raw fetch() in components.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Question {
  id: string;
  _id?: string;
  meetingId: string;
  text: string;
  askedBy: string;
  askedById: string;
  status: 'pending' | 'approved' | 'rejected';
  adminApproved?: boolean;
  hostApproved?: boolean;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Fetch all questions for a given meeting/stream.
 */
export async function fetchQuestions(meetingId: string): Promise<Question[]> {
  const res = await fetch(`${API_URL}/questions?meetingId=${meetingId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch questions');
  return data.questions as Question[];
}

/**
 * Submit a new question.
 */
export async function submitQuestion(meetingId: string, text: string): Promise<Question> {
  const res = await fetch(`${API_URL}/questions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ meetingId, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit question');
  return data.question as Question;
}

/**
 * Approve a question (Moderator/Admin only).
 */
export async function approveQuestion(questionId: string): Promise<Question> {
  const res = await fetch(`${API_URL}/questions/${questionId}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve question');
  return data.question as Question;
}

/**
 * Reject/Delete a question (Moderator/Admin only).
 */
export async function rejectQuestion(questionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/questions/${questionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject question');
}
