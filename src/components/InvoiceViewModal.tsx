import React from 'react';
import { 
  X, 
  Printer, 
  CreditCard, 
  Pencil, 
  Building2, 
  FileCheck,
  PackageCheck,
  FileText
} from 'lucide-react';
import { CompanySettings, Invoice } from '../types/invoice';
import { formatCurrency, formatDate, paymentMethodLabels, statusConfigMap } from '../utils/formatters';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: CompanySettings;
  onEdit: (invoice: Invoice) => void;
  onAddPayment: (invoice: Invoice) => void;
  onConvertToInvoice?: (deliveryNote: Invoice) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  onEdit,
  onAddPayment,
  onConvertToInvoice,
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDelivery = invoice.documentType === 'delivery_note';
  const statusMeta = statusConfigMap[invoice.status];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6">
      {/* Container - only inner document prints */}
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar - Hidden in Print */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <span className="text-base font-extrabold text-slate-900">
              {isDelivery ? 'معاينة وصل الاستلام:' : 'معاينة الفاتورة:'} {invoice.invoiceNumber}
            </span>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${statusMeta.dotColor}`} />
              <span className={statusMeta.textColor}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / استخراج PDF</span>
            </button>

            {isDelivery && (
              invoice.status === 'invoiced' || invoice.convertedToInvoiceNumber ? (
                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-xl"
                  title="تمت فوترة هذا الوصل رسمياً"
                >
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>تمت الفوترة ({invoice.convertedToInvoiceNumber || 'مفوتر'})</span>
                </div>
              ) : onConvertToInvoice ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConvertToInvoice(invoice);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                  title="تحويل وصل الاستلام إلى فاتورة قانونية رسمية"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>تحويل لفاتورة (Facturer)</span>
                </button>
              ) : null
            )}

            {invoice.balanceDue > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddPayment(invoice);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>تسجيل خلاص / دفعة</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(invoice);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Pencil className="w-4 h-4" />
              <span>تعديل</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Invoice / Delivery Document */}
        <div id="printable-invoice" className="flex-1 overflow-y-auto p-8 sm:p-12 print:p-0 text-slate-900 bg-white">
          {/* If Invoiced Delivery Note Notification Banner */}
          {isDelivery && (invoice.status === 'invoiced' || invoice.convertedToInvoiceNumber) && (
            <div className="mb-6 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-950 font-bold print:border-slate-300">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>تمت فوترة وصل الاستلام هذا رسمياً بموجب الفاتورة رقم: <strong className="font-mono text-indigo-700">{invoice.convertedToInvoiceNumber || 'فاتورة قانونية'}</strong></span>
              </div>
              <span className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700 font-medium">الذمة المالية محولة ومفوترة</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-300 pb-8">
            {/* Issuer / Company Info */}
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-800 no-print" />
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {settings.name}
                </h1>
              </div>
              {settings.taxNumber && (
                <p className="text-xs text-slate-700 font-medium">
                  المعرف الجبائي (M.F): <span className="font-mono font-bold text-slate-900">{settings.taxNumber}</span>
                </p>
              )}
              {settings.commercialRegistration && (
                <p className="text-xs text-slate-600">
                  السجل التجاري (R.C): <span className="font-mono">{settings.commercialRegistration}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 leading-relaxed">
                {settings.address}
              </p>
              <div className="text-xs text-slate-500 pt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                <span>الهاتف: {settings.phone}</span>
                <span>البريد: {settings.email}</span>
              </div>
            </div>

            {/* Document Title Badge */}
            <div className="flex flex-col sm:items-end text-right sm:text-left space-y-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {isDelivery ? 'وصل تسليم واستلام' : 'فاتورة قانونية'}
              </div>
              <div className="text-xs font-mono font-bold text-slate-500 tracking-wider">
                {isDelivery ? 'BON DE LIVRAISON & RÉCEPTION' : 'FACTURE COMMERCIALE'}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 sm:text-left min-w-[210px]">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">رقم الوثيقة (N°):</span>
                  <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">تاريخ التحرير:</span>
                  <span className="font-mono text-slate-800">{invoice.issueDate}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">{isDelivery ? 'تاريخ التسليم:' : 'أجل الخلاص:'}</span>
                  <span className="font-mono text-slate-800">{invoice.dueDate}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-200">
                  <span className="text-slate-500">الحالة:</span>
                  <span className={`font-semibold ${statusMeta.textColor}`}>
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Client Information (الحريف) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 p-4 bg-slate-50/70 border border-slate-200 rounded-xl print:bg-white print:border-slate-300">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                الحريف (Client / Destinataire)
              </span>
              <div className="text-sm font-bold text-slate-900">{invoice.client.name}</div>
              {invoice.client.company && (
                <div className="text-xs font-semibold text-slate-800 mt-0.5">{invoice.client.company}</div>
              )}
              {invoice.client.address && (
                <div className="text-xs text-slate-600 mt-1">{invoice.client.address}</div>
              )}
              {invoice.client.city && (
                <div className="text-xs text-slate-500">{invoice.client.city}</div>
              )}
            </div>

            <div className="space-y-1.5 text-xs sm:text-left sm:flex sm:flex-col sm:items-end justify-center">
              {invoice.client.taxNumber && (
                <div>
                  <span className="text-slate-500">المعرف الجبائي (M.F): </span>
                  <span className="font-mono font-bold text-slate-900">{invoice.client.taxNumber}</span>
                </div>
              )}
              {invoice.client.commercialRegistration && (
                <div>
                  <span className="text-slate-500">السجل التجاري (R.C): </span>
                  <span className="font-mono text-slate-800">{invoice.client.commercialRegistration}</span>
                </div>
              )}
              {invoice.client.phone && (
                <div>
                  <span className="text-slate-500">الهاتف: </span>
                  <span className="font-mono text-slate-800">{invoice.client.phone}</span>
                </div>
              )}
              {invoice.client.email && (
                <div>
                  <span className="text-slate-500">البريد: </span>
                  <span className="text-slate-800">{invoice.client.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-hidden rounded-lg border border-slate-300">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">#</th>
                  <th className="py-3 px-3">بيان البضاعة أو الخدمة (Désignation)</th>
                  <th className="py-3 px-3 text-center w-16">الكمية</th>
                  <th className="py-3 px-3 text-left w-28">سعر الوحدة خام HT</th>
                  <th className="py-3 px-3 text-center w-16">الأداء TVA</th>
                  {invoice.discountTotal > 0 && (
                    <th className="py-3 px-3 text-left w-20">تخفيض</th>
                  )}
                  <th className="py-3 px-3 text-left w-32">المبلغ الجملي TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono tabular-nums text-slate-700">
                      {formatCurrency(item.unitPrice, settings.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-600">
                      {item.taxRate}%
                    </td>
                    {invoice.discountTotal > 0 && (
                      <td className="py-2.5 px-3 text-left font-mono tabular-nums text-emerald-700">
                        {item.discount > 0 ? `-${formatCurrency(item.discount, settings.currencySymbol)}` : '-'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-left font-mono tabular-nums font-bold text-slate-900">
                      {formatCurrency(item.total, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-8">
            {/* Left side: Bank Instructions */}
            <div className="space-y-4 max-w-sm">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 print:bg-white print:border-slate-300">
                <span className="font-bold text-slate-800 block mb-1">البيانات المصرفية للخلاص (RIB):</span>
                <div className="text-slate-600">البنك / المصرف: <strong className="text-slate-900">{settings.bankName}</strong></div>
                <div className="text-slate-600">رقم الحساب البنكي (RIB - 20 Chiffres):</div>
                <div className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 text-left text-xs tracking-wider select-all">
                  {settings.rib}
                </div>
              </div>

              {isDelivery && (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900">
                  <strong>تنصيص الاستلام:</strong> يقر الحريف باستلام كامل البضائع والمعدات المذكورة أعلاه مطابقة للمواصفات وصالحة للاستعمال.
                </div>
              )}
            </div>

            {/* Right side: Summary Numbers */}
            <div className="w-full sm:w-80 bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 print:bg-white print:border-slate-400">
              <div className="flex justify-between text-xs text-slate-600">
                <span>المجموع الخام (Total Brut HT):</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(invoice.subtotal, settings.currencySymbol)}
                </span>
              </div>

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>مجموع التخفيضات (Remise):</span>
                  <span className="font-mono tabular-nums">
                    -{formatCurrency(invoice.discountTotal, settings.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>الأداء على القيمة المضافة (Total TVA):</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(invoice.taxTotal, settings.currencySymbol)}
                </span>
              </div>

              {!isDelivery && (invoice.timbreFiscal || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>طابع جبائي (Timbre Fiscal):</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900">
                    {formatCurrency(invoice.timbreFiscal, settings.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                <span>المبلغ الجملي (Total TTC):</span>
                <span className="font-mono tabular-nums text-base">
                  {formatCurrency(invoice.total, settings.currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>المبلغ المستخلص:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatCurrency(invoice.amountPaid, settings.currencySymbol)}
                  </span>
                </div>
                {isDelivery && (invoice.status === 'invoiced' || invoice.convertedToInvoiceNumber) ? (
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-900 pt-1">
                    <span>الوضعية المالية:</span>
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded text-[11px] font-mono">
                      مفوتر بموجب {invoice.convertedToInvoiceNumber || 'فاتورة رسمية'}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs font-bold text-slate-900 pt-1">
                    <span>المتبقي في الذمة:</span>
                    <span className={`font-mono tabular-nums text-sm ${invoice.balanceDue > 0 ? 'text-amber-800' : 'text-slate-700'}`}>
                      {formatCurrency(invoice.balanceDue, settings.currencySymbol)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment History if exists */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-8 print-break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                سجل الدفعات والمقبوضات
              </h4>
              <table className="w-full text-right border-collapse text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">التاريخ</th>
                    <th className="py-2 px-3">المبلغ</th>
                    <th className="py-2 px-3">طريقة الخلاص</th>
                    <th className="py-2 px-3">الرقم المرجعي (شيك / تحويل)</th>
                    <th className="py-2 px-3">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono tabular-nums">{p.date}</td>
                      <td className="py-2 px-3 font-mono tabular-nums font-bold text-emerald-700">
                        {formatCurrency(p.amount, settings.currencySymbol)}
                      </td>
                      <td className="py-2 px-3">{paymentMethodLabels[p.method] || p.method}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{p.reference || '-'}</td>
                      <td className="py-2 px-3 text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs text-slate-600 print-break-inside-avoid">
              {invoice.notes && (
                <div>
                  <strong className="block text-slate-800 mb-1">ملاحظات:</strong>
                  <p className="whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <strong className="block text-slate-800 mb-1">الشروط والتنصيصات:</strong>
                  <p className="whitespace-pre-line leading-relaxed">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Signature & Seal Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end print-break-inside-avoid text-xs text-slate-600">
            <div>
              <p className="mb-8 font-medium">ختم وإمضاء الشركة (المزود):</p>
              <div className="w-32 h-18 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                ختم الشركة
              </div>
            </div>

            <div className="text-left">
              <p className="mb-8 font-medium">
                {isDelivery ? 'إمضاء وختم الحريف عند الاستلام (Reçu Conforme):' : 'موافقة وختم الحريف:'}
              </p>
              <div className="w-44 border-b border-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
