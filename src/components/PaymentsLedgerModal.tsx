import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  Trash2, 
  Receipt, 
  ArrowUpDown, 
  Landmark, 
  Banknote, 
  FileText,
  PackageCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Invoice, PaymentMethod, PaymentRecord } from '../types/invoice';
import { formatCurrency, paymentMethodLabels } from '../utils/formatters';

interface PaymentsLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  currencySymbol: string;
  onViewInvoice: (invoice: Invoice) => void;
  onDeletePayment: (invoiceId: string, paymentId: string) => void;
}

// Flat item representing an individual payment movement linked to its parent invoice
interface FlatPaymentEntry {
  payment: PaymentRecord;
  invoice: Invoice;
}

export const PaymentsLedgerModal: React.FC<PaymentsLedgerModalProps> = ({
  isOpen,
  onClose,
  invoices,
  currencySymbol,
  onViewInvoice,
  onDeletePayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'invoice' | 'delivery_note'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Extract all payment entries from all documents
  const allPaymentEntries = useMemo(() => {
    const entries: FlatPaymentEntry[] = [];
    invoices.forEach((inv) => {
      if (Array.isArray(inv.payments)) {
        inv.payments.forEach((pay) => {
          entries.push({
            payment: pay,
            invoice: inv,
          });
        });
      }
    });
    return entries;
  }, [invoices]);

  // Financial aggregates across all payments
  const totalCollectedAll = useMemo(() => {
    return allPaymentEntries.reduce((sum, item) => sum + (Number(item.payment.amount) || 0), 0);
  }, [allPaymentEntries]);

  // Method breakdowns
  const methodStats = useMemo(() => {
    const stats: Record<PaymentMethod, { total: number; count: number }> = {
      cheque: { total: 0, count: 0 },
      bank_transfer: { total: 0, count: 0 },
      cash: { total: 0, count: 0 },
      traite: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
    };

    allPaymentEntries.forEach(({ payment }) => {
      const m = payment.method || 'cash';
      if (stats[m]) {
        stats[m].total += Number(payment.amount) || 0;
        stats[m].count += 1;
      }
    });

    return stats;
  }, [allPaymentEntries]);

  // Date filtering logic helper
  const isDateInRange = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    if (!dateStr) return false;

    const pDate = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return dateStr === todayStr;
    }

    if (dateFilter === 'this_month') {
      return (
        pDate.getFullYear() === now.getFullYear() &&
        pDate.getMonth() === now.getMonth()
      );
    }

    if (dateFilter === 'last_month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        pDate.getFullYear() === lastMonthDate.getFullYear() &&
        pDate.getMonth() === lastMonthDate.getMonth()
      );
    }

    if (dateFilter === 'this_year') {
      return pDate.getFullYear() === now.getFullYear();
    }

    if (dateFilter === 'custom') {
      if (customStartDate && dateStr < customStartDate) return false;
      if (customEndDate && dateStr > customEndDate) return false;
      return true;
    }

    return true;
  };

  // Filtered & sorted entries
  const filteredEntries = useMemo(() => {
    return allPaymentEntries
      .filter(({ payment, invoice }) => {
        // Document type filter
        if (docTypeFilter !== 'all' && invoice.documentType !== docTypeFilter) {
          return false;
        }

        // Method filter
        if (methodFilter !== 'all' && payment.method !== methodFilter) {
          return false;
        }

        // Date filter
        if (!isDateInRange(payment.date)) {
          return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchClient = (invoice.client.name || '').toLowerCase().includes(q);
          const matchCompany = (invoice.client.company || '').toLowerCase().includes(q);
          const matchDocNum = (invoice.invoiceNumber || '').toLowerCase().includes(q);
          const matchRef = (payment.reference || '').toLowerCase().includes(q);
          const matchNotes = (payment.notes || '').toLowerCase().includes(q);
          const matchMethod = (paymentMethodLabels[payment.method] || '').toLowerCase().includes(q);

          if (!matchClient && !matchCompany && !matchDocNum && !matchRef && !matchNotes && !matchMethod) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.payment.date).getTime() || 0;
        const dateB = new Date(b.payment.date).getTime() || 0;
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [allPaymentEntries, docTypeFilter, methodFilter, dateFilter, customStartDate, customEndDate, searchTerm, sortOrder]);

  // Aggregate of currently filtered entries
  const filteredTotal = useMemo(() => {
    return filteredEntries.reduce((sum, item) => sum + (Number(item.payment.amount) || 0), 0);
  }, [filteredEntries]);

  // Export current filtered ledger to Excel
  const handleExportToExcel = () => {
    if (filteredEntries.length === 0) {
      alert('لا توجد مقبوضات لتصديرها وفق الفلترة المحددة');
      return;
    }

    const excelData = filteredEntries.map((item, index) => ({
      'الرقم': index + 1,
      'تاريخ الخلاص': item.payment.date,
      'نوع الوثيقة': item.invoice.documentType === 'delivery_note' ? 'وصل استلام (BL)' : 'فاتورة (FAC)',
      'رقم الوثيقة': item.invoice.invoiceNumber,
      'اسم الحريف': item.invoice.client.name,
      'الشركة': item.invoice.client.company || '-',
      'المعرف الجبائي': item.invoice.client.taxNumber || '-',
      'طريقة الخلاص': paymentMethodLabels[item.payment.method] || item.payment.method,
      'الرقم المرجعي (شيك/حوالة)': item.payment.reference || '-',
      'المبلغ المقبوض (د.ت)': Number(item.payment.amount.toFixed(3)),
      'المبلغ الجملي للوثيقة (د.ت)': Number(item.invoice.total.toFixed(3)),
      'المتبقي في الذمة (د.ت)': Number(item.invoice.balanceDue.toFixed(3)),
      'البيان والملاحظات': item.payment.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل المقبوضات');

    // Auto-fit columns
    const colWidths = [
      { wch: 6 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 35 },
    ];
    worksheet['!cols'] = colWidths;

    const dateStamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Journal_Encaissements_${dateStamp}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 no-print">
      <div className="bg-white rounded-3xl max-w-6xl 2xl:max-w-7xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-900 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-1 ring-white/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  سجل الدفعات والمقبوضات المالية للمراجعة
                </h2>
                <span className="inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {allPaymentEntries.length} عملية خلاص مسجلة
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                متابعة دقيقة لكافة الحركات المالية، المقبوضات النقدية، الشيكات البنكية والتحويلات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportToExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 rounded-xl transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer"
              title="تصدير سجل المقبوضات الحالي إلى ملف Excel XLSX"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer"
              title="طباعة كشف المقبوضات"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">طباعة الكشف</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FINANCIAL SUMMARY CARDS ROW (Apple Squircle KPI Style) */}
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Card 1: Total All Receipts */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>إجمالي المقبوضات</span>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-700 tracking-tight">
              {formatCurrency(totalCollectedAll, currencySymbol)}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              من كافة الفواتير والوصولات
            </div>
          </div>

          {/* Card 2: Cheques */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>الشيكات البنكية</span>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(methodStats.cheque.total, currencySymbol)}
            </div>
            <div className="text-[11px] font-bold text-indigo-700 mt-1">
              {methodStats.cheque.count} شيك مسجل
            </div>
          </div>

          {/* Card 3: Bank Transfers */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>التحويلات البنكية</span>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(methodStats.bank_transfer.total, currencySymbol)}
            </div>
            <div className="text-[11px] font-bold text-sky-700 mt-1">
              {methodStats.bank_transfer.count} حوالة بنكية
            </div>
          </div>

          {/* Card 4: Cash */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>نقداً (خزينة)</span>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white flex items-center justify-center">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(methodStats.cash.total, currencySymbol)}
            </div>
            <div className="text-[11px] font-bold text-emerald-700 mt-1">
              {methodStats.cash.count} عملية نقدية
            </div>
          </div>

          {/* Card 5: Traites & Cards */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>كمبيالات وبطاقات</span>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 tracking-tight">
              {formatCurrency(methodStats.traite.total + methodStats.card.total, currencySymbol)}
            </div>
            <div className="text-[11px] font-bold text-amber-700 mt-1">
              {methodStats.traite.count + methodStats.card.count} حركة مالية
            </div>
          </div>

        </div>

        {/* MULTI-FILTER & SEARCH TOOLBAR */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث باسم الحريف، رقم الوثيقة (FAC / BL)، رقم الشيك أو الحوالة، البيان..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 rounded-xl border border-slate-200 focus:outline-hidden focus:border-slate-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Document Type Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  docTypeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة الوثائق
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('invoice')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  docTypeFilter === 'invoice'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فواتير (FAC)
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('delivery_note')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  docTypeFilter === 'delivery_note'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                وصولات استلام (BL)
              </button>
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title="تغيير اتجاه ترتيب التاريخ"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
            </button>
          </div>

          {/* Secondary Filter Row: Payment Method and Date Period */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Method Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">طريقة الخلاص:</span>
              {(['all', 'cheque', 'bank_transfer', 'cash', 'traite', 'card'] as const).map((method) => {
                const isSelected = methodFilter === method;
                const label = method === 'all' ? 'الكل' : paymentMethodLabels[method];
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setMethodFilter(method)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 cursor-pointer"
              >
                <option value="all">كافة الفترات</option>
                <option value="today">اليوم</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر السابق</option>
                <option value="this_year">هذه السنة</option>
                <option value="custom">فترة مخصصة...</option>
              </select>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md font-mono"
                  />
                  <span className="text-slate-400">إلى</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredEntries.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا توجد عمليات مقبوضات مطابقة</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                لم يتم العثور على أي حركة خلاص مالية وفق معايير البحث والفلترة المختارة. جرب تغيير الفلترة.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold select-none">
                  <tr>
                    <th className="py-3 px-4">تاريخ الخلاص</th>
                    <th className="py-3 px-4">الوثيقة</th>
                    <th className="py-3 px-4">الحريف</th>
                    <th className="py-3 px-4">طريقة الخلاص</th>
                    <th className="py-3 px-4">الرقم المرجعي</th>
                    <th className="py-3 px-4">المبلغ المقبوض</th>
                    <th className="py-3 px-4">المتبقي بالوثيقة</th>
                    <th className="py-3 px-4">البيان والملاحظات</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map(({ payment, invoice }) => {
                    const isDelivery = invoice.documentType === 'delivery_note';

                    // Payment Method Badge Style
                    const methodBadgeClasses = {
                      cheque: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                      bank_transfer: 'bg-sky-50 text-sky-800 border-sky-200',
                      cash: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      traite: 'bg-amber-50 text-amber-800 border-amber-200',
                      card: 'bg-purple-50 text-purple-800 border-purple-200',
                    }[payment.method] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Date */}
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-800 whitespace-nowrap">
                          {payment.date}
                        </td>

                        {/* Associated Document */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              onViewInvoice(invoice);
                              onClose();
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer text-right"
                            title="معاينة هذه الوثيقة مباشرة"
                          >
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border font-mono transition-transform group-hover:scale-105 ${
                                isDelivery
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {invoice.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                              {isDelivery ? '(BL)' : '(FAC)'}
                            </span>
                          </button>
                        </td>

                        {/* Client */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{invoice.client.name}</div>
                          {invoice.client.company && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              {invoice.client.company}
                            </div>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${methodBadgeClasses}`}>
                            {paymentMethodLabels[payment.method] || payment.method}
                          </span>
                        </td>

                        {/* Reference (Cheque / Transfer Number) */}
                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {payment.reference ? (
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 font-bold">
                              {payment.reference}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Payment Amount */}
                        <td className="py-3 px-4 font-mono tabular-nums text-sm font-black text-emerald-700 whitespace-nowrap">
                          {formatCurrency(payment.amount, currencySymbol)}
                        </td>

                        {/* Remaining Document Balance */}
                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          {invoice.balanceDue <= 0.001 ? (
                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              خالصة بالكامل
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold">
                              {formatCurrency(invoice.balanceDue, currencySymbol)}
                            </span>
                          )}
                        </td>

                        {/* Notes / Details */}
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={payment.notes}>
                          {payment.notes || <span className="text-slate-400">-</span>}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Preview Document */}
                            <button
                              type="button"
                              onClick={() => {
                                onViewInvoice(invoice);
                                onClose();
                              }}
                              title="معاينة الوثيقة المرتبطة"
                              className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-200 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Payment */}
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من حذف هذه الدفعة بقيمة (${formatCurrency(
                                      payment.amount,
                                      currencySymbol
                                    )}) للوثيقة ${invoice.invoiceNumber}؟ سيتم إعادة احتساب الرصيد وتحديث الحالة تلقائياً.`
                                  )
                                ) {
                                  onDeletePayment(invoice.id, payment.id);
                                }
                              }}
                              title="حذف هذه الدفعة وإعادة احتساب الرصيد"
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER WITH TOTALS */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 flex-wrap">
            <span>
              العمليات المعروضة: <strong className="font-mono text-slate-900">{filteredEntries.length}</strong> من أصل {allPaymentEntries.length}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              إجمالي مبالغ المقبوضات المعروضة: <strong className="font-mono text-base font-black text-emerald-700">{formatCurrency(filteredTotal, currencySymbol)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
