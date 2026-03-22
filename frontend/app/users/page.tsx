'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { UsersIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  department?: string;
  created_at?: string;
}

const roles = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700' },
  { value: 'manager', label: 'Manager', color: 'bg-purple-100 text-purple-700' },
  { value: 'supervisor', label: 'Supervisor', color: 'bg-blue-100 text-blue-700' },
  { value: 'operator', label: 'Operator', color: 'bg-green-100 text-green-700' },
  { value: 'staff', label: 'Staff', color: 'bg-gray-100 text-gray-700' },
];

export default function UsersPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const userStr = localStorage.getItem('pms_user');
      
      if (!token || !userStr) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        
        // Check if user is admin
        if (user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthChecking(false);
        fetchUsers();
      } catch {
        router.replace('/login');
      }
    }
  }, [router]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/corrugation-pms/backend/web';
      
      const url = `${API_BASE_URL}/api/users/list`;
      console.log('Fetching users from:', url);
      console.log('Token:', token ? `${token.substring(0, 10)}...` : 'No token');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const text = await response.text();
      console.log('Response text:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error('Invalid JSON response: ' + text.substring(0, 100));
      }
      
      console.log('Parsed response:', result);

      if (response.ok && result.success && result.data) {
        setUsers(result.data);
        console.log('Users loaded:', result.data.length);
      } else {
        const errorMsg = result.error || result.message || 'Failed to load users';
        console.error('Failed to fetch users:', errorMsg, result);
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    // Prevent changing own role
    if (currentUser && userId === currentUser.id) {
      setMessage({ type: 'error', text: 'You cannot change your own role' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setUpdating(userId);
    setMessage(null);

    try {
      const token = localStorage.getItem('pms_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/corrugation-pms/backend/web';
      
      const response = await fetch(`${API_BASE_URL}/api/users/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          role: newRole,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ type: 'success', text: 'Role updated successfully' });
        
        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update role' });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'Failed to update role' });
    } finally {
      setUpdating(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Users" subtitle="Fetching user accounts..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">User Management</h1>
                <p className="text-sm text-gray-500">Manage user roles and permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            ) : (
              <XCircleIcon className="w-6 h-6 text-red-600" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                      Current Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                      Change Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const roleInfo = roles.find(r => r.value === user.role);
                    const isCurrentUser = currentUser?.id === user.id;
                    
                    return (
                      <tr key={user.id} className={`hover:bg-indigo-50/40 transition-colors ${isCurrentUser ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-bold text-sm">
                                {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.full_name || user.username}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-indigo-600 font-semibold">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${roleInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                            {roleInfo?.label || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            disabled={isCurrentUser || updating === user.id}
                            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isCurrentUser 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                : 'bg-white text-gray-700 cursor-pointer border-indigo-200 focus:ring-indigo-200'
                            } ${updating === user.id ? 'opacity-50' : ''}`}
                          >
                            {roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="p-12 text-center">
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-800">Role Descriptions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.value} className="p-4 rounded-xl border border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-2 ${role.color}`}>
                  {role.label}
                </span>
                <p className="text-sm text-gray-600">
                  {role.value === 'admin' && 'Full system access including user management'}
                  {role.value === 'manager' && 'Access to reports, payments, and core operations'}
                  {role.value === 'supervisor' && 'Manage orders, customers, and attendance'}
                  {role.value === 'operator' && 'Handle work orders, dispatch, and calculations'}
                  {role.value === 'staff' && 'Basic access to inventory and assigned tasks'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
