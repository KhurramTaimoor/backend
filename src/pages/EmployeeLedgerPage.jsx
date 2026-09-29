import React, { useState, useEffect } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS (Strictly English & Proper Urdu)
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Employee Ledger",
    subtitle: "View complete salary, allowances, and deduction history",
    selectEmployee: "Select Employee",
    selectEmployeeOpt: "-- Select Employee --",
    totalPaid: "Total Paid",
    totalDue: "Total Due",
    month: "Month",
    year: "Year",
    basicSalary: "Basic Salary",
    allowances: "Allowances",
    deductions: "Deductions",
    netSalary: "Net Salary",
    status: "Status",
    paid: "Paid",
    pending: "Pending",
    noRecords: "Select an employee from above to view their ledger.",
    emptyLedger: "No payroll entries found for this employee.",
    loading: "Loading ledger...",
    toggleLang: "اردو",
    printBtn: "Print Ledger",
    pdfBtn: "Download PDF",
    reportHeader: "Employee Ledger Report",
    printedOn: "Printed On",
  },
  ur: {
    title: "ایمپلائی لیجر",
    subtitle: "تنخواہ، الاؤنسز اور کٹوتیوں کی مکمل ہسٹری دیکھیں",
    selectEmployee: "ملازم منتخب کریں",
    selectEmployeeOpt: "-- ملازم منتخب کریں --",
    totalPaid: "کل ادا شدہ",
    totalDue: "کل بقایا جات",
    month: "مہینہ",
    year: "سال",
    basicSalary: "بنیادی تنخواہ",
    allowances: "الاؤنسز",
    deductions: "کٹوتی",
    netSalary: "خالص تنخواہ",
    status: "حالت",
    paid: "ادا شدہ",
    pending: "زیر التواء",
    noRecords: "لیجر دیکھنے کے لیے اوپر سے ملازم منتخب کریں۔",
    emptyLedger: "اس ملازم کی کوئی پے رول انٹری نہیں ملی۔",
    loading: "لیجر لوڈ ہو رہا ہے...",
    toggleLang: "English",
    printBtn: "لیجر پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "ملازم کے لیجر کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const EmployeeLedgerPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const fmt = (n) => parseFloat(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Fetch Employees Dropdown ──
  useEffect(() => {
    axios.get(`${API_BASE}/employee-ledger/employees`)
      .then(r => setEmployees(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        console.error(err);
        setEmployees([]);
      });
  }, []);

  // ── Handle Employee Change & Fetch Ledger ──
  const handleEmpChange = (e) => {
    const id = e.target.value;
    setSelectedEmp(id);
    
    if (!id) { 
      setLedgerData(null); 
      return; 
    }
    
    setLoading(true);
    axios.get(`${API_BASE}/employee-ledger?employee_id=${id}`)
      .then(r => { 
        setLedgerData(r.data); 
        setLoading(false); 
      })
      .catch((err) => {
        console.error(err);
        setLedgerData(null);
        setLoading(false);
      });
  };

  // ── Print / PDF Generator ──
  const generatePrintDocument = (isPdf = false) => {
    if (!ledgerData) return;
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";
    
    const rowsHtml = ledgerData.records.map((r, i) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td><strong>${r.month}</strong></td>
        <td>${r.year}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'};">₨ ${fmt(r.basic_salary)}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #047857;">₨ ${fmt(r.allowances)}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #b91c1c;">₨ ${fmt(r.deductions)}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; font-weight: bold; color: #0369a1; background: #f0f9ff;">₨ ${fmt(r.net_salary)}</td>
        <td style="text-align: center;">${t[(r.status || "paid").toLowerCase()] || r.status}</td>
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
          .report-container { max-width: 1000px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0369a1; padding-bottom: 20px; margin-bottom: 20px; }
          .brand { font-size: 28px; font-weight: bold; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; }
          .report-title { font-size: 18px; color: #64748b; margin-top: 5px; }
          .meta { text-align: ${isUrdu ? "left" : "right"}; font-size: 13px; color: #475569; }
          
          .summary-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
          .summary-item { flex: 1; border-right: 1px solid #e2e8f0; padding: 0 15px; }
          .summary-item:last-child { border-right: none; }
          .summary-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 5px; }
          .summary-value { font-size: 20px; font-weight: bold; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #0369a1; color: #fff; text-align: ${isUrdu ? "right" : "left"}; padding: 10px; font-weight: normal; border: 1px solid #0284c7; }
          td { border: 1px solid #e2e8f0; padding: 8px 10px; color: #334155; }
          tr:nth-child(even) td { background: #f8fafc; }
          
          .print-instruct { background: #e0f2fe; color: #0369a1; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border: 1px solid #bae6fd; }
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
              <div style="margin-top: 10px; font-weight: bold; font-size: 16px; color: #0f172a;">
                ${ledgerData.employee?.name || "-"} <span style="font-weight:normal; color: #64748b; font-size: 14px;">(${ledgerData.employee?.department || "-"})</span>
              </div>
            </div>
            <div class="meta">
              <div>${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
            </div>
          </div>

          <div class="summary-box">
            <div class="summary-item" style="text-align: ${isUrdu ? 'right' : 'left'};">
              <div class="summary-label">${t.totalPaid}</div>
              <div class="summary-value" style="color: #047857;">₨ ${fmt(ledgerData.total_paid)}</div>
            </div>
            <div class="summary-item" style="text-align: ${isUrdu ? 'left' : 'right'};">
              <div class="summary-label">${t.totalDue}</div>
              <div class="summary-value" style="color: #b91c1c;">₨ ${fmt(ledgerData.total_due)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>${t.month}</th>
                <th>${t.year}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.basicSalary}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.allowances}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.deductions}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.netSalary}</th>
                <th style="text-align: center;">${t.status}</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerData.records?.length > 0 ? rowsHtml : `<tr><td colspan="8" style="text-align:center; padding: 20px;">${t.emptyLedger}</td></tr>`}
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
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        
        {/* ── Action Top Bar (Employee Select & Print) ── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-96">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t.selectEmployee}</label>
            <div className="relative">
              <i className={`bi bi-person-badge absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
              <select value={selectedEmp} onChange={handleEmpChange}
                className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none ${isUrdu ? "pr-9 pl-8 text-right" : "pl-9 pr-8"}`}>
                <option value="">{t.selectEmployeeOpt}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i>
            </div>
          </div>
          
          <div className={`flex gap-2 mt-4 md:mt-0 w-full md:w-auto ${isUrdu ? "flex-row-reverse" : ""}`}>
            <button onClick={() => generatePrintDocument(false)} disabled={!ledgerData || ledgerData.records.length === 0} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="bi bi-printer text-sky-600"></i> {t.printBtn}
            </button>
            <button onClick={() => generatePrintDocument(true)} disabled={!ledgerData || ledgerData.records.length === 0} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
            </button>
          </div>
        </div>

        {/* ── Ledger Content ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          {!selectedEmp ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <i className="bi bi-search text-3xl opacity-50"></i>
              </div>
              <p className="font-medium text-slate-500">{t.noRecords}</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
              <i className="bi bi-arrow-repeat animate-spin text-3xl mb-3 text-sky-500"></i>
              <p>{t.loading}</p>
            </div>
          ) : (
            <>
              {/* Employee Summary Header */}
              <div className={`px-6 py-5 bg-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-4 ${isUrdu ? "md:flex-row-reverse" : ""}`}>
                <div className={`flex items-center gap-4 ${isUrdu ? "flex-row-reverse" : ""}`}>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-sky-400 text-xl">
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <div className={isUrdu ? "text-right" : "text-left"}>
                    <p className="font-bold text-lg leading-tight">{ledgerData?.employee?.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5"><i className="bi bi-diagram-3 mr-1"></i> {ledgerData?.employee?.department || "-"}</p>
                  </div>
                </div>
                
                <div className={`flex gap-6 text-sm bg-slate-900/50 px-5 py-3 rounded-xl border border-white/5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">{t.totalPaid}</p>
                    <p className="text-emerald-400 font-mono font-bold text-lg">₨ {fmt(ledgerData?.total_paid)}</p>
                  </div>
                  <div className="w-px bg-white/10"></div>
                  <div className="text-center">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">{t.totalDue}</p>
                    <p className="text-red-400 font-mono font-bold text-lg">₨ {fmt(ledgerData?.total_due)}</p>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              {ledgerData?.records?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-slate-400">
                  <p>{t.emptyLedger}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-600 border-collapse">
                    <thead className="bg-sky-50 text-sky-800 uppercase text-xs font-bold border-b border-sky-100">
                      <tr>
                        <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                        <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.month}</th>
                        <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.year}</th>
                        <th className="px-4 py-3 text-right">{t.basicSalary}</th>
                        <th className="px-4 py-3 text-right">{t.allowances}</th>
                        <th className="px-4 py-3 text-right">{t.deductions}</th>
                        <th className="px-4 py-3 text-right">{t.netSalary}</th>
                        <th className="px-4 py-3 text-center">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData?.records?.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-sky-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-slate-400 font-mono text-xs text-center">{i + 1}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-800">{r.month}</td>
                          <td className="px-4 py-3.5 text-slate-600 font-mono">{r.year}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-600">₨ {fmt(r.basic_salary)}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-600 font-medium">{r.allowances > 0 ? `₨ ${fmt(r.allowances)}` : "-"}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-red-500 font-medium">{r.deductions > 0 ? `₨ ${fmt(r.deductions)}` : "-"}</td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-sky-700 bg-sky-50/50">₨ {fmt(r.net_salary)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              (r.status || "").toLowerCase() === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {t[(r.status || "").toLowerCase()] || r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmployeeLedgerPage;