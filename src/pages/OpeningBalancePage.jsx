import React, { useState, useEffect } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS (Strictly English & Proper Urdu)
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Opening Balances",
    subtitle: "Manage initial financial balances for your accounts",
    addBtn: "Add Balance",
    searchPlaceholder: "Search by account, fiscal year...",
    fiscalYear: "Fiscal Year",
    account: "Account",
    selectAccount: "-- Select Account --",
    date: "Entry Date",
    debit: "Debit (PKR)",
    credit: "Credit (PKR)",
    totalDebit: "Total Debit",
    totalCredit: "Total Credit",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    noRecords: "No opening balances found.",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "Opening Balances Report",
    printedOn: "Printed On",
    successSave: "Balance saved successfully!",
    successUpdate: "Balance updated successfully!",
    errorMsg: "Please select an account and provide a fiscal year.",
    deleteConfirm: "Are you sure you want to delete this record?",
  },
  ur: {
    title: "ابتدائی بیلنسز",
    subtitle: "اپنے اکاؤنٹس کے ابتدائی مالیاتی بیلنس کا انتظام کریں",
    addBtn: "بیلنس شامل کریں",
    searchPlaceholder: "اکاؤنٹ یا مالی سال سے تلاش کریں...",
    fiscalYear: "مالی سال",
    account: "اکاؤنٹ",
    selectAccount: "-- اکاؤنٹ منتخب کریں --",
    date: "اندراج کی تاریخ",
    debit: "ڈیبٹ (روپے)",
    credit: "کریڈٹ (روپے)",
    totalDebit: "کل ڈیبٹ",
    totalCredit: "کل کریڈٹ",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    noRecords: "کوئی ابتدائی بیلنس نہیں ملا۔",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "ابتدائی بیلنسز کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "بیلنس کامیابی سے محفوظ ہو گیا!",
    successUpdate: "بیلنس کامیابی سے اپڈیٹ ہو گیا!",
    errorMsg: "براہ کرم ایک اکاؤنٹ منتخب کریں اور مالی سال فراہم کریں۔",
    deleteConfirm: "کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

export default function OpeningBalancePage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const fmt = (n) => parseFloat(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 });

  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    fiscal_year: "", account_id: "", entry_date: "", debit: "", credit: ""
  });

  // ── Fetch Data ──
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resBal, resAcc] = await Promise.all([
        axios.get(`${API_BASE}/opening-balances`),
        axios.get(`${API_BASE}/chart-of-accounts`)
      ]);
      setRecords(resBal.data);
      setAccounts(resAcc.data);
    } catch (err) {
      console.error(err);
      setAccounts([]);
      setRecords([]);
      showToast("error", err?.response?.data?.message || "Failed to load opening balances.");
    }
  };

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // ── Form Handlers ──
  const openAdd = () => {
    setForm({ fiscal_year: "", account_id: "", entry_date: "", debit: "", credit: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      fiscal_year: r.fiscal_year, account_id: r.account_id,
      entry_date: r.entry_date, debit: r.debit || "", credit: r.credit || ""
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.account_id || !form.fiscal_year) {
      showToast("error", t.errorMsg);
      return;
    }
    
    // Ensure empty inputs are converted to 0 for DB
    const submitData = {
      ...form,
      debit: form.debit || 0,
      credit: form.credit || 0
    };

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/opening-balances/${editingId}`, submitData);
        showToast("success", t.successUpdate);
      } else {
        await axios.post(`${API_BASE}/opening-balances`, submitData);
        showToast("success", t.successSave);
      }
      fetchData();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      showToast("error", err?.response?.data?.message || "Opening balance could not be saved.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API_BASE}/opening-balances/${id}`);
      fetchData();
    } catch (err) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  // ── Search, Filter & Totals ──
  const filtered = records.filter(r =>
    [r.fiscal_year, r.account_title].some(v => (v || "").toLowerCase().includes(search.toLowerCase()))
  );

  const totalDebit = filtered.reduce((sum, r) => sum + Number(r.debit || 0), 0);
  const totalCredit = filtered.reduce((sum, r) => sum + Number(r.credit || 0), 0);

  // ── Print / PDF Generator ──
  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";
    const rowsHtml = filtered.map((r, i) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${r.fiscal_year}</td>
        <td><strong>${r.account_title}</strong></td>
        <td>${r.entry_date || "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #2563eb;">${Number(r.debit) > 0 ? fmt(r.debit) : "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #059669;">${Number(r.credit) > 0 ? fmt(r.credit) : "-"}</td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="UTF-8"/>
        <title>${t.title}</title>
        ${isUrdu ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">` : ""}
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: ${font}; background: #fff; color: #0f172a; padding: 40px; }
          .report-container { max-width: 900px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0B4E9B; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: bold; color: #0B4E9B; text-transform: uppercase; letter-spacing: 1px; }
          .report-title { font-size: 18px; color: #64748b; margin-top: 5px; }
          .meta { text-align: ${isUrdu ? "left" : "right"}; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;}
          th { background: #0B4E9B; color: #fff; text-align: ${isUrdu ? "right" : "left"}; padding: 12px; font-weight: normal; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px; color: #334155; }
          tr:nth-child(even) td { background: #EFF6FF; }
          .totals-row td { background: #e0e7ff !important; font-weight: bold; border-top: 2px solid #0B4E9B; font-size: 14px; color: #0f172a;}
          .print-instruct { background: #e0e7ff; color: #0B4E9B; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border: 1px solid #DBEAFE; }
          @media print { body { padding: 0; } .print-instruct { display: none; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${isPdf ? `<div class="print-instruct">Please select <strong>"Save as PDF"</strong> in the destination dropdown to download this report.</div>` : ""}
          <div class="header">
            <div>
              <div class="brand">Unique Wear</div>
              <div class="report-title">${t.reportHeader}</div>
            </div>
            <div class="meta">
              <div>${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>${t.fiscalYear}</th>
                <th>${t.account}</th>
                <th>${t.date}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.debit}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.credit}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? rowsHtml : `<tr><td colspan="6" style="text-align:center;">${t.noRecords}</td></tr>`}
            </tbody>
            ${filtered.length > 0 ? `
              <tfoot class="totals-row">
                <tr>
                  <td colspan="4" style="text-align: ${isUrdu ? 'left' : 'right'}; text-transform: uppercase;">Totals</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'}; color: #2563eb;">₨ ${fmt(totalDebit)}</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'}; color: #059669;">₨ ${fmt(totalCredit)}</td>
                </tr>
              </tfoot>
            ` : ""}
          </table>
        </div>
        <script>
          window.onload = () => { setTimeout(() => { window.print(); ${!isPdf ? "window.onafterprint = () => window.close();" : ""} }, 300); }
        </script>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div dir={dir} style={{ fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif" }} className="min-h-screen bg-slate-50 p-6 pb-20">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      {isUrdu && <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet" />}

      {/* Floating Toast Message */}
      {message.text && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <i className={`bi ${message.type === 'error' ? 'bi-exclamation-triangle' : 'bi-check-circle'}`}></i>
          {message.text}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setLang(lang === "en" ? "ur" : "en")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition">
            <i className="bi bi-translate"></i>{t.toggleLang}
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow">
            <i className="bi bi-plus-lg"></i>{t.addBtn}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        
        {/* ── Search & Actions ── */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="relative w-full max-w-sm">
            <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder}
              className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
          </div>
          
          <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
            <button onClick={() => generatePrintDocument(false)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
              <i className="bi bi-printer text-indigo-600"></i> {t.printBtn}
            </button>
            <button onClick={() => generatePrintDocument(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
              <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.fiscalYear}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.account}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.date}</th>
                  <th className="px-4 py-3 text-right">{t.debit}</th>
                  <th className="px-4 py-3 text-right">{t.credit}</th>
                  <th className="px-4 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-indigo-50 transition">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs text-center">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600 border border-slate-200">{r.fiscal_year}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        <div className={`flex items-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-wallet2 text-indigo-500 opacity-70"></i>
                          {r.account_title}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.entry_date || "-"}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-600">
                        {Number(r.debit) > 0 ? `₨ ${fmt(r.debit)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                        {Number(r.credit) > 0 ? `₨ ${fmt(r.credit)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`flex items-center justify-center gap-1.5 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <button onClick={() => openEdit(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition"><i className="bi bi-pencil-square"></i></button>
                          <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition"><i className="bi bi-trash3"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className={`px-4 py-4 text-xs uppercase tracking-wider ${isUrdu ? "text-left" : "text-right"}`}>Totals</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-700 text-sm">₨ {fmt(totalDebit)}</td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-700 text-sm">₨ {fmt(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Modal Form ── */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" dir={dir}>
              
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <i className="bi bi-piggy-bank text-indigo-700 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{editingId ? t.edit : t.addBtn}</h2>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Fiscal Year */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.fiscalYear} *</label>
                    <div className="relative">
                      <i className={`bi bi-calendar-range absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="text" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} placeholder="e.g. 2024-2025"
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 font-mono ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.date}</label>
                    <div className="relative">
                      <i className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                  {/* Account Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.account} *</label>
                    <div className="relative">
                      <i className={`bi bi-diagram-3 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 appearance-none ${isUrdu ? "pr-9 pl-8 text-right" : "pl-9 pr-8"}`}>
                        <option value="">{t.selectAccount}</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>[{a.account_code}] {a.account_title}</option>)}
                      </select>
                      <i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i>
                    </div>
                  </div>

                  {/* Debit */}
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-1">{t.debit}</label>
                    <div className="relative">
                      <i className={`bi bi-currency-rupee absolute top-1/2 -translate-y-1/2 text-blue-500 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="number" min="0" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value, credit: e.target.value > 0 ? "" : form.credit })} placeholder="0.00"
                        className={`w-full border border-blue-200 rounded-lg py-2.5 text-sm bg-blue-50/30 focus:ring-2 focus:ring-blue-500 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                  {/* Credit */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 mb-1">{t.credit}</label>
                    <div className="relative">
                      <i className={`bi bi-currency-rupee absolute top-1/2 -translate-y-1/2 text-emerald-500 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="number" min="0" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value, debit: e.target.value > 0 ? "" : form.debit })} placeholder="0.00"
                        className={`w-full border border-emerald-200 rounded-lg py-2.5 text-sm bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                </div>
              </div>
              
              {/* Footer */}
              <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0 rounded-b-2xl ${isUrdu ? "flex-row-reverse justify-start" : "justify-end"}`}>
                <button onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-600 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition bg-white">{t.cancel}</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                  <i className="bi bi-save"></i> {t.save}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}