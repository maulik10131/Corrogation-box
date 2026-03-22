'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';
import PDFDownloadButton from '@/components/PDFDownloadButton';
import EmailButton from '@/components/EmailButton';
import {
  ArrowLeftIcon,
  PrinterIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

// Types
interface QuotationItem {
  id: number;
  box_name: string;
  box_type: string;
  length: number;
  width: number;
  height: number;
  ply_count: number;
  flute_type: string;
  deckle_size: number;
  cutting_size: number;
  sheet_area: number;
  box_weight: number;
  paper_rate: number;
  cost_per_box: number;
  selling_price: number;
  quantity: number;
  amount: number;
  notes: string;
}

interface Quotation {
  id: number;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  customer_id: number;
  customer_name: string;
  customer_address: string;
  customer_gst: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  total_amount: number;
  delivery_terms: string;
  payment_terms: string;
  notes: string;
  terms_conditions: string;
  status: string;
  status_label: string;
  is_expired: boolean;
  items: QuotationItem[];
  created_at: string;
}

// Company Info (can be from config/API)
const companyInfo = {
  name: 'ABC Corrugation Industries',
  tagline: 'Quality Packaging Solutions',
  address: '123, Industrial Area, GIDC, Ahmedabad - 382445, Gujarat, India',
  phone: '+91 79 2583 1234',
  mobile: '+91 98765 43210',
  email: 'info@abccorrugation.com',
  website: 'www.abccorrugation.com',
  gst: '24AABCI1234A1Z5',
  pan: 'AABCI1234A',
  bank_name: 'State Bank of India',
  bank_account: '1234567890123456',
  bank_ifsc: 'SBIN0001234',
  bank_branch: 'Industrial Area Branch, Ahmedabad',
};

export default function QuotationViewPage() {
  const params = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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

  useEffect(() => {
    if (isAuthenticated) {
      loadQuotation();
    }
  }, [params.id, isAuthenticated]);

  const loadQuotation = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('pms_token');
      const response = await fetch(`${API_URL}/quotations/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Quotation not found');
      }

      const q = data.data;
      setQuotation({
        ...q,
        subtotal: Number(q.subtotal),
        discount_percent: Number(q.discount_percent),
        discount_amount: Number(q.discount_amount),
        taxable_amount: Number(q.taxable_amount),
        cgst_percent: Number(q.cgst_percent),
        cgst_amount: Number(q.cgst_amount),
        sgst_percent: Number(q.sgst_percent),
        sgst_amount: Number(q.sgst_amount),
        igst_percent: Number(q.igst_percent),
        igst_amount: Number(q.igst_amount),
        total_amount: Number(q.total_amount),
        customer_phone: q.customer?.phone || q.customer?.mobile || '',
        customer_email: q.customer?.email || '',
        items: (q.items || []).map((item: QuotationItem) => ({
          ...item,
          length: Number(item.length),
          width: Number(item.width),
          height: Number(item.height),
          deckle_size: Number(item.deckle_size),
          cutting_size: Number(item.cutting_size),
          sheet_area: Number(item.sheet_area),
          box_weight: Number(item.box_weight),
          paper_rate: Number(item.paper_rate),
          cost_per_box: Number(item.cost_per_box),
          selling_price: Number(item.selling_price),
          quantity: Number(item.quantity),
          amount: Number(item.amount),
        })),
      });
    } catch (error) {
      console.error('Failed to load quotation:', error);
      (window as any).appAlert('Failed to load quotation');
      router.push('/quotations');
    }

    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (newStatus: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Change Status',
      message: `Change quotation status to "${newStatus}"?`,
      confirmLabel: 'Yes, Change',
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        try {
          const token = localStorage.getItem('pms_token');
          const response = await fetch(`${API_URL}/quotations/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus }),
          });
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || 'Failed to update status');
          }
          await loadQuotation();
        } catch (error) {
          (window as any).appAlert('Error updating quotation status');
        }
        setActionLoading(false);
      },
    });
  };

  const handleSendWhatsApp = () => {
    if (!quotation) return;
    const items = quotation.items.map((it, i) =>
      `${i + 1}. ${it.box_name || `Box ${i + 1}`} (${it.length}×${it.width}×${it.height}mm) — Qty: ${it.quantity} @ ₹${it.selling_price.toFixed(2)}`
    ).join('\n');

    const msg =
`Dear ${quotation.customer_name},

Please find below your Quotation details:

📄 Quotation No: ${quotation.quotation_number}
📅 Date: ${formatDate(quotation.quotation_date)}
⏳ Valid Until: ${formatDate(quotation.valid_until)}

📦 Items:
${items}

💰 Total Amount: ₹${quotation.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

📋 Payment Terms: ${quotation.payment_terms || 'As discussed'}
🚚 Delivery Terms: ${quotation.delivery_terms || 'Ex-Factory'}

Please confirm your order at the earliest.

Thank you for your business!
${companyInfo.name}
${companyInfo.mobile}`;

    const phone = (quotation.customer_phone || '').replace(/\D/g, '');
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDuplicate = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Duplicate Quotation',
      message: 'Create a duplicate of this quotation?',
      confirmLabel: 'Yes, Duplicate',
      danger: false,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        setTimeout(() => {
          (window as any).appAlert('Quotation duplicated! Redirecting...');
          router.push('/quotations/create');
        }, 500);
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'expired': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'converted': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(-num);

    let words = '';
    
    if (Math.floor(num / 10000000) > 0) {
      words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
      words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
      words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 10) {
        words += ones[num];
      } else if (num < 20) {
        words += teens[num - 10];
      } else {
        words += tens[Math.floor(num / 10)];
        if (num % 10 > 0) {
          words += ' ' + ones[num % 10];
        }
      }
    }

    return words.trim();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Quotation Not Found</h2>
          <Link href="/quotations" className="text-blue-600 hover:underline">
            Back to Quotations
          </Link>
        </div>
      </div>
    );
  }

  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Action Bar - Hidden on Print */}
      <div className="bg-white shadow-md print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/quotations" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">{quotation.quotation_number}</h1>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(quotation.status)}`}>
                  {quotation.status_label}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
            {/* Print Button */}
            <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
            >
                <PrinterIcon className="w-4 h-4" />
                Print
            </button>
            
            {/* PDF Download */}
            <PDFDownloadButton quotation={quotation} />
              {/* Status Actions */}
              {quotation.status === 'draft' && (
                    <button
                    onClick={() => handleStatusChange('sent')}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                    <EnvelopeIcon className="w-4 h-4" />
                    Mark as Sent
                    </button>
                )}
                {/* Email Button */}
                <EmailButton quotation={quotation} variant="secondary" />
                {/* WhatsApp Button */}
                <button
                  onClick={handleSendWhatsApp}
                  className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                  title="Send Quotation via WhatsApp"
                >
                  <span className="text-base leading-none">💬</span>
                  WhatsApp
                </button>
                {/* Edit */}
                <Link
                    href={`/quotations/${quotation.id}/edit`}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                </Link>
              {quotation.status === 'sent' && (
                <>
                  <button
                    onClick={() => handleStatusChange('approved')}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
              
              {/* Common Actions */}
              <Link
                href={`/quotations/${quotation.id}/edit`}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={handleDuplicate}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
              >
                <PrinterIcon className="w-4 h-4" />
                Print
              </button>
              <button
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Document */}
      <div className="max-w-5xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white shadow-xl print:shadow-none rounded-lg print:rounded-none overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 print:p-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">{companyInfo.name}</h1>
                <p className="text-blue-200 text-sm mt-1">{companyInfo.tagline}</p>
              </div>
              <div className="text-right text-sm">
                <p>{companyInfo.address}</p>
                <p className="mt-1">📞 {companyInfo.phone} | 📱 {companyInfo.mobile}</p>
                <p>✉️ {companyInfo.email} | 🌐 {companyInfo.website}</p>
                <p className="mt-1 font-semibold">GSTIN: {companyInfo.gst}</p>
              </div>
            </div>
          </div>

          {/* Quotation Title Bar */}
          <div className="bg-gray-800 text-white text-center py-2">
            <h2 className="text-xl font-bold tracking-wider">QUOTATION</h2>
          </div>

          {/* Quotation Info & Customer */}
          <div className="p-6 print:p-4">
            <div className="grid grid-cols-2 gap-8">
              {/* Left - Customer */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Bill To / Customer</h3>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-lg font-bold text-gray-800">{quotation.customer_name}</p>
                  <p className="text-gray-600 mt-1 whitespace-pre-line">{quotation.customer_address}</p>
                  {quotation.customer_gst && (
                    <p className="text-gray-700 mt-2">
                      <span className="font-semibold">GSTIN:</span> {quotation.customer_gst}
                    </p>
                  )}
                  {quotation.customer_phone && (
                    <p className="text-gray-600">📞 {quotation.customer_phone}</p>
                  )}
                  {quotation.customer_email && (
                    <p className="text-gray-600">✉️ {quotation.customer_email}</p>
                  )}
                </div>
              </div>

              {/* Right - Quotation Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Quotation Details</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 text-gray-600">Quotation No:</td>
                        <td className="py-1 font-bold text-blue-700 text-right">{quotation.quotation_number}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">Date:</td>
                        <td className="py-1 font-semibold text-right">{formatDate(quotation.quotation_date)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">Valid Until:</td>
                        <td className={`py-1 font-semibold text-right ${quotation.is_expired ? 'text-red-600' : ''}`}>
                          {formatDate(quotation.valid_until)}
                          {quotation.is_expired && ' (Expired)'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">Status:</td>
                        <td className="py-1 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(quotation.status)}`}>
                            {quotation.status_label}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-6 print:px-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="py-3 px-3 text-left text-sm font-semibold border">#</th>
                  <th className="py-3 px-3 text-left text-sm font-semibold border">Description</th>
                  <th className="py-3 px-3 text-center text-sm font-semibold border">Size (mm)</th>
                  <th className="py-3 px-3 text-center text-sm font-semibold border">Spec</th>
                  <th className="py-3 px-3 text-right text-sm font-semibold border">Qty</th>
                  <th className="py-3 px-3 text-right text-sm font-semibold border">Rate (₹)</th>
                  <th className="py-3 px-3 text-right text-sm font-semibold border">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-3 border text-center">{index + 1}</td>
                    <td className="py-3 px-3 border">
                      <div className="font-semibold text-gray-800">{item.box_name || `Corrugated Box`}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Type: {item.box_type} | Deckle: {item.deckle_size}mm | Cut: {item.cutting_size}mm
                      </div>
                      {item.notes && (
                        <div className="text-xs text-blue-600 mt-1 italic">Note: {item.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 border text-center">
                      <div className="font-medium">{item.length} × {item.width} × {item.height}</div>
                      <div className="text-xs text-gray-500">L × W × H</div>
                    </td>
                    <td className="py-3 px-3 border text-center">
                      <div className="font-medium">{item.ply_count} Ply</div>
                      <div className="text-xs text-gray-500">{item.flute_type} Flute</div>
                    </td>
                    <td className="py-3 px-3 border text-right font-medium">{item.quantity}</td>
                    <td className="py-3 px-3 border text-right font-medium">{item.selling_price.toFixed(2)}</td>
                    <td className="py-3 px-3 border text-right font-bold">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="p-6 print:p-4">
            <div className="flex justify-end">
              <div className="w-80">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">Subtotal</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(quotation.subtotal)}</td>
                    </tr>
                    {quotation.discount_percent > 0 && (
                      <tr className="border-b text-red-600">
                        <td className="py-2">Discount ({quotation.discount_percent}%)</td>
                        <td className="py-2 text-right font-medium">-{formatCurrency(quotation.discount_amount)}</td>
                      </tr>
                    )}
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">Taxable Amount</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(quotation.taxable_amount)}</td>
                    </tr>
                    {quotation.cgst_percent > 0 && (
                      <tr className="border-b">
                        <td className="py-2 text-gray-600">CGST ({quotation.cgst_percent}%)</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(quotation.cgst_amount)}</td>
                      </tr>
                    )}
                    {quotation.sgst_percent > 0 && (
                      <tr className="border-b">
                        <td className="py-2 text-gray-600">SGST ({quotation.sgst_percent}%)</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(quotation.sgst_amount)}</td>
                      </tr>
                    )}
                    {quotation.igst_percent > 0 && (
                      <tr className="border-b">
                        <td className="py-2 text-gray-600">IGST ({quotation.igst_percent}%)</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(quotation.igst_amount)}</td>
                      </tr>
                    )}
                    <tr className="bg-green-100">
                      <td className="py-3 text-lg font-bold text-green-800">Grand Total</td>
                      <td className="py-3 text-right text-xl font-bold text-green-800">{formatCurrency(quotation.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Amount in Words */}
                <div className="mt-3 p-3 bg-gray-50 rounded border text-sm">
                  <span className="text-gray-500">Amount in Words: </span>
                  <span className="font-medium">
                    {numberToWords(Math.floor(quotation.total_amount))} Rupees
                    {Math.round((quotation.total_amount % 1) * 100) > 0 && 
                      ` and ${numberToWords(Math.round((quotation.total_amount % 1) * 100))} Paise`
                    } Only
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Bank Details */}
          <div className="px-6 pb-6 print:px-4 print:pb-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Terms & Conditions */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-2 border-b pb-1">Terms & Conditions</h3>
                <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                  {quotation.terms_conditions}
                </div>
                
                {/* Delivery & Payment Terms */}
                <div className="mt-4 space-y-2">
                  <div className="flex">
                    <span className="text-xs font-semibold text-gray-700 w-28">Delivery:</span>
                    <span className="text-xs text-gray-600">{quotation.delivery_terms}</span>
                  </div>
                  <div className="flex">
                    <span className="text-xs font-semibold text-gray-700 w-28">Payment:</span>
                    <span className="text-xs text-gray-600">{quotation.payment_terms}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-2 border-b pb-1">Bank Details</h3>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1 text-gray-600 w-28">Bank Name:</td>
                        <td className="py-1 font-medium">{companyInfo.bank_name}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">Account No:</td>
                        <td className="py-1 font-medium">{companyInfo.bank_account}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">IFSC Code:</td>
                        <td className="py-1 font-medium">{companyInfo.bank_ifsc}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-gray-600">Branch:</td>
                        <td className="py-1 font-medium">{companyInfo.bank_branch}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signature */}
                <div className="mt-6 text-right">
                  <div className="inline-block text-center">
                    <div className="h-16 border-b border-gray-400 w-48 mb-2"></div>
                    <p className="text-sm font-semibold text-gray-700">Authorized Signatory</p>
                    <p className="text-xs text-gray-500">{companyInfo.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes (if any) */}
          {quotation.notes && (
            <div className="px-6 pb-6 print:px-4 print:pb-4">
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">📝 Internal Notes</h3>
                <p className="text-sm text-yellow-700">{quotation.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-4 print:px-4 text-center border-t">
            <p className="text-sm text-gray-600">
              Thank you for your business! For any queries, please contact us at {companyInfo.email} or {companyInfo.mobile}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This is a computer generated quotation and does not require a signature.
            </p>
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:p-4 {
            padding: 1rem !important;
          }
          
          .print\\:px-4 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          
          .print\\:pb-4 {
            padding-bottom: 1rem !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
          
          /* Ensure colors print */
          .bg-gradient-to-r {
            background: #1e40af !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-gray-800 {
            background-color: #1f2937 !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-green-100 {
            background-color: #dcfce7 !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-blue-50 {
            background-color: #eff6ff !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Page break handling */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
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
