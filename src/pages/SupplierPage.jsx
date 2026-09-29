import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

const fetchAllSuppliers = () => apiFetch("/api/suppliers");

const createSupplier = (data) =>
  apiFetch("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateSupplier = (id, data) =>
  apiFetch(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const deleteSupplier = (id) =>
  apiFetch(`/api/suppliers/${id}`, {
    method: "DELETE",
  });

const fetchSupplierLedger = (id) =>
  apiFetch(`/api/suppliers/${id}/ledger`);

const createSupplierLedgerEntry = (supplierId, data) =>
  apiFetch(`/api/suppliers/${supplierId}/ledger`, {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateSupplierLedgerEntry = (supplierId, entryId, data) =>
  apiFetch(`/api/suppliers/${supplierId}/ledger/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const deleteSupplierLedgerEntry = (supplierId, entryId) =>
  apiFetch(`/api/suppliers/${supplierId}/ledger/${entryId}`, {
    method: "DELETE",
  });

async function translateText(text) {
  if (!text || !String(text).trim()) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      String(text).trim()
    )}&langpair=en|ur`;

    const res = await fetch(url);
    if (!res.ok) return text;

    const data = await res.json();
    const translated = data?.responseData?.translatedText;

    if (
      !translated ||
      translated.toLowerCase() === String(text).trim().toLowerCase()
    ) {
      return text;
    }

    return translated;
  } catch {
    return text;
  }
}

const LANG = {
  en: {
    title: "Supplier Management",
    subtitle: "Manage your suppliers",
    addBtn: "Add Supplier",
    summaryBtn: "View Summary",
    hideSummary: "Hide Summary",
    searchPlaceholder: "Search supplier name, phone or balance...",
    supplierName: "Supplier Name",
    supplierNameLabel: "Supplier Name",
    phone: "Phone No",
    openingBalance: "Opening Balance",
    closingBalance: "Closing Balance",
    openingDebit: "Opening Balance (Dr)",
    openingCredit: "Opening Balance (Cr)",
    address: "Address",
    totalOpeningBalance: "Total Opening Balance",
    balancePlaceholder: "0",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Action",
    noRecords: "No suppliers found.",
    toggleLang: "اردو",
    translating: "Translating to Urdu...",
    loading: "Loading suppliers...",
    refresh: "Refresh",
    fetchError: "Failed to load suppliers.",
    saveError: "Failed to save supplier.",
    deleteError: "Failed to delete supplier.",
    successSave: "Supplier saved successfully!",
    successDelete: "Supplier deleted successfully!",
    deleteConfirm: "Are you sure you want to delete this supplier?",
    errorMsg: "Supplier name is required.",
    totalSuppliers: "Total Suppliers",
    visibleRecords: "Visible Records",
    supplierPlaceholder: "e.g. Ali Traders",
    phonePlaceholder: "03XX-XXXXXXX",
    printBtn: "Print",
    pdfBtn: "Download PDF",
    reportHeader: "Suppliers List",
    printedOn: "Printed On",
    formTitleAdd: "New Supplier",
    formTitleEdit: "Edit Supplier",
    formSubtitle: "Supplier name, phone, address and opening debit/credit information",
    details: "Details",
    ledger: "Ledger",
    ledgerTitle: "Supplier Ledger",
    ledgerLoading: "Loading ledger...",
    ledgerEmpty: "No ledger entries found.",
    addLedgerEntry: "Add Ledger Entry",
    editLedgerEntry: "Edit Ledger Entry",
    entryDate: "Entry Date",
    description: "Description",
    descriptionPlaceholder: "e.g. Purchase invoice or payment",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    source: "Source",
    manual: "Manual",
    saveEntry: "Save Entry",
    entrySaved: "Ledger entry saved successfully!",
    entryDeleted: "Ledger entry deleted successfully!",
    entrySaveError: "Failed to save ledger entry.",
    entryDeleteError: "Failed to delete ledger entry.",
    ledgerError: "Failed to load supplier ledger.",
    entryDeleteConfirm: "Are you sure you want to delete this ledger entry?",
    invalidLedgerEntry: "Enter description and at least one debit or credit amount.",
    call: "Call",
    noPhone: "Phone number not available.",
    close: "Close",
  },

  ur: {
    title: "سپلائر مینجمنٹ",
    subtitle: "اپنے سپلائرز کا انتظام کریں",
    addBtn: "سپلائر شامل کریں",
    summaryBtn: "سمری دیکھیں",
    hideSummary: "سمری بند کریں",
    searchPlaceholder: "سپلائر نام، فون یا بیلنس سے تلاش کریں...",
    supplierName: "سپلائر کا نام",
    supplierNameLabel: "سپلائر کا نام",
    phone: "فون نمبر",
    openingBalance: "اوپننگ بیلنس",
    closingBalance: "کلوزنگ بیلنس",
    openingDebit: "اوپننگ بیلنس (ڈیبٹ)",
    openingCredit: "اوپننگ بیلنس (کریڈٹ)",
    address: "پتہ",
    totalOpeningBalance: "کل اوپننگ بیلنس",
    balancePlaceholder: "0",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "ایکشن",
    noRecords: "کوئی سپلائر نہیں ملا۔",
    toggleLang: "English",
    translating: "اردو میں ترجمہ ہو رہا ہے...",
    loading: "سپلائرز لوڈ ہو رہے ہیں...",
    refresh: "ری فریش",
    fetchError: "سپلائرز لوڈ نہیں ہو سکے۔",
    saveError: "سپلائر محفوظ نہیں ہو سکا۔",
    deleteError: "سپلائر حذف نہیں ہو سکا۔",
    successSave: "سپلائر کامیابی سے محفوظ ہو گیا!",
    successDelete: "سپلائر حذف ہو گیا!",
    deleteConfirm: "کیا آپ واقعی اس سپلائر کو حذف کرنا چاہتے ہیں؟",
    errorMsg: "سپلائر کا نام ضروری ہے۔",
    totalSuppliers: "کل سپلائرز",
    visibleRecords: "نظر آنے والے ریکارڈز",
    supplierPlaceholder: "مثلاً Ali Traders",
    phonePlaceholder: "03XX-XXXXXXX",
    printBtn: "پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "سپلائرز کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
    formTitleAdd: "نیا سپلائر",
    formTitleEdit: "سپلائر ترمیم",
    formSubtitle: "سپلائر نام، فون اور اوپننگ بیلنس معلومات",
    details: "تفصیل",
    ledger: "لیجر",
    ledgerTitle: "سپلائر لیجر",
    ledgerLoading: "لیجر لوڈ ہو رہا ہے...",
    ledgerEmpty: "کوئی لیجر انٹری نہیں ملی۔",
    addLedgerEntry: "لیجر انٹری شامل کریں",
    editLedgerEntry: "لیجر انٹری میں ترمیم",
    entryDate: "اندراج کی تاریخ",
    description: "تفصیل",
    descriptionPlaceholder: "مثلاً خریداری انوائس یا ادائیگی",
    debit: "ڈیبٹ",
    credit: "کریڈٹ",
    balance: "بیلنس",
    source: "سورس",
    manual: "مینول",
    saveEntry: "انٹری محفوظ کریں",
    entrySaved: "لیجر انٹری محفوظ ہو گئی!",
    entryDeleted: "لیجر انٹری حذف ہو گئی!",
    entrySaveError: "لیجر انٹری محفوظ نہیں ہو سکی۔",
    entryDeleteError: "لیجر انٹری حذف نہیں ہو سکی۔",
    ledgerError: "سپلائر لیجر لوڈ نہیں ہو سکا۔",
    entryDeleteConfirm: "کیا آپ واقعی یہ لیجر انٹری حذف کرنا چاہتے ہیں؟",
    invalidLedgerEntry: "تفصیل اور ڈیبٹ یا کریڈٹ میں سے کم از کم ایک رقم درج کریں۔",
    call: "کال",
    noPhone: "فون نمبر موجود نہیں ہے۔",
    close: "بند کریں",
  },
};

const defaultForm = {
  supplier_name: "",
  phone: "",
  address: "",
  opening_debit: "",
  opening_credit: "",
  opening_balance: "",
};

function todayInputValue() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().slice(0, 10);
}

const defaultLedgerForm = {
  entry_date: todayInputValue(),
  description: "",
  debit: "",
  credit: "",
};

function formatBalanceWithSide(value) {
  const amount = Number(value || 0);
  if (amount > 0) return `${formatMoney(amount)} Dr`;
  if (amount < 0) return `${formatMoney(Math.abs(amount))} Cr`;
  return "0";
}

function calculateSupplierClosingBalance(openingBalance, entries) {
  let balance = Number(openingBalance || 0);
  for (const entry of entries) {
    balance += Number(entry.debit || 0) - Number(entry.credit || 0);
  }
  return balance;
}

const getSupplierName = (supplier, isUrdu, cache) =>
  isUrdu
    ? cache[`name:${supplier.id}`] || supplier.supplier_name || "—"
    : supplier.supplier_name || "—";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function generatePrintDocument(suppliers, lang, urduCache, isPdf = false) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const font = isUrdu
    ? "'Noto Nastaliq Urdu', serif"
    : "Inter, Arial, sans-serif";

  const totalOpening = suppliers.reduce(
    (sum, supplier) => sum + Number(supplier.opening_balance || 0),
    0
  );

  const rowsHtml = suppliers
    .map((supplier, index) => {
      const nameDisplay = getSupplierName(supplier, isUrdu, urduCache);

      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td class="strong">${nameDisplay}</td>
          <td class="mono">${supplier.phone || "—"}</td>
          <td class="mono num">PKR ${formatMoney(supplier.closing_balance ?? supplier.opening_balance)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${t.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:${font};background:#f8fafc;color:#0f172a;padding:20px}
.page{width:100%;min-height:100vh;background:#f8fafc;padding:20px}
.sheet{max-width:1100px;margin:0 auto;background:#fff;border:1px solid #D6E0EE;box-shadow:0 12px 40px rgba(15,23,42,.08);border-radius:20px;overflow:hidden}
.header{background:#0f172a;color:#fff;padding:24px 28px}
.header-row{display:flex;justify-content:space-between;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:14px}
.logo{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px}
h1{font-size:28px;font-weight:900;margin:0}
.subtitle{font-size:13px;color:rgba(255,255,255,.72);margin-top:5px}
.meta{text-align:${isUrdu ? "left" : "right"};font-size:12px;color:rgba(255,255,255,.85);line-height:1.8}
.content{padding:18px;display:flex;flex-direction:column;gap:14px}
.hint{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:14px;padding:12px 14px;font-size:13px}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.card{border-radius:16px;padding:14px 16px;border:1px solid #D6E0EE;background:#f8fafc}
.card small{display:block;font-size:12px;color:#64748b;margin-bottom:6px}
.card .value{font-size:22px;font-weight:900;color:#0f172a}
table{width:100%;border-collapse:collapse;overflow:hidden;border-radius:14px}
thead th{background:#0f172a;color:#fff;font-size:12px;padding:12px 10px;text-align:${isUrdu ? "right" : "left"};text-transform:uppercase;letter-spacing:.5px}
tbody td{border:1px solid #e5e7eb;padding:12px 10px;font-size:13px;color:#334155}
tbody tr:nth-child(even) td{background:#f8fafc}
.center{text-align:center!important}
.strong{font-weight:800;color:#0f172a}
.mono{font-family:Inter,Arial,sans-serif;font-weight:700}
.num{text-align:${isUrdu ? "left" : "right"}!important}
.footer{background:#0f172a;color:rgba(255,255,255,.8);padding:10px 16px;display:flex;justify-content:space-between;font-size:11px}
@media print{@page{size:A4;margin:10mm}body{background:white;padding:0}.page{padding:0;background:white}.sheet{box-shadow:none;border:none;border-radius:0;max-width:none}.hint{display:none}}
</style>
</head>
<body>
<div class="page">
  <div class="sheet">
    <div class="header">
      <div class="header-row">
        <div class="brand">
          <div class="logo">SUP</div>
          <div>
            <h1>Ali Cages</h1>
            <div class="subtitle">${t.reportHeader}</div>
          </div>
        </div>
        <div class="meta">
          <div>${t.printedOn}: ${new Date().toLocaleString(
    isUrdu ? "ur-PK" : "en-PK"
  )}</div>
          <div>${t.totalSuppliers}: <strong style="color:white">${
    suppliers.length
  }</strong></div>
          <div>${t.totalOpeningBalance}: <strong style="color:white">PKR ${formatMoney(
    totalOpening
  )}</strong></div>
        </div>
      </div>
    </div>

    <div class="content">
      ${
        isPdf
          ? `<div class="hint">Choose <strong>Save as PDF</strong> in print dialog.</div>`
          : ""
      }

      <div class="summary">
        <div class="card"><small>${t.totalSuppliers}</small><div class="value">${
    suppliers.length
  }</div></div>
        <div class="card"><small>${t.totalOpeningBalance}</small><div class="value">PKR ${formatMoney(
    totalOpening
  )}</div></div>
        <div class="card"><small>${
          t.reportHeader
        }</small><div class="value">${new Date().toLocaleDateString(
    isUrdu ? "ur-PK" : "en-PK"
  )}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>${t.supplierName}</th>
            <th>${t.phone}</th>
            <th class="num">${t.openingBalance}</th>
          </tr>
        </thead>
        <tbody>
          ${
            suppliers.length > 0
              ? rowsHtml
              : `<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8">${t.noRecords}</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>Ali Cages — ${t.reportHeader}</span>
      <span>Page 1 / 1</span>
    </div>
  </div>
</div>

<script>
window.onload=()=>{setTimeout(()=>{window.print();${
    !isPdf ? "window.onafterprint=()=>window.close();" : ""
  }},300);};
</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1200,height=850");
  if (!w) return;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

const SupplierPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);

  const [urduCache, setUrduCache] = useState({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [form, setForm] = useState(defaultForm);

  const [showLedger, setShowLedger] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [ledgerEditingId, setLedgerEditingId] = useState(null);
  const [ledgerSubmitting, setLedgerSubmitting] = useState(false);
  const [ledgerForm, setLedgerForm] = useState(defaultLedgerForm);

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });

    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3000);
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchAllSuppliers();
      setSuppliers(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      showToast("error", err.message || t.fetchError);
    } finally {
      setLoading(false);
    }
  }, [showToast, t.fetchError]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleLangToggle = async () => {
    const newLang = lang === "en" ? "ur" : "en";
    setLang(newLang);

    if (newLang !== "ur" || suppliers.length === 0) return;

    const untranslated = suppliers.filter(
      (supplier) => !urduCache[`name:${supplier.id}`]
    );

    if (!untranslated.length) return;

    setTranslating(true);

    try {
      const results = await Promise.all(
        untranslated.map(async (supplier) => {
          const nameUr = await translateText(supplier.supplier_name || "");
          return { id: supplier.id, nameUr };
        })
      );

      setUrduCache((prev) => {
        const next = { ...prev };

        results.forEach(({ id, nameUr }) => {
          next[`name:${id}`] = nameUr;
        });

        return next;
      });
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const openAdd = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (supplier) => {
    setForm({
      supplier_name: supplier.supplier_name || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      opening_debit: String(supplier.opening_debit ?? (Number(supplier.opening_balance) > 0 ? supplier.opening_balance : "")),
      opening_credit: String(supplier.opening_credit ?? (Number(supplier.opening_balance) < 0 ? Math.abs(Number(supplier.opening_balance)) : "")),
      opening_balance: String(supplier.opening_balance ?? ""),
    });

    setEditingId(supplier.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.supplier_name.trim()) {
      showToast("error", t.errorMsg);
      return;
    }

    const openingDebit = Number(form.opening_debit || 0);
    const openingCredit = Number(form.opening_credit || 0);
    const payload = {
      supplier_name: form.supplier_name.trim(),
      phone: form.phone.trim(),
      address: String(form.address || "").trim(),
      opening_debit: openingDebit,
      opening_credit: openingCredit,
      opening_balance: openingDebit - openingCredit,
    };

    try {
      setSubmitting(true);

      if (editingId) {
        const res = await updateSupplier(editingId, payload);
        const updated = res?.data || res;

        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.id === editingId ? updated : supplier
          )
        );

        setUrduCache((prev) => {
          const next = { ...prev };
          delete next[`name:${editingId}`];
          return next;
        });
      } else {
        const res = await createSupplier(payload);
        const created = res?.data || res;

        setSuppliers((prev) => [created, ...prev]);
      }

      showToast("success", t.successSave);
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
    } catch (err) {
      showToast("error", err.message || t.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await deleteSupplier(id);

      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));

      setUrduCache((prev) => {
        const next = { ...prev };
        delete next[`name:${id}`];
        return next;
      });

      showToast("success", t.successDelete);
    } catch (err) {
      showToast("error", err.message || t.deleteError);
    }
  };

  const handleCall = (supplier) => {
    const phone = String(supplier?.phone || "").trim();

    if (!phone) {
      showToast("error", t.noPhone);
      return;
    }

    const dialNumber = phone.replace(/(?!^\+)\D/g, "");
    window.location.href = `tel:${dialNumber}`;
  };

  const syncSupplierLedger = (supplier, data) => {
    const raw = Array.isArray(data) ? data : data?.data || [];

    const entries = raw.map((entry) => ({
      ...entry,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      source: entry.source || "ledger",
      can_edit: entry.can_edit !== undefined ? entry.can_edit : true,
      can_delete: entry.can_delete !== undefined ? entry.can_delete : true,
    }));

    setLedgerEntries(entries);
    return entries;
  };

  const openLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    setShowLedger(true);
    setLedgerLoading(true);
    setLedgerEntries([]);
    setShowLedgerForm(false);
    setLedgerEditingId(null);
    setLedgerForm(defaultLedgerForm);

    try {
      const data = await fetchSupplierLedger(supplier.id);
      syncSupplierLedger(supplier, data);
    } catch (err) {
      showToast("error", err.message || t.ledgerError);
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setShowLedger(false);
    setSelectedSupplier(null);
    setLedgerEntries([]);
    setShowLedgerForm(false);
    setLedgerEditingId(null);
    setLedgerForm(defaultLedgerForm);
  };

  const openAddLedgerForm = () => {
    setLedgerEditingId(null);
    setLedgerForm({
      ...defaultLedgerForm,
      entry_date: todayInputValue(),
    });
    setShowLedgerForm(true);
  };

  const openEditLedgerForm = (entry) => {
    if (!entry?.can_edit) return;

    setLedgerEditingId(entry.id);
    setLedgerForm({
      entry_date: entry.entry_date || entry.date || todayInputValue(),
      description: entry.description || entry.description_en || "",
      debit: entry.debit ? String(entry.debit) : "",
      credit: entry.credit ? String(entry.credit) : "",
    });
    setShowLedgerForm(true);
  };

  const handleLedgerSave = async () => {
    if (!selectedSupplier) return;

    const description = ledgerForm.description.trim();
    const debit = ledgerForm.debit !== "" ? Number(ledgerForm.debit) : 0;
    const credit = ledgerForm.credit !== "" ? Number(ledgerForm.credit) : 0;

    if (!description || (!debit && !credit)) {
      showToast("error", t.invalidLedgerEntry);
      return;
    }

    const payload = {
      entry_date: ledgerForm.entry_date || todayInputValue(),
      description,
      description_en: description,
      debit,
      credit,
    };

    try {
      setLedgerSubmitting(true);

      if (ledgerEditingId) {
        await updateSupplierLedgerEntry(
          selectedSupplier.id,
          ledgerEditingId,
          payload
        );
      } else {
        await createSupplierLedgerEntry(selectedSupplier.id, payload);
      }

      const refreshed = await fetchSupplierLedger(selectedSupplier.id);
      syncSupplierLedger(selectedSupplier, refreshed);

      showToast("success", t.entrySaved);
      setShowLedgerForm(false);
      setLedgerEditingId(null);
      setLedgerForm(defaultLedgerForm);
    } catch (err) {
      showToast("error", err.message || t.entrySaveError);
    } finally {
      setLedgerSubmitting(false);
    }
  };

  const handleLedgerDelete = async (entry) => {
    if (!selectedSupplier || !entry?.can_delete) return;
    if (!window.confirm(t.entryDeleteConfirm)) return;

    try {
      await deleteSupplierLedgerEntry(selectedSupplier.id, entry.id);

      const refreshed = await fetchSupplierLedger(selectedSupplier.id);
      syncSupplierLedger(selectedSupplier, refreshed);

      showToast("success", t.entryDeleted);
    } catch (err) {
      showToast("error", err.message || t.entryDeleteError);
    }
  };

  const ledgerRows = useMemo(() => {
    if (!selectedSupplier) return [];

    let balance = Number(selectedSupplier.opening_balance || 0);

    return ledgerEntries.map((entry) => {
      balance += Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, balance };
    });
  }, [ledgerEntries, selectedSupplier]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return suppliers;

    return suppliers.filter(
      (supplier) =>
        (supplier.supplier_name || "").toLowerCase().includes(q) ||
        (supplier.phone || "").toLowerCase().includes(q) ||
        String(supplier.closing_balance ?? supplier.opening_balance ?? "").toLowerCase().includes(q) ||
        (urduCache[`name:${supplier.id}`] || "").toLowerCase().includes(q)
    );
  }, [suppliers, search, urduCache]);

  const summary = useMemo(
    () => ({
      totalSuppliers: suppliers.length,
      visibleRecords: filtered.length,
      totalOpeningBalance: filtered.reduce(
        (sum, supplier) => sum + Number(supplier.opening_balance || 0),
        0
      ),
    }),
    [suppliers, filtered]
  );

  return (
    <div className="supplier-page" dir={dir}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        .supplier-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #EFF6FF 0%, #f8fafc 48%, #f1f5f9 100%);
          padding: 18px;
          color: #0f172a;
          font-family: ${
            isUrdu
              ? "'Noto Nastaliq Urdu', Arial, sans-serif"
              : "Inter, Helvetica, Arial, sans-serif"
          };
        }

        .page-wrap {
          max-width: 1220px;
          margin: 0 auto;
        }

        .top-card {
          background: rgba(255,255,255,.94);
          border: 1px solid #D6E0EE;
          border-radius: 22px;
          padding: 20px 22px;
          box-shadow: 0 18px 50px rgba(15,23,42,.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .title {
          margin: 0;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -.8px;
        }

        .subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .btn {
          border: none;
          border-radius: 12px;
          padding: 10px 15px;
          font-weight: 900;
          cursor: pointer;
          transition: .15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          white-space: nowrap;
          font-size: 13px;
        }

        .btn:hover {
          transform: translateY(-1px);
          filter: brightness(.98);
        }

        .btn:disabled {
          opacity: .65;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: #0B4E9B;
          color: white;
          box-shadow: 0 12px 25px rgba(79,70,229,.28);
        }

        .btn-summary {
          background: #EFF6FF;
          color: #285DB8;
          border: 1px solid #DBEAFE;
        }

        .btn-summary-active {
          background: #0B4E9B;
          color: white;
          border: 1px solid #0B4E9B;
          box-shadow: 0 12px 25px rgba(79,70,229,.25);
        }

        .btn-soft {
          background: white;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .btn-green {
          background: #dcfce7;
          color: #166534;
        }

        .btn-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-call {
          background: #16a34a;
          color: white;
        }

        .btn-call:disabled {
          background: #e2e8f0;
          color: #94a3b8;
        }

        .btn-ledger {
          background: #0B4E9B;
          color: white;
          min-width: 88px;
          padding: 7px 9px;
          font-size: 11px;
        }

        .ledger-modal-box {
          width: min(1100px, 100%);
          max-height: 92vh;
          background: white;
          border-radius: 20px;
          box-shadow: 0 30px 90px rgba(15,23,42,.28);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .ledger-modal-head {
          padding: 16px 18px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ledger-modal-body {
          padding: 14px;
          overflow: auto;
        }

        .ledger-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .ledger-form-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 12px;
        }

        .ledger-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .ledger-table th {
          background: #0f172a;
          color: white;
          padding: 11px 10px;
          font-size: 11px;
          text-align: left;
        }

        .ledger-table td {
          padding: 11px 10px;
          border-bottom: 1px solid #eef2f7;
          font-size: 12px;
        }

        .headerPrintBtn {
          background: #0f172a !important;
          color: white !important;
          border: 1px solid #0f172a !important;
          box-shadow: 0 10px 22px rgba(15,23,42,.18) !important;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 14px 0;
        }

        .summary-card {
          background: white;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 8px 22px rgba(15,23,42,.05);
        }

        .summary-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          background: #EFF6FF;
          color: #0B4E9B;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .summary-card small {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .4px;
        }

        .summary-card b {
          display: block;
          margin-top: 7px;
          font-size: 22px;
          font-weight: 950;
          color: #0f172a;
          font-family: monospace;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin: 14px 0 12px;
        }

        .search {
          width: min(440px, 100%);
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 0 13px;
          font-size: 13px;
          outline: none;
          background: white;
        }

        .search:focus,
        .input-field:focus {
          border-color: #0B4E9B;
          box-shadow: 0 0 0 3px rgba(79,70,229,.10);
        }

        .card {
          background: white;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(15,23,42,.05);
          overflow: hidden;
        }

        .table-wrap {
          overflow-x: hidden;
          width: 100%;
        }

        .suppliers-desktop {
          display: block;
        }

        .suppliers-mobile {
          display: none;
        }

        table.suppliers-table {
          width: 100%;
          min-width: 0;
          border-collapse: collapse;
          table-layout: fixed;
        }

        table.suppliers-table th {
          background: #0f172a;
          color: rgba(255,255,255,.82);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .5px;
          padding: 12px 9px;
          white-space: nowrap;
        }

        table.suppliers-table td {
          padding: 10px 9px;
          border-bottom: 1px solid #eef2f7;
          font-size: 13px;
          vertical-align: middle;
        }

        table.suppliers-table tr:hover td {
          background: #f8fafc;
        }

        .supplier-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .supplier-avatar {
          width: 34px;
          height: 34px;
          border-radius: 13px;
          background: #EFF6FF;
          color: #0B4E9B;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .supplier-title {
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .money {
          font-family: monospace;
          font-weight: 950;
          color: #1d4ed8;
        }

        .suppliers-table th,
        .suppliers-table td {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suppliers-table td:nth-child(4) {
          white-space: nowrap;
          font-size: 12px;
        }

        .suppliers-table td:last-child {
          overflow: visible;
        }

        .action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .action-row .btn {
          padding: 6px 8px;
          font-size: 11px;
        }

        .supplier-mobile-list {
          padding: 12px;
          display: grid;
          gap: 12px;
        }

        .supplier-mobile-card {
          background: #ffffff;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }

        .supplier-mobile-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .supplier-mobile-title {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .supplier-mobile-index {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          font-family: monospace;
        }

        .supplier-mobile-name {
          margin-top: 3px;
          font-size: 15px;
          font-weight: 950;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .supplier-mobile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .supplier-info-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 13px;
          padding: 9px 10px;
        }

        .supplier-info-line small {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .supplier-info-line b {
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
          text-align: right;
        }

        .supplier-mobile-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .supplier-mobile-actions .btn {
          width: 100%;
          padding: 10px 8px;
          font-size: 12px;
        }

        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.45);
          z-index: 50;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 12px;
          overflow: auto;
          backdrop-filter: blur(3px);
        }

        .inputModalBox {
          width: min(760px, 100%);
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          box-shadow: 0 30px 90px rgba(15,23,42,.28);
          overflow: hidden;
        }

        .inputModalTitle {
          min-height: 58px;
          background: linear-gradient(135deg,#0f172a,#1e293b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 18px;
          font-size: 17px;
          font-weight: 900;
          gap: 12px;
        }

        .modal-title-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .modal-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(255,255,255,.10);
          border: 1px solid rgba(255,255,255,.20);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex: 0 0 auto;
        }

        .modal-title-main {
          font-size: 17px;
          font-weight: 950;
        }

        .modal-title-sub {
          margin-top: 2px;
          font-size: 11px;
          color: rgba(255,255,255,.70);
          font-weight: 700;
        }

        .closeBtn {
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.08);
          color: white;
          min-width: 36px;
          height: 34px;
          border-radius: 10px;
          cursor: pointer;
          padding: 0 12px;
          font-weight: 900;
        }

        .inputModalBody {
          padding: 14px;
        }

        .form-section {
          background: white;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          overflow: hidden;
        }

        .form-section-head {
          background: linear-gradient(135deg,#EFF6FF,#f8fafc);
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-section-head-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: white;
          color: #0B4E9B;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(15,23,42,.06);
        }

        .form-section-head h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 950;
          color: #0f172a;
        }

        .form-section-head p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .form-grid {
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          min-width: 0;
        }

        .field-full {
          grid-column: 1 / -1;
        }

        .label {
          font-size: 11px;
          color: #334155;
          margin-bottom: 6px;
          display: block;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .35px;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
        }

        .input-icon-left {
          left: 12px;
        }

        .input-icon-right {
          right: 12px;
        }

        .input-field {
          width: 100%;
          height: 42px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          padding: 7px 12px;
          font-size: 13px;
          border-radius: 12px;
          outline: none;
          font-weight: 750;
        }

        .input-field-with-left {
          padding-left: 38px;
        }

        .input-field-with-right {
          padding-right: 38px;
        }

        .modalFooterBasic {
          padding: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .toast {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 90;
          color: white;
          padding: 12px 16px;
          border-radius: 14px;
          font-weight: 900;
          box-shadow: 0 20px 50px rgba(15,23,42,.25);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .translating-toast {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 18px;
          z-index: 90;
          color: white;
          background: #0f172a;
          padding: 12px 16px;
          border-radius: 14px;
          font-weight: 900;
          box-shadow: 0 20px 50px rgba(15,23,42,.25);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        @media(max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width: 768px) {
          .supplier-page {
            padding: 12px;
          }

          .top-card {
            align-items: stretch;
          }

          .top-card > div:last-child {
            width: 100%;
          }

          .top-card .btn {
            width: 100%;
          }

          .toolbar {
            width: 100%;
          }

          .search {
            width: 100%;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .suppliers-desktop {
            display: none;
          }

          .suppliers-mobile {
            display: block;
          }

          .modal-bg {
            padding: 0;
          }

          .inputModalBox {
            min-height: 100vh;
            border-radius: 0;
            width: 100%;
          }

          .inputModalTitle {
            min-height: 58px;
            padding: 12px 14px;
          }

          .inputModalBody {
            padding: 10px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            padding: 12px;
          }

          .modalFooterBasic {
            display: grid;
            grid-template-columns: 1fr;
          }

          .modalFooterBasic .btn {
            width: 100%;
          }

          .title {
            font-size: 24px;
          }

          .ledger-modal-box {
            min-height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .ledger-summary-grid,
          .ledger-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {message.text && (
        <div
          className="toast"
          style={{
            background: message.type === "error" ? "#dc2626" : "#16a34a",
            left: isUrdu ? 18 : "auto",
            right: isUrdu ? "auto" : 18,
          }}
        >
          <i
            className={`bi ${
              message.type === "error"
                ? "bi-exclamation-triangle-fill"
                : "bi-check-circle-fill"
            }`}
          ></i>
          {message.text}
        </div>
      )}

      {translating && (
        <div className="translating-toast">
          <i className="bi bi-arrow-repeat"></i>
          {t.translating}
        </div>
      )}

      <div className="page-wrap">
        <div className="top-card">
          <div>
            <h1 className="title">{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              flexDirection: isUrdu ? "row-reverse" : "row",
            }}
          >
            <button
              className="btn btn-soft"
              onClick={handleLangToggle}
              disabled={translating}
            >
              <i className="bi bi-translate"></i>
              {t.toggleLang}
            </button>

            <button
              className={`btn ${
                showSummary ? "btn-summary-active" : "btn-summary"
              }`}
              onClick={() => setShowSummary((v) => !v)}
            >
              <i className="bi bi-bar-chart-fill"></i>
              {showSummary ? t.hideSummary : t.summaryBtn}
            </button>

            <button
              className="btn headerPrintBtn"
              onClick={() => generatePrintDocument(filtered, lang, urduCache, false)}
            >
              <i className="bi bi-printer"></i>
              {t.printBtn}
            </button>

            <button
              className="btn btn-soft"
              onClick={() => generatePrintDocument(filtered, lang, urduCache, true)}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i>
              {t.pdfBtn}
            </button>

            <button className="btn btn-soft" onClick={loadSuppliers}>
              <i className="bi bi-arrow-clockwise"></i>
              {loading ? t.loading : t.refresh}
            </button>

            <button className="btn btn-primary" onClick={openAdd}>
              <i className="bi bi-plus-circle-fill"></i>
              {t.addBtn}
            </button>
          </div>
        </div>

        {showSummary && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-card-icon">
                <i className="bi bi-people-fill"></i>
              </div>
              <small>{t.totalSuppliers}</small>
              <b>{summary.totalSuppliers}</b>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon">
                <i className="bi bi-filter-circle-fill"></i>
              </div>
              <small>{t.visibleRecords}</small>
              <b>{summary.visibleRecords}</b>
            </div>

            <div className="summary-card">
              <div className="summary-card-icon">
                <i className="bi bi-wallet2"></i>
              </div>
              <small>{t.totalOpeningBalance}</small>
              <b>{formatMoney(summary.totalOpeningBalance)}</b>
            </div>
          </div>
        )}

        <div className="toolbar">
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </div>

        <div className="card">
          <div className="suppliers-desktop table-wrap">
            <table className="suppliers-table">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "27%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>#</th>

                  <th style={{ textAlign: isUrdu ? "right" : "left" }}>
                    {t.supplierName}
                  </th>

                  <th style={{ textAlign: "center" }}>
                    {t.ledger}
                  </th>

                  <th style={{ textAlign: isUrdu ? "right" : "left" }}>
                    {t.phone}
                  </th>

                  <th style={{ textAlign: "left", paddingLeft: 8 }}>
                    {t.closingBalance}
                  </th>

                  <th>{t.actions}</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: 44,
                        color: "#94a3b8",
                      }}
                    >
                      {t.loading}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: 44,
                        color: "#94a3b8",
                      }}
                    >
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((supplier, index) => (
                    <tr key={supplier.id || index}>
                      <td
                        style={{
                          textAlign: "center",
                          color: "#94a3b8",
                          fontFamily: "monospace",
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </td>

                      <td>
                        <div
                          className="supplier-name-cell"
                          style={{
                            flexDirection: isUrdu ? "row-reverse" : "row",
                          }}
                        >
                          <div className="supplier-avatar">
                            <i className="bi bi-truck"></i>
                          </div>

                          <div
                            className="supplier-title"
                            style={{
                              opacity: translating ? 0.45 : 1,
                            }}
                          >
                            {getSupplierName(supplier, isUrdu, urduCache)}
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-ledger"
                          onClick={() => openLedger(supplier)}
                        >
                          <i className="bi bi-journal-text"></i>
                          {t.ledger}
                        </button>
                      </td>

                      <td
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          color: "#475569",
                        }}
                      >
                        {supplier.phone || "—"}
                      </td>

                      <td
                        className="money"
                        style={{
                          textAlign: "left",
                          paddingLeft: 8,
                        }}
                      >
                        {formatMoney(supplier.closing_balance ?? supplier.opening_balance)}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div
                          className="action-row"
                          style={{
                            flexDirection: isUrdu ? "row-reverse" : "row",
                          }}
                        >
                          <button
                            className="btn btn-green"
                            onClick={() => openEdit(supplier)}
                          >
                            <i className="bi bi-pencil-square"></i>
                            {t.edit}
                          </button>

                          <button
                            className="btn btn-red"
                            onClick={() => handleDelete(supplier.id)}
                          >
                            <i className="bi bi-trash3-fill"></i>
                            {t.delete}
                          </button>

                          <button
                            className="btn btn-call"
                            onClick={() => handleCall(supplier)}
                            disabled={!supplier.phone}
                            title={supplier.phone ? t.call : t.noPhone}
                          >
                            <i className="bi bi-telephone-fill"></i>
                            {t.call}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="suppliers-mobile">
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 36,
                  color: "#94a3b8",
                }}
              >
                {t.loading}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 36,
                  color: "#94a3b8",
                }}
              >
                {t.noRecords}
              </div>
            ) : (
              <div className="supplier-mobile-list">
                {filtered.map((supplier, index) => (
                  <div className="supplier-mobile-card" key={supplier.id || index}>
                    <div
                      className="supplier-mobile-top"
                      style={{
                        flexDirection: isUrdu ? "row-reverse" : "row",
                      }}
                    >
                      <div
                        className="supplier-mobile-title"
                        style={{
                          flexDirection: isUrdu ? "row-reverse" : "row",
                        }}
                      >
                        <div className="supplier-avatar">
                          <i className="bi bi-truck"></i>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div className="supplier-mobile-index">#{index + 1}</div>

                          <div
                            className="supplier-mobile-name"
                            style={{
                              opacity: translating ? 0.45 : 1,
                            }}
                          >
                            {getSupplierName(supplier, isUrdu, urduCache)}
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-ledger"
                        onClick={() => openLedger(supplier)}
                        style={{ minWidth: 94, padding: "8px 10px" }}
                      >
                        <i className="bi bi-journal-text"></i>
                        {t.ledger}
                      </button>
                    </div>

                    <div className="supplier-mobile-grid">
                      <div className="supplier-info-line">
                        <small>{t.phone}</small>
                        <b style={{ fontFamily: "monospace" }}>
                          {supplier.phone || "—"}
                        </b>
                      </div>

                      <div className="supplier-info-line">
                        <small>{t.openingBalance}</small>
                        <b
                          style={{
                            color: "#1d4ed8",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatMoney(supplier.opening_balance)}
                        </b>
                      </div>
                    </div>

                    <div className="supplier-mobile-actions">
                      <button
                        className="btn btn-green"
                        onClick={() => openEdit(supplier)}
                      >
                        <i className="bi bi-pencil-square"></i>
                        {t.edit}
                      </button>

                      <button
                        className="btn btn-red"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <i className="bi bi-trash3-fill"></i>
                        {t.delete}
                      </button>

                      <button
                        className="btn btn-call"
                        onClick={() => handleCall(supplier)}
                        disabled={!supplier.phone}
                        title={supplier.phone ? t.call : t.noPhone}
                      >
                        <i className="bi bi-telephone-fill"></i>
                        {t.call}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showLedger && selectedSupplier && (
        <div className="modal-bg">
          <div className="ledger-modal-box" dir={dir}>
            <div className="ledger-modal-head">
              <div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  {t.ledgerTitle}
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                  {getSupplierName(selectedSupplier, isUrdu, urduCache)}
                  {selectedSupplier.phone ? ` • ${selectedSupplier.phone}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={openAddLedgerForm}>
                  <i className="bi bi-plus-circle-fill"></i>
                  {t.addLedgerEntry}
                </button>

                <button className="btn btn-soft" onClick={closeLedger}>
                  {t.close}
                </button>
              </div>
            </div>

            <div className="ledger-modal-body">
              <div className="ledger-summary-grid">
                <div className="summary-card">
                  <small>{t.supplierName}</small>
                  <b style={{ fontFamily: "inherit", fontSize: 16 }}>
                    {getSupplierName(selectedSupplier, isUrdu, urduCache)}
                  </b>
                </div>

                <div className="summary-card">
                  <small>{t.openingBalance}</small>
                  <b>{formatBalanceWithSide(selectedSupplier.opening_balance)}</b>
                </div>

                <div className="summary-card">
                  <small>{t.balance}</small>
                  <b>
                    {formatBalanceWithSide(
                      ledgerRows.length
                        ? ledgerRows[ledgerRows.length - 1].balance
                        : selectedSupplier.opening_balance
                    )}
                  </b>
                </div>
              </div>

              {showLedgerForm && (
                <div className="ledger-form-box">
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>
                    {ledgerEditingId ? t.editLedgerEntry : t.addLedgerEntry}
                  </div>

                  <div className="ledger-form-grid">
                    <div className="field">
                      <label className="label">{t.entryDate}</label>
                      <input
                        type="date"
                        className="input-field"
                        value={ledgerForm.entry_date}
                        onChange={(e) =>
                          setLedgerForm((prev) => ({
                            ...prev,
                            entry_date: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">{t.description}</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder={t.descriptionPlaceholder}
                        value={ledgerForm.description}
                        onChange={(e) =>
                          setLedgerForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">{t.debit}</label>
                      <input
                        type="number"
                        className="input-field"
                        value={ledgerForm.debit}
                        onChange={(e) =>
                          setLedgerForm((prev) => ({
                            ...prev,
                            debit: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label className="label">{t.credit}</label>
                      <input
                        type="number"
                        className="input-field"
                        value={ledgerForm.credit}
                        onChange={(e) =>
                          setLedgerForm((prev) => ({
                            ...prev,
                            credit: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn btn-soft"
                      onClick={() => {
                        setShowLedgerForm(false);
                        setLedgerEditingId(null);
                        setLedgerForm(defaultLedgerForm);
                      }}
                      disabled={ledgerSubmitting}
                    >
                      {t.cancel}
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={handleLedgerSave}
                      disabled={ledgerSubmitting}
                    >
                      <i
                        className={`bi ${
                          ledgerSubmitting
                            ? "bi-arrow-repeat"
                            : "bi-save"
                        }`}
                      ></i>
                      {ledgerSubmitting ? t.saving : t.saveEntry}
                    </button>
                  </div>
                </div>
              )}

              <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: 14 }}>
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t.entryDate}</th>
                      <th>{t.source}</th>
                      <th>{t.description}</th>
                      <th style={{ textAlign: "right" }}>{t.debit}</th>
                      <th style={{ textAlign: "right" }}>{t.credit}</th>
                      <th style={{ textAlign: "right" }}>{t.balance}</th>
                      <th style={{ textAlign: "center" }}>{t.actions}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ledgerLoading ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 30 }}>
                          {t.ledgerLoading}
                        </td>
                      </tr>
                    ) : ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                          {t.ledgerEmpty}
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((entry, index) => (
                        <tr key={`${entry.id || index}-${index}`}>
                          <td>{index + 1}</td>
                          <td style={{ fontFamily: "monospace" }}>
                            {entry.entry_date || entry.date || "—"}
                          </td>
                          <td>{entry.source || t.manual}</td>
                          <td>{entry.description || entry.description_en || "—"}</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>
                            {Number(entry.debit || 0) > 0
                              ? formatMoney(entry.debit)
                              : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#be123c" }}>
                            {Number(entry.credit || 0) > 0
                              ? formatMoney(entry.credit)
                              : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>
                            {formatBalanceWithSide(entry.balance)}
                          </td>
                          <td>
                            <div className="action-row">
                              <button
                                className="btn btn-green"
                                onClick={() => openEditLedgerForm(entry)}
                                disabled={!entry.can_edit}
                              >
                                <i className="bi bi-pencil-square"></i>
                                {t.edit}
                              </button>

                              <button
                                className="btn btn-red"
                                onClick={() => handleLedgerDelete(entry)}
                                disabled={!entry.can_delete}
                              >
                                <i className="bi bi-trash3-fill"></i>
                                {t.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-bg">
          <div className="inputModalBox" dir={dir}>
            <div className="inputModalTitle">
              <div
                className="modal-title-left"
                style={{
                  flexDirection: isUrdu ? "row-reverse" : "row",
                  textAlign: isUrdu ? "right" : "left",
                }}
              >
                <div className="modal-icon">
                  <i className="bi bi-truck"></i>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="modal-title-main">
                    {editingId ? t.formTitleEdit : t.formTitleAdd}
                  </div>

                  <div className="modal-title-sub">{t.formSubtitle}</div>
                </div>
              </div>

              <button
                type="button"
                className="closeBtn"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <div className="inputModalBody">
              <div className="form-section">
                <div
                  className="form-section-head"
                  style={{
                    flexDirection: isUrdu ? "row-reverse" : "row",
                    textAlign: isUrdu ? "right" : "left",
                  }}
                >
                  <div className="form-section-head-icon">
                    <i className="bi bi-info-circle-fill"></i>
                  </div>

                  <div>
                    <h3>{t.details}</h3>
                    <p>{t.formSubtitle}</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field field-full">
                    <label className="label">
                      {t.supplierNameLabel}{" "}
                      <span style={{ color: "#dc2626" }}>*</span>
                    </label>

                    <div className="input-wrap">
                      <i
                        className={`bi bi-person-fill input-icon ${
                          isUrdu ? "input-icon-right" : "input-icon-left"
                        }`}
                      ></i>

                      <input
                        type="text"
                        value={form.supplier_name}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            supplier_name: e.target.value,
                          }))
                        }
                        placeholder={t.supplierPlaceholder}
                        className={`input-field ${
                          isUrdu
                            ? "input-field-with-right"
                            : "input-field-with-left"
                        }`}
                        style={{
                          textAlign: isUrdu ? "right" : "left",
                        }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">{t.phone}</label>

                    <div className="input-wrap">
                      <i
                        className={`bi bi-telephone-fill input-icon ${
                          isUrdu ? "input-icon-right" : "input-icon-left"
                        }`}
                      ></i>

                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder={t.phonePlaceholder}
                        className={`input-field ${
                          isUrdu
                            ? "input-field-with-right"
                            : "input-field-with-left"
                        }`}
                        style={{
                          fontFamily: "monospace",
                          textAlign: isUrdu ? "right" : "left",
                        }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">{t.address}</label>
                    <div className="input-wrap">
                      <i className={`bi bi-geo-alt-fill input-icon ${isUrdu ? "input-icon-right" : "input-icon-left"}`}></i>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder={t.address}
                        className={`input-field ${isUrdu ? "input-field-with-right" : "input-field-with-left"}`}
                        style={{ textAlign: isUrdu ? "right" : "left" }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" style={{ color: "#285DB8" }}>
                      {t.openingDebit}
                    </label>

                    <div className="input-wrap">
                      <i
                        className={`bi bi-wallet2 input-icon ${
                          isUrdu ? "input-icon-right" : "input-icon-left"
                        }`}
                      ></i>

                      <input
                        type="number"
                        value={form.opening_debit}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            opening_debit: e.target.value,
                          }))
                        }
                        placeholder={t.balancePlaceholder}
                        className={`input-field ${
                          isUrdu
                            ? "input-field-with-right"
                            : "input-field-with-left"
                        }`}
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 900,
                          color: "#1d4ed8",
                          textAlign: isUrdu ? "right" : "left",
                        }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" style={{ color: "#b91c1c" }}>{t.openingCredit}</label>
                    <div className="input-wrap">
                      <i className={`bi bi-wallet2 input-icon ${isUrdu ? "input-icon-right" : "input-icon-left"}`}></i>
                      <input
                        type="number" min="0" step="0.01"
                        value={form.opening_credit}
                        onChange={(e) => setForm((prev) => ({ ...prev, opening_credit: e.target.value }))}
                        placeholder={t.balancePlaceholder}
                        className={`input-field ${isUrdu ? "input-field-with-right" : "input-field-with-left"}`}
                        style={{ fontFamily: "monospace", fontWeight: 900, color: "#b91c1c", textAlign: isUrdu ? "right" : "left" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="modalFooterBasic"
              style={{
                flexDirection: isUrdu ? "row-reverse" : "row",
              }}
            >
              <button
                className="btn btn-soft"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                {t.cancel}
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                <i
                  className={`bi ${
                    submitting ? "bi-arrow-repeat" : "bi-save-fill"
                  }`}
                ></i>
                {submitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPage;
