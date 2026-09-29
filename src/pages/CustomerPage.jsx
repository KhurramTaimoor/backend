import React, { useState, useEffect, useMemo, useCallback } from "react";
import { escapeHtml, openUnicodePrint, printableText } from "../utils/unicodePrint";

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
    throw new Error(err.message || err.error || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

const fetchAllCustomers = () => apiFetch("/api/customers");
const fetchLedger = (id) => apiFetch(`/api/customers/${id}/ledger`);

const createCustomer = (data) =>
  apiFetch("/api/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateCustomer = (id, data) =>
  apiFetch(`/api/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const deleteCustomer = (id) =>
  apiFetch(`/api/customers/${id}`, {
    method: "DELETE",
  });

const createLedgerEntry = (customerId, data) =>
  apiFetch(`/api/customers/${customerId}/ledger`, {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateLedgerEntry = (customerId, entryId, data) =>
  apiFetch(`/api/customers/${customerId}/ledger/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const deleteLedgerEntry = (customerId, entryId) =>
  apiFetch(`/api/customers/${customerId}/ledger/${entryId}`, {
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

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-PK");
}

function formatDebit(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return "-";
  return `${formatMoney(amount)} Dr`;
}

function formatCredit(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return "-";
  return `${formatMoney(amount)} Cr`;
}

function formatBalanceWithSide(value) {
  const amount = Number(value || 0);

  if (amount > 0) return `${formatMoney(amount)} Dr`;
  if (amount < 0) return `${formatMoney(Math.abs(amount))} Cr`;

  return "0";
}

function getBalanceTextClass(value) {
  return Number(value || 0) < 0 ? "text-rose-700" : "text-slate-950";
}

function todayInputValue() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().slice(0, 10);
}

const LANG = {
  en: {
    title: "Customer Management",
    subtitle: "Manage your customers and their balances",
    addBtn: "Add Customer",
    summaryBtn: "View Summary",
    summaryTitle: "Customers Summary",
    summarySubtitle: "Overview of visible customer records",
    totalCustomers: "Total Customers",
    totalBalance: "Total Current Balance",

    searchPlaceholder: "Search by name, phone, city, balance…",
    name: "Customer Name",
    nameEn: "Customer Name",
    phone: "Phone No",
    city: "City",
    cityEn: "City",
    amount: "Current Balance",
    openingBalance: "Opening Balance",
    side: "Side",

    ledger: "Ledger",
    call: "Call",
    noPhone: "Phone number not available.",
    ledgerTitle: "Customer Ledger",
    ledgerLoading: "Loading ledger...",
    ledgerEmpty: "No ledger entries found.",

    date: "Date",
    source: "Source",
    details: "Details",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",

    close: "Close",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    downloadPdf: "Download PDF",
    noRecords: "No customers found.",
    toggleLang: "اردو",
    actions: "Actions",
    loading: "Loading customers...",
    translating: "Translating to Urdu…",

    errorMsg: "Customer name is required.",
    successSave: "Customer saved successfully!",
    successDelete: "Customer deleted successfully!",
    deleteConfirm: "Are you sure you want to delete this customer?",

    namePlaceholder: "e.g. Ali Traders",
    phonePlaceholder: "03XX-XXXXXXX",
    cityPlaceholder: "e.g. Lahore",
    amountPlaceholder: "0",

    generated: "Generated",
    totalLabel: "Total",
    companyName: "Ali Cages",
    reportTitle: "Customer Report",

    fetchError: "Failed to load customers.",
    saveError: "Failed to save customer.",
    deleteError: "Failed to delete customer.",
    ledgerError: "Failed to load ledger.",

    addLedgerEntry: "Add Ledger Entry",
    editLedgerEntry: "Edit Ledger Entry",
    entryDate: "Entry Date",
    description: "Description",
    descriptionPlaceholder: "e.g. Sale invoice #123 or payment received",
    debitPlaceholder: "Amount received / added",
    creditPlaceholder: "Amount given / subtracted",
    saveEntry: "Save Entry",

    entrySaved: "Ledger entry saved successfully!",
    entryDeleted: "Ledger entry deleted successfully!",
    entrySaveError: "Failed to save ledger entry.",
    entryDeleteError: "Failed to delete ledger entry.",
    entryDeleteConfirm: "Are you sure you want to delete this ledger entry?",
    invalidLedgerEntry: "Enter description and at least one of debit or credit.",
    ledgerEntryTypeHint: "Debit adds to balance, credit subtracts from balance.",

    manual: "Manual",
    invoice: "Sales Invoice",
    salesReturn: "Sales Return",
    deleteNotAllowed: "This entry cannot be deleted from ledger directly.",
    editNotAllowed: "This entry cannot be edited from ledger directly.",
  },

  ur: {
    title: "گاہکوں کا انتظام",
    subtitle: "اپنے گاہکوں اور ان کے بیلنس کا ریکارڈ رکھیں",
    addBtn: "گاہک شامل کریں",
    summaryBtn: "سمری دیکھیں",
    summaryTitle: "گاہکوں کی سمری",
    summarySubtitle: "نظر آنے والے گاہکوں کے ریکارڈ کا خلاصہ",
    totalCustomers: "کل گاہک",
    totalBalance: "کل موجودہ بیلنس",

    searchPlaceholder: "نام، فون، شہر، بیلنس سے تلاش کریں…",
    name: "گاہک کا نام",
    nameEn: "گاہک کا نام",
    phone: "فون نمبر",
    city: "شہر",
    cityEn: "شہر",
    amount: "موجودہ بیلنس",
    openingBalance: "اوپننگ بیلنس",
    side: "سائیڈ",

    ledger: "لیجر",
    call: "کال",
    noPhone: "فون نمبر موجود نہیں ہے۔",
    ledgerTitle: "گاہک کا لیجر",
    ledgerLoading: "لیجر لوڈ ہو رہا ہے...",
    ledgerEmpty: "کوئی لیجر انٹری نہیں ملی۔",

    date: "تاریخ",
    source: "سورس",
    details: "تفصیل",
    debit: "ڈیبٹ",
    credit: "کریڈٹ",
    balance: "بیلنس",

    close: "بند کریں",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    downloadPdf: "پی ڈی ایف ڈاؤنلوڈ",
    noRecords: "کوئی گاہک نہیں ملا۔",
    toggleLang: "English",
    actions: "اقدامات",
    loading: "گاہکوں کا ڈیٹا لوڈ ہو رہا ہے...",
    translating: "اردو میں ترجمہ ہو رہا ہے…",

    errorMsg: "گاہک کا نام ضروری ہے۔",
    successSave: "گاہک کا ریکارڈ محفوظ ہو گیا!",
    successDelete: "گاہک حذف ہو گیا!",
    deleteConfirm: "کیا آپ واقعی اس گاہک کو حذف کرنا چاہتے ہیں؟",

    namePlaceholder: "مثلاً Ali Traders",
    phonePlaceholder: "03XX-XXXXXXX",
    cityPlaceholder: "مثلاً Lahore",
    amountPlaceholder: "0",

    generated: "تیار کردہ",
    totalLabel: "کل",
    companyName: "علی کیجز",
    reportTitle: "گاہک رپورٹ",

    fetchError: "گاہک لوڈ نہیں ہو سکے۔",
    saveError: "گاہک محفوظ نہیں ہو سکا۔",
    deleteError: "گاہک حذف نہیں ہو سکا۔",
    ledgerError: "لیجر لوڈ نہیں ہو سکا۔",

    addLedgerEntry: "لیجر انٹری شامل کریں",
    editLedgerEntry: "لیجر انٹری میں ترمیم",
    entryDate: "اندراج کی تاریخ",
    description: "تفصیل",
    descriptionPlaceholder: "مثلاً سیل انوائس #123 یا وصولی",
    debitPlaceholder: "وصول شدہ / جمع رقم",
    creditPlaceholder: "ادا شدہ / منفی رقم",
    saveEntry: "انٹری محفوظ کریں",

    entrySaved: "لیجر انٹری محفوظ ہو گئی!",
    entryDeleted: "لیجر انٹری حذف ہو گئی!",
    entrySaveError: "لیجر انٹری محفوظ نہیں ہو سکی۔",
    entryDeleteError: "لیجر انٹری حذف نہیں ہو سکی۔",
    entryDeleteConfirm: "کیا آپ واقعی یہ لیجر انٹری حذف کرنا چاہتے ہیں؟",
    invalidLedgerEntry: "تفصیل اور ڈیبٹ یا کریڈٹ میں سے کم از کم ایک رقم درج کریں۔",
    ledgerEntryTypeHint: "ڈیبٹ بیلنس میں جمع ہوتا ہے، کریڈٹ بیلنس سے منفی ہوتا ہے۔",

    manual: "مینول",
    invoice: "سیل انوائس",
    salesReturn: "سیل ریٹرن",
    deleteNotAllowed: "یہ انٹری لیجر سے براہِ راست حذف نہیں کی جا سکتی۔",
    editNotAllowed: "یہ انٹری لیجر سے براہِ راست ایڈٹ نہیں کی جا سکتی۔",
  },
};

const defaultForm = {
  customer_name_en: "",
  phone: "",
  city_en: "",
  opening_balance: "",
  opening_balance_type: "dr",
};

const defaultLedgerForm = {
  entry_date: todayInputValue(),
  description_en: "",
  debit: "",
  credit: "",
};

function normalizeCustomer(raw) {
  return {
    ...raw,
    opening_balance: Number(raw?.opening_balance || 0),
    current_balance:
      raw?.current_balance !== undefined && raw?.current_balance !== null
        ? Number(raw.current_balance)
        : raw?.amount !== undefined && raw?.amount !== null
        ? Number(raw.amount)
        : Number(raw?.opening_balance || 0),
  };
}

function calculateClosingBalance(openingBalance, entries) {
  let balance = Number(openingBalance || 0);

  for (const entry of entries) {
    balance += Number(entry.debit || 0) - Number(entry.credit || 0);
  }

  return balance;
}

function getSourceInfo(source, t) {
  switch (source) {
    case "invoice":
      return {
        label: t.invoice,
        bg: "bg-amber-100",
        text: "text-amber-700",
      };

    case "return":
      return {
        label: t.salesReturn,
        bg: "bg-violet-100",
        text: "text-violet-700",
      };

    case "ledger":
    default:
      return {
        label: t.manual,
        bg: "bg-indigo-50",
        text: "text-indigo-700",
      };
  }
}

function getSignedOpeningBalance(value, type) {
  const amount = Number(value || 0);
  return type === "cr" ? -Math.abs(amount) : Math.abs(amount);
}

function downloadAllPdf(customers, lang, cache) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const totalCustomers = customers.length;
  const totalBalance = customers.reduce(
    (sum, customer) => sum + Number(customer.current_balance || 0),
    0
  );

  const dateStr = new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rowsHtml = customers
    .map((customer, index) => {
      const name = isUrdu
        ? cache[`name:${customer.id}`] || customer.customer_name_en || "-"
        : customer.customer_name_en || "-";
      const city = isUrdu
        ? cache[`city:${customer.id}`] || customer.city_en || "-"
        : customer.city_en || "-";

      return `<tr>
        <td class="center num">${index + 1}</td>
        <td class="name-cell">${printableText(name)}</td>
        <td class="center ltr-text">${escapeHtml(customer.phone || "-")}</td>
        <td>${printableText(city)}</td>
        <td class="amount num">${escapeHtml(formatBalanceWithSide(customer.current_balance))}</td>
      </tr>`;
    })
    .join("");

  const bodyHtml = `
    <div class="pdf-hint">${
      isUrdu
        ? "پی ڈی ایف محفوظ کرنے کے لیے پرنٹ ڈائیلاگ میں Save as PDF منتخب کریں۔"
        : "Choose Save as PDF in the print dialog. Urdu/Arabic customer names are rendered with Unicode support."
    }</div>
    <main class="report-sheet">
      <header class="report-head">
        <div>
          <div class="brand">${escapeHtml(t.companyName)}</div>
          <div class="report-title">${escapeHtml(t.reportTitle)}</div>
        </div>
        <div class="generated">${escapeHtml(t.generated)}: ${escapeHtml(dateStr)}</div>
      </header>

      <section class="summary-grid">
        <div class="summary-card">
          <span>${escapeHtml(t.totalCustomers)}</span>
          <strong class="num">${totalCustomers}</strong>
        </div>
        <div class="summary-card wide">
          <span>${escapeHtml(t.totalBalance)}</span>
          <strong class="num">${escapeHtml(formatBalanceWithSide(totalBalance))}</strong>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>${escapeHtml(t.name)}</th>
            <th class="center">${escapeHtml(t.phone)}</th>
            <th>${escapeHtml(t.city)}</th>
            <th class="amount">${escapeHtml(t.amount)}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || `<tr><td colspan="5" class="empty">${escapeHtml(t.noRecords)}</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">${escapeHtml(t.totalLabel)}</td>
            <td class="amount num">${escapeHtml(formatBalanceWithSide(totalBalance))}</td>
          </tr>
        </tfoot>
      </table>
    </main>`;

  return openUnicodePrint({
    title: `${t.companyName} - ${t.reportTitle}`,
    bodyHtml,
    dir,
    lang,
    pageSize: "A4 landscape",
    styles: `
      .report-sheet{width:100%;margin:0 auto;color:#13263A}
      .report-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;background:#0B4E9B;color:#fff;padding:16px 18px;border-radius:10px;margin-bottom:16px}
      .brand{font-size:22px;font-weight:800;line-height:1.3}
      .report-title{font-size:12px;margin-top:4px;opacity:.88}
      .generated{font-size:10px;opacity:.9;text-align:${isUrdu ? "left" : "right"}}
      .summary-grid{display:grid;grid-template-columns:minmax(170px,1fr) minmax(230px,1.15fr);gap:12px;max-width:650px;margin:0 0 18px}
      .summary-card{background:#F4F7FB;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;min-height:68px}
      .summary-card span{display:block;color:#475569;font-size:9px;margin-bottom:6px}
      .summary-card strong{display:block;color:#0F172A;font-size:17px}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5px}
      thead{display:table-header-group}
      tfoot{display:table-footer-group}
      tr{break-inside:avoid;page-break-inside:avoid}
      th{background:#0C2134;color:#fff;border:1px solid #0C2134;padding:7px 8px;text-align:${isUrdu ? "right" : "left"};font-weight:700}
      td{border:1px solid #CBD5E1;padding:7px 8px;vertical-align:middle;color:#13263A;background:#fff;overflow-wrap:anywhere}
      tbody tr:nth-child(odd) td{background:#F8FAFC}
      th:nth-child(1),td:nth-child(1){width:5%}
      th:nth-child(2),td:nth-child(2){width:36%}
      th:nth-child(3),td:nth-child(3){width:18%}
      th:nth-child(4),td:nth-child(4){width:20%}
      th:nth-child(5),td:nth-child(5){width:21%}
      .center{text-align:center!important}
      .amount{text-align:right!important}
      .name-cell{font-weight:600}
      .empty{text-align:center;padding:28px;color:#64748B}
      tfoot td{background:#0C2134!important;color:#fff;font-weight:700}
      .total-label{text-align:${isUrdu ? "left" : "right"}}
      @media print{.report-head{border-radius:0}}
    `,
  });
}

const CustomerPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urduCache, setUrduCache] = useState({});
  const [translating, setTranslating] = useState(false);

  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [showLedger, setShowLedger] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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

  const patchCustomerBalance = useCallback((customerId, balance) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === customerId
          ? { ...customer, current_balance: Number(balance || 0) }
          : customer
      )
    );

    setSelectedCustomer((prev) =>
      prev?.id === customerId
        ? { ...prev, current_balance: Number(balance || 0) }
        : prev
    );
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchAllCustomers();
      const list = Array.isArray(data) ? data : data?.data || [];

      setCustomers(list.map(normalizeCustomer));
    } catch (err) {
      showToast("error", err.message || t.fetchError);
    } finally {
      setLoading(false);
    }
  }, [showToast, t.fetchError]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleLangToggle = async () => {
    const newLang = lang === "en" ? "ur" : "en";
    setLang(newLang);

    if (newLang !== "ur" || customers.length === 0) return;

    const untranslated = customers.filter(
      (customer) =>
        !urduCache[`name:${customer.id}`] || !urduCache[`city:${customer.id}`]
    );

    if (untranslated.length === 0) return;

    setTranslating(true);

    try {
      const results = await Promise.all(
        untranslated.map(async (customer) => {
          const [nameUr, cityUr] = await Promise.all([
            translateText(customer.customer_name_en),
            translateText(customer.city_en),
          ]);

          return {
            id: customer.id,
            nameUr,
            cityUr,
          };
        })
      );

      setUrduCache((prev) => {
        const next = { ...prev };

        results.forEach(({ id, nameUr, cityUr }) => {
          next[`name:${id}`] = nameUr;
          next[`city:${id}`] = cityUr;
        });

        return next;
      });
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const getName = (customer) =>
    isUrdu
      ? urduCache[`name:${customer.id}`] || customer.customer_name_en || "-"
      : customer.customer_name_en || "-";

  const getCity = (customer) =>
    isUrdu
      ? urduCache[`city:${customer.id}`] || customer.city_en || "-"
      : customer.city_en || "-";

  const getEntryDescription = (entry) =>
    entry.description || entry.description_en || "-";

  const getEntryDate = (entry) => entry.date || entry.entry_date || "-";

  const openAdd = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (customer) => {
    const openingBalance = Number(customer.opening_balance || 0);

    setForm({
      customer_name_en: customer.customer_name_en || "",
      phone: customer.phone || "",
      city_en: customer.city_en || "",
      opening_balance: Math.abs(openingBalance) || "",
      opening_balance_type: openingBalance < 0 ? "cr" : "dr",
    });

    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_name_en.trim()) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      customer_name_en: form.customer_name_en.trim(),
      phone: form.phone.trim(),
      city_en: form.city_en.trim(),
      opening_balance:
        form.opening_balance !== ""
          ? getSignedOpeningBalance(form.opening_balance, form.opening_balance_type)
          : 0,
    };

    try {
      setSubmitting(true);

      if (editingId) {
        const res = await updateCustomer(editingId, payload);
        const updated = normalizeCustomer(res?.data || res);

        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === editingId ? updated : customer
          )
        );

        setUrduCache((prev) => {
          const next = { ...prev };
          delete next[`name:${editingId}`];
          delete next[`city:${editingId}`];
          return next;
        });
      } else {
        const res = await createCustomer(payload);
        const created = normalizeCustomer(res?.data || res);

        setCustomers((prev) => [created, ...prev]);
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
      await deleteCustomer(id);

      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
      showToast("success", t.successDelete);

      if (selectedCustomer?.id === id) {
        closeLedger();
      }
    } catch (err) {
      showToast("error", err.message || t.deleteError);
    }
  };

  const syncLedgerResult = useCallback(
    (customer, entriesRaw) => {
      const raw = Array.isArray(entriesRaw) ? entriesRaw : entriesRaw?.data || [];

      const entries = raw.map((entry) => ({
        ...entry,
        debit: Number(entry.debit || 0),
        credit: Number(entry.credit || 0),
        source: entry.source || "ledger",
        can_edit: entry.source === "ledger" || !entry.source,
        can_delete: entry.source === "ledger" || !entry.source,
      }));

      setLedgerEntries(entries);

      const closingBalance = calculateClosingBalance(
        customer.opening_balance,
        entries
      );

      patchCustomerBalance(customer.id, closingBalance);

      return entries;
    },
    [patchCustomerBalance]
  );

  const handleCall = (customer) => {
    const phone = String(customer?.phone || "").trim();

    if (!phone) {
      showToast("error", t.noPhone);
      return;
    }

    // Keep only digits and an optional leading + so tel: works reliably.
    const dialNumber = phone.replace(/(?!^\+)\D/g, "");

    window.location.href = `tel:${dialNumber}`;
  };

  const openLedger = async (customer) => {
    setSelectedCustomer(customer);
    setShowLedger(true);
    setLedgerLoading(true);
    setLedgerEntries([]);
    setShowLedgerForm(false);
    setLedgerEditingId(null);
    setLedgerForm(defaultLedgerForm);

    try {
      const data = await fetchLedger(customer.id);
      syncLedgerResult(customer, data);
    } catch (err) {
      showToast("error", err.message || t.ledgerError);
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setShowLedger(false);
    setSelectedCustomer(null);
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
    if (!entry?.can_edit) {
      showToast("error", t.editNotAllowed);
      return;
    }

    setLedgerEditingId(entry.id);
    setLedgerForm({
      entry_date: getEntryDate(entry) || todayInputValue(),
      description_en: entry.description || entry.description_en || "",
      debit: entry.debit ? String(entry.debit) : "",
      credit: entry.credit ? String(entry.credit) : "",
    });

    setShowLedgerForm(true);
  };

  const handleLedgerSave = async () => {
    if (!selectedCustomer) return;

    const description_en = ledgerForm.description_en.trim();
    const debit = ledgerForm.debit !== "" ? Number(ledgerForm.debit) : 0;
    const credit = ledgerForm.credit !== "" ? Number(ledgerForm.credit) : 0;

    if (!description_en || (!debit && !credit)) {
      showToast("error", t.invalidLedgerEntry);
      return;
    }

    const payload = {
      entry_date: ledgerForm.entry_date || todayInputValue(),
      description_en,
      debit,
      credit,
    };

    try {
      setLedgerSubmitting(true);

      if (ledgerEditingId) {
        await updateLedgerEntry(selectedCustomer.id, ledgerEditingId, payload);
      } else {
        await createLedgerEntry(selectedCustomer.id, payload);
      }

      const refreshed = await fetchLedger(selectedCustomer.id);
      syncLedgerResult(selectedCustomer, refreshed);

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
    if (!selectedCustomer || !entry) return;

    if (!entry.can_delete) {
      showToast("error", t.deleteNotAllowed);
      return;
    }

    if (!window.confirm(t.entryDeleteConfirm)) return;

    try {
      await deleteLedgerEntry(selectedCustomer.id, entry.id);

      const refreshed = await fetchLedger(selectedCustomer.id);
      syncLedgerResult(selectedCustomer, refreshed);

      showToast("success", t.entryDeleted);
    } catch (err) {
      showToast("error", err.message || t.entryDeleteError);
    }
  };

  const ledgerRows = useMemo(() => {
    if (!selectedCustomer) return [];

    let balance = Number(selectedCustomer.opening_balance || 0);

    return ledgerEntries.map((entry) => {
      balance += Number(entry.debit || 0) - Number(entry.credit || 0);

      return {
        ...entry,
        balance,
        isOpening: false,
      };
    });
  }, [ledgerEntries, selectedCustomer]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.customer_name_en,
        urduCache[`name:${customer.id}`] || "",
        customer.phone,
        customer.city_en,
        urduCache[`city:${customer.id}`] || "",
        String(customer.current_balance || ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customers, search, urduCache]);

  const summary = useMemo(
    () => ({
      totalCustomers: filtered.length,
      totalBalance: filtered.reduce(
        (sum, customer) => sum + Number(customer.current_balance || 0),
        0
      ),
    }),
    [filtered]
  );

  const selectedCurrentBalance =
    ledgerRows.length > 0
      ? ledgerRows[ledgerRows.length - 1]?.balance
      : selectedCustomer?.current_balance || 0;

  return (
    <div
      dir={dir}
      style={{
        fontFamily: isUrdu
          ? "'Noto Nastaliq Urdu', serif"
          : "'Poppins', Helvetica, 'Helvetica Neue', Arial, sans-serif",
      }}
      className="min-h-screen bg-[#f8fafc] p-3 sm:p-4 pb-16"
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        .same-btn {
          transition: all .15s ease;
        }

        .same-btn:hover {
          transform: translateY(-1px);
        }

        .money-font {
          font-family: 'Poppins', Helvetica, Arial, sans-serif;
          font-weight: 800;
          letter-spacing: .01em;
        }
      `}</style>

      {message.text && (
        <div
          className={`fixed bottom-6 ${
            isUrdu ? "left-6" : "right-6"
          } z-50 px-5 py-2.5 rounded-lg shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
            message.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-2xl bg-slate-800 text-white text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-arrow-repeat animate-spin"></i>
          {t.translating}
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-950">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 w-full lg:w-auto ${
                isUrdu ? "lg:flex-row-reverse" : ""
              }`}
            >
              <button
                onClick={handleLangToggle}
                disabled={translating}
                className="same-btn w-full lg:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i
                  className={`bi ${
                    translating
                      ? "bi-arrow-repeat animate-spin"
                      : "bi-translate"
                  }`}
                ></i>
                {t.toggleLang}
              </button>

              <button
                onClick={() => setShowSummary((value) => !value)}
                className={`same-btn w-full lg:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm ${
                  showSummary
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <i className="bi bi-bar-chart-line-fill"></i>
                {t.summaryBtn}
                <i
                  className={`bi bi-chevron-${
                    showSummary ? "up" : "down"
                  } text-xs`}
                ></i>
              </button>

              <button
                onClick={() => downloadAllPdf(filtered, lang, urduCache)}
                className="same-btn w-full lg:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-file-earmark-pdf-fill"></i>
                {t.downloadPdf}
              </button>

              <button
                onClick={openAdd}
                className="same-btn w-full lg:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                <i className="bi bi-person-plus-fill"></i>
                {t.addBtn}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="mt-5 pt-5 border-t border-slate-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-950">
                  {t.summaryTitle}
                </h3>
                <p className="text-sm text-slate-500">{t.summarySubtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard label={t.totalCustomers} value={summary.totalCustomers} />
                <InfoCard
                  label={t.totalBalance}
                  value={formatBalanceWithSide(summary.totalBalance)}
                  mono
                  highlight
                  valueClass={getBalanceTextClass(summary.totalBalance)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="relative mb-4 max-w-md">
          <i
            className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              isUrdu ? "right-4" : "left-4"
            }`}
          ></i>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm ${
              isUrdu ? "pr-11 pl-4 text-right" : "pl-11 pr-4"
            }`}
          />
        </div>

        <div className="bg-white rounded-[18px] sm:rounded-[22px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-950 text-white text-[11px] font-extrabold uppercase tracking-wide border-b border-slate-900">
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>
                    #
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.name}
                  </th>
                  <th className="px-4 py-3 text-center w-[120px]">
                    {t.ledger}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.phone}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.city}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-left" : "text-right"}`}>
                    {t.amount}
                  </th>
                  <th className="px-4 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-sky-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                      <p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((customer, index) => (
                    <CustomerDesktopRow
                      key={customer.id}
                      customer={customer}
                      index={index}
                      t={t}
                      isUrdu={isUrdu}
                      translating={translating}
                      getName={getName}
                      getCity={getCity}
                      openEdit={openEdit}
                      handleDelete={handleDelete}
                      openLedger={openLedger}
                      handleCall={handleCall}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {loading ? (
              <div className="px-6 py-10 text-center text-slate-400">
                <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                <p className="mt-2">{t.loading}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400">
                {t.noRecords}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {filtered.map((customer, index) => (
                  <CustomerMobileCard
                    key={customer.id}
                    customer={customer}
                    index={index}
                    t={t}
                    isUrdu={isUrdu}
                    translating={translating}
                    getName={getName}
                    getCity={getCity}
                    openEdit={openEdit}
                    handleDelete={handleDelete}
                    openLedger={openLedger}
                    handleCall={handleCall}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
            <div
              className="bg-white rounded-[18px] sm:rounded-[22px] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 flex flex-col"
              dir={dir}
            >
              <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-4">
                <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <i className="bi bi-person-lines-fill text-indigo-700 text-lg"></i>
                </div>

                <h2 className="text-xl font-extrabold text-slate-950">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {t.nameEn} *
                  </label>

                  <div className="relative">
                    <i
                      className={`bi bi-person absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                        isUrdu ? "right-3" : "left-3"
                      }`}
                    ></i>

                    <input
                      type="text"
                      value={form.customer_name_en}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          customer_name_en: event.target.value,
                        })
                      }
                      placeholder={t.namePlaceholder}
                      className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
                        isUrdu ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {t.phone}
                  </label>

                  <div className="relative">
                    <i
                      className={`bi bi-telephone absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                        isUrdu ? "right-3" : "left-3"
                      }`}
                    ></i>

                    <input
                      type="text"
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                      placeholder={t.phonePlaceholder}
                      className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-100 font-mono ${
                        isUrdu ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {t.cityEn}
                  </label>

                  <div className="relative">
                    <i
                      className={`bi bi-geo-alt absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                        isUrdu ? "right-3" : "left-3"
                      }`}
                    ></i>

                    <input
                      type="text"
                      value={form.city_en}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          city_en: event.target.value,
                        })
                      }
                      placeholder={t.cityPlaceholder}
                      className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
                        isUrdu ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-700 mb-1.5">
                    {t.openingBalance}
                  </label>

                  <input
                    type="number"
                    value={form.opening_balance}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        opening_balance: event.target.value,
                      })
                    }
                    placeholder={t.amountPlaceholder}
                    className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-slate-50/30 focus:outline-none focus:ring-4 focus:ring-indigo-100 money-font ${
                      form.opening_balance_type === "cr"
                        ? "text-rose-700"
                        : "text-slate-950"
                    } ${isUrdu ? "text-right" : ""}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    {t.side}
                  </label>

                  <select
                    value={form.opening_balance_type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        opening_balance_type: event.target.value,
                      })
                    }
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-4 font-bold ${
                      form.opening_balance_type === "cr"
                        ? "border-rose-200 text-rose-700 focus:ring-rose-100"
                        : "border-slate-200 text-slate-950 focus:ring-indigo-100"
                    }`}
                  >
                    <option value="dr">Dr</option>
                    <option value="cr">Cr</option>
                  </select>
                </div>

                <div className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-500">
                      {t.openingBalance}
                    </span>

                    <span
                      className={`text-sm money-font ${
                        form.opening_balance_type === "cr"
                          ? "text-rose-700"
                          : "text-slate-950"
                      }`}
                    >
                      {form.opening_balance
                        ? form.opening_balance_type === "cr"
                          ? `${formatMoney(form.opening_balance)} Cr`
                          : `${formatMoney(form.opening_balance)} Dr`
                        : "0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i
                    className={`bi ${
                      submitting ? "bi-arrow-repeat animate-spin" : "bi-save"
                    }`}
                  ></i>
                  {submitting ? t.saving : t.save}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="bg-white border border-slate-300 text-indigo-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {showLedger && selectedCustomer && (
          <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <div
              className="bg-white rounded-none sm:rounded-[22px] shadow-2xl w-full sm:max-w-6xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
              dir={dir}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-slate-50/80">
                <div
                  className={`flex items-center gap-3 ${
                    isUrdu ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <i className="bi bi-journal-text text-indigo-700 text-lg"></i>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                      {t.ledgerTitle}
                    </h2>

                    <p className="text-sm text-slate-500 truncate">
                      {getName(selectedCustomer)}
                      {selectedCustomer.phone
                        ? ` • ${selectedCustomer.phone}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto ${
                    isUrdu ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  <button
                    onClick={openAddLedgerForm}
                    className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    <i className="bi bi-plus-circle-fill"></i>
                    {t.addLedgerEntry}
                  </button>

                  <button
                    onClick={closeLedger}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                  >
                    {t.close}
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <InfoCard label={t.name} value={getName(selectedCustomer)} />

                  <InfoCard
                    label={t.phone}
                    value={selectedCustomer.phone || "-"}
                    mono
                  />

                  <InfoCard label={t.city} value={getCity(selectedCustomer)} />

                  <InfoCard
                    label={t.amount}
                    value={formatBalanceWithSide(selectedCurrentBalance)}
                    mono
                    highlight
                    valueClass={getBalanceTextClass(selectedCurrentBalance)}
                  />
                </div>

                {showLedgerForm && (
                  <div className="mb-4 bg-slate-50/70 border border-slate-200 rounded-[18px] sm:rounded-[22px] p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <i className="bi bi-journal-plus text-indigo-700"></i>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-950">
                          {ledgerEditingId
                            ? t.editLedgerEntry
                            : t.addLedgerEntry}
                        </h3>

                        <p className="text-xs text-slate-500">
                          {t.ledgerEntryTypeHint}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          {t.entryDate}
                        </label>

                        <input
                          type="date"
                          value={ledgerForm.entry_date}
                          onChange={(event) =>
                            setLedgerForm({
                              ...ledgerForm,
                              entry_date: event.target.value,
                            })
                          }
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          {t.description}
                        </label>

                        <input
                          type="text"
                          value={ledgerForm.description_en}
                          onChange={(event) =>
                            setLedgerForm({
                              ...ledgerForm,
                              description_en: event.target.value,
                            })
                          }
                          placeholder={t.descriptionPlaceholder}
                          className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
                            isUrdu ? "text-right" : ""
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-950 mb-1.5">
                          {t.debit}
                        </label>

                        <input
                          type="number"
                          value={ledgerForm.debit}
                          onChange={(event) =>
                            setLedgerForm({
                              ...ledgerForm,
                              debit: event.target.value,
                            })
                          }
                          placeholder={t.debitPlaceholder}
                          className={`w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-slate-100 money-font text-slate-950 ${
                            isUrdu ? "text-right" : ""
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-rose-700 mb-1.5">
                          {t.credit}
                        </label>

                        <input
                          type="number"
                          value={ledgerForm.credit}
                          onChange={(event) =>
                            setLedgerForm({
                              ...ledgerForm,
                              credit: event.target.value,
                            })
                          }
                          placeholder={t.creditPlaceholder}
                          className={`w-full border border-rose-100 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-rose-100 money-font text-rose-700 ${
                            isUrdu ? "text-right" : ""
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
                      <button
                        onClick={handleLedgerSave}
                        disabled={ledgerSubmitting}
                        className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <i
                          className={`bi ${
                            ledgerSubmitting
                              ? "bi-arrow-repeat animate-spin"
                              : "bi-save"
                          }`}
                        ></i>
                        {ledgerSubmitting ? t.saving : t.saveEntry}
                      </button>

                      <button
                        onClick={() => {
                          setShowLedgerForm(false);
                          setLedgerEditingId(null);
                          setLedgerForm(defaultLedgerForm);
                        }}
                        disabled={ledgerSubmitting}
                        className="px-5 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}

                <LedgerTable
                  ledgerLoading={ledgerLoading}
                  ledgerRows={ledgerRows}
                  t={t}
                  isUrdu={isUrdu}
                  getEntryDate={getEntryDate}
                  getEntryDescription={getEntryDescription}
                  openEditLedgerForm={openEditLedgerForm}
                  handleLedgerDelete={handleLedgerDelete}
                />
              </div>

              <div
                className={`px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex ${
                  isUrdu ? "justify-start" : "justify-end"
                }`}
              >
                <button
                  onClick={closeLedger}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomerDesktopRow = ({
  customer,
  index,
  t,
  isUrdu,
  translating,
  getName,
  getCity,
  openEdit,
  handleDelete,
  openLedger,
  handleCall,
}) => {
  return (
    <tr className="hover:bg-slate-50/70 transition">
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
        {index + 1}
      </td>

      <td
        className={`px-4 py-3 font-bold text-slate-950 ${
          isUrdu ? "text-right" : ""
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            isUrdu ? "flex-row-reverse" : ""
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <i className="bi bi-person-fill"></i>
          </div>

          <span className={translating ? "opacity-40" : ""}>
            {getName(customer)}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 text-center w-[120px]">
        <button
          onClick={() => openLedger(customer)}
          className="inline-flex items-center justify-center gap-1.5 min-w-[105px] px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          title={t.ledger}
        >
          <i className="bi bi-journal-text"></i>
          {t.ledger}
        </button>
      </td>

      <td className="px-4 py-3 text-slate-950 font-mono text-xs font-semibold">
        {customer.phone || "-"}
      </td>

      <td
        className={`px-4 py-3 text-slate-950 font-semibold ${
          translating ? "opacity-40" : ""
        }`}
      >
        {getCity(customer)}
      </td>

      <td
        className={`px-4 py-3 money-font ${getBalanceTextClass(
          customer.current_balance
        )} ${isUrdu ? "text-left" : "text-right"}`}
      >
        {formatBalanceWithSide(customer.current_balance)}
      </td>

      <td className="px-4 py-3">
        <div
          className={`flex items-center justify-center gap-2 flex-wrap ${
            isUrdu ? "flex-row-reverse" : ""
          }`}
        >
          <button
            onClick={() => openEdit(customer)}
            className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center"
            title={t.edit}
          >
            <i className="bi bi-pencil-square"></i>
          </button>

          <button
            onClick={() => handleDelete(customer.id)}
            className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition flex items-center justify-center"
            title={t.delete}
          >
            <i className="bi bi-trash3-fill"></i>
          </button>

          <button
            onClick={() => handleCall(customer)}
            disabled={!customer.phone}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              customer.phone
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }`}
            title={customer.phone ? t.call : t.noPhone}
          >
            <i className="bi bi-telephone-fill"></i>
            {t.call}
          </button>
        </div>
      </td>
    </tr>
  );
};

const InfoCard = ({
  label,
  value,
  mono = false,
  highlight = false,
  valueClass = "",
}) => {
  return (
    <div
      className={`border rounded-lg p-4 shadow-sm ${
        highlight ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"
      }`}
    >
      <p
        className={`text-xs mb-1 ${
          highlight ? "text-indigo-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`font-bold ${
          valueClass || (highlight ? "text-indigo-700" : "text-slate-950")
        } ${mono ? "money-font" : ""}`}
      >
        {value}
      </p>
    </div>
  );
};

const CustomerMobileCard = ({
  customer,
  index,
  t,
  isUrdu,
  translating,
  getName,
  getCity,
  openEdit,
  handleDelete,
  openLedger,
  handleCall,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div
        className={`flex items-start justify-between gap-3 ${
          isUrdu ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className={`flex items-center gap-3 min-w-0 ${
            isUrdu ? "flex-row-reverse" : ""
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <i className="bi bi-person-fill"></i>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-bold">
              #{index + 1}
            </p>

            <div
              className={`flex items-center gap-2 flex-wrap ${
                isUrdu ? "flex-row-reverse" : ""
              }`}
            >
              <h3
                className={`font-extrabold text-slate-950 text-sm truncate ${
                  translating ? "opacity-40" : ""
                }`}
              >
                {getName(customer)}
              </h3>

              <button
                onClick={() => openLedger(customer)}
                className="h-7 px-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1 text-[10px] font-bold flex-shrink-0"
                title={t.ledger}
              >
                <i className="bi bi-journal-text"></i>
                {t.ledger}
              </button>
            </div>

            <p
              className={`text-xs text-slate-500 mt-0.5 truncate ${
                translating ? "opacity-40" : ""
              }`}
            >
              {getCity(customer)}
            </p>
          </div>
        </div>

        <div
          className={`text-xs font-bold money-font ${getBalanceTextClass(
            customer.current_balance
          )}`}
        >
          {formatBalanceWithSide(customer.current_balance)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500 font-semibold">
            {t.phone}
          </span>
          <span className="text-xs text-slate-950 font-mono font-bold">
            {customer.phone || "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500 font-semibold">
            {t.amount}
          </span>
          <span
            className={`text-xs money-font ${getBalanceTextClass(
              customer.current_balance
            )}`}
          >
            {formatBalanceWithSide(customer.current_balance)}
          </span>
        </div>
      </div>

      <div
        className={`mt-4 grid grid-cols-3 gap-2 ${
          isUrdu ? "text-right" : ""
        }`}
      >
        <button
          onClick={() => openEdit(customer)}
          className="h-10 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center gap-1 text-xs font-bold"
        >
          <i className="bi bi-pencil-square"></i>
          {t.edit}
        </button>

        <button
          onClick={() => handleDelete(customer.id)}
          className="h-10 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 transition flex items-center justify-center gap-1 text-xs font-bold"
        >
          <i className="bi bi-trash3-fill"></i>
          {t.delete}
        </button>

        <button
          onClick={() => handleCall(customer)}
          disabled={!customer.phone}
          className={`h-10 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold ${
            customer.phone
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
          title={customer.phone ? t.call : t.noPhone}
        >
          <i className="bi bi-telephone-fill"></i>
          {t.call}
        </button>
      </div>
    </div>
  );
};

const LedgerTable = ({
  ledgerLoading,
  ledgerRows,
  t,
  isUrdu,
  getEntryDate,
  getEntryDescription,
  openEditLedgerForm,
  handleLedgerDelete,
}) => {
  return (
    <div className="bg-white rounded-[18px] sm:rounded-[22px] shadow-sm border border-slate-200 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-slate-600">
          <thead>
            <tr className="bg-slate-950 text-white text-[11px] font-extrabold uppercase tracking-wide border-b border-slate-900">
              <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                #
              </th>
              <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                {t.date}
              </th>
              <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                {t.source}
              </th>
              <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                {t.details}
              </th>
              <th className="px-4 py-3 text-right">{t.debit}</th>
              <th className="px-4 py-3 text-right">{t.credit}</th>
              <th className="px-4 py-3 text-right">{t.balance}</th>
              <th className="px-4 py-3 text-center">{t.actions}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-sky-50">
            {ledgerLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                  <p className="mt-2">{t.ledgerLoading}</p>
                </td>
              </tr>
            ) : ledgerRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  {t.ledgerEmpty}
                </td>
              </tr>
            ) : (
              ledgerRows.map((row, index) => (
                <LedgerDesktopRow
                  key={`${row.source}-${row.id}-${index}`}
                  row={row}
                  index={index}
                  t={t}
                  isUrdu={isUrdu}
                  getEntryDate={getEntryDate}
                  getEntryDescription={getEntryDescription}
                  openEditLedgerForm={openEditLedgerForm}
                  handleLedgerDelete={handleLedgerDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {ledgerLoading ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
            <p className="mt-2">{t.ledgerLoading}</p>
          </div>
        ) : ledgerRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            {t.ledgerEmpty}
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {ledgerRows.map((row, index) => (
              <LedgerMobileCard
                key={`${row.source}-${row.id}-${index}`}
                row={row}
                index={index}
                t={t}
                isUrdu={isUrdu}
                getEntryDate={getEntryDate}
                getEntryDescription={getEntryDescription}
                openEditLedgerForm={openEditLedgerForm}
                handleLedgerDelete={handleLedgerDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LedgerDesktopRow = ({
  row,
  index,
  t,
  isUrdu,
  getEntryDate,
  getEntryDescription,
  openEditLedgerForm,
  handleLedgerDelete,
}) => {
  const srcInfo = getSourceInfo(row.source, t);
  const editDisabled = !row.can_edit;
  const deleteDisabled = !row.can_delete;

  const rowBg =
    row.source === "invoice"
      ? "bg-amber-50/40 hover:bg-amber-50/70"
      : row.source === "return"
      ? "bg-violet-50/40 hover:bg-violet-50/70"
      : "hover:bg-slate-50/40";

  const detail =
    row.source === "invoice"
      ? `Sale Invoice No: ${row.invoice_no || "-"}`
      : row.source === "return"
      ? `Sales Return No: ${row.return_no || "-"}`
      : getEntryDescription(row);

  return (
    <tr className={`transition ${rowBg}`}>
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
        {index + 1}
      </td>

      <td className="px-4 py-3 text-slate-950 font-mono text-xs font-semibold">
        {getEntryDate(row) || "-"}
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${srcInfo.bg} ${srcInfo.text}`}
        >
          {srcInfo.label}
        </span>
      </td>

      <td className={`px-4 py-3 font-semibold text-slate-950 ${isUrdu ? "text-right" : ""}`}>
        {detail}
      </td>

      <td
        className={`px-4 py-3 text-right money-font ${
          Number(row.debit || 0) > 0 ? "text-slate-950" : "text-slate-400"
        }`}
      >
        {formatDebit(row.debit)}
      </td>

      <td
        className={`px-4 py-3 text-right money-font ${
          Number(row.credit || 0) > 0 ? "text-rose-700" : "text-slate-400"
        }`}
      >
        {formatCredit(row.credit)}
      </td>

      <td
        className={`px-4 py-3 text-right money-font ${getBalanceTextClass(
          row.balance
        )}`}
      >
        {formatBalanceWithSide(row.balance)}
      </td>

      <td className="px-4 py-3">
        <div
          className={`flex items-center justify-center gap-2 ${
            isUrdu ? "flex-row-reverse" : ""
          }`}
        >
          <button
            onClick={() => openEditLedgerForm(row)}
            disabled={editDisabled}
            className={`w-9 h-9 rounded-lg transition flex items-center justify-center ${
              editDisabled
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
            title={editDisabled ? t.editNotAllowed : t.edit}
          >
            <i className="bi bi-pencil-square"></i>
          </button>

          <button
            onClick={() => handleLedgerDelete(row)}
            disabled={deleteDisabled}
            className={`w-9 h-9 rounded-lg transition flex items-center justify-center ${
              deleteDisabled
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-rose-100 text-rose-700 hover:bg-rose-200"
            }`}
            title={deleteDisabled ? t.deleteNotAllowed : t.delete}
          >
            <i className="bi bi-trash3-fill"></i>
          </button>
        </div>
      </td>
    </tr>
  );
};

const LedgerMobileCard = ({
  row,
  index,
  t,
  isUrdu,
  getEntryDate,
  getEntryDescription,
  openEditLedgerForm,
  handleLedgerDelete,
}) => {
  const srcInfo = getSourceInfo(row.source, t);
  const editDisabled = !row.can_edit;
  const deleteDisabled = !row.can_delete;

  const detail =
    row.source === "invoice"
      ? `Sale Invoice No: ${row.invoice_no || "-"}`
      : row.source === "return"
      ? `Sales Return No: ${row.return_no || "-"}`
      : getEntryDescription(row);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div
        className={`flex items-start justify-between gap-3 ${
          isUrdu ? "flex-row-reverse" : ""
        }`}
      >
        <div>
          <p className="text-[11px] text-slate-400 font-bold">#{index + 1}</p>
          <p className="text-sm font-extrabold text-slate-950 mt-0.5">
            {getEntryDate(row) || "-"}
          </p>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${srcInfo.bg} ${srcInfo.text}`}
        >
          {srcInfo.label}
        </span>
      </div>

      <p
        className={`mt-3 text-sm font-semibold text-slate-950 ${
          isUrdu ? "text-right" : ""
        }`}
      >
        {detail}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] text-slate-500 font-bold">{t.debit}</p>
          <p
            className={`text-xs money-font ${
              Number(row.debit || 0) > 0 ? "text-slate-950" : "text-slate-400"
            }`}
          >
            {formatDebit(row.debit)}
          </p>
        </div>

        <div className="rounded-xl bg-rose-50 px-3 py-2">
          <p className="text-[10px] text-rose-500 font-bold">{t.credit}</p>
          <p
            className={`text-xs money-font ${
              Number(row.credit || 0) > 0 ? "text-rose-700" : "text-slate-400"
            }`}
          >
            {formatCredit(row.credit)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] text-slate-500 font-bold">{t.balance}</p>
          <p className={`text-xs money-font ${getBalanceTextClass(row.balance)}`}>
            {formatBalanceWithSide(row.balance)}
          </p>
        </div>
      </div>

      <div className={`mt-4 grid grid-cols-2 gap-2 ${isUrdu ? "text-right" : ""}`}>
        <button
          onClick={() => openEditLedgerForm(row)}
          disabled={editDisabled}
          className={`h-10 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold ${
            editDisabled
              ? "bg-slate-100 text-slate-300 cursor-not-allowed"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
        >
          <i className="bi bi-pencil-square"></i>
          {t.edit}
        </button>

        <button
          onClick={() => handleLedgerDelete(row)}
          disabled={deleteDisabled}
          className={`h-10 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold ${
            deleteDisabled
              ? "bg-slate-100 text-slate-300 cursor-not-allowed"
              : "bg-rose-100 text-rose-700 hover:bg-rose-200"
          }`}
        >
          <i className="bi bi-trash3-fill"></i>
          {t.delete}
        </button>
      </div>
    </div>
  );
};

export default CustomerPage;
