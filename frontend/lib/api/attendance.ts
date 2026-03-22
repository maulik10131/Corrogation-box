const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    totalCount: number;
    pageCount: number;
    currentPage: number;
    perPage: number;
  };
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Types
export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: number;
}

export interface Attendance {
  id: number;
  user_id: number;
  user_name: string;
  user_department: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  status_label: string;
  leave_type: string | null;
  overtime_hours: number;
  working_hours: number;
  is_late: boolean;
  notes: string | null;
}

export interface AttendanceFilters {
  user_id?: number;
  date?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  department?: string;
  month?: number;
  year?: number;
  page?: number;
}

export interface TodaySummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
}

export interface MonthlyReportUser {
  user_id: number;
  user_name: string;
  department: string;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
  holiday: number;
  overtime_hours: number;
  total_working_hours: number;
  attendance_percentage: number;
  daily_records: Array<{
    date: string;
    day: string;
    is_sunday: boolean;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    working_hours: number;
  }>;
}

// API Functions
export const getAttendanceList = (filters: AttendanceFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return fetchApi<Attendance[]>(`/attendance?${params.toString()}`);
};

export const getAttendance = (id: number) => 
  fetchApi<Attendance>(`/attendance/${id}`);

export const createAttendance = (data: Partial<Attendance>) =>
  fetchApi<Attendance>('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAttendance = (id: number, data: Partial<Attendance>) =>
  fetchApi<Attendance>(`/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteAttendance = (id: number) =>
  fetchApi<void>(`/attendance/${id}`, { method: 'DELETE' });

export const markAttendance = (data: {
  user_id: number;
  date?: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  leave_type?: string;
  overtime_hours?: number;
  notes?: string;
}) =>
  fetchApi<Attendance>('/attendance/mark', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const bulkMarkAttendance = (date: string, attendances: Array<{
  user_id: number;
  status: string;
  check_in?: string;
  check_out?: string;
  notes?: string;
}>) =>
  fetchApi<{ success_count: number; failed_count: number }>('/attendance/bulk-mark', {
    method: 'POST',
    body: JSON.stringify({ date, attendances }),
  });

export const checkIn = (user_id: number) =>
  fetchApi<Attendance>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ user_id }),
  });

export const checkOut = (user_id: number) =>
  fetchApi<Attendance>('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify({ user_id }),
  });

export const getTodayAttendance = (date?: string) =>
  fetchApi<{
    summary: TodaySummary;
    attendances: Attendance[];
    unmarked_users: User[];
  }>(`/attendance/today${date ? `?date=${date}` : ''}`);

export const getMonthlyReport = (month: number, year: number, filters?: {
  department?: string;
  user_id?: number;
}) => {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (filters?.department) params.append('department', filters.department);
  if (filters?.user_id) params.append('user_id', String(filters.user_id));
  
  return fetchApi<{
    month: number;
    year: number;
    days_in_month: number;
    working_days: number;
    report: MonthlyReportUser[];
  }>(`/attendance/monthly-report?${params.toString()}`);
};

export const getUserAttendanceHistory = (
  userId: number,
  fromDate?: string,
  toDate?: string
) => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  
  return fetchApi<{
    user: User;
    from_date: string;
    to_date: string;
    summary: {
      present: number;
      absent: number;
      late: number;
      half_day: number;
      leave: number;
      total_overtime: number;
      total_working_hours: number;
    };
    records: Attendance[];
  }>(`/attendance/user-history/${userId}?${params.toString()}`);
};

export const getStatusOptions = () =>
  fetchApi<{
    statuses: Record<string, string>;
    leave_types: Record<string, string>;
  }>('/attendance/status-options');

// Users
export const getUsers = () => fetchApi<User[]>('/users');