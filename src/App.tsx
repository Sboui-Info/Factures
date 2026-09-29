import React, { useState, useEffect, useCallback } from 'react';
import { CompanySettings, DocumentType, HistoryStep, Invoice, InvoiceStatus, PaymentMethod, PaymentRecord } from './types/invoice';
import { defaultCompanySettings, initialInvoices } from './data/initialData';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceModal } from './components/InvoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { PaymentsLedgerModal } from './components/PaymentsLedgerModal';
import { InvoiceViewModal } from './components/InvoiceViewModal';
import { SettingsModal } from './components/SettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { calculateInvoiceSummary, generateNextDocNumber, syncInvoiceFinancials } from './utils/formatters';

const STORAGE_INVOICES_KEY = 'standalone_invoices_data_v2_tn';
const STORAGE_SETTINGS_KEY = 'standalone_invoices_settings_v2_tn';
const MAX_HISTORY_STEPS = 35;

// Helper to reconcile and update delivery notes that were converted to invoices
const reconcileInvoices = (rawList: Invoice[]): Invoice[] => {
  const conversionMap = new Map<string, string>();
  rawList.forEach((inv) => {
    if (inv.documentType === 'invoice' && inv.convertedFromDeliveryId) {
      conversionMap.set(inv.convertedFromDeliveryId, inv.invoiceNumber);
    }
  });

  return rawList.map((inv) => {
    if (inv.documentType === 'delivery_note') {
      const targetInvoiceNum = conversionMap.get(inv.id) || inv.convertedToInvoiceNumber;
      if (targetInvoiceNum || inv.status === 'invoiced') {
        return syncInvoiceFinancials({
          ...inv,
          status: 'invoiced',
          convertedToInvoiceNumber: targetInvoiceNum || inv.convertedToInvoiceNumber,
          balanceDue: 0,
        });
      }
    }
    return syncInvoiceFinancials(inv);
  });
};

export default function App() {
  // Load invoices from localStorage or use initial demo invoices, strictly synced with financial movements
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return reconcileInvoices(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading invoices from storage:', err);
    }
    return reconcileInvoices(initialInvoices);
  });

  // Load settings from localStorage or use default
  const [settings, setSettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...defaultCompanySettings, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('Error loading settings from storage:', err);
    }
    return defaultCompanySettings;
  });

  // Multi-level Undo & Redo History Stacks
  const [undoStack, setUndoStack] = useState<HistoryStep[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryStep[]>([]);

  // Notification Toast state
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // Helper to record an undoable action snapshot
  const recordHistory = useCallback(
    (description: string, currentSnapshot: Invoice[]) => {
      const newStep: HistoryStep = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        description,
        invoices: JSON.parse(JSON.stringify(currentSnapshot)),
        timestamp: Date.now(),
      };

      setUndoStack((prev) => {
        const next = [...prev, newStep];
        if (next.length > MAX_HISTORY_STEPS) {
          return next.slice(next.length - MAX_HISTORY_STEPS);
        }
        return next;
      });

      // Clear redo stack upon a new forward user action
      setRedoStack([]);
    },
    []
  );

  // Undo execution handler (إلغاء العملية الأخيرة)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    setUndoStack((prevUndo) => {
      const stepToRestore = prevUndo[prevUndo.length - 1];
      const remainingUndo = prevUndo.slice(0, prevUndo.length - 1);

      // Push current state to Redo stack before rolling back
      setRedoStack((prevRedo) => [
        ...prevRedo,
        {
          id: 'redo-' + Date.now(),
          description: stepToRestore.description,
          invoices: JSON.parse(JSON.stringify(invoices)),
          timestamp: Date.now(),
        },
      ]);

      setInvoices(stepToRestore.invoices);
      showNotification(`تم التراجع عن: ${stepToRestore.description}`);
      return remainingUndo;
    });
  }, [undoStack, invoices, showNotification]);

  // Redo execution handler (إعادة تطبيق العملية)
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    setRedoStack((prevRedo) => {
      const stepToReapply = prevRedo[prevRedo.length - 1];
      const remainingRedo = prevRedo.slice(0, prevRedo.length - 1);

      // Push current state to Undo stack before stepping forward
      setUndoStack((prevUndo) => [
        ...prevUndo,
        {
          id: 'undo-' + Date.now(),
          description: stepToReapply.description,
          invoices: JSON.parse(JSON.stringify(invoices)),
          timestamp: Date.now(),
        },
      ]);

      setInvoices(stepToReapply.invoices);
      showNotification(`تمت إعادة تطبيق: ${stepToReapply.description}`);
      return remainingRedo;
    });
  }, [redoStack, invoices, showNotification]);

  // Global Keyboard Shortcuts (Ctrl+Z for Undo, Ctrl+Y or Ctrl+Shift+Z for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      // Allow user normal editing inside text inputs
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Persist to localStorage whenever invoices change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(invoices));
    } catch (err) {
      console.error('Error saving invoices to storage:', err);
    }
  }, [invoices]);

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Error saving settings to storage:', err);
    }
  }, [settings]);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [modalDefaultDocType, setModalDefaultDocType] = useState<DocumentType>('invoice');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  const [isPaymentsLedgerOpen, setIsPaymentsLedgerOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Handlers for creating documents
  const handleOpenNewDocument = (type: DocumentType) => {
    setInvoiceToEdit(null);
    setModalDefaultDocType(type);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setModalDefaultDocType(invoice.documentType);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const isDelivery = invoiceData.documentType === 'delivery_note';

    if (invoiceToEdit) {
      // Record history snapshot before update
      recordHistory(
        `تعديل ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} (${invoiceData.invoiceNumber})`,
        invoices
      );

      // Update existing with financial synchronization
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoiceToEdit.id) {
            const updated = syncInvoiceFinancials({
              ...invoiceData,
              id: invoiceToEdit.id,
              payments: invoiceToEdit.payments || [],
              createdAt: invoiceToEdit.createdAt,
              updatedAt: now,
            });
            return updated;
          }
          return inv;
        })
      );
      showNotification(`تم حفظ التعديلات على ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} ${invoiceData.invoiceNumber} بنجاح`);
    } else {
      // Record history snapshot before creation
      recordHistory(
        `إدراج ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} (${invoiceData.invoiceNumber})`,
        invoices
      );

      // Create new with financial synchronization
      const newInvoice = syncInvoiceFinancials({
        ...invoiceData,
        id: 'doc-' + Date.now(),
        payments: [],
        createdAt: now,
        updatedAt: now,
      });
      setInvoices((prev) => [newInvoice, ...prev]);
      showNotification(`تم تسجيل ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} ${newInvoice.invoiceNumber} بنجاح`);
    }
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const nextNum = generateNextDocNumber(invoices, invoice.documentType);
    const today = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueStr = due.toISOString().split('T')[0];
    const now = new Date().toISOString();

    const isDelivery = invoice.documentType === 'delivery_note';

    // Record history snapshot before duplication
    recordHistory(`نسخ الوثيقة (${invoice.invoiceNumber} ➔ ${nextNum})`, invoices);

    const summary = calculateInvoiceSummary(
      invoice.items,
      [],
      isDelivery ? 'delivered' : 'unpaid',
      dueStr,
      invoice.timbreFiscal,
      invoice.documentType
    );

    const duplicatedInvoice: Invoice = {
      ...invoice,
      id: 'doc-' + Date.now(),
      invoiceNumber: nextNum,
      issueDate: today,
      dueDate: dueStr,
      status: summary.status,
      payments: [],
      amountPaid: 0,
      balanceDue: summary.total,
      createdAt: now,
      updatedAt: now,
    };

    setInvoices((prev) => [duplicatedInvoice, ...prev]);
    showNotification(`تم استنساخ ${isDelivery ? 'وصل الاستلام' : 'الفاتورة'} برقم جديد (${nextNum})`);
  };

  const handleConvertToInvoice = (deliveryNote: Invoice) => {
    const nextInvoiceNumber = generateNextDocNumber(invoices, 'invoice');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueStr = due.toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Record history snapshot before conversion
    recordHistory(
      `تحويل وصل الاستلام (${deliveryNote.invoiceNumber}) إلى فاتورة (${nextInvoiceNumber})`,
      invoices
    );

    // Carry over and preserve all payments received from the client on this delivery note
    const existingPayments: PaymentRecord[] =
      Array.isArray(deliveryNote.payments) && deliveryNote.payments.length > 0
        ? deliveryNote.payments.map((p, idx) => ({
            ...p,
            id: `pay-conv-${Date.now()}-${idx}`,
            notes: p.notes
              ? `${p.notes} (مقبوض سابقاً بوصل التسليم ${deliveryNote.invoiceNumber})`
              : `مبلغ مقبوض من الحريف ومحول من وصل التسليم ${deliveryNote.invoiceNumber}`,
            createdAt: p.createdAt || now,
          }))
        : (deliveryNote.amountPaid && deliveryNote.amountPaid > 0)
        ? [
            {
              id: `pay-conv-${Date.now()}-0`,
              date: deliveryNote.issueDate || today,
              amount: Number(deliveryNote.amountPaid),
              method: 'cash' as PaymentMethod,
              reference: `واصل بوصل التسليم ${deliveryNote.invoiceNumber}`,
              notes: `مبلغ مستلم من الحريف ومحول من وصل التسليم ${deliveryNote.invoiceNumber}`,
              createdAt: now,
            },
          ]
        : [];

    const effectiveTimbre = settings.timbreFiscal || 1.000;
    const summary = calculateInvoiceSummary(
      deliveryNote.items,
      existingPayments,
      undefined, // let payment calculation determine financial status ('paid', 'partial', 'unpaid')
      dueStr,
      effectiveTimbre,
      'invoice'
    );

    const newInvoice: Invoice = {
      id: 'doc-' + Date.now(),
      documentType: 'invoice',
      invoiceNumber: nextInvoiceNumber,
      issueDate: today,
      dueDate: dueStr,
      client: { ...deliveryNote.client },
      items: deliveryNote.items.map((it) => ({ ...it })),
      payments: existingPayments,
      subtotal: summary.subtotal,
      taxTotal: summary.taxTotal,
      timbreFiscal: summary.timbreFiscal,
      discountTotal: summary.discountTotal,
      total: summary.total,
      amountPaid: summary.amountPaid,
      balanceDue: summary.balanceDue,
      status: summary.status,
      notes: `فاتورة مستخرجة من وصل التسليم رقم: ${deliveryNote.invoiceNumber}${
        summary.amountPaid > 0
          ? `\n(تم احتساب مبلغ مستلم سابقاً من الحريف قدره: ${summary.amountPaid.toFixed(3)} ${settings.currencySymbol})`
          : ''
      }${deliveryNote.notes ? `\n${deliveryNote.notes}` : ''}`.trim(),
      terms: settings.terms || deliveryNote.terms,
      currency: deliveryNote.currency,
      convertedFromDeliveryId: deliveryNote.id,
      createdAt: now,
      updatedAt: now,
    };

    // Prepend new invoice and update source delivery note with reference to the invoice and set status to invoiced
    setInvoices((prev) => [
      newInvoice,
      ...prev.map((inv) =>
        inv.id === deliveryNote.id
          ? {
              ...inv,
              status: 'invoiced' as InvoiceStatus,
              convertedToInvoiceNumber: nextInvoiceNumber,
              balanceDue: 0,
              notes: `${inv.notes ? inv.notes + '\n' : ''}(تمت الفوترة رسمياً بموجب الفاتورة رقم: ${nextInvoiceNumber})`.trim(),
              updatedAt: now,
            }
          : inv
      ),
    ]);

    const msg =
      summary.amountPaid > 0
        ? `تم تحويل وصل الاستلام (${deliveryNote.invoiceNumber}) إلى فاتورة (${newInvoice.invoiceNumber}) بنجاح مع احتساب المبلغ المستلم من الحريف (${summary.amountPaid.toFixed(3)} ${settings.currencySymbol})`
        : `تم بنجاح تحويل وصل الاستلام (${deliveryNote.invoiceNumber}) إلى فاتورة قانونية (${newInvoice.invoiceNumber})`;

    showNotification(msg);

    // Open the new invoice in view mode
    setInvoiceToView(newInvoice);
    setIsViewModalOpen(true);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (target) {
      recordHistory(
        `حذف ${target.documentType === 'delivery_note' ? 'وصل الاستلام' : 'الفاتورة'} (${target.invoiceNumber})`,
        invoices
      );
    }
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    showNotification('تم حذف الوثيقة بنجاح');
  };

  const handleImportInvoices = (importedInvoices: Invoice[], mode: 'merge' | 'replace') => {
    const syncedImports = importedInvoices.map(syncInvoiceFinancials);
    recordHistory(
      `استيراد ملف Excel (${syncedImports.length} وثيقة - ${mode === 'replace' ? 'استبدال' : 'دمج'})`,
      invoices
    );

    if (mode === 'replace') {
      setInvoices(syncedImports);
      showNotification(`تم بنجاح تعويض البيانات واستيراد ${syncedImports.length} وثيقة من ملف Excel`);
    } else {
      // Merge mode: update if exists with same invoiceNumber, otherwise prepend
      setInvoices((prev) => {
        const existingNumbers = new Set(syncedImports.map((inv) => inv.invoiceNumber));
        const filteredPrev = prev.filter((inv) => !existingNumbers.has(inv.invoiceNumber));
        return [...syncedImports, ...filteredPrev];
      });
      showNotification(`تم بنجاح استيراد ودمج ${syncedImports.length} وثيقة من ملف Excel`);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setInvoiceToView(invoice);
    setIsViewModalOpen(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setInvoiceToView(invoice);
    setIsViewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleAddPaymentClick = (invoice: Invoice) => {
    setInvoiceForPayment(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = (
    invoiceId: string,
    payment: Omit<PaymentRecord, 'id' | 'createdAt'>
  ) => {
    const target = invoices.find((i) => i.id === invoiceId);
    recordHistory(
      `تسجيل دفعة بقيمة ${payment.amount.toFixed(3)} ${settings.currencySymbol} للوثيقة (${target?.invoiceNumber || ''})`,
      invoices
    );

    const newRecord: PaymentRecord = {
      ...payment,
      id: 'pay-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updatedPayments = [...(inv.payments || []), newRecord];
          const updatedInvoice = syncInvoiceFinancials({
            ...inv,
            payments: updatedPayments,
            updatedAt: new Date().toISOString(),
          });

          if (invoiceForPayment?.id === invoiceId) {
            setInvoiceForPayment(updatedInvoice);
          }
          if (invoiceToView?.id === invoiceId) {
            setInvoiceToView(updatedInvoice);
          }

          return updatedInvoice;
        }
        return inv;
      })
    );

    showNotification(`تم تسجيل خلاص بقيمة ${payment.amount.toFixed(3)} ${settings.currencySymbol} بنجاح`);
  };

  const handleDeletePayment = (invoiceId: string, paymentId: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    recordHistory(`حذف دفعة خلاص من الوثيقة (${target?.invoiceNumber || ''})`, invoices);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updatedPayments = (inv.payments || []).filter((p) => p.id !== paymentId);
          const updatedInvoice = syncInvoiceFinancials({
            ...inv,
            payments: updatedPayments,
            updatedAt: new Date().toISOString(),
          });

          if (invoiceForPayment?.id === invoiceId) {
            setInvoiceForPayment(updatedInvoice);
          }
          if (invoiceToView?.id === invoiceId) {
            setInvoiceToView(updatedInvoice);
          }

          return updatedInvoice;
        }
        return inv;
      })
    );

    showNotification('تم إلغاء عملية الخلاص وتحديث الرصيد المتبقي');
  };

  const handleRestoreBackup = (importedInvoices: Invoice[], importedSettings?: CompanySettings) => {
    const synced = importedInvoices.map(syncInvoiceFinancials);
    recordHistory(`استعادة نسخة احتياطية (${synced.length} وثيقة)`, invoices);
    setInvoices(synced);
    if (importedSettings) {
      setSettings(importedSettings);
    }
    showNotification(`تم استرجاع النسخة الاحتياطية بنجاح (${synced.length} وثيقة)`);
  };

  const handleResetDemo = () => {
    const synced = initialInvoices.map(syncInvoiceFinancials);
    recordHistory('استعادة المعطيات التجريبية التونسية', invoices);
    setInvoices(synced);
    setSettings(defaultCompanySettings);
    showNotification('تمت استعادة المعطيات التجريبية التونسية وإعدادات المنشأة');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Header with Apple-like Icons and Multi-level Undo / Redo */}
      <Header
        settings={settings}
        onNewDocument={handleOpenNewDocument}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenPaymentsLedger={() => setIsPaymentsLedgerOpen(true)}
        activeNotification={notification}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        undoCount={undoStack.length}
        lastActionDescription={undoStack[undoStack.length - 1]?.description}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        redoCount={redoStack.length}
      />

      {/* Main Workspace (Expanded Full-Width with Generous Margins) */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 sm:py-8">
        {/* KPI Financial Overview Cards with Apple Squircles and Rich Gradients */}
        <SummaryCards
          invoices={invoices}
          currencySymbol={settings.currencySymbol}
          onOpenPaymentsLedger={() => setIsPaymentsLedgerOpen(true)}
        />

        {/* Invoice & Delivery Notes List & Filters Table */}
        <InvoiceList
          invoices={invoices}
          currencySymbol={settings.currencySymbol}
          onViewInvoice={handleViewInvoice}
          onPrintInvoice={handlePrintInvoice}
          onAddPayment={handleAddPaymentClick}
          onEditInvoice={handleEditInvoice}
          onDuplicateInvoice={handleDuplicateInvoice}
          onDeleteInvoice={(inv) => {
            setInvoiceToDelete(inv);
            setIsDeleteModalOpen(true);
          }}
          onConvertToInvoice={handleConvertToInvoice}
          onNewInvoice={() => handleOpenNewDocument('invoice')}
          onNewDeliveryNote={() => handleOpenNewDocument('delivery_note')}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 text-xs text-slate-500 text-center no-print">
        <div className="max-w-[1750px] w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>منظومة الفواتير ووصولات الاستلام التونسية · حفظ محلي فوري وآمن بالمتصفح مع دعم التراجع المتعدد (Ctrl+Z)</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-slate-800 transition-colors"
            >
              إعدادات المنشأة والمعرف الجبائي
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleResetDemo}
              className="hover:text-slate-800 transition-colors"
            >
              المعطيات التجريبية
            </button>
          </div>
        </div>
      </footer>

      {/* Invoice / Delivery Note Create & Edit Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSave={handleSaveInvoice}
        invoiceToEdit={invoiceToEdit}
        defaultDocType={modalDefaultDocType}
        allInvoices={invoices}
        settings={settings}
      />

      {/* Payment Recording Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoiceForPayment}
        currencySymbol={settings.currencySymbol}
        onRecordPayment={handleRecordPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* Payments & Receipts Ledger Modal (سجل الدفعات والمقبوضات للمراجعة والتدقيق) */}
      <PaymentsLedgerModal
        isOpen={isPaymentsLedgerOpen}
        onClose={() => setIsPaymentsLedgerOpen(false)}
        invoices={invoices}
        currencySymbol={settings.currencySymbol}
        onViewInvoice={handleViewInvoice}
        onDeletePayment={handleDeletePayment}
      />

      {/* Invoice View & Print Modal */}
      <InvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        invoice={invoiceToView}
        settings={settings}
        onEdit={(inv) => {
          setIsViewModalOpen(false);
          handleEditInvoice(inv);
        }}
        onAddPayment={(inv) => {
          setIsViewModalOpen(false);
          handleAddPaymentClick(inv);
        }}
        onConvertToInvoice={handleConvertToInvoice}
      />

      {/* Company Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          showNotification('تم تحديث إعدادات المنشأة والعملة والمعرف الجبائي بنجاح');
        }}
        invoices={invoices}
        onRestoreBackup={handleRestoreBackup}
        onResetDemo={handleResetDemo}
        onImportInvoices={handleImportInvoices}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        invoice={invoiceToDelete}
        currencySymbol={settings.currencySymbol}
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}
