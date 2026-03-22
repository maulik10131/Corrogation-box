'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  TruckIcon,
  CubeIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============ TYPES ============
interface DashboardStats {
  totalQuotations: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingAmount: number;
  quotationsTrend: number;
  customersTrend: number;
  revenueTrend: number;
}

interface MonthlyData {
  month: string;
  quotations: number;
  revenue: number;
  orders: number;
}

interface QuotationStatus {
  name: string;
  value: number;
  color: string;
}

interface RecentQuotation {
  id: number;
  number: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
}

interface TopCustomer {
  id: number;
  name: string;
  business: number;
  orders: number;
}

interface TodayKPIs {
  productionSqm: number;
  dispatchCount: number;
  profitToday: number;
  pendingPayments: number;
  pendingCustomerCount: number;
}

interface PaperConsumption {
  month: string;
  sqm: number;
  kg: number;
}

// ============ COMPONENT ============
export default function DashboardPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    quotationsTrend: 0,
    customersTrend: 0,
    revenueTrend: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [quotationStatus, setQuotationStatus] = useState<QuotationStatus[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [todayKPIs, setTodayKPIs] = useState<TodayKPIs>({
    productionSqm: 0,
    dispatchCount: 0,
    profitToday: 0,
    pendingPayments: 0,
    pendingCustomerCount: 0,
  });
  const [paperConsumption, setPaperConsumption] = useState<PaperConsumption[]>([]);

  // ============ AUTH CHECK ============
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      
      if (!token || !user) {
        // User is not logged in, redirect to login page
        router.replace('/login');
      } else {
        // User is authenticated
        setIsAuthenticated(true);
        setAuthChecking(false);
      }
    }
  }, [router]);

  // ============ LOAD DATA ============
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [period, isAuthenticated]);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pms_token') : null;
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [quotationsRes, customersRes, workOrdersRes, dispatchRes] = await Promise.all([
        fetch(`${API_URL}/quotations?per_page=500`, { headers: authHeaders }),
        fetch(`${API_URL}/customers?per_page=500`, { headers: authHeaders }),
        fetch(`${API_URL}/work-orders?per_page=500`, { headers: authHeaders }),
        fetch(`${API_URL}/dispatches?per_page=500`, { headers: authHeaders }),
      ]);

      const quotationsJson = await quotationsRes.json();
      const customersJson = await customersRes.json();
      const workOrdersJson = await workOrdersRes.json().catch(() => ({ success: false, data: [] }));
      const dispatchJson = await dispatchRes.json().catch(() => ({ success: false, data: [] }));
      const quotations = quotationsJson.success ? (quotationsJson.data || []) : [];
      const customers = customersJson.success ? (customersJson.data || []) : [];
      const workOrders = workOrdersJson.success ? (workOrdersJson.data || []) : [];
      const dispatches = dispatchJson.success ? (dispatchJson.data || []) : [];

      // ---- Today KPIs ----
      const todayStr = new Date().toISOString().slice(0, 10);

      // Today production: sum sheet_area * quantity from work order items dispatched/completed today
      const todayWOs = workOrders.filter((wo: any) => {
        const d = (wo.updated_at || wo.order_date || '').slice(0, 10);
        return d === todayStr && (wo.status === 'completed' || wo.status === 'in_progress');
      });
      const productionSqm = todayWOs.reduce((sum: number, wo: any) => {
        const qty = Number(wo.total_quantity || wo.produced_quantity || 0);
        const sqm = Number(wo.sheet_area_sqm || 0);
        return sum + (sqm > 0 ? sqm * qty : qty * 0.06); // fallback 0.06 sqm avg
      }, 0);

      // Today dispatches
      const todayDispatches = dispatches.filter((d: any) =>
        (d.dispatch_date || '').slice(0, 10) === todayStr
      );

      // Profit today: quotations approved/converted today (estimated 15% margin)
      const todayQuotations = quotations.filter((q: any) => {
        const d = (q.updated_at || q.quotation_date || '').slice(0, 10);
        return d === todayStr && (q.status === 'approved' || q.status === 'converted');
      });
      const profitToday = todayQuotations.reduce((sum: number, q: any) =>
        sum + Number(q.total_amount || 0) * 0.15, 0);

      // Pending payments: customers with outstanding balance
      const pendingCustomers = customers.filter((c: any) => Number(c.current_balance || 0) > 0);
      const pendingPayments = pendingCustomers.reduce((sum: number, c: any) =>
        sum + Number(c.current_balance || 0), 0);

      setTodayKPIs({
        productionSqm: Math.round(productionSqm * 100) / 100,
        dispatchCount: todayDispatches.length,
        profitToday: Math.round(profitToday),
        pendingPayments: Math.round(pendingPayments),
        pendingCustomerCount: pendingCustomers.length,
      });

      // ---- Paper Consumption (from quotations monthly) ----
      const paperByMonth: Record<string, { sqm: number; kg: number }> = {};
      quotations.forEach((q: any) => {
        const d = new Date(q.quotation_date || q.created_at);
        const mk = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        if (!paperByMonth[mk]) paperByMonth[mk] = { sqm: 0, kg: 0 };
        (q.items || []).forEach((item: any) => {
          const sqm = Number(item.sheet_area || 0) * Number(item.quantity || 0);
          const kg = Number(item.box_weight || 0) * Number(item.quantity || 0);
          paperByMonth[mk].sqm += sqm;
          paperByMonth[mk].kg += kg;
        });
        // fallback if no items but has total_amount
        if (!(q.items?.length) && Number(q.total_amount) > 0) {
          const estSqm = Number(q.total_amount) / 80; // rough estimate
          paperByMonth[mk].sqm += estSqm;
          paperByMonth[mk].kg += estSqm * 3.5;
        }
      });
      const paperRows: PaperConsumption[] = Object.keys(paperByMonth).slice(-8).map(k => ({
        month: k,
        sqm: Math.round(paperByMonth[k].sqm * 10) / 10,
        kg: Math.round(paperByMonth[k].kg * 10) / 10,
      }));
      setPaperConsumption(paperRows);

      const totalRevenue = quotations.reduce((sum: number, q: any) => sum + Number(q.total_amount || 0), 0);
      const pendingAmount = quotations
        .filter((q: any) => q.status === 'draft' || q.status === 'sent')
        .reduce((sum: number, q: any) => sum + Number(q.total_amount || 0), 0);

      const byMonth: Record<string, { quotations: number; revenue: number; orders: number }> = {};
      quotations.forEach((q: any) => {
        const d = new Date(q.quotation_date || q.created_at);
        const monthKey = d.toLocaleDateString('en-IN', { month: 'short' });
        if (!byMonth[monthKey]) byMonth[monthKey] = { quotations: 0, revenue: 0, orders: 0 };
        byMonth[monthKey].quotations += 1;
        byMonth[monthKey].revenue += Number(q.total_amount || 0);
        if (q.status === 'approved' || q.status === 'converted') byMonth[monthKey].orders += 1;
      });

      const monthlyRows: MonthlyData[] = Object.keys(byMonth).map((k) => ({
        month: k,
        quotations: byMonth[k].quotations,
        revenue: byMonth[k].revenue,
        orders: byMonth[k].orders,
      }));

      const statusCount: Record<string, number> = {};
      quotations.forEach((q: any) => {
        statusCount[q.status] = (statusCount[q.status] || 0) + 1;
      });
      const statusColors: Record<string, string> = {
        approved: '#22c55e',
        sent: '#3b82f6',
        rejected: '#ef4444',
        expired: '#f59e0b',
        draft: '#9ca3af',
        converted: '#8b5cf6',
      };
      const statusRows: QuotationStatus[] = Object.keys(statusCount).map((status) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: statusCount[status],
        color: statusColors[status] || '#6b7280',
      }));

      const recentRows: RecentQuotation[] = quotations
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at || b.quotation_date).getTime() - new Date(a.created_at || a.quotation_date).getTime())
        .slice(0, 5)
        .map((q: any) => ({
          id: q.id,
          number: q.quotation_number,
          customer: q.customer_name || 'Customer',
          amount: Number(q.total_amount || 0),
          status: q.status,
          date: q.quotation_date || q.created_at,
        }));

      const customerAgg: Record<string, { id: number; name: string; business: number; orders: number }> = {};
      quotations.forEach((q: any) => {
        const key = String(q.customer_id || q.customer_name || '0');
        if (!customerAgg[key]) {
          customerAgg[key] = {
            id: Number(q.customer_id || 0),
            name: q.customer_name || 'Customer',
            business: 0,
            orders: 0,
          };
        }
        customerAgg[key].business += Number(q.total_amount || 0);
        customerAgg[key].orders += 1;
      });

      const topCustomerRows: TopCustomer[] = Object.values(customerAgg)
        .sort((a, b) => b.business - a.business)
        .slice(0, 5);

      setStats({
        totalQuotations: quotations.length,
        totalCustomers: customers.length,
        totalRevenue,
        pendingAmount,
        quotationsTrend: 0,
        customersTrend: 0,
        revenueTrend: 0,
      });
      setMonthlyData(monthlyRows);
      setQuotationStatus(statusRows);
      setRecentQuotations(recentRows);
      setTopCustomers(topCustomerRows);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setStats({
        totalQuotations: 0,
        totalCustomers: 0,
        totalRevenue: 0,
        pendingAmount: 0,
        quotationsTrend: 0,
        customersTrend: 0,
        revenueTrend: 0,
      });
      setTodayKPIs({ productionSqm: 0, dispatchCount: 0, profitToday: 0, pendingPayments: 0, pendingCustomerCount: 0 });
      setPaperConsumption([]);
      setMonthlyData([]);
      setQuotationStatus([]);
      setRecentQuotations([]);
      setTopCustomers([]);
    }

    setLoading(false);
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
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-yellow-100 text-yellow-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
          +{value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
          {value}%
        </span>
      );
    }
    return <span className="text-gray-500 text-sm">0%</span>;
  };

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {/* Animated corrugated box */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Box body */}
              <rect x="15" y="42" width="70" height="48" rx="3" fill="url(#boxGrad)" />
              {/* Corrugation lines */}
              <line x1="15" y1="54" x2="85" y2="54" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
              <line x1="15" y1="62" x2="85" y2="62" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
              <line x1="15" y1="70" x2="85" y2="70" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
              <line x1="15" y1="78" x2="85" y2="78" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
              {/* Left flap */}
              <rect x="15" y="22" width="30" height="22" rx="2" fill="url(#flapGrad)" className="origin-bottom">
                <animateTransform attributeName="transform" type="rotate" from="-40 15 44" to="0 15 44" dur="1.2s" repeatCount="indefinite" keyTimes="0;0.4;1" values="-40 15 44;0 15 44;0 15 44" />
              </rect>
              {/* Right flap */}
              <rect x="55" y="22" width="30" height="22" rx="2" fill="url(#flapGrad)">
                <animateTransform attributeName="transform" type="rotate" from="40 85 44" to="0 85 44" dur="1.2s" repeatCount="indefinite" keyTimes="0;0.4;1" values="40 85 44;0 85 44;0 85 44" />
              </rect>
              {/* Tape strip */}
              <rect x="42" y="36" width="16" height="54" rx="2" fill="#6366f1" fillOpacity="0.25" />
              <defs>
                <linearGradient id="boxGrad" x1="15" y1="42" x2="85" y2="90" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                  <stop stopColor="#a5b4fc" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-300 opacity-40 animate-ping" style={{ animationDuration: '1.4s' }}></div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Dashboard</p>
          <p className="text-sm text-gray-400 mt-1">Fetching your business data...</p>
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  const totalStatusCount = quotationStatus.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const quotationStatusWithPercent = quotationStatus.map((item) => ({
    ...item,
    percentage: totalStatusCount > 0 ? Math.round((item.value / totalStatusCount) * 100) : 0,
  }));

  // Don't render dashboard until authentication is verified
  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back! Here's your business overview.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                {(['week', 'month', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              {/* Quick Actions */}
              <Link
                href="/quotations/create"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-md font-medium text-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                New Quotation
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Quotations */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Quotations</p>
                <p className="text-3xl font-bold mt-1">{stats.totalQuotations}</p>
                <TrendIndicator value={stats.quotationsTrend} />
              </div>
              <DocumentTextIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>

          {/* Total Customers */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Customers</p>
                <p className="text-3xl font-bold mt-1">{stats.totalCustomers}</p>
                <TrendIndicator value={stats.customersTrend} />
              </div>
              <UserGroupIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <TrendIndicator value={stats.revenueTrend} />
              </div>
              <CurrencyRupeeIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>

          {/* Pending Amount */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Pending Amount</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
                <p className="text-xs opacity-70">Outstanding</p>
              </div>
              <ClockIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
        </div>

        {/* ===== OWNER POWER KPIs ===== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
            <h2 className="text-base font-bold text-gray-800">👑 Today's Live KPIs</h2>
            <span className="text-xs text-gray-400 ml-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Today Production */}
            <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CubeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Today Production</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{todayKPIs.productionSqm > 0 ? todayKPIs.productionSqm.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">sq.m produced</p>
                <div className="mt-2 h-1 bg-blue-50 rounded-full overflow-hidden">
                  <div className="h-1 bg-blue-400 rounded-full" style={{ width: todayKPIs.productionSqm > 0 ? '70%' : '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Today Dispatch */}
            <div className="bg-white rounded-2xl border-2 border-green-100 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                    <TruckIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Today Dispatch</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{todayKPIs.dispatchCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">deliveries done</p>
                <Link href="/dispatch" className="mt-2 inline-block text-xs text-green-600 hover:underline">View dispatches →</Link>
              </div>
            </div>

            {/* Profit Today */}
            <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-full -translate-y-6 translate-x-6"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BanknotesIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Profit Today</p>
                </div>
                <p className="text-3xl font-bold text-purple-700">{todayKPIs.profitToday > 0 ? formatCurrency(todayKPIs.profitToday) : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">est. @ 15% margin</p>
                <div className="mt-2 h-1 bg-purple-50 rounded-full overflow-hidden">
                  <div className="h-1 bg-purple-400 rounded-full" style={{ width: todayKPIs.profitToday > 0 ? '60%' : '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className={`bg-white rounded-2xl border-2 shadow-sm p-5 relative overflow-hidden ${
              todayKPIs.pendingPayments > 0 ? 'border-red-200' : 'border-gray-100'
            }`}>
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 ${
                todayKPIs.pendingPayments > 0 ? 'bg-red-50' : 'bg-gray-50'
              }`}></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    todayKPIs.pendingPayments > 0 ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <ExclamationTriangleIcon className={`w-5 h-5 ${
                      todayKPIs.pendingPayments > 0 ? 'text-red-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Pending Payments</p>
                </div>
                <p className={`text-3xl font-bold ${
                  todayKPIs.pendingPayments > 0 ? 'text-red-600' : 'text-gray-400'
                }`}>{formatCurrency(todayKPIs.pendingPayments)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{todayKPIs.pendingCustomerCount} customer{todayKPIs.pendingCustomerCount !== 1 ? 's' : ''} outstanding</p>
                <Link href="/customers" className="mt-2 inline-block text-xs text-red-600 hover:underline">View customers →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Revenue Overview</h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-600">Quotations</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid stroke="#eef2ff" strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="revenue"
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}K`}
                />
                <YAxis yAxisId="count" orientation="right" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number | string | undefined, name?: string) => {
                    const numericValue = Number(value || 0);
                    const label = name || 'Value';
                    if (label === 'Revenue') return [formatCurrency(numericValue), label];
                    return [numericValue, label];
                  }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  name="Revenue"
                  fill="#7c83fd"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="quotations"
                  name="Quotations"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ fill: '#34d399', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Quotation Status Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Quotation Status</h2>
              <span className="text-sm text-gray-500">This Year</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={quotationStatusWithPercent}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  cornerRadius={8}
                  dataKey="value"
                >
                  {quotationStatusWithPercent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" className="fill-gray-500 text-xs">
                  Total
                </text>
                <text x="50%" y="56%" textAnchor="middle" className="fill-gray-800 text-2xl font-bold">
                  {totalStatusCount}
                </text>
                <Tooltip
                  formatter={(value: number | string | undefined, name: string | undefined, data: any) => [
                    `${Number(value || 0)} (${data?.payload?.percentage ?? 0}%)`,
                    name || 'Status',
                  ]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {quotationStatusWithPercent.map((status, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></span>
                  <span className="text-sm text-gray-700">{status.name}</span>
                  <span className="ml-auto text-sm font-semibold text-gray-800">{status.value}</span>
                  <span className="text-xs text-gray-500">({status.percentage}%)</span>
                </div>
              ))}
              {quotationStatusWithPercent.length === 0 && (
                <p className="text-sm text-gray-500">No quotation data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Quotations Chart & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Quotations Bar Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Monthly Quotations</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="quotations" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 Customers */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">🏆 Top 5 Customers</h2>
              <Link href="/customers" className="text-indigo-600 hover:underline text-sm">View All</Link>
            </div>
            {topCustomers.length > 0 ? (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => {
                  const maxBiz = topCustomers[0]?.business || 1;
                  const pct = Math.round((customer.business / maxBiz) * 100);
                  const colors = ['#f59e0b', '#94a3b8', '#ea580c', '#6366f1', '#22c55e'];
                  const bgColors = ['bg-yellow-50', 'bg-gray-50', 'bg-orange-50', 'bg-indigo-50', 'bg-green-50'];
                  return (
                    <div key={customer.id} className={`flex items-center gap-3 p-3 ${bgColors[index]} rounded-xl`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: colors[index] }}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <Link href={`/customers/${customer.id}`} className="font-semibold text-gray-800 hover:text-indigo-600 text-sm truncate">
                            {customer.name}
                          </Link>
                          <span className="font-bold text-gray-800 text-sm ml-2 flex-shrink-0">{formatCurrency(customer.business)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: colors[index] }}></div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{customer.orders} orders</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No customer data yet</div>
            )}
          </div>
        </div>

        {/* Paper Consumption Graph */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-800">📄 Paper Consumption</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span> Sheet Area (sq.m)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span> Paper Weight (kg)</span>
            </div>
          </div>
          {paperConsumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={paperConsumption} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="sqm" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}m²`} />
                <YAxis yAxisId="kg" orientation="right" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }}
                  formatter={(value: any, name: any) => [
                    name === 'sqm' ? `${value} sq.m` : `${value} kg`,
                    name === 'sqm' ? 'Sheet Area' : 'Paper Weight'
                  ]}
                />
                <Area yAxisId="sqm" type="monotone" dataKey="sqm" fill="#d1fae5" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                <Bar yAxisId="kg" dataKey="kg" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.8} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No paper consumption data — add quotation items with sheet area to see this graph
            </div>
          )}
        </div>

        {/* Recent Quotations & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quotations */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent Quotations</h2>
              <Link href="/quotations" className="text-indigo-600 hover:underline text-sm">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                    <th className="px-3 py-3 text-left text-sm font-semibold text-indigo-700">Quotation</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-indigo-700">Customer</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-indigo-700">Amount</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-indigo-700">Status</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-indigo-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-3 py-3">
                        <Link
                          href={`/quotations/${quotation.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {quotation.number}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-800">{quotation.customer}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatCurrency(quotation.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-500">{formatDate(quotation.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/quotations/create"
                className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">New Quotation</p>
                  <p className="text-sm text-gray-500">Create a new quotation</p>
                </div>
              </Link>

              <Link
                href="/customers/create"
                className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Add Customer</p>
                  <p className="text-sm text-gray-500">Register new customer</p>
                </div>
              </Link>

              <Link
                href="/box-calculation"
                className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CalculatorIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Box Calculator</p>
                  <p className="text-sm text-gray-500">Calculate box pricing</p>
                </div>
              </Link>

              <Link
                href="/reports"
                className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">View Reports</p>
                  <p className="text-sm text-gray-500">Analytics & insights</p>
                </div>
              </Link>
            </div>

            {/* Today's Summary */}
            <div className="mt-6 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDaysIcon className="w-5 h-5" />
                <span className="font-medium">Today's Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-indigo-100 text-sm">Quotations</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Value</p>
                  <p className="text-2xl font-bold">₹2.5L</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}