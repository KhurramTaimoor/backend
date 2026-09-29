import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

async function translateText(text) {
  if (!text || !text.trim()) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.trim()
    )}&langpair=en|ur`;

    const res = await fetch(url);
    if (!res.ok) return text;

    const data = await res.json();
    const translated = data?.responseData?.translatedText;

    if (!translated || translated.toLowerCase() === text.trim().toLowerCase()) {
      return text;
    }

    return translated;
  } catch {
    return text;
  }
}

const LANG = {
  en: {
    title: "Product Management",
    subtitle: "Manage products with type, category and unit",
    addBtn: "New Product",
    summaryBtn: "View Summary",
    summaryTitle: "Products Summary",
    summarySubtitle: "Overview of visible product records",
    totalProducts: "Total Products",
    activeProducts: "Active Products",
    inactiveProducts: "Inactive Products",
    withMasterPacking: "With Master Packing",
    withoutMasterPacking: "Without Master Packing",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    searchPlaceholder:
      "Search by product, type, category or unit…",
    productName: "Product Name",
    description: "Description",
    autoDescription: "Auto Description",
    productType: "Type",
    category: "Category",
    unit: "Unit",
    quantity: "Quantity",
    masterPackingUnit: "Master Packing Unit",
    masterPackingPieces: "Pieces",
    allTypes: "All Types",
    allCategories: "All Categories",
    allUnits: "All Units",
    selectType: "Select type",
    selectCategory: "Select category",
    selectUnit: "Select unit",
    selectMasterPackingUnit: "Select master packing unit",
    activeInactive: "Active / Inactive",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Action",
    noRecords: "No products found.",
    loading: "Loading products...",
    toggleLang: "اردو",
    translating: "Translating to Urdu…",
    printBtn: "Print",
    pdfBtn: "Download PDF",
    reportHeader: "Products List",
    printedOn: "Printed On",
    errorMsg: "Product name is required.",
    masterPackingValidation:
      "Master packing unit and pieces both are required.",
    successSave: "Saved successfully!",
    successDelete: "Deleted successfully!",
    fetchError: "Failed to load records.",
    saveError: "Failed to save.",
    deleteError: "Failed to delete.",
    deleteConfirm: "Are you sure you want to delete this product?",
    namePlaceholder: "e.g. Cotton Bundle",
    piecesPlaceholder: "e.g. 12",
    records: "Records",
    required: "Required",
    formSubtitle:
      "Select product, type, category and unit",
    companyName: "Ali Cages",
    savePdfHint: 'Choose "Save as PDF" in print dialog',
  },
  ur: {
    title: "پروڈکٹ مینجمنٹ",
    subtitle: "پروڈکٹ، ٹائپ، کیٹیگری اور یونٹ مینج کریں",
    addBtn: "نیا پروڈکٹ",
    summaryBtn: "سمری دیکھیں",
    summaryTitle: "پروڈکٹس سمری",
    summarySubtitle: "نظر آنے والے پروڈکٹس کا خلاصہ",
    totalProducts: "کل پروڈکٹس",
    activeProducts: "ایکٹو پروڈکٹس",
    inactiveProducts: "ان ایکٹو پروڈکٹس",
    withMasterPacking: "ماسٹر پیکنگ والے",
    withoutMasterPacking: "بغیر ماسٹر پیکنگ",
    status: "اسٹیٹس",
    active: "ایکٹو",
    inactive: "ان ایکٹو",
    searchPlaceholder:
      "پروڈکٹ، ٹائپ، کیٹیگری یا یونٹ سے تلاش کریں…",
    productName: "پروڈکٹ نام",
    description: "ڈسکرپشن",
    autoDescription: "آٹو ڈسکرپشن",
    productType: "ٹائپ",
    category: "کیٹیگری",
    unit: "یونٹ",
    quantity: "مقدار",
    masterPackingUnit: "ماسٹر پیکنگ یونٹ",
    masterPackingPieces: "پیسز",
    allTypes: "تمام ٹائپس",
    allCategories: "تمام کیٹیگریز",
    allUnits: "تمام یونٹس",
    selectType: "ٹائپ منتخب کریں",
    selectCategory: "کیٹیگری منتخب کریں",
    selectUnit: "یونٹ منتخب کریں",
    selectMasterPackingUnit: "ماسٹر پیکنگ یونٹ منتخب کریں",
    activeInactive: "ایکٹو / ان ایکٹو",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے…",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "عمل",
    noRecords: "کوئی پروڈکٹ نہیں ملا۔",
    loading: "پروڈکٹس لوڈ ہو رہے ہیں...",
    toggleLang: "English",
    translating: "اردو میں ترجمہ ہو رہا ہے…",
    printBtn: "پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "مصنوعات کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
    errorMsg: "پروڈکٹ کا نام ضروری ہے۔",
    masterPackingValidation:
      "ماسٹر پیکنگ یونٹ اور پیسز دونوں ضروری ہیں۔",
    successSave: "کامیابی سے محفوظ ہو گیا!",
    successDelete: "حذف ہو گیا!",
    fetchError: "ریکارڈ لوڈ نہیں ہو سکے۔",
    saveError: "محفوظ نہیں ہو سکا۔",
    deleteError: "حذف نہیں ہو سکا۔",
    deleteConfirm: "کیا آپ واقعی اس پروڈکٹ کو حذف کرنا چاہتے ہیں؟",
    namePlaceholder: "مثلاً Cotton Bundle",
    piecesPlaceholder: "مثلاً 12",
    records: "ریکارڈز",
    required: "ضروری",
    formSubtitle:
      "پروڈکٹ، ٹائپ، کیٹیگری اور یونٹ",
    companyName: "علی کیجز",
    savePdfHint: 'پرنٹ ڈائیلاگ میں "Save as PDF" منتخب کریں',
  },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const defaultForm = {
  product_name: "",
  product_type_id: "",
  category_id: "",
  unit_id: "",
  is_active: "1",
};

function isRecordActive(record) {
  const value = record?.is_active ?? record?.active ?? record?.status;

  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "boolean") return value;

  const text = String(value).trim().toLowerCase();
  return !["0", "false", "inactive", "in-active", "disabled", "no"].includes(
    text
  );
}

function getProductTypeName(item) {
  return (
    item?.product_type_en ||
    item?.type_name ||
    item?.product_type_name ||
    item?.name ||
    ""
  );
}

function getCategoryName(item) {
  return item?.category_name || item?.name || "";
}

function getUnitName(item) {
  return item?.unit_name || item?.name || item?.symbol || "";
}

const ProductPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];

  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [urduCache, setUrduCache] = useState({});

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const [message, setMessage] = useState({ type: "", text: "" });

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  }, []);

  const getTypeNameById = useCallback(
    (id) => {
      if (!id) return "";
      const found = productTypes.find((x) => String(x.id) === String(id));
      return getProductTypeName(found);
    },
    [productTypes]
  );

  const getCategoryNameById = useCallback(
    (id) => {
      if (!id) return "";
      const found = categories.find((x) => String(x.id) === String(id));
      return getCategoryName(found);
    },
    [categories]
  );

  const getUnitNameById = useCallback(
    (id) => {
      if (!id) return "";
      const found = units.find((x) => String(x.id) === String(id));
      return getUnitName(found);
    },
    [units]
  );

  const getRecordTypeName = useCallback(
    (r) => {
      return (
        r.product_type_en ||
        r.type_name ||
        r.product_type_name ||
        getTypeNameById(r.product_type_id) ||
        "-"
      );
    },
    [getTypeNameById]
  );

  const getRecordCategoryName = useCallback(
    (r) => {
      return r.category_name || getCategoryNameById(r.category_id) || "-";
    },
    [getCategoryNameById]
  );

  const getRecordUnitName = useCallback(
    (r) => {
      return r.unit_name || getUnitNameById(r.unit_id) || "-";
    },
    [getUnitNameById]
  );

  const getRecordMasterPackingUnitName = useCallback(
    (r) => {
      return (
        r.master_packing_unit_name ||
        getUnitNameById(r.master_packing_unit_id) ||
        "-"
      );
    },
    [getUnitNameById]
  );

  const getRecordQuantity = useCallback((r) => {
    const value =
      r.quantity ??
      r.qty ??
      r.stock_quantity ??
      r.master_packing_pieces ??
      r.pieces_per_carton;

    if (value === undefined || value === null || value === "") return "-";

    return value;
  }, []);

  const buildAutoDescription = useCallback(
    (data) => {
      const productName = String(data.product_name || "").trim();
      const typeName = getTypeNameById(data.product_type_id);
      const categoryName = getCategoryNameById(data.category_id);
      const unitName = getUnitNameById(data.unit_id);
      const masterUnitName = getUnitNameById(data.master_packing_unit_id);
      const pieces = Number(data.master_packing_pieces || 0);

      const parts = [];

      if (productName) parts.push(productName);
      if (typeName) parts.push(`Type: ${typeName}`);
      if (categoryName) parts.push(`Category: ${categoryName}`);
      if (unitName) parts.push(`Unit: ${unitName}`);

      if (masterUnitName && pieces > 0) {
        parts.push(`Master Packing: ${masterUnitName} - ${pieces} Pieces`);
      }

      return parts.join(" | ");
    },
    [getTypeNameById, getCategoryNameById, getUnitNameById]
  );

  const autoDescription = useMemo(() => {
    return buildAutoDescription(form);
  }, [form, buildAutoDescription]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [productsRes, typesRes, categoriesRes, unitsRes] =
        await Promise.all([
          axios.get(`${API_BASE}/api/products`),
          axios.get(`${API_BASE}/api/product-types`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/categories`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/units`).catch(() => ({ data: [] })),
        ]);

      setRecords(
        Array.isArray(productsRes.data)
          ? productsRes.data
          : productsRes.data?.data || []
      );

      setProductTypes(
        Array.isArray(typesRes.data) ? typesRes.data : typesRes.data?.data || []
      );

      setCategories(
        Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : categoriesRes.data?.data || []
      );

      setUnits(
        Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.data || []
      );
    } catch {
      showToast("error", t.fetchError);
    } finally {
      setLoading(false);
    }
  }, [showToast, t.fetchError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLangToggle = async () => {
    const newLang = lang === "en" ? "ur" : "en";
    setLang(newLang);

    if (newLang !== "ur" || records.length === 0) return;

    const untranslated = records.filter((r) => !urduCache[`prod:${r.id}`]);
    if (!untranslated.length) return;

    setTranslating(true);

    try {
      const results = await Promise.all(
        untranslated.map(async (r) => ({
          id: r.id,
          urdu: await translateText(r.product_name),
        }))
      );

      setUrduCache((prev) => {
        const next = { ...prev };
        results.forEach(({ id, urdu }) => {
          next[`prod:${id}`] = urdu;
        });
        return next;
      });
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const getProductName = (r) =>
    isUrdu
      ? urduCache[`prod:${r.id}`] || r.product_name || "-"
      : r.product_name || "-";

  const getRecordDescription = (r) => String(r.description || "").trim();

  const openAdd = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      product_name: r.product_name || "",
      product_type_id: r.product_type_id ? String(r.product_type_id) : "",
      category_id: r.category_id ? String(r.category_id) : "",
      unit_id: r.unit_id ? String(r.unit_id) : "",
      is_active: isRecordActive(r) ? "1" : "0",
    });

    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      product_name: form.product_name.trim(),
      product_type_id: form.product_type_id
        ? Number(form.product_type_id)
        : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      unit_id: form.unit_id ? Number(form.unit_id) : null,
      is_active: Number(form.is_active),
    };

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${API_BASE}/api/products/${editingId}`, payload);

        setUrduCache((prev) => {
          const next = { ...prev };
          delete next[`prod:${editingId}`];
          return next;
        });
      } else {
        await axios.post(`${API_BASE}/api/products`, payload);
      }

      showToast("success", t.successSave);
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("error", err?.response?.data?.message || t.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(`${API_BASE}/api/products/${id}`);

      setUrduCache((prev) => {
        const next = { ...prev };
        delete next[`prod:${id}`];
        return next;
      });

      showToast("success", t.successDelete);
      fetchData();
    } catch {
      showToast("error", t.deleteError);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return records.filter((r) => {
      const typeName = getRecordTypeName(r);
      const categoryName = getRecordCategoryName(r);
      const unitName = getRecordUnitName(r);
      const description = getRecordDescription(r);

      const matchesType =
        !typeFilter || String(r.product_type_id || "") === String(typeFilter);

      const matchesCategory =
        !categoryFilter || String(r.category_id || "") === String(categoryFilter);

      const matchesUnit = !unitFilter || String(r.unit_id || "") === String(unitFilter);

      const searchText = [
        r.product_name,
        urduCache[`prod:${r.id}`] || "",
        description,
        typeName,
        categoryName,
        unitName,
        getRecordQuantity(r),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || searchText.includes(q);

      return matchesType && matchesCategory && matchesUnit && matchesSearch;
    });
  }, [
    records,
    search,
    typeFilter,
    categoryFilter,
    unitFilter,
    urduCache,
    getRecordTypeName,
    getRecordCategoryName,
    getRecordUnitName,
    getRecordQuantity,
  ]);

  const summary = useMemo(
    () => ({
      totalProducts: filtered.length,
      activeProducts: filtered.filter((r) => isRecordActive(r)).length,
      inactiveProducts: filtered.filter((r) => !isRecordActive(r)).length,
    }),
    [filtered]
  );

  const generatePrint = (isPdf = false) => {
    const font = isUrdu
      ? "'Noto Nastaliq Urdu', serif"
      : "Helvetica, 'Helvetica Neue', Arial, sans-serif";

    const rows = filtered
      .map((r) => {
        return `
          <tr>
            <td class="product-cell" dir="${isUrdu ? "rtl" : "ltr"}">
              <strong>${getProductName(r)}</strong>
              <div class="desc">${getRecordDescription(r)}</div>
            </td>
            <td>${getRecordTypeName(r)}</td>
            <td>${getRecordCategoryName(r)}</td>
            <td>${getRecordUnitName(r)}</td>
            <td class="center">${getRecordQuantity(r)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${t.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:${font};background:#f8fafc;color:#0f172a;padding:24px;}
    .sheet{max-width:1200px;margin:0 auto;background:white;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 14px 40px rgba(15,23,42,.10);}
    .header{background:#111827;color:#fff;padding:22px 26px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;}
    .brand{font-size:26px;font-weight:800;}
    .report-title{font-size:13px;color:#cbd5e1;margin-top:4px;}
    .meta{text-align:${isUrdu ? "left" : "right"};font-size:12px;color:#cbd5e1;}
    .content{padding:18px;}
    .print-inst{background:#EFF6FF;color:#285DB8;padding:12px 14px;text-align:center;border-radius:12px;margin-bottom:16px;border:1px solid #DBEAFE;font-size:13px;font-weight:700;}
    table{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}
    th{background:#111827;color:#fff;text-align:left;padding:11px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;}
    td{border-bottom:1px solid #f1f5f9;padding:10px 11px;color:#334155;vertical-align:top;text-align:left;}
    tr:nth-child(even) td{background:#f8fafc;}
    .center{text-align:center!important;}
    .product-cell{text-align:${isUrdu ? "right" : "left"};}
    .desc{font-size:10.5px;color:#64748b;margin-top:4px;line-height:1.5;}
    @media print{body{padding:0;background:white}.sheet{box-shadow:none;border-radius:0;border:0}.print-inst{display:none}}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">${t.companyName}</div>
        <div class="report-title">${t.reportHeader}</div>
      </div>
      <div class="meta">${t.printedOn}: ${new Date().toLocaleString(
        isUrdu ? "ur-PK" : "en-PK"
      )}</div>
    </div>
    <div class="content">
      ${isPdf ? `<div class="print-inst">${t.savePdfHint}</div>` : ""}
      <table dir="ltr">
        <thead>
          <tr>
            <th>${t.productName}</th>
            <th>${t.productType}</th>
            <th>${t.category}</th>
            <th>${t.unit}</th>
            <th class="center">${t.quantity}</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length
              ? rows
              : `<tr><td colspan="5" style="text-align:center;padding:34px">${t.noRecords}</td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>

  <script>
    window.onload=()=>{
      setTimeout(()=>{
        window.print();
        ${!isPdf ? "window.onafterprint=()=>window.close();" : ""}
      },300);
    };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
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

        .same-btn { transition: all .15s ease; }
        .same-btn:hover { transform: translateY(-1px); }

        .same-field {
          width:100%;
          min-height:38px;
          border:1.5px solid #dbe3ef;
          border-radius:10px;
          background:#fff;
          padding:0 12px;
          font-size:13px;
          color:#0f172a;
          outline:none;
          transition:border-color .15s ease, box-shadow .15s ease;
        }

        .same-field:focus {
          border-color:#4A86F7;
          box-shadow:0 0 0 3px rgba(99,102,241,.12);
        }

        .same-field-icon-left { padding-left:34px; }
        .same-field-icon-right { padding-right:34px; }

        .same-label {
          display:block;
          font-size:10.5px;
          line-height:1;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.06em;
          color:#64748b;
          margin-bottom:7px;
        }

        .same-section {
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:18px;
          overflow:hidden;
          box-shadow:0 1px 3px rgba(15,23,42,.05);
        }

        .same-section-head {
          padding:13px 16px;
          border-bottom:1px solid #eef2f7;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          background:#fff;
        }

        .same-section-icon {
          width:36px;
          height:36px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#EFF6FF;
          color:#0B4E9B;
        }

        .same-dark-table th {
          background:#111827!important;
          color:#fff!important;
          font-size:11px!important;
          text-transform:uppercase;
          letter-spacing:.04em;
          padding:11px 14px!important;
          white-space:nowrap;
        }

        .same-dark-table td {
          padding:12px 14px!important;
          border-bottom:1px solid #f1f5f9!important;
          vertical-align:top;
        }
      `}</style>

      {message.text && (
        <div
          className={`fixed bottom-6 ${
            isUrdu ? "left-6" : "right-6"
          } z-50 px-5 py-2.5 rounded-lg shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
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

      {translating && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-2xl bg-slate-800 text-white text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-arrow-repeat animate-spin"></i>
          {t.translating}
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

            <div
              className={`flex gap-2 flex-wrap ${
                isUrdu ? "flex-row-reverse" : ""
              }`}
            >
              <button
                onClick={handleLangToggle}
                disabled={translating}
                className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-60"
              >
                <i
                  className={`bi ${
                    translating ? "bi-arrow-repeat animate-spin" : "bi-translate"
                  }`}
                ></i>
                {t.toggleLang}
              </button>

              <button
                onClick={() => setShowSummary((v) => !v)}
                className={`same-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm ${
                  showSummary
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-indigo-50 text-indigo-700 hover:bg-sky-200"
                }`}
              >
                <i className="bi bi-bar-chart-line-fill"></i>
                {t.summaryBtn}
              </button>

              <button
                onClick={() => generatePrint(false)}
                className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-printer-fill"></i>
                {t.printBtn}
              </button>

              <button
                onClick={() => generatePrint(true)}
                className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-indigo-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                <i className="bi bi-file-earmark-pdf-fill"></i>
                {t.pdfBtn}
              </button>

              <button
                onClick={openAdd}
                className="same-btn flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
              >
                <i className="bi bi-plus-circle-fill"></i>
                {t.addBtn}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="mt-5 pt-5 border-t border-slate-200">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-950">
                  {t.summaryTitle}
                </h3>
                <p className="text-sm text-slate-500">{t.summarySubtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  [t.totalProducts, summary.totalProducts, "bi-box-seam-fill"],
                  [t.activeProducts, summary.activeProducts, "bi-check-circle-fill"],
                  [t.inactiveProducts, summary.inactiveProducts, "bi-x-circle-fill"],
                ].map(([label, value, icon]) => (
                  <div
                    key={label}
                    className="bg-slate-50 rounded-lg border border-slate-200 p-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white text-indigo-600 flex items-center justify-center shadow-sm mb-3">
                      <i className={`bi ${icon}`}></i>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-2xl font-extrabold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
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

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`same-field ${isUrdu ? "text-right" : ""}`}
            >
              <option value="">{t.allTypes}</option>
              {productTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {getProductTypeName(pt)}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`same-field ${isUrdu ? "text-right" : ""}`}
            >
              <option value="">{t.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>

            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className={`same-field ${isUrdu ? "text-right" : ""}`}
            >
              <option value="">{t.allUnits}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {getUnitName(unit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table dir="ltr" className="same-dark-table w-full text-sm text-slate-600">
              <thead>
                <tr>
                  <th className="text-left">{t.productName}</th>
                  <th className="text-left">{t.productType}</th>
                  <th className="text-left">{t.category}</th>
                  <th className="text-left">{t.unit}</th>
                  <th className="text-center">{t.quantity}</th>
                  <th className="text-center">{t.actions}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-sky-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                      <p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td
                          className={`font-bold text-slate-950 ${
                            isUrdu ? "text-right" : "text-left"
                          }`}
                          dir={isUrdu ? "rtl" : "ltr"}
                        >
                          <div
                            className={`flex items-start gap-3 ${
                              isUrdu ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                              <i className="bi bi-box-seam-fill"></i>
                            </div>

                            <div>
                              <span className={translating ? "opacity-40" : ""}>
                                {getProductName(r)}
                              </span>

                              {getRecordDescription(r) && (
                                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                  {getRecordDescription(r)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td
                          className={`font-semibold text-slate-700 ${
                            isUrdu ? "text-right" : "text-left"
                          }`}
                        >
                          {getRecordTypeName(r)}
                        </td>

                        <td
                          className={`font-semibold text-slate-700 ${
                            isUrdu ? "text-right" : "text-left"
                          }`}
                        >
                          {getRecordCategoryName(r)}
                        </td>

                        <td
                          className={`font-semibold text-slate-700 ${
                            isUrdu ? "text-right" : "text-left"
                          }`}
                        >
                          {getRecordUnitName(r)}
                        </td>

                        <td className="text-center font-mono font-bold text-slate-950">
                          {getRecordQuantity(r)}
                        </td>

                        <td>
                          <div
                            className={`flex items-center justify-center gap-2 flex-wrap ${
                              isUrdu ? "flex-row-reverse" : ""
                            }`}
                          >
                            <button
                              onClick={() => openEdit(r)}
                              className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-sky-200 transition flex items-center justify-center"
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
              className="bg-white rounded-[22px] shadow-2xl w-full max-w-3xl p-4 flex flex-col"
              dir={dir}
            >
              <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-4">
                <div
                  className={`flex items-center gap-3 ${
                    isUrdu ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <i className="bi bi-box-seam-fill text-indigo-700 text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-950">
                      {editingId ? t.edit : t.addBtn}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {t.formSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center"
                >
                  <i className="bi bi-x-lg text-sm"></i>
                </button>
              </div>

              <div className="same-section mb-4">
                <div className="same-section-head">
                  <div
                    className={`flex items-center gap-3 ${
                      isUrdu ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="same-section-icon">
                      <i className="bi bi-card-checklist"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950 m-0">
                        Product Information
                      </h3>
                      <p className="text-xs text-slate-500 m-0">
                        {t.formSubtitle}
                      </p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                    <i className="bi bi-asterisk text-rose-500"></i>
                    {t.required}
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="same-label">
                      {t.productName} <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative">
                      <i
                        className={`bi bi-box-seam absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                          isUrdu ? "right-3" : "left-3"
                        }`}
                      ></i>

                      <input
                        type="text"
                        value={form.product_name}
                        onChange={(e) =>
                          setForm({ ...form, product_name: e.target.value })
                        }
                        placeholder={t.namePlaceholder}
                        autoFocus
                        className={`same-field ${
                          isUrdu
                            ? "same-field-icon-right text-right"
                            : "same-field-icon-left"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="same-label">{t.productType}</label>
                    <select
                      value={form.product_type_id}
                      onChange={(e) =>
                        setForm({ ...form, product_type_id: e.target.value })
                      }
                      className={`same-field ${isUrdu ? "text-right" : ""}`}
                    >
                      <option value="">{t.selectType}</option>
                      {productTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {getProductTypeName(pt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="same-label">{t.category}</label>
                    <select
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({ ...form, category_id: e.target.value })
                      }
                      className={`same-field ${isUrdu ? "text-right" : ""}`}
                    >
                      <option value="">{t.selectCategory}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {getCategoryName(cat)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="same-label">{t.unit}</label>
                    <select
                      value={form.unit_id}
                      onChange={(e) =>
                        setForm({ ...form, unit_id: e.target.value })
                      }
                      className={`same-field ${isUrdu ? "text-right" : ""}`}
                    >
                      <option value="">{t.selectUnit}</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {getUnitName(unit)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="same-label">
                      {t.activeInactive} <span className="text-rose-500">*</span>
                    </label>

                    <select
                      value={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.value })
                      }
                      className={`same-field ${isUrdu ? "text-right" : ""}`}
                    >
                      <option value="1">{t.active}</option>
                      <option value="0">{t.inactive}</option>
                    </select>
                  </div>

                </div>
              </div>

              <div
                className={`flex gap-3 pt-4 border-t border-slate-200 ${
                  isUrdu ? "flex-row-reverse" : ""
                }`}
              >
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i
                    className={`bi ${
                      submitting ? "bi-arrow-repeat animate-spin" : "bi-save"
                    }`}
                  ></i>
                  {submitting ? t.saving : t.save}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex-1 bg-white border border-slate-300 text-indigo-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
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

export default ProductPage;
