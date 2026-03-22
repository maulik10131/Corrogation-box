'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  UserPlusIcon,
  ArrowLeftIcon,
  CheckIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface CustomerForm {
  name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  mobile: string;
  email: string;
  gst_number: string;
  pan_number: string;
  billing_address: string;
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  credit_limit: number;
  credit_days: number;
  opening_balance: number;
  status: number;
  notes: string;
}

// ============ CONSTANTS ============
const initialForm: CustomerForm = {
  name: '',
  company_name: '',
  contact_person: '',
  phone: '',
  mobile: '',
  email: '',
  gst_number: '',
  pan_number: '',
  billing_address: '',
  shipping_address: '',
  city: '',
  state: 'Gujarat',
  pincode: '',
  credit_limit: 100000,
  credit_days: 30,
  opening_balance: 0,
  status: 1,
  notes: '',
};

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

// ============ COMPONENT ============
export default function CreateCustomerPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

  // ============ HANDLERS ============
  const handleChange = (field: keyof CustomerForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));

    // Clear error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Sync shipping address
    if (field === 'billing_address' && sameAsShipping) {
      setForm(prev => ({ ...prev, shipping_address: value }));
    }
  };

  const handleSameAsShipping = (checked: boolean) => {
    setSameAsShipping(checked);
    if (checked) {
      setForm(prev => ({ ...prev, shipping_address: prev.billing_address }));
    }
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      newErrors.mobile = 'Enter valid 10-digit mobile number';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter valid email address';
    }

    if (form.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gst_number)) {
      newErrors.gst_number = 'Enter valid 15-digit GST number';
    }

    if (form.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number)) {
      newErrors.pan_number = 'Enter valid 10-digit PAN number';
    }

    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = 'Enter valid 6-digit pincode';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];
      const firstInput = document.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

      if (firstInput) {
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInput.focus();
      }

      (window as any).appAlert(validationErrors[firstErrorField]);
      return;
    }

    setSaving(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');

      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        (window as any).appAlert('Customer created successfully!');
        router.push('/customers');
      } else {
        (window as any).appAlert('Error: ' + (data.error || 'Failed to create customer'));
      }
    } catch (error) {
      console.error('Save error:', error);
      (window as any).appAlert('Network/API error. Customer was not saved to database.');
    }

    setSaving(false);
  };

  const handleReset = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Form',
      message: 'Reset all fields? All entered data will be cleared.',
      confirmLabel: 'Reset',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setForm(initialForm);
        setErrors({});
      },
    });
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/customers" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlusIcon className="w-8 h-8 text-blue-600" />
            Add New Customer
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., XYZ Industries"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="e.g., XYZ Industries Pvt Ltd"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={(e) => handleChange('gst_number', e.target.value.toUpperCase())}
                    placeholder="e.g., 24AABCX1234A1Z5"
                    maxLength={15}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none uppercase font-mono ${
                      errors.gst_number ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.gst_number && <p className="text-red-500 text-sm mt-1">{errors.gst_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={form.pan_number}
                    onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                    placeholder="e.g., AABCX1234A"
                    maxLength={10}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none uppercase font-mono ${
                      errors.pan_number ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.pan_number && <p className="text-red-500 text-sm mt-1">{errors.pan_number}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-green-500" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    placeholder="e.g., Rajesh Sharma"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-lg text-gray-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="mobile"
                      value={form.mobile}
                      onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className={`w-full border-2 rounded-r-lg px-3 py-2 focus:outline-none ${
                        errors.mobile ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g., 079-25831234"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g., contact@company.com"
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                      errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-red-500" />
                Address Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Address
                  </label>
                  <textarea
                    value={form.billing_address}
                    onChange={(e) => handleChange('billing_address', e.target.value)}
                    placeholder="Enter complete billing address..."
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onChange={(e) => handleSameAsShipping(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="sameAsShipping" className="text-sm text-gray-600 cursor-pointer">
                    Shipping address same as billing address
                  </label>
                </div>

                {!sameAsShipping && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Address
                    </label>
                    <textarea
                      value={form.shipping_address}
                      onChange={(e) => handleChange('shipping_address', e.target.value)}
                      placeholder="Enter shipping address..."
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="e.g., Ahmedabad"
                      className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                        errors.city ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={form.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={form.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g., 380015"
                      maxLength={6}
                      className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none ${
                        errors.pincode ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-purple-500" />
                Credit Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={form.credit_limit}
                    onChange={(e) => handleChange('credit_limit', Number(e.target.value))}
                    min={0}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Days
                  </label>
                  <input
                    type="number"
                    value={form.credit_days}
                    onChange={(e) => handleChange('credit_days', Number(e.target.value))}
                    min={0}
                    max={365}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={form.opening_balance}
                    onChange={(e) => handleChange('opening_balance', Number(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-orange-500" />
                Additional Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.status === 1}
                        onChange={() => handleChange('status', 1)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-green-600 font-medium">✓ Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.status === 0}
                        onChange={() => handleChange('status', 0)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-red-600 font-medium">✗ Inactive</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Any additional notes about this customer..."
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Reset
              </button>
              <Link
                href="/customers"
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
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
                    Save Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
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