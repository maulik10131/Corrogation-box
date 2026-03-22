'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  CalculatorIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Types
interface Customer {
  id: number;
  name: string;
  company_name: string;
  gst_number: string;
  billing_address: string;
  phone: string;
  email: string;
}

interface QuotationItem {
  id?: number;
  box_name: string;
  box_type: string;
  length: number;
  width: number;
  height: number;
  ply_count: number;
  flute_type: string;
  top_liner: number;
  top_liner_bf: number;
  fluting: number;
  bottom_liner: number;
  bottom_liner_bf: number;
  paper_rate: number;
  conversion_cost: number;
  printing_cost: number;
  die_cost: number;
  other_cost: number;
  margin_percent: number;
  ups: number;
  quantity: number;
  // Calculated
  deckle_size: number;
  cutting_size: number;
  sheet_area: number;
  box_weight: number;
  cost_per_box: number;
  selling_price: number;
  amount: number;
  notes: string;
}

interface Quotation {
  customer_id: number;
  quotation_date: string;
  valid_until: string;
  validity_days: number;
  discount_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  delivery_terms: string;
  payment_terms: string;
  notes: string;
  terms_conditions: string;
  items: QuotationItem[];
}

// Flute specifications
const fluteSpecs: Record<string, { height: number; takeUp: number }> = {
  'A': { height: 4.8, takeUp: 1.56 },
  'B': { height: 2.5, takeUp: 1.42 },
  'C': { height: 3.6, takeUp: 1.48 },
  'E': { height: 1.5, takeUp: 1.27 },
  'F': { height: 0.8, takeUp: 1.25 },
};

// Default empty item
const getEmptyItem = (): QuotationItem => ({
  box_name: '',
  box_type: 'RSC',
  length: 0,
  width: 0,
  height: 0,
  ply_count: 3,
  flute_type: 'B',
  top_liner: 150,
  top_liner_bf: 18,
  fluting: 120,
  bottom_liner: 150,
  bottom_liner_bf: 18,
  paper_rate: 42,
  conversion_cost: 2.5,
  printing_cost: 0,
  die_cost: 0,
  other_cost: 0,
  margin_percent: 15,
  ups: 1,
  quantity: 100,
  deckle_size: 0,
  cutting_size: 0,
  sheet_area: 0,
  box_weight: 0,
  cost_per_box: 0,
  selling_price: 0,
  amount: 0,
  notes: '',
});

// Default terms
const defaultTerms = `1. Prices are valid for 15 days from quotation date.
2. GST extra as applicable.
3. Delivery within 7-10 working days after order confirmation.
4. Payment: 50% advance, 50% before dispatch.
5. Freight extra / Ex-factory.
6. Rates are subject to change based on paper price fluctuation.`;

export default function CreateQuotationPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Quotation state
  const [quotation, setQuotation] = useState<Quotation>({
    customer_id: 0,
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    validity_days: 15,
    discount_percent: 0,
    cgst_percent: 9,
    sgst_percent: 9,
    igst_percent: 0,
    delivery_terms: 'Ex-Factory, Freight Extra',
    payment_terms: '50% Advance, 50% Before Dispatch',
    notes: '',
    terms_conditions: defaultTerms,
    items: [],
  });

  // Current item being edited
  const [currentItem, setCurrentItem] = useState<QuotationItem>(getEmptyItem());

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

  useEffect(() => {
    if (isAuthenticated) {
      loadCustomers();
      checkForBoxCalculation();
    }
  }, [isAuthenticated]);

  // Check if coming from box calculation
  const checkForBoxCalculation = () => {
    const savedCalc = sessionStorage.getItem('boxCalculation');
    if (savedCalc) {
      try {
        const data = JSON.parse(savedCalc);
        // Convert to quotation item
        const item: QuotationItem = {
          ...getEmptyItem(),
          length: data.formData?.length || 0,
          width: data.formData?.width || 0,
          height: data.formData?.height || 0,
          ply_count: data.formData?.ply_count || 3,
          flute_type: data.formData?.flute_type || 'B',
          quantity: data.formData?.quantity || 100,
          paper_rate: data.formData?.paper_rate || 42,
          margin_percent: data.formData?.margin_percent || 15,
        };
        calculateItem(item);
        setQuotation(prev => ({ ...prev, items: [item] }));
        sessionStorage.removeItem('boxCalculation');
      } catch (e) {
        console.error('Error parsing box calculation:', e);
      }
    }
  };

  // Load customers
  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      const customerRows = data.success ? (data.data || []) : [];

      setCustomers(
        customerRows.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name || customer.name,
          gst_number: customer.gst_number || '',
          billing_address: customer.billing_address || '',
          phone: customer.phone || customer.mobile || '',
          email: customer.email || '',
        }))
      );
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  };

  // Calculate item values
  const calculateItem = (item: QuotationItem): QuotationItem => {
    if (item.length <= 0 || item.width <= 0 || item.height <= 0) {
      return item;
    }

    const flute = fluteSpecs[item.flute_type] || fluteSpecs['B'];
    const takeUp = flute.takeUp;

    // Deckle and Cutting
    let deckle = item.length + item.width + 35;
    let cutting = (2 * item.length) + (2 * item.width) + 12;

    if (item.box_type === 'HSC') {
      cutting = (2 * item.length) + (2 * item.width) + item.height;
    } else if (item.box_type === 'FOL') {
      deckle = item.length + item.width + 55;
      cutting = (2 * item.length) + (2 * item.width) + (2 * item.width);
    }

    // Sheet area
    const sheetArea = (deckle * cutting) / 1000000;

    // Weight calculation (3 ply)
    const topWeight = (item.top_liner * sheetArea) / 1000;
    const flutingWeight = (item.fluting * sheetArea * takeUp) / 1000;
    const bottomWeight = (item.bottom_liner * sheetArea) / 1000;
    const totalWeight = topWeight + flutingWeight + bottomWeight;
    const boxWeight = item.ups > 0 ? totalWeight / item.ups : totalWeight;

    // Cost calculation
    const paperCost = totalWeight * item.paper_rate * 1.03; // 3% wastage
    const convCost = sheetArea * item.conversion_cost;
    const sheetCost = paperCost + convCost + item.printing_cost + item.die_cost + item.other_cost;
    const costPerBox = item.ups > 0 ? sheetCost / item.ups : sheetCost;

    // Pricing
    const marginAmount = costPerBox * (item.margin_percent / 100);
    const sellingPrice = Math.ceil((costPerBox + marginAmount) * 2) / 2;
    const amount = sellingPrice * item.quantity;

    return {
      ...item,
      deckle_size: Math.round(deckle * 100) / 100,
      cutting_size: Math.round(cutting * 100) / 100,
      sheet_area: Math.round(sheetArea * 10000) / 10000,
      box_weight: Math.round(boxWeight * 10000) / 10000,
      cost_per_box: Math.round(costPerBox * 100) / 100,
      selling_price: Math.round(sellingPrice * 100) / 100,
      amount: Math.round(amount * 100) / 100,
    };
  };

  // Handle customer selection
  const handleCustomerChange = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    setQuotation(prev => ({ ...prev, customer_id: customerId }));
  };

  // Add new item
  const handleAddItem = () => {
    setCurrentItem(getEmptyItem());
    setActiveItemIndex(null);
    setShowItemModal(true);
  };

  // Edit item
  const handleEditItem = (index: number) => {
    setCurrentItem({ ...quotation.items[index] });
    setActiveItemIndex(index);
    setShowItemModal(true);
  };

  // Delete item
  const handleDeleteItem = (index: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setQuotation(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index),
        }));
      },
    });
  };

  // Save item from modal
  const handleSaveItem = () => {
    const calculatedItem = calculateItem(currentItem);

    if (calculatedItem.length <= 0 || calculatedItem.width <= 0 || calculatedItem.height <= 0) {
      (window as any).appAlert('Please enter valid dimensions');
      return;
    }

    if (calculatedItem.quantity <= 0) {
      (window as any).appAlert('Please enter valid quantity');
      return;
    }

    if (activeItemIndex !== null) {
      // Update existing item
      setQuotation(prev => ({
        ...prev,
        items: prev.items.map((item, i) => i === activeItemIndex ? calculatedItem : item),
      }));
    } else {
      // Add new item
      setQuotation(prev => ({
        ...prev,
        items: [...prev.items, calculatedItem],
      }));
    }

    setShowItemModal(false);
    setCurrentItem(getEmptyItem());
    setActiveItemIndex(null);
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = quotation.items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = subtotal * (quotation.discount_percent / 100);
    const taxableAmount = subtotal - discountAmount;
    
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (quotation.igst_percent > 0) {
      igstAmount = taxableAmount * (quotation.igst_percent / 100);
    } else {
      cgstAmount = taxableAmount * (quotation.cgst_percent / 100);
      sgstAmount = taxableAmount * (quotation.sgst_percent / 100);
    }

    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  };

  // Save quotation
  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!quotation.customer_id) {
      (window as any).appAlert('Please select a customer');
      return;
    }

    if (quotation.items.length === 0) {
      (window as any).appAlert('Please add at least one item');
      return;
    }

    setSaving(true);

    try {
      const totals = calculateTotals();
      const payload = {
        ...quotation,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        taxable_amount: totals.taxableAmount,
        cgst_amount: totals.cgstAmount,
        sgst_amount: totals.sgstAmount,
        igst_amount: totals.igstAmount,
        total_amount: totals.totalAmount,
        status,
        items: quotation.items.map(item => ({
          box_name: item.box_name,
          box_type: item.box_type,
          length: item.length,
          width: item.width,
          height: item.height,
          ply_count: item.ply_count,
          flute_type: item.flute_type,
          paper_config: {
            top_liner: item.top_liner,
            top_liner_bf: item.top_liner_bf,
            fluting: item.fluting,
            bottom_liner: item.bottom_liner,
            bottom_liner_bf: item.bottom_liner_bf,
          },
          paper_rate: item.paper_rate,
          conversion_cost: item.conversion_cost,
          printing_cost: item.printing_cost,
          die_cost: item.die_cost,
          other_cost: item.other_cost,
          margin_percent: item.margin_percent,
          ups: item.ups,
          quantity: item.quantity,
          deckle_size: item.deckle_size,
          cutting_size: item.cutting_size,
          sheet_area: item.sheet_area,
          box_weight: item.box_weight,
          cost_per_box: item.cost_per_box,
          selling_price: item.selling_price,
          amount: item.amount,
          notes: item.notes,
        })),
      };

      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        (window as any).appAlert('Quotation saved successfully!');
        router.push('/quotations');
      } else {
        (window as any).appAlert('Error: ' + (data.error || 'Failed to save quotation'));
      }
    } catch (error) {
      console.error('Save error:', error);
      (window as any).appAlert('Error saving quotation');
    }

    setSaving(false);
  };

  const totals = calculateTotals();

  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/quotations" className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              Create Quotation
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave('sent')}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save & Send
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer & Details */}
          <div className="lg:col-span-1 space-y-4">
            {/* Customer Selection */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold mb-4">👤 Customer</h2>
              <select
                value={quotation.customer_id}
                onChange={(e) => handleCustomerChange(Number(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value={0}>-- Select Customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.company_name}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-semibold">{selectedCustomer.company_name}</p>
                  <p className="text-gray-600">{selectedCustomer.billing_address}</p>
                  <p className="text-gray-600">GST: {selectedCustomer.gst_number}</p>
                  <p className="text-gray-600">📞 {selectedCustomer.phone}</p>
                </div>
              )}
            </div>

            {/* Quotation Details */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold mb-4">📋 Quotation Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={quotation.quotation_date}
                    onChange={(e) => setQuotation(prev => ({ ...prev, quotation_date: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={quotation.validity_days}
                    onChange={(e) => setQuotation(prev => ({ ...prev, validity_days: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
                  <input
                    type="text"
                    value={quotation.delivery_terms}
                    onChange={(e) => setQuotation(prev => ({ ...prev, delivery_terms: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={quotation.payment_terms}
                    onChange={(e) => setQuotation(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tax Settings */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold mb-4">💰 Tax & Discount</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    value={quotation.discount_percent}
                    onChange={(e) => setQuotation(prev => ({ ...prev, discount_percent: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CGST (%)</label>
                    <input
                      type="number"
                      value={quotation.cgst_percent}
                      onChange={(e) => setQuotation(prev => ({ 
                        ...prev, 
                        cgst_percent: Number(e.target.value),
                        igst_percent: 0 
                      }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SGST (%)</label>
                    <input
                      type="number"
                      value={quotation.sgst_percent}
                      onChange={(e) => setQuotation(prev => ({ 
                        ...prev, 
                        sgst_percent: Number(e.target.value),
                        igst_percent: 0 
                      }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-center text-gray-400 text-sm">- OR -</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IGST (%)</label>
                  <input
                    type="number"
                    value={quotation.igst_percent}
                    onChange={(e) => setQuotation(prev => ({ 
                      ...prev, 
                      igst_percent: Number(e.target.value),
                      cgst_percent: 0,
                      sgst_percent: 0 
                    }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold mb-4">📝 Notes</h2>
              <textarea
                value={quotation.notes}
                onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Internal notes..."
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column - Items & Summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Items List */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">📦 Box Items ({quotation.items.length})</h2>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Box
                </button>
              </div>

              {quotation.items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CalculatorIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Box" to add items to this quotation</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Box Details</th>
                        <th className="px-3 py-2 text-right">Size (mm)</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{item.box_name || `Box ${index + 1}`}</div>
                            <div className="text-xs text-gray-500">
                              {item.ply_count} Ply | {item.flute_type} Flute | {item.box_type}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div>{item.length} × {item.width} × {item.height}</div>
                            <div className="text-xs text-gray-500">
                              Wt: {item.box_weight} kg
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-medium">{item.quantity}</td>
                          <td className="px-3 py-3 text-right">
                            <div>₹{item.selling_price}</div>
                            <div className="text-xs text-gray-500">
                              Cost: ₹{item.cost_per_box}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold">₹{item.amount.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleEditItem(index)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <CalculatorIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
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

            {/* Totals */}
            {quotation.items.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h2 className="text-lg font-bold mb-4">💵 Summary</h2>
                <div className="max-w-sm ml-auto">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Subtotal</td>
                        <td className="py-2 text-right font-medium">₹{totals.subtotal.toLocaleString('en-IN')}</td>
                      </tr>
                      {quotation.discount_percent > 0 && (
                        <tr className="border-b text-red-600">
                          <td className="py-2">Discount ({quotation.discount_percent}%)</td>
                          <td className="py-2 text-right">-₹{totals.discountAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      <tr className="border-b">
                        <td className="py-2">Taxable Amount</td>
                        <td className="py-2 text-right font-medium">₹{totals.taxableAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      {quotation.cgst_percent > 0 && (
                        <tr className="border-b">
                          <td className="py-2">CGST ({quotation.cgst_percent}%)</td>
                          <td className="py-2 text-right">₹{totals.cgstAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {quotation.sgst_percent > 0 && (
                        <tr className="border-b">
                          <td className="py-2">SGST ({quotation.sgst_percent}%)</td>
                          <td className="py-2 text-right">₹{totals.sgstAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {quotation.igst_percent > 0 && (
                        <tr className="border-b">
                          <td className="py-2">IGST ({quotation.igst_percent}%)</td>
                          <td className="py-2 text-right">₹{totals.igstAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      <tr className="bg-green-50 font-bold text-green-700">
                        <td className="py-3 text-lg">Grand Total</td>
                        <td className="py-3 text-right text-xl">₹{totals.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold mb-4">📜 Terms & Conditions</h2>
              <textarea
                value={quotation.terms_conditions}
                onChange={(e) => setQuotation(prev => ({ ...prev, terms_conditions: e.target.value }))}
                rows={6}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white">
              <h3 className="text-xl font-bold">
                {activeItemIndex !== null ? '✏️ Edit Box Item' : '➕ Add Box Item'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Box Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Box Name / Description</label>
                <input
                  type="text"
                  value={currentItem.box_name}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, box_name: e.target.value }))}
                  placeholder="e.g., Corrugated Box for Electronics"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Dimensions */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold mb-3">📐 Box Dimensions (mm)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length (L)</label>
                    <input
                      type="number"
                      value={currentItem.length || ''}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, length: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (W)</label>
                    <input
                      type="number"
                      value={currentItem.width || ''}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, width: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (H)</label>
                    <input
                      type="number"
                      value={currentItem.height || ''}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Box Type</label>
                  <select
                    value={currentItem.box_type}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, box_type: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="RSC">RSC</option>
                    <option value="HSC">HSC</option>
                    <option value="FOL">FOL</option>
                    <option value="DIE_CUT">Die Cut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ply</label>
                  <select
                    value={currentItem.ply_count}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, ply_count: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={3}>3 Ply</option>
                    <option value={5}>5 Ply</option>
                    <option value={7}>7 Ply</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flute</label>
                  <select
                    value={currentItem.flute_type}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, flute_type: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="A">A Flute</option>
                    <option value="B">B Flute</option>
                    <option value="C">C Flute</option>
                    <option value="E">E Flute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPS</label>
                  <input
                    type="number"
                    value={currentItem.ups}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, ups: Number(e.target.value) }))}
                    min={1}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Paper Config */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold mb-3">📄 Paper Configuration</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Top Liner (GSM)</label>
                    <input
                      type="number"
                      value={currentItem.top_liner}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, top_liner: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Top BF</label>
                    <input
                      type="number"
                      value={currentItem.top_liner_bf}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, top_liner_bf: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fluting (GSM)</label>
                    <input
                      type="number"
                      value={currentItem.fluting}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, fluting: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bottom Liner (GSM)</label>
                    <input
                      type="number"
                      value={currentItem.bottom_liner}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, bottom_liner: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Costing */}
              <div className="bg-yellow-50 rounded-xl p-4">
                <h4 className="font-bold mb-3">💰 Costing</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Rate (₹/kg)</label>
                    <input
                      type="number"
                      value={currentItem.paper_rate}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, paper_rate: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conv. Cost (₹/sqm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentItem.conversion_cost}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, conversion_cost: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
                    <input
                      type="number"
                      value={currentItem.margin_percent}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, margin_percent: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Printing (₹)</label>
                    <input
                      type="number"
                      value={currentItem.printing_cost}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, printing_cost: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Die Cost (₹)</label>
                    <input
                      type="number"
                      value={currentItem.die_cost}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, die_cost: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other (₹)</label>
                    <input
                      type="number"
                      value={currentItem.other_cost}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, other_cost: Number(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Calculation */}
              {currentItem.length > 0 && currentItem.width > 0 && currentItem.height > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-bold mb-3">📊 Calculated Values</h4>
                  {(() => {
                    const calc = calculateItem(currentItem);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Deckle:</span>
                          <span className="font-bold ml-2">{calc.deckle_size} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cutting:</span>
                          <span className="font-bold ml-2">{calc.cutting_size} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Area:</span>
                          <span className="font-bold ml-2">{calc.sheet_area} m²</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Box Weight:</span>
                          <span className="font-bold ml-2">{calc.box_weight} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost/Box:</span>
                          <span className="font-bold ml-2 text-orange-600">₹{calc.cost_per_box}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Selling Price:</span>
                          <span className="font-bold ml-2 text-green-600">₹{calc.selling_price}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Total Amount:</span>
                          <span className="font-bold ml-2 text-xl text-purple-600">₹{calc.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                <textarea
                  value={currentItem.notes}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any special notes for this item..."
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <CheckIcon className="w-5 h-5" />
                {activeItemIndex !== null ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}