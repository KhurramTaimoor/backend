import React, { useMemo, useState } from "react";
import axios from "axios";
import { oneMonthRange } from "../utils/dateDefaults";

const LANG = {
  en: {
    title: "General Ledger",
    subtitle:
      "View opening balance, sales invoices and sales returns for all customers",
    fromDate: "From Date",
    toDate: "To Date",
    filterBtn: "Show Ledger",
    date: "Date",
    customer: "Customer",
    voucherType: "Voucher Type",
    description: "Description",
    ref: "Ref",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    closingBalance: "Closing Balance",
    openingBalance: "Opening Balance",
    totalSales: "Total Sales",
    totalReturns: "Total Returns",
    noRecords: "Select dates and click show ledger.",
    loading: "Loading ledger...",
    toggleLang: "اردو",
    printBtn: "Print Ledger",
    pdfBtn: "Download PDF",
    reportHeader: "General Ledger Report",
    printedOn: "Printed On",
    fetchError: "Failed to load ledger data from server.",
  },
  ur: {
    title: "جنرل لیجر",
    subtitle:
      "تمام کسٹمرز کے اوپننگ بیلنس، سیلز انوائس اور سیل ریٹرن دیکھیں",
    fromDate: "شروع کی تاریخ",
    toDate: "ختم کی تاریخ",
    filterBtn: "لیجر دیکھیں",
    date: "تاریخ",
    customer: "کسٹمر",
    voucherType: "ووچر ٹائپ",
    description: "تفصیل",
    ref: "حوالہ",
    debit: "ڈیبٹ",
    credit: "کریڈٹ",
    balance: "بیلنس",
    closingBalance: "اختتامی بیلنس",
    openingBalance: "اوپننگ بیلنس",
    totalSales: "کل فروخت",
    totalReturns: "کل ریٹرن",
    noRecords: "تاریخ منتخب کریں اور لیجر دیکھیں پر کلک کریں۔",
    loading: "لیجر لوڈ ہو رہا ہے...",
    toggleLang: "English",
    printBtn: "لیجر پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "جنرل لیجر رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    fetchError: "سرور سے لیجر ڈیٹا لوڈ نہیں ہو سکا۔",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const GeneralLedgerPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const fmt = (n) =>
    parseFloat(n || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(() => oneMonthRange());
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const fetchLedger = async () => {
    setLoading(true);
    setHasSearched(true);
    setError("");

    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await axios.get(`${API_BASE}/ledger`, { params });

      const rows = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setRecords(rows);
    } catch (err) {
      console.error("Ledger fetch error:", err);
      setRecords([]);
      setError(t.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const ledgerData = useMemo(() => {
    let runningBalance = 0;

    return (Array.isArray(records) ? records : []).map((row, index) => {
      const debit = parseFloat(row?.debit || 0) || 0;
      const credit = parseFloat(row?.credit || 0) || 0;

      // Agar backend already balance bhej raha ho to use kar lo,
      // warna frontend khud running balance bana lega
      if (row?.balance !== undefined && row?.balance !== null) {
        runningBalance = parseFloat(row.balance || 0) || 0;
      } else {
        runningBalance = runningBalance + debit - credit;
      }

      return {
        id: row?.id || index,
        date: row?.date || row?.invoice_date || row?.return_date || "",
        customer_name: row?.customer_name || row?.customer || "—",
        voucher_type: row?.voucher_type || "-",
        desc: row?.desc || row?.description || "-",
        ref: row?.ref || row?.invoice_no || row?.return_no || "-",
        debit,
        credit,
        balance: runningBalance,
      };
    });
  }, [records]);

  const totalDebit = ledgerData.reduce(
    (sum, row) => sum + (parseFloat(row.debit || 0) || 0),
    0
  );

  const totalCredit = ledgerData.reduce(
    (sum, row) => sum + (parseFloat(row.credit || 0) || 0),
    0
  );

  const closingBalance = totalDebit - totalCredit;

  const openingBalanceAmount = ledgerData
    .filter(
      (r) => String(r.voucher_type || "").toLowerCase() === "opening balance"
    )
    .reduce(
      (sum, r) =>
        sum +
        (parseFloat(r.debit || 0) || 0) -
        (parseFloat(r.credit || 0) || 0),
      0
    );

  const totalSales = ledgerData
    .filter((r) => String(r.voucher_type || "").toLowerCase() === "sale invoice")
    .reduce((sum, r) => sum + (parseFloat(r.debit || 0) || 0), 0);

  const totalReturns = ledgerData
    .filter((r) => String(r.voucher_type || "").toLowerCase() === "sale return")
    .reduce((sum, r) => sum + (parseFloat(r.credit || 0) || 0), 0);

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";

    const rowsHtml = ledgerData
      .map(
        (r, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="white-space: nowrap;">${r.date || "-"}</td>
        <td>${r.customer_name || "-"}</td>
        <td>${r.voucher_type || "-"}</td>
        <td><strong>${r.desc || "-"}</strong></td>
        <td style="font-family: monospace; font-size: 11px;">${r.ref || "-"}</td>
        <td style="text-align:${isUrdu ? "left" : "right"}; color:#047857;">
          ${parseFloat(r.debit) > 0 ? fmt(r.debit) : "-"}
        </td>
        <td style="text-align:${isUrdu ? "left" : "right"}; color:#b91c1c;">
          ${parseFloat(r.credit) > 0 ? fmt(r.credit) : "-"}
        </td>
        <td style="text-align:${isUrdu ? "left" : "right"}; font-weight:bold; background:#f8fafc;">
          ${fmt(r.balance)}
        </td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="UTF-8"/>
        <title>${t.title}</title>
        ${
          isUrdu
            ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">`
            : ""
        }
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:${font}; background:#fff; color:#0f172a; padding:40px; }
          .report-container { max-width:1200px; margin:0 auto; }
          .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e293b; padding-bottom:20px; margin-bottom:30px; }
          .brand { font-size:28px; font-weight:bold; color:#1e293b; text-transform:uppercase; }
          .report-title { font-size:18px; color:#64748b; margin-top:5px; }
          .meta { text-align:${isUrdu ? "left" : "right"}; font-size:12px; color:#64748b; }
          table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px; }
          th { background:#1e293b; color:#fff; text-align:${isUrdu ? "right" : "left"}; padding:12px; font-weight:normal; }
          td { border-bottom:1px solid #e2e8f0; padding:10px; color:#334155; }
          tr:nth-child(even) td { background:#f8fafc; }
          .totals-row td { background:#e2e8f0 !important; font-weight:bold; border-top:2px solid #64748b; font-size:14px; color:#0f172a; }
          .print-instruct { background:#f1f5f9; color:#334155; padding:15px; text-align:center; border-radius:8px; margin-bottom:20px; font-size:14px; border:1px solid #cbd5e1; }
          .summary { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:20px; }
          .card { border:1px solid #e2e8f0; border-radius:12px; padding:14px; background:#f8fafc; }
          .label { font-size:12px; color:#64748b; margin-bottom:6px; }
          .value { font-size:18px; font-weight:bold; color:#0f172a; }
          @media print { body { padding:0; } .print-instruct { display:none; } }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${
            isPdf
              ? `<div class="print-instruct">Please select <strong>"Save as PDF"</strong> in the destination dropdown to download this report.</div>`
              : ""
          }

          <div class="header">
            <div>
              <div class="brand">Unique Wear</div>
              <div class="report-title">${t.reportHeader}</div>
            </div>
            <div class="meta">
              <div>${t.printedOn}: ${new Date().toLocaleString(
                isUrdu ? "ur-PK" : "en-PK"
              )}</div>
              ${
                filters.from_date || filters.to_date
                  ? `<div style="margin-top:5px;">Period: ${
                      filters.from_date || "Start"
                    } to ${filters.to_date || "End"}</div>`
                  : ""
              }
            </div>
          </div>

          <div class="summary">
            <div class="card">
              <div class="label">${t.openingBalance}</div>
              <div class="value">₨ ${fmt(openingBalanceAmount)}</div>
            </div>
            <div class="card">
              <div class="label">${t.totalSales}</div>
              <div class="value">₨ ${fmt(totalSales)}</div>
            </div>
            <div class="card">
              <div class="label">${t.totalReturns}</div>
              <div class="value">₨ ${fmt(totalReturns)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th>${t.date}</th>
                <th>${t.customer}</th>
                <th>${t.voucherType}</th>
                <th>${t.description}</th>
                <th>${t.ref}</th>
                <th style="text-align:${isUrdu ? "left" : "right"};">${t.debit}</th>
                <th style="text-align:${isUrdu ? "left" : "right"};">${t.credit}</th>
                <th style="text-align:${isUrdu ? "left" : "right"};">${t.balance}</th>
              </tr>
            </thead>
            <tbody>
              ${
                ledgerData.length > 0
                  ? rowsHtml
                  : `<tr><td colspan="9" style="text-align:center; padding:20px;">${t.noRecords}</td></tr>`
              }
            </tbody>
            ${
              ledgerData.length > 0
                ? `
                <tfoot class="totals-row">
                  <tr>
                    <td colspan="6" style="text-align:${isUrdu ? "left" : "right"}; text-transform:uppercase;">
                      ${t.closingBalance}
                    </td>
                    <td style="text-align:${isUrdu ? "left" : "right"}; color:#047857;">₨ ${fmt(totalDebit)}</td>
                    <td style="text-align:${isUrdu ? "left" : "right"}; color:#b91c1c;">₨ ${fmt(totalCredit)}</td>
                    <td style="text-align:${isUrdu ? "left" : "right"};">₨ ${fmt(closingBalance)}</td>
                  </tr>
                </tfoot>
              `
                : ""
            }
          </table>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              ${!isPdf ? "window.onafterprint = () => window.close();" : ""}
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div
      dir={dir}
      style={{
        fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif",
      }}
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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
          >
            <i className="bi bi-translate"></i>
            {t.toggleLang}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {t.fromDate}
              </label>
              <div className="relative">
                <i
                  className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isUrdu ? "right-3" : "left-3"
                  }`}
                ></i>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) =>
                    setFilters({ ...filters, from_date: e.target.value })
                  }
                  className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-slate-500 ${
                    isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {t.toDate}
              </label>
              <div className="relative">
                <i
                  className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isUrdu ? "right-3" : "left-3"
                  }`}
                ></i>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) =>
                    setFilters({ ...filters, to_date: e.target.value })
                  }
                  className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-slate-500 ${
                    isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                  }`}
                />
              </div>
            </div>
          </div>

          <div
            className={`mt-5 flex items-center justify-between flex-wrap gap-4 ${
              isUrdu ? "flex-row-reverse" : ""
            }`}
          >
            <button
              onClick={fetchLedger}
              className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg shadow flex items-center justify-center gap-2 font-semibold text-sm transition"
            >
              <i className="bi bi-search"></i> {t.filterBtn}
            </button>

            <div
              className={`flex gap-2 w-full md:w-auto ${
                isUrdu ? "flex-row-reverse" : ""
              }`}
            >
              <button
                onClick={() => generatePrintDocument(false)}
                disabled={ledgerData.length === 0}
                className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="bi bi-printer text-blue-600"></i> {t.printBtn}
              </button>

              <button
                onClick={() => generatePrintDocument(true)}
                disabled={ledgerData.length === 0}
                className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="bi bi-file-earmark-pdf text-red-600"></i> {t.pdfBtn}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {hasSearched && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">{t.openingBalance}</div>
              <div className="text-xl font-bold text-slate-800">
                ₨ {fmt(openingBalanceAmount)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">{t.totalSales}</div>
              <div className="text-xl font-bold text-emerald-700">
                ₨ {fmt(totalSales)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">{t.totalReturns}</div>
              <div className="text-xl font-bold text-red-600">
                ₨ {fmt(totalReturns)}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[300px]">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <i className="bi bi-journal-text text-3xl opacity-50"></i>
              </div>
              <p className="font-medium text-slate-500">{t.noRecords}</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <i className="bi bi-arrow-repeat animate-spin text-3xl mb-3 text-slate-500"></i>
              <p>{t.loading}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      #
                    </th>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      {t.date}
                    </th>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      {t.customer}
                    </th>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      {t.voucherType}
                    </th>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      {t.description}
                    </th>
                    <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                      {t.ref}
                    </th>
                    <th className="px-5 py-3 text-right text-emerald-600">
                      {t.debit}
                    </th>
                    <th className="px-5 py-3 text-right text-red-500">
                      {t.credit}
                    </th>
                    <th className="px-5 py-3 text-right bg-slate-200/50">
                      {t.balance}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ledgerData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-400">
                        {t.noRecords}
                      </td>
                    </tr>
                  ) : (
                    ledgerData.map((row, i) => (
                      <tr
                        key={row.id || i}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                          {i + 1}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                          {row.date || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                          {row.customer_name || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                          {row.voucher_type || "-"}
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {row.desc || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                          {row.ref || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono text-emerald-600">
                          {parseFloat(row.debit) > 0 ? fmt(row.debit) : "-"}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono text-red-500">
                          {parseFloat(row.credit) > 0 ? fmt(row.credit) : "-"}
                        </td>

                        <td
                          className={`px-5 py-3.5 text-right font-bold font-mono bg-slate-50/50 ${
                            row.balance < 0 ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {fmt(row.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {ledgerData.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                    <tr>
                      <td
                        colSpan={6}
                        className={`px-5 py-4 uppercase text-xs tracking-wider ${
                          isUrdu ? "text-left" : "text-right"
                        }`}
                      >
                        {t.closingBalance}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-emerald-700 text-sm">
                        ₨ {fmt(totalDebit)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-red-700 text-sm">
                        ₨ {fmt(totalCredit)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono text-lg ${
                          closingBalance < 0 ? "text-red-700" : "text-slate-900"
                        }`}
                      >
                        ₨ {fmt(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralLedgerPage;