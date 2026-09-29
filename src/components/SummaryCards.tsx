import React from 'react';
import { 
  FileCheck2, 
  Wallet, 
  ClockAlert, 
  Receipt
} from 'lucide-react';
import { Invoice } from '../types/invoice';
import { formatCurrency, isOverdueDate } from '../utils/formatters';

interface SummaryCardsProps {
  invoices: Invoice[];
  currencySymbol: string;
  onOpenPaymentsLedger?: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  invoices, 
  currencySymbol,
  onOpenPaymentsLedger 
}) => {
  // Aggregate financial metrics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  
  // Outstanding Balance: exclude delivery notes that have been invoiced, because their debt is now tracked on the invoice
  const totalBalanceDue = invoices.reduce((sum, inv) => {
    if (inv.documentType === 'delivery_note' && (inv.status === 'invoiced' || Boolean(inv.convertedToInvoiceNumber))) {
      return sum;
    }
    return sum + inv.balanceDue;
  }, 0);

  // Overdue documents: any invoice/delivery note with remaining balance whose due date has passed
  // Strictly exclude invoiced delivery notes so they never report as overdue
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.documentType === 'delivery_note' && (inv.status === 'invoiced' || Boolean(inv.convertedToInvoiceNumber))) {
      return false;
    }
    return inv.status === 'overdue' || (inv.balanceDue > 0.001 && isOverdueDate(inv.dueDate, inv.balanceDue));
  });
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const invoicesCount = invoices.filter((i) => i.documentType === 'invoice').length;
  const deliveryNotesCount = invoices.filter((i) => i.documentType === 'delivery_note').length;

  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  return (
    <section className="mb-7 no-print">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Volume (Apple Blue) */}
        <div className="group bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm font-bold text-slate-600">المبلغ الجملي للوثائق الصادرة</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/25 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <Receipt className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
            {formatCurrency(totalInvoiced, currencySymbol)}
          </div>
          <div className="mt-3.5 text-xs sm:text-sm text-slate-500 font-semibold flex items-center gap-2 flex-wrap">
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">{invoicesCount} فاتورة (FAC)</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-bold">{deliveryNotesCount} وصل استلام (BL)</span>
          </div>
        </div>

        {/* Card 2: Total Collected (Apple Emerald) - Clickable to open Payments Ledger */}
        <div 
          onClick={onOpenPaymentsLedger}
          className={`group bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${
            onOpenPaymentsLedger ? 'cursor-pointer hover:border-emerald-300' : 'cursor-default'
          }`}
          title={onOpenPaymentsLedger ? 'انقر لفتح ومراجعة سجل الدفعات والمقبوضات المفصل' : undefined}
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">المبالغ المستخلصة (المقبوضة)</span>
              {onOpenPaymentsLedger && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  سجل الدفعات ↗
                </span>
              )}
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tabular-nums tracking-tight">
            {formatCurrency(totalPaid, currencySymbol)}
          </div>
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-emerald-800 font-mono tabular-nums shrink-0">
              {collectionRate}%
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding Balance (Apple Amber) */}
        <div className="group bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm font-bold text-slate-600">المستحقات المتبقية في الذمة</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/25 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
            {formatCurrency(totalBalanceDue, currencySymbol)}
          </div>
          <div className="mt-3.5 text-xs sm:text-sm text-amber-800 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span>مبالغ قيد الخلاص بانتظار حلول الأجل</span>
          </div>
        </div>

        {/* Card 4: Overdue (Apple Crimson) */}
        <div className="group bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm font-bold text-slate-600">وثائق متأخرة عن موعد الخلاص</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-sm shadow-rose-500/25 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
              <ClockAlert className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tabular-nums tracking-tight">
            {formatCurrency(totalOverdue, currencySymbol)}
          </div>
          <div className="mt-3.5 text-xs sm:text-sm text-rose-700 font-semibold flex items-center gap-1.5">
            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">{overdueInvoices.length} متأخرة</span>
            <span aria-hidden="true" className="text-rose-300">·</span>
            <span>تتطلب تذكيراً فورياً للحريف</span>
          </div>
        </div>

      </div>
    </section>
  );
};
