'use client';

import { useState } from 'react';
import { DocumentArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { generateQuotationPDF } from '@/lib/pdf-generator';

// ============ TYPES ============
interface QuotationItem {
  box_name: string;
  box_type: string;
  length: number;
  width: number;
  height: number;
  ply_count: number;
  flute_type: string;
  deckle_size: number;
  cutting_size: number;
  quantity: number;
  selling_price: number;
  amount: number;
  notes?: string;
}

interface Quotation {
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
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
  terms_conditions: string;
  items: QuotationItem[];
}

interface PDFDownloadButtonProps {
  quotation: Quotation;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

// ============ COMPONENT ============
export default function PDFDownloadButton({
  quotation,
  className = '',
  variant = 'primary',
  size = 'md',
  label,
}: PDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-xs gap-1',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-base gap-2',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Button labels
  const buttonLabels = {
    default: label || 'Download PDF',
    generating: 'Generating...',
  };

  // Handle PDF download
  const handleDownload = async () => {
    // Reset error
    setError(null);
    setGenerating(true);

    try {
      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Generate PDF
      generateQuotationPDF(quotation);

      // Success feedback (optional)
      console.log(`PDF generated: ${quotation.quotation_number}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ============ ICON VARIANT ============
  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={generating}
        className={`
          p-2 rounded-lg transition-all duration-200
          hover:bg-gray-100 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={generating ? 'Generating PDF...' : 'Download PDF'}
        aria-label="Download PDF"
      >
        {generating ? (
          <ArrowPathIcon className={`${iconSizes[size]} animate-spin text-gray-500`} />
        ) : (
          <DocumentArrowDownIcon className={`${iconSizes[size]} text-gray-600 hover:text-green-600`} />
        )}
      </button>
    );
  }

  // ============ SECONDARY VARIANT ============
  if (variant === 'secondary') {
    return (
      <button
        onClick={handleDownload}
        disabled={generating}
        className={`
          flex items-center justify-center
          ${sizeClasses[size]}
          bg-gray-100 text-gray-700 rounded-lg
          hover:bg-gray-200 active:bg-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 active:scale-95
          border border-gray-200
          ${className}
        `}
        aria-label="Download PDF"
      >
        {generating ? (
          <>
            <ArrowPathIcon className={`${iconSizes[size]} animate-spin`} />
            <span>{buttonLabels.generating}</span>
          </>
        ) : (
          <>
            <DocumentArrowDownIcon className={iconSizes[size]} />
            <span>{buttonLabels.default}</span>
          </>
        )}
      </button>
    );
  }

  // ============ PRIMARY VARIANT (Default) ============
  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className={`
        flex items-center justify-center
        ${sizeClasses[size]}
        bg-green-600 text-white rounded-lg
        hover:bg-green-700 active:bg-green-800
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200 active:scale-95
        shadow-sm hover:shadow-md
        ${className}
      `}
      aria-label="Download PDF"
    >
      {generating ? (
        <>
          <ArrowPathIcon className={`${iconSizes[size]} animate-spin`} />
          <span>{buttonLabels.generating}</span>
        </>
      ) : (
        <>
          <DocumentArrowDownIcon className={iconSizes[size]} />
          <span>{buttonLabels.default}</span>
        </>
      )}
    </button>
  );
}

// ============ NAMED EXPORTS FOR FLEXIBILITY ============
export { PDFDownloadButton };