'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Employee {
  id: number;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  phone: string;
  status: number;
}

interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
  check_in?: string;
  check_out?: string;
  overtime_hours: number;
  notes: string;
}

interface DailyAttendance {
  employee: Employee;
  attendance: AttendanceRecord | null;
}

// ============ CONSTANTS ============
const statusOptions = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  { value: 'half_day', label: 'Half Day', color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
  { value: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-700', icon: CalendarDaysIcon },
  { value: 'holiday', label: 'Holiday', color: 'bg-purple-100 text-purple-700', icon: CalendarDaysIcon },
];

// ============ COMPONENT ============
export default function AttendancePage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('present');

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
      loadAttendanceData();
    }
  }, [selectedDate, isAuthenticated]);

  const loadAttendanceData = async () => {
    setLoading(true);

    try {
      const [employeesRes, attendanceRes] = await Promise.all([
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/employee-attendance?date=${selectedDate}`),
      ]);

      const employeesJson = await employeesRes.json();
      const attendanceJson = await attendanceRes.json();

      const employeeRows: Employee[] = (employeesJson.success ? (employeesJson.data || []) : [])
        .map((employee: any) => ({
          id: employee.id,
          name: employee.name,
          employee_code: employee.employee_code,
          department: employee.department,
          designation: employee.designation,
          phone: employee.phone,
          status: Number(employee.status || 0),
        }));

      const attendanceRows: AttendanceRecord[] = (attendanceJson.success ? (attendanceJson.data || []) : []).map((att: any) => ({
        id: att.id,
        employee_id: att.employee_id,
        date: att.date,
        status: att.status,
        check_in: att.check_in ? String(att.check_in).slice(0, 5) : undefined,
        check_out: att.check_out ? String(att.check_out).slice(0, 5) : undefined,
        overtime_hours: Number(att.overtime_hours || 0),
        notes: att.notes || '',
      }));

      const dailyData: DailyAttendance[] = employeeRows
        .filter(emp => emp.status === 1)
        .map(emp => ({
          employee: emp,
          attendance: attendanceRows.find(a => a.employee_id === emp.id) || null,
        }));

      setEmployees(employeeRows);
      setAttendanceData(dailyData);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setEmployees([]);
      setAttendanceData([]);
    }

    setLoading(false);
  };

  // ============ HANDLERS ============
  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleStatusChange = async (employeeId: number, newStatus: string) => {
    setAttendanceData(prev =>
      prev.map(item => {
        if (item.employee.id === employeeId) {
          return {
            ...item,
            attendance: {
              id: item.attendance?.id || Date.now(),
              employee_id: employeeId,
              date: selectedDate,
              status: newStatus as AttendanceRecord['status'],
              check_in: newStatus === 'present' ? '09:00' : undefined,
              check_out: newStatus === 'present' ? '18:00' : undefined,
              overtime_hours: 0,
              notes: '',
            },
          };
        }
        return item;
      })
    );
  };

  const handleTimeChange = (employeeId: number, field: 'check_in' | 'check_out', value: string) => {
    setAttendanceData(prev =>
      prev.map(item => {
        if (item.employee.id === employeeId && item.attendance) {
          return {
            ...item,
            attendance: {
              ...item.attendance,
              [field]: value,
            },
          };
        }
        return item;
      })
    );
  };

  const handleOvertimeChange = (employeeId: number, hours: number) => {
    setAttendanceData(prev =>
      prev.map(item => {
        if (item.employee.id === employeeId && item.attendance) {
          return {
            ...item,
            attendance: {
              ...item.attendance,
              overtime_hours: hours,
            },
          };
        }
        return item;
      })
    );
  };

  const handleNotesChange = (employeeId: number, notes: string) => {
    setAttendanceData(prev =>
      prev.map(item => {
        if (item.employee.id === employeeId && item.attendance) {
          return {
            ...item,
            attendance: {
              ...item.attendance,
              notes: notes,
            },
          };
        }
        return item;
      })
    );
  };

  const handleBulkMark = () => {
    setAttendanceData(prev =>
      prev.map(item => {
        if (!item.attendance) {
          return {
            ...item,
            attendance: {
              id: Date.now() + item.employee.id,
              employee_id: item.employee.id,
              date: selectedDate,
              status: bulkStatus as AttendanceRecord['status'],
              check_in: bulkStatus === 'present' ? '09:00' : undefined,
              check_out: bulkStatus === 'present' ? '18:00' : undefined,
              overtime_hours: 0,
              notes: '',
            },
          };
        }
        return item;
      })
    );
    setShowBulkModal(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      const entries = attendanceData
        .filter(item => item.attendance)
        .map(item => ({
          employee_id: item.employee.id,
          status: item.attendance?.status,
          check_in: item.attendance?.check_in ? `${item.attendance.check_in}:00` : null,
          check_out: item.attendance?.check_out ? `${item.attendance.check_out}:00` : null,
          overtime_hours: item.attendance?.overtime_hours || 0,
          notes: item.attendance?.notes || '',
        }));

      const response = await fetch(`${API_URL}/employee-attendance/bulk-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, entries }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save attendance');
      }
      (window as any).appAlert('Attendance saved successfully!');
      await loadAttendanceData();
    } catch (error) {
      (window as any).appAlert('Error saving attendance');
    }

    setSaving(false);
  };

  // ============ FILTERING ============
  const departments = [...new Set(employees.map(e => e.department))];

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      item.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      item.employee.employee_code.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      !departmentFilter || item.employee.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // ============ STATS ============
  const stats = {
    total: attendanceData.length,
    present: attendanceData.filter(a => a.attendance?.status === 'present').length,
    absent: attendanceData.filter(a => a.attendance?.status === 'absent' || !a.attendance).length,
    halfDay: attendanceData.filter(a => a.attendance?.status === 'half_day').length,
    leave: attendanceData.filter(a => a.attendance?.status === 'leave').length,
    notMarked: attendanceData.filter(a => !a.attendance).length,
  };

  // ============ HELPERS ============
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isFuture = new Date(selectedDate) > new Date();

  const getStatusBadge = (status: string | undefined) => {
    const option = statusOptions.find(s => s.value === status);
    if (!option) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
          Not Marked
        </span>
      );
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Attendance" subtitle="Fetching attendance records..." />;

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
                <p className="text-sm text-gray-500">Mark and manage daily attendance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/attendance/employees"
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <UserGroupIcon className="w-4 h-4" />
                Employees
              </Link>
              <Link
                href="/attendance/reports"
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Date Selector & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Date Selector */}
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-md p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div className="text-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-center font-bold text-lg border-none focus:outline-none bg-transparent text-white [color-scheme:dark]"
                />
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-sm text-white/80">
              {formatDate(selectedDate)}
            </p>
            {isToday && (
              <p className="text-center text-xs text-white font-semibold mt-1 opacity-90">Today</p>
            )}
            {isFuture && (
              <p className="text-center text-xs text-amber-300 font-medium mt-1 flex items-center justify-center gap-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Future Date
              </p>
            )}
          </div>

          {/* Stats */}
          {/* Stats - Present */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Present</p>
                <p className="text-3xl font-bold mt-1">{stats.present}</p>
              </div>
              <CheckCircleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>

          {/* Stats - Absent */}
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Absent</p>
                <p className="text-3xl font-bold mt-1">{stats.absent}</p>
              </div>
              <XCircleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>

          {/* Stats - Leave/HalfDay */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Leave / Half Day</p>
                <p className="text-3xl font-bold mt-1">{stats.leave + stats.halfDay}</p>
              </div>
              <ClockIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              </div>
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Bulk Mark */}
            {stats.notMarked > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-700 shadow-md transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Bulk Mark ({stats.notMarked})
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 shadow-md transition-all"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading attendance...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Department</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Check In</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">Check Out</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">OT (hrs)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredData.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-sm">
                              {item.employee.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.employee.name}</p>
                            <p className="text-xs text-gray-500">{item.employee.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{item.employee.department}</p>
                        <p className="text-xs text-gray-500">{item.employee.designation}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <select
                            value={item.attendance?.status || ''}
                            onChange={(e) => handleStatusChange(item.employee.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 focus:outline-none ${
                              item.attendance?.status === 'present' ? 'border-green-300 bg-green-50 text-green-700' :
                              item.attendance?.status === 'absent' ? 'border-red-300 bg-red-50 text-red-700' :
                              item.attendance?.status === 'half_day' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                              item.attendance?.status === 'leave' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                              'border-gray-300 bg-gray-50 text-gray-700'
                            }`}
                          >
                            <option value="">Select</option>
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={item.attendance?.check_in || ''}
                          onChange={(e) => handleTimeChange(item.employee.id, 'check_in', e.target.value)}
                          disabled={!item.attendance || item.attendance.status !== 'present' && item.attendance.status !== 'half_day'}
                          className="w-24 px-2 py-1 border rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={item.attendance?.check_out || ''}
                          onChange={(e) => handleTimeChange(item.employee.id, 'check_out', e.target.value)}
                          disabled={!item.attendance || item.attendance.status !== 'present' && item.attendance.status !== 'half_day'}
                          className="w-24 px-2 py-1 border rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.attendance?.overtime_hours || 0}
                          onChange={(e) => handleOvertimeChange(item.employee.id, Number(e.target.value))}
                          disabled={!item.attendance || item.attendance.status !== 'present'}
                          min={0}
                          max={8}
                          className="w-16 px-2 py-1 border rounded text-center disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.attendance?.notes || ''}
                          onChange={(e) => handleNotesChange(item.employee.id, e.target.value)}
                          placeholder="Add notes..."
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Present: {stats.present}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Absent: {stats.absent}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                Half Day: {stats.halfDay}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Leave: {stats.leave}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                Not Marked: {stats.notMarked}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Total Employees: <strong>{stats.total}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Mark Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Bulk Mark Attendance</h3>
            <p className="text-gray-600 mb-4">
              Mark all <strong>{stats.notMarked}</strong> unmarked employees as:
            </p>
            <div className="space-y-2 mb-6">
              {statusOptions.map(opt => (
                <label
                  key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 ${
                    bulkStatus === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkStatus"
                    value={opt.value}
                    checked={bulkStatus === opt.value}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${opt.color}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkMark}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-700 shadow-md"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}