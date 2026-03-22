'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { CurrencyRupeeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  name: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
}

interface AgingSummary {
  total_outstanding: number;
  bucket_totals: {
    '0_30': number;
    '31_60': number;
    '61_90': number;
    '90_plus': number;
  };
}

interface LedgerEntry {
  date: string;
  type: 'invoice' | 'payment';
  number: string;
  debit: number;
  credit: number;
  running_balance: number;
  reference: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  const [invoiceCustomerId, setInvoiceCustomerId] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  const [paymentInvoiceId, setPaymentInvoiceId] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('neft');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [ledgerCustomerId, setLedgerCustomerId] = useState<number | ''>('');

  const withTs = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_ts=${Date.now()}`;
  };

  const outstandingInvoices = useMemo(
    () => invoices.filter((invoice) => Number(invoice.outstanding_amount) > 0),
    [invoices]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersRes, invoicesRes, agingRes] = await Promise.all([
        fetch(withTs(`${API_URL}/customers`), { cache: 'no-store' }),
        fetch(withTs(`${API_URL}/invoices`), { cache: 'no-store' }),
        fetch(withTs(`${API_URL}/outstanding/aging`), { cache: 'no-store' }),
      ]);

      const customersJson = await customersRes.json();
      const invoicesJson = await invoicesRes.json();
      const agingJson = await agingRes.json();

      setCustomers(customersJson.success ? (customersJson.data || []) : []);
      setInvoices(invoicesJson.success ? (invoicesJson.data || []) : []);
      setAgingSummary(agingJson.success ? agingJson.data?.summary || null : null);
    } catch {
      setCustomers([]);
      setInvoices([]);
      setAgingSummary(null);
    }
    setLoading(false);
  };

  const loadLedger = async (customerId: number) => {
    try {
      const response = await fetch(withTs(`${API_URL}/customers/${customerId}/ledger`), { cache: 'no-store' });
      const json = await response.json();
      setLedgerEntries(json.success ? (json.data?.entries || []) : []);
    } catch {
      setLedgerEntries([]);
    }
  };

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

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const createInvoice = async () => {
    if (!invoiceCustomerId || !invoiceAmount) {
      (window as any).appAlert('Customer and amount required');
      return;
    }

    setSavingInvoice(true);
    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: invoiceCustomerId,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          total_amount: Number(invoiceAmount),
          taxable_amount: Number(invoiceAmount),
          gst_amount: 0,
          outstanding_amount: Number(invoiceAmount),
          status: 'issued',
        }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to create invoice');

      setInvoiceCustomerId('');
      setInvoiceAmount('');
      setDueDate('');
      handleRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create invoice';
      (window as any).appAlert(message);
    }
    setSavingInvoice(false);
  };

  const createPayment = async () => {
    if (!paymentInvoiceId || !paymentAmount) {
      (window as any).appAlert('Invoice and amount required');
      return;
    }

    setSavingPayment(true);
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: paymentInvoiceId,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          amount: Number(paymentAmount),
          reference_no: paymentRef,
        }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to save payment');

      setPaymentInvoiceId('');
      setPaymentAmount('');
      setPaymentRef('');
      handleRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save payment';
      (window as any).appAlert(message);
    }
    setSavingPayment(false);
  };

  const handleLedgerCustomerChange = async (value: string) => {
    const id = value ? Number(value) : '';
    setLedgerCustomerId(id);
    if (id) {
      await loadLedger(id);
    } else {
      setLedgerEntries([]);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const getStatusChip = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'partially_paid') return 'bg-blue-100 text-blue-700';
    if (status === 'overdue') return 'bg-red-100 text-red-700';
    if (status === 'issued') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Payments" subtitle="Fetching payment records..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <CurrencyRupeeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Payment & Outstanding</h1>
                <p className="text-sm text-gray-500">Invoices, payment collection, aging and customer ledger</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors disabled:opacity-60"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total Outstanding</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(agingSummary?.total_outstanding || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">0-30 Days</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(agingSummary?.bucket_totals['0_30'] || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">31-60 Days</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(agingSummary?.bucket_totals['31_60'] || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-600 to-red-700 rounded-2xl p-5 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">90+ Days</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(agingSummary?.bucket_totals['90_plus'] || 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
              <h2 className="font-semibold text-gray-800">Create Invoice</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Customer</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={invoiceCustomerId}
                  onChange={(e) => setInvoiceCustomerId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Invoice Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Due Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Amount</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={createInvoice}
              disabled={savingInvoice}
              className="mt-4 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 font-semibold text-sm shadow-md transition-all"
            >
              {savingInvoice ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
              <h2 className="font-semibold text-gray-800">Receive Payment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Invoice</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={paymentInvoiceId}
                  onChange={(e) => setPaymentInvoiceId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Select invoice</option>
                  {outstandingInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {formatCurrency(invoice.outstanding_amount)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Payment Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Payment Mode</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Amount</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm text-gray-600">Reference No</label>
                <input
                  type="text"
                  placeholder="Transaction / reference number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={createPayment}
              disabled={savingPayment}
              className="mt-4 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-60 font-semibold text-sm shadow-md transition-all"
            >
              {savingPayment ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Invoice</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Paid</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Outstanding</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                      No invoices found
                    </td>
                  </tr>
                )}
                {invoices.map((invoice, idx) => (
                  <tr key={invoice.id} className={`border-t border-gray-100 hover:bg-indigo-50/40 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-700">{invoice.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{invoice.invoice_date}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(invoice.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(invoice.outstanding_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusChip(invoice.status)}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-800">Customer Ledger</h2>
          </div>
          <div className="mb-4 max-w-xs">
            <label className="text-sm text-gray-600">Customer</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={ledgerCustomerId}
              onChange={(e) => handleLedgerCustomerChange(e.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">No</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Debit</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Credit</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                      No ledger entries
                    </td>
                  </tr>
                )}
                {ledgerEntries.map((entry, index) => (
                  <tr key={`${entry.number}-${index}`} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{entry.date}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{entry.type}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.number}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(entry.debit)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(entry.credit)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(entry.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
