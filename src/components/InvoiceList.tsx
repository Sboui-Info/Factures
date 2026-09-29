import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Printer, 
  PlusCircle, 
  Pencil, 
  Copy, 
  Trash2, 
  ArrowUpDown,
  Calendar,
  AlertCircle,
  PackageCheck,
  FileText,
  FileCheck
} from 'lucide-react';
import { DateFilter, FilterDocType, FilterStatus, Invoice, SortOption } from '../types/invoice';
import { formatCurrency, isOverdueDate, statusConfigMap } from '../utils/formatters';

interface InvoiceListProps {
  invoices: Invoice[];
  currencySymbol: string;
  onViewInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onAddPayment: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onConvertToInvoice: (deliveryNote: Invoice) => void;
  onNewInvoice: () => void;
  onNewDeliveryNote: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  currencySymbol,
  onViewInvoice,
  onPrintInvoice,
  onAddPayment,
  onEditInvoice,
  onDuplicateInvoice,
  onDeleteInvoice,
  onConvertToInvoice,
  onNewInvoice,
  onNewDeliveryNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<FilterDocType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  // Counts for status tabs strictly aligned with financial movements
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      unpaid: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
      delivered: 0,
      invoiced: 0,
      draft: 0,
    };

    invoices.forEach((inv) => {
      if (docTypeFilter === 'all' || inv.documentType === docTypeFilter) {
        counts.all++;
        const isInvoiced = inv.status === 'invoiced' || Boolean(inv.convertedToInvoiceNumber);
        const pastDue = isOverdueDate(inv.dueDate, inv.balanceDue);

        if (isInvoiced) {
          counts.invoiced++;
          return;
        }

        if (inv.status === 'draft') {
          counts.draft++;
        }
        if (inv.status === 'paid' || (inv.total > 0 && inv.balanceDue <= 0.001)) {
          counts.paid++;
        }
        if (inv.status === 'partial' || (inv.amountPaid > 0.001 && inv.balanceDue > 0.001)) {
          counts.partial++;
        }
        if (inv.status === 'overdue' || (inv.balanceDue > 0.001 && pastDue)) {
          counts.overdue++;
        }
        if (inv.amountPaid <= 0.001 && !pastDue && inv.status !== 'draft') {
          counts.unpaid++;
        }
        if (inv.documentType === 'delivery_note') {
          counts.delivered++;
        }
      }
    });

    return counts;
  }, [invoices, docTypeFilter]);

  // Counts for doc types
  const docTypeCounts = useMemo(() => {
    return {
      all: invoices.length,
      invoice: invoices.filter((i) => i.documentType === 'invoice').length,
      delivery_note: invoices.filter((i) => i.documentType === 'delivery_note').length,
    };
  }, [invoices]);

  // Filter and sort invoices strictly adhering to financial state
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Doc type filter
        if (docTypeFilter !== 'all' && inv.documentType !== docTypeFilter) {
          return false;
        }

        // Status filter strictly adhering to financial state
        if (statusFilter !== 'all') {
          const isInvoiced = inv.status === 'invoiced' || Boolean(inv.convertedToInvoiceNumber);
          const pastDue = isOverdueDate(inv.dueDate, inv.balanceDue);

          if (statusFilter === 'invoiced') {
            if (!isInvoiced) return false;
          } else if (statusFilter === 'paid') {
            if (isInvoiced) return false;
            if (!(inv.status === 'paid' || (inv.total > 0 && inv.balanceDue <= 0.001))) return false;
          } else if (statusFilter === 'partial') {
            if (isInvoiced) return false;
            if (!(inv.status === 'partial' || (inv.amountPaid > 0.001 && inv.balanceDue > 0.001))) return false;
          } else if (statusFilter === 'overdue') {
            if (isInvoiced) return false;
            if (!(inv.status === 'overdue' || (inv.balanceDue > 0.001 && pastDue))) return false;
          } else if (statusFilter === 'unpaid') {
            if (isInvoiced) return false;
            if (!(inv.status === 'unpaid' || (inv.amountPaid <= 0.001 && !pastDue && inv.status !== 'draft'))) return false;
          } else if (statusFilter === 'delivered') {
            if (isInvoiced) return false;
            if (!(inv.status === 'delivered' || inv.documentType === 'delivery_note')) return false;
          } else if (statusFilter === 'draft') {
            if (inv.status !== 'draft') return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesNumber = inv.invoiceNumber.toLowerCase().includes(q);
          const matchesClient = inv.client.name.toLowerCase().includes(q);
          const matchesCompany = (inv.client.company || '').toLowerCase().includes(q);
          const matchesTaxNum = (inv.client.taxNumber || '').toLowerCase().includes(q);
          const matchesAmount = inv.total.toString().includes(q);
          const matchesItem = inv.items.some((i) => i.description.toLowerCase().includes(q));

          if (!matchesNumber && !matchesClient && !matchesCompany && !matchesTaxNum && !matchesAmount && !matchesItem) {
            return false;
          }
        }

        // Date filter
        if (dateFilter !== 'all') {
          const invDate = new Date(inv.issueDate);
          const now = new Date();

          if (dateFilter === 'this_month') {
            if (
              invDate.getFullYear() !== now.getFullYear() ||
              invDate.getMonth() !== now.getMonth()
            ) {
              return false;
            }
          } else if (dateFilter === 'last_month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (
              invDate.getFullYear() !== lastMonth.getFullYear() ||
              invDate.getMonth() !== lastMonth.getMonth()
            ) {
              return false;
            }
          } else if (dateFilter === 'this_year') {
            if (invDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
        }
        if (sortBy === 'amount-desc') {
          return b.total - a.total;
        }
        if (sortBy === 'amount-asc') {
          return a.total - b.total;
        }
        if (sortBy === 'due-date') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
  }, [invoices, docTypeFilter, statusFilter, searchQuery, dateFilter, sortBy]);

  const filterTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'الجميع', count: statusCounts.all },
    { id: 'unpaid', label: 'غير خالصة / في الانتظار', count: statusCounts.unpaid },
    { id: 'partial', label: 'خالصة جزئياً', count: statusCounts.partial },
    { id: 'paid', label: 'خالصة بالكامل', count: statusCounts.paid },
    { id: 'invoiced', label: 'تمت فوترتها', count: statusCounts.invoiced },
    { id: 'delivered', label: 'تم الاستلام والتسليم', count: statusCounts.delivered },
    { id: 'overdue', label: 'متأخرة عن الأجل', count: statusCounts.overdue },
    { id: 'draft', label: 'مسودات', count: statusCounts.draft },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden no-print">
      
      {/* Top Filter and Search Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-200/90 space-y-5">
        
        {/* Document Type Switcher: All vs Invoices vs Delivery Notes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-800 ml-1">عرض الوثائق:</span>
            <div className="inline-flex p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 ${
                  docTypeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة الوثائق ({docTypeCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('invoice')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-2 ${
                  docTypeFilter === 'invoice'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="w-5 h-5 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-2xs">
                  <FileText className="w-3 h-3 text-white" />
                </div>
                <span>فواتير ({docTypeCounts.invoice})</span>
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('delivery_note')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 flex items-center gap-2 ${
                  docTypeFilter === 'delivery_note'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="w-5 h-5 rounded-lg bg-teal-500 text-white flex items-center justify-center shadow-2xs">
                  <PackageCheck className="w-3 h-3 text-white" />
                </div>
                <span>وصولات استلام BL ({docTypeCounts.delivery_note})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onNewDeliveryNote}
              className="group text-sm font-bold text-teal-950 bg-teal-50 hover:bg-teal-100/90 border border-teal-200/90 px-4 py-2.5 rounded-2xl transition-all duration-150 flex items-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <PackageCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span>+ وصل استلام جديد</span>
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="group text-sm font-bold text-blue-950 bg-blue-50 hover:bg-blue-100/90 border border-blue-200/90 px-4 py-2.5 rounded-2xl transition-all duration-150 flex items-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span>+ فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs (Enlarged and Clear) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700 font-semibold'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls (Large Inputs) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالرقم، الحريف، الشركة، المعرف الجبائي، السلعة..."
              className="w-full pr-11 pl-4 py-2.5 text-base bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded"
              >
                مسح
              </button>
            )}
          </div>

          {/* Date & Sort Filters */}
          <div className="flex items-center gap-2.5">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="bg-transparent text-sm text-slate-800 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="all">كل الفترات</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر السابق</option>
                <option value="this_year">هذا العام</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
              <ArrowUpDown className="w-4 h-4 text-slate-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-sm text-slate-800 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="date-desc">الأحدث إصداراً</option>
                <option value="date-asc">الأقدم إصداراً</option>
                <option value="due-date">الأقرب لأجل الخلاص</option>
                <option value="amount-desc">الأعلى قيمة</option>
                <option value="amount-asc">الأقل قيمة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table (Enlarged fonts and high visibility) */}
      {filteredInvoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-700 tracking-wider">
                <th className="py-4 px-5">الوثيقة والرقم</th>
                <th className="py-4 px-5">الحريف (العميل) والمؤسسة</th>
                <th className="py-4 px-5">تاريخ التحرير والأجل</th>
                <th className="py-4 px-5">الحالة</th>
                <th className="py-4 px-5 text-left">المبلغ الجملي TTC</th>
                <th className="py-4 px-5 text-left">المستخلص / المتبقي</th>
                <th className="py-4 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {filteredInvoices.map((inv) => {
                const statusMeta = statusConfigMap[inv.status];
                const isOverdue = inv.status === 'overdue';
                const isDeliveryNote = inv.documentType === 'delivery_note';

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Document Number & Type Indicator */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isDeliveryNote
                              ? 'bg-teal-100 text-teal-900 border border-teal-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {isDeliveryNote ? 'BL' : 'FAC'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          className="font-mono tabular-nums text-base font-extrabold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer text-start"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </div>
                      {inv.convertedFromDeliveryId && (
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                          مستخرجة من وصل تسليم
                        </div>
                      )}
                    </td>

                    {/* Client & Company */}
                    <td className="py-4 px-5">
                      <div className="text-base font-bold text-slate-900">{inv.client.name}</div>
                      <div className="text-sm text-slate-600 font-medium flex items-center gap-2 flex-wrap mt-0.5">
                        {inv.client.company && <span>{inv.client.company}</span>}
                        {inv.client.taxNumber && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="font-mono text-xs font-bold text-slate-500">M.F: {inv.client.taxNumber}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Issue Date & Due Date */}
                    <td className="py-4 px-5">
                      <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {inv.issueDate}
                      </div>
                      <div className={`text-xs font-mono tabular-nums mt-0.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'}`}>
                        {isDeliveryNote ? 'التسليم: ' : 'الأجل: '}
                        {inv.dueDate}
                      </div>
                    </td>

                    {/* Status with Direct Financial Reflection */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusMeta.dotColor}`} />
                          <span className={`text-sm font-bold ${statusMeta.textColor}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        {/* Converted to invoice pill */}
                        {inv.convertedToInvoiceNumber && (
                          <span className="text-[11px] font-mono tabular-nums font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/90 w-fit">
                            الفاتورة: {inv.convertedToInvoiceNumber}
                          </span>
                        )}
                        {/* Financial movement pill indicator */}
                        {inv.status === 'overdue' && inv.amountPaid > 0 && !inv.convertedToInvoiceNumber && (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 w-fit">
                            دفعة جزئية مستخلصة
                          </span>
                        )}
                        {inv.status === 'partial' && !inv.convertedToInvoiceNumber && (
                          <span className="text-[11px] font-mono tabular-nums font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 w-fit">
                            نسبة الخلاص: {Math.round((inv.amountPaid / (inv.total || 1)) * 100)}%
                          </span>
                        )}
                        {inv.status === 'paid' && !inv.convertedToInvoiceNumber && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 w-fit">
                            تم استيفاء كامل المبلغ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Grand Total */}
                    <td className="py-4 px-5 text-left font-mono tabular-nums text-base font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.total, currencySymbol)}
                    </td>

                    {/* Amount Paid & Remaining Balance (Financial Movements) */}
                    <td className="py-4 px-5 text-left whitespace-nowrap">
                      {inv.status === 'invoiced' || (isDeliveryNote && inv.convertedToInvoiceNumber) ? (
                        <div className="inline-flex flex-col items-end">
                          {inv.amountPaid > 0 ? (
                            <div className="text-sm font-mono tabular-nums font-bold text-emerald-700">
                              مستخلص: {formatCurrency(inv.amountPaid, currencySymbol)}
                            </div>
                          ) : null}
                          <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 mt-0.5">
                            المستحقات محولة للفاتورة
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 mt-0.5">
                            {inv.convertedToInvoiceNumber}
                          </span>
                        </div>
                      ) : inv.balanceDue <= 0.001 && inv.total > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <div className="text-sm font-mono tabular-nums font-bold text-emerald-700">
                            {formatCurrency(inv.amountPaid, currencySymbol)}
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5">
                            لا توجد مستحقات متبقية
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className="text-sm font-mono tabular-nums font-bold text-emerald-700">
                            مستخلص: {formatCurrency(inv.amountPaid, currencySymbol)}
                          </div>
                          <div className={`text-sm font-mono tabular-nums font-black mt-0.5 ${isOverdue ? 'text-rose-700' : 'text-amber-800'}`}>
                            متبقي: {formatCurrency(inv.balanceDue, currencySymbol)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Action Controls (Apple-style Squircle Icon Buttons with Distinct Colors) */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* View (Apple Sky) */}
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          title="معاينة تفاصيل الوثيقة"
                          className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-200/80 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>

                        {/* Print / PDF (Apple Indigo) */}
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                          title="طباعة / استخراج PDF"
                          className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200/80 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4.5 h-4.5" />
                        </button>

                        {/* Convert Delivery note to Invoice (Apple Royal Blue) */}
                        {isDeliveryNote && (
                          inv.status === 'invoiced' || inv.convertedToInvoiceNumber ? (
                            <div
                              title={`تمت فوترة هذا الوصل مسبقاً بموجب الفاتورة (${inv.convertedToInvoiceNumber || ''})`}
                              className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/90 flex items-center justify-center shadow-2xs select-none"
                            >
                              <FileCheck className="w-4.5 h-4.5" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onConvertToInvoice(inv)}
                              title="تحويل وصل الاستلام إلى فاتورة قانونية رسمية"
                              className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <FileCheck className="w-4.5 h-4.5" />
                            </button>
                          )
                        )}

                        {/* Record Payment (Apple Emerald) */}
                        <button
                          type="button"
                          onClick={() => onAddPayment(inv)}
                          title="تسجيل خلاص أو دفعة مالية"
                          className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <PlusCircle className="w-4.5 h-4.5" />
                        </button>

                        {/* Edit (Apple Amber) */}
                        <button
                          type="button"
                          onClick={() => onEditInvoice(inv)}
                          title="تعديل الوثيقة والبيانات"
                          className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Pencil className="w-4.5 h-4.5" />
                        </button>

                        {/* Duplicate (Apple Slate) */}
                        <button
                          type="button"
                          onClick={() => onDuplicateInvoice(inv)}
                          title="تكرار / استنساخ هذه الوثيقة"
                          className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white border border-slate-200 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Copy className="w-4.5 h-4.5" />
                        </button>

                        {/* Delete (Apple Crimson Rose) */}
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(inv)}
                          title="حذف هذه الوثيقة نهائياً"
                          className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            لا توجد وثائق مطابقة للبحث أو التصفية
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            لم نتمكن من العثور على أي فواتير أو وصولات استلام تطابق المعايير المحددة.
          </p>
          <div className="flex items-center justify-center gap-3">
            {(searchQuery || statusFilter !== 'all' || docTypeFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDocTypeFilter('all');
                  setDateFilter('all');
                }}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                إلغاء التصفية
              </button>
            )}
            <button
              type="button"
              onClick={onNewDeliveryNote}
              className="px-4 py-2 text-sm font-bold text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
            >
              إدراج وصل استلام
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              إدراج فاتورة جديدة
            </button>
          </div>
        </div>
      )}

      {/* Footer Summary */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600 font-medium">
        <div>
          عرض <strong>{filteredInvoices.length}</strong> من جملة <strong>{invoices.length}</strong> وثيقة
        </div>
        <div className="flex items-center gap-3">
          <span>
            المجموع المعروض (TTC):{' '}
            <strong className="font-mono tabular-nums text-base text-slate-900 font-black">
              {formatCurrency(filteredInvoices.reduce((s, i) => s + i.total, 0), currencySymbol)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
