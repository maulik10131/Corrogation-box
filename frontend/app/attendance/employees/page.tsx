'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import {
  UserGroupIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Employee {
  id: number;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  joining_date: string;
  salary: number;
  status: number;
}

const initialEmployee: Omit<Employee, 'id'> = {
  name: '',
  employee_code: '',
  department: '',
  designation: '',
  phone: '',
  email: '',
  joining_date: new Date().toISOString().split('T')[0],
  salary: 0,
  status: 1,
};

const departments = ['Production', 'Finishing', 'Dispatch', 'Office', 'Maintenance'];
const designations = ['Manager', 'Supervisor', 'Operator', 'Helper', 'Driver', 'Accountant', 'Clerk'];

// ============ COMPONENT ============
export default function EmployeesPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>(initialEmployee);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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
      loadEmployees();
    }
  }, [isAuthenticated]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/employees`);
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data || []);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    }
    setLoading(false);
  };

  // ============ HANDLERS ============
  const handleAdd = () => {
    setEditingEmployee(null);
    const nextCode = `EMP${String(employees.length + 1).padStart(3, '0')}`;
    setFormData({
      ...initialEmployee,
      employee_code: nextCode,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      employee_code: employee.employee_code,
      department: employee.department,
      designation: employee.designation,
      phone: employee.phone,
      email: employee.email,
      joining_date: employee.joining_date,
      salary: employee.salary,
      status: employee.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const response = await fetch(`${API_URL}/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete employee');
      }
      await loadEmployees();
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      (window as any).appAlert('Error deleting employee');
    }
  };

  const handleChange = (field: keyof Omit<Employee, 'id'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.employee_code.trim()) {
      newErrors.employee_code = 'Employee code is required';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.designation) {
      newErrors.designation = 'Designation is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Enter valid 10-digit mobile number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter valid email address';
    }

    if (formData.salary <= 0) {
      newErrors.salary = 'Salary must be greater than 0';
    }

    if (!formData.joining_date) {
      newErrors.joining_date = 'Joining date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const url = editingEmployee
        ? `${API_URL}/employees/${editingEmployee.id}`
        : `${API_URL}/employees`;
      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save employee');
      }

      await loadEmployees();

      setShowModal(false);
      setFormData(initialEmployee);
      setEditingEmployee(null);
    } catch (error) {
      (window as any).appAlert('Error saving employee');
    }

    setSaving(false);
  };

  const handleToggleStatus = async (employee: Employee) => {
    const newStatus = employee.status === 1 ? 0 : 1;
    try {
      const response = await fetch(`${API_URL}/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...employee, status: newStatus }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      await loadEmployees();
    } catch (error) {
      (window as any).appAlert('Error updating employee status');
    }
  };

  // ============ FILTERING ============
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      employee.phone.includes(search);

    const matchesDepartment =
      !departmentFilter || employee.department === departmentFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && employee.status === 1) ||
      (statusFilter === 'inactive' && employee.status === 0);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // ============ STATS ============
  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 1).length,
    inactive: employees.filter(e => e.status === 0).length,
    totalSalary: employees.filter(e => e.status === 1).reduce((sum, e) => sum + e.salary, 0),
  };

  // ============ HELPERS ============
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExperience = (joiningDate: string) => {
    const joining = new Date(joiningDate);
    const today = new Date();
    const years = today.getFullYear() - joining.getFullYear();
    const months = today.getMonth() - joining.getMonth();
    
    if (years < 1) {
      const totalMonths = years * 12 + months;
      return `${totalMonths} months`;
    }
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  if (loading) return <PageLoader title="Loading Employees" subtitle="Fetching employee records..." />;

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
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
                Employees
              </h1>
              <p className="text-gray-500">Manage employee records</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Employee
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Inactive</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Monthly Salary</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSalary)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code, phone..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadEmployees}
              className="p-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No employees found</p>
              <button
                onClick={handleAdd}
                className="mt-4 text-blue-600 hover:underline"
              >
                + Add your first employee
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Department</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Joining</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Salary</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{employee.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{employee.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">{employee.department}</p>
                        <p className="text-sm text-gray-500">{employee.designation}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-800 flex items-center gap-1">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {employee.phone}
                        </p>
                        {employee.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                            {employee.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-800">{formatDate(employee.joining_date)}</p>
                        <p className="text-sm text-gray-500">{getExperience(employee.joining_date)}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-gray-800">{formatCurrency(employee.salary)}</p>
                        <p className="text-xs text-gray-500">per month</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            employee.status === 1
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {employee.status === 1 ? (
                            <>
                              <CheckIcon className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-xl font-bold">
                {editingEmployee ? '✏️ Edit Employee' : '➕ Add Employee'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter full name"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employee_code}
                    onChange={(e) => handleChange('employee_code', e.target.value.toUpperCase())}
                    placeholder="EMP001"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none font-mono ${
                      errors.employee_code ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.employee_code && <p className="text-red-500 text-sm mt-1">{errors.employee_code}</p>}
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.department ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => handleChange('designation', e.target.value)}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.designation ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Designation</option>
                    {designations.map(des => (
                      <option key={des} value={des}>{des}</option>
                    ))}
                  </select>
                  {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation}</p>}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-lg text-gray-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className={`w-full border-2 rounded-r-lg px-3 py-2 focus:outline-none ${
                        errors.phone ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="employee@company.com"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Salary & Joining Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => handleChange('salary', Number(e.target.value))}
                    placeholder="15000"
                    min={0}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.salary ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.salary && <p className="text-red-500 text-sm mt-1">{errors.salary}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => handleChange('joining_date', e.target.value)}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.joining_date ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.joining_date && <p className="text-red-500 text-sm mt-1">{errors.joining_date}</p>}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 1}
                      onChange={() => handleChange('status', 1)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-green-600 font-medium">✓ Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 0}
                      onChange={() => handleChange('status', 0)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-red-600 font-medium">✗ Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    {editingEmployee ? 'Update' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Employee?</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{employeeToDelete.name}</strong>?
              </p>
              <p className="text-sm text-red-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}