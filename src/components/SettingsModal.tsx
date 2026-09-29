import React, { useState, useRef } from 'react';
import { 
  X, 
  Building2, 
  Landmark, 
  Check, 
  Download, 
  Upload, 
  RotateCcw, 
  FileSpreadsheet, 
  Database,
  Coins,
  FileUp,
  FileDown,
  Info,
  Layers,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CompanySettings, Invoice } from '../types/invoice';
import { exportBackupJSON, exportToCSV } from '../utils/formatters';
import { exportToExcelXLSX, importFromExcelXLSX, downloadExcelTemplate, ImportResult } from '../utils/excelUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSaveSettings: (settings: CompanySettings) => void;
  invoices: Invoice[];
  onRestoreBackup: (invoices: Invoice[], settings?: CompanySettings) => void;
  onResetDemo: () => void;
  onImportInvoices?: (invoices: Invoice[], mode: 'merge' | 'replace') => void;
  initialTab?: 'company' | 'finance' | 'backup';
}

const currencies = [
  { code: 'TND', symbol: 'د.ت', label: 'دينار تونسي (TND / د.ت - 3 مليمات)' },
  { code: 'EUR', symbol: '€', label: 'يورو (EUR - €)' },
  { code: 'USD', symbol: '$', label: 'دولار أمريكي (USD - $)' },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي (SAR)' },
  { code: 'AED', symbol: 'د.إ', label: 'درهم إماراتي (AED)' },
  { code: 'DZD', symbol: 'د.ج', label: 'دينار جزائري (DZD)' },
  { code: 'MAD', symbol: 'د.م', label: 'درهم مغربي (MAD)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  invoices,
  onRestoreBackup,
  onResetDemo,
  onImportInvoices,
  initialTab = 'company',
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [activeTab, setActiveTab] = useState<'company' | 'finance' | 'backup'>(initialTab);
  
  // File inputs
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Excel Import Preview state
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importNotification, setImportNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanySettings, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCurrencyChange = (code: string) => {
    const selected = currencies.find((c) => c.code === code);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        defaultCurrency: selected.code,
        currencySymbol: selected.symbol,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  // JSON Backup file reader
  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.invoices)) {
          onRestoreBackup(parsed.invoices, parsed.settings);
          onClose();
        } else if (Array.isArray(parsed)) {
          onRestoreBackup(parsed);
          onClose();
        } else {
          alert('ملف النسخة الاحتياطية غير صالح');
        }
      } catch {
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Excel (.xlsx) file handler
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    setImportNotification(null);
    setExcelImportResult(null);

    try {
      const result = await importFromExcelXLSX(file);
      setExcelImportResult(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExcelImportResult({
        success: false,
        importedInvoices: [],
        count: 0,
        message: `تعذر معالجة الملف: ${errorMsg}`,
        errors: [errorMsg],
      });
    } finally {
      setIsProcessingExcel(false);
      e.target.value = '';
    }
  };

  const handleConfirmExcelImport = () => {
    if (!excelImportResult || !excelImportResult.success || excelImportResult.importedInvoices.length === 0) {
      return;
    }

    if (onImportInvoices) {
      onImportInvoices(excelImportResult.importedInvoices, importMode);
      setImportNotification(
        `تم بنجاح استيراد ${excelImportResult.importedInvoices.length} وثيقة (${importMode === 'replace' ? 'استبدال كامل' : 'دمج البيانات'})`
      );
      setExcelImportResult(null);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              إعدادات المنظومة وإدارة البيانات
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              المعرف الجبائي التونسي، تفاصيل المؤسسة، توريد واستيراد ملفات Excel (.xlsx)، والنسخ الاحتياطي
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 sm:px-8 bg-slate-50/50 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`py-3.5 px-4 text-sm sm:text-base font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'company'
                ? 'border-slate-900 text-slate-900 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>بيانات المنشأة والمعرف الجبائي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`py-3.5 px-4 text-sm sm:text-base font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'finance'
                ? 'border-slate-900 text-slate-900 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>العملة والأداءات والضريبة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-3.5 px-4 text-sm sm:text-base font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-slate-900 text-slate-900 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>توريد واستيراد Excel والنسخ الاحتياطي</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* TAB 1: Company Profile */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  اسم المنشأة أو الشركة (Raison Sociale) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    المعرف الجبائي (Matricule Fiscal) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.taxNumber}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                    placeholder="1482930/A/M/000"
                    className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    السجل التجاري (Régistre de Commerce - R.C)
                  </label>
                  <input
                    type="text"
                    value={formData.commercialRegistration || ''}
                    onChange={(e) => handleChange('commercialRegistration', e.target.value)}
                    placeholder="B0118292021"
                    className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  العنوان الرسمي والمقر الاجتماعي
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    أرقام الهاتف / الفاكس
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    البريد الإلكتروني المهني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-4 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-slate-700" />
                  <span>البيانات البنكية للخلاص (RIB Bancaire)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      اسم البنك (Banque)
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => handleChange('bankName', e.target.value)}
                      placeholder="الاتحاد الدولي للبنوك (UIB)"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      رقم الحساب البريدي / البنكي (RIB - 20 رقم)
                    </label>
                    <input
                      type="text"
                      value={formData.rib}
                      onChange={(e) => handleChange('rib', e.target.value)}
                      placeholder="12 000 0000000000000 00"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Finance & Tax */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    العملة الرئيسية للتعامل
                  </label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500 cursor-pointer"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    رمز العملة المطبوع على الوثائق
                  </label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => handleChange('currencySymbol', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    نسبة الأداء على القيمة المضافة الافتراضية (TVA %)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.defaultTaxRate}
                      onChange={(e) => handleChange('defaultTaxRate', Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                    />
                    <span className="text-sm text-slate-600 font-bold">%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">النسب التونسية الشائعة: 19%، 7%، 13%</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    الطابع الجبائي للفاتورة (Timbre Fiscal)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.timbreFiscal}
                      onChange={(e) => handleChange('timbreFiscal', Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:border-slate-500"
                    />
                    <span className="text-sm text-slate-600 font-bold">{formData.currencySymbol}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">القيمة الرسمية الحالية في تونس: 1.000 د.ت</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  شروط الخلاص والتسليم الافتراضية
                </label>
                <textarea
                  rows={3}
                  value={formData.terms}
                  onChange={(e) => handleChange('terms', e.target.value)}
                  className="w-full p-3 text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  الملاحظات الترحيبية على الوثائق
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full p-3 text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Excel XLSX Import/Export & Data Management */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={jsonFileInputRef}
                onChange={handleJSONFileChange}
                accept=".json"
                className="hidden"
              />
              <input
                type="file"
                ref={excelFileInputRef}
                onChange={handleExcelFileSelect}
                accept=".xlsx, .xls"
                className="hidden"
              />

              {/* Notification Banner */}
              {importNotification && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm sm:text-base">{importNotification}</span>
                </div>
              )}

              {/* SECTION A: Excel (.xlsx) Import & Export (ميزة التوريد والاستيراد) */}
              <div className="p-5 sm:p-6 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-emerald-950">
                        توريد واستيراد البيانات من وإلى ملف Excel (.xlsx)
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-800">
                        تكامل احترافي مباشر مع جداول Microsoft Excel بصيغة (.xlsx) متعددة الصفحات
                      </p>
                    </div>
                  </div>

                  {/* Template Download Button */}
                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate(formData.currencySymbol)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100/70 rounded-xl transition-all shadow-2xs"
                    title="تحميل نموذج جدول Excel فارغ ومجهز بالأعمدة والبيانات النموذجية لتعبئته وإعادة استيراده"
                  >
                    <FileDown className="w-4 h-4 text-emerald-700" />
                    <span>تحميل نموذج Excel فارغ للتعبئة (.xlsx)</span>
                  </button>
                </div>

                {/* Excel Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Action 1: Export to Excel (.xlsx) */}
                  <div className="p-4 bg-white border border-emerald-200 rounded-xl flex flex-col justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base mb-1">
                        <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                        <span>تصدير / توريد ملف Excel (.xlsx)</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        استخراج مصنف Excel كامل يشمل 3 صفحات: صفحة الفواتير ووصولات الاستلام ({invoices.length} وثيقة)، صفحة تفاصيل السلع والبنود، وصفحة المقبوضات والدفعات.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportToExcelXLSX(invoices, formData.currencySymbol)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>تصدير ملف Excel رسمي (.xlsx)</span>
                    </button>
                  </div>

                  {/* Action 2: Import from Excel (.xlsx) */}
                  <div className="p-4 bg-white border border-emerald-200 rounded-xl flex flex-col justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base mb-1">
                        <FileUp className="w-4.5 h-4.5 text-emerald-600" />
                        <span>استيراد البيانات من ملف Excel (.xlsx)</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        قراءة ملف Excel وإدراج الفواتير ووصولات الاستلام والبنود آلياً مع التحقق من صحة الحسابات والأداءات.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessingExcel}
                      onClick={() => excelFileInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200/90 border border-emerald-300 rounded-xl shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {isProcessingExcel ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري قراءة الملف...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4 text-emerald-700" />
                          <span>اختيار ملف Excel (.xlsx) للاستيراد</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* Import Preview & Confirmation Dialog */}
                {excelImportResult && (
                  <div className="mt-4 p-5 bg-white border-2 border-emerald-400 rounded-xl space-y-4 shadow-sm">
                    {excelImportResult.success ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                              <Check className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-base font-extrabold text-slate-900">
                                تم العثور على {excelImportResult.count} وثيقة جاهزة للاستيراد
                              </h4>
                              <p className="text-xs text-slate-500">
                                تم تحليل البيانات والبنود بنجاح. يرجى اختيار طريقة الاستيراد:
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExcelImportResult(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Import mode options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <label
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                              importMode === 'merge'
                                ? 'border-emerald-600 bg-emerald-50/50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="merge"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="mt-1"
                            />
                            <div>
                              <span className="block text-sm font-bold text-slate-900">
                                دمج مع البيانات الحالية (Fusionner)
                              </span>
                              <span className="block text-xs text-slate-500 mt-0.5">
                                الحفاظ على الفواتير الحالية ({invoices.length} وثيقة) وإضافة الوثائق الجديدة إليها أو تحديثها.
                              </span>
                            </div>
                          </label>

                          <label
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                              importMode === 'replace'
                                ? 'border-rose-500 bg-rose-50/50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="importMode"
                              value="replace"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="mt-1"
                            />
                            <div>
                              <span className="block text-sm font-bold text-rose-900">
                                استبدال كامل للبيانات (Remplacer Tout)
                              </span>
                              <span className="block text-xs text-slate-500 mt-0.5">
                                مسح القائمة الحالية وتعويضها فقط بالوثائق المستوردة من هذا الملف.
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setExcelImportResult(null)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmExcelImport}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>تأكيد استيراد {excelImportResult.count} وثيقة الآن</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-rose-700">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span className="font-bold text-sm sm:text-base">{excelImportResult.message}</span>
                        </div>
                        {excelImportResult.errors.length > 0 && (
                          <ul className="text-xs text-rose-600 list-disc list-inside space-y-1 bg-rose-50 p-3 rounded-lg">
                            {excelImportResult.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setExcelImportResult(null)}
                            className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl"
                          >
                            إغلاق
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: Traditional CSV Export & JSON Backups */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  خيارات النسخ الاحتياطي الأخرى وتصدير CSV
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* JSON Backup Download */}
                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Download className="w-4.5 h-4.5 text-slate-800" />
                        <span className="text-sm sm:text-base font-bold text-slate-900">نسخة احتياطية شاملة (JSON)</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        حفظ نسخة أمان تحتوي كافة الوثائق ({invoices.length} وثيقة)، المقبوضات، وإعدادات المنشأة والمعرف الجبائي.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportBackupJSON(invoices, formData)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-2xs transition-all"
                    >
                      <Download className="w-4 h-4 text-slate-700" />
                      <span>تصدير الآن (JSON)</span>
                    </button>
                  </div>

                  {/* JSON Backup Restore */}
                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4.5 h-4.5 text-slate-800" />
                        <span className="text-sm sm:text-base font-bold text-slate-900">استعادة من ملف JSON</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        استرجاع كافة الوثائق والبيانات من ملف نسخة احتياطية (.json) محفوظ مسبقاً على حاسوبك.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => jsonFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-2xs transition-all"
                    >
                      <Upload className="w-4 h-4 text-slate-700" />
                      <span>استعادة من ملف JSON</span>
                    </button>
                  </div>

                  {/* CSV Export */}
                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4.5 h-4.5 text-slate-700" />
                        <span className="text-sm sm:text-base font-bold text-slate-900">تصدير جدول خفيف (CSV)</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        استخراج جدول مبسط بصيغة CSV متوافق مع كافة برامج الجداول الحسابية.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportToCSV(invoices, formData.currencySymbol)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl shadow-2xs transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                      <span>تصدير جدول CSV</span>
                    </button>
                  </div>

                  {/* Demo Data Reset */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-900">
                        <RotateCcw className="w-4.5 h-4.5 text-amber-800" />
                        <span className="text-sm sm:text-base font-bold">المعطيات التجريبية التونسية</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        إعادة تحميل نماذج الفواتير ووصولات الاستلام التجريبية للاطلاع والتجربة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل ترغب في استرجاع المعطيات التجريبية التونسية الافتراضية؟')) {
                          onResetDemo();
                          onClose();
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl shadow-2xs transition-all"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-800" />
                      <span>استعادة المعطيات التجريبية</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
