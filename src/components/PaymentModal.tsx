import React, { useState } from 'react';
import { X, Check, Trash2, ArrowRightLeft, CreditCard } from 'lucide-react';
import { Invoice, PaymentMethod, PaymentRecord } from '../types/invoice';
import { formatCurrency, paymentMethodLabels } from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  currencySymbol: string;
  onRecordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => void;
  onDeletePayment: (invoiceId: string, paymentId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  currencySymbol,
  onRecordPayment,
  onDeletePayment,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('cheque');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !invoice) return null;

  const handleFillFullBalance = () => {
    setAmount(invoice.balanceDue.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ خلاص صالح أكبر من الصفر');
      return;
    }

    if (numAmount > invoice.balanceDue + 0.005) {
      setError(`المبلغ المدخل أكبر من المتبقي المستحق (${formatCurrency(invoice.balanceDue, currencySymbol)})`);
      return;
    }

    onRecordPayment(invoice.id, {
      amount: numAmount,
      date,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset fields
    setAmount('');
    setReference('');
    setNotes('');
    setError('');
  };

  const isDelivery = invoice.documentType === 'delivery_note';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              تسجيل خلاص / دفعة لـ {isDelivery ? 'وصل الاستلام' : 'الفاتورة'} ({invoice.invoiceNumber})
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              الحريف: {invoice.client.name} {invoice.client.company ? `· ${invoice.client.company}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="text-xs sm:text-sm text-slate-500 block mb-1 font-medium">المبلغ الجملي TTC</span>
            <span className="font-mono tabular-nums text-base sm:text-lg font-black text-slate-900">
              {formatCurrency(invoice.total, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-500 block mb-1 font-medium">المستخلص سابقاً</span>
            <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-emerald-700">
              {formatCurrency(invoice.amountPaid, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-500 block mb-1 font-medium">المتبقي في الذمة</span>
            <span className="font-mono tabular-nums text-base sm:text-lg font-black text-amber-800">
              {formatCurrency(invoice.balanceDue, currencySymbol)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Record New Payment Form */}
          {invoice.balanceDue > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-slate-700" />
                <span>إضافة عملية خلاص جديدة</span>
              </h3>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-slate-700">
                      قيمة الدفعة ({currencySymbol}) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleFillFullBalance}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      خلاص كامل المتبقي
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder={invoice.balanceDue.toString()}
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono tabular-nums font-bold focus:outline-hidden focus:border-slate-500"
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    تاريخ الخلاص <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    طريقة الخلاص (Mode de Paiement)
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500 cursor-pointer"
                  >
                    <option value="cheque">شيك بنكي (Chèque)</option>
                    <option value="bank_transfer">تحويل بنكي (Virement)</option>
                    <option value="cash">نقداً (Espèces)</option>
                    <option value="traite">كمبيالة (Traite)</option>
                    <option value="card">بطاقة بنكية (Carte)</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    رقم الشيك / الحوالة / الكمبيالة
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="مثال: CHQ-BIAT-123456"
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ملاحظات أو بيان إضافي
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="دفعة تسبقة، خلاص عند التسليم..."
                  className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وتسجيل الخلاص</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-sm font-bold text-emerald-800">
              هذه الوثيقة خالصة بالكامل ولا يوجد أي متبقي مستحق.
            </div>
          )}

          {/* Payment History List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              <span>سجل الدفعات المسجلة ({invoice.payments?.length || 0})</span>
            </h3>

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">المبلغ</th>
                      <th className="py-2.5 px-3">طريقة الخلاص</th>
                      <th className="py-2.5 px-3">الرقم المرجعي</th>
                      <th className="py-2.5 px-3">ملاحظات</th>
                      <th className="py-2.5 px-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800">
                          {pay.date}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-700">
                          {formatCurrency(pay.amount, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {paymentMethodLabels[pay.method] || pay.method}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {pay.reference || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {pay.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذه الدفعة وإعادة احتساب المتبقي؟')) {
                                onDeletePayment(invoice.id, pay.id);
                              }
                            }}
                            title="حذف الدفعة"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                لا توجد دفعات مسجلة حتى الآن.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
