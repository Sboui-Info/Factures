import { DocumentType, Invoice, InvoiceItem, InvoiceStatus, PaymentMethod, PaymentRecord } from '../types/invoice';

export const formatCurrency = (amount: number, currencySymbol: string = 'د.ت'): string => {
  // If Tunisian Dinar, format with 3 decimal places (millimes)
  const isTND = currencySymbol === 'د.ت' || currencySymbol === 'TND';
  const decimals = isTND ? 3 : 2;

  const formattedNumber = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${formattedNumber} ${currencySymbol}`;
};

export const formatNumberOnly = (amount: number, isTND: boolean = true): string => {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: isTND ? 3 : 2,
    maximumFractionDigits: isTND ? 3 : 2,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('ar-TN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const formatDateSimple = (dateStr: string): string => {
  if (!dateStr) return '-';
  return dateStr;
};

export interface StatusConfig {
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const statusConfigMap: Record<InvoiceStatus, StatusConfig> = {
  paid: {
    label: 'خالصة بالكامل',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
  },
  partial: {
    label: 'خالصة جزئياً',
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-200',
  },
  unpaid: {
    label: 'غير خالصة / في الانتظار',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
  },
  overdue: {
    label: 'متأخرة عن الأجل',
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50/70',
    borderColor: 'border-rose-200',
  },
  delivered: {
    label: 'تم التسليم والاستلام',
    dotColor: 'bg-teal-500',
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-50/70',
    borderColor: 'border-teal-200',
  },
  invoiced: {
    label: 'تمت الفوترة (مفوتر)',
    dotColor: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    bgColor: 'bg-indigo-50/80',
    borderColor: 'border-indigo-200',
  },
  draft: {
    label: 'مسودة',
    dotColor: 'bg-slate-400',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  cancelled: {
    label: 'ملغاة',
    dotColor: 'bg-zinc-400',
    textColor: 'text-zinc-500',
    bgColor: 'bg-zinc-50',
    borderColor: 'border-zinc-200',
  },
};

export const documentTypeLabels: Record<DocumentType, { ar: string; fr: string; prefix: string; short: string }> = {
  invoice: {
    ar: 'فاتورة',
    fr: 'Facture',
    prefix: 'FAC',
    short: 'فاتورة',
  },
  delivery_note: {
    ar: 'وصل استلام / تسليم',
    fr: 'Bon de Livraison (BL)',
    prefix: 'BL',
    short: 'وصل استلام',
  },
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cheque: 'شيك بنكي (Chèque)',
  bank_transfer: 'تحويل بنكي (Virement)',
  cash: 'نقداً (Espèces)',
  traite: 'كمبيالة (Traite)',
  card: 'بطاقة بنكية (Carte)',
};

export const calculateItemTotal = (item: Omit<InvoiceItem, 'id' | 'total'>): number => {
  const lineSubtotal = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0));
  const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;
  return Number((lineSubtotal + lineTax).toFixed(3));
};

export const isOverdueDate = (dueDateStr?: string, remainingBalance: number = 0): boolean => {
  if (!dueDateStr || remainingBalance <= 0.001) return false;
  try {
    const parts = dueDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // End of the due date day (23:59:59)
        const dueTime = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
        return Date.now() > dueTime;
      }
    }
  } catch {
    // Fallback if parsing fails
  }
  return false;
};

export const determineFinancialStatus = (
  total: number,
  amountPaid: number,
  balanceDue: number,
  dueDate?: string,
  docType: DocumentType = 'invoice',
  currentStatus?: InvoiceStatus,
  convertedToInvoiceNumber?: string
): InvoiceStatus => {
  // If the delivery note has been converted to an invoice or marked as invoiced
  if (currentStatus === 'invoiced' || (docType === 'delivery_note' && Boolean(convertedToInvoiceNumber))) {
    return 'invoiced';
  }

  // If explicitly draft or cancelled AND zero payments have been recorded
  if (currentStatus === 'draft' && amountPaid <= 0.001) {
    return 'draft';
  }
  if (currentStatus === 'cancelled' && amountPaid <= 0.001) {
    return 'cancelled';
  }

  // 1. FULL PAYMENT (خالصة بالكامل):
  // When total is positive and balance due is zero or less
  if (total > 0 && balanceDue <= 0.001 && amountPaid >= total - 0.001) {
    return 'paid';
  }

  const pastDue = isOverdueDate(dueDate, balanceDue);

  // 2. PARTIAL PAYMENT (خالصة جزئياً):
  // When money has been paid, but there is still an outstanding balance
  if (amountPaid > 0.001 && balanceDue > 0.001) {
    // If the due date has expired, mark as overdue because debt remains past deadline
    return pastDue ? 'overdue' : 'partial';
  }

  // 3. ZERO PAYMENTS (لم يُدفع أي مليم):
  if (amountPaid <= 0.001) {
    if (pastDue && total > 0) {
      return 'overdue';
    }

    // For delivery notes with 0 payments and not past due
    if (docType === 'delivery_note') {
      return currentStatus === 'unpaid' ? 'unpaid' : 'delivered';
    }

    return 'unpaid';
  }

  return 'unpaid';
};

export const calculateInvoiceSummary = (
  items: InvoiceItem[],
  payments: PaymentRecord[] = [],
  currentStatus?: InvoiceStatus,
  dueDate?: string,
  timbreFiscal: number = 0,
  docType: DocumentType = 'invoice',
  convertedToInvoiceNumber?: string
) => {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const baseLine = qty * price;
    const afterDisc = Math.max(0, baseLine - disc);
    const tax = (afterDisc * taxRate) / 100;

    subtotal += baseLine;
    discountTotal += disc;
    taxTotal += tax;
  }

  // Stamp tax only applied on invoices unless specified
  const effectiveTimbre = docType === 'invoice' ? (Number(timbreFiscal) || 0) : 0;
  const total = Number(Math.max(0, subtotal - discountTotal + taxTotal + effectiveTimbre).toFixed(3));
  const amountPaid = Number(
    payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(3)
  );
  const balanceDue = Number(Math.max(0, total - amountPaid).toFixed(3));

  // Determine status strictly based on financial movement rules
  const status = determineFinancialStatus(
    total,
    amountPaid,
    balanceDue,
    dueDate,
    docType,
    currentStatus,
    convertedToInvoiceNumber
  );

  return {
    subtotal: Number(subtotal.toFixed(3)),
    taxTotal: Number(taxTotal.toFixed(3)),
    timbreFiscal: Number(effectiveTimbre.toFixed(3)),
    discountTotal: Number(discountTotal.toFixed(3)),
    total,
    amountPaid,
    balanceDue,
    status,
  };
};

export const syncInvoiceFinancials = (inv: Invoice): Invoice => {
  const isInvoicedDelivery =
    inv.documentType === 'delivery_note' &&
    (inv.status === 'invoiced' || Boolean(inv.convertedToInvoiceNumber));

  const summary = calculateInvoiceSummary(
    inv.items || [],
    inv.payments || [],
    isInvoicedDelivery ? 'invoiced' : inv.status,
    inv.dueDate,
    inv.timbreFiscal || 0,
    inv.documentType,
    inv.convertedToInvoiceNumber
  );

  return {
    ...inv,
    subtotal: summary.subtotal,
    taxTotal: summary.taxTotal,
    timbreFiscal: summary.timbreFiscal,
    discountTotal: summary.discountTotal,
    total: summary.total,
    amountPaid: summary.amountPaid,
    // When a delivery note is converted to an invoice, the financial liability is transferred to the invoice, so the BL itself does not carry remaining debt
    balanceDue: isInvoicedDelivery ? 0 : summary.balanceDue,
    status: isInvoicedDelivery ? 'invoiced' : summary.status,
  };
};

export const generateNextDocNumber = (invoices: Invoice[], docType: DocumentType): string => {
  const currentYear = new Date().getFullYear();
  const prefix = docType === 'invoice' ? 'FAC' : 'BL';
  let maxSeq = 0;

  for (const inv of invoices) {
    if (inv.documentType === docType) {
      const regex = new RegExp(`(?:${prefix}-)?(\\d{4})-(\\d+)`, 'i');
      const match = inv.invoiceNumber.match(regex);
      if (match && Number(match[1]) === currentYear) {
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}-${currentYear}-${nextSeq}`;
};

export const exportToCSV = (invoices: Invoice[], currencySymbol: string = 'د.ت') => {
  const headers = [
    'نوع الوثيقة',
    'الرقم',
    'الحريف (العميل)',
    'المؤسسة',
    'المعرف الجبائي',
    'تاريخ الإصدار',
    'أجل الخلاص',
    'الحالة',
    `المجموع الخام HT (${currencySymbol})`,
    `الأداء TVA (${currencySymbol})`,
    `طابع جبائي (${currencySymbol})`,
    `المبلغ الجملي TTC (${currencySymbol})`,
    `المدفوع (${currencySymbol})`,
    `المتبقي (${currencySymbol})`,
  ];

  const rows = invoices.map((inv) => [
    `"${documentTypeLabels[inv.documentType]?.ar || inv.documentType}"`,
    `"${inv.invoiceNumber}"`,
    `"${inv.client.name.replace(/"/g, '""')}"`,
    `"${(inv.client.company || '').replace(/"/g, '""')}"`,
    `"${(inv.client.taxNumber || '').replace(/"/g, '""')}"`,
    `"${inv.issueDate}"`,
    `"${inv.dueDate}"`,
    `"${statusConfigMap[inv.status]?.label || inv.status}"`,
    inv.subtotal.toFixed(3),
    inv.taxTotal.toFixed(3),
    (inv.timbreFiscal || 0).toFixed(3),
    inv.total.toFixed(3),
    inv.amountPaid.toFixed(3),
    inv.balanceDue.toFixed(3),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `جدول_الفواتير_ووصولات_الاستلام_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportBackupJSON = (invoices: Invoice[], settings: unknown) => {
  const backupPayload = {
    version: '2.0-TN',
    exportDate: new Date().toISOString(),
    invoices,
    settings,
  };

  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `نسخة_احتياطية_فواتير_تونس_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
