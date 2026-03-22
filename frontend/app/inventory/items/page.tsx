'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import {
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Item {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  min_stock: number;
  max_stock: number;
  reorder_level: number;
  location: string;
  description: string;
  hsn_code: string;
  gst_percent: number;
  status: number;
  created_at: string;
}

const initialItem: Omit<Item, 'id' | 'created_at'> = {
  item_code: '',
  name: '',
  category: '',
  unit: 'KG',
  min_stock: 0,
  max_stock: 0,
  reorder_level: 0,
  location: '',
  description: '',
  hsn_code: '',
  gst_percent: 18,
  status: 1,
};

const categories = ['Raw Material', 'Consumable', 'Packing Material', 'Spare Parts', 'Finished Goods', 'Tools'];
const units = ['KG', 'GM', 'ROLL', 'PCS', 'MTR', 'LTR', 'BOX', 'SET', 'PAIR', 'NOS'];
const locations = ['Godown A', 'Godown B', 'Store Room', 'Production Floor', 'Office', 'Dispatch Area'];

// ============ COMPONENT ============
export default function ItemsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Omit<Item, 'id' | 'created_at'>>(initialItem);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      loadItems();
    }
  }, [isAuthenticated]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventory-items`);
      const data = await response.json();
      if (data.success) {
        setItems(data.data || []);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      setItems([]);
    }
    setLoading(false);
  };

  // ============ HANDLERS ============
  const handleAdd = () => {
    setEditingItem(null);
    const nextCode = generateItemCode();
    setFormData({ ...initialItem, item_code: nextCode });
    setErrors({});
    setShowModal(true);
  };

  const generateItemCode = () => {
    const existingCodes = items.map(i => i.item_code);
    let counter = items.length + 1;
    let newCode = `RM${String(counter).padStart(3, '0')}`;
    
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = `RM${String(counter).padStart(3, '0')}`;
    }
    
    return newCode;
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      reorder_level: item.reorder_level,
      location: item.location,
      description: item.description,
      hsn_code: item.hsn_code,
      gst_percent: item.gst_percent,
      status: item.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`${API_URL}/inventory-items/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete item');
      }

      await loadItems();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      (window as any).appAlert('Error deleting item');
    }

    setDeleting(false);
  };

  const handleChange = (field: keyof Omit<Item, 'id' | 'created_at'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_code.trim()) {
      newErrors.item_code = 'Item code is required';
    } else if (!editingItem && items.some(i => i.item_code === formData.item_code)) {
      newErrors.item_code = 'Item code already exists';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    if (formData.min_stock < 0) {
      newErrors.min_stock = 'Cannot be negative';
    }

    if (formData.max_stock < 0) {
      newErrors.max_stock = 'Cannot be negative';
    }

    if (formData.max_stock > 0 && formData.max_stock < formData.min_stock) {
      newErrors.max_stock = 'Must be greater than min stock';
    }

    if (formData.reorder_level < 0) {
      newErrors.reorder_level = 'Cannot be negative';
    }

    if (formData.gst_percent < 0 || formData.gst_percent > 100) {
      newErrors.gst_percent = 'Must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const url = editingItem
        ? `${API_URL}/inventory-items/${editingItem.id}`
        : `${API_URL}/inventory-items`;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save item');
      }

      await loadItems();
      (window as any).appAlert(editingItem ? 'Item updated successfully!' : 'Item added successfully!');

      setShowModal(false);
      setFormData(initialItem);
      setEditingItem(null);
    } catch (error) {
      (window as any).appAlert('Error saving item');
    }

    setSaving(false);
  };

  const handleToggleStatus = async (item: Item) => {
    const newStatus = item.status === 1 ? 0 : 1;
    try {
      const response = await fetch(`${API_URL}/inventory-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, status: newStatus }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      await loadItems();
    } catch (error) {
      (window as any).appAlert('Error updating item status');
    }
  };

  // ============ FILTERING ============
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || item.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.status === 1) ||
      (statusFilter === 'inactive' && item.status === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // ============ STATS ============
  const stats = {
    total: items.length,
    active: items.filter(i => i.status === 1).length,
    inactive: items.filter(i => i.status === 0).length,
    categories: [...new Set(items.map(i => i.category))].length,
  };

  // ============ HELPERS ============
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

  if (loading) return <PageLoader title="Loading Items" subtitle="Fetching inventory items..." />;

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
                <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
                Item Master
              </h1>
              <p className="text-gray-500">Manage inventory items</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Items</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <CubeIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Active</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
              </div>
              <CheckCircleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Inactive</p>
                <p className="text-3xl font-bold mt-1">{stats.inactive}</p>
              </div>
              <XCircleIcon className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Categories</p>
                <p className="text-3xl font-bold mt-1">{stats.categories}</p>
              </div>
              <TagIcon className="w-10 h-10 opacity-30" />
            </div>
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
                  placeholder="Search by name, code, description..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter */}
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
              onClick={loadItems}
              className="p-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No items found</p>
              {(search || categoryFilter || statusFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  + Add first item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Unit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Min</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Max</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Reorder</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Location</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">GST</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {item.item_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]" title={item.description}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-sm">{item.min_stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm">{item.max_stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm">{item.reorder_level.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm">{item.gst_percent}%</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            item.status === 1
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {item.status === 1 ? (
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
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
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
        {!loading && filteredItems.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredItems.length} of {items.length} items
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
                {editingItem ? '✏️ Edit Item' : '➕ Add New Item'}
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
                    Item Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.item_code}
                    onChange={(e) => handleChange('item_code', e.target.value.toUpperCase())}
                    placeholder="RM001"
                    className={`w-full border-2 rounded-lg px-3 py-2 font-mono focus:outline-none ${
                      errors.item_code ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.item_code && <p className="text-red-500 text-sm mt-1">{errors.item_code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Kraft Paper 18 BF"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.category ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Levels */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-3">📊 Stock Levels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => handleChange('min_stock', Number(e.target.value))}
                      min={0}
                      className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                        errors.min_stock ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.min_stock && <p className="text-red-500 text-sm mt-1">{errors.min_stock}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Stock
                    </label>
                    <input
                      type="number"
                      value={formData.max_stock}
                      onChange={(e) => handleChange('max_stock', Number(e.target.value))}
                      min={0}
                      className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                        errors.max_stock ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.max_stock && <p className="text-red-500 text-sm mt-1">{errors.max_stock}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => handleChange('reorder_level', Number(e.target.value))}
                      min={0}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Location & HSN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Location</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={formData.hsn_code}
                    onChange={(e) => handleChange('hsn_code', e.target.value)}
                    placeholder="4804"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* GST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Percentage (%)
                  </label>
                  <select
                    value={formData.gst_percent}
                    onChange={(e) => handleChange('gst_percent', Number(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  placeholder="Enter item description..."
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
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
                    {editingItem ? 'Update Item' : 'Save Item'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Item?</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Code: {itemToDelete.item_code}
              </p>
              <p className="text-sm text-red-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                disabled={deleting}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}