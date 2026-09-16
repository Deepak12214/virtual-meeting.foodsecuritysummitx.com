import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchContacts,
  updateContactStatus,
  deleteContact,
  ContactRecord,
  PaginationInfo,
} from '../../services/contactService';
import {
  Mail,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Building,
  Phone,
  User,
  Calendar,
  Filter,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export function ContactSubmissions() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadContacts = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchContacts({
          page: pageNum,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });
        setContacts(res.data);
        setPagination(res.pagination);
      } catch (err: any) {
        setError(err?.message || 'Failed to load contact submissions.');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    loadContacts(1);
  }, [loadContacts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadContacts(1);
  };

  const handleStatusChange = async (id: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    setUpdatingId(id);
    try {
      const updated = await updateContactStatus(id, newStatus);
      setContacts((prev) => prev.map((c) => (c._id === id ? updated : c)));
      if (selectedContact && selectedContact._id === id) {
        setSelectedContact(updated);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact submission?')) return;
    try {
      await deleteContact(id);
      if (selectedContact?._id === id) setSelectedContact(null);
      loadContacts(pagination.page);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete contact record');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <AlertCircle className="h-3 w-3" /> New
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Contact Inquiries
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage contact form submissions from users and attendees.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadContacts(pagination.page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all border-none cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, email, or message..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-slate-100 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all border-none cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-slate-100 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading submissions...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-4 text-center">
            <p className="text-sm text-red-500 font-semibold mb-3">{error}</p>
            <button
              onClick={() => loadContacts(1)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm border-none cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              No Contact Inquiries Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or status filters.'
                : 'Form submissions from users will show up here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">User Info</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {contacts.map((contact) => (
                  <tr
                    key={contact._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {contact.name}
                      </div>
                      {contact.companyName && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Building className="h-3 w-3 shrink-0" />
                          <span>{contact.companyName}</span>
                        </div>
                      )}
                    </td>

                    {/* Contact Details */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Description preview */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {contact.description}
                      </p>
                    </td>

                    {/* Status Select */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(contact.status)}
                        <select
                          value={contact.status}
                          disabled={updatingId === contact._id}
                          onChange={(e) =>
                            handleStatusChange(
                              contact._id,
                              e.target.value as 'new' | 'in_progress' | 'resolved'
                            )
                          }
                          className="text-xs py-1 px-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                          <option value="new">Mark New</option>
                          <option value="in_progress">Mark In Progress</option>
                          <option value="resolved">Mark Resolved</option>
                        </select>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(contact.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedContact(contact)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact._id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                          title="Delete Submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && contacts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {pagination.total}
              </span>{' '}
              entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadContacts(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => loadContacts(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all ${
                      p === pagination.page
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => loadContacts(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Inquiry Details
              </h3>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Full Name</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedContact.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Company</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedContact.companyName || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Email</div>
                  <div className="text-slate-800 dark:text-slate-200 mt-1">
                    {selectedContact.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Phone</div>
                  <div className="text-slate-800 dark:text-slate-200 mt-1">
                    {selectedContact.phone || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Status</div>
                <div className="mt-1">{getStatusBadge(selectedContact.status)}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase mb-1">
                  Full Message
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans text-sm">
                  {selectedContact.description}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedContact(null)}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
