'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MinusCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Item {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  avg_price: number;
}

interface StockOutEntry {
  item_id: number;
  item_name: string;
  item_code: string;
  unit: string;
  available_stock: number;
  quantity: number;
  rate: number;
  amount: number;
  purpose: string;
  remarks: string;
}

const purposes = [
  'Production',
  'Job Work',
  'Sample',
  'Damaged',
  'Expired',
  'Internal Use',
  'Return to Supplier',
  'Other',
];

const departments = [
  'Production',
  'Finishing',
  'Dispatch',
  'Office',
  'Maintenance',
];

// ============ COMPONENT ============
export default function StockOutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItem = searchParams.get('item');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_no: '',
    issued_to: '',
    job_no: '',
    department: '',
    remarks: '',
  });

  const [entries, setEntries] = useState<StockOutEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<StockOutEntry>>({
    quantity: 0,
    purpose: 'Production',
    remarks: '',
  });

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
      loadItems();
      generateReferenceNo();
    }
  }, [isAuthenticated]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventory-items`);
      const data = await response.json();
      const loadedItems: Item[] = data.success ? (data.data || []) : [];
      setItems(loadedItems);

      if (preselectedItem) {
        const item = loadedItems.find(i => i.id === Number(preselectedItem));
        if (item && item.current_stock > 0) {
          handleSelectItem(item);
        }
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      setItems([]);
    }
    setLoading(false);
  };

  const generateReferenceNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      reference_no: `ISS-${year}${month}-${random}`,
    }));
  };

  // ============ HANDLERS ============
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectItem = (item: Item) => {
    if (item.current_stock <= 0) {
      (window as any).appAlert('This item is out of stock!');
      return;
    }

    setCurrentEntry({
      item_id: item.id,
      item_name: item.name,
      item_code: item.item_code,
      unit: item.unit,
      available_stock: item.current_stock,
      quantity: 0,
      rate: item.avg_price,
      amount: 0,
      purpose: 'Production',
      remarks: '',
    });
    setShowItemSearch(false);
    setItemSearch('');
  };

  const handleEntryChange = (field: keyof StockOutEntry, value: any) => {
    setCurrentEntry(prev => {
      const updated = { ...prev, [field]: value };

      // Validate quantity doesn't exceed available stock
      if (field === 'quantity') {
        const qty = Number(value) || 0;
        if (qty > (prev.available_stock || 0)) {
          (window as any).appAlert(`Cannot exceed available stock (${prev.available_stock} ${prev.unit})`);
          return prev;
        }
        updated.amount = qty * (Number(prev.rate) || 0);
      }

      return updated;
    });
  };

  const handleAddEntry = () => {
    if (!currentEntry.item_id) {
      (window as any).appAlert('Please select an item');
      return;
    }

    if (!currentEntry.quantity || currentEntry.quantity <= 0) {
      (window as any).appAlert('Please enter valid quantity');
      return;
    }

    if (currentEntry.quantity > (currentEntry.available_stock || 0)) {
      (window as any).appAlert('Quantity exceeds available stock');
      return;
    }

    // Check if item already added
    const existingIndex = entries.findIndex(e => e.item_id === currentEntry.item_id);
    if (existingIndex >= 0) {
      // Update existing entry
      const newQty = entries[existingIndex].quantity + currentEntry.quantity;
      if (newQty > (currentEntry.available_stock || 0)) {
        (window as any).appAlert('Total quantity exceeds available stock');
        return;
      }

      setEntries(prev =>
        prev.map((e, i) =>
          i === existingIndex
            ? {
                ...e,
                quantity: newQty,
                amount: newQty * e.rate,
              }
            : e
        )
      );
    } else {
      // Add new entry
      const newEntry: StockOutEntry = {
        item_id: currentEntry.item_id!,
        item_name: currentEntry.item_name!,
        item_code: currentEntry.item_code!,
        unit: currentEntry.unit!,
        available_stock: currentEntry.available_stock!,
        quantity: Number(currentEntry.quantity),
        rate: Number(currentEntry.rate) || 0,
        amount: Number(currentEntry.amount) || 0,
        purpose: currentEntry.purpose || 'Production',
        remarks: currentEntry.remarks || '',
      };

      setEntries(prev => [...prev, newEntry]);
    }

    // Reset current entry
    setCurrentEntry({
      quantity: 0,
      purpose: 'Production',
      remarks: '',
    });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEntryQuantity = (index: number, newQuantity: number) => {
    const entry = entries[index];
    if (newQuantity > entry.available_stock) {
      (window as any).appAlert('Cannot exceed available stock');
      return;
    }
    if (newQuantity <= 0) {
      handleRemoveEntry(index);
      return;
    }

    setEntries(prev =>
      prev.map((e, i) =>
        i === index
          ? {
              ...e,
              quantity: newQuantity,
              amount: newQuantity * e.rate,
            }
          : e
      )
    );
  };

  const handleSave = async () => {
    if (entries.length === 0) {
      (window as any).appAlert('Please add at least one item');
      return;
    }

    if (!formData.department) {
      (window as any).appAlert('Please select department');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        entries: entries,
        total_items: totals.items,
        total_quantity: totals.quantity,
        total_amount: totals.amount,
      };

      const response = await fetch(`${API_URL}/inventory/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        (window as any).appAlert('Stock issued successfully!');
        router.push('/inventory');
      } else {
        (window as any).appAlert('Error: ' + (data.message || 'Failed to save'));
      }
    } catch (error) {
      console.error('Save error:', error);
      (window as any).appAlert('Error saving stock out');
    }

    setSaving(false);
  };

  // ============ CALCULATIONS ============
  const totals = {
    items: entries.length,
    quantity: entries.reduce((sum, e) => sum + e.quantity, 0),
    amount: entries.reduce((sum, e) => sum + e.amount, 0),
  };

  // Filter items for search (only items with stock)
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.item_code.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesSearch && item.current_stock > 0;
  });

  // ============ HELPERS ============
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/inventory" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MinusCircleIcon className="w-8 h-8 text-orange-600" />
              Stock Out (Issue)
            </h1>
            <p className="text-gray-500">Issue stock for production/consumption</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">📋 Issue Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={(e) => handleFormChange('reference_no', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleFormChange('department', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issued To
                  </label>
                  <input
                    type="text"
                    value={formData.issued_to}
                    onChange={(e) => handleFormChange('issued_to', e.target.value)}
                    placeholder="Person name"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job / Order No
                  </label>
                  <input
                    type="text"
                    value={formData.job_no}
                    onChange={(e) => handleFormChange('job_no', e.target.value)}
                    placeholder="JOB-XXXX"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => handleFormChange('remarks', e.target.value)}
                    placeholder="Any remarks..."
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Add Item */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">📦 Issue Items</h2>

              {/* Item Search */}
              <div className="relative mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Item <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={currentEntry.item_name || itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemSearch(true);
                      if (currentEntry.item_id) {
                        setCurrentEntry({ quantity: 0, purpose: 'Production', remarks: '' });
                      }
                    }}
                    onFocus={() => setShowItemSearch(true)}
                    placeholder="Search item by name or code..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Item Dropdown */}
                {showItemSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">
                        {itemSearch ? 'No items found' : 'No items with stock available'}
                      </div>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="w-full px-4 py-3 text-left hover:bg-orange-50 flex justify-between items-center border-b last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.item_code} | {item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${item.current_stock <= 50 ? 'text-orange-600' : 'text-green-600'}`}>
                              Stock: {item.current_stock} {item.unit}
                            </p>
                            <p className="text-sm text-gray-500">@₹{item.avg_price}/{item.unit}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Item Details */}
              {currentEntry.item_id && (
                <>
                  {/* Stock Warning */}
                  {currentEntry.available_stock && currentEntry.available_stock <= 100 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-700 text-sm">
                        Low stock warning: Only {currentEntry.available_stock} {currentEntry.unit} available
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Stock
                      </label>
                      <input
                        type="text"
                        value={`${currentEntry.available_stock} ${currentEntry.unit}`}
                        readOnly
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-green-50 text-green-700 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Quantity <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <input
                          type="number"
                          value={currentEntry.quantity || ''}
                          onChange={(e) => handleEntryChange('quantity', Number(e.target.value))}
                          min={0}
                          max={currentEntry.available_stock}
                          placeholder="0"
                          className="w-full border-2 border-gray-200 rounded-l-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="inline-flex items-center px-3 bg-gray-100 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-500">
                          {currentEntry.unit}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="text"
                        value={currentEntry.rate || 0}
                        readOnly
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(currentEntry.amount || 0)}
                        readOnly
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-bold text-orange-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purpose
                      </label>
                      <select
                        value={currentEntry.purpose || 'Production'}
                        onChange={(e) => handleEntryChange('purpose', e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                      >
                        {purposes.map(purpose => (
                          <option key={purpose} value={purpose}>{purpose}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Remarks
                      </label>
                      <input
                        type="text"
                        value={currentEntry.remarks || ''}
                        onChange={(e) => handleEntryChange('remarks', e.target.value)}
                        placeholder="Optional remarks..."
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Add Button */}
              <button
                onClick={handleAddEntry}
                disabled={!currentEntry.item_id || !currentEntry.quantity || currentEntry.quantity <= 0}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MinusCircleIcon className="w-5 h-5" />
                Add to Issue List
              </button>
            </div>

            {/* Entries List */}
            {entries.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b bg-orange-50">
                  <h2 className="text-lg font-bold text-orange-800">📝 Items to Issue ({entries.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Available</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Issue Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Purpose</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entries.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{entry.item_name}</p>
                            <p className="text-xs text-gray-500">{entry.item_code}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500">
                            {entry.available_stock} {entry.unit}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              value={entry.quantity}
                              onChange={(e) => handleUpdateEntryQuantity(index, Number(e.target.value))}
                              min={1}
                              max={entry.available_stock}
                              className="w-20 px-2 py-1 border rounded text-center font-medium"
                            />
                            <span className="ml-1 text-sm text-gray-500">{entry.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right">₹{entry.rate}</td>
                          <td className="px-4 py-3 text-right font-bold text-orange-600">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{entry.purpose}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveEntry(index)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-orange-50 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                        <td className="px-4 py-3 text-center">{totals.quantity}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {formatCurrency(totals.amount)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">📊 Issue Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-bold text-xl">{totals.items}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Quantity</span>
                  <span className="font-bold text-xl">{totals.quantity}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-bold text-xl text-orange-600">
                    {formatCurrency(totals.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Issue Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">📋 Issue Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Issue No:</span>
                  <span className="font-mono font-medium">{formData.reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{formData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Department:</span>
                  <span className="font-medium">{formData.department || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Issued To:</span>
                  <span className="font-medium">{formData.issued_to || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Job No:</span>
                  <span className="font-medium">{formData.job_no || '-'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving || entries.length === 0 || !formData.department}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Issue Stock
                    </>
                  )}
                </button>
                <Link
                  href="/inventory"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </Link>
              </div>

              {entries.length === 0 && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Add items to enable save
                </p>
              )}

              {!formData.department && entries.length > 0 && (
                <p className="mt-4 text-sm text-orange-600 text-center">
                  ⚠️ Please select department
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-medium text-blue-800 mb-2">💡 Tips</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Issue quantity cannot exceed available stock</li>
                <li>• Select purpose for each item</li>
                <li>• Department is mandatory</li>
                <li>• Add Job No for production tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}