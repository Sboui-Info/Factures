import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Invoice } from '../types/invoice';
import { formatCurrency } from '../utils/formatters';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  currencySymbol: string;
  onConfirm: (invoiceId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  invoice,
  currencySymbol,
  onConfirm,
}) => {
  if (!isOpen || !invoice) return null;

  const isDelivery = invoice.documentType === 'delivery_note';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-2">
            تأكيد حذف {isDelivery ? 'وصل الاستلام' : 'الفاتورة'}
          </h3>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            هل أنت متأكد من حذف {isDelivery ? 'وصل الاستلام' : 'الفاتورة'}{' '}
            <strong className="font-mono text-slate-900">{invoice.invoiceNumber}</strong> الخاصة بالحريف{' '}
            <strong>{invoice.client.name}</strong> بمبلغ جملي قدره{' '}
            <strong>{formatCurrency(invoice.total, currencySymbol)}</strong>؟
            <br />
            <span className="text-rose-600 font-medium mt-1 inline-block">لا يمكن استرجاع هذه الوثيقة بعد تأكيد الحذف.</span>
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء التراجع
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(invoice.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>نعم، حذف الوثيقة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
