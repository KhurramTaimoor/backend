import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { todayIso } from "../utils/dateDefaults";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;
const money = (value) => Number(value || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const emptyLine = () => ({ account_type: "", account_id: "", description: "", debit: "", credit: "" });
const emptyForm = () => ({ voucher_no: "", voucher_date: todayIso(), narration: "", lines: [emptyLine(), emptyLine()] });

export default function JournalVoucherPage() {
  const [lang, setLang] = useState("en");
  const ur = lang === "ur";
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const text = ur ? {
    title: "جرنل واؤچر", subtitle: "ملٹی لائن ڈبل انٹری واؤچر", add: "نیا واؤچر", voucher: "واؤچر نمبر", date: "تاریخ",
    accountType: "اکاؤنٹ ٹائپ", account: "اکاؤنٹ", description: "تفصیل", debit: "ڈیبٹ", credit: "کریڈٹ", addRow: "+ لائن شامل کریں",
    narration: "نوٹس", save: "محفوظ کریں", update: "اپڈیٹ", cancel: "منسوخ", actions: "ایکشن", edit: "ترمیم", del: "حذف",
    search: "واؤچر، اکاؤنٹ یا تفصیل تلاش کریں...", total: "کل", balanced: "بیلنسڈ", notBalanced: "ڈیبٹ اور کریڈٹ برابر ہونے چاہئیں",
    noRows: "کوئی واؤچر نہیں ملا", selectType: "تمام اکاؤنٹ ٹائپس", selectAccount: "اکاؤنٹ منتخب کریں", print: "پرنٹ", language: "English"
  } : {
    title: "Journal Voucher", subtitle: "Multi-line double-entry accounting vouchers", add: "New Voucher", voucher: "Voucher No", date: "Date",
    accountType: "Account Type", account: "Account", description: "Description", debit: "Debit", credit: "Credit", addRow: "+ Add Row",
    narration: "Narration / Notes", save: "Save", update: "Update", cancel: "Cancel", actions: "Actions", edit: "Edit", del: "Delete",
    search: "Search voucher, account or description...", total: "Total", balanced: "Balanced", notBalanced: "Debit and credit totals must match",
    noRows: "No vouchers found", selectType: "All Account Types", selectAccount: "Select Account", print: "Print", language: "اردو"
  };

  const load = async () => {
    try {
      setLoading(true);
      const [voucherRes, accountRes] = await Promise.all([
        axios.get(`${API_BASE}/journal-vouchers`),
        axios.get(`${API_BASE}/chart-of-accounts`),
      ]);
      setRows(Array.isArray(voucherRes.data) ? voucherRes.data : []);
      setAccounts(Array.isArray(accountRes.data) ? accountRes.data : []);
    } catch (error) {
      console.error(error);
      setRows([]);
      setMessage(error?.response?.data?.error || "Data load failed.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const accountTypes = useMemo(() => [...new Set(accounts.map(a => a.account_type || a.group_name).filter(Boolean))].sort(), [accounts]);
  const totals = useMemo(() => form.lines.reduce((acc, line) => ({ debit: acc.debit + Number(line.debit || 0), credit: acc.credit + Number(line.credit || 0) }), { debit: 0, credit: 0 }), [form.lines]);
  const isBalanced = totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.01;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => [row.voucher_no, row.voucher_date, row.narration, ...(row.lines || []).flatMap(l => [l.account_title, l.account_type, l.description])].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const updateLine = (index, key, value) => setForm(prev => ({ ...prev, lines: prev.lines.map((line, i) => i === index ? {
    ...line,
    [key]: value,
    ...(key === "debit" && Number(value) > 0 ? { credit: "" } : {}),
    ...(key === "credit" && Number(value) > 0 ? { debit: "" } : {}),
  } : line) }));

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); setMessage(""); };
  const openEdit = (row) => {
    const lines = Array.isArray(row.lines) && row.lines.length ? row.lines.map(line => ({
      account_type: line.account_type || "", account_id: String(line.account_id || ""), description: line.description || "",
      debit: Number(line.debit || 0) ? String(line.debit) : "", credit: Number(line.credit || 0) ? String(line.credit) : ""
    })) : [
      { account_type: "", account_id: String(row.account_dr_id || ""), description: row.narration || "", debit: String(row.amount || ""), credit: "" },
      { account_type: "", account_id: String(row.account_cr_id || ""), description: row.narration || "", debit: "", credit: String(row.amount || "") },
    ];
    setEditingId(row.id); setForm({ voucher_no: row.voucher_no || "", voucher_date: String(row.voucher_date || todayIso()).slice(0, 10), narration: row.narration || "", lines }); setShowForm(true); setMessage("");
  };

  const save = async () => {
    const validLines = form.lines.filter(line => line.account_id && (Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0));
    if (!form.voucher_no.trim() || validLines.length < 2 || !isBalanced) { setMessage(text.notBalanced); return; }
    try {
      setSaving(true); setMessage("");
      const payload = { ...form, lines: validLines.map(line => ({ ...line, debit: Number(line.debit || 0), credit: Number(line.credit || 0) })) };
      if (editingId) await axios.put(`${API_BASE}/journal-vouchers/${editingId}`, payload); else await axios.post(`${API_BASE}/journal-vouchers`, payload);
      setShowForm(false); await load();
    } catch (error) { setMessage(error?.response?.data?.error || error?.response?.data?.message || "Save failed."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm(ur ? "یہ واؤچر حذف کریں؟" : "Delete this voucher?")) return;
    try { await axios.delete(`${API_BASE}/journal-vouchers/${id}`); await load(); }
    catch (error) { setMessage(error?.response?.data?.error || "Delete failed."); }
  };

  const printList = () => {
    const body = filtered.map((row, i) => `<tr><td>${i + 1}</td><td>${row.voucher_no}</td><td>${String(row.voucher_date || "").slice(0,10)}</td><td>${(row.lines || []).map(l => `${l.account_title || "#"+l.account_id}: ${Number(l.debit||0)>0?"Dr "+money(l.debit):"Cr "+money(l.credit)}`).join("<br>")}</td><td>${row.narration || ""}</td></tr>`).join("");
    const w = window.open("", "_blank", "width=1100,height=800"); if (!w) return;
    w.document.write(`<!doctype html><html lang="${ur ? "ur" : "en"}" dir="${ur ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${text.title}</title><style>body{font-family:${ur ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};line-height:${ur ? "1.9" : "1.45"};padding:24px}h1{margin:0 0 16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:${ur ? "right" : "left"};font-size:12px}th{background:#111827;color:#fff}@media print{body{padding:0}}</style></head><body><h1>${text.title}</h1><table><thead><tr><th>#</th><th>${text.voucher}</th><th>${text.date}</th><th>${text.account}</th><th>${text.narration}</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print();window.onafterprint=()=>window.close();<\/script></body></html>`);
    w.document.close();
  };

  return <div dir={ur ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-800">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-black">{text.title}</h1><p className="text-sm text-slate-500">{text.subtitle}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => setLang(ur ? "en" : "ur")} className="px-4 py-2 rounded-lg border bg-white">{text.language}</button><button onClick={printList} className="px-4 py-2 rounded-lg border bg-white">{text.print}</button><button onClick={openNew} className="px-4 py-2 rounded-lg bg-violet-700 text-white font-semibold">{text.add}</button></div>
      </div>
      {message && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{message}</div>}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={text.search} className="w-full sm:max-w-md mb-4 border rounded-lg px-3 py-2.5 bg-white" />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[780px]"><thead className="bg-slate-900 text-white"><tr><th className="p-3">#</th><th className="p-3 text-left">{text.voucher}</th><th className="p-3 text-left">{text.date}</th><th className="p-3 text-left">{text.account}</th><th className="p-3 text-right">{text.debit}</th><th className="p-3 text-right">{text.credit}</th><th className="p-3 text-center">{text.actions}</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-400">Loading...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-slate-400">{text.noRows}</td></tr> : filtered.map((row, i) => {
          const debit = (row.lines || []).reduce((s,l)=>s+Number(l.debit||0),0) || Number(row.amount||0); const credit=(row.lines||[]).reduce((s,l)=>s+Number(l.credit||0),0) || Number(row.amount||0);
          return <tr key={row.id} className="border-t align-top"><td className="p-3">{i+1}</td><td className="p-3 font-bold">{row.voucher_no}<div className="text-xs text-slate-400 mt-1">{row.narration}</div></td><td className="p-3">{String(row.voucher_date||"").slice(0,10)}</td><td className="p-3">{(row.lines||[]).map(l=><div key={l.id || `${l.account_id}-${l.line_no}`} className="mb-1"><span className="font-medium">{l.account_title || `#${l.account_id}`}</span><span className="text-slate-400"> — {l.description || ""}</span></div>)}</td><td className="p-3 text-right font-mono">{money(debit)}</td><td className="p-3 text-right font-mono">{money(credit)}</td><td className="p-3 text-center whitespace-nowrap"><button onClick={()=>openEdit(row)} className="px-2 py-1 text-violet-700">{text.edit}</button><button onClick={()=>remove(row.id)} className="px-2 py-1 text-red-600">{text.del}</button></td></tr>;
        })}
      </tbody></table></div></div>
    </div>

    {showForm && <div className="fixed inset-0 z-50 bg-slate-900/60 p-2 sm:p-4 flex items-center justify-center"><div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl">
      <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center z-10"><div><h2 className="text-xl font-black">{editingId ? text.update : text.add}</h2><p className="text-xs text-slate-500">{text.notBalanced}</p></div><button onClick={()=>setShowForm(false)} className="text-2xl">×</button></div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5"><div><label className="text-xs font-bold">{text.voucher}</label><input value={form.voucher_no} onChange={e=>setForm({...form,voucher_no:e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="JV-001" /></div><div><label className="text-xs font-bold">{text.date}</label><input type="date" value={form.voucher_date} onChange={e=>setForm({...form,voucher_date:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div><div><label className="text-xs font-bold">{text.narration}</label><input value={form.narration} onChange={e=>setForm({...form,narration:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div></div>
        <div className="overflow-x-auto border rounded-xl"><table className="w-full min-w-[920px] text-sm"><thead className="bg-slate-100"><tr><th className="p-2">#</th><th className="p-2 text-left">{text.accountType}</th><th className="p-2 text-left">{text.account}</th><th className="p-2 text-left">{text.description}</th><th className="p-2 text-right">{text.debit}</th><th className="p-2 text-right">{text.credit}</th><th className="p-2"></th></tr></thead><tbody>
          {form.lines.map((line,index)=>{ const visibleAccounts=line.account_type?accounts.filter(a=>(a.account_type||a.group_name)===line.account_type):accounts; return <tr key={index} className="border-t"><td className="p-2 text-center">{index+1}</td><td className="p-2"><select value={line.account_type} onChange={e=>updateLine(index,"account_type",e.target.value)} className="w-full border rounded px-2 py-2"><option value="">{text.selectType}</option>{accountTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></td><td className="p-2"><select value={line.account_id} onChange={e=>updateLine(index,"account_id",e.target.value)} className="w-full border rounded px-2 py-2"><option value="">{text.selectAccount}</option>{visibleAccounts.map(a=><option key={a.id} value={a.id}>[{a.account_code || a.id}] {a.account_title}</option>)}</select></td><td className="p-2"><input value={line.description} onChange={e=>updateLine(index,"description",e.target.value)} className="w-full border rounded px-2 py-2" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={line.debit} onChange={e=>updateLine(index,"debit",e.target.value)} className="w-full border rounded px-2 py-2 text-right" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={line.credit} onChange={e=>updateLine(index,"credit",e.target.value)} className="w-full border rounded px-2 py-2 text-right" /></td><td className="p-2 text-center"><button disabled={form.lines.length<=2} onClick={()=>setForm(prev=>({...prev,lines:prev.lines.filter((_,i)=>i!==index)}))} className="text-red-600 disabled:opacity-30">×</button></td></tr> })}
        </tbody><tfoot className="bg-slate-50 font-bold"><tr><td colSpan={4} className="p-3 text-right">{text.total}</td><td className="p-3 text-right font-mono">{money(totals.debit)}</td><td className="p-3 text-right font-mono">{money(totals.credit)}</td><td></td></tr></tfoot></table></div>
        <div className="mt-3 flex flex-wrap justify-between gap-3"><button onClick={()=>setForm(prev=>({...prev,lines:[...prev.lines,emptyLine()]}))} className="px-4 py-2 rounded-lg border bg-white">{text.addRow}</button><span className={`px-4 py-2 rounded-lg text-sm font-bold ${isBalanced?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{isBalanced?text.balanced:text.notBalanced}</span></div>
        <div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-lg border">{text.cancel}</button><button disabled={saving || !isBalanced} onClick={save} className="px-5 py-2 rounded-lg bg-violet-700 text-white font-semibold disabled:opacity-50">{saving?"...":editingId?text.update:text.save}</button></div>
      </div>
    </div></div>}
  </div>;
}
