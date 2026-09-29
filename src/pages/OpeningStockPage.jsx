import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LANG = {
  en: {
    title: "Opening Stock",
    subtitle: "Manage initial stock levels",
    addBtn: "Add Stock",
    summaryBtn: "View Summary",
    summaryTitle: "Opening Stock Summary",
    summarySubtitle: "Overview of visible opening stock records",
    totalRecords: "Total Records",
    totalQuantity: "Total Quantity",
    warehouses: "Warehouses",
    searchPlaceholder: "Search by product, warehouse or category...",
    product: "Product",
    selectProduct: "-- Select Product --",
    productType: "Product Type",
    selectType: "-- Select Type --",
    category: "Category",
    selectCategory: "-- Select Category --",
    warehouse: "Warehouse",
    warehousePlaceholder: "e.g. Main Godown",
    quantity: "Quantity",
    quantityPlaceholder: "0",
    stockDate: "Stock Date",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    records: "Records",
    noRecords: "No stock records found.",
    loading: "Loading opening stock...",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "Opening Stock Report",
    printedOn: "Printed On",
    successSave: "Stock saved successfully!",
    successUpdate: "Stock updated successfully!",
    successDelete: "Stock deleted successfully!",
    errorMsg: "Please fill all required fields.",
    deleteConfirm: "Are you sure you want to delete this record?",
    fetchError: "Failed to load opening stock.",
    saveError: "Failed to save stock.",
    deleteError: "Failed to delete stock.",
    formTitleAdd: "Add Opening Stock",
    formTitleEdit: "Edit Opening Stock",
    formSubtitle: "Select product details, warehouse and initial quantity",
    stockInfo: "Stock Information",
    required: "Required",
    readyToSave: "Ready to save stock",
  },
  ur: {
    title: "ابتدائی اسٹاک",
    subtitle: "ابتدائی اسٹاک کی سطح کا انتظام کریں",
    addBtn: "اسٹاک شامل کریں",
    summaryBtn: "سمری دیکھیں",
    summaryTitle: "ابتدائی اسٹاک سمری",
    summarySubtitle: "نظر آنے والے اسٹاک ریکارڈز کا خلاصہ",
    totalRecords: "کل ریکارڈز",
    totalQuantity: "کل مقدار",
    warehouses: "گودام",
    searchPlaceholder: "پروڈکٹ، گودام یا کیٹیگری سے تلاش کریں...",
    product: "پروڈکٹ",
    selectProduct: "-- پروڈکٹ منتخب کریں --",
    productType: "پروڈکٹ کی قسم",
    selectType: "-- قسم منتخب کریں --",
    category: "کیٹیگری",
    selectCategory: "-- کیٹیگری منتخب کریں --",
    warehouse: "گودام",
    warehousePlaceholder: "مثلاً Main Godown",
    quantity: "مقدار",
    quantityPlaceholder: "0",
    stockDate: "اسٹاک کی تاریخ",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    records: "ریکارڈز",
    noRecords: "اسٹاک کا کوئی ریکارڈ نہیں ملا۔",
    loading: "ابتدائی اسٹاک لوڈ ہو رہا ہے...",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "ابتدائی اسٹاک کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "اسٹاک کامیابی سے محفوظ ہو گیا!",
    successUpdate: "اسٹاک کامیابی سے اپڈیٹ ہو گیا!",
    successDelete: "اسٹاک کامیابی سے حذف ہو گیا!",
    errorMsg: "براہ کرم تمام لازمی خانے پُر کریں۔",
    deleteConfirm: "کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟",
    fetchError: "ابتدائی اسٹاک لوڈ نہیں ہو سکا۔",
    saveError: "اسٹاک محفوظ نہیں ہو سکا۔",
    deleteError: "اسٹاک حذف نہیں ہو سکا۔",
    formTitleAdd: "ابتدائی اسٹاک شامل کریں",
    formTitleEdit: "ابتدائی اسٹاک ترمیم کریں",
    formSubtitle: "پروڈکٹ، گودام اور ابتدائی مقدار منتخب کریں",
    stockInfo: "اسٹاک معلومات",
    required: "ضروری",
    readyToSave: "اسٹاک محفوظ کرنے کے لیے تیار",
  },
};

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const API_BASE = API_ROOT.endsWith("/api") ? API_ROOT : `${API_ROOT}/api`;

const todayInputValue = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().slice(0, 10);
};

const emptyForm = () => ({
  product_id: "",
  product_type_id: "",
  category_id: "",
  warehouse: "",
  quantity: "",
  stock_date: todayInputValue(),
});

const listFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.products)) return data.products;
  return [];
};

const fmt = (v) =>
  Number(v || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const recId = (o) => o?.id ?? o?.value ?? "";
const productName = (o) => o?.product_name || o?.product_name_en || o?.name || o?.title || "-";
const typeName = (o) => o?.type_name || o?.product_type_en || o?.type_name_en || o?.name || o?.title || "-";
const categoryName = (o) => o?.category_name || o?.category_name_en || o?.name || o?.title || "-";

export default function OpeningStockPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [form, setForm] = useState(emptyForm());

  const baseFont = isUrdu
    ? "'Noto Nastaliq Urdu', serif"
    : "Helvetica, 'Helvetica Neue', Arial, sans-serif";

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const id = recId(p);
      if (id !== "") map[String(id)] = productName(p);
    });
    return map;
  }, [products]);

  const typeMap = useMemo(() => {
    const map = {};
    types.forEach((tp) => {
      const id = recId(tp);
      if (id !== "") map[String(id)] = typeName(tp);
    });
    return map;
  }, [types]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      const id = recId(c);
      if (id !== "") map[String(id)] = categoryName(c);
    });
    return map;
  }, [categories]);

  const normalizeRecord = (r) => {
    const productId = r?.product_id ?? r?.productId ?? "";
    const typeId = r?.product_type_id ?? r?.type_id ?? r?.productTypeId ?? "";
    const categoryId = r?.category_id ?? r?.categoryId ?? "";
    return {
      ...r,
      id: r?.id ?? Date.now(),
      product_id: productId,
      product_type_id: typeId,
      category_id: categoryId,
      product_name: r?.product_name || productMap[String(productId)] || "-",
      type_name: r?.type_name || r?.product_type_en || r?.product_type_name || typeMap[String(typeId)] || "-",
      category_name: r?.category_name || r?.category_name_en || categoryMap[String(categoryId)] || "-",
      warehouse: r?.warehouse || "",
      quantity: Number(r?.quantity || 0),
      stock_date: r?.stock_date || r?.date || "",
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setMasterLoading(true);

      const [resStock, resProd, resType, resCat] = await Promise.allSettled([
        axios.get(`${API_BASE}/opening-stock`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/product-types`),
        axios.get(`${API_BASE}/categories`),
      ]);

      const stockList = resStock.status === "fulfilled" ? listFrom(resStock.value?.data) : [];
      const productList = resProd.status === "fulfilled" ? listFrom(resProd.value?.data) : [];
      const typeList = resType.status === "fulfilled" ? listFrom(resType.value?.data) : [];
      const categoryList = resCat.status === "fulfilled" ? listFrom(resCat.value?.data) : [];

      if (
        resStock.status === "rejected" &&
        resProd.status === "rejected" &&
        resType.status === "rejected" &&
        resCat.status === "rejected"
      ) {
        setProducts([
          { id: 1, product_name: "Cotton T-Shirt" },
          { id: 2, product_name: "Denim Jeans" },
        ]);
        setTypes([{ id: 1, product_type_en: "Finished Goods" }]);
        setCategories([{ id: 1, category_name: "Garments" }]);
        setRecords([
          {
            id: 1,
            product_id: 1,
            product_type_id: 1,
            category_id: 1,
            product_name: "Cotton T-Shirt",
            type_name: "Finished Goods",
            category_name: "Garments",
            warehouse: "Main Godown",
            quantity: 500,
            stock_date: "2024-01-01",
          },
          {
            id: 2,
            product_id: 2,
            product_type_id: 1,
            category_id: 1,
            product_name: "Denim Jeans",
            type_name: "Finished Goods",
            category_name: "Garments",
            warehouse: "Store A",
            quantity: 200,
            stock_date: "2024-01-01",
          },
        ]);
        return;
      }

      setProducts(productList);
      setTypes(typeList);
      setCategories(categoryList);
      setRecords(stockList);
    } catch {
      showToast("error", t.fetchError);
      setRecords([]);
    } finally {
      setLoading(false);
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedRecords = useMemo(
    () => records.map((r) => normalizeRecord(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, productMap, typeMap, categoryMap]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return normalizedRecords;
    return normalizedRecords.filter((r) =>
      [r.product_name, r.type_name, r.category_name, r.warehouse]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [normalizedRecords, search]);

  const summary = useMemo(() => {
    const uniqueWarehouses = new Set(
      filtered.map((r) => (r.warehouse || "").trim()).filter(Boolean)
    );
    return {
      totalRecords: filtered.length,
      totalQuantity: filtered.reduce((s, r) => s + Number(r.quantity || 0), 0),
      warehouses: uniqueWarehouses.size,
    };
  }, [filtered]);

  const openAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      product_id: String(r.product_id || ""),
      product_type_id: String(r.product_type_id || ""),
      category_id: String(r.category_id || ""),
      warehouse: r.warehouse || "",
      quantity: r.quantity || "",
      stock_date: r.stock_date || todayInputValue(),
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product_id || !form.quantity) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      product_id: Number(form.product_id),
      product_type_id: form.product_type_id ? Number(form.product_type_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      warehouse: form.warehouse?.trim() || "",
      quantity: Number(form.quantity || 0),
      stock_date: form.stock_date || null,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await axios.put(`${API_BASE}/opening-stock/${editingId}`, payload);
        showToast("success", t.successUpdate);
      } else {
        await axios.post(`${API_BASE}/opening-stock`, payload);
        showToast("success", t.successSave);
      }
      await fetchData();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } catch {
      const prod = products.find((p) => String(recId(p)) === String(form.product_id));
      const tp = types.find((p) => String(recId(p)) === String(form.product_type_id));
      const cat = categories.find((p) => String(recId(p)) === String(form.category_id));
      const fallbackRecord = {
        ...payload,
        id: editingId || Date.now(),
        product_name: prod ? productName(prod) : "-",
        type_name: tp ? typeName(tp) : "-",
        category_name: cat ? categoryName(cat) : "-",
      };
      setRecords((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? fallbackRecord : r)) : [fallbackRecord, ...prev]
      );
      showToast("success", editingId ? t.successUpdate : t.successSave);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API_BASE}/opening-stock/${id}`);
      showToast("success", t.successDelete);
      fetchData();
    } catch {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("success", t.successDelete);
    }
  };

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', Arial, sans-serif";
    const rowsHtml = filtered
      .map(
        (r, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td><strong>${r.product_name || "-"}</strong></td>
          <td>${r.type_name || "-"}</td>
          <td>${r.category_name || "-"}</td>
          <td>${r.warehouse || "-"}</td>
          <td class="center strong">${fmt(r.quantity)}</td>
          <td>${r.stock_date || "-"}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="UTF-8"/><title>${t.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}body{font-family:${font};background:#f8fafc;color:#0f172a;padding:22px}.sheet{max-width:1280px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px rgba(15,23,42,.10);border:1px solid #e2e8f0}.header{background:#0f172a;color:white;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-size:28px;font-weight:800;letter-spacing:-.4px}.report-title{font-size:13px;color:#cbd5e1;margin-top:4px}.meta{text-align:${isUrdu ? "left" : "right"};font-size:12px;color:#cbd5e1;line-height:1.8}.content{padding:18px}.print-inst{background:#EFF6FF;color:#285DB8;padding:12px 14px;text-align:center;border-radius:12px;margin-bottom:16px;border:1px solid #DBEAFE;font-size:13px;font-weight:700}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:12px 14px}.card small{display:block;color:#64748b;font-size:11px;font-weight:700;margin-bottom:5px}.card strong{font-size:20px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0}th{background:#0f172a;color:#fff;text-align:${isUrdu ? "right" : "left"};padding:12px 10px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px}td{border-bottom:1px solid #f1f5f9;padding:11px 10px;color:#334155;vertical-align:middle}tr:nth-child(even) td{background:#f8fafc}.center{text-align:center!important}.strong{font-weight:800;color:#0f172a}@media print{body{padding:0;background:white}.sheet{box-shadow:none;border-radius:0;border:0}.print-inst{display:none}}
</style></head><body><div class="sheet"><div class="header"><div><div class="brand">Ali Cages</div><div class="report-title">${t.reportHeader}</div></div><div class="meta">${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div></div><div class="content">${isPdf ? `<div class="print-inst">Please select <strong>"Save as PDF"</strong> in the print dialog.</div>` : ""}<div class="summary"><div class="card"><small>${t.totalRecords}</small><strong>${summary.totalRecords}</strong></div><div class="card"><small>${t.totalQuantity}</small><strong>${fmt(summary.totalQuantity)}</strong></div><div class="card"><small>${t.warehouses}</small><strong>${summary.warehouses}</strong></div></div><table><thead><tr><th class="center" style="width:55px">#</th><th>${t.product}</th><th>${t.productType}</th><th>${t.category}</th><th>${t.warehouse}</th><th class="center">${t.quantity}</th><th>${t.stockDate}</th></tr></thead><tbody>${filtered.length ? rowsHtml : `<tr><td colspan="7" style="text-align:center;padding:34px">${t.noRecords}</td></tr>`}</tbody></table></div></div><script>window.onload=()=>{setTimeout(()=>{window.print();${!isPdf ? "window.onafterprint=()=>window.close();" : ""}},300);};</script></body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const fieldLabel = "block text-[10.5px] leading-none font-extrabold uppercase tracking-[0.08em] text-slate-500 mb-1.5";
  const inputCls = `w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${isUrdu ? "text-right" : ""}`;
  const iconInputCls = `${inputCls} ${isUrdu ? "pr-9 pl-3" : "pl-9 pr-3"}`;

  return (
    <div dir={dir} style={{ fontFamily: baseFont }} className="min-h-screen bg-[#f8fafc] p-3 sm:p-4 pb-16">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        * { box-sizing: border-box; }
        .same-btn { transition: all .15s ease; }
        .same-btn:hover { transform: translateY(-1px); }
        .same-dark-table th { background:#111827!important; color:#fff!important; font-size:11px!important; text-transform:uppercase; letter-spacing:.04em; padding:11px 14px!important; white-space:nowrap; }
        .same-dark-table td { padding:12px 14px!important; border-bottom:1px solid #f1f5f9!important; }
      `}</style>

      {message.text && (
        <div className={`fixed bottom-6 ${isUrdu ? "left-6" : "right-6"} z-50 px-5 py-2.5 rounded-lg shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${message.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
          <i className={`bi ${message.type === "error" ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"}`}></i>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-slate-950">{t.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div className={`flex gap-2 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
              <button onClick={() => setLang(lang === "en" ? "ur" : "en")} className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
                <i className="bi bi-translate"></i>
                {t.toggleLang}
              </button>

              <button onClick={() => setShowSummary((v) => !v)} className={`same-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm ${showSummary ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
                <i className="bi bi-bar-chart-line-fill"></i>
                {t.summaryBtn}
                <i className={`bi bi-chevron-${showSummary ? "up" : "down"} text-xs`}></i>
              </button>

              <button onClick={openAdd} className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                <i className="bi bi-plus-circle-fill"></i>
                {t.addBtn}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="mt-5 pt-5 border-t border-slate-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-950">{t.summaryTitle}</h3>
                <p className="text-sm text-slate-500">{t.summarySubtitle}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-white text-indigo-600 flex items-center justify-center shadow-sm mb-3"><i className="bi bi-clipboard-data-fill"></i></div>
                  <p className="text-xs text-slate-500 mb-1">{t.totalRecords}</p>
                  <p className="text-3xl font-extrabold text-slate-950">{summary.totalRecords}</p>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-white text-emerald-600 flex items-center justify-center shadow-sm mb-3"><i className="bi bi-boxes"></i></div>
                  <p className="text-xs text-slate-500 mb-1">{t.totalQuantity}</p>
                  <p className="text-2xl font-extrabold text-slate-950">{fmt(summary.totalQuantity)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-lg bg-white text-amber-600 flex items-center justify-center shadow-sm mb-3"><i className="bi bi-building-fill"></i></div>
                  <p className="text-xs text-slate-500 mb-1">{t.warehouses}</p>
                  <p className="text-2xl font-extrabold text-slate-950">{summary.warehouses}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className={`flex items-center justify-between flex-wrap gap-3 mb-4 ${isUrdu ? "flex-row-reverse" : ""}`}>
          <div className="relative w-full max-w-md">
            <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-4" : "left-4"}`}></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm ${isUrdu ? "pr-11 pl-4 text-right" : "pl-11 pr-4"}`} />
          </div>

          <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
            <button onClick={() => generatePrintDocument(false)} className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
              <i className="bi bi-printer-fill"></i>
              {t.printBtn}
            </button>
            <button onClick={() => generatePrintDocument(true)} className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
              <i className="bi bi-file-earmark-pdf-fill"></i>
              {t.pdfBtn}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="same-dark-table w-full text-sm text-slate-600 min-w-[980px]">
              <thead>
                <tr className="bg-slate-950 text-white text-[11px] font-extrabold uppercase tracking-wide border-b border-slate-900">
                  <th className={`${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`${isUrdu ? "text-right" : "text-left"}`}>{t.product}</th>
                  <th className={`${isUrdu ? "text-right" : "text-left"}`}>{t.productType}</th>
                  <th className={`${isUrdu ? "text-right" : "text-left"}`}>{t.category}</th>
                  <th className={`${isUrdu ? "text-right" : "text-left"}`}>{t.warehouse}</th>
                  <th className="text-center">{t.quantity}</th>
                  <th className={`${isUrdu ? "text-right" : "text-left"}`}>{t.stockDate}</th>
                  <th className="text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400"><i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">{t.loading}</p></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-14 text-center text-slate-400"><i className="bi bi-inbox text-4xl block mb-2 opacity-30"></i>{t.noRecords}</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3"><div className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}><div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0"><i className="bi bi-box-seam-fill"></i></div><span className="font-bold text-slate-950">{r.product_name}</span></div></td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{r.type_name || "-"}</span></td>
                      <td className="px-4 py-3"><span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">{r.category_name || "-"}</span></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold"><i className="bi bi-building text-[10px]"></i>{r.warehouse || "-"}</span></td>
                      <td className="px-4 py-3 text-center"><span className="font-bold text-slate-950 bg-slate-100 px-3 py-1 rounded-full text-sm border border-slate-200 font-mono">{fmt(r.quantity)}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">{r.stock_date || "-"}</td>
                      <td className="px-4 py-3"><div className={`flex items-center justify-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}><button onClick={() => openEdit(r)} className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center" title={t.edit}><i className="bi bi-pencil-square"></i></button><button onClick={() => handleDelete(r.id)} className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition flex items-center justify-center" title={t.delete}><i className="bi bi-trash3-fill"></i></button></div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" dir={dir}>
              <div className={`px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white ${isUrdu ? "flex-row-reverse text-right" : ""}`}>
                <div className={`flex items-center gap-3 min-w-0 ${isUrdu ? "flex-row-reverse" : ""}`}>
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center"><i className="bi bi-boxes text-indigo-700 text-lg"></i></div>
                  <div><h2 className="text-xl font-extrabold text-slate-950">{editingId ? t.formTitleEdit : t.formTitleAdd}</h2><p className="text-sm text-slate-500 mt-0.5">{t.formSubtitle}</p></div>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition flex items-center justify-center"><i className="bi bi-x-lg text-sm"></i></button>
              </div>

              <div className="p-4 overflow-y-auto bg-slate-50/40">
                <section className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 ${isUrdu ? "flex-row-reverse text-right" : ""}`}>
                    <div className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}><div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center"><i className="bi bi-clipboard-data-fill"></i></div><div><h3 className="text-sm font-extrabold text-slate-950 m-0">{t.stockInfo}</h3><p className="text-[11px] text-slate-500 mt-0.5 m-0">{t.formSubtitle}</p></div></div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1"><i className="bi bi-asterisk text-rose-500"></i>{t.required}</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6"><label className={fieldLabel}>{t.product} <span className="text-rose-500">*</span></label><div className="relative"><i className={`bi bi-box-seam absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} disabled={masterLoading} className={`${iconInputCls} appearance-none`}><option value="">{t.selectProduct}</option>{products.map((p) => <option key={recId(p)} value={recId(p)}>{productName(p)}</option>)}</select><i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i></div></div>
                    <div className="md:col-span-3"><label className={fieldLabel}>{t.productType}</label><div className="relative"><i className={`bi bi-diagram-2 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><select value={form.product_type_id} onChange={(e) => setForm({ ...form, product_type_id: e.target.value })} disabled={masterLoading} className={`${iconInputCls} appearance-none`}><option value="">{t.selectType}</option>{types.map((tp) => <option key={recId(tp)} value={recId(tp)}>{typeName(tp)}</option>)}</select><i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i></div></div>
                    <div className="md:col-span-3"><label className={fieldLabel}>{t.category}</label><div className="relative"><i className={`bi bi-tags absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} disabled={masterLoading} className={`${iconInputCls} appearance-none`}><option value="">{t.selectCategory}</option>{categories.map((c) => <option key={recId(c)} value={recId(c)}>{categoryName(c)}</option>)}</select><i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i></div></div>
                    <div className="md:col-span-4"><label className={fieldLabel}>{t.warehouse}</label><div className="relative"><i className={`bi bi-building absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><input type="text" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} placeholder={t.warehousePlaceholder} className={iconInputCls} /></div></div>
                    <div className="md:col-span-4"><label className={fieldLabel}>{t.quantity} <span className="text-rose-500">*</span></label><div className="relative"><i className={`bi bi-boxes absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder={t.quantityPlaceholder} className={`${iconInputCls} font-mono font-bold`} /></div></div>
                    <div className="md:col-span-4"><label className={fieldLabel}>{t.stockDate}</label><div className="relative"><i className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i><input type="date" value={form.stock_date} onChange={(e) => setForm({ ...form, stock_date: e.target.value })} className={iconInputCls} /></div></div>
                  </div>
                </section>
              </div>

              <div className={`px-5 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}>
                <div className={`hidden sm:flex items-center gap-2 text-[12px] font-bold text-slate-500 ${isUrdu ? "flex-row-reverse" : ""}`}><span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center"><i className="bi bi-shield-check"></i></span>{t.readyToSave}</div>
                <div className={`flex items-center gap-3 flex-1 sm:flex-none ${isUrdu ? "flex-row-reverse" : ""}`}><button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 w-full sm:w-36 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition disabled:opacity-60">{t.cancel}</button><button type="button" onClick={handleSave} disabled={submitting || masterLoading} className="h-10 w-full sm:w-40 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"><i className={`bi ${submitting ? "bi-arrow-repeat animate-spin" : "bi-save-fill"}`}></i>{submitting ? t.saving : t.save}</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
