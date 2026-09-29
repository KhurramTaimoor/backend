import React, { useEffect, useMemo, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const LANG = {
  en: {
    title: "Stock Demand",
    subtitle: "Compare sale order demand with available stock",
    refresh: "Refresh",
    searchPlaceholder: "Search product, category, type, unit or order no...",
    all: "All",
    demandOnly: "Demand Only",
    availableOnly: "Available Only",
    product: "Product",
    category: "Category",
    type: "Product Type",
    unit: "Unit",
    saleOrders: "Sale Orders",
    orderedQty: "Ordered Qty",
    availableStock: "Available Stock",
    demandQty: "Demand Qty",
    status: "Status",
    inDemand: "Need Stock",
    available: "Available",
    totalProducts: "Total Products",
    totalOrdered: "Total Ordered",
    totalAvailable: "Total Available",
    totalDemand: "Total Demand",
    printBtn: "Print",
    pdfBtn: "Download PDF",
    noRecords: "No stock demand records found.",
    loading: "Loading stock demand...",
    fetchError: "Failed to load stock demand.",
    reportTitle: "Stock Demand Report",
    printedOn: "Printed On",
    companyName: "Ali Cages",
    requirementNote: "Demand = Sale Order Qty - Available Stock. Category and Product Type are included.",
  },
  ur: {
    title: "اسٹاک ڈیمانڈ",
    subtitle: "سیل آرڈر کی ڈیمانڈ کو موجودہ اسٹاک کے ساتھ compare کریں",
    refresh: "ریفرش",
    searchPlaceholder: "پروڈکٹ، کیٹیگری، ٹائپ، یونٹ یا آرڈر نمبر سے تلاش کریں...",
    all: "سب",
    demandOnly: "صرف ڈیمانڈ",
    availableOnly: "دستیاب",
    product: "پروڈکٹ",
    category: "کیٹیگری",
    type: "پروڈکٹ ٹائپ",
    unit: "یونٹ",
    saleOrders: "سیل آرڈرز",
    orderedQty: "آرڈر مقدار",
    availableStock: "موجودہ اسٹاک",
    demandQty: "ضرورت",
    status: "اسٹیٹس",
    inDemand: "اسٹاک چاہیے",
    available: "دستیاب",
    totalProducts: "کل پروڈکٹس",
    totalOrdered: "کل آرڈر",
    totalAvailable: "کل دستیاب",
    totalDemand: "کل ضرورت",
    printBtn: "پرنٹ",
    pdfBtn: "پی ڈی ایف",
    noRecords: "کوئی اسٹاک ڈیمانڈ ریکارڈ نہیں ملا۔",
    loading: "اسٹاک ڈیمانڈ لوڈ ہو رہی ہے...",
    fetchError: "اسٹاک ڈیمانڈ لوڈ نہیں ہو سکی۔",
    reportTitle: "اسٹاک ڈیمانڈ رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    companyName: "علی کیجز",
    requirementNote: "ڈیمانڈ = سیل آرڈر مقدار - موجودہ اسٹاک۔ کیٹیگری اور پروڈکٹ ٹائپ شامل ہیں۔",
  },
};

const toNumber = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const moneyLike = (value) =>
  toNumber(value).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });

const safeText = (value, fallback = "—") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeDemandRow = (raw, index) => {
  const orderedQty = toNumber(
    raw?.ordered_qty ??
      raw?.sale_order_qty ??
      raw?.required_qty ??
      raw?.demanded_qty ??
      raw?.total_order_qty
  );

  const availableStock = toNumber(
    raw?.available_stock ??
      raw?.available_qty ??
      raw?.current_stock ??
      raw?.stock_qty ??
      raw?.stock
  );

  const demandQty =
    raw?.demand_qty !== undefined || raw?.short_qty !== undefined || raw?.shortage_qty !== undefined
      ? toNumber(raw?.demand_qty ?? raw?.short_qty ?? raw?.shortage_qty)
      : Math.max(orderedQty - availableStock, 0);

  const saleOrders = Array.isArray(raw?.sale_orders)
    ? raw.sale_orders.join(", ")
    : raw?.sale_orders || raw?.sale_order_no || raw?.order_no || raw?.orders || "—";

  return {
    id: raw?.id ?? raw?.product_id ?? index,
    product_id: raw?.product_id ?? "",
    product_name: safeText(raw?.product_name ?? raw?.product ?? raw?.item_name),
    category_name: safeText(raw?.category_name ?? raw?.category),
    type_name: safeText(raw?.type_name ?? raw?.product_type ?? raw?.product_type_name),
    unit_name: safeText(raw?.unit_name ?? raw?.unit),
    sale_orders: saleOrders,
    ordered_qty: orderedQty,
    available_stock: availableStock,
    demand_qty: Math.max(demandQty, 0),
  };
};

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Request failed");
  }
  return res.json();
}

export default function StockDemandPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/stock-demand");
      setRows(getList(data).map(normalizeDemandRow));
    } catch (err) {
      setRows([]);
      showToast("error", err.message || t.fetchError);
    } finally {
      setLoading(false);
    }
  }, [showToast, t.fetchError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return rows.filter((r) => {
      const hasDemand = toNumber(r.demand_qty) > 0;

      if (statusFilter === "demand" && !hasDemand) return false;
      if (statusFilter === "available" && hasDemand) return false;

      if (!q) return true;

      return [
        r.product_name,
        r.category_name,
        r.type_name,
        r.unit_name,
        r.sale_orders,
        String(r.ordered_qty),
        String(r.available_stock),
        String(r.demand_qty),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(
    () => ({
      totalProducts: filtered.length,
      totalOrdered: filtered.reduce((sum, r) => sum + toNumber(r.ordered_qty), 0),
      totalAvailable: filtered.reduce((sum, r) => sum + toNumber(r.available_stock), 0),
      totalDemand: filtered.reduce((sum, r) => sum + toNumber(r.demand_qty), 0),
    }),
    [filtered]
  );

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', Arial, sans-serif";

    const rowsHtml = filtered
      .map(
        (r, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td><strong>${r.product_name}</strong></td>
          <td>${r.category_name}</td>
          <td>${r.type_name}</td>
          <td class="center">${r.unit_name}</td>
          <td>${r.sale_orders}</td>
          <td class="num">${moneyLike(r.ordered_qty)}</td>
          <td class="num">${moneyLike(r.available_stock)}</td>
          <td class="num ${r.demand_qty > 0 ? "danger" : "success"}">${moneyLike(r.demand_qty)}</td>
          <td class="center">${r.demand_qty > 0 ? t.inDemand : t.available}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${t.reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${font};background:#f8fafc;color:#0f172a;padding:20px}
  .sheet{max-width:1400px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08)}
  .header{background:#0f172a;color:white;padding:24px 28px;display:flex;align-items:center;justify-content:space-between}
  .brand h1{font-size:28px;font-weight:900}
  .brand p,.meta{font-size:12px;color:#cbd5e1;margin-top:5px}
  .content{padding:18px}
  .hint{background:#EFF6FF;color:#285DB8;border:1px solid #DBEAFE;border-radius:12px;padding:12px;margin-bottom:14px;font-weight:700;font-size:13px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px}
  .card small{font-size:11px;color:#64748b;font-weight:700}
  .card div{font-size:22px;font-weight:900;margin-top:5px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#0f172a;color:white;padding:11px 10px;text-align:${isUrdu ? "right" : "left"};white-space:nowrap;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
  td{border-bottom:1px solid #eef2f7;padding:10px;color:#334155;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .center{text-align:center!important}.num{text-align:right!important;font-family:monospace;font-weight:900;color:#0f172a}
  .danger{color:#dc2626!important}.success{color:#059669!important}
  @media print{body{padding:0;background:white}.sheet{box-shadow:none;border-radius:0;border:0}.hint{display:none}@page{size:A4 landscape;margin:8mm}}
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>${t.companyName}</h1>
        <p>${t.reportTitle}</p>
      </div>
      <div class="meta">${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
    </div>
    <div class="content">
      ${isPdf ? `<div class="hint">Choose <strong>Save as PDF</strong> in print dialog.</div>` : ""}
      <div class="cards">
        <div class="card"><small>${t.totalProducts}</small><div>${summary.totalProducts}</div></div>
        <div class="card"><small>${t.totalOrdered}</small><div>${moneyLike(summary.totalOrdered)}</div></div>
        <div class="card"><small>${t.totalAvailable}</small><div>${moneyLike(summary.totalAvailable)}</div></div>
        <div class="card"><small>${t.totalDemand}</small><div>${moneyLike(summary.totalDemand)}</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>${t.product}</th>
            <th>${t.category}</th>
            <th>${t.type}</th>
            <th>${t.unit}</th>
            <th>${t.saleOrders}</th>
            <th>${t.orderedQty}</th>
            <th>${t.availableStock}</th>
            <th>${t.demandQty}</th>
            <th>${t.status}</th>
          </tr>
        </thead>
        <tbody>${filtered.length ? rowsHtml : `<tr><td colspan="10" class="center" style="padding:30px">${t.noRecords}</td></tr>`}</tbody>
      </table>
    </div>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1500,height=900");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div
      dir={dir}
      style={{
        fontFamily: isUrdu
          ? "'Noto Nastaliq Urdu', serif"
          : "Helvetica, 'Helvetica Neue', Arial, sans-serif",
      }}
      className="min-h-screen bg-slate-50 p-0 pb-16"
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {message.text && (
        <div
          className={`fixed bottom-6 ${
            isUrdu ? "left-6" : "right-6"
          } z-50 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-slate-200 shadow-sm px-5 sm:px-6 py-5 mb-5 rounded-b-3xl">
          <div
            className={`flex items-center justify-between flex-wrap gap-4 ${
              isUrdu ? "flex-row-reverse" : ""
            }`}
          >
            <div className={isUrdu ? "text-right" : ""}>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div className={`flex gap-2 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
              <button
                onClick={() => setLang((prev) => (prev === "en" ? "ur" : "en"))}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-translate"></i>
                {lang === "en" ? "اردو" : "English"}
              </button>

              <button
                onClick={loadData}
                disabled={loading}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-60"
              >
                <i className={`bi ${loading ? "bi-arrow-repeat animate-spin" : "bi-arrow-clockwise"}`}></i>
                {t.refresh}
              </button>

              <button
                onClick={() => generatePrintDocument(false)}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-printer"></i>
                {t.printBtn}
              </button>

              <button
                onClick={() => generatePrintDocument(true)}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-file-earmark-pdf-fill text-rose-500"></i>
                {t.pdfBtn}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-200">
            {[
              { label: t.totalProducts, value: summary.totalProducts, icon: "bi-box-seam", color: "text-indigo-600" },
              { label: t.totalOrdered, value: moneyLike(summary.totalOrdered), icon: "bi-cart-check-fill", color: "text-blue-600" },
              { label: t.totalAvailable, value: moneyLike(summary.totalAvailable), icon: "bi-boxes", color: "text-emerald-600" },
              { label: t.totalDemand, value: moneyLike(summary.totalDemand), icon: "bi-exclamation-triangle-fill", color: "text-rose-600" },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className={`w-10 h-10 rounded-xl bg-white ${card.color} flex items-center justify-center shadow-sm mb-3`}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className="text-2xl font-extrabold text-slate-950">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
            <i className="bi bi-info-circle-fill me-2"></i>
            {t.requirementNote}
          </div>
        </div>

        {/* Search and filters */}
        <div className={`flex flex-wrap items-center gap-3 mb-4 ${isUrdu ? "flex-row-reverse" : ""}`}>
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <i
              className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                isUrdu ? "right-3" : "left-3"
              }`}
            ></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full h-10 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 shadow-sm ${
                isUrdu ? "pr-10 pl-3 text-right" : "pl-10 pr-3"
              }`}
            />
          </div>

          <div className={`flex gap-2 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
            {[
              { key: "all", label: t.all },
              { key: "demand", label: t.demandOnly },
              { key: "available", label: t.availableOnly },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`h-10 px-4 rounded-xl text-sm font-semibold border transition shadow-sm ${
                  statusFilter === item.key
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-950 text-white text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.product}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.category}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.type}</th>
                  <th className="px-4 py-3 text-center">{t.unit}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.saleOrders}</th>
                  <th className="px-4 py-3 text-right">{t.orderedQty}</th>
                  <th className="px-4 py-3 text-right">{t.availableStock}</th>
                  <th className="px-4 py-3 text-right">{t.demandQty}</th>
                  <th className="px-4 py-3 text-center">{t.status}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                      <p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const hasDemand = toNumber(r.demand_qty) > 0;
                    return (
                      <tr key={`${r.id}-${i}`} className="hover:bg-slate-50 transition align-middle">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>

                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <i className="bi bi-box-seam text-indigo-600"></i>
                            </div>
                            <span className="font-bold text-slate-950">{r.product_name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {r.category_name}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                            {r.type_name}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.unit_name}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-700 max-w-[220px]">
                          {r.sale_orders}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-950">
                          {moneyLike(r.ordered_qty)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {moneyLike(r.available_stock)}
                        </td>

                        <td className={`px-4 py-3 text-right font-mono font-extrabold ${hasDemand ? "text-rose-600" : "text-slate-400"}`}>
                          {moneyLike(r.demand_qty)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black border ${
                              hasDemand
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {hasDemand ? t.inDemand : t.available}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
