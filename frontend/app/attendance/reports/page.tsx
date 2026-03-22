'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import {
  ChartBarIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
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
} from 'recharts';

// ============ TYPES ============
interface MonthlyReport {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department: string;
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  total_days: number;
  working_days: number;
  overtime_hours: number;
  attendance_percentage: number;
}

interface DailyTrend {
  date: string;
  present: number;
  absent: number;
  leave: number;
}

interface DepartmentStats {
  department: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

// ============ COMPONENT ============
export default function AttendanceReportsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'employee' | 'department'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);

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
  }, [selectedMonth, reportType, isAuthenticated]);

  const loadReportData = async () => {
    setLoading(true);

    try {
      const [year, month] = selectedMonth.split('-');
      const query = new URLSearchParams({
        year,
        month,
      });
      if (selectedDepartment) query.set('department', selectedDepartment);
      if (selectedEmployee) query.set('employee_id', selectedEmployee);

      const response = await fetch(`${API_URL}/employee-attendance/monthly-report?${query.toString()}`);
      const data = await response.json();

      const report = data.success ? (data.data?.report || []) : [];
      const trend = data.success ? (data.data?.daily_trend || []) : [];
      const deptStats = data.success ? (data.data?.department_stats || []) : [];

      setMonthlyData(report);
      setDailyTrend(trend);
      setDepartmentStats(deptStats);
    } catch (error) {
      console.error('Failed to load attendance report:', error);
      setMonthlyData([]);
      setDailyTrend([]);
      setDepartmentStats([]);
    }

    setLoading(false);
  };

  const handleExportCSV = () => {
    // Generate CSV
    const headers = ['Employee Code', 'Name', 'Department', 'Present', 'Absent', 'Half Day', 'Leave', 'OT Hours', 'Attendance %'];
    const rows = monthlyData.map(row => [
      row.employee_code,
      row.employee_name,
      row.department,
      row.present,
      row.absent,
      row.half_day,
      row.leave,
      row.overtime_hours,
      row.attendance_percentage + '%',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedMonth}.csv`;
    a.click();
  };

  // ============ STATS ============
  const overallStats = {
    totalPresent: monthlyData.reduce((sum, e) => sum + e.present, 0),
    totalAbsent: monthlyData.reduce((sum, e) => sum + e.absent, 0),
    totalLeave: monthlyData.reduce((sum, e) => sum + e.leave, 0),
    totalOT: monthlyData.reduce((sum, e) => sum + e.overtime_hours, 0),
    avgAttendance: monthlyData.length > 0
      ? (monthlyData.reduce((sum, e) => sum + e.attendance_percentage, 0) / monthlyData.length).toFixed(1)
      : 0,
  };

  const pieColors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

  const departments = [...new Set(monthlyData.map(e => e.department))];

  // Filter data
  const filteredData = monthlyData.filter(item => {
    if (selectedDepartment && item.department !== selectedDepartment) return false;
    if (selectedEmployee && item.employee_id !== Number(selectedEmployee)) return false;
    return true;
  });

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Report" subtitle="Fetching attendance data..." />;

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/attendance" className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
                Attendance Reports
              </h1>
              <p className="text-gray-500">Analyze attendance data and trends</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Employees</option>
                {monthlyData.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadReportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-6"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading report...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-sm text-gray-500">Total Present</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.totalPresent}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-sm text-gray-500">Total Absent</p>
                <p className="text-2xl font-bold text-red-600">{overallStats.totalAbsent}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-sm text-gray-500">Total Leave</p>
                <p className="text-2xl font-bold text-blue-600">{overallStats.totalLeave}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-sm text-gray-500">Overtime Hours</p>
                <p className="text-2xl font-bold text-purple-600">{overallStats.totalOT}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <p className="text-sm text-gray-500">Avg Attendance</p>
                <p className="text-2xl font-bold text-orange-600">{overallStats.avgAttendance}%</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Trend Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold mb-4">Daily Attendance Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                    <Line type="monotone" dataKey="leave" stroke="#3b82f6" strokeWidth={2} name="Leave" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Department Pie Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold mb-4">Department-wise Attendance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="department" type="category" width={100} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Report Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold">Employee-wise Report</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Department</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Present</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Absent</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Half Day</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Leave</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">OT Hours</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredData.map((row) => (
                      <tr key={row.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800">{row.employee_name}</p>
                            <p className="text-xs text-gray-500">{row.employee_code}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.department}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {row.present}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            {row.absent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            {row.half_day}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {row.leave}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {row.overtime_hours}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.attendance_percentage >= 90 ? 'bg-green-500' :
                                  row.attendance_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${row.attendance_percentage}%` }}
                              ></div>
                            </div>
                            <span className={`font-bold ${
                              row.attendance_percentage >= 90 ? 'text-green-600' :
                              row.attendance_percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {row.attendance_percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}