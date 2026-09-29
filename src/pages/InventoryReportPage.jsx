import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { oneMonthRange } from "../utils/dateDefaults";

const API = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;
const initialDates = oneMonthRange();

const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString("en-PK", { maximumFractionDigits: 3 });
const listFrom = (payload) => Array.isArray(payload) ? payload : payload?.data || payload?.rows || [];

export default function InventoryReportPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const ur = lang === "ur";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ ...initialDates, search: "", type: "", category: "" });

  const t = ur ? {
    title: "انوینٹری رپورٹ", sub: "منتخب تاریخوں میں تمام اسٹاک موومنٹس اور موجودہ مقدار",
    from: "از تاریخ", to: "تا تاریخ", type: "قسم", category: "کیٹیگری", allTypes: "تمام اقسام", allCats: "تمام کیٹیگریز",
    search: "پروڈکٹ تلاش کریں...", refresh: "رپورٹ لوڈ کریں", print: "پرنٹ / PDF", product: "پروڈکٹ", unit: "یونٹ",
    opening: "ابتدائی مقدار", received: "موصول", issued: "جاری", balance: "بقیہ", details: "تفصیل",
    totalProducts: "کل پروڈکٹس", totalOpening: "کل ابتدائی", totalIn: "کل موصول", totalOut: "کل جاری", totalBalance: "کل بقیہ",
    no: "کوئی ریکارڈ نہیں ملا۔", loading: "لوڈ ہو رہا ہے...", reset: "ری سیٹ"
  } : {
    title: "Inventory Report", sub: "Live stock quantities for the selected period across all inventory movements",
    from: "From Date", to: "To Date", type: "Product Type", category: "Category", allTypes: "All Types", allCats: "All Categories",
    search: "Search product...", refresh: "Load Report", print: "Print / PDF", product: "Product", unit: "Unit",
    opening: "Opening Qty", received: "Received", issued: "Issued", balance: "Balance", details: "Details",
    totalProducts: "Products", totalOpening: "Opening Qty", totalIn: "Received", totalOut: "Issued", totalBalance: "Balance Qty",
    no: "No inventory records found.", loading: "Loading report...", reset: "Reset"
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await axios.get(`${API}/inventory-report`, { params: { from_date: filters.from_date, to_date: filters.to_date } });
      setRows(listFrom(res.data));
    } catch (e) {
      setRows([]); setError(e?.response?.data?.message || e.message || "Failed to load inventory report.");
    } finally { setLoading(false); }
  }, [filters.from_date, filters.to_date]);

  useEffect(() => { load(); }, [load]);

  const types = useMemo(() => [...new Set(rows.map(r => r.type_name).filter(x => x && x !== "—"))].sort(), [rows]);
  const categories = useMemo(() => [...new Set(rows.map(r => r.category_name).filter(x => x && x !== "—"))].sort(), [rows]);
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter(r => {
      if (filters.type && r.type_name !== filters.type) return false;
      if (filters.category && r.category_name !== filters.category) return false;
      if (q && ![r.product_name, r.type_name, r.category_name, r.unit_name].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filters.search, filters.type, filters.category]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    opening: a.opening + n(r.opening_qty), received: a.received + n(r.received_qty), issued: a.issued + n(r.issued_qty), balance: a.balance + n(r.balance_qty)
  }), { opening: 0, received: 0, issued: 0, balance: 0 }), [filtered]);

  const printReport = () => {
    const body = filtered.map((r, i) => `<tr><td>${i + 1}</td><td><b>${r.product_name || "—"}</b></td><td>${r.type_name || "—"}</td><td>${r.category_name || "—"}</td><td>${r.unit_name || "—"}</td><td class="num">${fmt(r.opening_qty)}</td><td class="num">${fmt(r.received_qty)}</td><td class="num">${fmt(r.issued_qty)}</td><td class="num"><b>${fmt(r.balance_qty)}</b></td><td>${r.last_movement_date || "—"}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html lang="${ur ? "ur" : "en"}" dir="${ur ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>Inventory Report</title><style>body{font-family:${ur ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};line-height:${ur ? "1.9" : "1.45"};padding:24px;color:#0f172a}h1{margin:0}.meta{margin:8px 0 20px;color:#64748b}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#0f172a;color:#fff;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #ddd}.num{text-align:right}tfoot td{font-weight:700;background:#f1f5f9}@page{size:A4 landscape;margin:10mm}</style></head><body><h1>Inventory Report</h1><div class="meta">${filters.from_date || "Beginning"} to ${filters.to_date || "Today"} · Printed ${new Date().toLocaleString()}</div><table><thead><tr><th>#</th><th>Product</th><th>Type</th><th>Category</th><th>Unit</th><th>Opening</th><th>Received</th><th>Issued</th><th>Balance</th><th>Last Movement</th></tr></thead><tbody>${body || `<tr><td colspan="10">No records</td></tr>`}</tbody><tfoot><tr><td colspan="5">TOTALS</td><td class="num">${fmt(totals.opening)}</td><td class="num">${fmt(totals.received)}</td><td class="num">${fmt(totals.issued)}</td><td class="num">${fmt(totals.balance)}</td><td></td></tr></tfoot></table><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
    w.document.close();
  };

  const reset = () => setFilters({ ...oneMonthRange(), search: "", type: "", category: "" });
  const inputCls = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return <div dir={ur ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-7">
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold text-slate-900">{t.title}</h1><p className="mt-1 text-sm text-slate-500">{t.sub}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => setLang(ur ? "en" : "ur")} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{ur ? "English" : "اردو"}</button><button onClick={printReport} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{t.print}</button></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-bold text-slate-600">{t.from}<input type="date" value={filters.from_date} onChange={e => setFilters(f => ({...f, from_date:e.target.value}))} className={`${inputCls} mt-1 font-normal`} /></label>
          <label className="text-xs font-bold text-slate-600">{t.to}<input type="date" value={filters.to_date} onChange={e => setFilters(f => ({...f, to_date:e.target.value}))} className={`${inputCls} mt-1 font-normal`} /></label>
          <label className="text-xs font-bold text-slate-600">{t.type}<select value={filters.type} onChange={e => setFilters(f => ({...f, type:e.target.value}))} className={`${inputCls} mt-1 font-normal`}><option value="">{t.allTypes}</option>{types.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">{t.category}<select value={filters.category} onChange={e => setFilters(f => ({...f, category:e.target.value}))} className={`${inputCls} mt-1 font-normal`}><option value="">{t.allCats}</option>{categories.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600 lg:col-span-2">{t.product}<div className="mt-1 flex gap-2"><input value={filters.search} onChange={e => setFilters(f => ({...f, search:e.target.value}))} placeholder={t.search} className={inputCls}/><button onClick={load} className="shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">{t.refresh}</button><button onClick={reset} className="shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600">{t.reset}</button></div></label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[[t.totalProducts, filtered.length],[t.totalOpening, fmt(totals.opening)],[t.totalIn, fmt(totals.received)],[t.totalOut, fmt(totals.issued)],[t.totalBalance, fmt(totals.balance)]].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 text-xl font-extrabold text-slate-900">{value}</div></div>)}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="min-w-[940px] w-full text-sm"><thead className="bg-slate-950 text-white"><tr>{["#",t.product,t.type,t.category,t.unit,t.opening,t.received,t.issued,t.balance,t.details].map(h => <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-[11px] uppercase tracking-wide">{h}</th>)}</tr></thead><tbody>
          {loading ? <tr><td colSpan="10" className="p-10 text-center text-slate-500">{t.loading}</td></tr> : filtered.length === 0 ? <tr><td colSpan="10" className="p-10 text-center text-slate-500">{t.no}</td></tr> : filtered.map((r,i) => <tr key={`${r.product_id || r.product_name}-${i}`} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3">{i+1}</td><td className="px-3 py-3 font-bold text-slate-900">{r.product_name}</td><td className="px-3 py-3">{r.type_name || "—"}</td><td className="px-3 py-3">{r.category_name || "—"}</td><td className="px-3 py-3">{r.unit_name || "—"}</td><td className="px-3 py-3 text-right font-mono">{fmt(r.opening_qty)}</td><td className="px-3 py-3 text-right font-mono text-emerald-700">{fmt(r.received_qty)}</td><td className="px-3 py-3 text-right font-mono text-rose-700">{fmt(r.issued_qty)}</td><td className={`px-3 py-3 text-right font-mono font-extrabold ${n(r.balance_qty)<0 ? "text-rose-700":"text-indigo-700"}`}>{fmt(r.balance_qty)}</td><td className="px-3 py-3 text-center"><button type="button" disabled={!r.product_id} onClick={() => navigate(`/app/inventory/product-ledger?product_id=${encodeURIComponent(r.product_id || "")}&from_date=${encodeURIComponent(filters.from_date || "")}&to_date=${encodeURIComponent(filters.to_date || "")}`)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40">{t.details}</button></td></tr>)}
        </tbody>{!loading && filtered.length > 0 && <tfoot className="bg-slate-100 font-bold"><tr><td colSpan="5" className="px-3 py-3 text-right">TOTAL</td><td className="px-3 py-3 text-right">{fmt(totals.opening)}</td><td className="px-3 py-3 text-right text-emerald-700">{fmt(totals.received)}</td><td className="px-3 py-3 text-right text-rose-700">{fmt(totals.issued)}</td><td className="px-3 py-3 text-right text-indigo-700">{fmt(totals.balance)}</td><td></td></tr></tfoot>}</table></div>
      </div>
    </div>
  </div>;
}
