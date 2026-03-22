'use client';

import { useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import EmailQuotationModal from './EmailQuotationModal';

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

interface EmailButtonProps {
  quotation: Quotation;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: () => void;
}

export default function EmailButton({
  quotation,
  variant = 'primary',
  size = 'md',
  className = '',
  onSuccess,
}: EmailButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs gap-1',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleSuccess = () => {
    onSuccess?.();
  };

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
          title="Email Quotation"
        >
          <EnvelopeIcon className={`${iconSizes[size]} text-gray-600 hover:text-blue-600`} />
        </button>
        
        <EmailQuotationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          quotation={quotation}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  // Secondary variant
  if (variant === 'secondary') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center ${sizeClasses[size]} bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ${className}`}
        >
          <EnvelopeIcon className={iconSizes[size]} />
          <span>Email</span>
        </button>
        
        <EmailQuotationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          quotation={quotation}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  // Primary variant
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center ${sizeClasses[size]} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm ${className}`}
      >
        <EnvelopeIcon className={iconSizes[size]} />
        <span>Email</span>
      </button>
      
      <EmailQuotationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        quotation={quotation}
        onSuccess={handleSuccess}
      />
    </>
  );
}