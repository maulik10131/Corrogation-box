'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLoader from '@/components/PageLoader';
import {
  TagIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  CubeIcon,
  SwatchIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Category {
  id: number;
  name: string;
  code: string;
  description: string;
  parent_id: number | null;
  parent_name?: string;
  color: string;
  icon: string;
  items_count: number;
  status: number;
  created_at: string;
}

const initialCategory: Omit<Category, 'id' | 'created_at' | 'items_count' | 'parent_name'> = {
  name: '',
  code: '',
  description: '',
  parent_id: null,
  color: '#3b82f6',
  icon: 'cube',
  status: 1,
};

// Color options
const colorOptions = [
  { value: '#3b82f6', name: 'Blue' },
  { value: '#22c55e', name: 'Green' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#ef4444', name: 'Red' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#f97316', name: 'Orange' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#84cc16', name: 'Lime' },
  { value: '#64748b', name: 'Slate' },
];

// Icon options
const iconOptions = [
  { value: 'cube', name: 'Cube', icon: CubeIcon },
  { value: 'folder', name: 'Folder', icon: FolderIcon },
  { value: 'tag', name: 'Tag', icon: TagIcon },
  { value: 'swatch', name: 'Swatch', icon: SwatchIcon },
];

// ============ COMPONENT ============
export default function CategoriesPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Omit<Category, 'id' | 'created_at' | 'items_count' | 'parent_name'>>(initialCategory);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============ AUTH CHECK ============
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      if (!token) {
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
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventory-categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
    setLoading(false);
  };

  // ============ HANDLERS ============
  const handleAdd = () => {
    setEditingCategory(null);
    const nextCode = generateCategoryCode();
    setFormData({ ...initialCategory, code: nextCode });
    setErrors({});
    setShowModal(true);
  };

  const generateCategoryCode = () => {
    const existingCodes = categories.map(c => c.code);
    let counter = categories.filter(c => !c.parent_id).length + 1;
    let newCode = `CAT${String(counter).padStart(2, '0')}`;
    
    while (existingCodes.includes(newCode)) {
      counter++;
      newCode = `CAT${String(counter).padStart(2, '0')}`;
    }
    
    return newCode;
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description,
      parent_id: category.parent_id,
      color: category.color,
      icon: category.icon,
      status: category.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = (category: Category) => {
    // Check if category has items
    if (category.items_count > 0) {
      (window as any).appAlert(`Cannot delete category "${category.name}" because it has ${category.items_count} items. Move or delete items first.`);
      return;
    }

    // Check if category has sub-categories
    const hasChildren = categories.some(c => c.parent_id === category.id);
    if (hasChildren) {
      (window as any).appAlert(`Cannot delete category "${category.name}" because it has sub-categories. Delete sub-categories first.`);
      return;
    }

    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`${API_URL}/inventory-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete category');
      }

      await loadCategories();
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } catch (error) {
      (window as any).appAlert('Error deleting category');
    }

    setDeleting(false);
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate code based on parent
    if (field === 'parent_id' && value) {
      const parent = categories.find(c => c.id === Number(value));
      if (parent) {
        const childCount = categories.filter(c => c.parent_id === Number(value)).length + 1;
        setFormData(prev => ({
          ...prev,
          code: `${parent.code}-${String(childCount).padStart(2, '0')}`,
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Category code is required';
    } else {
      const codeExists = categories.some(
        c => c.code.toLowerCase() === formData.code.toLowerCase() && c.id !== editingCategory?.id
      );
      if (codeExists) {
        newErrors.code = 'Category code already exists';
      }
    }

    // Prevent circular reference
    if (formData.parent_id && editingCategory) {
      if (formData.parent_id === editingCategory.id) {
        newErrors.parent_id = 'Category cannot be its own parent';
      }
      // Check if selected parent is a child of current category
      const isChildOf = (parentId: number, categoryId: number): boolean => {
        const parent = categories.find(c => c.id === parentId);
        if (!parent) return false;
        if (parent.parent_id === categoryId) return true;
        if (parent.parent_id) return isChildOf(parent.parent_id, categoryId);
        return false;
      };
      if (isChildOf(formData.parent_id, editingCategory.id)) {
        newErrors.parent_id = 'Cannot set a child category as parent';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const url = editingCategory
        ? `${API_URL}/inventory-categories/${editingCategory.id}`
        : `${API_URL}/inventory-categories`;
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save category');
      }

      await loadCategories();
      (window as any).appAlert(editingCategory ? 'Category updated successfully!' : 'Category added successfully!');

      setShowModal(false);
      setFormData(initialCategory);
      setEditingCategory(null);
    } catch (error) {
      (window as any).appAlert('Error saving category');
    }

    setSaving(false);
  };

  const handleToggleStatus = async (category: Category) => {
    const newStatus = category.status === 1 ? 0 : 1;
    try {
      const response = await fetch(`${API_URL}/inventory-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...category, status: newStatus }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      await loadCategories();
    } catch (error) {
      (window as any).appAlert('Error updating category status');
    }
  };

  // ============ FILTERING ============
  const filteredCategories = categories.filter(category => {
    const matchesSearch =
      category.name.toLowerCase().includes(search.toLowerCase()) ||
      category.code.toLowerCase().includes(search.toLowerCase()) ||
      category.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.status === 1) ||
      (statusFilter === 'inactive' && category.status === 0);

    return matchesSearch && matchesStatus;
  });

  // Get parent categories (for dropdown)
  const parentCategories = categories.filter(c => c.parent_id === null && c.id !== editingCategory?.id);

  // Group categories by parent
  const groupedCategories = filteredCategories.reduce((acc, category) => {
    if (category.parent_id === null) {
      if (!acc[category.id]) {
        acc[category.id] = { parent: category, children: [] };
      } else {
        acc[category.id].parent = category;
      }
    } else {
      if (!acc[category.parent_id]) {
        acc[category.parent_id] = { parent: null, children: [category] };
      } else {
        acc[category.parent_id].children.push(category);
      }
    }
    return acc;
  }, {} as Record<number, { parent: Category | null; children: Category[] }>);

  // ============ STATS ============
  const stats = {
    total: categories.length,
    parent: categories.filter(c => c.parent_id === null).length,
    sub: categories.filter(c => c.parent_id !== null).length,
    active: categories.filter(c => c.status === 1).length,
    inactive: categories.filter(c => c.status === 0).length,
    totalItems: categories.reduce((sum, c) => sum + c.items_count, 0),
  };

  // ============ HELPERS ============
  const getIconComponent = (iconName: string) => {
    const icon = iconOptions.find(i => i.value === iconName);
    return icon ? icon.icon : CubeIcon;
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

  if (loading) return <PageLoader title="Loading Categories" subtitle="Fetching inventory categories..." />;

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
                <TagIcon className="w-8 h-8 text-purple-600" />
                Category Management
              </h1>
              <p className="text-gray-500">Organize inventory items into categories</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Categories</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <TagIcon className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Parent</p>
                <p className="text-3xl font-bold mt-1">{stats.parent}</p>
              </div>
              <FolderIcon className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Sub-Categories</p>
                <p className="text-3xl font-bold mt-1">{stats.sub}</p>
              </div>
              <SwatchIcon className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Active</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
              </div>
              <CheckIcon className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Inactive</p>
                <p className="text-3xl font-bold mt-1">{stats.inactive}</p>
              </div>
              <XMarkIcon className="w-9 h-9 opacity-25" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Total Items</p>
                <p className="text-3xl font-bold mt-1">{stats.totalItems}</p>
              </div>
              <CubeIcon className="w-9 h-9 opacity-25" />
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
                  placeholder="Search categories..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadCategories}
              className="p-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <TagIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No categories found</p>
            {search || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="mt-4 text-purple-600 hover:underline"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={handleAdd}
                className="mt-4 text-purple-600 hover:underline"
              >
                + Add first category
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(groupedCategories)
              .filter(group => group.parent)
              .map(({ parent, children }) => (
                <div key={parent!.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Parent Category */}
                  <div
                    className="p-4 border-b"
                    style={{ borderLeftWidth: '4px', borderLeftColor: parent!.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${parent!.color}20` }}
                        >
                          {(() => {
                            const IconComponent = getIconComponent(parent!.icon);
                            return <IconComponent className="w-5 h-5" style={{ color: parent!.color }} />;
                          })()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{parent!.name}</h3>
                          <p className="text-xs text-gray-500 font-mono">{parent!.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(parent!)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            parent!.status === 1
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {parent!.status === 1 ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                    {parent!.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{parent!.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-gray-500">
                        <CubeIcon className="w-4 h-4 inline mr-1" />
                        {parent!.items_count} items
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(parent!)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(parent!)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub Categories */}
                  {children.length > 0 && (
                    <div className="bg-gray-50">
                      {children.map(child => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: child.color }}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-700 text-sm">{child.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{child.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{child.items_count} items</span>
                            <button
                              onClick={() => handleEdit(child)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(child)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Sub-Category Button */}
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setFormData({
                        ...initialCategory,
                        parent_id: parent!.id,
                        code: `${parent!.code}-${String(children.length + 1).padStart(2, '0')}`,
                      });
                      setErrors({});
                      setShowModal(true);
                    }}
                    className="w-full p-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Sub-Category
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredCategories.length > 0 && (
          <div className="mt-6 text-sm text-gray-500 text-center">
            Showing {filteredCategories.length} of {categories.length} categories
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <h3 className="text-xl font-bold">
                {editingCategory ? '✏️ Edit Category' : '➕ Add Category'}
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
              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Raw Material"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-purple-500'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                    placeholder="RM"
                    className={`w-full border-2 rounded-lg px-3 py-2 font-mono focus:outline-none ${
                      errors.code ? 'border-red-500' : 'border-gray-200 focus:border-purple-500'
                    }`}
                  />
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                </div>
              </div>

              {/* Parent Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => handleChange('parent_id', e.target.value ? Number(e.target.value) : null)}
                  className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                    errors.parent_id ? 'border-red-500' : 'border-gray-200 focus:border-purple-500'
                  }`}
                >
                  <option value="">None (Root Category)</option>
                  {parentCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
                {errors.parent_id && <p className="text-red-500 text-sm mt-1">{errors.parent_id}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={2}
                  placeholder="Category description..."
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChange('color', color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                        formData.color === color.value
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => {
                    const IconComponent = icon.icon;
                    return (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => handleChange('icon', icon.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.icon === icon.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={icon.name}
                      >
                        <IconComponent
                          className="w-5 h-5"
                          style={{ color: formData.color }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${formData.color}20` }}
                  >
                    {(() => {
                      const IconComponent = getIconComponent(formData.icon);
                      return <IconComponent className="w-6 h-6" style={{ color: formData.color }} />;
                    })()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{formData.name || 'Category Name'}</p>
                    <p className="text-sm text-gray-500 font-mono">{formData.code || 'CODE'}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 1}
                      onChange={() => handleChange('status', 1)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-green-600 font-medium">✓ Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 0}
                      onChange={() => handleChange('status', 0)}
                      className="w-4 h-4 text-purple-600"
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
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    {editingCategory ? 'Update' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Category?</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{categoryToDelete.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-1">Code: {categoryToDelete.code}</p>
              <p className="text-sm text-red-500 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCategoryToDelete(null);
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