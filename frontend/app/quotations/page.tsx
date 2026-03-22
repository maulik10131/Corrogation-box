'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface QuotationItem {
  id: number;
  box_name: string;
  quantity: number;
  selling_price: number;
  amount: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  customer_id: number;
  customer_name: string;
  customer_company: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';
  items_count: number;
  created_at: string;
}

// ============ COMPONENT ============
export default function QuotationsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============ AUTH CHECK ============
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      if (!token || !user) {
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
        setAuthChecking(false);
      }
    }
  }, [router]);

  // ============ LOAD DATA ============
  useEffect(() => {
    if (isAuthenticated) {
      loadQuotations();
    }
  }, [isAuthenticated]);

  const loadQuotations = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success && data.data) {
        setQuotations(data.data);
      } else {
        setQuotations([]);
      }
    } catch (error) {
      console.error('Failed to load quotations:', error);
      setQuotations([]);
    }

    setLoading(false);
  };

  // ============ FILTERING ============
  const filteredQuotations = quotations.filter(quotation => {
    // Search filter
    const matchesSearch =
      quotation.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      quotation.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      quotation.customer_company.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter) {
      const today = new Date();
      const quotationDate = new Date(quotation.quotation_date);
      
      switch (dateFilter) {
        case 'today':
          matchesDate = quotationDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.setDate(today.getDate() - 7));
          matchesDate = quotationDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
          matchesDate = quotationDate >= monthAgo;
          break;
        case 'year':
          const yearAgo = new Date(today.setFullYear(today.getFullYear() - 1));
          matchesDate = quotationDate >= yearAgo;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // ============ HANDLERS ============
  const handleDelete = (quotation: Quotation) => {
    setQuotationToDelete(quotation);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!quotationToDelete) return;

    setDeleting(true);

    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/quotations/${quotationToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete quotation');
      }
      await loadQuotations();
      setShowDeleteModal(false);
      setQuotationToDelete(null);
    } catch (error) {
      (window as any).appAlert('Error deleting quotation');
    }

    setDeleting(false);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
  };

  // ============ STATS ============
  const stats = {
    total: quotations.length,
    draft: quotations.filter(q => q.status === 'draft').length,
    sent: quotations.filter(q => q.status === 'sent').length,
    approved: quotations.filter(q => q.status === 'approved').length,
    rejected: quotations.filter(q => q.status === 'rejected').length,
    converted: quotations.filter(q => q.status === 'converted').length,
    totalValue: quotations.reduce((sum, q) => sum + q.total_amount, 0),
  };

  // ============ HELPERS ============
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: ClockIcon, label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-700', icon: EnvelopeIcon, label: 'Sent' },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Rejected' },
      expired: { color: 'bg-yellow-100 text-yellow-700', icon: ExclamationTriangleIcon, label: 'Expired' },
      converted: { color: 'bg-purple-100 text-purple-700', icon: DocumentTextIcon, label: 'Converted' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  // ============ RENDER ============
  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Quotations" subtitle="Fetching your quotation data..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Quotations</h1>
                <p className="text-sm text-gray-500">Manage customer quotations</p>
              </div>
            </div>
            <Link
              href="/quotations/create"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-semibold text-sm shadow-md transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              New Quotation
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Draft</p>
            <p className="text-2xl font-bold mt-1">{stats.draft}</p>
          </div>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Sent</p>
            <p className="text-2xl font-bold mt-1">{stats.sent}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Approved</p>
            <p className="text-2xl font-bold mt-1">{stats.approved}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Rejected</p>
            <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Converted</p>
            <p className="text-2xl font-bold mt-1">{stats.converted}</p>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-4 text-white shadow-md col-span-2 md:col-span-1">
            <p className="text-xs font-medium opacity-80">Total Value</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by number or customer..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>

            {/* Clear Filters */}
            {(search || statusFilter !== 'all' || dateFilter) && (
              <button
                onClick={clearFilters}
                className="text-red-600 hover:underline text-sm"
              >
                Clear All
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={loadQuotations}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading quotations...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No quotations found</p>
              {search || statusFilter !== 'all' || dateFilter ? (
                <button
                  onClick={clearFilters}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  Clear filters
                </button>
              ) : (
                  <Link href="/quotations/create" className="text-indigo-600 hover:underline text-sm">
                  Create your first quotation
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Quotation #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Valid Until</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Items</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-4">
                        <Link
                          href={`/quotations/${quotation.id}`}
                          className="font-semibold text-indigo-600 hover:underline"
                        >
                          {quotation.quotation_number}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-800">{quotation.customer_company}</p>
                          <p className="text-sm text-gray-500">{quotation.customer_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(quotation.quotation_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`${isExpired(quotation.valid_until) && quotation.status !== 'approved' && quotation.status !== 'converted' ? 'text-red-600' : 'text-gray-600'}`}>
                          {formatDate(quotation.valid_until)}
                        </span>
                        {isExpired(quotation.valid_until) && quotation.status !== 'approved' && quotation.status !== 'converted' && (
                          <span className="ml-1 text-red-500 text-xs">(Expired)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                          {quotation.items_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-gray-800">{formatCurrency(quotation.total_amount)}</p>
                        {quotation.discount_percent > 0 && (
                          <p className="text-xs text-green-600">-{quotation.discount_percent}% discount</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(quotation.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/quotations/${quotation.id}`}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/quotations/${quotation.id}/edit`}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(quotation)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filteredQuotations.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
            Showing {filteredQuotations.length} of {quotations.length} quotations
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && quotationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Quotation?</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{quotationToDelete.quotation_number}</strong>?
              </p>
              <p className="text-sm text-red-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQuotationToDelete(null);
                }}
                disabled={deleting}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}