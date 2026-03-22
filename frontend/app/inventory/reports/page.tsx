'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChartBarIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

// ============ TYPES ============
interface StockSummary {
  category: string;
  items_count: number;
  total_value: number;
  low_stock: number;
  out_of_stock: number;
}

interface StockMovement {
  date: string;
  stock_in: number;
  stock_out: number;
}

interface TopItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  value: number;
  movement: number;
  unit: string;
}

interface LowStockItem {
  id: number;
  item_code: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  status: 'low' | 'out';
}

interface TransactionHistory {
  id: number;
  date: string;
  type: 'in' | 'out';
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  reference: string;
  value: number;
}

// ============ COMPONENT ============
export default function InventoryReportsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'movement' | 'lowstock' | 'transactions'>('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [categoryFilter, setCategoryFilter] = useState('');

  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [stockMovement, setStockMovement] = useState<StockMovement[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);

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
      loadReportData();
    }
  }, [dateRange, categoryFilter, isAuthenticated]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [summaryRes, itemsRes, movementsRes] = await Promise.all([
        fetch(`${API_URL}/inventory/summary`),
        fetch(`${API_URL}/inventory-items`),
        fetch(`${API_URL}/inventory/movements?from_date=${dateRange.from}&to_date=${dateRange.to}&limit=500`),
      ]);

      const summaryJson = await summaryRes.json();
      const itemsJson = await itemsRes.json();
      const movementsJson = await movementsRes.json();

      const allSummaryRows: StockSummary[] = (summaryJson.success ? (summaryJson.data?.by_category || []) : []).map((row: any) => ({
        category: row.category,
        items_count: Number(row.items_count || 0),
        total_value: Number(row.total_value || 0),
        low_stock: Number(row.low_stock || 0),
        out_of_stock: Number(row.out_of_stock || 0),
      }));

      const allItemRows = (itemsJson.success ? (itemsJson.data || []) : []).map((item: any) => ({
        id: item.id,
        item_code: item.item_code,
        name: item.name,
        category: item.category,
        stock: Number(item.current_stock || 0),
        min_stock: Number(item.min_stock || 0),
        unit: item.unit,
        value: Number(item.current_stock || 0) * Number(item.avg_price || 0),
      }));

      const allMovementRows = (movementsJson.success ? (movementsJson.data || []) : []).map((row: any) => ({
        id: row.id,
        date: row.movement_date,
        type: row.movement_type,
        item_code: row.item_code || '',
        item_name: row.item_name || '',
        category: row.category || '',
        quantity: Number(row.quantity || 0),
        unit: row.unit || '',
        reference: row.reference_no || '-',
        value: Number(row.amount || 0),
      }));

      const summaryRows = categoryFilter
        ? allSummaryRows.filter((row) => row.category === categoryFilter)
        : allSummaryRows;

      const itemRows = categoryFilter
        ? allItemRows.filter((row: any) => row.category === categoryFilter)
        : allItemRows;

      const movementRows = categoryFilter
        ? allMovementRows.filter((row: any) => row.category === categoryFilter)
        : allMovementRows;

      const groupedByDate: Record<string, { stock_in: number; stock_out: number }> = {};
      movementRows.forEach((row: any) => {
        const key = row.date;
        if (!groupedByDate[key]) groupedByDate[key] = { stock_in: 0, stock_out: 0 };
        if (row.type === 'in') groupedByDate[key].stock_in += row.value;
        if (row.type === 'out') groupedByDate[key].stock_out += row.value;
      });

      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const movementChart: StockMovement[] = [];
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const key = cursor.toISOString().split('T')[0];
        movementChart.push({
          date: cursor.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          stock_in: groupedByDate[key]?.stock_in || 0,
          stock_out: groupedByDate[key]?.stock_out || 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      const topRows: TopItem[] = itemRows
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          stock: item.stock,
          value: item.value,
          movement: movementRows.filter((m: any) => m.item_code === item.item_code).reduce((sum: number, m: any) => sum + m.quantity, 0),
          unit: item.unit,
        }));

      const lowRows: LowStockItem[] = itemRows
        .filter((item: any) => item.stock <= item.min_stock)
        .map((item: any) => ({
          id: item.id,
          item_code: item.item_code,
          name: item.name,
          current_stock: item.stock,
          min_stock: item.min_stock,
          unit: item.unit,
          status: item.stock <= 0 ? 'out' : 'low',
        }));

      setStockSummary(summaryRows);
      setStockMovement(movementChart);
      setTopItems(topRows);
      setLowStockItems(lowRows);
      setTransactions(
        movementRows
          .slice()
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (error) {
      console.error('Failed to load inventory reports:', error);
      setStockSummary([]);
      setStockMovement([]);
      setTopItems([]);
      setLowStockItems([]);
      setTransactions([]);
    }

    setLoading(false);
  };

  // ============ EXPORT FUNCTIONS ============
  const handleExportCSV = (type: string) => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'summary':
        csvContent = 'Category,Items Count,Total Value,Low Stock,Out of Stock\n';
        stockSummary.forEach(row => {
          csvContent += `${row.category},${row.items_count},${row.total_value},${row.low_stock},${row.out_of_stock}\n`;
        });
        filename = `stock_summary_${dateRange.from}_to_${dateRange.to}.csv`;
        break;

      case 'lowstock':
        csvContent = 'Item Code,Item Name,Current Stock,Min Stock,Unit,Status\n';
        lowStockItems.forEach(row => {
          csvContent += `${row.item_code},"${row.name}",${row.current_stock},${row.min_stock},${row.unit},${row.status}\n`;
        });
        filename = `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'transactions':
        csvContent = 'Date,Type,Item Code,Item Name,Quantity,Unit,Reference,Value\n';
        transactions.forEach(row => {
          csvContent += `${row.date},${row.type},${row.item_code},"${row.item_name}",${row.quantity},${row.unit},${row.reference},${row.value}\n`;
        });
        filename = `transactions_${dateRange.from}_to_${dateRange.to}.csv`;
        break;

      case 'topitems':
        csvContent = 'Item Name,Category,Current Stock,Unit,Stock Value,Monthly Movement\n';
        topItems.forEach(row => {
          csvContent += `"${row.name}",${row.category},${row.stock},${row.unit},${row.value},${row.movement}\n`;
        });
        filename = `top_items_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============ CALCULATIONS ============
  const totals = {
    items: stockSummary.reduce((sum, s) => sum + s.items_count, 0),
    value: stockSummary.reduce((sum, s) => sum + s.total_value, 0),
    lowStock: stockSummary.reduce((sum, s) => sum + s.low_stock, 0),
    outOfStock: stockSummary.reduce((sum, s) => sum + s.out_of_stock, 0),
    totalIn: stockMovement.reduce((sum, m) => sum + m.stock_in, 0),
    totalOut: stockMovement.reduce((sum, m) => sum + m.stock_out, 0),
  };

  const pieColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const categories = [...new Set(topItems.map(i => i.category))];

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

  if (authChecking || !isAuthenticated) {
    return null;
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/inventory" className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
                Inventory Reports
              </h1>
              <p className="text-gray-500">Stock analysis and insights</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExportCSV('summary')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => handleExportCSV('lowstock')}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Low Stock
            </button>
            <button
              onClick={() => handleExportCSV('transactions')}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Transactions
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadReportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'movement', label: '📈 Stock Movement' },
              { id: 'lowstock', label: '⚠️ Low Stock' },
              { id: 'transactions', label: '📋 Transactions' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading reports...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold text-gray-800">{totals.items}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Stock Value</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.value)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Stock In</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalIn)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Stock Out</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalOut)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">{totals.lowStock}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{totals.outOfStock}</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Value Chart */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold">Category-wise Value</h2>
                      <button
                        onClick={() => handleExportCSV('summary')}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Export
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stockSummary}
                          dataKey="total_value"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {stockSummary.map((_, index) => (
                            <Cell key={index} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stock Movement Trend */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-bold mb-4">Stock Movement Trend</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={stockMovement}>
                        <defs>
                          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" tickFormatter={(v) => `₹${v / 1000}K`} />
                        <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                        <Legend />
                        <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#22c55e" fill="url(#colorIn)" />
                        <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#f59e0b" fill="url(#colorOut)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Items Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">🏆 Top Items by Value</h2>
                    <button
                      onClick={() => handleExportCSV('topitems')}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Stock</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Value</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Movement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topItems.slice(0, 8).map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-orange-400' : 'bg-blue-400'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">{item.category}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.stock.toLocaleString()} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              {formatCurrency(item.value)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {item.movement.toLocaleString()} {item.unit}/month
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Movement Tab */}
            {activeTab === 'movement' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Total Stock In</p>
                    <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                      <ArrowTrendingUpIcon className="w-6 h-6" />
                      {formatCurrency(totals.totalIn)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Total Stock Out</p>
                    <p className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                      <ArrowTrendingDownIcon className="w-6 h-6" />
                      {formatCurrency(totals.totalOut)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500">Net Movement</p>
                    <p className={`text-2xl font-bold ${totals.totalIn - totals.totalOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.totalIn - totals.totalOut)}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-lg font-bold mb-4">📊 Daily Stock Movement</h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={stockMovement}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" tickFormatter={(v) => `₹${v / 1000}K`} />
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                      <Legend />
                      <Bar dataKey="stock_in" name="Stock In" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="stock_out" name="Stock Out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Low Stock Tab */}
            {activeTab === 'lowstock' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-sm text-yellow-700">Low Stock Items</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {lowStockItems.filter(i => i.status === 'low').length}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700">Out of Stock Items</p>
                    <p className="text-3xl font-bold text-red-600">
                      {lowStockItems.filter(i => i.status === 'out').length}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b bg-orange-50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      Stock Alerts
                    </h2>
                    <button
                      onClick={() => handleExportCSV('lowstock')}
                      className="flex items-center gap-1 text-orange-600 text-sm hover:underline"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                  {lowStockItems.length === 0 ? (
                    <div className="p-12 text-center">
                      <CubeIcon className="w-16 h-16 text-green-300 mx-auto mb-4" />
                      <p className="text-green-600 font-medium">All items are in stock!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Code</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item Name</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Current</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Minimum</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Shortage</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lowStockItems.map((item) => (
                            <tr key={item.id} className={`hover:bg-gray-50 ${item.status === 'out' ? 'bg-red-50' : ''}`}>
                              <td className="px-4 py-3 font-mono text-sm">{item.item_code}</td>
                              <td className="px-4 py-3 font-medium">{item.name}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold ${item.status === 'out' ? 'text-red-600' : 'text-yellow-600'}`}>
                                  {item.current_stock} {item.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500">
                                {item.min_stock} {item.unit}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-bold text-red-600">
                                  {Math.max(0, item.min_stock - item.current_stock)} {item.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'out'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {item.status === 'out' ? '❌ Out of Stock' : '⚠️ Low Stock'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Link
                                  href={`/inventory/stock-in?item=${item.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                  Add Stock
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-bold">📋 Transaction History</h2>
                  <button
                    onClick={() => handleExportCSV('transactions')}
                    className="flex items-center gap-1 text-blue-600 text-sm hover:underline"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Reference</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(txn.date)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              txn.type === 'in'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {txn.type === 'in' ? (
                                <>
                                  <PlusIcon className="w-3 h-3" />
                                  IN
                                </>
                              ) : (
                                <>
                                  <ArrowTrendingDownIcon className="w-3 h-3" />
                                  OUT
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{txn.item_name}</p>
                            <p className="text-xs text-gray-500">{txn.item_code}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            <span className={txn.type === 'in' ? 'text-green-600' : 'text-orange-600'}>
                              {txn.type === 'in' ? '+' : '-'}{txn.quantity} {txn.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-blue-600">{txn.reference}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCurrency(txn.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length > 0 && (
                  <div className="p-4 bg-gray-50 border-t text-center text-sm text-gray-500">
                    Showing {transactions.length} transactions
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}