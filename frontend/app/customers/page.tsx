'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Customer {
  id: number;
  name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  mobile: string;
  email: string;
  gst_number: string;
  pan_number: string;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  credit_limit: number;
  credit_days: number;
  current_balance: number;
  status: number;
  notes: string;
  created_at: string;
  total_orders?: number;
  total_business?: number;
}

type SortField = 'name' | 'city' | 'current_balance' | 'total_business' | 'created_at';
type SortOrder = 'asc' | 'desc';

// ============ COMPONENT ============
export default function CustomersPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
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
      loadCustomers();
    }
  }, [isAuthenticated]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');
      
      const response = await fetch(`${API_URL}/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const normalized = data.data.map((customer: any) => ({
          ...customer,
          credit_limit: Number(customer.credit_limit || 0),
          current_balance: Number(customer.current_balance || 0),
          total_orders: Number(customer.total_orders || 0),
          total_business: Number(customer.total_business || 0),
        }));
        setCustomers(normalized);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
      (window as any).appAlert('Failed to load customers from database');
    } finally {
      setLoading(false);
    }
  };

  // ============ FILTERING & SORTING ============
  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.company_name.toLowerCase().includes(search.toLowerCase()) ||
        customer.contact_person.toLowerCase().includes(search.toLowerCase()) ||
        customer.mobile.includes(search) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.gst_number.toLowerCase().includes(search.toLowerCase()) ||
        customer.city.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && customer.status === 1) ||
        (statusFilter === 'inactive' && customer.status === 0);

      const matchesCity =
        !cityFilter ||
        customer.city.toLowerCase() === cityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCity;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'city':
          comparison = a.city.localeCompare(b.city);
          break;
        case 'current_balance':
          comparison = a.current_balance - b.current_balance;
          break;
        case 'total_business':
          comparison = (a.total_business || 0) - (b.total_business || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get unique cities
  const cities = [...new Set(customers.map(c => c.city))].sort();

  // ============ HANDLERS ============
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    setDeleting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');
      
      const response = await fetch(`${API_URL}/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        setShowDeleteModal(false);
        setCustomerToDelete(null);
      } else {
        (window as any).appAlert('Error: ' + (data.error || 'Failed to delete customer'));
      }
    } catch (error) {
      (window as any).appAlert('Error deleting customer');
    }

    setDeleting(false);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCityFilter('');
  };

  // ============ STATS ============
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 1).length,
    inactive: customers.filter(c => c.status === 0).length,
    totalBusiness: customers.reduce((sum, c) => sum + (c.total_business || 0), 0),
    totalOutstanding: customers.reduce((sum, c) => sum + c.current_balance, 0),
  };

  // ============ HELPERS ============
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4 inline ml-1" />
    ) : (
      <ArrowDownIcon className="w-4 h-4 inline ml-1" />
    );
  };

  // ============ RENDER ============
  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Customers" subtitle="Fetching your customer data..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Customers</h1>
                <p className="text-sm text-gray-500">Manage your customer database</p>
              </div>
            </div>
            <Link
              href="/customers/create"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 font-semibold text-sm shadow-md transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Add Customer
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total Customers</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Active</p>
            <p className="text-2xl font-bold mt-1">{stats.active}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Inactive</p>
            <p className="text-2xl font-bold mt-1">{stats.inactive}</p>
          </div>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total Business</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalBusiness)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Outstanding</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, mobile, email, GST..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* City Filter */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(search || statusFilter !== 'all' || cityFilter) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FunnelIcon className="w-4 h-4" />
                Clear
              </button>
            )}

            {/* Refresh */}
            <button
                onClick={loadCustomers}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                title="Refresh"
              >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No customers found</p>
              {search || statusFilter !== 'all' || cityFilter ? (
                <button
                  onClick={clearFilters}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  Clear filters
                </button>
              ) : (
                  <Link href="/customers/create" className="text-indigo-600 hover:underline text-sm">
                  + Add your first customer
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-100/50"
                      onClick={() => handleSort('name')}
                    >
                      Customer <SortIcon field="name" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">
                      Contact
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-100/50"
                      onClick={() => handleSort('city')}
                    >
                      Location <SortIcon field="city" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-100/50"
                      onClick={() => handleSort('current_balance')}
                    >
                      Outstanding <SortIcon field="current_balance" />
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-100/50"
                      onClick={() => handleSort('total_business')}
                    >
                      Business <SortIcon field="total_business" />
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white font-bold">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <Link
                              href={`/customers/${customer.id}`}
                              className="font-semibold text-gray-800 hover:text-indigo-600"
                            >
                              {customer.name}
                            </Link>
                            <p className="text-sm text-gray-500">{customer.company_name}</p>
                            <p className="text-xs text-gray-400 font-mono">GST: {customer.gst_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-gray-800">{customer.contact_person}</p>
                          <p className="text-gray-500 flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3" />
                            <a href={`tel:${customer.mobile}`} className="hover:text-indigo-600">
                              {customer.mobile}
                            </a>
                          </p>
                          <p className="text-gray-500 flex items-center gap-1">
                            <EnvelopeIcon className="w-3 h-3" />
                            <a href={`mailto:${customer.email}`} className="hover:text-indigo-600 truncate max-w-[150px]">
                              {customer.email}
                            </a>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm flex items-start gap-1">
                          <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-800">{customer.city}</p>
                            <p className="text-gray-500">{customer.state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className={`font-bold ${customer.current_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(customer.current_balance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Limit: {formatCurrency(customer.credit_limit)}
                        </p>
                        {customer.credit_limit > 0 && customer.current_balance > customer.credit_limit && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
                            ⚠️ Over Limit
                          </span>
                        )}
                        {customer.credit_limit > 0 && customer.current_balance > 0 && customer.current_balance <= customer.credit_limit && (customer.current_balance / customer.credit_limit) >= 0.8 && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded">
                            ⚡ Near Limit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-indigo-700">
                          {formatCurrency(customer.total_business || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {customer.total_orders || 0} orders
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          customer.status === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {customer.status === 1 ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          {customer.current_balance > 0 && (
                            <a
                              href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${customer.name},\n\nPayment Reminder:\n\n📌 Outstanding: ₹${customer.current_balance.toLocaleString('en-IN')}\n💳 Credit Limit: ₹${customer.credit_limit.toLocaleString('en-IN')}\n\nKindly arrange payment at the earliest.\n\nThank you.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
                              style={{ background: '#25D366' }}
                              title="Send WhatsApp Reminder"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-3 h-3 fill-white flex-shrink-0">
                                <path d="M16 0C7.163 0 0 7.163 0 16c0 2.827.736 5.476 2.02 7.775L0 32l8.437-2.01A15.94 15.94 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.25a13.22 13.22 0 01-6.73-1.836l-.482-.287-4.998 1.192 1.22-4.87-.315-.5A13.19 13.19 0 012.75 16C2.75 8.682 8.682 2.75 16 2.75S29.25 8.682 29.25 16 23.318 29.25 16 29.25zm7.22-9.77c-.396-.198-2.343-1.156-2.706-1.287-.363-.132-.627-.198-.89.198-.264.396-1.022 1.287-1.253 1.551-.23.264-.462.297-.858.099-.396-.198-1.672-.616-3.185-1.965-1.177-1.05-1.972-2.346-2.203-2.742-.23-.396-.024-.61.173-.807.178-.177.396-.462.594-.693.198-.23.264-.396.396-.66.132-.264.066-.495-.033-.693-.099-.198-.89-2.145-1.22-2.937-.32-.77-.645-.666-.89-.678l-.759-.013c-.264 0-.693.099-.1056.495-.363.396-1.386 1.354-1.386 3.3 0 1.946 1.419 3.827 1.617 4.091.198.264 2.793 4.264 6.767 5.982.946.408 1.684.651 2.259.834.949.301 1.813.258 2.496.157.762-.113 2.343-.957 2.673-1.882.33-.924.33-1.716.23-1.882-.099-.165-.363-.264-.759-.462z"/>
                              </svg>
                              WA
                            </a>
                          )}
                          <Link
                            href={`/customers/${customer.id}/edit`}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(customer)}
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

        {!loading && filteredCustomers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Customer?</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{customerToDelete.name}</strong>?
              </p>
              {customerToDelete.current_balance > 0 && (
                <p className="text-orange-600 text-sm mt-2">
                  ⚠️ This customer has outstanding balance of {formatCurrency(customerToDelete.current_balance)}
                </p>
              )}
              <p className="text-sm text-red-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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