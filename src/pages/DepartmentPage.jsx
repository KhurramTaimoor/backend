import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS (Strictly English & Proper Urdu)
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Departments Setup",
    subtitle: "Manage company departments and internal extensions",
    addBtn: "New Department",
    searchPlaceholder: "Search departments...",
    deptName: "Department Name",
    selectDept: "Select Department",
    newDeptOpt: "New department name...",
    addNewOpt: "Add New Option",
    headOfDept: "Head of Dept",
    extNo: "Extension No",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    records: "Records",
    noRecords: "No departments found.",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "Departments List",
    printedOn: "Printed On",
    successSave: "Department saved successfully!",
    errorMsg: "Department name is required!",
    deleteConfirm: "Are you sure you want to delete this department?",
  },
  ur: {
    title: "محکمہ جات کا سیٹ اپ",
    subtitle: "کمپنی کے محکموں اور اندرونی ایکسٹینشنز کا انتظام کریں",
    addBtn: "نیا محکمہ",
    searchPlaceholder: "محکمے تلاش کریں...",
    deptName: "محکمے کا نام",
    selectDept: "محکمہ منتخب کریں",
    newDeptOpt: "نئے محکمے کا نام...",
    addNewOpt: "نیا آپشن شامل کریں",
    headOfDept: "سربراہ (Head)",
    extNo: "ایکسٹینشن نمبر",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    records: "ریکارڈز",
    noRecords: "کوئی محکمہ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "محکمہ جات کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "محکمہ کامیابی سے محفوظ ہو گیا!",
    errorMsg: "محکمے کا نام درکار ہے!",
    deleteConfirm: "کیا آپ واقعی یہ محکمہ حذف کرنا چاہتے ہیں؟",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const DepartmentPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState([
    { label: "Production", code: "PRD" },
    { label: "Sales", code: "SLS" },
    { label: "Accounts", code: "ACC" },
    { label: "HR", code: "HR" },
    { label: "Admin", code: "ADM" },
  ]);

  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newItem, setNewItem] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  
  const [form, setForm] = useState({ department_name: "", head_of_dept: "", extension_no: "" });
  const [tableSearch, setTableSearch] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showForm, setShowForm] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch Data ──
  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API_BASE}/departments`);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
      setRecords([]);
      showToast("error", err?.response?.data?.message || "Failed to load departments.");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // ── Dropdown Handlers ──
  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const entry = { label: newItem.trim(), code: newItem.trim().toUpperCase().slice(0, 4) };
    
    try {
      // Saving new option directly to DB
      await axios.post(`${API_BASE}/departments`, { department_name: newItem.trim(), head_of_dept: "", extension_no: "" });
    } catch (e) {
      console.error(e);
      showToast("error", e?.response?.data?.message || "Department could not be saved.");
      return;
    }

    setOptions(prev => [...prev, entry]);
    setSelected(entry);
    setForm(f => ({ ...f, department_name: entry.label }));
    setNewItem("");
    setAddingNew(false);
    setOpen(false);
    setSearch("");
    fetchAll();
  };

  const handleSelect = (opt) => {
    setSelected(opt);
    setForm(f => ({ ...f, department_name: opt.label }));
    setOpen(false);
    setSearch("");
  };

  // ── Main Form Handlers ──
  const openAddForm = () => {
    setForm({ department_name: "", head_of_dept: "", extension_no: "" });
    setSelected(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.department_name) { 
      showToast("error", t.errorMsg); 
      return; 
    }

    try {
      await axios.post(`${API_BASE}/departments`, form);
      showToast("success", t.successSave);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast("error", err?.response?.data?.message || "Department could not be saved.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API_BASE}/departments/${id}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast("error", err?.response?.data?.message || "Department could not be deleted.");
    }
  };

  // ── Search & Print ──
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  
  const tableFiltered = records.filter(r =>
    (r.department_name || "").toLowerCase().includes(tableSearch.toLowerCase()) ||
    (r.head_of_dept || "").toLowerCase().includes(tableSearch.toLowerCase())
  );

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";
    const rowsHtml = tableFiltered.map((r, i) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td><strong>${r.department_name}</strong></td>
        <td>${r.head_of_dept || "-"}</td>
        <td style="font-family: monospace;">${r.extension_no || "-"}</td>
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
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; }
          .report-title { font-size: 18px; color: #64748b; margin-top: 5px; }
          .meta { text-align: ${isUrdu ? "left" : "right"}; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { background: #1e40af; color: #fff; text-align: ${isUrdu ? "right" : "left"}; padding: 12px; font-weight: normal; }
          td { border-bottom: 1px solid #e2e8f0; padding: 12px; color: #334155; }
          tr:nth-child(even) td { background: #f8fafc; }
          .print-instruct { background: #eff6ff; color: #1d4ed8; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border: 1px solid #bfdbfe; }
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
                <th style="width: 50px; text-align: center;">#</th>
                <th>${t.deptName}</th>
                <th>${t.headOfDept}</th>
                <th>${t.extNo}</th>
              </tr>
            </thead>
            <tbody>
              ${tableFiltered.length > 0 ? rowsHtml : `<tr><td colspan="4" style="text-align:center;">${t.noRecords}</td></tr>`}
            </tbody>
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setLang(lang === "en" ? "ur" : "en")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition">
            <i className="bi bi-translate"></i>{t.toggleLang}
          </button>
          <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow">
            <i className="bi bi-plus-lg"></i>{t.addBtn}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        
        {/* ── Search & Actions ── */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="relative w-full max-w-sm">
            <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
            <input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder={t.searchPlaceholder}
              className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
          </div>
          
          <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
            <button onClick={() => generatePrintDocument(false)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
              <i className="bi bi-printer text-blue-600"></i> {t.printBtn}
            </button>
            <button onClick={() => generatePrintDocument(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
              <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <i className="bi bi-diagram-3 text-slate-400"></i>
            <h3 className="font-bold text-slate-700 text-sm">
              {t.records} <span className="mx-2 bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-mono">{tableFiltered.length}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-white text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"} w-16`}>#</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.deptName}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.headOfDept}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.extNo}</th>
                  <th className="px-5 py-3 text-center w-32">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableFiltered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td></tr>
                ) : (
                  tableFiltered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-blue-50 transition">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{r.department_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {r.head_of_dept ? (
                          <span className="flex items-center gap-1.5"><i className="bi bi-person-badge text-slate-400"></i> {r.head_of_dept}</span>
                        ) : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono border border-slate-200">{r.extension_no || "-"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className={`flex items-center justify-center gap-1.5 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition"><i className="bi bi-trash3"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Modal Form (With Searchable Dropdown) ── */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" dir={dir}>
              
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <i className="bi bi-diagram-3 text-blue-700 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{t.addBtn}</h2>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Department Custom Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.deptName} *</label>
                    <div ref={ref} className="relative">
                      <button type="button" onClick={() => setOpen(!open)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-all ${open ? "border-blue-500 ring-2 ring-blue-100 bg-white" : "border-slate-200 bg-slate-50 hover:border-blue-300"} ${selected ? "text-slate-800 font-medium" : "text-slate-400"}`}>
                        
                        <span>{selected ? (
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{selected.code}</span>
                            {selected.label}
                          </span>
                        ) : t.selectDept}</span>
                        
                        <div className="flex items-center gap-2">
                          {selected && <i onClick={(e) => { e.stopPropagation(); setSelected(null); setForm(f => ({ ...f, department_name: "" })); }} className="bi bi-x-lg text-slate-300 hover:text-red-400 cursor-pointer"></i>}
                          <i className={`bi bi-chevron-down text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}></i>
                        </div>

                      </button>

                      {open && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                              <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                                className={`w-full py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white ${isUrdu ? "pr-8 pl-3 text-right" : "pl-8 pr-3"}`}
                                placeholder={t.searchPlaceholder} />
                            </div>
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto">
                            {filteredOptions.map((opt, i) => (
                              <button key={i} type="button" onClick={() => handleSelect(opt)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors ${selected?.code === opt.code ? "bg-blue-50" : ""}`}>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono min-w-[36px] text-center ${selected?.code === opt.code ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{opt.code}</span>
                                <span className={`flex-1 ${selected?.code === opt.code ? "text-blue-700 font-bold" : "text-slate-700"}`}>{opt.label}</span>
                                {selected?.code === opt.code && <i className="bi bi-check-lg text-blue-600 font-bold"></i>}
                              </button>
                            ))}
                          </div>
                          
                          <div className="border-t border-slate-100 p-2 bg-slate-50">
                            {addingNew ? (
                              <div className={`flex gap-1.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                                <input autoFocus value={newItem} onChange={e => setNewItem(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddingNew(false); setNewItem(""); } }}
                                  className={`flex-1 px-3 py-2 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${isUrdu ? "text-right" : ""}`}
                                  placeholder={t.newDeptOpt} />
                                <button type="button" onClick={handleAdd} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-semibold"><i className="bi bi-check-lg"></i></button>
                                <button type="button" onClick={() => { setAddingNew(false); setNewItem(""); }} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-300"><i className="bi bi-x-lg"></i></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setAddingNew(true)}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-xs text-blue-600 hover:bg-blue-100 rounded-lg font-bold transition">
                                <i className="bi bi-plus-lg"></i> {t.addNewOpt}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Head of Dept */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.headOfDept}</label>
                    <div className="relative">
                      <i className={`bi bi-person-badge absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="text" value={form.head_of_dept} onChange={e => setForm({ ...form, head_of_dept: e.target.value })} placeholder="e.g. Ahmed Khan"
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                  {/* Extension No */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.extNo}</label>
                    <div className="relative">
                      <i className={`bi bi-telephone absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input type="text" value={form.extension_no} onChange={e => setForm({ ...form, extension_no: e.target.value })} placeholder="e.g. 101"
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
                    </div>
                  </div>

                </div>
              </div>
              
              {/* Footer */}
              <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0 rounded-b-2xl ${isUrdu ? "flex-row-reverse justify-start" : "justify-end"}`}>
                <button onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-600 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition bg-white">{t.cancel}</button>
                <button onClick={handleSave} className="bg-blue-700 text-white px-8 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition shadow-lg shadow-blue-700/20 flex items-center gap-2">
                  <i className="bi bi-save"></i> {t.save}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentPage;