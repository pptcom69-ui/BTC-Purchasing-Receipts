import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Calculator,
  Sparkles,
  RotateCw,
  Check,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  Scale,
  Building2,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PurchasingDocument, LineItem } from '../types';
import { ACCOUNTING_DOC_TYPES, DOCUMENT_CATEGORIES } from '../data/constants';
import { formatCurrency, getSystemRecordNo } from '../utils/formatters';
import { reanalyzeDocumentWithAI, OCRScanResult } from '../services/aiOcrService';

interface DocumentEditModalProps {
  document: PurchasingDocument | null;
  onClose: () => void;
  onSave: (updatedDoc: PurchasingDocument) => void;
  customDocTypes: string[];
  onAddCustomDocType: (typeName: string) => void;
  autoReanalyze?: boolean;
}

export const DocumentEditModal: React.FC<DocumentEditModalProps> = ({
  document: initialDoc,
  onClose,
  onSave,
  customDocTypes,
  onAddCustomDocType,
  autoReanalyze = false,
}) => {
  // Form Fields State
  const [docType, setDocType] = useState(initialDoc?.doc_type || '');
  const [bookNo, setBookNo] = useState(initialDoc?.book_no || '');
  const [docNo, setDocNo] = useState(initialDoc?.doc_no || '');
  const [taxInvoiceNo, setTaxInvoiceNo] = useState(initialDoc?.tax_invoice_no || '');
  const [refNo, setRefNo] = useState(initialDoc?.ref_no || '');
  const [refLabel, setRefLabel] = useState(initialDoc?.ref_label || '');
  const [poNumber, setPoNumber] = useState(initialDoc?.po_number || '');
  const [date, setDate] = useState(initialDoc?.date || '');
  const [storeName, setStoreName] = useState(initialDoc?.store_name || '');
  const [vendorTaxId, setVendorTaxId] = useState(initialDoc?.vendor_tax_id || '');
  const [vendorBranch, setVendorBranch] = useState(
    initialDoc?.vendor_branch || 'สำนักงานใหญ่ (00000)'
  );
  const [category, setCategory] = useState(initialDoc?.category || 'ทั่วไป');
  const [companyName, setCompanyName] = useState(initialDoc?.company_name || '');
  const [jobName, setJobName] = useState(initialDoc?.job_name || '');
  const [requester, setRequester] = useState(initialDoc?.requester || '');
  const [payApprover, setPayApprover] = useState(initialDoc?.pay_approver || '');

  // Tax and Financials
  const [subtotalAmount, setSubtotalAmount] = useState<string>(
    initialDoc?.subtotal_amount !== undefined ? String(initialDoc.subtotal_amount) : ''
  );
  const [vatAmount, setVatAmount] = useState<string>(
    initialDoc?.vat_amount !== undefined ? String(initialDoc.vat_amount) : ''
  );
  const [vatRate, setVatRate] = useState<number>(initialDoc?.vat_rate || 7);

  // Weighbridge fields
  const [vehicleRegistration, setVehicleRegistration] = useState(
    initialDoc?.vehicle_registration || ''
  );
  const [weightIn, setWeightIn] = useState<string>(
    initialDoc?.scale_weight_in !== null && initialDoc?.scale_weight_in !== undefined
      ? String(initialDoc.scale_weight_in)
      : ''
  );
  const [weightOut, setWeightOut] = useState<string>(
    initialDoc?.scale_weight_out !== null && initialDoc?.scale_weight_out !== undefined
      ? String(initialDoc.scale_weight_out)
      : ''
  );
  const [weightNet, setWeightNet] = useState<string>(
    initialDoc?.scale_weight_net !== null && initialDoc?.scale_weight_net !== undefined
      ? String(initialDoc.scale_weight_net)
      : ''
  );

  // Line items
  const [items, setItems] = useState<LineItem[]>(
    initialDoc?.items && initialDoc.items.length > 0
      ? initialDoc.items.map((it) => ({ ...it }))
      : [{ name: '', quantity: 1, unit: 'ชิ้น', price_per_unit: 0, total: 0 }]
  );

  const [totalAmount, setTotalAmount] = useState<number>(initialDoc?.total_amount || 0);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [showAddCustomType, setShowAddCustomType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // AI Re-Reading States
  const [isAiReading, setIsAiReading] = useState(false);
  const [aiResult, setAiResult] = useState<OCRScanResult | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [isAiApplied, setIsAiApplied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(initialDoc?.image_url || null);
  const [aiScanStatus, setAiScanStatus] = useState<string>('');
  const [isComparisonExpanded, setIsComparisonExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or sync when initialDoc changes
  useEffect(() => {
    if (!initialDoc) return;
    resetToInitial();
    setPreviewImage(initialDoc.image_url || null);
    setAiResult(null);
    setShowComparison(false);
    setIsAiApplied(false);
  }, [initialDoc?.doc_key]);

  // Handle auto-reanalyze if launched from detail modal
  useEffect(() => {
    if (autoReanalyze && initialDoc) {
      handleRunAi();
    }
  }, [autoReanalyze, initialDoc?.doc_key]);

  // Reset form values back to initial document
  const resetToInitial = () => {
    if (!initialDoc) return;
    setDocType(initialDoc.doc_type || '');
    setBookNo(initialDoc.book_no || '');
    setDocNo(initialDoc.doc_no || '');
    setTaxInvoiceNo(initialDoc.tax_invoice_no || '');
    setRefNo(initialDoc.ref_no || '');
    setRefLabel(initialDoc.ref_label || '');
    setPoNumber(initialDoc.po_number || '');
    setDate(initialDoc.date || '');
    setStoreName(initialDoc.store_name || '');
    setVendorTaxId(initialDoc.vendor_tax_id || '');
    setVendorBranch(initialDoc.vendor_branch || 'สำนักงานใหญ่ (00000)');
    setCategory(initialDoc.category || 'ทั่วไป');
    setCompanyName(initialDoc.company_name || '');
    setJobName(initialDoc.job_name || '');
    setRequester(initialDoc.requester || '');
    setPayApprover(initialDoc.pay_approver || '');
    setSubtotalAmount(
      initialDoc.subtotal_amount !== undefined ? String(initialDoc.subtotal_amount) : ''
    );
    setVatAmount(initialDoc.vat_amount !== undefined ? String(initialDoc.vat_amount) : '');
    setVatRate(initialDoc.vat_rate || 7);
    setVehicleRegistration(initialDoc.vehicle_registration || '');
    setWeightIn(
      initialDoc.scale_weight_in !== null && initialDoc.scale_weight_in !== undefined
        ? String(initialDoc.scale_weight_in)
        : ''
    );
    setWeightOut(
      initialDoc.scale_weight_out !== null && initialDoc.scale_weight_out !== undefined
        ? String(initialDoc.scale_weight_out)
        : ''
    );
    setWeightNet(
      initialDoc.scale_weight_net !== null && initialDoc.scale_weight_net !== undefined
        ? String(initialDoc.scale_weight_net)
        : ''
    );
    setItems(
      initialDoc.items && initialDoc.items.length > 0
        ? initialDoc.items.map((it) => ({ ...it }))
        : [{ name: '', quantity: 1, unit: 'ชิ้น', price_per_unit: 0, total: 0 }]
    );
    setTotalAmount(initialDoc.total_amount || 0);
    setIsManualTotal(false);
  };

  // Run AI Re-analysis
  const handleRunAi = async (customImageBase64?: string, customFileName?: string) => {
    if (!initialDoc) return;
    setIsAiReading(true);
    setAiScanStatus('AI กำลังสแกนความคมชัดและตรวจจับข้อความภาษาไทย...');

    try {
      const result = await reanalyzeDocumentWithAI(
        initialDoc,
        customImageBase64,
        customFileName
      );
      setAiResult(result);
      setShowComparison(true);
      setIsComparisonExpanded(true);
    } catch (err) {
      console.error('Error re-analyzing document:', err);
    } finally {
      setIsAiReading(false);
      setAiScanStatus('');
    }
  };

  // Handle New File Upload from User
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      handleRunAi(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Apply All AI Fields into the Form
  const handleApplyAllAi = () => {
    if (!aiResult) return;
    setDocType(aiResult.doc_type);
    setDocNo(aiResult.doc_no);
    setTaxInvoiceNo(aiResult.tax_invoice_no || '');
    setPoNumber(aiResult.po_number || '-');
    setDate(aiResult.date || date);
    setStoreName(aiResult.store_name);
    if (aiResult.vendor_tax_id) setVendorTaxId(aiResult.vendor_tax_id);
    if (aiResult.vendor_branch) setVendorBranch(aiResult.vendor_branch);
    if (aiResult.category) setCategory(aiResult.category as any);
    if (aiResult.company_name) setCompanyName(aiResult.company_name);
    if (aiResult.job_name) setJobName(aiResult.job_name);
    if (aiResult.requester) setRequester(aiResult.requester);
    if (aiResult.pay_approver) setPayApprover(aiResult.pay_approver);
    if (aiResult.vehicle_registration) setVehicleRegistration(aiResult.vehicle_registration);
    if (aiResult.scale_weight_in !== undefined && aiResult.scale_weight_in !== null) {
      setWeightIn(String(aiResult.scale_weight_in));
    }
    if (aiResult.scale_weight_out !== undefined && aiResult.scale_weight_out !== null) {
      setWeightOut(String(aiResult.scale_weight_out));
    }
    if (aiResult.scale_weight_net !== undefined && aiResult.scale_weight_net !== null) {
      setWeightNet(String(aiResult.scale_weight_net));
    }
    if (aiResult.items && aiResult.items.length > 0) {
      setItems(aiResult.items.map((it) => ({ ...it })));
    }
    if (aiResult.subtotal_amount !== undefined) {
      setSubtotalAmount(String(aiResult.subtotal_amount));
    }
    if (aiResult.vat_amount !== undefined) {
      setVatAmount(String(aiResult.vat_amount));
    }
    if (aiResult.total_amount) {
      setTotalAmount(aiResult.total_amount);
      setIsManualTotal(true);
    }
    setIsAiApplied(true);
  };

  // Revert back to original data
  const handleRevertToOriginal = () => {
    resetToInitial();
    setIsAiApplied(false);
  };

  // Auto calculate total when items change
  useEffect(() => {
    if (!isManualTotal) {
      const sum = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
      setTotalAmount(sum);
    }
  }, [items, isManualTotal]);

  // Auto calculate net weight if in and out provided
  const handleWeightChange = (inVal: string, outVal: string) => {
    setWeightIn(inVal);
    setWeightOut(outVal);
    const nIn = parseFloat(inVal);
    const nOut = parseFloat(outVal);
    if (!isNaN(nIn) && !isNaN(nOut)) {
      const net = Math.abs(nIn - nOut);
      setWeightNet(net.toFixed(2));
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const nextItems = [...items];
    const current = { ...nextItems[index], [field]: value };

    if (field === 'quantity' || field === 'price_per_unit') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : current.quantity;
      const price = field === 'price_per_unit' ? parseFloat(value) || 0 : current.price_per_unit;
      current.total = Math.round(qty * price * 100) / 100;
    }

    nextItems[index] = current;
    setItems(nextItems);
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unit: 'หน่วย', price_per_unit: 0, total: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    if (!initialDoc) return;
    if (!docNo.trim()) {
      alert('กรุณาระบุ "เลขที่เอกสาร" บนบิล เนื่องจากเป็นข้อมูลสำคัญสำหรับระบุและอ้างอิงเอกสาร');
      return;
    }
    if (!date || !date.trim()) {
      alert('กรุณาระบุ "วันที่ในบิล" เนื่องจากเป็นข้อมูลสำคัญสำหรับงานบัญชีและจัดซื้อ');
      return;
    }

    const cleanItems = items.filter((it) => it.name.trim() !== '' || it.total > 0);
    const itemsSummary = cleanItems
      .map((it) => `${it.name} (${it.quantity} ${it.unit})`)
      .join(', ');

    const updated: PurchasingDocument = {
      ...initialDoc,
      system_record_no: initialDoc.system_record_no || getSystemRecordNo(initialDoc),
      doc_type: docType,
      book_no: bookNo.trim(),
      doc_no: docNo.trim(),
      tax_invoice_no: taxInvoiceNo.trim(),
      ref_no: refNo.trim(),
      ref_label: refLabel.trim(),
      po_number: poNumber.trim() || '-',
      date: date || initialDoc.date,
      store_name: storeName.trim() || 'ไม่ระบุร้านค้า',
      vendor_tax_id: vendorTaxId.trim() || undefined,
      vendor_branch: vendorBranch.trim() || undefined,
      category: category,
      company_name: companyName.trim(),
      job_name: jobName.trim(),
      requester: requester.trim(),
      pay_approver: payApprover.trim(),
      vehicle_registration: vehicleRegistration.trim(),
      scale_weight_in: weightIn ? parseFloat(weightIn) : null,
      scale_weight_out: weightOut ? parseFloat(weightOut) : null,
      scale_weight_net: weightNet ? parseFloat(weightNet) : null,
      items: cleanItems,
      items_summary: itemsSummary,
      subtotal_amount: subtotalAmount ? parseFloat(subtotalAmount) : undefined,
      vat_amount: vatAmount ? parseFloat(vatAmount) : undefined,
      vat_rate: vatRate,
      total_amount: Number(totalAmount) || 0,
      image_url: previewImage || initialDoc.image_url,
      is_valid_tax_invoice:
        vendorTaxId.length === 13 && !!taxInvoiceNo && (Number(totalAmount) || 0) > 0,
      needs_review: false,
      review_reason: undefined,
    };

    onSave(updated);
  };

  const handleCreateCustomType = () => {
    if (!newTypeName.trim()) return;
    onAddCustomDocType(newTypeName.trim());
    setDocType(newTypeName.trim());
    setNewTypeName('');
    setShowAddCustomType(false);
  };

  // Compute field-by-field differences for comparison table
  const comparisonRows = (aiResult && initialDoc)
    ? [
        {
          label: 'ประเภทเอกสาร',
          orig: initialDoc.doc_type || '-',
          ai: aiResult.doc_type,
          changed: (initialDoc.doc_type || '') !== aiResult.doc_type,
          onApplySingle: () => setDocType(aiResult.doc_type),
        },
        {
          label: 'เลขที่เอกสาร / บิล',
          orig: initialDoc.doc_no || '-',
          ai: aiResult.doc_no,
          changed: (initialDoc.doc_no || '') !== aiResult.doc_no,
          onApplySingle: () => setDocNo(aiResult.doc_no),
        },
        {
          label: 'เลขที่ใบกำกับภาษี',
          orig: initialDoc.tax_invoice_no || '-',
          ai: aiResult.tax_invoice_no || '-',
          changed: (initialDoc.tax_invoice_no || '-') !== (aiResult.tax_invoice_no || '-'),
          onApplySingle: () => setTaxInvoiceNo(aiResult.tax_invoice_no || ''),
        },
        {
          label: 'เลขที่ PO อ้างอิง',
          orig: initialDoc.po_number || '-',
          ai: aiResult.po_number || '-',
          changed: (initialDoc.po_number || '-') !== (aiResult.po_number || '-'),
          onApplySingle: () => setPoNumber(aiResult.po_number || '-'),
        },
        {
          label: 'วันที่เอกสาร',
          orig: initialDoc.date || '-',
          ai: aiResult.date || '-',
          changed: (initialDoc.date || '-') !== (aiResult.date || '-'),
          onApplySingle: () => setDate(aiResult.date || date),
        },
        {
          label: 'ชื่อร้านค้า / ผู้จำหน่าย',
          orig: initialDoc.store_name || '-',
          ai: aiResult.store_name,
          changed: (initialDoc.store_name || '') !== aiResult.store_name,
          onApplySingle: () => setStoreName(aiResult.store_name),
        },
        {
          label: 'เลขประจำตัวผู้เสียภาษี 13 หลัก',
          orig: initialDoc.vendor_tax_id || 'ไม่ระบุ',
          ai: aiResult.vendor_tax_id || 'ไม่ระบุ',
          changed: (initialDoc.vendor_tax_id || '') !== (aiResult.vendor_tax_id || ''),
          onApplySingle: () => setVendorTaxId(aiResult.vendor_tax_id || ''),
        },
        {
          label: 'ยอดรวมสุทธิ (Grand Total)',
          orig: `฿${(initialDoc.total_amount || 0).toLocaleString()}`,
          ai: `฿${(aiResult.total_amount || 0).toLocaleString()}`,
          changed: Math.abs((initialDoc.total_amount || 0) - (aiResult.total_amount || 0)) > 0.01,
          onApplySingle: () => {
            setTotalAmount(aiResult.total_amount);
            if (aiResult.subtotal_amount !== undefined) {
              setSubtotalAmount(String(aiResult.subtotal_amount));
            }
            if (aiResult.vat_amount !== undefined) {
              setVatAmount(String(aiResult.vat_amount));
            }
            setIsManualTotal(true);
          },
        },
        {
          label: 'รายการสินค้าในบิล',
          orig: `${initialDoc.items?.length || 0} รายการ`,
          ai: `${aiResult.items?.length || 0} รายการ`,
          changed: (initialDoc.items?.length || 0) !== (aiResult.items?.length || 0),
          onApplySingle: () => {
            if (aiResult.items && aiResult.items.length > 0) {
              setItems(aiResult.items.map((it) => ({ ...it })));
            }
          },
        },
      ]
    : [];

  const hasAnyDifference = comparisonRows.some((r) => r.changed);

  if (!initialDoc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[94vh] overflow-hidden border border-slate-200">
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="bg-[#27AE60] text-white text-xs px-2.5 py-1 rounded-md font-bold tracking-wide flex items-center gap-1.5 shadow-xs">
              <Building2 className="w-3.5 h-3.5" />
              BTC แก้ไขข้อมูลบิล
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hidden sm:inline-block" title="เลขที่รายการที่สร้างจากระบบ BTC">
              รหัสระบบ: {getSystemRecordNo(initialDoc)}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              แก้ไขและตรวจสอบข้อมูลบิลจัดซื้อ
            </h3>
            {isAiApplied && (
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                <Check className="w-3 h-3 text-emerald-600" />
                ใช้ข้อมูลใหม่จาก AI แล้ว
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Trigger AI button in Header */}
            <button
              type="button"
              onClick={() => handleRunAi()}
              disabled={isAiReading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition shadow-xs disabled:opacity-50"
              title="ให้ AI อ่านภาพบิลนี้ใหม่อีกครั้งเพื่อเทียบข้อมูล"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isAiReading ? 'animate-spin text-[#27AE60]' : ''}`} />
              <span>{isAiReading ? 'AI กำลังอ่านบิล...' : 'อ่านใหม่ (AI)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split: Left Image / Right Edit & Comparison */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left Column: Reference Image & AI Actions */}
          <div className="lg:w-[35%] shrink-0 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>ภาพบิลอ้างอิง</span>
                {isAiReading && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse font-medium">
                    กำลังวิเคราะห์...
                  </span>
                )}
              </span>

              {previewImage && (
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#27AE60] hover:underline flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>ดูภาพใหญ่</span>
                </a>
              )}
            </div>

            {/* Image Preview Box with Scanning Effect */}
            <div className="relative flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[190px] lg:min-h-0 group">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Bill Reference"
                  className="w-full h-full object-contain max-h-[46vh] lg:max-h-[60vh] rounded-lg transition"
                />
              ) : (
                <div className="text-center p-4 text-xs text-slate-400 space-y-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p>ไม่มีไฟล์ภาพบิล</p>
                </div>
              )}

              {/* Scanning Laser Beam overlay while reading */}
              {isAiReading && (
                <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-[#27AE60] to-emerald-400 shadow-md shadow-emerald-500/50 animate-bounce" />
                  <div className="bg-white/95 rounded-xl shadow-lg border border-emerald-200 p-4 max-w-xs space-y-2 text-center">
                    <RotateCw className="w-6 h-6 text-[#27AE60] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-800">AI กำลังวิเคราะห์และอ่านบิลใหม่</p>
                    <p className="text-[11px] text-slate-500">{aiScanStatus || 'ตรวจจับอักขระและตัวเลขภาษี...'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons under Image */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleRunAi()}
                disabled={isAiReading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#27AE60] hover:bg-[#219653] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>อ่านใหม่ด้วย AI</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAiReading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>อัปโหลดภาพใหม่</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              กดอ่านใหม่ (AI) หรือเปลี่ยนภาพบิลเพื่อวิเคราะห์ข้อมูลใหม่อัตโนมัติ
            </p>
          </div>

          {/* Right Column: AI Comparison & Editable Form */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
            {/* AI Comparison Section (Active when AI result is present) */}
            {showComparison && aiResult && (
              <div className="bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm space-y-3">
                {/* Comparison Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-emerald-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#27AE60] flex items-center justify-center font-bold shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>ส่วนเปรียบเทียบข้อมูลใหม่จาก AI กับข้อมูลเดิม</span>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ความมั่นใจ {aiResult.confidence_score}%
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {hasAnyDifference
                          ? 'ตรวจพบข้อมูลบางจุดแตกต่างจากเดิม กรุณาตรวจทานและเลือกว่าจะใช้ข้อมูลใหม่หรือข้อมูลเดิม'
                          : 'ข้อมูลที่ AI สแกนได้ตรงกับข้อมูลเดิมในระบบ'}
                      </p>
                    </div>
                  </div>

                  {/* Primary Decision Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleApplyAllAi}
                      className="px-3 py-1.5 bg-[#27AE60] hover:bg-[#219653] text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>นำข้อมูลใหม่ไปใช้ในฟอร์ม</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowComparison(false)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-300 transition"
                      title="ซ่อนตารางเปรียบเทียบและคงค่าเดิมในฟอร์ม"
                    >
                      คงใช้ข้อมูลเดิม
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsComparisonExpanded(!isComparisonExpanded)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                    >
                      {isComparisonExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Comparison Table */}
                {isComparisonExpanded && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                            <th className="py-2 px-3 font-semibold w-1/4">หัวข้อข้อมูล</th>
                            <th className="py-2 px-3 font-semibold w-1/3">ข้อมูลเดิมในระบบ</th>
                            <th className="py-2 px-3 font-semibold w-1/3">
                              <span className="text-[#27AE60] flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                ข้อมูลใหม่ที่ AI อ่านได้
                              </span>
                            </th>
                            <th className="py-2 px-2.5 font-semibold text-center w-24">สถานะ</th>
                            <th className="py-2 px-2.5 font-semibold text-right w-20">เลือกใช้</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`transition ${
                                row.changed
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70 font-medium'
                                  : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <td className="py-2 px-3 font-semibold text-slate-700">
                                {row.label}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px] break-words">
                                {row.orig}
                              </td>
                              <td
                                className={`py-2 px-3 font-mono text-[11px] break-words ${
                                  row.changed ? 'text-[#27AE60] font-bold' : 'text-slate-600'
                                }`}
                              >
                                {row.ai}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                {row.changed ? (
                                  <span className="inline-block text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                    มีการเปลี่ยน
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    ตรงกัน
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-right">
                                {row.changed && (
                                  <button
                                    type="button"
                                    onClick={row.onApplySingle}
                                    className="text-[11px] text-[#27AE60] hover:text-[#219653] font-bold hover:underline"
                                    title="เลือกใช้เฉพาะค่านี้ลงในฟอร์ม"
                                  >
                                    ใช้ค่านี้
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tax Compliance Notes by AI */}
                    {aiResult.tax_compliance_notes && aiResult.tax_compliance_notes.length > 0 && (
                      <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#27AE60] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">หมายเหตุการตรวจสอบภาษีจาก AI:</span>
                          <span className="ml-1 text-slate-700">
                            {aiResult.tax_compliance_notes.join(' • ')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notification Banner when AI Data was Loaded into Form */}
            {isAiApplied && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#27AE60] shrink-0" />
                  <span>
                    <strong>นำข้อมูลใหม่จาก AI ลงในฟอร์มแล้ว:</strong>{' '}
                    ท่านสามารถตรวจสอบความถูกต้อง ปรับแต่งช่องใดก็ได้ และกดบันทึกด้านล่าง
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRevertToOriginal}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition shrink-0"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>ย้อนคืนข้อมูลเดิม</span>
                </button>
              </div>
            )}

            {/* System Tracking Information Banner */}
            <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">เลขที่รายการที่สร้างจากระบบ (System Record No.):</span>
                <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                  {getSystemRecordNo(initialDoc)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Key: {initialDoc.doc_key}
              </span>
            </div>

            {/* Primary Document Metadata Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Doc Type */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">ประเภทเอกสาร:</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomType(!showAddCustomType)}
                    className="text-[10px] text-[#27AE60] hover:underline font-medium"
                  >
                    + เพิ่มประเภทใหม่
                  </button>
                </div>
                {showAddCustomType ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="ระบุประเภทใหม่..."
                      className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomType}
                      className="px-2 py-1 bg-[#27AE60] text-white rounded-lg text-xs font-semibold shrink-0"
                    >
                      เพิ่ม
                    </button>
                  </div>
                ) : (
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                  >
                    {ACCOUNTING_DOC_TYPES.map((t) => (
                      <option key={t.name} value={t.name}>
                        [{t.code}] {t.name}
                      </option>
                    ))}
                    {customDocTypes.map((c) => (
                      <option key={c} value={c}>
                        [CUSTOM] {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขที่เอกสาร (ในบิล): <span className="text-red-500 font-bold">* (จำเป็น)</span>
                </label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  placeholder="เช่น DN-9011 หรือ INV-88910"
                  className={`w-full px-2.5 py-2 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#27AE60] ${
                    !docNo.trim() ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                  }`}
                />
                {!docNo.trim() && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    ⚠️ จำเป็นต้องมีเลขที่เอกสารบนบิล
                  </p>
                )}
              </div>

              {/* Tax Invoice Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขที่ใบกำกับภาษี:
                </label>
                <input
                  type="text"
                  value={taxInvoiceNo}
                  onChange={(e) => setTaxInvoiceNo(e.target.value)}
                  placeholder="ถ้ามี (เช่น TAX-10920)"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* PO Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขที่ PO อ้างอิง:</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="เช่น PO-6902-001"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  วันที่ในบิล: <span className="text-red-500 font-bold">* (จำเป็น)</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-2.5 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60] ${
                    !date ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                  }`}
                />
                {!date && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    ⚠️ จำเป็นต้องมีวันที่ในบิล
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Store Name */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อร้านค้า / ซัพพลายเออร์:
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="เช่น บจก. ซีแพค บุรีรัมย์"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* Vendor Tax ID */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขผู้เสียภาษีผู้ขาย (13 หลัก):
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={vendorTaxId}
                  onChange={(e) => setVendorTaxId(e.target.value)}
                  placeholder="เช่น 0105536001234"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* Vendor Branch */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">สาขาผู้ขาย:</label>
                <input
                  type="text"
                  value={vendorBranch}
                  onChange={(e) => setVendorBranch(e.target.value)}
                  placeholder="เช่น สำนักงานใหญ่ (00000)"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* Job / Project Name */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">โครงการ / หน้างาน:</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="เช่น โครงการขยายทางเลี่ยงเมืองบุรีรัมย์"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              {/* Requester & Pay Approver */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ผู้ขอซื้อ / วิศวกร:</label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  placeholder="ชื่อผู้ขอซื้อ"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ผู้อนุมัติจ่าย:</label>
                <input
                  type="text"
                  value={payApprover}
                  onChange={(e) => setPayApprover(e.target.value)}
                  placeholder="ชื่อผู้อนุมัติจ่าย"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#27AE60]"
                />
              </div>
            </div>

            {/* Weighbridge Section (If scale ticket or weight is present) */}
            {(docType.includes('ชั่ง') ||
              weightNet ||
              vehicleRegistration ||
              initialDoc.scale_weight_net) && (
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>ข้อมูลชั่งน้ำหนักและยานพาหนะ:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">ทะเบียนรถ:</label>
                    <input
                      type="text"
                      value={vehicleRegistration}
                      onChange={(e) => setVehicleRegistration(e.target.value)}
                      placeholder="เช่น 82-5541 บุรีรัมย์"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">น้ำหนักเข้า (ตัน):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightIn}
                      onChange={(e) => handleWeightChange(e.target.value, weightOut)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">น้ำหนักออก (ตัน):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightOut}
                      onChange={(e) => handleWeightChange(weightIn, e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      น้ำหนักสุทธิ (ตัน):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightNet}
                      onChange={(e) => setWeightNet(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white font-mono font-bold text-amber-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                  <span>รายการสินค้าและบริการในบิล:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({items.length} รายการ)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแถวรายการ</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2 px-3 font-semibold w-12 text-center">#</th>
                      <th className="py-2 px-3 font-semibold">ชื่อรายการสินค้า / บริการ</th>
                      <th className="py-2 px-3 font-semibold w-24 text-right">จำนวน</th>
                      <th className="py-2 px-3 font-semibold w-20">หน่วย</th>
                      <th className="py-2 px-3 font-semibold w-28 text-right">ราคา/หน่วย</th>
                      <th className="py-2 px-3 font-semibold w-28 text-right">รวมเงิน (฿)</th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="ระบุชื่อสินค้า..."
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#27AE60]"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="หน่วย"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.price_per_unit}
                            onChange={(e) =>
                              handleItemChange(index, 'price_per_unit', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financials & VAT Calculation (ม.86/4) */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <Calculator className="w-4 h-4 text-[#27AE60]" />
                  <span>สรุปมูลค่าและภาษีมูลค่าเพิ่ม (ม.86/4):</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sub = parseFloat(subtotalAmount) || totalAmount / 1.07;
                    const vat = Math.round(sub * 0.07 * 100) / 100;
                    setSubtotalAmount(sub.toFixed(2));
                    setVatAmount(vat.toFixed(2));
                    setTotalAmount(Math.round((sub + vat) * 100) / 100);
                    setIsManualTotal(true);
                  }}
                  className="text-[10px] px-2 py-0.5 bg-white border border-emerald-300 text-[#27AE60] rounded hover:bg-emerald-50 transition font-semibold"
                >
                  คำนวณ VAT 7%
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">มูลค่าก่อน VAT:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotalAmount}
                    onChange={(e) => {
                      setSubtotalAmount(e.target.value);
                      setIsManualTotal(true);
                    }}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">ภาษีมูลค่าเพิ่ม 7%:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vatAmount}
                    onChange={(e) => {
                      setVatAmount(e.target.value);
                      setIsManualTotal(true);
                    }}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">ยอดรวมสุทธิ (Grand Total):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => {
                      setIsManualTotal(true);
                      setTotalAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs font-mono font-bold bg-white text-[#27AE60]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition"
          >
            ยกเลิก
          </button>

          <div className="flex items-center space-x-2">
            {showComparison && (
              <button
                type="button"
                onClick={() => setIsComparisonExpanded(!isComparisonExpanded)}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition"
              >
                {isComparisonExpanded ? 'ย่อตารางเทียบ' : 'เปิดดูตารางเทียบ'}
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#27AE60] hover:bg-[#219653] text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
