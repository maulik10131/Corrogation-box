'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardStats } from '@/lib/api';

import { 
  ClipboardDocumentListIcon, 
  CubeIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface DashboardData {
  orders: { total: number; pending: number; completed_today: number };
  inventory: { total_materials: number; low_stock_count: number };
  attendance: { present_today: number; absent_today: number };
  customers: { total: number };
  recent_orders: any[];
  low_stock_materials: any[];
}

export default function Dashboard() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
      loadDashboard();
    }
  }, [isAuthenticated]);

  const loadDashboard = async () => {
    const response = await getDashboardStats();
    if (response.success && response.data) {
      setData(response.data as DashboardData);
    }
    setLoading(false);
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold">{data?.orders.total || 0}</p>
              <p className="text-sm text-orange-500">{data?.orders.pending || 0} pending</p>
            </div>
            <ClipboardDocumentListIcon className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Materials</p>
              <p className="text-3xl font-bold">{data?.inventory.total_materials || 0}</p>
              <p className="text-sm text-red-500">{data?.inventory.low_stock_count || 0} low stock</p>
            </div>
            <CubeIcon className="w-12 h-12 text-green-500" />
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Attendance</p>
              <p className="text-3xl font-bold text-green-600">{data?.attendance.present_today || 0}</p>
              <p className="text-sm text-red-500">{data?.attendance.absent_today || 0} absent</p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-purple-500" />
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-3xl font-bold">{data?.customers.total || 0}</p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
          </div>
          <div className="p-4">
            {data?.recent_orders && data.recent_orders.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((order: any) => (
                    <tr key={order.id} className="border-t">
                      <td className="py-2">{order.order_number}</td>
                      <td className="py-2">{order.customer_name}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
          </div>
          <div className="p-4">
            {data?.low_stock_materials && data.low_stock_materials.length > 0 ? (
              <ul className="space-y-3">
                {data.low_stock_materials.map((material: any) => (
                  <li key={material.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{material.name}</p>
                      <p className="text-sm text-gray-500">{material.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-semibold">{material.current_stock} {material.unit}</p>
                      <p className="text-xs text-gray-400">Min: {material.min_stock_level}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-green-500 text-center py-4">✓ All materials are in stock</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}