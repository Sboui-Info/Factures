import React from 'react';
import { 
  FileText, 
  Plus, 
  Settings, 
  PackageCheck,
  CheckCircle2,
  ReceiptText,
  RotateCcw,
  RotateCw,
  Sparkles,
  Wallet
} from 'lucide-react';
import { CompanySettings, DocumentType } from '../types/invoice';

interface HeaderProps {
  settings: CompanySettings;
  onNewDocument: (type: DocumentType) => void;
  onOpenSettings: () => void;
  onOpenPaymentsLedger: () => void;
  activeNotification: string | null;
  onUndo: () => void;
  canUndo: boolean;
  undoCount: number;
  lastActionDescription?: string;
  onRedo?: () => void;
  canRedo?: boolean;
  redoCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onNewDocument,
  onOpenSettings,
  onOpenPaymentsLedger,
  activeNotification,
  onUndo,
  canUndo,
  undoCount,
  lastActionDescription,
  onRedo,
  canRedo = false,
  redoCount = 0,
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-xs no-print transition-all duration-200">
      {/* Toast Notification Banner (Apple Dynamic Island style) */}
      {activeNotification && (
        <div className="bg-slate-900/95 text-slate-100 text-sm py-2 px-4 flex items-center justify-center gap-2.5 border-b border-slate-800 shadow-md backdrop-blur-md transition-all animate-fadeIn font-semibold">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>{activeNotification}</span>
        </div>
      )}

      <div className="max-w-[1750px] w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex items-center justify-between h-20 gap-3">
          
          {/* Brand & Identity Zone (Apple Squircle Icon + Typography) */}
          <div className="flex items-center gap-3.5">
            {/* Apple-style squircle icon with subtle specular gradient */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center text-white shadow-md shadow-slate-950/20 ring-1 ring-white/20 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-default shrink-0">
              <ReceiptText className="w-6 h-6 text-white drop-shadow-xs" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  منظومة الفواتير ووصولات الاستلام
                </span>
                <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/80 shadow-2xs">
                  تونس TN
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                {settings.name} {settings.taxNumber ? `· المعرف الجبائي: ${settings.taxNumber}` : ''}
              </p>
            </div>
          </div>

          {/* Action Zone: Apple-like Squircle Buttons with Distinct Colors */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">

            {/* UNDO / REDO GROUP (إلغاء العملية الأخيرة وإعادتها) */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70 shadow-2xs gap-1">
              
              {/* Undo Button (إلغاء العملية الأخيرة) */}
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title={
                  canUndo
                    ? `إلغاء العملية الأخيرة: ${lastActionDescription || ''} (اختصار: Ctrl+Z)`
                    : 'لا توجد عمليات سابقة للإلغاء حالياً'
                }
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 select-none ${
                  canUndo
                    ? 'bg-white text-purple-900 shadow-xs hover:bg-purple-50 hover:text-purple-950 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer border border-purple-200/70'
                    : 'text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    canUndo
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xs shadow-purple-500/30 ring-1 ring-white/20 group-hover:scale-105'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <span className="hidden md:inline">إلغاء العملية</span>
                {canUndo && undoCount > 0 && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-md font-mono tabular-nums font-extrabold border border-purple-200">
                    {undoCount}
                  </span>
                )}
              </button>

              {/* Redo Button (إعادة العملية) */}
              {onRedo && (
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title={
                    canRedo
                      ? `إعادة تطبيق العملية الملغاة (اختصار: Ctrl+Y)`
                      : 'لا توجد عمليات ملغاة لإعادتها'
                  }
                  className={`p-2 rounded-xl transition-all duration-150 ${
                    canRedo
                      ? 'bg-white text-indigo-900 shadow-xs hover:bg-indigo-50 hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-indigo-200/70'
                      : 'text-slate-300 cursor-not-allowed opacity-40'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Settings Button (الإعدادات والبيانات - Amber Apple Squircle) */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="group inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white hover:bg-amber-50/60 border border-slate-200/90 rounded-2xl transition-all duration-150 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              title="إعدادات المنظومة، المعرف الجبائي، توريد واستيراد Excel، والنسخ الاحتياطي"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105 shrink-0">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className="hidden lg:inline">الإعدادات والبيانات</span>
            </button>

            {/* Payments & Receipts Ledger Button (سجل الدفعات والمقبوضات للمراجعة - Emerald Apple Squircle) */}
            <button
              type="button"
              onClick={onOpenPaymentsLedger}
              className="group inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/90 rounded-2xl transition-all duration-150 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap cursor-pointer"
              title="عرض سجل الدفعات والمقبوضات المالية للمراجعة والتدقيق المالي"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shadow-emerald-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105 shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline">سجل المقبوضات</span>
            </button>

            {/* Bon de Livraison Button (وصل استلام BL - Teal / Emerald Apple Squircle) */}
            <button
              type="button"
              onClick={() => onNewDocument('delivery_note')}
              className="group inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-teal-950 bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/90 rounded-2xl transition-all duration-150 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap"
              title="إدراج وصل استلام / تسليم بضاعة (Bon de Livraison - BL)"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center shadow-xs shadow-teal-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105 shrink-0">
                <PackageCheck className="w-4 h-4 text-white" />
              </div>
              <span>وصل استلام (BL)</span>
            </button>

            {/* Facture Button (فاتورة جديدة FAC - Royal Blue Apple Squircle) */}
            <button
              type="button"
              onClick={() => onNewDocument('invoice')}
              className="group inline-flex items-center gap-2.5 px-4 sm:px-4.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 border border-blue-500/30 rounded-2xl shadow-sm shadow-blue-600/25 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap"
              title="إدراج فاتورة تجارية قانونية جديدة (Facture - FAC)"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-2xs ring-1 ring-white/30 transition-transform group-hover:scale-105 shrink-0">
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span>فاتورة جديدة (FAC)</span>
            </button>
            
          </div>
        </div>
      </div>
    </header>
  );
};
