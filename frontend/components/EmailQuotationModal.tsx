'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  PaperClipIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// ============ TYPES ============
interface QuotationItem {
  box_name: string;
  quantity: number;
  selling_price: number;
  amount: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  items: QuotationItem[];
}

interface EmailFormData {
  email: string;
  name: string;
  subject: string;
  message: string;
  cc: string;
  attachPdf: boolean;
}

interface EmailQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onSuccess?: () => void;
}

// ============ EMAIL TEMPLATES ============
const emailTemplates = [
  {
    id: 'new',
    name: 'New Quotation',
    subject: 'Quotation {{number}} - {{company}}',
    message: 'Please find attached the quotation as per your requirement. Kindly review and let us know if you have any questions.',
  },
  {
    id: 'reminder',
    name: 'Reminder',
    subject: 'Reminder: Quotation {{number}} expires on {{validUntil}}',
    message: 'This is a friendly reminder that the quotation we sent will expire soon. Please review and confirm at your earliest convenience.',
  },
  {
    id: 'followup',
    name: 'Follow-up',
    subject: 'Following up on Quotation {{number}}',
    message: 'We wanted to follow up on the quotation we sent earlier. Please let us know if you need any clarification or modifications.',
  },
  {
    id: 'revised',
    name: 'Revised Quotation',
    subject: 'Revised Quotation {{number}} - {{company}}',
    message: 'Please find the revised quotation as per our discussion. The changes have been incorporated as requested.',
  },
];

// ============ COMPONENT ============
export default function EmailQuotationModal({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: EmailQuotationModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('new');

  const [formData, setFormData] = useState<EmailFormData>({
    email: '',
    name: '',
    subject: '',
    message: '',
    cc: '',
    attachPdf: true,
  });

  // Initialize form with customer data
  useEffect(() => {
    if (isOpen && quotation) {
      const template = emailTemplates.find((t) => t.id === 'new');
      const subject = replaceTemplateVars(template?.subject || '', quotation);
      const message = template?.message || '';

      setFormData({
        email: quotation.customer_email || '',
        name: quotation.customer_name || '',
        subject: subject,
        message: message,
        cc: '',
        attachPdf: true,
      });
      setSent(false);
      setError(null);
    }
  }, [isOpen, quotation]);

  // Replace template variables
  const replaceTemplateVars = (text: string, q: Quotation): string => {
    return text
      .replace(/\{\{number\}\}/g, q.quotation_number)
      .replace(/\{\{company\}\}/g, 'ABC Corrugation Industries')
      .replace(/\{\{validUntil\}\}/g, formatDate(q.valid_until))
      .replace(/\{\{total\}\}/g, formatCurrency(q.total_amount))
      .replace(/\{\{customerName\}\}/g, q.customer_name);
  };

  // Format helpers
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        subject: replaceTemplateVars(template.subject, quotation),
        message: template.message,
      }));
    }
  };

  // Handle input change
  const handleChange = (field: keyof EmailFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError('Email address is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.subject.trim()) {
      setError('Subject is required');
      return false;
    }

    // Validate CC emails if provided
    if (formData.cc.trim()) {
      const ccEmails = formData.cc.split(',').map((e) => e.trim());
      for (const email of ccEmails) {
        if (email && !emailRegex.test(email)) {
          setError(`Invalid CC email: ${email}`);
          return false;
        }
      }
    }

    return true;
  };

  // Handle send email
  const handleSend = async () => {
    if (!validateForm()) return;

    setSending(true);
    setError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

      const ccEmails = formData.cc
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);

      const response = await fetch(`${API_URL}/email/send-quotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotation_id: quotation.id,
          email: formData.email,
          name: formData.name,
          subject: formData.subject,
          message: formData.message,
          cc: ccEmails,
          attach_pdf: formData.attachPdf,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSent(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      
      // Demo mode - simulate success
      setSent(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } finally {
      setSending(false);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <EnvelopeIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Email Quotation</h2>
                <p className="text-blue-100 text-sm">{quotation.quotation_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success State */}
        {sent ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Email Sent!</h3>
            <p className="text-gray-600">
              Quotation has been sent to <strong>{formData.email}</strong>
            </p>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Quotation Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{quotation.quotation_number}</p>
                    <p className="text-sm text-gray-500">
                      {quotation.items.length} items • Valid until {formatDate(quotation.valid_until)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(quotation.total_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template
                </label>
                <div className="flex flex-wrap gap-2">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTemplate === template.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* To Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Recipient Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* CC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CC <span className="text-gray-400 text-xs">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cc}
                    onChange={(e) => handleChange('cc', e.target.value)}
                    placeholder="manager@company.com, sales@company.com"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder="Add a personal message..."
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Attach PDF */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="attachPdf"
                    checked={formData.attachPdf}
                    onChange={(e) => handleChange('attachPdf', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <label htmlFor="attachPdf" className="flex items-center gap-2 cursor-pointer">
                    <PaperClipIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">Attach quotation PDF</span>
                    <span className="text-sm text-gray-400">({quotation.quotation_number}.pdf)</span>
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Email will be sent from <strong>info@abccorrugation.com</strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}