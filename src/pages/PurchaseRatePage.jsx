import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LANG = {
  en: {
    title: "Purchase Rate",
    subtitle: "Manage multiple purchase rates for each supplier and product",
    addBtn: "Add Purchase Rate",
    summaryBtn: "Summary",
    searchPlaceholder: "Search by supplier, product, unit, category, type or rate...",
    supplier: "Supplier",
    rateListName: "Rate List Name",
    rateListPlaceholder: "e.g. Main Supplier Rates",
    product: "Product",
    unit: "Unit",
    category: "Category",
    type: "Type",
    rate: "Rate",
    quantity: "Qty",
    effectiveDate: "Effective Date",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    noRecords: "No records found.",
    toggleLang: "اردو",
    printBtn: "Print",
    pdfBtn: "Download PDF",
    reportHeader: "Purchase Rates List",
    printedOn: "Printed On",
    supplierPlaceholder: "Select supplier",
    productPlaceholder: "Select product",
    unitPlaceholder: "Select unit",
    categoryPlaceholder: "Select category",
    typePlaceholder: "Select type",
    quantityPlaceholder: "0",
    ratePlaceholder: "0.00",
    fetchError: "Failed to load purchase rates.",
    saveError: "Failed to save purchase rate.",
    deleteError: "Failed to delete purchase rate.",
    productRequiredError: "At least one product/rate row is required.",
    addProductRow: "Add Purchase Rate Row",
    removeProductRow: "Remove",
    productGroup: "Rate Set",
    loading: "Loading...",
    optional: "Optional",
    masterDataIssue: "Some master data could not be loaded.",
    totalSuppliers: "Total Suppliers",
    totalProducts: "Total Product Rows",
    totalRateRows: "Total Rate Sets",
    latestRate: "Latest Rate",
    formTitleAdd: "New Purchase Rate",
    formTitleEdit: "Edit Purchase Rate",
    formSubtitle: "One product can be repeated with multiple purchase rates, quantities and effective dates.",
    supplierInfo: "Supplier Information",
    supplierInfoSubtitle: "Select supplier for these purchase rates",
    rateDetails: "Purchase Rate Details",
    rateDetailsSubtitle: "Add multiple rate sets for the same product when needed",
    readyToSave: "Ready to save purchase rates",
    successSave: "Purchase rate saved successfully!",
    successDelete: "Purchase rate deleted successfully!",
    deleteConfirm: "Are you sure you want to delete this purchase rate group?",
    all: "All",
  },
  ur: {
    title: "خریداری کا ریٹ",
    subtitle: "ہر سپلائر اور پروڈکٹ کے ملٹیپل خریداری ریٹس مینج کریں",
    addBtn: "نیا خریداری ریٹ شامل کریں",
    summaryBtn: "سمری",
    searchPlaceholder: "سپلائر، پروڈکٹ، یونٹ، کیٹیگری، ٹائپ یا ریٹ سے تلاش کریں...",
    supplier: "سپلائر",
    rateListName: "ریٹ لسٹ نام",
    rateListPlaceholder: "مثلاً مین سپلائر ریٹس",
    product: "پروڈکٹ",
    unit: "یونٹ",
    category: "کیٹیگری",
    type: "ٹائپ",
    rate: "ریٹ",
    quantity: "تعداد",
    effectiveDate: "مؤثر تاریخ",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    noRecords: "کوئی ریکارڈ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "خریداری کے ریٹس کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
    supplierPlaceholder: "سپلائر منتخب کریں",
    productPlaceholder: "پروڈکٹ منتخب کریں",
    unitPlaceholder: "یونٹ منتخب کریں",
    categoryPlaceholder: "کیٹیگری منتخب کریں",
    typePlaceholder: "ٹائپ منتخب کریں",
    quantityPlaceholder: "0",
    ratePlaceholder: "0.00",
    fetchError: "خریداری کے ریٹس لوڈ نہیں ہو سکے۔",
    saveError: "خریداری کا ریٹ محفوظ نہیں ہو سکا۔",
    deleteError: "خریداری کا ریٹ حذف نہیں ہو سکا۔",
    productRequiredError: "کم از کم ایک پروڈکٹ/ریٹ لائن ضروری ہے۔",
    addProductRow: "خریداری ریٹ لائن شامل کریں",
    removeProductRow: "ہٹائیں",
    productGroup: "ریٹ سیٹ",
    loading: "لوڈ ہو رہا ہے...",
    optional: "اختیاری",
    masterDataIssue: "کچھ ماسٹر ڈیٹا لوڈ نہیں ہو سکا۔",
    totalSuppliers: "کل سپلائرز",
    totalProducts: "کل پروڈکٹ لائنز",
    totalRateRows: "کل ریٹ سیٹس",
    latestRate: "تازہ ریٹ",
    formTitleAdd: "نیا خریداری ریٹ",
    formTitleEdit: "خریداری ریٹ ترمیم",
    formSubtitle: "ایک ہی پروڈکٹ کو مختلف ریٹس، تعداد اور تاریخ کے ساتھ دوبارہ add کیا جا سکتا ہے۔",
    supplierInfo: "سپلائر معلومات",
    supplierInfoSubtitle: "ان خریداری ریٹس کے لیے سپلائر منتخب کریں",
    rateDetails: "خریداری ریٹ تفصیل",
    rateDetailsSubtitle: "ایک پروڈکٹ کے لیے multiple purchase rates add کریں",
    readyToSave: "خریداری ریٹس save کرنے کے لیے ready",
    successSave: "خریداری ریٹ محفوظ ہو گیا!",
    successDelete: "خریداری ریٹ حذف ہو گیا!",
    deleteConfirm: "کیا آپ واقعی یہ خریداری ریٹ گروپ حذف کرنا چاہتے ہیں؟",
    all: "سب",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const emptyProduct = () => ({
  product_name: "",
  unit_name: "",
  category_name: "",
  type_name: "",
  rate: "",
  quantity: "",
  effective_date: "",
});

const fmt = (v) =>
  Number(v || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getOptionLabel = (item) =>
  item?.name ||
  item?.title ||
  item?.label ||
  item?.supplier_name ||
  item?.supplier_name_en ||
  item?.product_name ||
  item?.product_name_en ||
  item?.product_item_en ||
  item?.unit_name ||
  item?.unit_name_en ||
  item?.category_name ||
  item?.category_name_en ||
  item?.type_name ||
  item?.type_name_en ||
  item?.product_type_en ||
  "";

const uniqueOptions = (data, mapper = getOptionLabel) => {
  const set = new Set();
  getList(data).forEach((item) => {
    const label = mapper(item);
    if (label) set.add(String(label));
  });
  return Array.from(set);
};

const getProducts = (record) => (Array.isArray(record?.products) ? record.products : []);

function generatePrintDocument(records, lang, isPdf = false) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', Arial, sans-serif";

  const rowsHtml = records
    .flatMap((record, recordIndex) => {
      const products = getProducts(record);
      if (!products.length) {
        return [
          `<tr>
            <td>${recordIndex + 1}</td>
            <td><strong>${record.supplier_name || "—"}</strong></td>
            <td colspan="7" style="text-align:center;color:#94a3b8">${t.noRecords}</td>
          </tr>`,
        ];
      }

      return products.map((product, productIndex) => `
        <tr>
          ${
            productIndex === 0
              ? `<td rowspan="${products.length}" class="center strong">${recordIndex + 1}</td>
                 <td rowspan="${products.length}" class="strong">${record.supplier_name || "—"}</td>`
              : ""
          }
          <td class="strong">${product.product_name || "—"}</td>
          <td>${product.category_name || "—"}</td>
          <td>${product.type_name || "—"}</td>
          <td class="center">${product.unit_name || "—"}</td>
          <td class="num">${product.quantity > 0 ? fmt(product.quantity) : "—"}</td>
          <td class="num strong blue">${product.rate !== null && product.rate !== undefined && product.rate !== "" ? `PKR ${fmt(product.rate)}` : "—"}</td>
          <td class="center">${product.effective_date || "—"}</td>
        </tr>`);
    })
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>${t.reportHeader}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:${font};background:#f8fafc;color:#0f172a;padding:18px}
    .sheet{max-width:1400px;margin:0 auto;background:white;border:1px solid #dbeafe;border-radius:22px;overflow:hidden;box-shadow:0 16px 44px rgba(15,23,42,.10)}
    .header{background:linear-gradient(135deg,#0f172a 0%,#17344D 48%,#0B4E9B 100%);color:white;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;gap:20px}
    .brand h1{font-size:28px;font-weight:850;letter-spacing:-.6px}.brand p{font-size:12px;color:rgba(255,255,255,.72);margin-top:4px}.meta{text-align:${isUrdu ? "left" : "right"};font-size:12px;color:rgba(255,255,255,.78);line-height:1.8}
    .content{padding:18px}.hint{background:#EFF6FF;border:1px solid #DBEAFE;color:#0A65BD;border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:12px}
    table{width:100%;border-collapse:collapse}thead th{background:#0f172a;color:white;font-size:11px;text-transform:uppercase;letter-spacing:.45px;padding:11px 10px;text-align:${isUrdu ? "right" : "left"};white-space:nowrap}tbody td{border-bottom:1px solid #e5e7eb;padding:10px;font-size:12px;color:#334155;vertical-align:top}tbody tr:nth-child(even) td{background:#f8fafc}.center{text-align:center!important}.num{text-align:${isUrdu ? "left" : "right"}!important;font-family:'Inter',Arial,sans-serif;font-variant-numeric:tabular-nums}.strong{font-weight:800}.blue{color:#0B4E9B}.footer{background:#0f172a;color:rgba(255,255,255,.75);font-size:11px;padding:10px 16px;display:flex;justify-content:space-between}
    @media print{@page{size:A4 landscape;margin:9mm}body{padding:0;background:white}.sheet{box-shadow:none;border:none;border-radius:0}.hint{display:none}}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand"><h1>Ali Cages</h1><p>${t.reportHeader}</p></div>
      <div class="meta"><div>${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div><div>${records.length} ${t.supplier}</div></div>
    </div>
    <div class="content">
      ${isPdf ? `<div class="hint">Choose <strong>Save as PDF</strong> in the print dialog.</div>` : ""}
      <table>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>${t.supplier}</th>
            <th>${t.product}</th>
            <th>${t.category}</th>
            <th>${t.type}</th>
            <th class="center">${t.unit}</th>
            <th class="num">${t.quantity}</th>
            <th class="num">${t.rate}</th>
            <th class="center">${t.effectiveDate}</th>
          </tr>
        </thead>
        <tbody>${records.length ? rowsHtml : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:30px">${t.noRecords}</td></tr>`}</tbody>
      </table>
    </div>
    <div class="footer"><span>Ali Cages</span><span>${t.reportHeader}</span></div>
  </div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();${!isPdf ? "window.onafterprint=()=>window.close();" : ""}},350)}</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1400,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const PurchaseRatePage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [supplierOptions, setSupplierOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [masterIssue, setMasterIssue] = useState(false);

  const [form, setForm] = useState({
    list_name: "",
    supplier_name: "",
    products: [emptyProduct()],
  });

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setMasterIssue(false);

      const [purchaseRes, suppliersRes, productsRes, unitsRes, categoriesRes, productTypesRes] =
        await Promise.allSettled([
          axios.get(`${API_BASE}/purchase-rates`),
          axios.get(`${API_BASE}/suppliers`),
          axios.get(`${API_BASE}/products`),
          axios.get(`${API_BASE}/units`),
          axios.get(`${API_BASE}/categories`),
          axios.get(`${API_BASE}/product-types`),
        ]);

      if (purchaseRes.status === "fulfilled") {
        setRecords(getList(purchaseRes.value?.data));
      } else {
        setRecords([]);
        showToast("error", purchaseRes.reason?.response?.data?.message || t.fetchError);
      }

      setSupplierOptions(suppliersRes.status === "fulfilled" ? uniqueOptions(suppliersRes.value?.data) : []);
      setProductOptions(productsRes.status === "fulfilled" ? uniqueOptions(productsRes.value?.data) : []);
      setUnitOptions(unitsRes.status === "fulfilled" ? uniqueOptions(unitsRes.value?.data) : []);
      setCategoryOptions(categoriesRes.status === "fulfilled" ? uniqueOptions(categoriesRes.value?.data) : []);
      setTypeOptions(
        productTypesRes.status === "fulfilled"
          ? uniqueOptions(productTypesRes.value?.data, (item) => item?.product_type_en || getOptionLabel(item))
          : []
      );

      if ([suppliersRes, productsRes, unitsRes, categoriesRes, productTypesRes].some((res) => res.status !== "fulfilled")) {
        setMasterIssue(true);
      }
    } catch (err) {
      showToast("error", err?.response?.data?.message || t.fetchError);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setForm({ list_name: "", supplier_name: "", products: [emptyProduct()] });
    setEditingName(null);
    setShowForm(true);
  };

  const openEdit = (record) => {
    setForm({
      list_name: record.list_name || "Default Purchase Rate",
      supplier_name: record.supplier_name || "",
      products: getProducts(record).length
        ? getProducts(record).map((product) => ({
            product_name: product.product_name || "",
            unit_name: product.unit_name || "",
            category_name: product.category_name || "",
            type_name: product.type_name || "",
            rate: product.rate ?? "",
            quantity: product.quantity ?? "",
            effective_date: product.effective_date || "",
          }))
        : [emptyProduct()],
    });
    setEditingName(record.group_key || `${record.list_name || "Default Purchase Rate"}|||${record.supplier_name || ""}`);
    setShowForm(true);
  };

  const updateProduct = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((product, i) =>
        i === index ? { ...product, [key]: value } : product
      ),
    }));
  };

  const addProduct = () => {
    setForm((prev) => ({ ...prev, products: [...prev.products, emptyProduct()] }));
  };

  const removeProduct = (index) => {
    setForm((prev) => ({
      ...prev,
      products:
        prev.products.length === 1
          ? prev.products
          : prev.products.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const cleanedProducts = form.products
      .map((product) => ({
        product_name: String(product.product_name || "").trim(),
        unit_name: String(product.unit_name || "").trim(),
        category_name: String(product.category_name || "").trim(),
        type_name: String(product.type_name || "").trim(),
        rate: product.rate === "" ? null : Number(product.rate) || 0,
        quantity: product.quantity === "" ? null : Number(product.quantity) || 0,
        effective_date: product.effective_date || null,
      }))
      .filter((product) => product.product_name);

    if (!cleanedProducts.length) {
      showToast("error", t.productRequiredError);
      return;
    }

    const payload = {
      list_name: String(form.list_name || "Default Purchase Rate").trim() || "Default Purchase Rate",
      supplier_name: String(form.supplier_name || "").trim() || null,
      products: cleanedProducts,
    };

    try {
      setSubmitting(true);

      if (editingName) {
        await axios.put(`${API_BASE}/purchase-rates/${encodeURIComponent(editingName)}`, payload);
      } else {
        await axios.post(`${API_BASE}/purchase-rates`, payload);
      }

      showToast("success", t.successSave);
      setShowForm(false);
      setEditingName(null);
      setForm({ list_name: "", supplier_name: "", products: [emptyProduct()] });
      await fetchData();
    } catch (err) {
      showToast("error", err?.response?.data?.message || t.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (groupKey) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(`${API_BASE}/purchase-rates/${encodeURIComponent(groupKey || "")}`);
      showToast("success", t.successDelete);
      setRecords((prev) => prev.filter((record) => record.group_key !== groupKey));
    } catch (err) {
      showToast("error", err?.response?.data?.message || t.deleteError);
    }
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return records;

    return records.filter((record) =>
      [record.list_name, record.supplier_name]
        .concat(
          getProducts(record).flatMap((product) => [
            product.product_name,
            product.unit_name,
            product.category_name,
            product.type_name,
            String(product.rate ?? ""),
            String(product.quantity ?? ""),
            product.effective_date,
          ])
        )
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [records, search]);

  const summary = useMemo(() => {
    const supplierCount = records.length;
    const rateRows = records.reduce((sum, record) => sum + getProducts(record).length, 0);
    const latestRate = records.reduce((max, record) => {
      getProducts(record).forEach((product) => {
        const rate = Number(product.rate || 0);
        if (rate > max) max = rate;
      });
      return max;
    }, 0);

    return {
      supplierCount,
      productRows: rateRows,
      rateRows,
      latestRate,
    };
  }, [records]);

  const fieldBase = `w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-950 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${isUrdu ? "text-right" : ""}`;
  const compactSelect = `${fieldBase} cursor-pointer`;
  const moneyInput = `${fieldBase} font-mono text-right`;
  const labelBase = `block text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 mb-1 whitespace-nowrap ${isUrdu ? "text-right" : ""}`;

  return (
    <div
      dir={dir}
      style={{ fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "Helvetica, 'Helvetica Neue', Arial, sans-serif" }}
      className="min-h-screen bg-[#f3f6fb] p-2 sm:p-4 pb-20"
    >
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {message.text && (
        <div
          className={`fixed bottom-6 ${isUrdu ? "left-6" : "right-6"} z-[70] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${message.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}
        >
          <i className={`bi ${message.type === "error" ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"}`}></i>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 sm:px-6 py-5">
          <div className={`flex items-center justify-between gap-4 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div className={`flex gap-2 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
              <button
                onClick={() => setLang(lang === "en" ? "ur" : "en")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-translate"></i>
                {t.toggleLang}
              </button>

              <button
                onClick={() => setShowSummary((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${showSummary ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                <i className="bi bi-bar-chart-fill"></i>
                {t.summaryBtn}
              </button>

              <button
                onClick={() => generatePrintDocument(filtered, lang, false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-printer text-indigo-600"></i>
                {t.printBtn}
              </button>

              <button
                onClick={() => generatePrintDocument(filtered, lang, true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-file-earmark-pdf text-rose-600"></i>
                {t.pdfBtn}
              </button>

              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                <i className="bi bi-plus-square-fill"></i>
                {t.addBtn}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: t.totalSuppliers, value: summary.supplierCount, icon: "bi-building", color: "text-indigo-600" },
                { label: t.totalProducts, value: summary.productRows, icon: "bi-box-seam", color: "text-sky-600" },
                { label: t.totalRateRows, value: summary.rateRows, icon: "bi-list-check", color: "text-emerald-600" },
                { label: t.latestRate, value: fmt(summary.latestRate), icon: "bi-cash-stack", color: "text-violet-600" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-3 ${card.color}`}>
                    <i className={`bi ${card.icon}`}></i>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-slate-950 font-mono">{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-4" : "left-4"}`}></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full h-10 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm ${isUrdu ? "pr-11 pl-4 text-right" : "pl-11 pr-4"}`}
            />
          </div>

          {masterIssue && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              <i className="bi bi-exclamation-triangle-fill mr-2"></i>
              {t.masterDataIssue}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm text-slate-600">
              <thead className="bg-slate-950 text-white text-[11px] font-black uppercase tracking-wide">
                <tr>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.supplier}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.product}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.category}</th>
                  <th className={`px-4 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.type}</th>
                  <th className="px-4 py-3 text-center">{t.unit}</th>
                  <th className="px-4 py-3 text-right">{t.quantity}</th>
                  <th className="px-4 py-3 text-right">{t.rate}</th>
                  <th className="px-4 py-3 text-center">{t.effectiveDate}</th>
                  <th className="px-4 py-3 text-center">{t.actions}</th>
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
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">{t.noRecords}</td>
                  </tr>
                ) : (
                  filtered.map((record, index) => {
                    const products = getProducts(record);
                    return (
                      <tr key={`${record.supplier_name || "no-supplier"}-${index}`} className="hover:bg-slate-50/80 transition align-top">
                        <td className="px-4 py-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                        <td className={`px-4 py-4 font-black text-slate-950 ${isUrdu ? "text-right" : ""}`}>
                          <div className={`flex items-center gap-2.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <i className="bi bi-building-fill"></i>
                            </span>
                            <span className="block text-[11px] font-black text-blue-700">{record.list_name || "Default Purchase Rate"}</span><span>{record.supplier_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1.5">
                            {products.map((product, productIndex) => (
                              <div key={productIndex} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 text-xs font-black">
                                <span className="font-mono text-[10px] opacity-70">#{productIndex + 1}</span>
                                {product.product_name || "—"}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1.5">{products.map((product, productIndex) => <div key={productIndex} className="text-xs font-semibold text-slate-700">{product.category_name || "—"}</div>)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1.5">{products.map((product, productIndex) => <div key={productIndex} className="text-xs font-semibold text-slate-700">{product.type_name || "—"}</div>)}</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1.5">{products.map((product, productIndex) => <div key={productIndex} className="text-xs font-bold text-slate-950">{product.unit_name || "—"}</div>)}</div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="space-y-1.5">{products.map((product, productIndex) => <div key={productIndex} className="font-mono text-xs font-black text-slate-950">{product.quantity > 0 ? fmt(product.quantity) : "—"}</div>)}</div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="space-y-1.5">
                            {products.map((product, productIndex) => (
                              <div key={productIndex} className="inline-flex justify-end min-w-[70px] rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                                {product.rate !== null && product.rate !== undefined && product.rate !== "" ? fmt(product.rate) : "—"}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="space-y-1.5">{products.map((product, productIndex) => <div key={productIndex} className="text-xs font-mono text-slate-600">{product.effective_date || "—"}</div>)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`flex items-center justify-center gap-1.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                            <button
                              onClick={() => openEdit(record)}
                              className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center"
                              title={t.edit}
                            >
                              <i className="bi bi-pencil-square text-sm"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(record.group_key)}
                              className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition flex items-center justify-center"
                              title={t.delete}
                            >
                              <i className="bi bi-trash3-fill text-sm"></i>
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
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
              dir={dir}
            >
              <h2 className="text-xl font-bold text-slate-800 mb-5">
                {editingName ? t.edit : t.addBtn}
              </h2>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.rateListName}</label>
                <input value={form.list_name || ""} onChange={(e) => setForm((prev) => ({...prev, list_name:e.target.value}))} placeholder={t.rateListPlaceholder} className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-300" />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t.supplier} <span className="text-slate-400">({t.optional})</span>
                </label>
                <div className="relative">
                  <i
                    className={`bi bi-building absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                      isUrdu ? "right-3" : "left-3"
                    }`}
                  ></i>
                  <select
                    value={form.supplier_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, supplier_name: e.target.value }))
                    }
                    className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-300 ${
                      isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                    }`}
                  >
                    <option value="">{t.supplierPlaceholder}</option>
                    {supplierOptions.map((option, idx) => (
                      <option key={`${option}-${idx}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {form.products.map((p, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-600">
                        {t.productGroup} {index + 1}
                      </h3>

                      {form.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="text-xs px-3 py-1 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 font-semibold"
                        >
                          {t.removeProductRow}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.product} *
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-box-seam absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <select
                            value={p.product_name}
                            onChange={(e) =>
                              updateProduct(index, "product_name", e.target.value)
                            }
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          >
                            <option value="">{t.productPlaceholder}</option>
                            {productOptions.map((option, idx) => (
                              <option key={`${option}-${idx}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.unit} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-rulers absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <select
                            value={p.unit_name}
                            onChange={(e) =>
                              updateProduct(index, "unit_name", e.target.value)
                            }
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          >
                            <option value="">{t.unitPlaceholder}</option>
                            {unitOptions.map((option, idx) => (
                              <option key={`${option}-${idx}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.category} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-diagram-3 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <select
                            value={p.category_name}
                            onChange={(e) =>
                              updateProduct(index, "category_name", e.target.value)
                            }
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          >
                            <option value="">{t.categoryPlaceholder}</option>
                            {categoryOptions.map((option, idx) => (
                              <option key={`${option}-${idx}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.type} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-tags absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <select
                            value={p.type_name}
                            onChange={(e) =>
                              updateProduct(index, "type_name", e.target.value)
                            }
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          >
                            <option value="">{t.typePlaceholder}</option>
                            {typeOptions.map((option, idx) => (
                              <option key={`${option}-${idx}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.quantity} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-stack absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <input
                            type="number"
                            min="0"
                            value={p.quantity}
                            onChange={(e) =>
                              updateProduct(index, "quantity", e.target.value)
                            }
                            placeholder={t.quantityPlaceholder}
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.rate} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-currency-rupee absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <input
                            type="number"
                            min="0"
                            value={p.rate}
                            onChange={(e) => updateProduct(index, "rate", e.target.value)}
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {t.effectiveDate} <span className="text-slate-400">({t.optional})</span>
                        </label>
                        <div className="relative">
                          <i
                            className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                              isUrdu ? "right-3" : "left-3"
                            }`}
                          ></i>
                          <input
                            type="date"
                            value={p.effective_date}
                            onChange={(e) =>
                              updateProduct(index, "effective_date", e.target.value)
                            }
                            className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-300 ${
                              isUrdu ? "pr-9 pl-3" : "pl-9 pr-3"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addProduct}
                  className="w-full border border-dashed border-blue-300 text-blue-700 py-3 rounded-2xl text-sm font-semibold hover:bg-blue-50 transition"
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  {t.addProductRow}
                </button>
              </div>

              <div className={`flex gap-3 mt-8 ${isUrdu ? "flex-row-reverse" : ""}`}>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition disabled:opacity-60"
                >
                  {submitting ? t.saving : t.save}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRatePage;
