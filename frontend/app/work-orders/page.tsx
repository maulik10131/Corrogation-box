'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { ClipboardDocumentListIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface WorkOrder {
  id: number;
  work_order_number: string;
  customer_name: string;
  order_date: string;
  target_date: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'hold' | 'cancelled';
  total_quantity: number;
  produced_quantity: number;
  pending_quantity: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  customer_name: string;
  status: string;
}

const statusOptions: Array<WorkOrder['status']> = ['planned', 'in_progress', 'completed', 'hold', 'cancelled'];

export default function WorkOrdersPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | ''>('');
  const [targetDate, setTargetDate] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const withTs = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_ts=${Date.now()}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pms_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [woRes, qtRes] = await Promise.all([
        fetch(withTs(`${API_URL}/work-orders`), { cache: 'no-store', headers }),
        fetch(withTs(`${API_URL}/quotations`), { cache: 'no-store', headers }),
      ]);

      const woJson = await woRes.json();
      const qtJson = await qtRes.json();

      setWorkOrders(woJson.success ? (woJson.data || []) : []);
      setQuotations(qtJson.success ? (qtJson.data || []) : []);
    } catch (error) {
      setWorkOrders([]);
      setQuotations([]);
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

  const convertibleQuotations = useMemo(
    () => quotations.filter((q) => q.status !== 'converted'),
    [quotations]
  );

  const createFromQuotation = async () => {
    if (!selectedQuotationId) {
      showToast('warning', 'Please select a quotation first');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/work-orders/from-quotation/${selectedQuotationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ target_date: targetDate || null }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to create work order');

      setSelectedQuotationId('');
      setTargetDate('');
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to create work order');
    }
    setSaving(false);
  };

  const updateStatus = async (id: number, status: WorkOrder['status']) => {
    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/work-orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to update status');
      await loadData();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update status');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const stats = useMemo(() => {
    const total = workOrders.length;
    const inProgress = workOrders.filter((wo) => wo.status === 'in_progress').length;
    const completed = workOrders.filter((wo) => wo.status === 'completed').length;
    const pendingQty = workOrders.reduce((sum, wo) => sum + Number(wo.pending_quantity || 0), 0);
    return { total, inProgress, completed, pendingQty };
  }, [workOrders]);

  const getStatusChip = (status: WorkOrder['status']) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (status === 'hold') return 'bg-yellow-100 text-yellow-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Work Orders" subtitle="Fetching work order data..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border animate-fade-in max-w-sm ${
          toast.type === 'success' ? 'bg-white border-emerald-100' :
          toast.type === 'error'   ? 'bg-white border-rose-100' :
                                     'bg-white border-amber-100'
        }`}>
          <div className={`flex-shrink-0 p-1.5 rounded-xl ${
            toast.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
            toast.type === 'error'   ? 'bg-gradient-to-br from-rose-500 to-red-600' :
                                       'bg-gradient-to-br from-amber-500 to-orange-500'
          }`}>
            {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-white" />}
            {toast.type === 'error'   && <XCircleIcon className="w-5 h-5 text-white" />}
            {toast.type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Warning'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Job Card / Work Orders</h1>
                <p className="text-sm text-gray-500">Create and track production work orders</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total Work Orders</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">In Progress</p>
            <p className="text-3xl font-bold mt-1">{stats.inProgress}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Completed</p>
            <p className="text-3xl font-bold mt-1">{stats.completed}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Pending Qty</p>
            <p className="text-3xl font-bold mt-1">{stats.pendingQty}</p>
          </div>
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-800">Create Work Order from Quotation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quotation</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                value={selectedQuotationId}
                onChange={(e) => setSelectedQuotationId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select quotation</option>
                {convertibleQuotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotation_number} - {q.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={createFromQuotation}
                disabled={saving}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 font-semibold text-sm shadow-md transition-all"
              >
                {saving ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">WO No</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Order Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Target Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Total Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-indigo-700">Pending Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-indigo-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan={7}>
                      <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && workOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center" colSpan={7}>
                      <ClipboardDocumentListIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No work orders found</p>
                    </td>
                  </tr>
                )}
                {workOrders.map((wo, idx) => (
                  <tr key={wo.id} className={`border-t border-gray-100 hover:bg-indigo-50/40 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-indigo-700">{wo.work_order_number}</td>
                    <td className="px-4 py-3 text-gray-700">{wo.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{wo.order_date}</td>
                    <td className="px-4 py-3 text-gray-600">{wo.target_date || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{wo.total_quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-600">{wo.pending_quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusChip(wo.status)}`}>
                          {wo.status.replace('_', ' ')}
                        </span>
                        <select
                          value={wo.status}
                          onChange={(e) => updateStatus(wo.id, e.target.value as WorkOrder['status'])}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {workOrders.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
              {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
