'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ChartBarIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  PrinterIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const API_URL = 'http://localhost/corrugation-pms/backend/web/api';

type Tab = 'sales' | 'profit' | 'customers' | 'inventory';
type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all';

interface MonthlySales { month: string; revenue: number; orders: number; profit: number; }
interface CustomerRow { id: number; name: string; phone: string; totalBusiness: number; totalOrders: number; outstanding: number; creditLimit: number; }
interface InventoryRow { id: number; name: string; current_quantity: number; unit: string; reorder_level: number; unit_cost: number; }
interface QuotationRow { id: number; quotation_number: string; customer_name: string; quotation_date: string; total_amount: number; status: string; }

const formatCurrency = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const statusColor: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-purple-100 text-purple-700',
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#94a3b8', '#8b5cf6'];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1m', label: 'This Month' },
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

function cutoffDate(range: RangeKey): Date {
  const d = new Date();
  if (range === '1m') { d.setDate(1); return d; }
  if (range === '3m') { d.setMonth(d.getMonth() - 3); return d; }
  if (range === '6m') { d.setMonth(d.getMonth() - 6); return d; }
  if (range === '1y') { d.setMonth(0); d.setDate(1); return d; }
  return new Date('2000-01-01');
}

export default function ReportsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [range, setRange] = useState<RangeKey>('3m');

  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<InventoryRow[]>([]);

  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
  const [statusPie, setStatusPie] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      if (!token) { router.replace('/login'); return; }
      setIsAuthenticated(true);
      setAuthChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('pms_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const [qRes, cRes, mRes] = await Promise.all([
          fetch(`${API_URL}/quotations?per_page=1000`, { headers }),
          fetch(`${API_URL}/customers?per_page=1000`, { headers }),
          fetch(`${API_URL}/materials?per_page=500`, { headers }),
        ]);
        const [qJson, cJson, mJson] = await Promise.all([qRes.json(), cRes.json(), mRes.json()]);
        setQuotations(qJson.success ? qJson.data || [] : []);
        setCustomers(cJson.success ? cJson.data || [] : []);
        setMaterials(mJson.success ? mJson.data || [] : []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, [isAuthenticated]);

  const compute = useCallback(() => {
    const cutoff = cutoffDate(range);
    const filtered = quotations.filter((q: any) => new Date(q.quotation_date || q.created_at) >= cutoff);

    const byMonth: Record<string, { revenue: number; orders: number }> = {};
    filtered.forEach((q: any) => {
      const mk = new Date(q.quotation_date || q.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!byMonth[mk]) byMonth[mk] = { revenue: 0, orders: 0 };
      byMonth[mk].revenue += Number(q.total_amount || 0);
      byMonth[mk].orders += 1;
    });
    setMonthlySales(Object.keys(byMonth).map((k) => ({
      month: k, revenue: Math.round(byMonth[k].revenue),
      orders: byMonth[k].orders, profit: Math.round(byMonth[k].revenue * 0.15),
    })));

    setQuotationRows(filtered.slice(0, 50).map((q: any) => ({
      id: q.id, quotation_number: q.quotation_number || `Q-${q.id}`,
      customer_name: q.customer_name || q.customer?.name || '—',
      quotation_date: q.quotation_date || q.created_at || '',
      total_amount: Number(q.total_amount || 0), status: q.status || 'draft',
    })));

    const statusCount: Record<string, number> = {};
    filtered.forEach((q: any) => { const s = q.status || 'draft'; statusCount[s] = (statusCount[s] || 0) + 1; });
    setStatusPie(Object.keys(statusCount).map((k) => ({ name: k, value: statusCount[k] })));

    const bizMap: Record<string, { business: number; orders: number }> = {};
    filtered.forEach((q: any) => {
      const cid = String(q.customer_id || q.customer?.id || 0);
      if (!bizMap[cid]) bizMap[cid] = { business: 0, orders: 0 };
      bizMap[cid].business += Number(q.total_amount || 0);
      bizMap[cid].orders += 1;
    });
    setCustomerRows(customers.map((c: any) => ({
      id: c.id, name: c.company_name || c.name || '—', phone: c.mobile || c.phone || '',
      totalBusiness: Math.round(bizMap[String(c.id)]?.business || 0),
      totalOrders: bizMap[String(c.id)]?.orders || 0,
      outstanding: Math.round(Number(c.current_balance || 0)),
      creditLimit: Number(c.credit_limit || 0),
    })).sort((a: CustomerRow, b: CustomerRow) => b.totalBusiness - a.totalBusiness).slice(0, 20));
  }, [quotations, customers, range]);

  useEffect(() => { compute(); }, [compute]);

  const totalRevenue = monthlySales.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = monthlySales.reduce((s, r) => s + r.orders, 0);
  const totalProfit = monthlySales.reduce((s, r) => s + r.profit, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const conversionRate = quotations.length > 0
    ? Math.round((quotations.filter((q: any) => q.status === 'approved' || q.status === 'converted').length / quotations.length) * 100) : 0;
  const lowStockItems = materials.filter((m) => m.current_quantity <= (m.reorder_level || 10));
  const totalPending = customers.reduce((s, c: any) => s + Number(c.current_balance || 0), 0);

  if (authChecking || !isAuthenticated) return null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'sales', label: 'Sales Report', icon: ChartBarIcon },
    { key: 'profit', label: 'Profit Report', icon: CurrencyRupeeIcon },
    { key: 'customers', label: 'Customer Report', icon: UserGroupIcon },
    { key: 'inventory', label: 'Inventory Report', icon: CubeIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="mx-auto max-w-7xl px-4 py-5 space-y-5">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Reports</h1>
              <p className="text-sm text-gray-500">Business analytics & insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <FunnelIcon className="w-4 h-4 text-gray-400 ml-1" />
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r.key ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              <PrinterIcon className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>

        {/* SUMMARY KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: CurrencyRupeeIcon, gradient: 'from-indigo-500 to-purple-600', sub: `${totalOrders} orders` },
            { label: 'Est. Profit', value: formatCurrency(totalProfit), icon: ArrowTrendingUpIcon, gradient: 'from-emerald-500 to-teal-600', sub: '~15% margin' },
            { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: DocumentTextIcon, gradient: 'from-sky-500 to-blue-600', sub: `${conversionRate}% conversion` },
            { label: 'Pending Payments', value: formatCurrency(totalPending), icon: CalendarDaysIcon, gradient: 'from-amber-500 to-orange-600', sub: `${customers.filter((c: any) => Number(c.current_balance || 0) > 0).length} customers` },
          ].map((card) => (
            <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs opacity-70 mt-0.5">{card.sub}</p>
                </div>
                <card.icon className="w-10 h-10 opacity-25" />
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="no-print flex gap-2 border-b border-gray-200">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-3"></div>
              Loading report data...
            </div>
          </div>
        ) : (
          <>
            {/* ===== SALES REPORT ===== */}
            {activeTab === 'sales' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4">📈 Monthly Revenue & Orders</h2>
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={monthlySales} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                          tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`}`} />
                        <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }}
                          formatter={(val: any, name: any) => [name === 'revenue' ? formatCurrency(val) : val, name === 'revenue' ? 'Revenue' : 'Orders']} />
                        <Legend />
                        <Bar yAxisId="rev" dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} opacity={0.9} />
                        <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-16">No data for selected period</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-4">📊 Quotation Status Breakdown</h2>
                    {statusPie.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="55%" height={200}>
                          <PieChart>
                            <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                              {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {statusPie.map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                                <span className="capitalize text-gray-600">{s.name}</span>
                              </div>
                              <span className="font-bold text-gray-800">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <p className="text-center text-gray-400 py-12">No data</p>}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-4">🗒️ Recent Quotations</h2>
                    <div className="overflow-auto max-h-60">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-gray-100">
                            <th className="text-left pb-2">Quotation #</th>
                            <th className="text-left pb-2">Customer</th>
                            <th className="text-right pb-2">Amount</th>
                            <th className="text-center pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotationRows.slice(0, 15).map((q) => (
                            <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 text-indigo-600 font-medium">{q.quotation_number}</td>
                              <td className="py-2 text-gray-700 truncate max-w-[100px]">{q.customer_name}</td>
                              <td className="py-2 text-right font-semibold text-gray-800">{formatCurrency(q.total_amount)}</td>
                              <td className="py-2 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[q.status] || 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                              </td>
                            </tr>
                          ))}
                          {quotationRows.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No quotations in selected period</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PROFIT REPORT ===== */}
            {activeTab === 'profit' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Gross Revenue', value: formatCurrency(totalRevenue), color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    { label: 'Material Cost (55%)', value: formatCurrency(totalRevenue * 0.55), color: 'bg-red-50 text-red-700 border-red-200' },
                    { label: 'Operating Cost (30%)', value: formatCurrency(totalRevenue * 0.30), color: 'bg-orange-50 text-orange-700 border-orange-200' },
                    { label: 'Net Profit (est. 15%)', value: formatCurrency(totalProfit), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  ].map((c) => (
                    <div key={c.label} className={`rounded-2xl border-2 p-5 ${c.color}`}>
                      <p className="text-xs font-semibold opacity-70">{c.label}</p>
                      <p className="text-2xl font-bold mt-1">{c.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4">📈 Monthly Profit Trend</h2>
                  {monthlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={monthlySales} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                          tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }}
                          formatter={(val: any, name: any) => [formatCurrency(val), name === 'revenue' ? 'Revenue' : 'Est. Profit']} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profGrad)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-16">No data for selected period</p>}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4">📋 Monthly Breakdown</h2>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left pb-3">Month</th>
                          <th className="text-right pb-3">Orders</th>
                          <th className="text-right pb-3">Revenue</th>
                          <th className="text-right pb-3">Material (55%)</th>
                          <th className="text-right pb-3">Operating (30%)</th>
                          <th className="text-right pb-3 text-emerald-700">Net Profit</th>
                          <th className="text-right pb-3">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySales.map((row) => (
                          <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2.5 font-medium text-gray-700">{row.month}</td>
                            <td className="py-2.5 text-right text-gray-600">{row.orders}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-800">{formatCurrency(row.revenue)}</td>
                            <td className="py-2.5 text-right text-red-600">{formatCurrency(row.revenue * 0.55)}</td>
                            <td className="py-2.5 text-right text-orange-600">{formatCurrency(row.revenue * 0.30)}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-700">{formatCurrency(row.profit)}</td>
                            <td className="py-2.5 text-right">
                              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">15%</span>
                            </td>
                          </tr>
                        ))}
                        {monthlySales.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No data for selected period</td></tr>}
                        {monthlySales.length > 0 && (
                          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                            <td className="py-2.5 text-gray-800">TOTAL</td>
                            <td className="py-2.5 text-right text-gray-800">{totalOrders}</td>
                            <td className="py-2.5 text-right text-gray-800">{formatCurrency(totalRevenue)}</td>
                            <td className="py-2.5 text-right text-red-700">{formatCurrency(totalRevenue * 0.55)}</td>
                            <td className="py-2.5 text-right text-orange-700">{formatCurrency(totalRevenue * 0.30)}</td>
                            <td className="py-2.5 text-right text-emerald-700">{formatCurrency(totalProfit)}</td>
                            <td className="py-2.5 text-right"><span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">15%</span></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===== CUSTOMER REPORT ===== */}
            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Customers', value: String(customers.length), sub: 'registered', cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                    { label: 'Active (in period)', value: String(customerRows.filter(c => c.totalOrders > 0).length), sub: 'with orders', cls: 'bg-green-50 border-green-200 text-green-700' },
                    { label: 'Total Outstanding', value: formatCurrency(totalPending), sub: `${customers.filter((c: any) => Number(c.current_balance || 0) > 0).length} due`, cls: 'bg-red-50 border-red-200 text-red-700' },
                    { label: 'Over Credit Limit', value: String(customers.filter((c: any) => Number(c.current_balance || 0) > Number(c.credit_limit || 0) && Number(c.credit_limit || 0) > 0).length), sub: 'customers', cls: 'bg-orange-50 border-orange-200 text-orange-700' },
                  ].map((c) => (
                    <div key={c.label} className={`border-2 rounded-2xl p-5 ${c.cls}`}>
                      <p className="text-xs font-semibold opacity-70">{c.label}</p>
                      <p className="text-2xl font-bold mt-1">{c.value}</p>
                      <p className="text-xs opacity-60 mt-0.5">{c.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4">🏆 Customer-wise Business (Top 20)</h2>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left pb-3">#</th>
                          <th className="text-left pb-3">Customer</th>
                          <th className="text-right pb-3">Orders</th>
                          <th className="text-right pb-3">Business</th>
                          <th className="text-right pb-3">Outstanding</th>
                          <th className="text-right pb-3">Credit Limit</th>
                          <th className="text-center pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerRows.map((c, i) => {
                          const overLimit = c.outstanding > c.creditLimit && c.creditLimit > 0;
                          const nearLimit = !overLimit && c.creditLimit > 0 && c.outstanding >= c.creditLimit * 0.8;
                          return (
                            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2.5 text-gray-400 font-medium">{i + 1}</td>
                              <td className="py-2.5">
                                <div className="font-semibold text-gray-800">{c.name}</div>
                                {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                              </td>
                              <td className="py-2.5 text-right text-gray-600">{c.totalOrders}</td>
                              <td className="py-2.5 text-right font-bold text-gray-800">{formatCurrency(c.totalBusiness)}</td>
                              <td className={`py-2.5 text-right font-semibold ${c.outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {c.outstanding > 0 ? formatCurrency(c.outstanding) : '—'}
                              </td>
                              <td className="py-2.5 text-right text-gray-500">{c.creditLimit > 0 ? formatCurrency(c.creditLimit) : '—'}</td>
                              <td className="py-2.5 text-center">
                                {overLimit ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Over Limit</span>
                                  : nearLimit ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Near Limit</span>
                                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {customerRows.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No customer data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===== INVENTORY REPORT ===== */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Materials', value: String(materials.length), sub: 'types', cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                    { label: 'Low Stock Items', value: String(lowStockItems.length), sub: 'need reorder', cls: 'bg-red-50 border-red-200 text-red-700' },
                    { label: 'Total Stock Value', value: formatCurrency(materials.reduce((s, m) => s + (m.current_quantity * (m.unit_cost || 0)), 0)), sub: 'est. value', cls: 'bg-green-50 border-green-200 text-green-700' },
                    { label: 'Healthy Stock', value: String(materials.length - lowStockItems.length), sub: 'items OK', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
                  ].map((c) => (
                    <div key={c.label} className={`border-2 rounded-2xl p-5 ${c.cls}`}>
                      <p className="text-xs font-semibold opacity-70">{c.label}</p>
                      <p className="text-2xl font-bold mt-1">{c.value}</p>
                      <p className="text-xs opacity-60 mt-0.5">{c.sub}</p>
                    </div>
                  ))}
                </div>

                {lowStockItems.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">⚠️</span>
                      <h3 className="font-bold text-red-700">Low Stock Alert — {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need reorder</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.map((m) => (
                        <span key={m.id} className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-xl">
                          {m.name} — {m.current_quantity} {m.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {materials.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-bold text-gray-800 mb-4">📦 Stock Levels</h2>
                    <ResponsiveContainer width="100%" height={Math.max(250, Math.min(materials.slice(0, 15).length, 15) * 40)}>
                      <BarChart
                        data={materials.slice(0, 15).map((m) => ({
                          name: m.name.length > 16 ? m.name.slice(0, 16) + '…' : m.name,
                          qty: m.current_quantity, reorder: m.reorder_level || 10,
                        }))}
                        layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Bar dataKey="qty" name="Current Stock" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={22} />
                        <Bar dataKey="reorder" name="Reorder Level" fill="#fca5a5" radius={[0, 6, 6, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4">📋 Full Inventory List</h2>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left pb-3">Material</th>
                          <th className="text-right pb-3">In Stock</th>
                          <th className="text-right pb-3">Reorder Level</th>
                          <th className="text-right pb-3">Unit Cost</th>
                          <th className="text-right pb-3">Stock Value</th>
                          <th className="text-center pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.length === 0
                          ? <tr><td colSpan={6} className="text-center text-gray-400 py-8">No inventory data</td></tr>
                          : materials.sort((a, b) => (a.current_quantity <= (a.reorder_level || 10) ? -1 : 1)).map((m) => {
                              const low = m.current_quantity <= (m.reorder_level || 10);
                              const value = m.current_quantity * (m.unit_cost || 0);
                              return (
                                <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 ${low ? 'bg-red-50/40' : ''}`}>
                                  <td className="py-2.5 font-medium text-gray-800">{m.name}</td>
                                  <td className={`py-2.5 text-right font-bold ${low ? 'text-red-600' : 'text-gray-800'}`}>{m.current_quantity} {m.unit}</td>
                                  <td className="py-2.5 text-right text-gray-500">{m.reorder_level || 10} {m.unit}</td>
                                  <td className="py-2.5 text-right text-gray-500">{m.unit_cost > 0 ? formatCurrency(m.unit_cost) : '—'}</td>
                                  <td className="py-2.5 text-right font-semibold text-gray-700">{value > 0 ? formatCurrency(value) : '—'}</td>
                                  <td className="py-2.5 text-center">
                                    {low
                                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Low Stock</span>
                                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                                  </td>
                                </tr>
                              );
                            })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
