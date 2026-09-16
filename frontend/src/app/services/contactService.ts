/**
 * contactService.ts
 * Frontend service for Contact Us form submission & Admin Contact Management.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ContactSubmissionData {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  description: string;
}

export interface ContactRecord {
  _id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedContactsResponse {
  success: boolean;
  data: ContactRecord[];
  pagination: PaginationInfo;
}

/**
 * Submit contact form (Public)
 */
export async function submitContactForm(data: ContactSubmissionData): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Failed to submit contact form');
  }

  return body;
}

/**
 * Fetch paginated contacts list (Admin / Organizer)
 */
export async function fetchContacts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedContactsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);

  const res = await fetch(`${API_URL}/contact?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Failed to fetch contact inquiries');
  }

  return body;
}

/**
 * Update status of a contact inquiry (Admin / Organizer)
 */
export async function updateContactStatus(
  id: string,
  status: 'new' | 'in_progress' | 'resolved'
): Promise<ContactRecord> {
  const res = await fetch(`${API_URL}/contact/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Failed to update contact status');
  }

  return body.data;
}

/**
 * Delete a contact submission (Admin / Organizer)
 */
export async function deleteContact(id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/contact/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Failed to delete contact record');
  }

  return true;
}
