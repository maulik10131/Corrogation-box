'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PencilSquareIcon,
  ArrowLeftIcon,
  CheckIcon,
  BuildingOfficeIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface CustomerForm {
  id: number;
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
  current_balance: number;
  status: number;
  notes: string;
}

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [form, setForm] = useState<CustomerForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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
      loadCustomer();
    }
  }, [customerId, isAuthenticated]);

  const loadCustomer = async () => {
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');
      
      const response = await fetch(`${API_URL}/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success && data.data) {
        const customer = data.data;
        const normalizedCustomer: CustomerForm = {
          ...customer,
          id: Number(customer.id),
          credit_limit: Number(customer.credit_limit || 0),
          credit_days: Number(customer.credit_days || 0),
          opening_balance: Number(customer.opening_balance || 0),
          current_balance: Number(customer.current_balance || 0),
          status: Number(customer.status || 0),
          shipping_address: customer.shipping_address || customer.billing_address || '',
        };

        setForm(normalizedCustomer);
        setSameAsShipping(normalizedCustomer.billing_address === normalizedCustomer.shipping_address);
      } else {
        setForm(null);
      }
    } catch (error) {
      console.error('Failed to load customer:', error);
      setForm(null);
      (window as any).appAlert('Failed to load customer from database');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CustomerForm, value: any) => {
    if (!form) return;
    
    setForm(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
    
    // Clear error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Sync shipping address
    if (field === 'billing_address' && sameAsShipping) {
      setForm(prev => prev ? { ...prev, shipping_address: value } : null);
    }
  };

  const handleSameAsShipping = (checked: boolean) => {
    setSameAsShipping(checked);
    if (checked && form) {
      setForm(prev => prev ? { ...prev, shipping_address: prev.billing_address } : null);
      setHasChanges(true);
    }
  };

  const validateForm = (): Record<string, string> => {
    if (!form) return { form: 'Customer data is not loaded' };
    
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
      newErrors.gst_number = 'Enter valid GST number';
    }

    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0 || !form) {
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField && firstErrorField !== 'form') {
        const firstInput = document.querySelector(
          `[name="${firstErrorField}"]`
        ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

        if (firstInput) {
          firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInput.focus();
        }
      }

      if (firstErrorField) {
        (window as any).appAlert(validationErrors[firstErrorField]);
      }
      return;
    }

    setSaving(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
      const token = localStorage.getItem('pms_token');
      
      const response = await fetch(`${API_URL}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        (window as any).appAlert('Customer updated successfully!');
        router.push(`/customers/${customerId}`);
      } else {
        (window as any).appAlert('Error: ' + (data.error || 'Failed to update customer'));
      }
    } catch (error) {
      console.error('Save error:', error);
      (window as any).appAlert('Network/API error. Customer update was not saved to database.');
    }

    setSaving(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowLeaveModal(true);
      return;
    }
    router.push(`/customers/${customerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Customer Not Found</h2>
          <Link href="/customers" className="text-blue-600 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={handleCancel} className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <PencilSquareIcon className="w-8 h-8 text-blue-600" />
                Edit Customer
              </h1>
              <p className="text-gray-500">{form.name}</p>
            </div>
          </div>
          {hasChanges && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
              Unsaved changes
            </span>
          )}
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
                    maxLength={15}
                    className={`w-full border-2 rounded-lg px-3 py-2 focus:outline-none uppercase ${
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
                    maxLength={10}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none uppercase"
                  />
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
                  <label htmlFor="sameAsShipping" className="text-sm text-gray-600">
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
                      maxLength={6}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
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
                    Current Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={form.current_balance}
                    disabled
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from transactions</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex gap-4">
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
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckIcon className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Unsaved Changes</h2>
            <p className="text-gray-500 text-sm mb-6">You have unsaved changes. If you leave now, your changes will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Stay on Page
              </button>
              <button
                onClick={() => router.push(`/customers/${customerId}`)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
