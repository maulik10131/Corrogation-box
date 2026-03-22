import { API_BASE_URL } from './config';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Dashboard
export const getDashboardStats = () => fetchApi('/dashboard/stats');

// Box Calculation
export const calculateBox = (params: any) =>
  fetchApi('/box/calculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });

// Inventory
export const getMaterials = () => fetchApi('/materials');
export const createMaterial = (data: any) =>
  fetchApi('/materials', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterial = (id: number, data: any) =>
  fetchApi(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Attendance
export const markAttendance = (data: any) =>
  fetchApi('/attendance/mark', { method: 'POST', body: JSON.stringify(data) });
export const getAttendanceReport = (month: number, year: number) =>
  fetchApi(`/attendance/report?month=${month}&year=${year}`);

// Orders
export const getOrders = () => fetchApi('/box-orders');
export const createOrder = (data: any) =>
  fetchApi('/box-orders', { method: 'POST', body: JSON.stringify(data) });
export const updateOrder = (id: number, data: any) =>
  fetchApi(`/box-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Customers
export const getCustomers = () => fetchApi('/customers');
export const createCustomer = (data: any) =>
  fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) });

// Users
export const getUsers = () => fetchApi('/users');