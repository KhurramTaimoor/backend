import React, { useState, useEffect } from "react";
import axios from "axios";
import { escapeHtml, openUnicodePrint, printableText } from "../utils/unicodePrint";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Salesman Management",
    subtitle: "Manage your sales team",
    addBtn: "Add Salesman",
    searchPlaceholder: "Search by name, phone or CNIC…",
    salesmanName: "Salesman Name",
    phone: "Phone",
    cnic: "CNIC",
    commission: "Salary (PKR)",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    printSlip: "Print Slip",
    downloadPdf: "Download PDF",
    noRecords: "No salesmen found.",
    toggleLang: "اردو",
    status: "Status",
    active: "Active",
    actions: "Actions",
    loading: "Loading salesmen...",
    errorMsg: "Salesman name is required.",
    successSave: "Record saved successfully!",
    deleteConfirm: "Are you sure you want to delete this salesman?",
    slipTitle: "Salesman Profile Slip",
    slipName: "Salesman Name",
    slipPhone: "Phone",
    slipCnic: "CNIC",
    slipCommission: "Salary",
    slipDate: "Date",
    slipThank: "Authorized Salesman — Keep this slip safe.",
  },
  ur: {
    title: "سیلز مین کا انتظام",
    subtitle: "اپنی سیلز ٹیم کا ریکارڈ رکھیں",
    addBtn: "سیلز مین شامل کریں",
    searchPlaceholder: "نام، فون یا شناختی کارڈ سے تلاش کریں…",
    salesmanName: "سیلز مین کا نام",
    phone: "فون",
    cnic: "شناختی کارڈ",
    commission: "تنخواہ (روپے)",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    printSlip: "سلپ پرنٹ کریں",
    downloadPdf: "PDF ڈاؤنلوڈ",
    noRecords: "کوئی سیلز مین نہیں ملا۔",
    toggleLang: "English",
    status: "حالت",
    active: "فعال",
    actions: "اقدامات",
    loading: "سیلز مین کا ڈیٹا لوڈ ہو رہا ہے...",
    errorMsg: "سیلز مین کا نام درکار ہے۔",
    successSave: "ریکارڈ کامیابی سے محفوظ ہو گیا!",
    deleteConfirm: "کیا آپ واقعی اس سیلز مین کو حذف کرنا چاہتے ہیں؟",
    slipTitle: "سیلز مین پروفائل سلپ",
    slipName: "نام",
    slipPhone: "فون",
    slipCnic: "شناختی کارڈ",
    slipCommission: "تنخواہ",
    slipDate: "تاریخ",
    slipThank: "مجاز سیلز مین — یہ سلپ محفوظ رکھیں۔",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/salesmen`;

// ─────────────────────────────────────────────────────────────────
// UNICODE-SAFE PRINT / PDF
// Browser print rendering is used so Urdu/Arabic names are preserved.
// ─────────────────────────────────────────────────────────────────
function salesmanSlipDocument(salesman, lang, showPdfHint = false) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const commission = `PKR ${Number(salesman.commission || 0).toLocaleString("en-PK")}`;
  const date = new Date().toLocaleDateString(isUrdu ? "ur-PK" : "en-PK");

  const bodyHtml = `
    ${
      showPdfHint
        ? `<div class="pdf-hint">${
            isUrdu
              ? "پی ڈی ایف کے لیے پرنٹ ڈائیلاگ میں Save as PDF منتخب کریں۔"
              : "Choose Save as PDF in the print dialog."
          }</div>`
        : ""
    }
    <main class="slip">
      <header class="head">
        <div class="brand">Ali Cage</div>
        <div class="subtitle">${escapeHtml(t.slipTitle)}</div>
        <div class="date">${escapeHtml(date)}</div>
      </header>
      <section class="body">
        <div class="row"><span class="label">${escapeHtml(t.slipName)}</span><strong>${printableText(salesman.salesman_name || "—")}</strong></div>
        <div class="row"><span class="label">${escapeHtml(t.slipPhone)}</span><strong class="ltr-text">${escapeHtml(salesman.phone || "—")}</strong></div>
        <div class="row"><span class="label">${escapeHtml(t.slipCnic)}</span><strong class="ltr-text">${escapeHtml(salesman.cnic || "—")}</strong></div>
        <div class="row"><span class="label">${escapeHtml(t.slipCommission)}</span><strong class="money num">${escapeHtml(commission)}</strong></div>
        <div class="row"><span class="label">${escapeHtml(t.slipDate)}</span><strong>${escapeHtml(date)}</strong></div>
      </section>
      <footer>${escapeHtml(t.slipThank)}</footer>
    </main>`;

  return openUnicodePrint({
    title: `${t.slipTitle} - ${salesman.salesman_name || "Salesman"}`,
    bodyHtml,
    dir,
    lang,
    pageSize: "A5 portrait",
    windowFeatures: "width=600,height=800",
    styles: `
      body{padding:10px}
      .slip{max-width:135mm;margin:0 auto;border:1.5px solid #0C2134;border-radius:12px;overflow:hidden}
      .head{background:#0C2134;color:#fff;text-align:center;padding:20px 18px}
      .brand{font-size:25px;font-weight:800;color:#4A86F7;letter-spacing:.03em}
      .subtitle{margin-top:5px;font-size:14px;font-weight:700}
      .date{margin-top:5px;font-size:9px;color:#CBD5E1}
      .body{padding:17px 22px}
      .row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px dashed #CBD5E1;font-size:12px}
      .row:last-child{border-bottom:0}
      .label{color:#64748B;font-weight:600}
      strong{color:#13263A;text-align:${isUrdu ? "left" : "right"}}
      .money{display:inline-block;padding:4px 9px;border-radius:999px;background:#ECFDF5;color:#047857}
      footer{border-top:1px solid #E2E8F0;background:#F4F7FB;color:#64748B;text-align:center;padding:11px 16px;font-size:9px}
      @media print{body{padding:0}.slip{border-radius:0}}
    `,
  });
}

function downloadSalesmanPdf(salesman, lang) {
  return salesmanSlipDocument(salesman, lang, true);
}

function printSlip(salesman, lang) {
  return salesmanSlipDocument(salesman, lang, false);
}

function downloadAllPdf(salesmen, lang) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const generated = new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK");

  const rows = salesmen
    .map(
      (s, i) => `<tr>
        <td class="center num">${i + 1}</td>
        <td>${printableText(s.salesman_name || "-")}</td>
        <td class="center ltr-text">${escapeHtml(s.phone || "-")}</td>
        <td class="center ltr-text">${escapeHtml(s.cnic || "-")}</td>
        <td class="amount num">PKR ${escapeHtml(Number(s.commission || 0).toLocaleString("en-PK"))}</td>
        <td class="center">${escapeHtml(t.active)}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
    <div class="pdf-hint">${
      isUrdu
        ? "پی ڈی ایف کے لیے پرنٹ ڈائیلاگ میں Save as PDF منتخب کریں۔"
        : "Choose Save as PDF in the print dialog."
    }</div>
    <main class="report">
      <header>
        <div><div class="brand">Ali Cage</div><div class="sub">${escapeHtml(t.title)}</div></div>
        <div class="meta">${escapeHtml(generated)}<br/>${escapeHtml(t.status)}: ${salesmen.length}</div>
      </header>
      <table>
        <thead><tr><th>#</th><th>${escapeHtml(t.salesmanName)}</th><th>${escapeHtml(t.phone)}</th><th>${escapeHtml(t.cnic)}</th><th>${escapeHtml(t.commission)}</th><th>${escapeHtml(t.status)}</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="empty">${escapeHtml(t.noRecords)}</td></tr>`}</tbody>
      </table>
    </main>`;

  return openUnicodePrint({
    title: `${t.title} - Ali Cage`,
    bodyHtml,
    dir,
    lang,
    pageSize: "A4 landscape",
    styles: `
      .report{width:100%}
      header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;background:#0C2134;color:#fff;padding:14px 17px;margin-bottom:14px}
      .brand{font-size:21px;font-weight:800;color:#4A86F7}.sub{font-size:11px;margin-top:3px}.meta{font-size:9px;color:#CBD5E1;text-align:${isUrdu ? "left" : "right"}}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}thead{display:table-header-group}tr{break-inside:avoid}
      th{background:#0B4E9B;color:#fff;padding:7px;border:1px solid #0B4E9B;text-align:${isUrdu ? "right" : "left"}}
      td{border:1px solid #CBD5E1;padding:7px;overflow-wrap:anywhere}tbody tr:nth-child(odd) td{background:#F8FAFC}
      .center{text-align:center!important}.amount{text-align:right!important}.empty{text-align:center;padding:26px;color:#64748B}
    `,
  });
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const SalesmanPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    salesman_name: "",
    phone: "",
    cnic: "",
    commission: "",
  });

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const fetchSalesmen = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setSalesmen(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("error", "Server connection error!");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const openAdd = () => {
    setForm({
      salesman_name: "",
      phone: "",
      cnic: "",
      commission: "",
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({
      salesman_name: s.salesman_name || "",
      phone: s.phone || "",
      cnic: s.cnic || "",
      commission: s.commission || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.salesman_name.trim()) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      salesman_name: form.salesman_name,
      phone: form.phone,
      cnic: form.cnic,
      commission: form.commission ? Number(form.commission) : 0,
    };

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/${editingId}`, payload);
      } else {
        await axios.post(API_BASE, payload);
      }
      showToast("success", t.successSave);
      fetchSalesmen();
      setShowForm(false);
    } catch (err) {
      console.error("Save error:", err);
      showToast("error", "Error saving record! Check Node.js console.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API_BASE}/${id}`);
      fetchSalesmen();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", "Error deleting record!");
    }
  };

  const filtered = salesmen.filter((s) =>
    [s.salesman_name, s.phone, s.cnic].some((v) =>
      (v || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const formFields = [
    { key: "salesman_name", label: t.salesmanName, icon: "bi-person-badge", type: "text" },
    { key: "phone", label: t.phone, icon: "bi-telephone", type: "text" },
    { key: "cnic", label: t.cnic, icon: "bi-credit-card-2-front", type: "text" },
    { key: "commission", label: t.commission, icon: "bi-cash", type: "number" },
  ];

  return (
    <div
      dir={dir}
      style={{ fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif" }}
      className="min-h-screen bg-slate-50 p-6 pb-20"
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />
      {isUrdu && (
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap"
          rel="stylesheet"
        />
      )}

      {/* Toast */}
      {message.text && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${
            message.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <i
            className={`bi ${
              message.type === "error"
                ? "bi-exclamation-triangle"
                : "bi-check-circle"
            }`}
          ></i>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow"
          >
            <i className="bi bi-translate"></i>
            {t.toggleLang}
          </button>

          <button
            onClick={() => downloadAllPdf(filtered, lang)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow"
          >
            <i className="bi bi-file-earmark-pdf"></i>
            {t.downloadPdf}
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow"
          >
            <i className="bi bi-person-plus-fill"></i>
            {t.addBtn}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <i
            className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              isUrdu ? "right-3" : "left-3"
            }`}
          ></i>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm ${
              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
            }`}
          />
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir={dir}>
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <i className="bi bi-person-badge text-blue-600 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <div className="space-y-4">
                {formFields.map(({ key, label, icon, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {label} {key === "salesman_name" && "*"}
                    </label>
                    <div className="relative">
                      <i
                        className={`bi ${icon} absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                          isUrdu ? "right-3" : "left-3"
                        }`}
                      ></i>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                          isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                        } ${type === "number" ? "font-mono" : ""}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`flex gap-3 mt-6 pt-4 border-t border-slate-100 ${
                  isUrdu ? "flex-row-reverse" : ""
                }`}
              >
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2"
                >
                  <i className="bi bi-save"></i> {t.save}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition shadow"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.salesmanName}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.phone}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.cnic}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-left" : "text-right"}`}>{t.commission}</th>
                  <th className="px-5 py-3 text-center">{t.status}</th>
                  <th className="px-5 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
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
                  filtered.map((s, i) => (
                    <tr key={s.id} className="hover:bg-blue-50 transition">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>

                      <td className="px-5 py-3.5">
                        <div className={`flex items-center gap-2.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <i className="bi bi-person-fill text-blue-500 text-sm"></i>
                          </div>
                          <span className="font-semibold text-slate-800">{s.salesman_name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-slate-600 font-mono text-xs ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-telephone text-slate-400"></i>
                          {s.phone || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 font-mono text-xs text-slate-500 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-credit-card-2-front text-slate-400"></i>
                          {s.cnic || "—"}
                        </span>
                      </td>

                      <td className={`px-5 py-3.5 font-mono font-bold text-emerald-600 ${isUrdu ? "text-left" : "text-right"}`}>
                        ₨ {Number(s.commission || 0).toLocaleString("en-PK")}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                          {t.active}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className={`flex items-center justify-center gap-1.5 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>

                          <button
                            onClick={() => handleDelete(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>

                          <button
                            onClick={() => printSlip(s, lang)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
                          >
                            <i className="bi bi-printer"></i>
                          </button>

                          <button
                            onClick={() => downloadSalesmanPdf(s, lang)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
                          >
                            <i className="bi bi-file-earmark-arrow-down"></i>
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
  );
};

export default SalesmanPage;