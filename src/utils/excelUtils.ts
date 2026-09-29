import * as XLSX from 'xlsx';
import { DocumentType, Invoice, InvoiceItem, InvoiceStatus, PaymentMethod, PaymentRecord } from '../types/invoice';
import { calculateInvoiceSummary, documentTypeLabels, paymentMethodLabels, statusConfigMap } from './formatters';

/**
 * Export all invoices and delivery notes to a multi-sheet real Excel (.xlsx) file
 */
export const exportToExcelXLSX = (invoices: Invoice[], currencySymbol: string = 'د.ت') => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main Documents list (الفواتير والوصولات)
  const docsData = invoices.map((inv) => ({
    'نوع الوثيقة': documentTypeLabels[inv.documentType]?.ar || (inv.documentType === 'delivery_note' ? 'وصل استلام' : 'فاتورة'),
    'الرمز': inv.documentType === 'delivery_note' ? 'BL' : 'FAC',
    'رقم الوثيقة': inv.invoiceNumber,
    'تاريخ التحرير': inv.issueDate,
    'أجل الخلاص': inv.dueDate,
    'الحالة': statusConfigMap[inv.status]?.label || inv.status,
    'اسم الحريف (العميل)': inv.client.name,
    'المؤسسة / الشركة': inv.client.company || '',
    'المعرف الجبائي (MF)': inv.client.taxNumber || '',
    'السجل التجاري (RC)': inv.client.commercialRegistration || '',
    'الهاتف': inv.client.phone || '',
    'البريد الإلكتروني': inv.client.email || '',
    'العنوان': inv.client.address || '',
    'المدينة': inv.client.city || '',
    [`المجموع الخام HT (${currencySymbol})`]: Number(inv.subtotal.toFixed(3)),
    [`مجموع الخصم (${currencySymbol})`]: Number((inv.discountTotal || 0).toFixed(3)),
    [`المجموع الصافي HT (${currencySymbol})`]: Number(((inv.subtotal || 0) - (inv.discountTotal || 0)).toFixed(3)),
    [`أداء TVA (${currencySymbol})`]: Number(inv.taxTotal.toFixed(3)),
    [`الطابع الجبائي (${currencySymbol})`]: Number((inv.timbreFiscal || 0).toFixed(3)),
    [`المبلغ الجملي TTC (${currencySymbol})`]: Number(inv.total.toFixed(3)),
    [`المبلغ المستخلص (${currencySymbol})`]: Number(inv.amountPaid.toFixed(3)),
    [`المتبقي في الذمة (${currencySymbol})`]: Number(inv.balanceDue.toFixed(3)),
    'ملاحظات': inv.notes || '',
    'شروط الخلاص': inv.terms || '',
  }));

  const wsDocs = XLSX.utils.json_to_sheet(docsData);
  // Auto-width columns
  wsDocs['!cols'] = [
    { wch: 16 }, // نوع الوثيقة
    { wch: 8 },  // الرمز
    { wch: 18 }, // رقم الوثيقة
    { wch: 14 }, // تاريخ التحرير
    { wch: 14 }, // أجل الخلاص
    { wch: 16 }, // الحالة
    { wch: 25 }, // اسم الحريف
    { wch: 25 }, // المؤسسة
    { wch: 20 }, // المعرف الجبائي
    { wch: 18 }, // السجل التجاري
    { wch: 16 }, // الهاتف
    { wch: 24 }, // البريد
    { wch: 28 }, // العنوان
    { wch: 16 }, // المدينة
    { wch: 18 }, // HT
    { wch: 15 }, // الخصم
    { wch: 18 }, // صافي HT
    { wch: 16 }, // TVA
    { wch: 16 }, // طابع
    { wch: 20 }, // TTC
    { wch: 18 }, // المستخلص
    { wch: 18 }, // المتبقي
    { wch: 28 }, // ملاحظات
    { wch: 28 }, // شروط
  ];

  XLSX.utils.book_append_sheet(wb, wsDocs, 'الفواتير والوصولات');

  // Sheet 2: Items Details (تفاصيل البنود والسلع)
  const itemsData: Array<Record<string, unknown>> = [];
  invoices.forEach((inv) => {
    inv.items.forEach((item, idx) => {
      itemsData.push({
        'رقم الوثيقة': inv.invoiceNumber,
        'نوع الوثيقة': documentTypeLabels[inv.documentType]?.ar || inv.documentType,
        'الحريف': inv.client.name,
        'الترتيب': idx + 1,
        'البيان / وصف السلعة أو الخدمة': item.description,
        'الكمية': item.quantity,
        'الوحدة': item.unit || 'قطعة',
        [`سعر الوحدة HT (${currencySymbol})`]: item.unitPrice,
        'نسبة الأداء TVA %': `${item.taxRate}%`,
        'نسبة الخصم %': `${item.discount || 0}%`,
        [`المجموع الصافي HT (${currencySymbol})`]: Number((item.total - (item.total * (item.taxRate / (100 + item.taxRate)))).toFixed(3)),
        [`المجموع الجملي TTC (${currencySymbol})`]: Number(item.total.toFixed(3)),
      });
    });
  });

  const wsItems = XLSX.utils.json_to_sheet(itemsData);
  wsItems['!cols'] = [
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 8 },
    { wch: 35 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, 'تفاصيل البنود والسلع');

  // Sheet 3: Payments Details (سجل المقبوضات والدفعات)
  const paymentsData: Array<Record<string, unknown>> = [];
  invoices.forEach((inv) => {
    inv.payments.forEach((p) => {
      paymentsData.push({
        'رقم الوثيقة': inv.invoiceNumber,
        'نوع الوثيقة': documentTypeLabels[inv.documentType]?.ar || inv.documentType,
        'الحريف': inv.client.name,
        'تاريخ الخلاص / الدفعة': p.date,
        [`المبلغ المدفوع (${currencySymbol})`]: Number(p.amount.toFixed(3)),
        'طريقة الخلاص': paymentMethodLabels[p.method] || p.method,
        'المرجع / رقم الشيك أو التحويل': p.reference || '',
        'ملاحظات': p.notes || '',
      });
    });
  });

  if (paymentsData.length > 0) {
    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
    wsPayments['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPayments, 'سجل الدفعات والمقبوضات');
  }

  // Trigger Excel file download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `منظومة_الفواتير_التونسية_${dateStr}.xlsx`);
};

/**
 * Generate and download an empty or sample Excel template for importing
 */
export const downloadExcelTemplate = (currencySymbol: string = 'د.ت') => {
  const wb = XLSX.utils.book_new();

  const templateDocs = [
    {
      'نوع الوثيقة': 'فاتورة',
      'رقم الوثيقة': 'FAC-2026-010',
      'تاريخ التحرير': '2026-09-29',
      'أجل الخلاص': '2026-10-29',
      'الحالة': 'غير خالصة',
      'اسم الحريف (العميل)': 'شركة النجاح للتجارة والتوزيع',
      'المؤسسة / الشركة': 'النجاح للتوزيع SARL',
      'المعرف الجبائي (MF)': '1589432/B/A/000',
      'السجل التجاري (RC)': 'B1123452023',
      'الهاتف': '71 888 999',
      'البريد الإلكتروني': 'contact@ennajah.tn',
      'العنوان': 'المنطقة الصناعية الشرقية',
      'المدينة': 'تونس',
      'الطابع الجبائي': 1.000,
      'ملاحظات': 'فاتورة تجريبية للاستيراد',
    },
    {
      'نوع الوثيقة': 'وصل استلام',
      'رقم الوثيقة': 'BL-2026-010',
      'تاريخ التحرير': '2026-09-29',
      'أجل الخلاص': '2026-10-15',
      'الحالة': 'تم التسليم',
      'اسم الحريف (العميل)': 'مؤسسة الأفق للخدمات',
      'المؤسسة / الشركة': 'الأفق للخدمات',
      'المعرف الجبائي (MF)': '1690123/C/N/000',
      'السجل التجاري (RC)': 'B0987652022',
      'الهاتف': '73 555 444',
      'البريد الإلكتروني': 'info@horizon.tn',
      'العنوان': 'شارع البيئة',
      'المدينة': 'سوسة',
      'الطابع الجبائي': 0,
      'ملاحظات': 'وصل تسليم بضاعة تم استلامه',
    },
  ];

  const templateItems = [
    {
      'رقم الوثيقة': 'FAC-2026-010',
      'البيان / وصف السلعة أو الخدمة': 'حاسوب محمول مكتبي عالي الأداء Core i7',
      'الكمية': 2,
      'الوحدة': 'قطعة',
      [`سعر الوحدة HT (${currencySymbol})`]: 1850.000,
      'نسبة الأداء TVA %': 19,
      'نسبة الخصم %': 0,
    },
    {
      'رقم الوثيقة': 'FAC-2026-010',
      'البيان / وصف السلعة أو الخدمة': 'طابعة حرارية لنقاط البيع USB / Ethernet',
      'الكمية': 1,
      'الوحدة': 'قطعة',
      [`سعر الوحدة HT (${currencySymbol})`]: 420.000,
      'نسبة الأداء TVA %': 19,
      'نسبة الخصم %': 0,
    },
    {
      'رقم الوثيقة': 'BL-2026-010',
      'البيان / وصف السلعة أو الخدمة': 'شاشة عرض LED 24 بوصة FHD',
      'الكمية': 3,
      'الوحدة': 'قطعة',
      [`سعر الوحدة HT (${currencySymbol})`]: 380.000,
      'نسبة الأداء TVA %': 19,
      'نسبة الخصم %': 0,
    },
  ];

  const wsDocs = XLSX.utils.json_to_sheet(templateDocs);
  const wsItems = XLSX.utils.json_to_sheet(templateItems);

  XLSX.utils.book_append_sheet(wb, wsDocs, 'الفواتير والوصولات');
  XLSX.utils.book_append_sheet(wb, wsItems, 'تفاصيل البنود والسلع');

  XLSX.writeFile(wb, 'نموذج_استيراد_الفواتير_ووصولات_الاستلام.xlsx');
};

export interface ImportResult {
  success: boolean;
  importedInvoices: Invoice[];
  count: number;
  message: string;
  errors: string[];
}

/**
 * Parse an Excel file (.xlsx) and extract Invoices and Delivery Notes
 */
export const importFromExcelXLSX = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            importedInvoices: [],
            count: 0,
            message: 'الملف فارغ أو لا يحتوي على أي صفحات صالحة',
            errors: ['ملف Excel لا يحتوي على بيانات'],
          });
          return;
        }

        // Locate document sheet and items sheet
        const sheetNames = workbook.SheetNames;
        let docsSheet = workbook.Sheets[sheetNames[0]];
        let itemsSheet = workbook.Sheets[sheetNames[1]];

        // Search specifically for named sheets if available
        const docSheetName = sheetNames.find(
          (name) => name.includes('فواتير') || name.includes('الوصولات') || name.toLowerCase().includes('facture') || name.toLowerCase().includes('invoices')
        );
        if (docSheetName) {
          docsSheet = workbook.Sheets[docSheetName];
        }

        const itemsSheetName = sheetNames.find(
          (name) => name.includes('بنود') || name.includes('سلع') || name.toLowerCase().includes('article') || name.toLowerCase().includes('item')
        );
        if (itemsSheetName) {
          itemsSheet = workbook.Sheets[itemsSheetName];
        }

        const rawDocs = XLSX.utils.sheet_to_json<Record<string, unknown>>(docsSheet);
        const rawItems = itemsSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(itemsSheet) : [];

        if (rawDocs.length === 0) {
          resolve({
            success: false,
            importedInvoices: [],
            count: 0,
            message: 'لم يتم العثور على أسطر صالحة في صفحة الفواتير والوصولات',
            errors: ['الجدول فارغ'],
          });
          return;
        }

        // Group items by doc number
        const itemsByDocNum = new Map<string, InvoiceItem[]>();
        rawItems.forEach((row, idx) => {
          const docNum = String(
            row['رقم الوثيقة'] || row['الرقم'] || row['رقم الفاتورة'] || row['Invoice Number'] || row['Numero'] || ''
          ).trim();

          if (!docNum) return;

          const desc = String(
            row['البيان / وصف السلعة أو الخدمة'] || row['البيان'] || row['الوصف'] || row['Description'] || row['Désignation'] || `بند رقم ${idx + 1}`
          ).trim();

          const qty = Number(row['الكمية'] || row['Quantité'] || row['Quantity'] || 1) || 1;
          const unit = String(row['الوحدة'] || row['Unité'] || 'قطعة').trim();

          // Search price column
          let unitPrice = 0;
          for (const key of Object.keys(row)) {
            if (key.includes('سعر') || key.toLowerCase().includes('prix') || key.toLowerCase().includes('price') || key.toLowerCase().includes('pu')) {
              unitPrice = Number(row[key]) || 0;
              break;
            }
          }

          let taxRate = 19;
          for (const key of Object.keys(row)) {
            if (key.includes('TVA') || key.includes('أداء') || key.includes('ضريبة')) {
              const valStr = String(row[key]).replace('%', '').trim();
              const parsed = Number(valStr);
              if (!isNaN(parsed)) taxRate = parsed;
              break;
            }
          }

          let discount = 0;
          for (const key of Object.keys(row)) {
            if (key.includes('خصم') || key.toLowerCase().includes('remise') || key.toLowerCase().includes('discount')) {
              const valStr = String(row[key]).replace('%', '').trim();
              const parsed = Number(valStr);
              if (!isNaN(parsed)) discount = parsed;
              break;
            }
          }

          const rawTotal = qty * unitPrice;
          const discountedTotal = rawTotal * (1 - (discount || 0) / 100);
          const itemTtc = discountedTotal * (1 + (taxRate || 0) / 100);

          const item: InvoiceItem = {
            id: `item-imp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            description: desc,
            quantity: qty,
            unitPrice,
            taxRate,
            discount,
            unit,
            total: Number(itemTtc.toFixed(3)),
          };

          const existing = itemsByDocNum.get(docNum) || [];
          existing.push(item);
          itemsByDocNum.set(docNum, existing);
        });

        const importedInvoices: Invoice[] = [];
        const errors: string[] = [];

        rawDocs.forEach((row, idx) => {
          // Identify doc number
          const docNum = String(
            row['رقم الوثيقة'] || row['الرقم'] || row['رقم الفاتورة'] || row['Invoice Number'] || row['Numero'] || `DOC-IMP-${Date.now()}-${idx + 1}`
          ).trim();

          // Identify doc type
          const docTypeRaw = String(
            row['نوع الوثيقة'] || row['النوع'] || row['Document Type'] || row['Type'] || ''
          ).toLowerCase();

          const isDelivery =
            docTypeRaw.includes('وصل') ||
            docTypeRaw.includes('استلام') ||
            docTypeRaw.includes('تسليم') ||
            docTypeRaw.includes('bl') ||
            docTypeRaw.includes('livraison') ||
            docNum.toUpperCase().startsWith('BL');

          const documentType: DocumentType = isDelivery ? 'delivery_note' : 'invoice';

          // Client information
          const clientName = String(
            row['اسم الحريف (العميل)'] || row['الحريف'] || row['العميل'] || row['Client'] || row['Customer'] || 'حريف عام'
          ).trim();

          const clientCompany = String(row['المؤسسة / الشركة'] || row['المؤسسة'] || row['الشركة'] || row['Société'] || '').trim();
          const clientTaxNum = String(row['المعرف الجبائي (MF)'] || row['المعرف الجبائي'] || row['Matricule Fiscal'] || row['MF'] || '').trim();
          const clientCommercialReg = String(row['السجل التجاري (RC)'] || row['السجل التجاري'] || row['Registre'] || '').trim();
          const clientPhone = String(row['الهاتف'] || row['Téléphone'] || row['Phone'] || '').trim();
          const clientEmail = String(row['البريد الإلكتروني'] || row['البريد'] || row['Email'] || '').trim();
          const clientAddress = String(row['العنوان'] || row['Adresse'] || row['Address'] || '').trim();
          const clientCity = String(row['المدينة'] || row['Ville'] || row['City'] || 'تونس').trim();

          // Dates
          const today = new Date().toISOString().split('T')[0];
          let issueDate = String(row['تاريخ التحرير'] || row['تاريخ الإصدار'] || row['التاريخ'] || row['Date'] || today).trim();
          let dueDate = String(row['أجل الخلاص'] || row['تاريخ الاستحقاق'] || row['الأجل'] || row['Due Date'] || row['Échéance'] || '').trim();

          // Normalize Excel dates if serialized as numbers
          if (/^\d{5}$/.test(issueDate)) {
            const excelDate = new Date(Math.round((Number(issueDate) - 25569) * 86400 * 1000));
            issueDate = excelDate.toISOString().split('T')[0];
          }
          if (/^\d{5}$/.test(dueDate)) {
            const excelDate = new Date(Math.round((Number(dueDate) - 25569) * 86400 * 1000));
            dueDate = excelDate.toISOString().split('T')[0];
          }
          if (!dueDate) {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            dueDate = d.toISOString().split('T')[0];
          }

          // Timbre Fiscal
          let timbreFiscal = 0;
          for (const key of Object.keys(row)) {
            if (key.includes('طابع') || key.toLowerCase().includes('timbre')) {
              timbreFiscal = Number(row[key]) || 0;
              break;
            }
          }
          if (timbreFiscal === 0 && documentType === 'invoice') {
            timbreFiscal = 1.000;
          }

          // Items for this invoice
          let docItems = itemsByDocNum.get(docNum) || [];

          // If no specific line items were provided in Sheet 2, check if document row has total amounts
          if (docItems.length === 0) {
            let totalAmount = 0;
            for (const key of Object.keys(row)) {
              if (key.includes('المبلغ الجملي') || key.includes('TTC') || key.toLowerCase().includes('total')) {
                totalAmount = Number(row[key]) || 0;
                break;
              }
            }

            if (totalAmount > 0) {
              const htEstimated = (totalAmount - timbreFiscal) / 1.19;
              docItems = [
                {
                  id: `item-gen-${Date.now()}-${idx}`,
                  description: 'سلع وخدمات مفوترة (مستوردة من Excel)',
                  quantity: 1,
                  unitPrice: Number(htEstimated.toFixed(3)),
                  taxRate: 19,
                  discount: 0,
                  unit: 'حزمة',
                  total: Number(totalAmount.toFixed(3)),
                },
              ];
            } else {
              docItems = [
                {
                  id: `item-gen-${Date.now()}-${idx}`,
                  description: 'سلع وخدمات مفوترة',
                  quantity: 1,
                  unitPrice: 100.000,
                  taxRate: 19,
                  discount: 0,
                  unit: 'قطعة',
                  total: 119.000,
                },
              ];
            }
          }

          // Check payments or paid amount
          let amountPaid = 0;
          for (const key of Object.keys(row)) {
            if (key.includes('المستخلص') || key.includes('المدفوع') || key.toLowerCase().includes('payé') || key.toLowerCase().includes('paid')) {
              amountPaid = Number(row[key]) || 0;
              break;
            }
          }

          const payments: PaymentRecord[] = [];
          if (amountPaid > 0) {
            payments.push({
              id: `pay-imp-${Date.now()}-${idx}`,
              date: issueDate,
              amount: amountPaid,
              method: 'cash',
              reference: 'دفعة مستوردة من Excel',
              notes: 'سجل دفع مستورد تلقائياً',
              createdAt: new Date().toISOString(),
            });
          }

          // Status detection
          let status: InvoiceStatus = 'unpaid';
          const statusRaw = String(row['الحالة'] || row['Statut'] || row['Status'] || '').toLowerCase();

          if (statusRaw.includes('خالصة') || statusRaw.includes('payé') || statusRaw.includes('paid')) {
            status = 'paid';
          } else if (statusRaw.includes('جزئي') || statusRaw.includes('partiel')) {
            status = 'partial';
          } else if (statusRaw.includes('تسليم') || statusRaw.includes('livré') || statusRaw.includes('delivered')) {
            status = 'delivered';
          } else if (statusRaw.includes('متأخر') || statusRaw.includes('retard') || statusRaw.includes('overdue')) {
            status = 'overdue';
          } else if (statusRaw.includes('مسودة') || statusRaw.includes('brouillon') || statusRaw.includes('draft')) {
            status = 'draft';
          } else {
            status = isDelivery ? 'delivered' : 'unpaid';
          }

          const notes = String(row['ملاحظات'] || row['Notes'] || row['Remarques'] || '').trim();
          const terms = String(row['شروط الخلاص'] || row['Conditions'] || '').trim();

          // Calculate final accurate financial summary
          const summary = calculateInvoiceSummary(docItems, payments, status, dueDate, timbreFiscal, documentType);

          const invoice: Invoice = {
            id: `inv-imp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
            invoiceNumber: docNum,
            documentType,
            issueDate,
            dueDate,
            status: summary.status,
            currency: 'TND',
            client: {
              name: clientName,
              company: clientCompany || undefined,
              taxNumber: clientTaxNum || undefined,
              commercialRegistration: clientCommercialReg || undefined,
              phone: clientPhone || undefined,
              email: clientEmail || undefined,
              address: clientAddress || undefined,
              city: clientCity || undefined,
            },
            items: docItems,
            subtotal: summary.subtotal,
            taxTotal: summary.taxTotal,
            timbreFiscal: summary.timbreFiscal,
            discountTotal: summary.discountTotal,
            total: summary.total,
            amountPaid: summary.amountPaid,
            balanceDue: summary.balanceDue,
            notes: notes || undefined,
            terms: terms || undefined,
            payments,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          importedInvoices.push(invoice);
        });

        resolve({
          success: true,
          importedInvoices,
          count: importedInvoices.length,
          message: `تم بنجاح تحليل واستيراد ${importedInvoices.length} وثيقة (فواتير ووصولات استلام)`,
          errors,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        resolve({
          success: false,
          importedInvoices: [],
          count: 0,
          message: `حدث خطأ أثناء قراءة ملف Excel: ${errorMsg}`,
          errors: [errorMsg],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        importedInvoices: [],
        count: 0,
        message: 'تعذر قراءة الملف المحدد من جهازك',
        errors: ['خطأ في قراءة الملف'],
      });
    };

    reader.readAsArrayBuffer(file);
  });
};
