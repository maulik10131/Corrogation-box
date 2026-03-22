'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { ClipboardDocumentListIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Quotation {
  id: number;
  quotation_number: string;
  quotation_date: string;
  customer_name: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';
}

interface WorkOrder {
  id: number;
  quotation_id: number | null;
  work_order_number: string;
  status: 'planned' | 'in_progress' | 'completed' | 'hold' | 'cancelled';
}

export default function OrdersPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customerFilter, setCustomerFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const withTs = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_ts=${Date.now()}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [qtRes, woRes] = await Promise.all([
        fetch(withTs(`${API_URL}/quotations`), { cache: 'no-store' }),
        fetch(withTs(`${API_URL}/work-orders`), { cache: 'no-store' }),
      ]);

      const qtJson = await qtRes.json();
      const woJson = await woRes.json();

      setQuotations(qtJson.success ? (qtJson.data || []) : []);
      setWorkOrders(woJson.success ? (woJson.data || []) : []);
    } catch {
      setQuotations([]);
      setWorkOrders([]);
    }
    setLoading(false);
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

  const workOrderByQuotation = useMemo(() => {
    const map = new Map<number, WorkOrder>();
    for (const wo of workOrders) {
      if (wo.quotation_id) {
        map.set(wo.quotation_id, wo);
      }
    }
    return map;
  }, [workOrders]);

  const eligibleOrders = useMemo(
    () => quotations.filter((q) => q.status === 'approved' || q.status === 'converted'),
    [quotations]
  );

  const customers = useMemo(() => {
    const unique = Array.from(new Set(eligibleOrders.map((order) => order.customer_name).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [eligibleOrders]);

  const filteredOrders = useMemo(() => {
    return eligibleOrders.filter((order) => {
      const matchesCustomer = customerFilter === 'all' || order.customer_name === customerFilter;
      const orderDate = order.quotation_date;
      const matchesFromDate = !fromDate || orderDate >= fromDate;
      const matchesToDate = !toDate || orderDate <= toDate;
      return matchesCustomer && matchesFromDate && matchesToDate;
    });
  }, [eligibleOrders, customerFilter, fromDate, toDate]);

  const createWorkOrder = async (quotationId: number) => {
    setCreatingId(quotationId);
    try {
      const res = await fetch(`${API_URL}/work-orders/from-quotation/${quotationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to create work order');
      }
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create work order';
      (window as any).appAlert(message);
    }
    setCreatingId(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const getStatusChip = (status?: WorkOrder['status']) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (status === 'hold') return 'bg-yellow-100 text-yellow-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  const totalAmount = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const pendingWO   = eligibleOrders.filter((q) => !workOrderByQuotation.has(q.id)).length;
  const convertedWO = eligibleOrders.filter((q) =>  workOrderByQuotation.has(q.id)).length;

  if (loading) return <PageLoader title="Loading Orders" subtitle="Fetching order data..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
              <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Orders</h1>
              <p className="text-sm text-gray-500">Approved orders and work order conversion tracking</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders',      value: eligibleOrders.length, color: 'from-indigo-500 to-indigo-600',  text: String(eligibleOrders.length) },
            { label: 'Pending WO',        value: pendingWO,             color: 'from-amber-400 to-orange-500',   text: String(pendingWO) },
            { label: 'Converted to WO',   value: convertedWO,           color: 'from-green-500 to-green-600',    text: String(convertedWO) },
            { label: 'Total Value',       value: totalAmount,           color: 'from-purple-500 to-purple-600',  text: formatCurrency(totalAmount) },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-md`}>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
              <p className="text-2xl font-bold mt-1 truncate">{s.text}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full inline-block" />
            Filter Orders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Customer</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value="all">All Customers</option>
                {customers.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">From Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">To Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setCustomerFilter('all'); setFromDate(''); setToDate(''); }}
                className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Order Ref</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Date</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Customer</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-indigo-700">Amount</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Work Order</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={6}>Loading…</td></tr>
                )}
                {!loading && filteredOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={6}>
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ClipboardDocumentListIcon className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No approved orders found</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredOrders.map((order, i) => {
                  const mappedWo = workOrderByQuotation.get(order.id);
                  return (
                    <tr key={order.id} className={`border-t border-gray-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-semibold text-indigo-700">{order.quotation_number}</td>
                      <td className="px-4 py-3 text-gray-600">{order.quotation_date}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{order.customer_name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-4 py-3">
                        {mappedWo ? (
                          <div className="flex items-center gap-2">
                            <Link href="/work-orders" className="font-semibold text-indigo-600 hover:underline">
                              {mappedWo.work_order_number}
                            </Link>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusChip(mappedWo.status)}`}>
                              {mappedWo.status.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Not Created
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mappedWo ? (
                          <Link
                            href="/work-orders"
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-xs border border-indigo-200 transition-colors"
                          >
                            View WO
                          </Link>
                        ) : (
                          <button
                            onClick={() => createWorkOrder(order.id)}
                            disabled={creatingId === order.id}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 font-medium text-xs shadow-sm disabled:opacity-60 transition-all"
                          >
                            {creatingId === order.id ? 'Creating…' : 'Create WO'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
              Showing {filteredOrders.length} of {eligibleOrders.length} records
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
