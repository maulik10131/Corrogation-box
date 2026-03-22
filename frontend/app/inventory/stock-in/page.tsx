'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface Item {
  id: number;
  item_code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  last_purchase_price: number;
}

interface StockInEntry {
  item_id: number;
  item_name: string;
  item_code: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  batch_no: string;
  expiry_date: string;
  remarks: string;
}

// ============ COMPONENT ============
export default function StockInPage() {
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
    supplier: '',
    invoice_no: '',
    invoice_date: '',
    remarks: '',
  });

  const [entries, setEntries] = useState<StockInEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<StockInEntry>>({
    quantity: 0,
    rate: 0,
    batch_no: '',
    expiry_date: '',
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
      const loadedItems: Item[] = data.success
        ? (data.data || []).map((item: any) => ({
            id: item.id,
            item_code: item.item_code,
            name: item.name,
            category: item.category,
            unit: item.unit,
            current_stock: Number(item.current_stock || 0),
            last_purchase_price: Number(item.avg_price || 0),
          }))
        : [];

      setItems(loadedItems);
      if (preselectedItem) {
        const item = loadedItems.find(i => i.id === Number(preselectedItem));
        if (item) {
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
      reference_no: `GRN-${year}${month}-${random}`,
    }));
  };

  // ============ HANDLERS ============
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectItem = (item: Item) => {
    setCurrentEntry({
      item_id: item.id,
      item_name: item.name,
      item_code: item.item_code,
      unit: item.unit,
      quantity: 0,
      rate: item.last_purchase_price,
      amount: 0,
      batch_no: '',
      expiry_date: '',
      remarks: '',
    });
    setShowItemSearch(false);
    setItemSearch('');
  };

  const handleEntryChange = (field: keyof StockInEntry, value: any) => {
    setCurrentEntry(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
      }
      return updated;
    });
  };

  const handleAddEntry = () => {
    if (!currentEntry.item_id || !currentEntry.quantity || currentEntry.quantity <= 0) {
      (window as any).appAlert('Please select an item and enter valid quantity');
      return;
    }

    const newEntry: StockInEntry = {
      item_id: currentEntry.item_id!,
      item_name: currentEntry.item_name!,
      item_code: currentEntry.item_code!,
      unit: currentEntry.unit!,
      quantity: Number(currentEntry.quantity),
      rate: Number(currentEntry.rate) || 0,
      amount: Number(currentEntry.amount) || 0,
      batch_no: currentEntry.batch_no || '',
      expiry_date: currentEntry.expiry_date || '',
      remarks: currentEntry.remarks || '',
    };

    setEntries(prev => [...prev, newEntry]);
    setCurrentEntry({
      quantity: 0,
      rate: 0,
      batch_no: '',
      expiry_date: '',
      remarks: '',
    });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (entries.length === 0) {
      (window as any).appAlert('Please add at least one item');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        entries,
        total_items: totals.items,
        total_quantity: totals.quantity,
        total_amount: totals.amount,
      };

      const response = await fetch(`${API_URL}/inventory/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        (window as any).appAlert('Stock received successfully!');
        router.push('/inventory');
      } else {
        (window as any).appAlert('Error: ' + (data.message || 'Failed to save stock in entry'));
      }
    } catch (error) {
      (window as any).appAlert('Error saving stock in entry');
    }

    setSaving(false);
  };

  // ============ CALCULATIONS ============
  const totals = {
    items: entries.length,
    quantity: entries.reduce((sum, e) => sum + e.quantity, 0),
    amount: entries.reduce((sum, e) => sum + e.amount, 0),
  };

  // Filter items for search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.item_code.toLowerCase().includes(itemSearch.toLowerCase())
  );

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
              <PlusCircleIcon className="w-8 h-8 text-green-600" />
              Stock In (GRN)
            </h1>
            <p className="text-gray-500">Receive stock from purchase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">📋 Receipt Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GRN Number
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
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => handleFormChange('supplier', e.target.value)}
                    placeholder="Supplier name"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice No
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_no}
                    onChange={(e) => handleFormChange('invoice_no', e.target.value)}
                    placeholder="Supplier invoice no"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleFormChange('invoice_date', e.target.value)}
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
              <h2 className="text-lg font-bold mb-4">📦 Add Items</h2>

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
                      <div className="p-4 text-gray-500 text-center">No items found</div>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.item_code} | {item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Stock: {item.current_stock} {item.unit}</p>
                            <p className="text-sm text-gray-500">Last: ₹{item.last_purchase_price}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Item Details */}
              {currentEntry.item_id && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        value={currentEntry.quantity || ''}
                        onChange={(e) => handleEntryChange('quantity', Number(e.target.value))}
                        min={0}
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
                      type="number"
                      value={currentEntry.rate || ''}
                      onChange={(e) => handleEntryChange('rate', Number(e.target.value))}
                      min={0}
                      step={0.01}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={(currentEntry.amount || 0).toLocaleString('en-IN')}
                      readOnly
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-bold text-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch No
                    </label>
                    <input
                      type="text"
                      value={currentEntry.batch_no || ''}
                      onChange={(e) => handleEntryChange('batch_no', e.target.value)}
                      placeholder="Optional"
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={handleAddEntry}
                disabled={!currentEntry.item_id || !currentEntry.quantity}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Add to List
              </button>
            </div>

            {/* Entries List */}
            {entries.length > 0 && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="text-lg font-bold">📝 Items to Receive ({entries.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Qty</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
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
                          <td className="px-4 py-3 text-right font-medium">
                            {entry.quantity} {entry.unit}
                          </td>
                          <td className="px-4 py-3 text-right">₹{entry.rate}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            ₹{entry.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveEntry(index)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right">Total:</td>
                        <td className="px-4 py-3 text-right">{totals.quantity}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right text-green-600">
                          ₹{totals.amount.toLocaleString('en-IN')}
                        </td>
                        <td></td>
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
              <h2 className="text-lg font-bold mb-4">📊 Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-bold text-xl">{totals.items}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Quantity</span>
                  <span className="font-bold text-xl">{totals.quantity}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-xl text-green-600">
                    ₹{totals.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={saving || entries.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Save Stock In
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}