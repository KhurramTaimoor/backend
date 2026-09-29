import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { oneMonthRange } from "../utils/dateDefaults";

const API = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;
const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString("en-PK", { maximumFractionDigits: 3 });
const arr = (x) => Array.isArray(x) ? x : x?.data || x?.products || x?.rows || [];

export default function ProductLedgerPage() {
  const [searchParams] = useSearchParams();
  const defaults = oneMonthRange();
  const initialProductId = searchParams.get("product_id") || "";
  const initialFrom = searchParams.get("from_date") || defaults.from_date;
  const initialTo = searchParams.get("to_date") || defaults.to_date;
  const [lang, setLang] = useState("en");
  const ur = lang === "ur";
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState(initialProductId);
  const [filters, setFilters] = useState({ from_date: initialFrom, to_date: initialTo, type: "", category: "" });
  const [ledger, setLedger] = useState({ rows: [], opening_balance: 0, total_in: 0, total_out: 0, closing_balance: 0, product: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = ur ? {
    title:"پروڈکٹ لیجر",sub:"پروڈکٹ کی مکمل ان/آؤٹ ہسٹری، ریفرنس اور رننگ بیلنس",type:"قسم",category:"کیٹیگری",product:"پروڈکٹ",from:"از تاریخ",to:"تا تاریخ",select:"پروڈکٹ منتخب کریں",all:"تمام",load:"لیجر لوڈ کریں",print:"پرنٹ / PDF",date:"تاریخ",source:"ٹرانزیکشن",ref:"ریفرنس",party:"پارٹی / مقام",details:"تفصیل",qin:"ان",qout:"آؤٹ",balance:"بیلنس",opening:"اوپننگ",totalIn:"کل ان",totalOut:"کل آؤٹ",closing:"کلوزنگ",no:"اس مدت میں کوئی موومنٹ نہیں۔"
  } : {
    title:"Product Ledger",sub:"Complete product movement history with source, party/reference and running quantity balance",type:"Product Type",category:"Category",product:"Product",from:"From Date",to:"To Date",select:"Select product",all:"All",load:"Load Ledger",print:"Print / PDF",date:"Date",source:"Transaction",ref:"Reference",party:"Party / Location",details:"Details",qin:"Qty In",qout:"Qty Out",balance:"Balance",opening:"Opening",totalIn:"Total In",totalOut:"Total Out",closing:"Closing",no:"No product movements found for this period."
  };

  useEffect(() => {
    axios.get(`${API}/product-ledger/products`).then(r => setProducts(arr(r.data))).catch(e => setError(e?.response?.data?.message || e.message));
  }, []);

  const types = useMemo(() => [...new Set(products.map(p=>p.type_name).filter(Boolean))].sort(), [products]);
  const categories = useMemo(() => [...new Set(products.filter(p => !filters.type || p.type_name === filters.type).map(p=>p.category_name).filter(Boolean))].sort(), [products, filters.type]);
  const visibleProducts = useMemo(() => products.filter(p => (!filters.type || p.type_name===filters.type) && (!filters.category || p.category_name===filters.category)), [products, filters.type, filters.category]);

  useEffect(() => { if (productId && !visibleProducts.some(p => String(p.id)===String(productId))) { setProductId(""); setLedger(x => ({...x, rows:[], product:null})); } }, [visibleProducts, productId]);

  const loadLedger = useCallback(async () => {
    if (!productId) return;
    setLoading(true); setError("");
    try {
      const r = await axios.get(`${API}/product-ledger/${productId}`, { params: { from_date: filters.from_date, to_date: filters.to_date } });
      setLedger({ ...r.data, rows: arr(r.data) });
    } catch (e) {
      setLedger(x => ({...x, rows:[]})); setError(e?.response?.data?.message || e.message || "Failed to load product ledger.");
    } finally { setLoading(false); }
  }, [productId, filters.from_date, filters.to_date]);

  useEffect(() => { if (productId) loadLedger(); }, [productId, filters.from_date, filters.to_date, loadLedger]);

  const print = () => {
    if (!productId) return;
    const rows = ledger.rows || [];
    const body = rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.date||"—"}</td><td>${r.source||"—"}</td><td>${r.reference||"—"}</td><td>${r.party||"—"}</td><td>${r.description||""}</td><td class="num">${fmt(r.qty_in)}</td><td class="num">${fmt(r.qty_out)}</td><td class="num"><b>${fmt(r.balance)}</b></td></tr>`).join("");
    const p = ledger.product || products.find(x=>String(x.id)===String(productId)) || {};
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><html lang="${ur ? "ur" : "en"}" dir="${ur ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>Product Ledger</title><style>body{font-family:${ur ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};line-height:${ur ? "1.9" : "1.45"};padding:22px;color:#111827}h1{margin:0}.meta{color:#64748b;margin:8px 0 16px}.cards{display:flex;gap:12px;margin:12px 0}.card{border:1px solid #ddd;border-radius:8px;padding:10px;min-width:120px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#111827;color:white;text-align:${ur ? "right" : "left"};padding:7px}td{border-bottom:1px solid #ddd;padding:7px}.num{text-align:right}@page{size:A4 landscape;margin:8mm}</style></head><body><h1>${p.product_name||"Product"} Ledger</h1><div class="meta">${p.type_name||"—"} · ${p.category_name||"—"} · ${filters.from_date} to ${filters.to_date}</div><div class="cards"><div class="card">Opening<br><b>${fmt(ledger.opening_balance)}</b></div><div class="card">In<br><b>${fmt(ledger.total_in)}</b></div><div class="card">Out<br><b>${fmt(ledger.total_out)}</b></div><div class="card">Closing<br><b>${fmt(ledger.closing_balance)}</b></div></div><table><thead><tr><th>#</th><th>Date</th><th>Transaction</th><th>Reference</th><th>Party / Location</th><th>Details</th><th>In</th><th>Out</th><th>Balance</th></tr></thead><tbody>${body||`<tr><td colspan="9">No movements</td></tr>`}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`); w.document.close();
  };

  const cls="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  return <div dir={ur?"rtl":"ltr"} className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-7"><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-extrabold text-slate-900">{t.title}</h1><p className="mt-1 text-sm text-slate-500">{t.sub}</p></div><div className="flex gap-2"><button onClick={()=>setLang(ur?"en":"ur")} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white">{ur?"English":"اردو"}</button><button disabled={!productId} onClick={print} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">{t.print}</button></div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-xs font-bold text-slate-600">{t.type}<select className={`${cls} mt-1 font-normal`} value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value,category:""}))}><option value="">{t.all}</option>{types.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">{t.category}<select className={`${cls} mt-1 font-normal`} value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}><option value="">{t.all}</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600 lg:col-span-2">{t.product}<select className={`${cls} mt-1 font-normal`} value={productId} onChange={e=>setProductId(e.target.value)}><option value="">-- {t.select} --</option>{visibleProducts.map(p=><option key={p.id} value={p.id}>{p.product_name} {p.type_name?`— ${p.type_name}`:""} {p.category_name?`/ ${p.category_name}`:""}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">{t.from}<input type="date" className={`${cls} mt-1 font-normal`} value={filters.from_date} onChange={e=>setFilters(f=>({...f,from_date:e.target.value}))}/></label>
      <label className="text-xs font-bold text-slate-600">{t.to}<input type="date" className={`${cls} mt-1 font-normal`} value={filters.to_date} onChange={e=>setFilters(f=>({...f,to_date:e.target.value}))}/></label>
    </div><div className="mt-3 flex justify-end"><button disabled={!productId||loading} onClick={loadLedger} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{loading?"Loading...":t.load}</button></div></div>
    {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[[t.opening,ledger.opening_balance],[t.totalIn,ledger.total_in],[t.totalOut,ledger.total_out],[t.closing,ledger.closing_balance]].map(([l,v])=><div key={l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-semibold text-slate-500">{l}</div><div className="mt-1 text-xl font-extrabold text-slate-900">{fmt(v)}</div></div>)}</div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-sm"><thead className="bg-slate-950 text-white"><tr>{["#",t.date,t.source,t.ref,t.party,t.details,t.qin,t.qout,t.balance].map(x=><th key={x} className="px-3 py-3 text-left text-[11px] uppercase tracking-wide">{x}</th>)}</tr></thead><tbody>{!productId?<tr><td colSpan="9" className="p-12 text-center text-slate-400">{t.select}</td></tr>:loading?<tr><td colSpan="9" className="p-12 text-center text-slate-400">Loading...</td></tr>:(ledger.rows||[]).length===0?<tr><td colSpan="9" className="p-12 text-center text-slate-400">{t.no}</td></tr>:(ledger.rows||[]).map((r,i)=><tr key={r.id||i} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3">{i+1}</td><td className="px-3 py-3 whitespace-nowrap">{r.date||"—"}</td><td className="px-3 py-3 font-semibold text-slate-900">{r.source||"—"}</td><td className="px-3 py-3">{r.reference||"—"}</td><td className="px-3 py-3">{r.party||"—"}</td><td className="px-3 py-3 max-w-[260px]">{r.description||"—"}</td><td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{r.qty_in?fmt(r.qty_in):"—"}</td><td className="px-3 py-3 text-right font-mono font-bold text-rose-700">{r.qty_out?fmt(r.qty_out):"—"}</td><td className={`px-3 py-3 text-right font-mono font-extrabold ${n(r.balance)<0?"text-rose-700":"text-indigo-700"}`}>{fmt(r.balance)}</td></tr>)}</tbody></table></div></div>
  </div></div>;
}
