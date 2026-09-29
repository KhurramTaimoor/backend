import React, { useState, useEffect } from "react";
import axios from "axios";
import { oneMonthRange } from "../utils/dateDefaults";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS (Strictly English & Proper Urdu)
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Cash Book Report",
    subtitle: "View daily cash inflows, outflows, and running balances",
    fromDate: "From Date",
    toDate: "To Date",
    filterBtn: "Show Report",
    date: "Date",
    description: "Description",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    balance: "Balance",
    totals: "Totals",
    noRecords: "No cash records found for the selected dates.",
    toggleLang: "اردو",
    printBtn: "Print Report",
    pdfBtn: "Download PDF",
    reportHeader: "Cash Book Report",
    printedOn: "Printed On",
  },
  ur: {
    title: "کیش بک رپورٹ",
    subtitle: "روزانہ کی نقد آمدن، اخراجات اور رننگ بیلنس دیکھیں",
    fromDate: "شروع کی تاریخ",
    toDate: "ختم کی تاریخ",
    filterBtn: "رپورٹ دیکھیں",
    date: "تاریخ",
    description: "تفصیل",
    cashIn: "کیش ان",
    cashOut: "کیش آؤٹ",
    balance: "بیلنس",
    totals: "کل",
    noRecords: "منتخب تاریخوں کے لیے کیش کا کوئی ریکارڈ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "رپورٹ پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "کیش بک کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const CashBookReportPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const fmt = (n) => parseFloat(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 });

  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(() => oneMonthRange());
  const [searched, setSearched] = useState(false);

  // ── Fetch Data ──
  useEffect(() => { 
    fetchReport(); 
  }, []);

  const fetchReport = async () => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append("from_date", filters.from_date);
    if (filters.to_date) params.append("to_date", filters.to_date);
    
    try {
      const r = await axios.get(`${API_BASE}/cash-book-report?${params.toString()}`);
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch (error) {
      console.error("Cash book report load failed:", error);
      setRecords([]);
    }
    setSearched(true);
  };

  const totalIn = records.reduce((s, r) => s + parseFloat(r.cash_in || 0), 0);
  const totalOut = records.reduce((s, r) => s + parseFloat(r.cash_out || 0), 0);

  // ── Print / PDF Generator ──
  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";
    
    const rowsHtml = records.map((r, i) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td style="white-space: nowrap;">${r.entry_date || "-"}</td>
        <td><strong>${r.description}</strong></td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #047857;">${parseFloat(r.cash_in) > 0 ? fmt(r.cash_in) : "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; color: #b91c1c;">${parseFloat(r.cash_out) > 0 ? fmt(r.cash_out) : "-"}</td>
        <td style="text-align:${isUrdu ? 'left' : 'right'}; font-weight: bold; background: #f8fafc;">${fmt(r.balance)}</td>
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
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
          .report-title { font-size: 18px; color: #64748b; margin-top: 5px; }
          .meta { text-align: ${isUrdu ? "left" : "right"}; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;}
          th { background: #059669; color: #fff; text-align: ${isUrdu ? "right" : "left"}; padding: 12px; font-weight: normal; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px; color: #334155; }
          tr:nth-child(even) td { background: #ecfdf5; }
          .totals-row td { background: #d1fae5 !important; font-weight: bold; border-top: 2px solid #059669; font-size: 14px; color: #0f172a;}
          .print-instruct { background: #d1fae5; color: #059669; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border: 1px solid #a7f3d0; }
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
              ${filters.from_date || filters.to_date ? `<div style="margin-top:5px;">Period: ${filters.from_date || 'Start'} to ${filters.to_date || 'End'}</div>` : ""}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>${t.date}</th>
                <th>${t.description}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.cashIn}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.cashOut}</th>
                <th style="text-align:${isUrdu ? 'left' : 'right'};">${t.balance}</th>
              </tr>
            </thead>
            <tbody>
              ${records.length > 0 ? rowsHtml : `<tr><td colspan="6" style="text-align:center; padding: 20px;">${t.noRecords}</td></tr>`}
            </tbody>
            ${records.length > 0 ? `
              <tfoot class="totals-row">
                <tr>
                  <td colspan="3" style="text-align: ${isUrdu ? 'left' : 'right'}; text-transform: uppercase;">${t.totals}</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'}; color: #047857;">₨ ${fmt(totalIn)}</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'}; color: #b91c1c;">₨ ${fmt(totalOut)}</td>
                  <td style="text-align: ${isUrdu ? 'left' : 'right'};">₨ ${fmt(totalIn - totalOut)}</td>
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
        
        {/* ── Filter Panel ── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.fromDate}</label>
              <div className="relative">
                <i className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                  className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.toDate}</label>
              <div className="relative">
                <i className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                  className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex items-end ${isUrdu ? "justify-start" : "justify-end"}`}>
              <button onClick={fetchReport} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-8 py-2.5 rounded-lg shadow flex items-center justify-center gap-2 font-semibold text-sm transition">
                <i className="bi bi-search"></i> {t.filterBtn}
              </button>
            </div>

          </div>
        </div>

        {searched && (
          <>
            {/* ── Table & Actions Header ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <i className="bi bi-journal-check text-slate-400"></i>
                  {t.reportHeader}
                </h3>
                
                <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                  <button onClick={() => generatePrintDocument(false)} disabled={records.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="bi bi-printer text-emerald-600"></i> {t.printBtn}
                  </button>
                  <button onClick={() => generatePrintDocument(true)} disabled={records.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-600 border-collapse">
                  <thead className="bg-emerald-50 text-emerald-800 uppercase text-xs font-bold border-b border-emerald-100">
                    <tr>
                      <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>#</th>
                      <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.date}</th>
                      <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.description}</th>
                      <th className="px-5 py-3 text-right">{t.cashIn}</th>
                      <th className="px-5 py-3 text-right">{t.cashOut}</th>
                      <th className="px-5 py-3 text-right bg-emerald-100/50">{t.balance}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td></tr>
                    ) : (
                      records.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-xs">{r.entry_date || "-"}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            <div className={`flex items-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                              {parseFloat(r.cash_in) > 0 && <i className="bi bi-arrow-up-circle-fill text-emerald-500 text-xs opacity-70"></i>}
                              {parseFloat(r.cash_out) > 0 && <i className="bi bi-arrow-down-circle-fill text-red-500 text-xs opacity-70"></i>}
                              {r.description}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{parseFloat(r.cash_in) > 0 ? `₨ ${fmt(r.cash_in)}` : "-"}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-red-500">{parseFloat(r.cash_out) > 0 ? `₨ ${fmt(r.cash_out)}` : "-"}</td>
                          <td className="px-5 py-3.5 text-right font-bold font-mono bg-slate-50/50 text-slate-800">
                            ₨ {fmt(r.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {records.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className={`px-5 py-4 uppercase text-xs tracking-wider ${isUrdu ? "text-left" : "text-right"}`}>{t.totals}</td>
                        <td className="px-5 py-4 text-right font-mono text-emerald-700 text-sm">₨ {fmt(totalIn)}</td>
                        <td className="px-5 py-4 text-right font-mono text-red-700 text-sm">₨ {fmt(totalOut)}</td>
                        <td className="px-5 py-4 text-right font-mono text-lg text-slate-900">₨ {fmt(totalIn - totalOut)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CashBookReportPage;