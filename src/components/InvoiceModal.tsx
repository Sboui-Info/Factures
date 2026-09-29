import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, FileText, PackageCheck } from 'lucide-react';
import { CompanySettings, DocumentType, Invoice, InvoiceItem, InvoiceStatus, PaymentMethod, PaymentRecord } from '../types/invoice';
import { calculateInvoiceSummary, calculateItemTotal, formatCurrency, generateNextDocNumber } from '../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
  invoiceToEdit?: Invoice | null;
  defaultDocType?: DocumentType;
  allInvoices: Invoice[];
  settings: CompanySettings;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  invoiceToEdit,
  defaultDocType = 'invoice',
  allInvoices,
  settings,
}) => {
  // Document Type State
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('unpaid');
  const [timbreFiscal, setTimbreFiscal] = useState<number>(settings.timbreFiscal || 1.000);
  
  // Client State
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientTaxNumber, setClientTaxNumber] = useState('');
  const [clientCommercialReg, setClientCommercialReg] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Notes & Terms
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Error State
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceToEdit) {
      setDocType(invoiceToEdit.documentType);
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setStatus(invoiceToEdit.status);
      setTimbreFiscal(invoiceToEdit.timbreFiscal || 0);
      setClientName(invoiceToEdit.client.name);
      setClientCompany(invoiceToEdit.client.company || '');
      setClientTaxNumber(invoiceToEdit.client.taxNumber || '');
      setClientCommercialReg(invoiceToEdit.client.commercialRegistration || '');
      setClientPhone(invoiceToEdit.client.phone || '');
      setClientEmail(invoiceToEdit.client.email || '');
      setClientAddress(invoiceToEdit.client.address || '');
      setClientCity(invoiceToEdit.client.city || '');
      setItems(invoiceToEdit.items.map((it) => ({ ...it })));
      setNotes(invoiceToEdit.notes || '');
      setTerms(invoiceToEdit.terms || '');
    } else {
      // New Document defaults
      const today = new Date().toISOString().split('T')[0];
      const due = new Date();
      due.setDate(due.getDate() + 30);
      const dueStr = due.toISOString().split('T')[0];

      const initialType = defaultDocType;
      setDocType(initialType);
      setInvoiceNumber(generateNextDocNumber(allInvoices, initialType));
      setIssueDate(today);
      setDueDate(dueStr);
      setStatus(initialType === 'delivery_note' ? 'delivered' : 'unpaid');
      setTimbreFiscal(initialType === 'invoice' ? (settings.timbreFiscal || 1.000) : 0);
      setClientName('');
      setClientCompany('');
      setClientTaxNumber('');
      setClientCommercialReg('');
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setClientCity('');
      
      // Default line item
      setItems([
        {
          id: 'item-' + Date.now(),
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: settings.defaultTaxRate || 19,
          discount: 0,
          total: 0,
        },
      ]);
      setNotes(settings.notes || '');
      setTerms(settings.terms || '');
    }
    setErrorMessage('');
  }, [isOpen, invoiceToEdit, defaultDocType, allInvoices, settings]);

  if (!isOpen) return null;

  // When switching document type for a new entry, suggest the correct sequence number
  const handleDocTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    if (!invoiceToEdit) {
      setInvoiceNumber(generateNextDocNumber(allInvoices, newType));
      if (newType === 'delivery_note') {
        setTimbreFiscal(0);
        setStatus('delivered');
      } else {
        setTimbreFiscal(settings.timbreFiscal || 1.000);
        setStatus('unpaid');
      }
    }
  };

  // Handle item changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    const targetItem = { ...updated[index] };

    if (field === 'description') {
      targetItem.description = String(value);
    } else {
      const numVal = Math.max(0, Number(value) || 0);
      if (field === 'quantity') targetItem.quantity = numVal;
      if (field === 'unitPrice') targetItem.unitPrice = numVal;
      if (field === 'taxRate') targetItem.taxRate = numVal;
      if (field === 'discount') targetItem.discount = numVal;
    }

    targetItem.total = calculateItemTotal(targetItem);
    updated[index] = targetItem;
    setItems(updated);
  };

  // Add Item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: settings.defaultTaxRate || 19,
        discount: 0,
        total: 0,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('يجب أن تحتوي الوثيقة على بند واحد على الأقل');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Summary Calculation
  const existingPayments: PaymentRecord[] =
    invoiceToEdit?.payments && invoiceToEdit.payments.length > 0
      ? invoiceToEdit.payments
      : invoiceToEdit?.amountPaid && invoiceToEdit.amountPaid > 0
      ? [
          {
            id: 'pay-exist-' + invoiceToEdit.id,
            date: invoiceToEdit.issueDate,
            amount: invoiceToEdit.amountPaid,
            method: 'cash' as PaymentMethod,
            notes: 'دفعة مسجلة سابقاً',
            createdAt: invoiceToEdit.createdAt || new Date().toISOString(),
          },
        ]
      : [];
  const summary = calculateInvoiceSummary(items, existingPayments, status, dueDate, timbreFiscal, docType);

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      setErrorMessage('يرجى تحديد رقم الوثيقة');
      return;
    }

    if (!clientName.trim()) {
      setErrorMessage('يرجى إدخال اسم الحريف أو الشركة');
      return;
    }

    const validItems = items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setErrorMessage('يرجى إضافة وصف أو بيان لبند واحد على الأقل');
      return;
    }

    onSave({
      documentType: docType,
      invoiceNumber: invoiceNumber.trim(),
      issueDate,
      dueDate,
      status: summary.status,
      client: {
        name: clientName.trim(),
        company: clientCompany.trim() || undefined,
        taxNumber: clientTaxNumber.trim() || undefined,
        commercialRegistration: clientCommercialReg.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        address: clientAddress.trim() || undefined,
        city: clientCity.trim() || undefined,
      },
      items: validItems,
      payments: existingPayments,
      subtotal: summary.subtotal,
      taxTotal: summary.taxTotal,
      timbreFiscal: summary.timbreFiscal,
      discountTotal: summary.discountTotal,
      total: summary.total,
      amountPaid: summary.amountPaid,
      balanceDue: summary.balanceDue,
      currency: settings.defaultCurrency,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
    });

    onClose();
  };

  const isDelivery = docType === 'delivery_note';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              {isDelivery ? (
                <PackageCheck className="w-5 h-5 text-teal-600" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600" />
              )}
              <h2 className="text-base font-bold text-slate-900">
                {invoiceToEdit
                  ? `تعديل ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} (${invoiceToEdit.invoiceNumber})`
                  : `إدراج ${isDelivery ? 'وصل استلام وتسليم جديد (BL)' : 'فاتورة قانونية جديدة (Facture)'}`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              تنصيص المعطيات الجبائية، البنود، الأسعار والأداء على القيمة المضافة (TVA)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Section 0: Document Type Selector (Facture vs Bon de Livraison) */}
          <div className="p-4 bg-slate-100/90 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-800">
              اختر نوع الوثيقة المراد إدراجها:
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleDocTypeChange('invoice')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  docType === 'invoice'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>فاتورة قانونية (Facture)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange('delivery_note')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  docType === 'delivery_note'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                }`}
              >
                <PackageCheck className="w-4.5 h-4.5" />
                <span>وصل استلام وتسليم (Bon de Livraison)</span>
              </button>
            </div>
          </div>

          {/* Section 1: Meta Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                رقم الوثيقة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono font-bold focus:outline-hidden focus:border-slate-500"
                placeholder={isDelivery ? 'BL-2026-001' : 'FAC-2026-001'}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                تاريخ التحرير والإصدار <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {isDelivery ? 'تاريخ التسليم المتوقع' : 'أجل الخلاص النهائي'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
              />
            </div>
          </div>

          {/* Section 2: Client Information (الحريف) */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-wider">
              بيانات الحريف (Client)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  اسم الحريف أو جهة الاتصال <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="مثال: منير الطرابلسي"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  اسم المؤسسة أو الشركة (Raison Sociale)
                </label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="مثال: شركة البنيان للمقاولات"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  المعرف الجبائي (Matricule Fiscal)
                </label>
                <input
                  type="text"
                  value={clientTaxNumber}
                  onChange={(e) => setClientTaxNumber(e.target.value)}
                  placeholder="0987654/C/A/000"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  السجل التجاري (Régistre de Commerce)
                </label>
                <input
                  type="text"
                  value={clientCommercialReg}
                  onChange={(e) => setClientCommercialReg(e.target.value)}
                  placeholder="B1245672019"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  رقم الهاتف أو الجوال
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+216 71 000 000"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@domaine.tn"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  العنوان والمدينة (تونس، صفاقس، سوسة...)
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="طريق المهدية كلم 2.5، صفاقس"
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items (جدول البضائع أو الخدمات) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 tracking-wider">
                {isDelivery ? 'جدول البضائع والمعدات المسلّمة' : 'بنود الفاتورة والخدمات المسعرة'}
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سطر جديد</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3 min-w-[220px]">بيان البضاعة أو الخدمة (Désignation)</th>
                      <th className="py-2.5 px-3 w-20 text-center">الكمية</th>
                      <th className="py-2.5 px-3 w-28 text-left">سعر الوحدة خام ({settings.currencySymbol})</th>
                      <th className="py-2.5 px-3 w-24 text-center">الأداء TVA (%)</th>
                      <th className="py-2.5 px-3 w-24 text-left">تخفيض ({settings.currencySymbol})</th>
                      <th className="py-2.5 px-3 w-32 text-left">الإجمالي TTC ({settings.currencySymbol})</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="وصف البضاعة المسلمة أو الخدمة..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-slate-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full text-center px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono tabular-nums focus:outline-hidden focus:border-slate-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full text-left px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono tabular-nums focus:outline-hidden focus:border-slate-400"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                            className="w-full text-center px-1.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono focus:outline-hidden focus:border-slate-400 cursor-pointer"
                          >
                            <option value="19">19% (عام)</option>
                            <option value="7">7% (مخفض)</option>
                            <option value="13">13%</option>
                            <option value="0">0% (معفى)</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                            className="w-full text-left px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono tabular-nums focus:outline-hidden focus:border-slate-400"
                          />
                        </td>
                        <td className="py-2 px-3 text-left font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrency(item.total, settings.currencySymbol)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: Live Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Notes & Terms */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات تظهر على الوثيقة المطبوعة
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات التسليم، رقم الطلبية، حالة التغليف..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الشروط والتنصيصات القانونية
                </label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="شروط الضمان، أجل الخلاص، توقيع الحريف عند الاستلام..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>

            {/* Financial Breakdown Card (HT / TVA / Timbre / TTC) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                <Calculator className="w-3.5 h-3.5" />
                <span>ملخص الحسابات (Décompte Financier)</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>المبلغ الخام دون أداء (Total Brut HT):</span>
                <span className="font-mono tabular-nums">{formatCurrency(summary.subtotal, settings.currencySymbol)}</span>
              </div>

              {summary.discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>مجموع التخفيضات (Total Remise):</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(summary.discountTotal, settings.currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>الأداء على القيمة المضافة (Total TVA):</span>
                <span className="font-mono tabular-nums">{formatCurrency(summary.taxTotal, settings.currencySymbol)}</span>
              </div>

              {docType === 'invoice' && (
                <div className="flex justify-between items-center text-xs text-slate-600 pt-1 border-t border-slate-200">
                  <span>طابع جبائي (Timbre Fiscal):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={timbreFiscal}
                      onChange={(e) => setTimbreFiscal(Math.max(0, Number(e.target.value) || 0))}
                      className="w-20 px-2 py-1 text-xs text-left bg-white border border-slate-300 rounded font-mono tabular-nums"
                    />
                    <span className="text-[11px] text-slate-500">{settings.currencySymbol}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>المبلغ الجملي الصافي (Total TTC):</span>
                <span className="font-mono tabular-nums text-base">{formatCurrency(summary.total, settings.currencySymbol)}</span>
              </div>

              {invoiceToEdit && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>المبلغ المستخلص:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(summary.amountPaid, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-amber-800">
                    <span>المتبقي المطلوب خلاصه:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(summary.balanceDue, settings.currencySymbol)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
              isDelivery ? 'bg-teal-700 hover:bg-teal-800' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {invoiceToEdit
              ? 'حفظ التعديلات'
              : isDelivery
              ? 'تسجيل وحفظ وصل الاستلام (BL)'
              : 'تسجيل وحفظ الفاتورة (FAC)'}
          </button>
        </div>
      </div>
    </div>
  );
};
