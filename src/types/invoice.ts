export type DocumentType = 'invoice' | 'delivery_note';

export type InvoiceStatus = 'paid' | 'unpaid' | 'partial' | 'overdue' | 'draft' | 'cancelled' | 'delivered' | 'invoiced';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'traite';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // Prix Unitaire HT
  taxRate: number; // TVA e.g. 19% or 7% or 13% or 0%
  discount: number; // Remise
  unit?: string; // e.g. قطعة, كغ, متر, ساعة
  total: number; // Total TTC
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Client {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  taxNumber?: string; // المعرف الجبائي Matricule Fiscal
  commercialRegistration?: string; // السجل التجاري RC
  address?: string;
  city?: string;
}

export interface CompanySettings {
  name: string;
  commercialRegistration?: string; // السجل التجاري RC
  taxNumber: string; // المعرف الجبائي Matricule Fiscal (MF)
  address: string;
  phone: string;
  email: string;
  bankName: string;
  rib: string; // الحساب البنكي RIB (20 chiffres)
  defaultTaxRate: number; // TVA par défaut (19%)
  timbreFiscal: number; // الطابع الجبائي (1.000 د.ت في تونس)
  defaultCurrency: string;
  currencySymbol: string;
  terms: string;
  notes: string;
}

export interface Invoice {
  id: string;
  documentType: DocumentType; // 'invoice' (فاتورة) أو 'delivery_note' (وصل استلام/تسليم)
  invoiceNumber: string; // e.g. FAC-2026-001 أو BL-2026-001
  issueDate: string;
  dueDate: string;
  client: Client;
  items: InvoiceItem[];
  payments: PaymentRecord[];
  subtotal: number; // Total HT (خام دون أداء)
  taxTotal: number; // Total TVA (مجموع الأداء على القيمة المضافة)
  timbreFiscal: number; // طابع جبائي
  discountTotal: number; // مجموع التخفيضات
  total: number; // Total TTC (المبلغ الجملي الصافي للدفع)
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  currency: string;
  convertedFromDeliveryId?: string; // إذا تم تحويله من وصل تسليم
  convertedToInvoiceNumber?: string; // رقم الفاتورة المحول إليها وصل الاستلام
  createdAt: string;
  updatedAt: string;
}

export type FilterStatus = 'all' | InvoiceStatus;
export type FilterDocType = 'all' | DocumentType;
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'due-date';
export type DateFilter = 'all' | 'this_month' | 'last_month' | 'this_year';

export interface HistoryStep {
  id: string;
  description: string;
  invoices: Invoice[];
  timestamp: number;
}
