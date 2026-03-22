'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import {
  CubeIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface StockItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  avg_price: number;
  last_purchase_price: number;
  stock_value: number;
  location: string;
  last_updated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'over_stock';
}

interface RecentTransaction {
  id: number;
  date: string;
  type: 'in' | 'out';
  item_name: string;
  quantity: number;
  unit: string;
  reference: string;
  remarks: string;
}

// ============ COMPONENT ============
export default function InventoryPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      loadInventoryData();
    }
  }, [isAuthenticated]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [itemsRes, movementsRes] = await Promise.all([
        fetch(`${API_URL}/inventory-items`),
        fetch(`${API_URL}/inventory/movements?limit=20`),
      ]);

      const itemsJson = await itemsRes.json();
      const movementsJson = await movementsRes.json();

      const mappedItems: StockItem[] = (itemsJson.success ? (itemsJson.data || []) : []).map((item: any) => {
        const currentStock = Number(item.current_stock || 0);
        const minStock = Number(item.min_stock || 0);
        const maxStock = Number(item.max_stock || 0);
        const avgPrice = Number(item.avg_price || 0);

        let status: StockItem['status'] = 'in_stock';
        if (currentStock <= 0) {
          status = 'out_of_stock';
        } else if (currentStock <= minStock) {
          status = 'low_stock';
        } else if (maxStock > 0 && currentStock > maxStock) {
          status = 'over_stock';
        }

        return {
          id: item.id,
          item_code: item.item_code,
          name: item.name,
          category: item.category,
          unit: item.unit,
          current_stock: currentStock,
          min_stock: minStock,
          max_stock: maxStock,
          avg_price: avgPrice,
          last_purchase_price: avgPrice,
          stock_value: currentStock * avgPrice,
          location: item.location || '',
          last_updated: item.created_at || new Date().toISOString().split('T')[0],
          status,
        };
      });

      const mappedMovements: RecentTransaction[] = (movementsJson.success ? (movementsJson.data || []) : []).map((row: any) => ({
        id: row.id,
        date: row.movement_date,
        type: row.movement_type,
        item_name: row.item_name || row.item_code || 'Item',
        quantity: Number(row.quantity || 0),
        unit: row.unit || '',
        reference: row.reference_no || '-',
        remarks: row.remarks || '',
      }));

      setStockItems(mappedItems);
      setRecentTransactions(mappedMovements);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      setStockItems([]);
      setRecentTransactions([]);
    }

    setLoading(false);
  };

  // ============ FILTERING ============
  const categories = [...new Set(stockItems.map(item => item.category))];

  const filteredItems = stockItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || item.category === categoryFilter;

    const matchesStatus = !statusFilter || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // ============ STATS ============
  const stats = {
    totalItems: stockItems.length,
    totalValue: stockItems.reduce((sum, item) => sum + item.stock_value, 0),
    lowStock: stockItems.filter(item => item.status === 'low_stock').length,
    outOfStock: stockItems.filter(item => item.status === 'out_of_stock').length,
  };

  // ============ HELPERS ============
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">In Stock</span>;
      case 'low_stock':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Low Stock</span>;
      case 'out_of_stock':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Out of Stock</span>;
      case 'over_stock':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Over Stock</span>;
      default:
        return null;
    }
  };

  // ============ RENDER ============
  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Inventory" subtitle="Fetching inventory data..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <CubeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
                <p className="text-sm text-gray-500">Manage stock and materials</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/inventory/stock-in"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-green-700 shadow-sm transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Stock In
              </Link>
              <Link
                href="/inventory/stock-out"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 shadow-sm transition-all"
              >
                <MinusIcon className="w-4 h-4" />
                Stock Out
              </Link>
              <Link
                href="/inventory/items"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-sky-600 hover:to-blue-700 shadow-sm transition-all"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                Items
              </Link>
               <Link
                href="/inventory/categories"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-purple-700 shadow-sm transition-all"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                Categories
              </Link>
              <Link
                href="/inventory/reports"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-700 shadow-sm transition-all"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Items</p>
                <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
              </div>
              <CubeIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Stock Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalValue)}</p>
              </div>
              <ArrowTrendingUpIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Low Stock</p>
                <p className="text-2xl font-bold mt-1">{stats.lowStock}</p>
              </div>
              <ExclamationTriangleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Out of Stock</p>
                <p className="text-2xl font-bold mt-1">{stats.outOfStock}</p>
              </div>
              <ExclamationTriangleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List - 2 columns */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="over_stock">Over Stock</option>
                </select>
                <button
                  onClick={loadInventoryData}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading inventory...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No items found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Item</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Category</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">Stock</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">Value</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Status</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-500 font-mono">{item.item_code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-bold text-gray-800">
                              {item.current_stock.toLocaleString('en-IN')} {item.unit}
                            </p>
                            <p className="text-xs text-gray-500">
                              Min: {item.min_stock} | Max: {item.max_stock}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-medium text-gray-800">{formatCurrency(item.stock_value)}</p>
                            <p className="text-xs text-gray-500">@₹{item.avg_price}/{item.unit}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <Link
                                href={`/inventory/stock-in?item=${item.id}`}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Stock In"
                              >
                                <PlusIcon className="w-5 h-5" />
                              </Link>
                              <Link
                                href={`/inventory/stock-out?item=${item.id}`}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                                title="Stock Out"
                              >
                                <MinusIcon className="w-5 h-5" />
                              </Link>
                              <Link
                                href={`/inventory/items/${item.id}`}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions & Alerts - 1 column */}
          <div className="space-y-6">
            {/* Low Stock Alerts */}
            {(stats.lowStock > 0 || stats.outOfStock > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  Stock Alerts
                </h2>
                <div className="space-y-3">
                  {stockItems
                    .filter(item => item.status === 'out_of_stock' || item.status === 'low_stock')
                    .slice(0, 5)
                    .map(item => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg ${
                          item.status === 'out_of_stock' ? 'bg-red-50' : 'bg-yellow-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              Stock: {item.current_stock} {item.unit}
                            </p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        <Link
                          href={`/inventory/stock-in?item=${item.id}`}
                          className="text-sm text-indigo-600 hover:underline mt-2 inline-block"
                        >
                          + Add Stock
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold text-gray-800">Recent Transactions</h2>
                <Link href="/inventory/reports" className="text-indigo-600 text-sm hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {recentTransactions.map(txn => (
                  <div key={txn.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      txn.type === 'in' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {txn.type === 'in' ? (
                        <PlusIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <MinusIcon className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{txn.item_name}</p>
                      <p className={`text-sm font-bold ${txn.type === 'in' ? 'text-green-600' : 'text-orange-600'}`}>
                        {txn.type === 'in' ? '+' : '-'}{txn.quantity} {txn.unit}
                      </p>
                      <p className="text-xs text-gray-500">{txn.reference}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(txn.date)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/inventory/items"
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-800">Manage Items</span>
                </Link>
                <Link
                  href="/inventory/categories"
                  className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100"
                >
                  <TagIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-800">Manage Categories</span>
                </Link>
                <Link
                  href="/inventory/reports"
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 text-green-600" />
                  <span className="text-gray-800">Stock Reports</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}