import React, { useCallback, useEffect, useMemo, useState } from "react";
import { escapeHtml, openUnicodePrint, printableText } from "../utils/unicodePrint";
import {
  BadgeDollarSign,
  Check,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  ListChecks,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const copy = {
  en: {
    title: "Sales Rate Lists",
    subtitle: "Create one price list for all products and assign it to selected customers.",
    newList: "New Rate List",
    searchLists: "Search rate lists...",
    listName: "Rate List Name",
    products: "Products",
    customers: "Customers",
    updated: "Updated",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    details: "View Details",
    assign: "Assign Customers",
    save: "Save Rate List",
    saving: "Saving...",
    cancel: "Cancel",
    productSearch: "Search product...",
    customerSearch: "Search customer by name or phone...",
    product: "Product",
    category: "Category",
    type: "Product Type",
    unit: "Unit",
    single: "Single",
    retail: "Retail",
    wholesale: "Wholesale",
    distributor: "Distributor",
    selected: "Selected",
    allProductsHint: "All products are shown in this single form. Set the required prices and save once.",
    assignedHint: "Search customers by name/phone and assign this as their default rate list. Reassigning a customer moves the default from the previous list; Sales Invoice can still override it when needed.",
    noLists: "No rate lists found.",
    noProducts: "No products found.",
    noCustomers: "No customers found.",
    loading: "Loading...",
    deleteConfirm: "Delete this complete rate list?",
    listRequired: "Rate List Name is required.",
    saved: "Rate list saved.",
    assigned: "Customers assigned.",
    deleted: "Rate list deleted.",
    exportPdf: "PDF",
    global: "Global / unassigned",
    assignedCustomers: "Assigned Customers",
    close: "Close",
    toggleLang: "اردو",
  },
  ur: {
    title: "سیلز ریٹ لسٹس",
    subtitle: "تمام پروڈکٹس کے لیے ایک ریٹ لسٹ بنائیں اور منتخب کسٹمرز کو اسائن کریں۔",
    newList: "نئی ریٹ لسٹ",
    searchLists: "ریٹ لسٹ تلاش کریں...",
    listName: "ریٹ لسٹ نام",
    products: "پروڈکٹس",
    customers: "کسٹمرز",
    updated: "اپڈیٹ",
    actions: "اقدامات",
    edit: "ترمیم",
    delete: "حذف",
    details: "تفصیل دیکھیں",
    assign: "کسٹمر اسائن کریں",
    save: "ریٹ لسٹ محفوظ کریں",
    saving: "محفوظ ہو رہی ہے...",
    cancel: "منسوخ",
    productSearch: "پروڈکٹ تلاش کریں...",
    customerSearch: "نام یا فون سے کسٹمر تلاش کریں...",
    product: "پروڈکٹ",
    category: "کیٹیگری",
    type: "پروڈکٹ ٹائپ",
    unit: "یونٹ",
    single: "سنگل",
    retail: "ریٹیل",
    wholesale: "ہول سیل",
    distributor: "ڈسٹری بیوٹر",
    selected: "منتخب",
    allProductsHint: "تمام پروڈکٹس اسی ایک فارم میں ہیں۔ ریٹس درج کریں اور ایک دفعہ محفوظ کریں۔",
    assignedHint: "نام یا فون سے کسٹمر تلاش کر کے اسے ڈیفالٹ ریٹ لسٹ اسائن کریں۔ دوبارہ اسائن کرنے پر پرانی ڈیفالٹ لسٹ بدل جائے گی؛ ضرورت پر سیلز انوائس میں ریٹ لسٹ اوور رائیڈ بھی ہو سکتی ہے۔",
    noLists: "کوئی ریٹ لسٹ نہیں ملی۔",
    noProducts: "کوئی پروڈکٹ نہیں ملا۔",
    noCustomers: "کوئی کسٹمر نہیں ملا۔",
    loading: "لوڈ ہو رہا ہے...",
    deleteConfirm: "یہ مکمل ریٹ لسٹ حذف کرنی ہے؟",
    listRequired: "ریٹ لسٹ نام ضروری ہے۔",
    saved: "ریٹ لسٹ محفوظ ہو گئی۔",
    assigned: "کسٹمر اسائن ہو گئے۔",
    deleted: "ریٹ لسٹ حذف ہو گئی۔",
    exportPdf: "پی ڈی ایف",
    global: "تمام / غیر اسائن",
    assignedCustomers: "اسائن شدہ کسٹمرز",
    close: "بند کریں",
    toggleLang: "English",
  },
};

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.lists)) return value.lists;
  if (Array.isArray(value?.products)) return value.products;
  return [];
};

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

const productName = (p) => String(p?.product_name || p?.product_name_en || p?.name || `#${p?.id || ""}`);
const customerName = (c) => String(c?.customer_name_en || c?.customer_name || c?.name || `#${c?.id || ""}`);
const categoryName = (p) => String(p?.category_name || p?.category_name_en || "—");
const typeName = (p) => String(p?.product_type_en || p?.type_name || p?.product_type_name || "—");
const unitName = (p) => String(p?.unit_name || p?.unit || "—");
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v) => num(v).toLocaleString("en-PK", { maximumFractionDigits: 2 });

const emptyRates = (p) => ({
  product_id: Number(p.id),
  product_name: productName(p),
  category_id: Number(p.category_id) || 0,
  category_name: categoryName(p),
  product_type_id: Number(p.product_type_id) || 0,
  type_name: typeName(p),
  unit_id: Number(p.unit_id) || 0,
  unit_name: unitName(p),
  single_rate: "",
  retail_rate: "",
  wholesale_rate: "",
  distributor_rate: "",
});

const firstOption = (record) => (Array.isArray(record?.price_options) && record.price_options.length ? record.price_options[0] : {});

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-2 sm:p-5 backdrop-blur-sm">
      <div className={`my-2 w-full ${wide ? "max-w-[1450px]" : "max-w-2xl"} overflow-hidden rounded-2xl border border-slate-200 bg-[#F4F7FB] shadow-2xl sm:my-6`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <h2 className="text-base font-extrabold text-[#13263A] sm:text-lg">{title}</h2>
          <button onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function RateListPage() {
  const [lang, setLang] = useState("en");
  const t = copy[lang];
  const isUrdu = lang === "ur";
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [listName, setListName] = useState("");
  const [rows, setRows] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [assignList, setAssignList] = useState(null);
  const [assignedIds, setAssignedIds] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  const [detailList, setDetailList] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, productData, customerData] = await Promise.all([
        api("/api/rates/lists"),
        api("/api/products"),
        api("/api/customers"),
      ]);
      setLists(getList(listData));
      setProducts(getList(productData));
      setCustomers(getList(customerData));
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((list) => {
      const customerText = (list.assigned_customers || []).map((c) => c.customer_name).join(" ");
      return `${list.list_name || ""} ${customerText}`.toLowerCase().includes(q);
    });
  }, [lists, search]);

  const visibleRows = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.product_name} ${r.category_name} ${r.type_name} ${r.unit_name}`.toLowerCase().includes(q));
  }, [rows, productSearch]);

  const visibleCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${customerName(c)} ${c.phone || ""} ${c.city_en || ""}`.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const newList = () => {
    setOriginalName("");
    setListName("");
    setRows(products.map(emptyRates));
    setProductSearch("");
    setFormOpen(true);
  };

  const editList = async (summary) => {
    try {
      const response = await api(`/api/rates/lists/${encodeURIComponent(summary.list_name)}`);
      const detail = response.data || response;
      const existing = new Map((detail.items || []).map((item) => [String(item.product_id), item]));
      setRows(
        products.map((p) => {
          const base = emptyRates(p);
          const record = existing.get(String(p.id));
          if (!record) return base;
          const opt = firstOption(record);
          return {
            ...base,
            single_rate: opt.single_rate ?? "",
            retail_rate: opt.retail_rate ?? "",
            wholesale_rate: opt.wholesale_rate ?? "",
            distributor_rate: opt.distributor_rate ?? "",
          };
        })
      );
      setOriginalName(summary.list_name);
      setListName(summary.list_name);
      setProductSearch("");
      setFormOpen(true);
    } catch (err) {
      notify(err.message);
    }
  };

  const changeRate = (productId, field, value) => {
    setRows((current) => current.map((row) => (String(row.product_id) === String(productId) ? { ...row, [field]: value } : row)));
  };

  const saveList = async () => {
    const cleanName = listName.trim();
    if (!cleanName) return notify(t.listRequired);
    setSaving(true);
    try {
      const payload = {
        list_name: cleanName,
        items: rows.map((r) => ({
          product_id: r.product_id,
          category_id: r.category_id,
          product_type_id: r.product_type_id,
          unit_id: r.unit_id,
          single_rate: num(r.single_rate),
          retail_rate: num(r.retail_rate),
          wholesale_rate: num(r.wholesale_rate),
          distributor_rate: num(r.distributor_rate),
        })),
      };
      const path = originalName ? `/api/rates/lists/${encodeURIComponent(originalName)}` : "/api/rates/lists";
      await api(path, { method: originalName ? "PUT" : "POST", body: JSON.stringify(payload) });
      setFormOpen(false);
      notify(t.saved);
      await load();
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAssign = (summary) => {
    setAssignList(summary);
    setAssignedIds((summary.assigned_customer_ids || []).map(Number));
    setCustomerSearch("");
  };

  const toggleCustomer = (id) => {
    const n = Number(id);
    setAssignedIds((current) => (current.includes(n) ? current.filter((x) => x !== n) : [...current, n]));
  };

  const saveAssignments = async () => {
    if (!assignList) return;
    setAssignSaving(true);
    try {
      await api(`/api/rates/lists/${encodeURIComponent(assignList.list_name)}/assign-customers`, {
        method: "POST",
        body: JSON.stringify({ customer_ids: assignedIds }),
      });
      setAssignList(null);
      notify(t.assigned);
      await load();
    } catch (err) {
      notify(err.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const showDetails = async (summary) => {
    setDetailLoading(true);
    try {
      const response = await api(`/api/rates/lists/${encodeURIComponent(summary.list_name)}`);
      setDetailList(response.data || response);
    } catch (err) {
      notify(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const removeList = async (summary) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await api(`/api/rates/lists/${encodeURIComponent(summary.list_name)}`, { method: "DELETE" });
      notify(t.deleted);
      await load();
    } catch (err) {
      notify(err.message);
    }
  };

  const exportPdf = async (summary) => {
    try {
      const response = await api(`/api/rates/lists/${encodeURIComponent(summary.list_name)}`);
      const detail = response.data || response;
      const assigned = (detail.assigned_customers || [])
        .map((x) => x.customer_name || x.customer_name_en || "")
        .filter(Boolean);

      const rowsHtml = (detail.items || [])
        .map((item, index) => {
          const p = products.find((x) => String(x.id) === String(item.product_id)) || {};
          const opt = firstOption(item);
          return `<tr>
            <td class="center num">${index + 1}</td>
            <td>${printableText(productName(p))}</td>
            <td>${printableText(categoryName(p))}</td>
            <td>${printableText(typeName(p))}</td>
            <td>${printableText(unitName(p))}</td>
            <td class="num amount">${escapeHtml(money(opt.single_rate))}</td>
            <td class="num amount">${escapeHtml(money(opt.retail_rate))}</td>
            <td class="num amount">${escapeHtml(money(opt.wholesale_rate))}</td>
            <td class="num amount">${escapeHtml(money(opt.distributor_rate))}</td>
          </tr>`;
        })
        .join("");

      const bodyHtml = `
        <div class="pdf-hint">${
          isUrdu
            ? "پی ڈی ایف کے لیے پرنٹ ڈائیلاگ میں Save as PDF منتخب کریں۔"
            : "Choose Save as PDF in the print dialog. Urdu/Arabic product and customer names are Unicode-safe."
        }</div>
        <main class="report">
          <header class="report-head">
            <div><div class="brand">Ali Cages</div><div class="title">${printableText(detail.list_name || t.listName)}</div></div>
            <div class="assigned"><b>${escapeHtml(t.assignedCustomers)}:</b><br/>${
              assigned.length ? assigned.map((name) => printableText(name)).join("، ") : escapeHtml(t.global)
            }</div>
          </header>
          <table>
            <thead><tr>
              <th>#</th><th>${escapeHtml(t.product)}</th><th>${escapeHtml(t.category)}</th><th>${escapeHtml(t.type)}</th><th>${escapeHtml(t.unit)}</th>
              <th>${escapeHtml(t.single)}</th><th>${escapeHtml(t.retail)}</th><th>${escapeHtml(t.wholesale)}</th><th>${escapeHtml(t.distributor)}</th>
            </tr></thead>
            <tbody>${rowsHtml || `<tr><td colspan="9" class="empty">${escapeHtml(t.noProducts)}</td></tr>`}</tbody>
          </table>
        </main>`;

      openUnicodePrint({
        title: `Ali Cages - ${detail.list_name || "Rate List"}`,
        bodyHtml,
        dir: isUrdu ? "rtl" : "ltr",
        lang,
        pageSize: "A4 landscape",
        styles: `
          .report{width:100%}.report-head{display:flex;justify-content:space-between;align-items:flex-end;gap:22px;background:#0C2134;color:#fff;padding:14px 16px;margin-bottom:14px}
          .brand{color:#4A86F7;font-size:21px;font-weight:800}.title{font-size:13px;font-weight:700;margin-top:4px}.assigned{max-width:55%;font-size:9px;line-height:1.8;text-align:${isUrdu ? "left" : "right"};color:#E2E8F0}
          table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}thead{display:table-header-group}tr{break-inside:avoid}
          th{background:#0B4E9B;color:#fff;border:1px solid #0B4E9B;padding:7px 5px;text-align:${isUrdu ? "right" : "left"}}
          td{border:1px solid #CBD5E1;padding:6px 5px;overflow-wrap:anywhere}tbody tr:nth-child(odd) td{background:#F8FAFC}
          th:nth-child(1),td:nth-child(1){width:4%}th:nth-child(2),td:nth-child(2){width:23%}th:nth-child(3),td:nth-child(3){width:13%}th:nth-child(4),td:nth-child(4){width:12%}th:nth-child(5),td:nth-child(5){width:8%}
          th:nth-child(n+6),td:nth-child(n+6){width:10%}.center{text-align:center!important}.amount{text-align:right!important}.empty{text-align:center;padding:24px;color:#64748B}
        `,
      });
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div dir={isUrdu ? "rtl" : "ltr"} className="min-h-screen bg-[#F4F7FB] px-3 py-4 text-slate-900 sm:px-5 lg:px-6">
      {toast && <div className="fixed bottom-5 right-5 z-[140] rounded-xl bg-[#13263A] px-4 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}

      <div className="mx-auto max-w-[1500px]">
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4A86F7]">Ali Cages ERP</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#13263A]">{t.title}</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLang((v) => (v === "en" ? "ur" : "en"))} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">{t.toggleLang}</button>
            <button onClick={newList} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4A86F7] px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-600">
              <Plus size={15} /> {t.newList}
            </button>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><ListChecks size={18}/></span><div><p className="text-xs text-slate-500">{t.title}</p><b className="text-xl text-[#13263A]">{lists.length}</b></div></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><BadgeDollarSign size={18}/></span><div><p className="text-xs text-slate-500">{t.products}</p><b className="text-xl text-[#13263A]">{products.length}</b></div></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Users size={18}/></span><div><p className="text-xs text-slate-500">{t.customers}</p><b className="text-xl text-[#13263A]">{customers.length}</b></div></div></div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchLists} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#4A86F7] focus:bg-white" />
            </div>
            <p className="text-xs font-semibold text-slate-400">{filteredLists.length} {t.title}</p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3 text-left">{t.listName}</th><th className="px-4 py-3 text-center">{t.products}</th><th className="px-4 py-3 text-left">{t.assignedCustomers}</th><th className="px-4 py-3 text-left">{t.updated}</th><th className="px-4 py-3 text-center">{t.actions}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">{t.loading}</td></tr> : filteredLists.length === 0 ? <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-400">{t.noLists}</td></tr> : filteredLists.map((list) => (
                  <tr key={list.list_name} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4"><div className="font-extrabold text-[#13263A]">{list.list_name}</div><div className="mt-1 text-[11px] text-slate-400">Rate list</div></td>
                    <td className="px-4 py-4 text-center"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{list.product_count}</span></td>
                    <td className="px-4 py-4"><div className="flex max-w-xl flex-wrap gap-1">{(list.assigned_customers || []).length ? (list.assigned_customers || []).slice(0,4).map((c) => <span key={c.customer_id} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{c.customer_name}</span>) : <span className="text-xs text-slate-400">{t.global}</span>}{(list.assigned_customers || []).length > 4 && <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">+{list.assigned_customers.length - 4}</span>}</div></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{list.updated_at ? new Date(list.updated_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-4"><div className="flex items-center justify-center gap-1.5"><Action icon={<Eye size={14}/>} label={t.details} onClick={() => showDetails(list)}/><Action icon={<UserPlus size={14}/>} label={t.assign} onClick={() => openAssign(list)}/><Action icon={<Edit3 size={14}/>} label={t.edit} onClick={() => editList(list)}/><Action icon={<Download size={14}/>} label={t.exportPdf} onClick={() => exportPdf(list)}/><Action danger icon={<Trash2 size={14}/>} label={t.delete} onClick={() => removeList(list)}/></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {loading ? <div className="py-10 text-center text-sm text-slate-400">{t.loading}</div> : filteredLists.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">{t.noLists}</div> : filteredLists.map((list) => (
              <article key={list.list_name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-extrabold text-[#13263A]">{list.list_name}</h3><p className="mt-1 text-xs text-slate-500">{list.product_count} {t.products} · {(list.assigned_customer_ids || []).length} {t.customers}</p></div><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><BadgeDollarSign size={16}/></span></div>
                <button onClick={() => showDetails(list)} className="mt-4 flex h-10 w-full items-center justify-between rounded-lg bg-[#13263A] px-3 text-xs font-bold text-white"><span className="inline-flex items-center gap-2"><Eye size={14}/>{t.details}</span><ChevronRight size={14}/></button>
                <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => openAssign(list)} className="h-9 rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">{t.assign}</button><button onClick={() => editList(list)} className="h-9 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700">{t.edit}</button></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {formOpen && (
        <Modal wide title={originalName ? `${t.edit}: ${originalName}` : t.newList} onClose={() => setFormOpen(false)}>
          <div className="p-3 sm:p-5">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(240px,360px)_1fr]">
              <div><label className="mb-1.5 block text-[11px] font-extrabold uppercase text-slate-500">{t.listName}</label><input value={listName} onChange={(e) => setListName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-[#4A86F7]" placeholder="e.g. Dealer A / Retail 2026" /></div>
              <div><label className="mb-1.5 block text-[11px] font-extrabold uppercase text-slate-500">{t.productSearch}</label><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#4A86F7] focus:bg-white" placeholder={t.productSearch}/></div></div>
              <p className="lg:col-span-2 text-xs text-slate-500">{t.allProductsHint}</p>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[62vh] overflow-auto">
                <table className="w-full min-w-[1050px] text-xs">
                  <thead className="sticky top-0 z-10 bg-[#13263A] text-[10px] font-extrabold uppercase tracking-wide text-white/80"><tr><th className="px-3 py-3 text-left">#</th><th className="px-3 py-3 text-left">{t.product}</th><th className="px-3 py-3 text-left">{t.category}</th><th className="px-3 py-3 text-left">{t.type}</th><th className="px-3 py-3 text-left">{t.unit}</th><th className="px-2 py-3">{t.single}</th><th className="px-2 py-3">{t.retail}</th><th className="px-2 py-3">{t.wholesale}</th><th className="px-2 py-3">{t.distributor}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.length === 0 ? <tr><td colSpan="9" className="px-4 py-10 text-center text-slate-400">{t.noProducts}</td></tr> : visibleRows.map((row, index) => (
                      <tr key={row.product_id} className="hover:bg-blue-50/30"><td className="px-3 py-2 font-mono text-slate-400">{index+1}</td><td className="px-3 py-2 font-extrabold text-[#13263A]">{row.product_name}</td><td className="px-3 py-2 text-slate-500">{row.category_name}</td><td className="px-3 py-2 text-slate-500">{row.type_name}</td><td className="px-3 py-2 text-slate-500">{row.unit_name}</td>{["single_rate","retail_rate","wholesale_rate","distributor_rate"].map((field) => <td key={field} className="px-2 py-2"><input type="number" min="0" step="0.01" value={row[field]} onChange={(e) => changeRate(row.product_id, field, e.target.value)} className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-right font-mono font-bold outline-none focus:border-[#4A86F7]" placeholder="0"/></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setFormOpen(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">{t.cancel}</button><button disabled={saving} onClick={saveList} className="h-10 rounded-lg bg-[#4A86F7] px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50">{saving ? t.saving : t.save}</button></div>
          </div>
        </Modal>
      )}

      {assignList && (
        <Modal title={`${t.assign}: ${assignList.list_name}`} onClose={() => setAssignList(null)}>
          <div className="p-4 sm:p-5">
            <p className="mb-3 text-xs text-slate-500">{t.assignedHint}</p>
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder={t.customerSearch} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#4A86F7]"/></div>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="font-bold text-slate-600">{assignedIds.length} {t.selected}</span><button onClick={() => setAssignedIds([])} className="font-bold text-blue-600">Clear</button></div>
            <div className="mt-2 max-h-[52vh] space-y-2 overflow-y-auto pr-1">{visibleCustomers.length === 0 ? <div className="py-8 text-center text-sm text-slate-400">{t.noCustomers}</div> : visibleCustomers.map((customer) => { const checked = assignedIds.includes(Number(customer.id)); return <button key={customer.id} onClick={() => toggleCustomer(customer.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-md border ${checked ? "border-[#4A86F7] bg-[#4A86F7] text-white" : "border-slate-300 bg-white text-transparent"}`}><Check size={14}/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#13263A]">{customerName(customer)}</b><span className="text-[11px] text-slate-400">{customer.phone || "—"} · {customer.city_en || "—"}</span></span></button>; })}</div>
            <div className="mt-4 flex justify-end gap-2"><button onClick={() => setAssignList(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700">{t.cancel}</button><button disabled={assignSaving} onClick={saveAssignments} className="h-10 rounded-lg bg-[#4A86F7] px-5 text-xs font-bold text-white disabled:opacity-50">{assignSaving ? t.saving : t.assign}</button></div>
          </div>
        </Modal>
      )}

      {(detailList || detailLoading) && (
        <Modal wide title={detailList?.list_name || t.details} onClose={() => setDetailList(null)}>
          <div className="p-3 sm:p-5">{detailLoading && !detailList ? <div className="py-16 text-center text-sm text-slate-400">{t.loading}</div> : detailList && <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><InfoCard icon={<BadgeDollarSign size={17}/>} label={t.listName} value={detailList.list_name}/><InfoCard icon={<ListChecks size={17}/>} label={t.products} value={detailList.product_count}/><InfoCard icon={<Users size={17}/>} label={t.customers} value={(detailList.assigned_customer_ids || []).length}/></div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-xs font-extrabold uppercase text-slate-500">{t.assignedCustomers}</h3><div className="mt-2 flex flex-wrap gap-1.5">{(detailList.assigned_customers || []).length ? detailList.assigned_customers.map((c) => <span key={c.customer_id} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{c.customer_name}</span>) : <span className="text-xs text-slate-400">{t.global}</span>}</div></div>
            <div className="mt-3 max-h-[58vh] overflow-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[950px] text-xs"><thead className="sticky top-0 bg-[#13263A] text-[10px] uppercase text-white/80"><tr><th className="px-3 py-3 text-left">#</th><th className="px-3 py-3 text-left">{t.product}</th><th className="px-3 py-3 text-left">{t.category}</th><th className="px-3 py-3 text-left">{t.type}</th><th className="px-3 py-3 text-left">{t.unit}</th><th className="px-3 py-3 text-right">{t.single}</th><th className="px-3 py-3 text-right">{t.retail}</th><th className="px-3 py-3 text-right">{t.wholesale}</th><th className="px-3 py-3 text-right">{t.distributor}</th></tr></thead><tbody className="divide-y divide-slate-100">{(detailList.items || []).map((item, index) => { const p = products.find((x) => String(x.id) === String(item.product_id)) || {}; const opt = firstOption(item); return <tr key={item.id || item.product_id}><td className="px-3 py-2 text-slate-400">{index+1}</td><td className="px-3 py-2 font-bold text-[#13263A]">{productName(p)}</td><td className="px-3 py-2 text-slate-500">{categoryName(p)}</td><td className="px-3 py-2 text-slate-500">{typeName(p)}</td><td className="px-3 py-2 text-slate-500">{unitName(p)}</td><td className="px-3 py-2 text-right font-mono">{money(opt.single_rate)}</td><td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{money(opt.retail_rate)}</td><td className="px-3 py-2 text-right font-mono">{money(opt.wholesale_rate)}</td><td className="px-3 py-2 text-right font-mono">{money(opt.distributor_rate)}</td></tr>; })}</tbody></table></div>
          </>}</div>
        </Modal>
      )}
    </div>
  );
}

function Action({ icon, label, onClick, danger = false }) {
  return <button onClick={onClick} title={label} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold ${danger ? "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{icon}<span className="hidden xl:inline">{label}</span></button>;
}

function InfoCard({ icon, label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-600">{icon}</span><div><p className="text-[11px] font-bold uppercase text-slate-400">{label}</p><b className="text-base text-[#13263A]">{value}</b></div></div></div>;
}
