import React, { useState, useEffect } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS (Strictly English & Proper Urdu)
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "HR / Payroll Report",
    subtitle: "Employee summary, salary, and active rate details",
    searchPlaceholder: "Search by employee or department...",
    employee: "Employee",
    department: "Department",
    joiningDate: "Joining Date",
    basicSalary: "Basic Salary",
    rateType: "Rate Type",
    currentRate: "Current Rate",
    status: "Status",
    totalPayroll: "Total Payroll",
    noRecords: "No employee records found.",
    loading: "Loading data...",
    toggleLang: "اردو",
    printBtn: "Print Report",
    pdfBtn: "Download PDF",
    reportHeader: "HR / Payroll Summary Report",
    printedOn: "Printed On",
    active: "Active",
    inactive: "Inactive"
  },
  ur: {
    title: "ایچ آر / پے رول رپورٹ",
    subtitle: "ملازمین کا خلاصہ، تنخواہ اور موجودہ ریٹ کی تفصیلات",
    searchPlaceholder: "ملازم یا محکمہ سے تلاش کریں...",
    employee: "ملازم",
    department: "محکمہ",
    joiningDate: "تاریخ شمولیت",
    basicSalary: "بنیادی تنخواہ",
    rateType: "ریٹ کی قسم",
    currentRate: "موجودہ ریٹ",
    status: "حالت",
    totalPayroll: "کل پے رول",
    noRecords: "ملازمین کا کوئی ریکارڈ نہیں ملا۔",
    loading: "ڈیٹا لوڈ ہو رہا ہے...",
    toggleLang: "English",
    printBtn: "رپورٹ پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "ایچ آر / پے رول کا خلاصہ",
    printedOn: "پرنٹ کی تاریخ",
    active: "فعال",
    inactive: "غیر فعال"
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const HRReportPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const fmt = (n) => parseFloat(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });

  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Fetch Data ──
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/hr-reports/summary`)
      .then(r => { 
        setData(r.data); 
        setFiltered(r.data); 
        setLoading(false); 
      })
      .catch(e => { 
        console.error(e);
        setData([]);
        setFiltered([]);
        setLoading(false); 
      });
  }, []);

  // ── Search Filter ──
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(data.filter(r =>
      (r.full_name || "").toLowerCase().includes(s) ||
      (r.department_name || "").toLowerCase().includes(s)
    ));
  }, [search, data]);

  const totalSalary = filtered.reduce((a, r) => a + Number(r.basic_salary || 0), 0);

  // ── Print / PDF Generator ──
  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";
    
    const rowsHtml = filtered.map((r, i) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td><strong>${r.full_name}</strong></td>
        <td>${r.department_name || "-"}</td>
        <td>${r.joining_date?.split("T")[0] || "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; font-weight: bold; color: #0369a1;">₨ ${fmt(r.basic_salary)}</td>
        <td>${r.rate_type || "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'};">${r.current_rate ? `₨ ${fmt(r.current_rate)}` : "-"}</td>
        <td style="text-align: center;">${t[r.status] || r.status || "Active"}</td>
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
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0369a1; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: bold; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; }
          .report-title { font-size: 18px; color: #64748b; margin-top: 5px; }
          .meta { text-align: ${isUrdu ? "left" : "right"}; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;}
          th { background: #0369a1; color: #fff; text-align: ${isUrdu ? "right" : "left"}; padding: 10px; font-weight: normal; border: 1px solid #0284c7; }
          td { border: 1px solid #e2e8f0; padding: 10px; color: #334155; }
          tr:nth-child(even) td { background: #f0f9ff; }
          .totals-row td { background: #e0f2fe !important; font-weight: bold; border-top: 2px solid #0369a1; font-size: 14px; color: #0f172a;}
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
            </div>
            <div class="meta">
              <div>${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>${t.employee}</th>
                <th>${t.department}</th>
                <th>${t.joiningDate}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.basicSalary}</th>
                <th>${t.rateType}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.currentRate}</th>
                <th style="text-align: center;">${t.status}</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? rowsHtml : `<tr><td colspan="8" style="text-align:center; padding: 20px;">${t.noRecords}</td></tr>`}
            </tbody>
            ${filtered.length > 0 ? `
              <tfoot class="totals-row">
                <tr>
                  <td colspan="4" style="text-align: ${isUrdu ? 'left' : 'right'}; text-transform: uppercase;">${t.totalPayroll}</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'}; color: #0369a1;">₨ ${fmt(totalSalary)}</td>
                  <td colspan="3"></td>
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-7xl mx-auto">
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

      <div className="max-w-7xl mx-auto">
        
        {/* ── Search & Actions ── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="relative w-full md:w-96">
            <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder}
              className={`w-full border border-slate-200 rounded-lg py-2.5 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
          </div>
          
          <div className={`flex flex-wrap items-center gap-4 w-full md:w-auto ${isUrdu ? "flex-row-reverse" : ""}`}>
            
            <div className="bg-sky-50 border border-sky-200 rounded-lg px-5 py-2 text-sm">
              <span className="text-sky-700 font-bold uppercase tracking-wider text-xs mr-2">{t.totalPayroll}:</span>
              <span className="font-mono font-bold text-lg text-sky-900">₨ {fmt(totalSalary)}</span>
            </div>

            <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
              <button onClick={() => generatePrintDocument(false)} disabled={filtered.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="bi bi-printer text-sky-600"></i> {t.printBtn}
              </button>
              <button onClick={() => generatePrintDocument(true)} disabled={filtered.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
              </button>
            </div>
            
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.employee}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.department}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.joiningDate}</th>
                  <th className="px-4 py-3 text-right">{t.basicSalary}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.rateType}</th>
                  <th className="px-4 py-3 text-right">{t.currentRate}</th>
                  <th className="px-4 py-3 text-center">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400"><i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">{t.loading}</p></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-sky-50 transition">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs text-center">{i + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        <div className={`flex items-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 flex-shrink-0">
                            <i className="bi bi-person"></i>
                          </div>
                          {r.full_name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{r.department_name || "-"}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.joining_date?.split("T")[0] || "-"}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">₨ {fmt(r.basic_salary)}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{r.rate_type || "-"}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sky-700 font-bold">{r.current_rate ? `₨ ${fmt(r.current_rate)}` : "-"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          (r.status || "active").toLowerCase() === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}>
                          {t[(r.status || "active").toLowerCase()] || r.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Footer Totals */}
              {!loading && filtered.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className={`px-4 py-4 text-xs uppercase tracking-wider ${isUrdu ? "text-left" : "text-right"}`}>{t.totalPayroll}</td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-700 text-base">₨ {fmt(totalSalary)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HRReportPage;