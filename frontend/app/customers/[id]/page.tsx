'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  UserIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CurrencyRupeeIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

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
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  credit_limit: number;
  credit_days: number;
  opening_balance: number;
  current_balance: number;
  status: number;
  notes: string;
  created_at: string;
  total_orders?: number;
  total_business?: number;
}

interface Transaction {
  id: number;
  date: string;
  type: string;
  reference: string;
  description: string;
  amount: number;
  balance: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  date: string;
  amount: number;
  status: string;
  items_count: number;
}

export default function ViewCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'transactions' | 'quotations'>('details');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomer();
    }
  }, [customerId, isAuthenticated]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');

      const [customerResponse, quotationResponse] = await Promise.all([
        fetch(`${API_URL}/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_URL}/quotations?customer_id=${customerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
      ]);

      const customerData = await customerResponse.json();
      const quotationData = await quotationResponse.json();

      if (customerData.success && customerData.data) {
        const dbCustomer = customerData.data;
        setCustomer({
          ...dbCustomer,
          credit_limit: Number(dbCustomer.credit_limit || 0),
          opening_balance: Number(dbCustomer.opening_balance || 0),
          current_balance: Number(dbCustomer.current_balance || 0),
          total_orders: 0,
          total_business: 0,
        });
      } else {
        setCustomer(null);
      }

      if (quotationData.success && Array.isArray(quotationData.data)) {
        const mappedQuotations: Quotation[] = quotationData.data.map((quotation: any) => ({
          id: Number(quotation.id),
          quotation_number: quotation.quotation_number,
          date: quotation.quotation_date,
          amount: Number(quotation.total_amount || 0),
          status: quotation.status,
          items_count: Number(quotation.items_count || 0),
        }));

        setQuotations(mappedQuotations);

        setCustomer((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            total_orders: mappedQuotations.length,
            total_business: mappedQuotations.reduce((sum, quotation) => sum + quotation.amount, 0),
          };
        });
      } else {
        setQuotations([]);
      }

      setTransactions([]);
    } catch (error) {
      console.error('Failed to load customer details:', error);
      setCustomer(null);
      setQuotations([]);
      setTransactions([]);
      (window as any).appAlert('Failed to load customer from database');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer? This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
          const token = localStorage.getItem('pms_token');
          const response = await fetch(`${API_URL}/customers/${customerId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (data.success) {
            (window as any).appAlert('Customer deleted successfully!');
            router.push('/customers');
          } else {
            (window as any).appAlert('Error: ' + (data.error || 'Failed to delete customer'));
          }
        } catch (error) {
          console.error('Delete error:', error);
          (window as any).appAlert('Network/API error. Customer was not deleted.');
        }
      },
    });
  };

  const buildWALink = (cust: typeof customer) => {
    if (!cust) return '#';
    const outstanding = cust.current_balance;
    const overLimit = cust.credit_limit > 0 && outstanding > cust.credit_limit;
    const msg = `Dear ${cust.name},\n\nThis is a payment reminder.\n\n📌 Outstanding Amount: ₹${outstanding.toLocaleString('en-IN')}\n💳 Credit Limit: ₹${cust.credit_limit.toLocaleString('en-IN')}${overLimit ? '\n⚠️ Your account has exceeded the credit limit.' : ''}\n\nKindly arrange the payment at the earliest.\n\nThank you.`;
    const phone = cust.mobile.replace(/\D/g, '');
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  const buildSMSLink = (cust: typeof customer) => {
    if (!cust) return '#';
    const msg = `Dear ${cust.name}, Outstanding: Rs.${cust.current_balance.toLocaleString('en-IN')}. Kindly arrange payment. Credit Limit: Rs.${cust.credit_limit.toLocaleString('en-IN')}.`;
    const phone = cust.mobile.replace(/\D/g, '');
    return `sms:+91${phone}?body=${encodeURIComponent(msg)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Customer Not Found</h2>
          <Link href="/customers" className="text-blue-600 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
                <p className="text-gray-500">{customer.company_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {customer.status === 1 ? '● Active' : '● Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Customer since {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/quotations/create?customer=${customer.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusIcon className="w-5 h-5" />
              New Quotation
            </Link>
            <Link
              href={`/customers/${customer.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PencilIcon className="w-5 h-5" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <TrashIcon className="w-5 h-5" />
              Delete
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-800">{customer.total_orders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Business</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(customer.total_business || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CurrencyRupeeIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Credit Limit</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(customer.credit_limit)}</p>
                <p className="text-xs text-gray-400">{customer.credit_days} days</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className={`text-2xl font-bold ${customer.current_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(customer.current_balance)}
                </p>
                {customer.current_balance > customer.credit_limit && (
                  <p className="text-xs text-red-500">⚠️ Over limit</p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                customer.current_balance > 0 ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                <CurrencyRupeeIcon className={`w-6 h-6 ${
                  customer.current_balance > 0 ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Credit Control Card */}
        {(() => {
          const outstanding = customer.current_balance;
          const limit = customer.credit_limit;
          const utilPct = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0;
          const availableCredit = Math.max(limit - outstanding, 0);
          const overLimit = limit > 0 && outstanding > limit;
          const nearLimit = limit > 0 && utilPct >= 80 && !overLimit;

          return (
            <div className={`rounded-xl shadow-md p-5 mb-6 border-2 ${
              overLimit ? 'bg-red-50 border-red-300' : nearLimit ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-100'
            }`}>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                  <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                  Credit Control
                  {overLimit && (
                    <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                      ⚠️ OVER LIMIT
                    </span>
                  )}
                  {nearLimit && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                      ⚠️ NEAR LIMIT
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {outstanding > 0 && (
                    <>
                      <a
                        href={buildWALink(customer)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-white"
                        style={{ background: '#25D366' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 fill-white flex-shrink-0">
                          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.827.736 5.476 2.02 7.775L0 32l8.437-2.01A15.94 15.94 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.25a13.22 13.22 0 01-6.73-1.836l-.482-.287-4.998 1.192 1.22-4.87-.315-.5A13.19 13.19 0 012.75 16C2.75 8.682 8.682 2.75 16 2.75S29.25 8.682 29.25 16 23.318 29.25 16 29.25zm7.22-9.77c-.396-.198-2.343-1.156-2.706-1.287-.363-.132-.627-.198-.89.198-.264.396-1.022 1.287-1.253 1.551-.23.264-.462.297-.858.099-.396-.198-1.672-.616-3.185-1.965-1.177-1.05-1.972-2.346-2.203-2.742-.23-.396-.024-.61.173-.807.178-.177.396-.462.594-.693.198-.23.264-.396.396-.66.132-.264.066-.495-.033-.693-.099-.198-.89-2.145-1.22-2.937-.32-.77-.645-.666-.89-.678l-.759-.013c-.264 0-.693.099-.1056.495-.363.396-1.386 1.354-1.386 3.3 0 1.946 1.419 3.827 1.617 4.091.198.264 2.793 4.264 6.767 5.982.946.408 1.684.651 2.259.834.949.301 1.813.258 2.496.157.762-.113 2.343-.957 2.673-1.882.33-.924.33-1.716.23-1.882-.099-.165-.363-.264-.759-.462z"/>
                        </svg>
                        WhatsApp Reminder
                      </a>
                      <a
                        href={buildSMSLink(customer)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-semibold shadow-sm"
                      >
                        <span>📱</span> SMS
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(limit)}</p>
                  <p className="text-xs text-gray-400">{customer.credit_days} days</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                  <p className={`text-xl font-bold ${outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(outstanding)}
                  </p>
                  <p className="text-xs text-gray-400">{utilPct.toFixed(0)}% utilized</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Available Credit</p>
                  <p className={`text-xl font-bold ${overLimit ? 'text-red-600' : 'text-green-600'}`}>
                    {overLimit ? `-${formatCurrency(outstanding - limit)}` : formatCurrency(availableCredit)}
                  </p>
                  <p className="text-xs text-gray-400">{overLimit ? 'Exceeded' : 'Remaining'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total Business</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(customer.total_business || 0)}</p>
                  <p className="text-xs text-gray-400">{customer.total_orders || 0} orders</p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Credit Utilization</span>
                  <span className={`font-bold ${overLimit ? 'text-red-600' : nearLimit ? 'text-orange-600' : 'text-green-600'}`}>
                    {limit > 0 ? `${((outstanding / limit) * 100).toFixed(1)}%` : 'No limit set'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      overLimit ? 'bg-red-500' : nearLimit ? 'bg-orange-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${utilPct}%` }}
                  />
                </div>
                {overLimit && (
                  <p className="text-red-600 text-xs font-semibold mt-2">
                    ⚠️ Outstanding exceeds credit limit by {formatCurrency(outstanding - limit)}. Please collect payment before accepting new orders.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📋 Details
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'transactions'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                💰 Transactions ({transactions.length})
              </button>
              <button
                onClick={() => setActiveTab('quotations')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'quotations'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📄 Quotations ({quotations.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <UserIcon className="w-5 h-5 text-green-500" />
                    Contact Information
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Contact Person</p>
                        <p className="font-medium text-gray-800">{customer.contact_person || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <PhoneIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Mobile</p>
                        <a href={`tel:+91${customer.mobile}`} className="font-medium text-blue-600 hover:underline">
                          +91 {customer.mobile}
                        </a>
                        {customer.phone && (
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <EnvelopeIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a href={`mailto:${customer.email}`} className="font-medium text-blue-600 hover:underline">
                          {customer.email || '-'}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                    Business Information
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">GST Number</p>
                        <p className="font-medium font-mono text-gray-800">{customer.gst_number || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">PAN Number</p>
                        <p className="font-medium font-mono text-gray-800">{customer.pan_number || '-'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Credit Limit</p>
                        <p className="font-medium text-gray-800">{formatCurrency(customer.credit_limit)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Credit Days</p>
                        <p className="font-medium text-gray-800">{customer.credit_days} days</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <MapPinIcon className="w-5 h-5 text-red-500" />
                    Billing Address
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-800 whitespace-pre-line">{customer.billing_address}</p>
                    <p className="text-gray-600 mt-2">
                      {customer.city}, {customer.state} - {customer.pincode}
                    </p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <MapPinIcon className="w-5 h-5 text-orange-500" />
                    Shipping Address
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-800 whitespace-pre-line">
                      {customer.shipping_address || customer.billing_address}
                    </p>
                    <p className="text-gray-600 mt-2">
                      {customer.city}, {customer.state} - {customer.pincode}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                      <DocumentTextIcon className="w-5 h-5 text-yellow-500" />
                      Notes
                    </h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-gray-700 whitespace-pre-line">{customer.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CurrencyRupeeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Reference</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((txn) => (
                          <tr key={txn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{formatDate(txn.date)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                txn.type === 'Invoice' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {txn.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm text-blue-600">{txn.reference}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{txn.description}</td>
                            <td className={`px-4 py-3 text-right font-medium ${
                              txn.amount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                              {formatCurrency(txn.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan={4} className="px-4 py-3 text-right">Current Balance:</td>
                          <td></td>
                          <td className={`px-4 py-3 text-right text-lg ${
                            customer.current_balance > 0 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(customer.current_balance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Quotations Tab */}
            {activeTab === 'quotations' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-600">
                    Total {quotations.length} quotations
                  </p>
                  <Link
                    href={`/quotations/create?customer=${customer.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    New Quotation
                  </Link>
                </div>

                {quotations.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No quotations found</p>
                    <Link
                      href={`/quotations/create?customer=${customer.id}`}
                      className="inline-block mt-4 text-blue-600 hover:underline"
                    >
                      Create first quotation
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Quotation #</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Items</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {quotations.map((qt) => (
                          <tr key={qt.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link 
                                href={`/quotations/${qt.id}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {qt.quotation_number}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(qt.date)}</td>
                            <td className="px-4 py-3 text-center text-sm">{qt.items_count}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(qt.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(qt.status)}`}>
                                {qt.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Link
                                href={`/quotations/${qt.id}`}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
