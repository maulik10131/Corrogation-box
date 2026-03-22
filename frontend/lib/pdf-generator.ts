import jsPDF from 'jspdf';

// ============ TYPES ============
interface CompanyInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  gst: string;
  pan: string;
  bank_name: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
}

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

// ============ COMPANY INFO ============
const companyInfo: CompanyInfo = {
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

// ============ HELPER FUNCTIONS ============
const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const numberToWords = (num: number): string => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);

  return result.trim();
};

// ============ MAIN PDF GENERATOR ============
export const generateQuotationPDF = (quotation: Quotation): void => {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // Colors (RGB)
  const colors = {
    primary: [30, 64, 175] as [number, number, number],
    dark: [31, 41, 55] as [number, number, number],
    gray: [107, 114, 128] as [number, number, number],
    lightGray: [243, 244, 246] as [number, number, number],
    green: [21, 128, 61] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightBlue: [240, 249, 255] as [number, number, number],
    blueBorder: [191, 219, 254] as [number, number, number],
    lightGreen: [220, 252, 231] as [number, number, number],
  };

  // ==================== HEADER ====================
  // Blue header background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company name
  doc.setTextColor(...colors.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, margin, 14);

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyInfo.tagline, margin, 21);

  // Company contact details (right side)
  doc.setFontSize(8);
  const rightX = pageWidth - margin;
  doc.text(companyInfo.address, rightX, 9, { align: 'right' });
  doc.text(`Phone: ${companyInfo.phone} | Mobile: ${companyInfo.mobile}`, rightX, 15, { align: 'right' });
  doc.text(`Email: ${companyInfo.email} | Web: ${companyInfo.website}`, rightX, 21, { align: 'right' });
  doc.text(`GSTIN: ${companyInfo.gst} | PAN: ${companyInfo.pan}`, rightX, 27, { align: 'right' });

  // ==================== TITLE BAR ====================
  doc.setFillColor(...colors.dark);
  doc.rect(0, 35, pageWidth, 10, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth / 2, 42, { align: 'center' });

  y = 50;

  // ==================== CUSTOMER INFO (Left) ====================
  doc.setTextColor(...colors.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', margin, y);

  // Customer name
  doc.setTextColor(...colors.dark);
  doc.setFontSize(11);
  doc.text(quotation.customer_name, margin, y + 6);

  // Customer address
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(quotation.customer_address, 85);
  doc.text(addressLines, margin, y + 12);

  let customerY = y + 12 + (addressLines.length * 4);

  if (quotation.customer_gst) {
    doc.text(`GSTIN: ${quotation.customer_gst}`, margin, customerY);
    customerY += 5;
  }
  if (quotation.customer_phone) {
    doc.text(`Phone: ${quotation.customer_phone}`, margin, customerY);
    customerY += 5;
  }
  if (quotation.customer_email) {
    doc.text(`Email: ${quotation.customer_email}`, margin, customerY);
  }

  // ==================== QUOTATION INFO BOX (Right) ====================
  const boxX = pageWidth - margin - 70;
  const boxY = y - 3;

  // Box background
  doc.setFillColor(...colors.lightBlue);
  doc.setDrawColor(...colors.blueBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, 70, 38, 2, 2, 'FD');

  // Labels
  doc.setTextColor(...colors.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Quotation No:', boxX + 5, boxY + 8);
  doc.text('Date:', boxX + 5, boxY + 16);
  doc.text('Valid Until:', boxX + 5, boxY + 24);
  doc.text('Status:', boxX + 5, boxY + 32);

  // Values
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(quotation.quotation_number, boxX + 35, boxY + 8);

  doc.setTextColor(...colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(quotation.quotation_date), boxX + 35, boxY + 16);
  doc.text(formatDate(quotation.valid_until), boxX + 35, boxY + 24);

  doc.setTextColor(...colors.green);
  doc.setFont('helvetica', 'bold');
  doc.text('Active', boxX + 35, boxY + 32);

  y = Math.max(customerY + 8, boxY + 45);

  // ==================== ITEMS TABLE ====================
  const tableWidth = pageWidth - 2 * margin;
  const colWidths = [12, 52, 32, 26, 22, 24, 22];

  // Table header
  doc.setFillColor(...colors.dark);
  doc.rect(margin, y, tableWidth, 9, 'F');

  doc.setTextColor(...colors.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const headers = ['#', 'Description', 'Size (mm)', 'Spec', 'Qty', 'Rate', 'Amount'];
  let colX = margin;

  headers.forEach((header, i) => {
    const align = i >= 4 ? 'right' : 'left';
    const textX = align === 'right' ? colX + colWidths[i] - 3 : colX + 3;
    doc.text(header, textX, y + 6, { align: align as 'left' | 'right' });
    colX += colWidths[i];
  });

  y += 11;

  // Table rows
  quotation.items.forEach((item, index) => {
    // Page break check
    if (y > pageHeight - 85) {
      doc.addPage();
      y = margin;

      // Repeat header on new page
      doc.setFillColor(...colors.dark);
      doc.rect(margin, y, tableWidth, 9, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      colX = margin;
      headers.forEach((header, i) => {
        const align = i >= 4 ? 'right' : 'left';
        const textX = align === 'right' ? colX + colWidths[i] - 3 : colX + 3;
        doc.text(header, textX, y + 6, { align: align as 'left' | 'right' });
        colX += colWidths[i];
      });
      y += 11;
    }

    const rowHeight = item.notes ? 16 : 13;

    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(...colors.lightGray);
      doc.rect(margin, y - 2, tableWidth, rowHeight, 'F');
    }

    // Draw row border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowHeight - 2, margin + tableWidth, y + rowHeight - 2);

    colX = margin;

    // Column 1: #
    doc.setTextColor(...colors.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(index + 1), colX + 3, y + 4);
    colX += colWidths[0];

    // Column 2: Description
    doc.setFont('helvetica', 'bold');
    const boxName = (item.box_name || 'Corrugated Box').substring(0, 28);
    doc.text(boxName, colX + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    doc.text(`${item.box_type} | D:${item.deckle_size}mm | C:${item.cutting_size}mm`, colX + 3, y + 8);

    if (item.notes) {
      doc.setTextColor(...colors.primary);
      doc.text(`Note: ${item.notes.substring(0, 40)}`, colX + 3, y + 12);
    }
    colX += colWidths[1];

    // Column 3: Size
    doc.setTextColor(...colors.dark);
    doc.setFontSize(8);
    doc.text(`${item.length}x${item.width}x${item.height}`, colX + 3, y + 4);
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    doc.text('L x W x H', colX + 3, y + 8);
    colX += colWidths[2];

    // Column 4: Spec
    doc.setTextColor(...colors.dark);
    doc.setFontSize(8);
    doc.text(`${item.ply_count} Ply`, colX + 3, y + 4);
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    doc.text(`${item.flute_type} Flute`, colX + 3, y + 8);
    colX += colWidths[3];

    // Column 5: Qty
    doc.setTextColor(...colors.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.quantity), colX + colWidths[4] - 3, y + 5, { align: 'right' });
    colX += colWidths[4];

    // Column 6: Rate
    doc.setFont('helvetica', 'normal');
    doc.text(item.selling_price.toFixed(2), colX + colWidths[5] - 3, y + 5, { align: 'right' });
    colX += colWidths[5];

    // Column 7: Amount
    doc.setFont('helvetica', 'bold');
    doc.text(item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX + colWidths[6] - 3, y + 5, { align: 'right' });

    y += rowHeight;
  });

  y += 8;

  // Page break check before totals
  if (y > pageHeight - 100) {
    doc.addPage();
    y = margin;
  }

  // ==================== TOTALS ====================
  const totalsX = pageWidth - margin - 75;
  const totalsWidth = 75;

  // Helper function for total rows
  const drawTotalRow = (label: string, value: string, options?: {
    bold?: boolean;
    bgColor?: [number, number, number];
    textColor?: [number, number, number];
    height?: number;
    fontSize?: number;
  }) => {
    const opts = {
      bold: false,
      height: 7,
      fontSize: 9,
      ...options
    };

    if (opts.bgColor) {
      doc.setFillColor(...opts.bgColor);
      doc.rect(totalsX, y, totalsWidth, opts.height, 'F');
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(totalsX, y + opts.height, totalsX + totalsWidth, y + opts.height);

    doc.setTextColor(...(opts.textColor || colors.gray));
    doc.setFontSize(opts.fontSize);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.text(label, totalsX + 3, y + opts.height - 2);

    doc.setTextColor(...(opts.textColor || colors.dark));
    doc.text(value, totalsX + totalsWidth - 3, y + opts.height - 2, { align: 'right' });

    y += opts.height;
  };

  // Draw totals
  drawTotalRow('Subtotal:', formatCurrency(quotation.subtotal));

  if (quotation.discount_percent > 0) {
    drawTotalRow(
      `Discount (${quotation.discount_percent}%):`,
      `-${formatCurrency(quotation.discount_amount)}`,
      { textColor: colors.red }
    );
  }

  drawTotalRow('Taxable Amount:', formatCurrency(quotation.taxable_amount));

  if (quotation.cgst_percent > 0) {
    drawTotalRow(`CGST (${quotation.cgst_percent}%):`, formatCurrency(quotation.cgst_amount));
  }

  if (quotation.sgst_percent > 0) {
    drawTotalRow(`SGST (${quotation.sgst_percent}%):`, formatCurrency(quotation.sgst_amount));
  }

  if (quotation.igst_percent > 0) {
    drawTotalRow(`IGST (${quotation.igst_percent}%):`, formatCurrency(quotation.igst_amount));
  }

  // Grand Total
  drawTotalRow('Grand Total:', formatCurrency(quotation.total_amount), {
    bold: true,
    bgColor: colors.lightGreen,
    textColor: colors.green,
    height: 10,
    fontSize: 11,
  });

  y += 3;

  // Amount in words
  doc.setFillColor(...colors.lightGray);
  doc.rect(margin, y, tableWidth, 10, 'F');

  doc.setTextColor(...colors.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount in Words:', margin + 3, y + 6);

  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');

  const rupees = Math.floor(quotation.total_amount);
  const paise = Math.round((quotation.total_amount - rupees) * 100);
  let amountInWords = numberToWords(rupees) + ' Rupees';
  if (paise > 0) {
    amountInWords += ' and ' + numberToWords(paise) + ' Paise';
  }
  amountInWords += ' Only';

  doc.text(amountInWords, margin + 40, y + 6);

  y += 15;

  // Page break check before terms
  if (y > pageHeight - 65) {
    doc.addPage();
    y = margin;
  }

  // ==================== TERMS & BANK DETAILS ====================
  const halfWidth = (tableWidth - 10) / 2;

  // Terms & Conditions (Left)
  doc.setTextColor(...colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);

  const termsStartY = y + 5;
  const termsLines = doc.splitTextToSize(quotation.terms_conditions, halfWidth - 5);
  const maxTermsLines = Math.min(termsLines.length, 14);
  doc.text(termsLines.slice(0, maxTermsLines), margin, termsStartY);

  // Delivery & Payment terms
  const termsEndY = termsStartY + (maxTermsLines * 3) + 8;

  doc.setFontSize(8);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery:', margin, termsEndY);
  doc.setFont('helvetica', 'normal');
  const deliveryText = doc.splitTextToSize(quotation.delivery_terms, halfWidth - 25);
  doc.text(deliveryText[0] || '', margin + 20, termsEndY);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment:', margin, termsEndY + 5);
  doc.setFont('helvetica', 'normal');
  const paymentText = doc.splitTextToSize(quotation.payment_terms, halfWidth - 25);
  doc.text(paymentText[0] || '', margin + 20, termsEndY + 5);

  // Bank Details (Right)
  const bankX = margin + halfWidth + 10;

  doc.setTextColor(...colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details:', bankX, y);

  // Bank box
  const bankBoxY = y + 5;
  doc.setFillColor(...colors.lightBlue);
  doc.setDrawColor(...colors.blueBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(bankX, bankBoxY, halfWidth, 28, 2, 2, 'FD');

  // Bank labels
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  doc.text('Bank Name:', bankX + 3, bankBoxY + 7);
  doc.text('Account No:', bankX + 3, bankBoxY + 14);
  doc.text('IFSC Code:', bankX + 3, bankBoxY + 21);
  doc.text('Branch:', bankX + 3, bankBoxY + 28);

  // Bank values
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.bank_name, bankX + 28, bankBoxY + 7);
  doc.text(companyInfo.bank_account, bankX + 28, bankBoxY + 14);
  doc.text(companyInfo.bank_ifsc, bankX + 28, bankBoxY + 21);

  doc.setFont('helvetica', 'normal');
  const branchText = doc.splitTextToSize(companyInfo.bank_branch, halfWidth - 35);
  doc.text(branchText[0] || '', bankX + 28, bankBoxY + 28);

  // Signature
  const sigY = bankBoxY + 38;
  doc.setDrawColor(...colors.gray);
  doc.setLineWidth(0.3);
  doc.line(bankX + halfWidth - 55, sigY, bankX + halfWidth - 5, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Authorized Signatory', bankX + halfWidth - 30, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(companyInfo.name, bankX + halfWidth - 30, sigY + 9, { align: 'center' });

  // ==================== FOOTER ====================
  const footerY = pageHeight - 12;

  doc.setFillColor(...colors.lightGray);
  doc.rect(0, footerY - 8, pageWidth, 20, 'F');

  doc.setTextColor(...colors.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Thank you for your business! For queries, contact: ${companyInfo.email} | ${companyInfo.mobile}`,
    pageWidth / 2,
    footerY - 2,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text(
    'This is a computer generated quotation and does not require a signature.',
    pageWidth / 2,
    footerY + 3,
    { align: 'center' }
  );

  // ==================== SAVE PDF ====================
  doc.save(`${quotation.quotation_number}.pdf`);
};

// ============ EXPORTS ============
export const getCompanyInfo = (): CompanyInfo => ({ ...companyInfo });

export const updateCompanyInfo = (info: Partial<CompanyInfo>): void => {
  Object.assign(companyInfo, info);
};

export default generateQuotationPDF;