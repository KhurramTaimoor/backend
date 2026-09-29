import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LANG = {
  en: {
    title: "Stock Receive",
    subtitle: "Manage goods receipt notes (GRN) and incoming stock",
    addBtn: "Receive Stock",
    editEntry: "Edit Stock Receive",
    newEntry: "New Stock Receive",
    searchPlaceholder: "Search by GRN, supplier, product, unit, category or type...",
    grnNo: "GRN No",
    receiveDate: "Receive Date",
    supplier: "Supplier",
    supplierPlaceholder: "Select supplier",
    product: "Product",
    productPlaceholder: "Select product",
    category: "Category",
    categoryPlaceholder: "Select category",
    unit: "Unit",
    unitPlaceholder: "Select unit",
    type: "Product Type",
    typePlaceholder: "Select type",
    receivedQty: "Received Qty",
    save: "Save",
    update: "Update",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    noRecords: "No stock receive records found.",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "Stock Receive (GRN) Report",
    printedOn: "Printed On",
    successSave: "Stock received successfully!",
    successUpdate: "Record updated successfully!",
    errorMsg: "Please fill all required fields (GRN No, Supplier and at least one product).",
    deleteConfirm: "Are you sure you want to delete this record?",
    addItem: "Add Product",
    removeItem: "Remove",
    itemNo: "Item",
    products: "Products",
    loadError: "Failed to load data from server.",
    savingError: "Failed to save record.",
    deletingError: "Failed to delete record.",
    deleteSuccess: "Record deleted successfully!",
    loading: "Loading...",
    optional: "Optional",
    summaryBtn: "View Summary",
    summaryTitle: "Stock Receive Summary",
    summarySubtitle: "Overview of visible GRN records",
    totalRecords: "Total GRNs",
    totalItems: "Total Items",
    totalQty: "Total Received Qty",
    required: "Required",
    formSubtitle: "GRN information and incoming stock items",
    readyToSave: "Ready to save stock receive",
    records: "Records",
  },
  ur: {
    title: "اسٹاک کی وصولی",
    subtitle: "گڈز ریسیٹ نوٹس (GRN) اور آنے والے اسٹاک کا انتظام کریں",
    addBtn: "اسٹاک وصول کریں",
    editEntry: "اسٹاک وصولی میں ترمیم",
    newEntry: "نئی اسٹاک وصولی",
    searchPlaceholder: "جی آر این، سپلائر، پروڈکٹ، یونٹ، کیٹیگری یا ٹائپ سے تلاش کریں...",
    grnNo: "جی آر این نمبر",
    receiveDate: "وصولی کی تاریخ",
    supplier: "سپلائر",
    supplierPlaceholder: "سپلائر منتخب کریں",
    product: "پروڈکٹ",
    productPlaceholder: "پروڈکٹ منتخب کریں",
    category: "کیٹیگری",
    categoryPlaceholder: "کیٹیگری منتخب کریں",
    unit: "یونٹ",
    unitPlaceholder: "یونٹ منتخب کریں",
    type: "پروڈکٹ کی قسم",
    typePlaceholder: "قسم منتخب کریں",
    receivedQty: "وصول شدہ مقدار",
    save: "محفوظ کریں",
    update: "اپ ڈیٹ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    noRecords: "اسٹاک وصولی کا کوئی ریکارڈ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "اسٹاک وصولی (GRN) کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "اسٹاک کامیابی سے وصول کر لیا گیا!",
    successUpdate: "ریکارڈ کامیابی سے اپڈیٹ ہو گیا!",
    errorMsg: "براہ کرم تمام لازمی خانے پُر کریں (جی آر این نمبر، سپلائر، اور کم از کم ایک پروڈکٹ)۔",
    deleteConfirm: "کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟",
    addItem: "پروڈکٹ شامل کریں",
    removeItem: "ہٹائیں",
    itemNo: "آئٹم",
    products: "پروڈکٹس",
    loadError: "سرور سے ڈیٹا لوڈ نہیں ہو سکا۔",
    savingError: "ریکارڈ محفوظ نہیں ہو سکا۔",
    deletingError: "ریکارڈ حذف نہیں ہو سکا۔",
    deleteSuccess: "ریکارڈ کامیابی سے حذف ہو گیا!",
    loading: "لوڈ ہو رہا ہے...",
    optional: "اختیاری",
    summaryBtn: "سمری دیکھیں",
    summaryTitle: "اسٹاک وصولی سمری",
    summarySubtitle: "نظر آنے والے جی آر این ریکارڈز کا خلاصہ",
    totalRecords: "کل جی آر این",
    totalItems: "کل آئٹمز",
    totalQty: "کل وصول شدہ مقدار",
    required: "ضروری",
    formSubtitle: "جی آر این معلومات اور آنے والے اسٹاک آئٹمز",
    readyToSave: "اسٹاک وصولی محفوظ کرنے کے لیے تیار",
    records: "ریکارڈز",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const emptyItem = () => ({
  product_name: "",
  category_name: "",
  unit_name: "",
  type_name: "",
  received_qty: "",
});

const emptyForm = {
  grn_no: "",
  receive_date: "",
  supplier_name: "",
  items: [emptyItem()],
};

const numberFmt = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.products)) return data.products;
  return [];
};

const pickLabel = (item, keys = []) => {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null &&
      `${item[key]}`.trim() !== ""
    ) {
      return `${item[key]}`.trim();
    }
  }
  return "";
};

const extractOptions = (data, preferredKeys = []) => {
  const list = getList(data);

  return list
    .map((item, index) => {
      const value =
        pickLabel(item, preferredKeys) ||
        pickLabel(item, [
          "name",
          "product_name",
          "supplier_name",
          "unit_name",
          "category_name",
          "type_name",
          "product_type_en",
          "product_type_ur",
          "title",
        ]) ||
        `${item?.id ?? index}`;

      return value ? value : "";
    })
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
};

const normalizeRecord = (r) => ({
  id: r?.id,
  grn_no: r?.grn_no || "",
  receive_date: r?.receive_date || "",
  supplier_name: r?.supplier_name || r?.supplier || "",
  items: Array.isArray(r?.items)
    ? r.items.map((item) => ({
        id: item?.id,
        product_name: item?.product_name || "",
        category_name: item?.category_name || "",
        unit_name: item?.unit_name || "",
        type_name: item?.type_name || "",
        received_qty: item?.received_qty ?? "",
      }))
    : [],
});

export default function StockReceivePage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [supplierOptions, setSupplierOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  const baseFont = isUrdu
    ? "'Noto Nastaliq Urdu', serif"
    : "Helvetica, 'Helvetica Neue', Arial, sans-serif";

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [
        stockRes,
        suppliersRes,
        productsRes,
        unitsRes,
        categoriesRes,
        productTypesRes,
      ] = await Promise.allSettled([
        axios.get(`${API_BASE}/stock-receive`),
        axios.get(`${API_BASE}/suppliers`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/units`),
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/product-types`),
      ]);

      const stockList =
        stockRes.status === "fulfilled"
          ? getList(stockRes.value?.data)
          : [];

      const suppliersData =
        suppliersRes.status === "fulfilled" ? suppliersRes.value?.data : [];
      const productsData =
        productsRes.status === "fulfilled" ? productsRes.value?.data : [];
      const unitsData =
        unitsRes.status === "fulfilled" ? unitsRes.value?.data : [];
      const categoriesData =
        categoriesRes.status === "fulfilled" ? categoriesRes.value?.data : [];
      const productTypesData =
        productTypesRes.status === "fulfilled" ? productTypesRes.value?.data : [];

      setRecords(stockList.map(normalizeRecord));
      setSupplierOptions(extractOptions(suppliersData, ["supplier_name", "name"]));
      setProductOptions(extractOptions(productsData, ["product_name", "name"]));
      setUnitOptions(extractOptions(unitsData, ["unit_name", "name"]));
      setCategoryOptions(extractOptions(categoriesData, ["category_name", "name"]));
      setTypeOptions(
        extractOptions(productTypesData, [
          "product_type_en",
          "type_name",
          "name",
          "product_type_ur",
        ])
      );
    } catch (error) {
      console.error("Fetch error:", error);
      setRecords([]);
      showToast("error", t.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage({ type: "", text: "" });
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/stock-receive/${id}`);
      const data = normalizeRecord(res.data?.data || res.data);

      setEditingId(data.id);
      setForm({
        grn_no: data.grn_no || "",
        receive_date: data.receive_date || "",
        supplier_name: data.supplier_name || "",
        items:
          data.items?.length > 0
            ? data.items.map((item) => ({
                id: item.id,
                product_name: item.product_name || "",
                category_name: item.category_name || "",
                unit_name: item.unit_name || "",
                type_name: item.type_name || "",
                received_qty: item.received_qty ?? "",
              }))
            : [emptyItem()],
      });

      setShowForm(true);
    } catch (error) {
      console.error("Edit fetch error:", error);
      showToast("error", t.loadError);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const validItems = form.items.filter((item) => item.product_name);

    if (!form.grn_no || !form.supplier_name || validItems.length === 0) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      grn_no: form.grn_no,
      receive_date: form.receive_date || "",
      supplier_name: form.supplier_name,
      items: validItems.map((item) => ({
        product_name: item.product_name,
        category_name: item.category_name || "",
        unit_name: item.unit_name || "",
        type_name: item.type_name || "",
        received_qty: item.received_qty || "",
      })),
    };

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${API_BASE}/stock-receive/${editingId}`, payload);
        showToast("success", t.successUpdate);
      } else {
        await axios.post(`${API_BASE}/stock-receive`, payload);
        showToast("success", t.successSave);
      }

      await fetchAll();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      showToast("error", t.savingError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      const res = await axios.delete(`${API_BASE}/stock-receive/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("success", res?.data?.message || t.deleteSuccess);
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", t.deletingError);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return records;

    return records.filter(
      (r) =>
        (r.grn_no || "").toLowerCase().includes(q) ||
        (r.supplier_name || "").toLowerCase().includes(q) ||
        r.items?.some(
          (item) =>
            (item.product_name || "").toLowerCase().includes(q) ||
            (item.category_name || "").toLowerCase().includes(q) ||
            (item.unit_name || "").toLowerCase().includes(q) ||
            (item.type_name || "").toLowerCase().includes(q)
        )
    );
  }, [records, search]);

  const summary = useMemo(() => {
    const totalItems = filtered.reduce((sum, r) => sum + (r.items?.length || 0), 0);
    const totalQty = filtered.reduce(
      (sum, r) =>
        sum +
        (r.items || []).reduce(
          (itemSum, item) => itemSum + Number(item.received_qty || 0),
          0
        ),
      0
    );

    return {
      totalRecords: filtered.length,
      totalItems,
      totalQty,
    };
  }, [filtered]);

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', Arial, sans-serif";

    const rowsHtml = filtered
      .map((r, i) => {
        const itemsHtml = (r.items || [])
          .map(
            (item) => `
              <div class="item-line">
                <strong>${item.product_name || "-"}</strong>
                <small>${item.category_name || "-"} | ${item.unit_name || "-"} | ${item.type_name || "-"} | Qty: ${item.received_qty || 0}</small>
              </div>
            `
          )
          .join("");

        const totalQty = (r.items || []).reduce(
          (sum, item) => sum + Number(item.received_qty || 0),
          0
        );

        return `
          <tr>
            <td class="center">${i + 1}</td>
            <td><strong>${r.grn_no || "-"}</strong></td>
            <td>${r.receive_date || "-"}</td>
            <td>${r.supplier_name || "-"}</td>
            <td>${itemsHtml || "-"}</td>
            <td class="center strong">${totalQty}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="UTF-8" />
        <title>${t.reportHeader}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:${font};background:#f8fafc;color:#0f172a;padding:22px;}
          .sheet{max-width:1280px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px rgba(15,23,42,.10);border:1px solid #e2e8f0;}
          .header{background:#0f172a;color:white;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;}
          .brand{font-size:28px;font-weight:800;letter-spacing:-.4px;}
          .report-title{font-size:13px;color:#cbd5e1;margin-top:4px;}
          .meta{text-align:${isUrdu ? "left" : "right"};font-size:12px;color:#cbd5e1;line-height:1.8;}
          .content{padding:18px;}
          .hint{background:#EFF6FF;color:#285DB8;padding:12px 14px;text-align:center;border-radius:12px;margin-bottom:16px;border:1px solid #DBEAFE;font-size:13px;font-weight:700;}
          table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;overflow:hidden;}
          th{background:#0f172a;color:#fff;text-align:${isUrdu ? "right" : "left"};padding:12px 10px;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
          td{border-bottom:1px solid #f1f5f9;padding:11px 10px;color:#334155;vertical-align:top;}
          tr:nth-child(even) td{background:#f8fafc;}
          .center{text-align:center!important;}
          .strong{font-weight:800;color:#0f172a;}
          .item-line{margin-bottom:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:8px 10px;}
          .item-line small{display:block;font-size:11px;color:#64748b;margin-top:3px;}
          @media print{body{padding:0;background:white}.sheet{box-shadow:none;border-radius:0;border:0}.hint{display:none}}
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div>
              <div class="brand">Ali Cages</div>
              <div class="report-title">${t.reportHeader}</div>
            </div>
            <div class="meta">${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
          </div>
          <div class="content">
            ${isPdf ? `<div class="hint">Select <strong>"Save as PDF"</strong> in the print dialog.</div>` : ""}
            <table>
              <thead>
                <tr>
                  <th class="center">#</th>
                  <th>${t.grnNo}</th>
                  <th>${t.receiveDate}</th>
                  <th>${t.supplier}</th>
                  <th>${t.products}</th>
                  <th class="center">${t.receivedQty}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="6" style="text-align:center;padding:34px">${t.noRecords}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <script>
          window.onload=()=>{setTimeout(()=>{window.print();${!isPdf ? "window.onafterprint=()=>window.close();" : ""}},300);}
        </script>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const fieldLabel =
    "block text-[10.5px] leading-none font-extrabold uppercase tracking-[0.06em] text-slate-500 mb-1.5";
  const fieldInput = `w-full h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${
    isUrdu ? "text-right" : ""
  }`;
  const fieldIconLeft = isUrdu ? "pr-9 pl-8" : "pl-9 pr-8";

  return (
    <div
      dir={dir}
      style={{ fontFamily: baseFont }}
      className="min-h-screen bg-[#f8fafc] p-3 sm:p-4 pb-16"
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * { box-sizing: border-box; }
        .sr-btn { transition: all .15s ease; }
        .sr-btn:hover { transform: translateY(-1px); }
        .sr-scroll::-webkit-scrollbar { width: 7px; height: 7px; }
        .sr-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .sr-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        @keyframes srModalIn { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes srToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .sr-modal-in { animation: srModalIn .22s ease-out both; }
        .sr-toast-in { animation: srToastIn .18s ease-out both; }
      `}</style>

      {message.text && (
        <div
          className={`sr-toast-in fixed bottom-6 ${
            isUrdu ? "left-6" : "right-6"
          } z-[70] px-5 py-2.5 rounded-lg shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
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

      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-slate-950">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div className={`flex gap-2 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
              <button
                onClick={() => setLang((prev) => (prev === "en" ? "ur" : "en"))}
                className="sr-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-translate"></i>
                {t.toggleLang}
              </button>

              <button
                onClick={() => setShowSummary((v) => !v)}
                className={`sr-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm ${
                  showSummary
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <i className="bi bi-bar-chart-line-fill"></i>
                {t.summaryBtn}
                <i className={`bi bi-chevron-${showSummary ? "up" : "down"} text-xs`}></i>
              </button>

              <button
                onClick={() => generatePrintDocument(false)}
                className="sr-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-printer"></i>
                {t.printBtn}
              </button>

              <button
                onClick={() => generatePrintDocument(true)}
                className="sr-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-file-earmark-pdf-fill"></i>
                {t.pdfBtn}
              </button>

              <button
                onClick={openAdd}
                className="sr-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                <i className="bi bi-box-arrow-in-down"></i>
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
                {[
                  {
                    label: t.totalRecords,
                    value: summary.totalRecords,
                    icon: "bi-receipt-cutoff",
                    tone: "text-indigo-600",
                  },
                  {
                    label: t.totalItems,
                    value: summary.totalItems,
                    icon: "bi-box-seam-fill",
                    tone: "text-sky-600",
                  },
                  {
                    label: t.totalQty,
                    value: numberFmt(summary.totalQty),
                    icon: "bi-boxes",
                    tone: "text-emerald-600",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg bg-white ${card.tone} flex items-center justify-center shadow-sm mb-3`}
                    >
                      <i className={`bi ${card.icon}`}></i>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                    <p className="text-3xl font-extrabold text-slate-950">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div
          className={`flex items-center justify-between flex-wrap gap-3 mb-4 ${
            isUrdu ? "flex-row-reverse" : ""
          }`}
        >
          <div className="relative w-full max-w-md">
            <i
              className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                isUrdu ? "right-4" : "left-4"
              }`}
            ></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm ${
                isUrdu ? "pr-11 pl-4 text-right" : "pl-11 pr-4"
              }`}
            />
          </div>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600 min-w-[1100px]">
              <thead>
                <tr className="bg-slate-950 text-white text-[11px] font-extrabold uppercase tracking-wide border-b border-slate-900">
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>
                    #
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.grnNo}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.receiveDate}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.supplier}
                  </th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>
                    {t.products}
                  </th>
                  <th className="px-4 py-3 text-center">{t.receivedQty}</th>
                  <th className="px-4 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                      <p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                      <i className="bi bi-inbox text-4xl block mb-2 opacity-30"></i>
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const totalQty = (r.items || []).reduce(
                      (sum, item) => sum + Number(item.received_qty || 0),
                      0
                    );

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition align-top">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                          {i + 1}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-100">
                            <i className="bi bi-receipt"></i>
                            {r.grn_no || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700 font-semibold text-xs">
                          {r.receive_date || "-"}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-950">
                          <div
                            className={`flex items-center gap-2 ${
                              isUrdu ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                              <i className="bi bi-person-badge-fill"></i>
                            </div>
                            <span>{r.supplier_name || "-"}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            {(r.items || []).map((item, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
                              >
                                <div
                                  className={`flex items-center justify-between gap-2 flex-wrap ${
                                    isUrdu ? "flex-row-reverse" : ""
                                  }`}
                                >
                                  <div className="font-bold text-slate-900">
                                    {item.product_name || "-"}
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-black font-mono">
                                    {item.received_qty || 0}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {item.category_name || "-"} | {item.unit_name || "-"} |{" "}
                                  {item.type_name || "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-12 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-950 font-mono font-extrabold">
                            {numberFmt(totalQty)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div
                            className={`flex items-center justify-center gap-2 ${
                              isUrdu ? "flex-row-reverse" : ""
                            }`}
                          >
                            <button
                              onClick={() => openEdit(r.id)}
                              className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center"
                              title={t.edit}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition flex items-center justify-center"
                              title={t.delete}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
              className="sr-modal-in bg-white rounded-[22px] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col"
              dir={dir}
            >
              <div
                className={`px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 ${
                  isUrdu ? "flex-row-reverse text-right" : ""
                }`}
              >
                <div
                  className={`flex items-center gap-3 ${
                    isUrdu ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <i className="bi bi-box-arrow-in-down text-indigo-700 text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950">
                      {editingId ? t.editEntry : t.newEntry}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t.formSubtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="w-9 h-9 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="p-5 overflow-y-auto sr-scroll">
                <section className="bg-white border border-slate-200 rounded-[18px] shadow-sm overflow-hidden mb-4">
                  <div
                    className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 ${
                      isUrdu ? "flex-row-reverse text-right" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center gap-3 ${
                        isUrdu ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <i className="bi bi-file-earmark-text-fill"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-950 m-0">
                          GRN Information
                        </h3>
                        <p className="text-xs text-slate-500 m-0">
                          Supplier, GRN number and date
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                      <i className="bi bi-asterisk text-rose-500"></i>
                      {t.required}
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={fieldLabel}>
                        {t.grnNo} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <i
                          className={`bi bi-hash absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                            isUrdu ? "right-3" : "left-3"
                          }`}
                        ></i>
                        <input
                          type="text"
                          value={form.grn_no}
                          onChange={(e) => setForm({ ...form, grn_no: e.target.value })}
                          placeholder="GRN-001"
                          className={`${fieldInput} ${fieldIconLeft}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabel}>
                        {t.receiveDate}{" "}
                        <span className="text-slate-400 text-[10px] normal-case tracking-normal">
                          ({t.optional})
                        </span>
                      </label>
                      <div className="relative">
                        <i
                          className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                            isUrdu ? "right-3" : "left-3"
                          }`}
                        ></i>
                        <input
                          type="date"
                          value={form.receive_date}
                          onChange={(e) =>
                            setForm({ ...form, receive_date: e.target.value })
                          }
                          className={`${fieldInput} ${fieldIconLeft}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabel}>
                        {t.supplier} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <i
                          className={`bi bi-person-badge absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                            isUrdu ? "right-3" : "left-3"
                          }`}
                        ></i>
                        <select
                          value={form.supplier_name}
                          onChange={(e) =>
                            setForm({ ...form, supplier_name: e.target.value })
                          }
                          className={`${fieldInput} ${fieldIconLeft} appearance-none`}
                        >
                          <option value="">{t.supplierPlaceholder}</option>
                          {supplierOptions.map((supplier, index) => (
                            <option key={`${supplier}-${index}`} value={supplier}>
                              {supplier}
                            </option>
                          ))}
                        </select>
                        <i
                          className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${
                            isUrdu ? "left-3" : "right-3"
                          }`}
                        ></i>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-[18px] shadow-sm overflow-hidden">
                  <div
                    className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 ${
                      isUrdu ? "flex-row-reverse text-right" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center gap-3 ${
                        isUrdu ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                        <i className="bi bi-box-seam-fill"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-950 m-0">
                          {t.products}
                        </h3>
                        <p className="text-xs text-slate-500 m-0">
                          Product, category, unit, type and quantity
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addItemRow}
                      className="sr-btn h-9 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shadow flex items-center gap-2"
                    >
                      <i className="bi bi-plus-lg"></i>
                      {t.addItem}
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {form.items.map((item, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 rounded-[18px] bg-slate-50 overflow-hidden"
                      >
                        <div
                          className={`px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-3 ${
                            isUrdu ? "flex-row-reverse text-right" : ""
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2 ${
                              isUrdu ? "flex-row-reverse" : ""
                            }`}
                          >
                            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black font-mono">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-950 m-0">
                                {t.itemNo} {index + 1}
                              </h4>
                              <p className="text-[11px] text-slate-500 m-0">
                                Incoming stock product row
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={form.items.length === 1}
                            className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
                            title={t.removeItem}
                          >
                            <i className="bi bi-trash3 text-xs"></i>
                          </button>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                          <div>
                            <label className={fieldLabel}>
                              {t.product} <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <i
                                className={`bi bi-box-seam absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                                  isUrdu ? "right-3" : "left-3"
                                }`}
                              ></i>
                              <select
                                value={item.product_name}
                                onChange={(e) =>
                                  updateItem(index, "product_name", e.target.value)
                                }
                                className={`${fieldInput} ${fieldIconLeft} appearance-none`}
                              >
                                <option value="">{t.productPlaceholder}</option>
                                {productOptions.map((product, pIndex) => (
                                  <option key={`${product}-${pIndex}`} value={product}>
                                    {product}
                                  </option>
                                ))}
                              </select>
                              <i
                                className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${
                                  isUrdu ? "left-3" : "right-3"
                                }`}
                              ></i>
                            </div>
                          </div>

                          <div>
                            <label className={fieldLabel}>
                              {t.category}{" "}
                              <span className="text-slate-400 text-[10px] normal-case tracking-normal">
                                ({t.optional})
                              </span>
                            </label>
                            <div className="relative">
                              <i
                                className={`bi bi-tags absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                                  isUrdu ? "right-3" : "left-3"
                                }`}
                              ></i>
                              <select
                                value={item.category_name}
                                onChange={(e) =>
                                  updateItem(index, "category_name", e.target.value)
                                }
                                className={`${fieldInput} ${fieldIconLeft} appearance-none`}
                              >
                                <option value="">{t.categoryPlaceholder}</option>
                                {categoryOptions.map((category, cIndex) => (
                                  <option key={`${category}-${cIndex}`} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              <i
                                className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${
                                  isUrdu ? "left-3" : "right-3"
                                }`}
                              ></i>
                            </div>
                          </div>

                          <div>
                            <label className={fieldLabel}>
                              {t.unit}{" "}
                              <span className="text-slate-400 text-[10px] normal-case tracking-normal">
                                ({t.optional})
                              </span>
                            </label>
                            <div className="relative">
                              <i
                                className={`bi bi-box absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                                  isUrdu ? "right-3" : "left-3"
                                }`}
                              ></i>
                              <select
                                value={item.unit_name}
                                onChange={(e) =>
                                  updateItem(index, "unit_name", e.target.value)
                                }
                                className={`${fieldInput} ${fieldIconLeft} appearance-none`}
                              >
                                <option value="">{t.unitPlaceholder}</option>
                                {unitOptions.map((unit, uIndex) => (
                                  <option key={`${unit}-${uIndex}`} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                              <i
                                className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${
                                  isUrdu ? "left-3" : "right-3"
                                }`}
                              ></i>
                            </div>
                          </div>

                          <div>
                            <label className={fieldLabel}>
                              {t.type}{" "}
                              <span className="text-slate-400 text-[10px] normal-case tracking-normal">
                                ({t.optional})
                              </span>
                            </label>
                            <div className="relative">
                              <i
                                className={`bi bi-diagram-2 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                                  isUrdu ? "right-3" : "left-3"
                                }`}
                              ></i>
                              <select
                                value={item.type_name}
                                onChange={(e) =>
                                  updateItem(index, "type_name", e.target.value)
                                }
                                className={`${fieldInput} ${fieldIconLeft} appearance-none`}
                              >
                                <option value="">{t.typePlaceholder}</option>
                                {typeOptions.map((type, tIndex) => (
                                  <option key={`${type}-${tIndex}`} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              <i
                                className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${
                                  isUrdu ? "left-3" : "right-3"
                                }`}
                              ></i>
                            </div>
                          </div>

                          <div>
                            <label className={fieldLabel}>
                              {t.receivedQty}{" "}
                              <span className="text-slate-400 text-[10px] normal-case tracking-normal">
                                ({t.optional})
                              </span>
                            </label>
                            <div className="relative">
                              <i
                                className={`bi bi-boxes absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                                  isUrdu ? "right-3" : "left-3"
                                }`}
                              ></i>
                              <input
                                type="number"
                                min="0"
                                value={item.received_qty}
                                onChange={(e) =>
                                  updateItem(index, "received_qty", e.target.value)
                                }
                                placeholder="0"
                                className={`${fieldInput} ${fieldIconLeft} font-mono font-bold`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div
                className={`px-5 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 flex-shrink-0 ${
                  isUrdu ? "flex-row-reverse" : "justify-between"
                }`}
              >
                <div
                  className={`hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 ${
                    isUrdu ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                    <i className="bi bi-shield-check"></i>
                  </span>
                  {t.readyToSave}
                </div>

                <div
                  className={`flex gap-3 flex-1 sm:flex-none ${
                    isUrdu ? "flex-row-reverse" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    disabled={submitting}
                    className="h-10 w-full sm:w-36 border border-slate-300 text-slate-700 px-5 rounded-lg font-semibold text-sm hover:bg-white transition bg-white disabled:opacity-60"
                  >
                    {t.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={submitting}
                    className="h-10 w-full sm:w-40 bg-indigo-600 text-white px-5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <i
                      className={`bi ${
                        submitting ? "bi-arrow-repeat animate-spin" : "bi-save-fill"
                      }`}
                    ></i>
                    {submitting ? "..." : editingId ? t.update : t.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
