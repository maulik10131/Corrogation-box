'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TruckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface WorkOrder {
  id: number;
  work_order_number: string;
  customer_name: string;
}

interface DispatchRow {
  id: number;
  dispatch_number: string;
  challan_number: string;
  customer_name: string;
  dispatch_date: string;
  status: string;
  vehicle_no: string;
  eway_bill_no: string;
  pod_received: number;
}

export default function DispatchPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [workOrderId, setWorkOrderId] = useState<number | ''>('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleNo, setVehicleNo] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [editingDispatchId, setEditingDispatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editVehicleNo, setEditVehicleNo] = useState('');
  const [editEwayBillNo, setEditEwayBillNo] = useState('');
  const [editStatus, setEditStatus] = useState('planned');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dispatchRes, woRes] = await Promise.all([
        fetch(`${API_URL}/dispatches`),
        fetch(`${API_URL}/work-orders`),
      ]);

      const dispatchJson = await dispatchRes.json();
      const woJson = await woRes.json();

      setDispatches(dispatchJson.success ? (dispatchJson.data || []) : []);
      setWorkOrders(woJson.success ? (woJson.data || []) : []);
    } catch (error) {
      setDispatches([]);
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

  const createDispatch = async () => {
    if (!workOrderId) {
      (window as any).appAlert('Please select work order');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: workOrderId,
          dispatch_date: dispatchDate,
          vehicle_no: vehicleNo,
          eway_bill_no: ewayBillNo,
          status: 'planned',
        }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to create dispatch');

      setWorkOrderId('');
      setVehicleNo('');
      setEwayBillNo('');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create dispatch';
      (window as any).appAlert(message);
    }
    setSaving(false);
  };

  const markPod = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/dispatches/${id}/pod`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to update POD');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update POD';
      (window as any).appAlert(message);
    }
  };

  const beginEdit = (row: DispatchRow) => {
    setEditingDispatchId(row.id);
    setEditDate(row.dispatch_date || new Date().toISOString().slice(0, 10));
    setEditVehicleNo(row.vehicle_no || '');
    setEditEwayBillNo(row.eway_bill_no || '');
    setEditStatus(row.status || 'planned');
  };

  const cancelEdit = () => {
    setEditingDispatchId(null);
    setEditDate('');
    setEditVehicleNo('');
    setEditEwayBillNo('');
    setEditStatus('planned');
  };

  const saveEdit = async () => {
    if (!editingDispatchId) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/dispatches/${editingDispatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_date: editDate,
          vehicle_no: editVehicleNo,
          eway_bill_no: editEwayBillNo,
          status: editStatus,
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to update dispatch');

      cancelEdit();
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update dispatch';
      (window as any).appAlert(message);
    }
    setSaving(false);
  };

  const deleteDispatch = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Dispatch',
      message: 'Are you sure you want to delete this dispatch?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`${API_URL}/dispatches/${id}`, {
            method: 'DELETE',
          });
          const json = await response.json();
          if (!json.success) throw new Error(json.error || 'Failed to delete dispatch');
          await loadData();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete dispatch';
          (window as any).appAlert(message);
        }
      },
    });
  };

  const printChallan = (row: DispatchRow) => {
    const html = `
      <html>
      <head>
        <title>Challan ${row.challan_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin: 0 0 8px; }
          .muted { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Delivery Challan</h1>
        <div class="muted">Print this page or Save as PDF</div>
        <table>
          <tr><th>Dispatch No</th><td>${row.dispatch_number}</td></tr>
          <tr><th>Challan No</th><td>${row.challan_number}</td></tr>
          <tr><th>Date</th><td>${row.dispatch_date}</td></tr>
          <tr><th>Customer</th><td>${row.customer_name}</td></tr>
          <tr><th>Vehicle No</th><td>${row.vehicle_no || '-'}</td></tr>
          <tr><th>E-Way Bill No</th><td>${row.eway_bill_no || '-'}</td></tr>
          <tr><th>Status</th><td>${row.status}</td></tr>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      (window as any).appAlert('Unable to open print window');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const filteredDispatches = dispatches.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      row.dispatch_number.toLowerCase().includes(term) ||
      row.challan_number.toLowerCase().includes(term) ||
      row.customer_name.toLowerCase().includes(term) ||
      (row.vehicle_no || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (authChecking || !isAuthenticated) {
    return null;
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      planned:     'bg-blue-100 text-blue-700',
      in_transit:  'bg-amber-100 text-amber-700',
      delivered:   'bg-green-100 text-green-700',
      pod_received:'bg-purple-100 text-purple-700',
      cancelled:   'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  const totalDispatches  = dispatches.length;
  const inTransitCount   = dispatches.filter(d => d.status === 'in_transit').length;
  const deliveredCount   = dispatches.filter(d => d.status === 'delivered').length;
  const podCount         = dispatches.filter(d => d.pod_received).length;

  if (loading) return <PageLoader title="Loading Dispatches" subtitle="Fetching dispatch records..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dispatch & Challan</h1>
              <p className="text-sm text-gray-500">Manage dispatch, e-way bill and POD status</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Dispatches', value: totalDispatches,  color: 'from-indigo-500 to-indigo-600' },
            { label: 'In Transit',       value: inTransitCount,   color: 'from-amber-400 to-amber-500' },
            { label: 'Delivered',        value: deliveredCount,   color: 'from-green-500 to-green-600' },
            { label: 'POD Received',     value: podCount,         color: 'from-purple-500 to-purple-600' },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white shadow-md`}>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
              <p className="text-3xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Create Dispatch ────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full inline-block" />
            Create New Dispatch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select work order</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.work_order_number} – {wo.customer_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
            />
            <input
              type="text"
              placeholder="Vehicle No"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
            />
            <input
              type="text"
              placeholder="E-Way Bill No"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              value={ewayBillNo}
              onChange={(e) => setEwayBillNo(e.target.value)}
            />
            <button
              onClick={createDispatch}
              disabled={saving}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 shadow-md transition-all"
            >
              {saving ? 'Creating…' : '+ Create Dispatch'}
            </button>
          </div>
        </div>

        {/* ── Edit form ─────────────────────────────── */}
        {editingDispatchId && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-400 rounded-full inline-block" />
              Edit Dispatch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input type="date" className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              <input type="text" placeholder="Vehicle No" className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" value={editVehicleNo} onChange={(e) => setEditVehicleNo(e.target.value)} />
              <input type="text" placeholder="E-Way Bill No" className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" value={editEwayBillNo} onChange={(e) => setEditEwayBillNo(e.target.value)} />
              <select className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="planned">Planned</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="pod_received">POD Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition-colors">
                  Save
                </button>
                <button onClick={cancelEdit} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-200">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              <input
                type="text"
                placeholder="Search dispatch / challan / customer / vehicle…"
                className="w-full bg-transparent outline-none text-sm text-gray-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="pod_received">POD Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Dispatch No</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Challan No</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Customer</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Date</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Vehicle</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">E-Way</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Status</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">POD</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-indigo-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-400" colSpan={9}>Loading…</td>
                  </tr>
                )}
                {!loading && filteredDispatches.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={9}>
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <TruckIcon className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No dispatch records found</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredDispatches.map((row, i) => (
                  <tr key={row.id} className={`border-t border-gray-50 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-semibold text-indigo-700">{row.dispatch_number}</td>
                    <td className="px-4 py-3 text-gray-700">{row.challan_number}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{row.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.dispatch_date}</td>
                    <td className="px-4 py-3 text-gray-600">{row.vehicle_no || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{row.eway_bill_no || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(row.status)}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.pod_received ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          ✓ Received
                        </span>
                      ) : (
                        <button
                          onClick={() => markPod(row.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs border border-blue-200 transition-colors"
                        >
                          Mark POD
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => beginEdit(row)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-xs border border-indigo-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteDispatch(row.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium text-xs border border-red-200 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => printChallan(row)}
                          className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition-colors"
                        >
                          Print
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Dear ${row.customer_name},\n\nYour order has been dispatched. Please find the details below:\n\n🚚 Dispatch No: ${row.dispatch_number}\n📋 Challan No: ${row.challan_number}\n📅 Dispatch Date: ${row.dispatch_date}\n🚗 Vehicle No: ${row.vehicle_no || 'N/A'}${row.eway_bill_no ? `\n📄 E-Way Bill: ${row.eway_bill_no}` : ''}\n\nKindly acknowledge receipt of the goods.\n\nThank you!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs border border-emerald-200 transition-colors"
                          title="Send dispatch info via WhatsApp"
                        >
                          💬 WA
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDispatches.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50/50">
              Showing {filteredDispatches.length} of {dispatches.length} records
            </div>
          )}
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
