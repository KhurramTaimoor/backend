import React, { useEffect, useState } from "react";
import axios from "axios";

const LANG = {
  en: {
    title: "Stock Issue",
    subtitle: "Manage outgoing stock shipments",
    addBtn: "Issue Stock",
    searchPlaceholder: "Search by issue no, shipment to or product...",
    issueNo: "Issue No",
    date: "Issue Date",
    shipmentTo: "Shipment To",
    shipmentToPlaceholder: "Enter shipment name",
    product: "Product",
    selectProduct: "-- Select Product --",
    category: "Category",
    selectCategory: "-- Select Category --",
    productType: "Product Type",
    selectType: "-- Select Type --",
    issuedQty: "Issued Qty",
    rate: "Rate",
    total: "Total",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    noRecords: "No stock issue records found.",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "Stock Issue Report",
    printedOn: "Printed On",
    successSave: "Stock issued successfully!",
    successUpdate: "Record updated successfully!",
    errorMsg: "Please fill required fields (Issue No, Date, Shipment To, and at least one valid product row).",
    deleteConfirm: "Are you sure you want to delete this record?",
    addItem: "Add Product",
    removeItem: "Remove",
    itemNo: "Item",
    products: "Products",
    loading: "Loading...",
    loadError: "Failed to load data from server.",
    savingError: "Failed to save record.",
    deletingError: "Failed to delete record.",
  },
  ur: {
    title: "اسٹاک کا اجراء",
    subtitle: "باہر جانے والے اسٹاک شپمنٹس کا انتظام کریں",
    addBtn: "اسٹاک جاری کریں",
    searchPlaceholder: "اجراء نمبر، شپمنٹ ٹو یا پروڈکٹ سے تلاش کریں...",
    issueNo: "اجراء نمبر",
    date: "تاریخ اجراء",
    shipmentTo: "شپمنٹ ٹو",
    shipmentToPlaceholder: "شپمنٹ کا نام درج کریں",
    product: "پروڈکٹ",
    selectProduct: "-- پروڈکٹ منتخب کریں --",
    category: "کیٹیگری",
    selectCategory: "-- کیٹیگری منتخب کریں --",
    productType: "پروڈکٹ کی قسم",
    selectType: "-- قسم منتخب کریں --",
    issuedQty: "جاری کردہ مقدار",
    rate: "ریٹ",
    total: "کل",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    noRecords: "اسٹاک اجراء کا کوئی ریکارڈ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "اسٹاک اجراء کی رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "اسٹاک کامیابی سے جاری کر دیا گیا!",
    successUpdate: "ریکارڈ کامیابی سے اپڈیٹ ہو گیا!",
    errorMsg: "براہ کرم لازمی خانے پُر کریں (اجراء نمبر، تاریخ، شپمنٹ ٹو، اور کم از کم ایک درست پروڈکٹ قطار)۔",
    deleteConfirm: "کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟",
    addItem: "پروڈکٹ شامل کریں",
    removeItem: "ہٹائیں",
    itemNo: "آئٹم",
    products: "پروڈکٹس",
    loading: "لوڈ ہو رہا ہے...",
    loadError: "سرور سے ڈیٹا لوڈ نہیں ہو سکا۔",
    savingError: "ریکارڈ محفوظ نہیں ہو سکا۔",
    deletingError: "ریکارڈ حذف نہیں ہو سکا۔",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const emptyItem = {
  product_name: "",
  category_name: "",
  type_name: "",
  issued_qty: "",
  rate: "",
};

const emptyForm = {
  issue_no: "",
  date: "",
  shipment_to: "",
  items: [{ ...emptyItem }],
};

const extractOptions = (data, keys = []) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item, index) => {
      for (const key of keys) {
        if (item?.[key] !== undefined && item?.[key] !== null && `${item[key]}`.trim() !== "") {
          return `${item[key]}`.trim();
        }
      }
      return item?.name ? `${item.name}` : `${item?.id ?? index}`;
    })
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
};

export default function StockIssuePage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const normalizeRecords = (data) => {
    return (data || []).map((r) => ({
      ...r,
      shipment_to: r.shipment_to || "",
      items:
        Array.isArray(r.items) && r.items.length > 0
          ? r.items.map((item) => ({
              product_name: item.product_name || "",
              category_name: item.category_name || "",
              type_name: item.type_name || "",
              issued_qty: item.issued_qty || "",
              rate: item.rate || "",
              total:
                item.total ??
                (Number(item.issued_qty || 0) * Number(item.rate || 0)).toFixed(2),
            }))
          : [],
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resIssue, resProd, resCat, resType] = await Promise.all([
        axios.get(`${API_BASE}/stock-issue`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/product-types`),
      ]);

      setRecords(normalizeRecords(Array.isArray(resIssue.data) ? resIssue.data : []));
      setProducts(extractOptions(resProd.data, ["product_name", "name"]));
      setCategories(extractOptions(resCat.data, ["category_name", "name"]));
      setTypes(extractOptions(resType.data, ["type_name", "product_type_en", "name"]));
    } catch (error) {
      console.error("Fetch error:", error);
      setRecords([]);
      setProducts([]);
      setCategories([]);
      setTypes([]);
      showToast("error", t.loadError);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      issue_no: r.issue_no || "",
      date: r.date ? String(r.date).slice(0, 10) : "",
      shipment_to: r.shipment_to || "",
      items:
        r.items && r.items.length > 0
          ? r.items.map((item) => ({
              product_name: item.product_name || "",
              category_name: item.category_name || "",
              type_name: item.type_name || "",
              issued_qty: item.issued_qty || "",
              rate: item.rate || "",
            }))
          : [{ ...emptyItem }],
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const updateItem = (index, key, value) => {
    const updated = [...form.items];
    updated[index][key] = value;
    setForm({ ...form, items: updated });
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    const updated = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updated });
  };

  const calculateLineTotal = (item) => {
    return (Number(item.issued_qty || 0) * Number(item.rate || 0)).toFixed(2);
  };

  const handleSave = async () => {
    const validItems = form.items.filter(
      (item) => item.product_name && item.issued_qty && item.rate
    );

    if (!form.issue_no || !form.date || !form.shipment_to || validItems.length === 0) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      issue_no: form.issue_no,
      date: form.date,
      shipment_to: form.shipment_to,
      items: validItems.map((item) => ({
        product_name: item.product_name,
        category_name: item.category_name || "",
        type_name: item.type_name || "",
        issued_qty: item.issued_qty,
        rate: item.rate,
        total: calculateLineTotal(item),
      })),
    };

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/stock-issue/${editingId}`, payload);
        showToast("success", t.successUpdate);
      } else {
        await axios.post(`${API_BASE}/stock-issue`, payload);
        showToast("success", t.successSave);
      }

      await fetchData();
      setShowForm(false);
    } catch (error) {
      console.error("Save error:", error);
      showToast("error", t.savingError);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(`${API_BASE}/stock-issue/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", t.deletingError);
    }
  };

  const filtered = records.filter((r) => {
    const productNames = (r.items || []).map((item) => item.product_name).join(" ");
    const categoryNames = (r.items || []).map((item) => item.category_name).join(" ");
    const typeNames = (r.items || []).map((item) => item.type_name).join(" ");

    return [r.issue_no, r.shipment_to, productNames, categoryNames, typeNames].some((v) =>
      (v || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";

    const rowsHtml = filtered
      .map((r, i) => {
        const itemsHtml = (r.items || [])
          .map(
            (item) => `
              <div style="margin-bottom:8px;">
                <strong>${item.product_name || "-"}</strong>
                <div style="font-size:12px; color:#64748b;">
                  ${item.category_name || "-"} | ${item.type_name || "-"} | Qty: ${item.issued_qty || 0} | Rate: ${item.rate || 0} | Total: ${item.total || calculateLineTotal(item)}
                </div>
              </div>
            `
          )
          .join("");

        const grandTotal = (r.items || []).reduce(
          (sum, item) => sum + Number(item.total || calculateLineTotal(item)),
          0
        );

        return `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${r.issue_no}</strong></td>
            <td>${r.date ? String(r.date).slice(0, 10) : "-"}</td>
            <td>${r.shipment_to || "-"}</td>
            <td>${itemsHtml || "-"}</td>
            <td style="text-align:center; font-weight:bold;">${grandTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html><html dir="${dir}" lang="${lang}">
      <head><meta charset="UTF-8"/><title>${t.title}</title>
      ${isUrdu ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">` : ""}
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:${font}; background:#fff; color:#0f172a; padding:40px; }
        .container { max-width:1100px; margin:0 auto; }
        .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e40af; padding-bottom:20px; margin-bottom:30px; }
        .brand { font-size:28px; font-weight:bold; color:#1e40af; text-transform:uppercase; }
        .report-title { font-size:18px; color:#64748b; margin-top:5px; }
        .meta { text-align:${isUrdu ? "left" : "right"}; font-size:12px; color:#64748b; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#1e40af; color:#fff; text-align:${isUrdu ? "right" : "left"}; padding:12px; font-weight:normal; }
        td { border-bottom:1px solid #e2e8f0; padding:10px; color:#334155; vertical-align:top; }
        tr:nth-child(even) td { background:#f8fafc; }
        .hint { background:#eff6ff; color:#1d4ed8; padding:15px; text-align:center; border-radius:8px; margin-bottom:20px; border:1px solid #bfdbfe; }
        @media print { body { padding:0; } .hint { display:none; } }
      </style></head>
      <body><div class="container">
        ${isPdf ? `<div class="hint">Select <strong>"Save as PDF"</strong> in the print dialog.</div>` : ""}
        <div class="header">
          <div><div class="brand">Unique Wear</div><div class="report-title">${t.reportHeader}</div></div>
          <div class="meta">${t.printedOn}: ${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th>${t.issueNo}</th>
              <th>${t.date}</th>
              <th>${t.shipmentTo}</th>
              <th>${t.products}</th>
              <th style="text-align:center;">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            ${
              filtered.length > 0
                ? rowsHtml
                : `<tr><td colspan="6" style="text-align:center;">${t.noRecords}</td></tr>`
            }
          </tbody>
        </table>
      </div>
      <script>window.onload=()=>{setTimeout(()=>{window.print();${!isPdf ? "window.onafterprint=()=>window.close();" : ""}},300);}</script>
      </body></html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div
      dir={dir}
      style={{ fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif" }}
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

      {message.text && (
        <div
          className={`fixed bottom-6 ${isUrdu ? "left-6" : "right-6"} z-50 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 ${
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

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-7xl mx-auto">
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
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow"
          >
            <i className="bi bi-box-arrow-right"></i>
            {t.addBtn}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="relative w-full max-w-sm">
            <i
              className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                isUrdu ? "right-3" : "left-3"
              }`}
            ></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm ${
                isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
              }`}
            />
          </div>

          <div className={`flex gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => generatePrintDocument(false)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm transition shadow-sm"
            >
              <i className="bi bi-printer text-blue-600"></i>
              {t.printBtn}
            </button>
            <button
              onClick={() => generatePrintDocument(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm transition shadow-sm"
            >
              <i className="bi bi-file-earmark-pdf text-red-500"></i>
              {t.pdfBtn}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-white text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className={`px-4 py-3.5 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-4 py-3.5 ${isUrdu ? "text-right" : "text-left"}`}>{t.issueNo}</th>
                  <th className={`px-4 py-3.5 ${isUrdu ? "text-right" : "text-left"}`}>{t.date}</th>
                  <th className={`px-4 py-3.5 ${isUrdu ? "text-right" : "text-left"}`}>{t.shipmentTo}</th>
                  <th className={`px-4 py-3.5 ${isUrdu ? "text-right" : "text-left"}`}>{t.products}</th>
                  <th className="px-4 py-3.5 text-center">{t.total}</th>
                  <th className="px-4 py-3.5 text-center">{t.actions}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      {t.loading}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <i className="bi bi-inbox text-4xl block mb-2 opacity-30"></i>
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const grandTotal = (r.items || []).reduce(
                      (sum, item) => sum + Number(item.total || calculateLineTotal(item)),
                      0
                    );

                    return (
                      <tr key={r.id} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs text-center">
                          {i + 1}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-xs font-mono font-bold">
                            {r.issue_no}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {r.date ? String(r.date).slice(0, 10) : "—"}
                        </td>

                        <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                          {r.shipment_to || "—"}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="space-y-2 min-w-[280px]">
                            {(r.items || []).map((item, idx) => (
                              <div
                                key={idx}
                                className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50"
                              >
                                <div className={`flex items-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <i className="bi bi-box-seam text-slate-600 text-xs"></i>
                                  </div>
                                  <span className="font-semibold text-slate-800 text-xs">
                                    {item.product_name || "-"}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {item.category_name || "-"} | {item.type_name || "-"} | Qty: {item.issued_qty || 0} | Rate: {item.rate || 0} | Total: {item.total || calculateLineTotal(item)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-sm border border-slate-200">
                            {grandTotal.toFixed(2)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className={`flex items-center justify-center gap-1.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                            <button
                              onClick={() => openEdit(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs hover:bg-blue-100 transition"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs hover:bg-red-100 transition"
                            >
                              <i className="bi bi-trash3"></i>
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
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col"
              dir={dir}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <i className="bi bi-box-arrow-right text-blue-700 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.issueNo} <span className="text-blue-500">*</span>
                    </label>
                    <div className="relative">
                      <i className={`bi bi-hash absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input
                        type="text"
                        value={form.issue_no}
                        onChange={(e) => setForm({ ...form, issue_no: e.target.value })}
                        placeholder="ISS-001"
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.date} <span className="text-blue-500">*</span>
                    </label>
                    <div className="relative">
                      <i className={`bi bi-calendar-event absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isUrdu ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t.shipmentTo} <span className="text-blue-500">*</span>
                    </label>
                    <div className="relative">
                      <i className={`bi bi-truck absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input
                        type="text"
                        value={form.shipment_to}
                        onChange={(e) => setForm({ ...form, shipment_to: e.target.value })}
                        placeholder={t.shipmentToPlaceholder}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">{t.products}</h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow"
                  >
                    <i className="bi bi-plus-lg"></i>
                    {t.addItem}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700">
                          {t.itemNo} {index + 1}
                        </h4>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs hover:bg-red-100 transition"
                          >
                            <i className="bi bi-trash3 me-1"></i>
                            {t.removeItem}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {t.product} <span className="text-blue-500">*</span>
                          </label>
                          <div className="relative">
                            <i className={`bi bi-box-seam absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                            <select
                              value={item.product_name}
                              onChange={(e) => updateItem(index, "product_name", e.target.value)}
                              className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none ${isUrdu ? "pr-9 pl-8 text-right" : "pl-9 pr-8"}`}
                            >
                              <option value="">{t.selectProduct}</option>
                              {products.map((p, i) => (
                                <option key={`${p}-${i}`} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            <i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {t.category}
                          </label>
                          <div className="relative">
                            <i className={`bi bi-tags absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                            <select
                              value={item.category_name}
                              onChange={(e) => updateItem(index, "category_name", e.target.value)}
                              className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none ${isUrdu ? "pr-9 pl-8 text-right" : "pl-9 pr-8"}`}
                            >
                              <option value="">{t.selectCategory}</option>
                              {categories.map((c, i) => (
                                <option key={`${c}-${i}`} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {t.productType}
                          </label>
                          <div className="relative">
                            <i className={`bi bi-diagram-2 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                            <select
                              value={item.type_name}
                              onChange={(e) => updateItem(index, "type_name", e.target.value)}
                              className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none ${isUrdu ? "pr-9 pl-8 text-right" : "pl-9 pr-8"}`}
                            >
                              <option value="">{t.selectType}</option>
                              {types.map((pt, i) => (
                                <option key={`${pt}-${i}`} value={pt}>
                                  {pt}
                                </option>
                              ))}
                            </select>
                            <i className={`bi bi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none ${isUrdu ? "left-3" : "right-3"}`}></i>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {t.issuedQty} <span className="text-blue-500">*</span>
                          </label>
                          <div className="relative">
                            <i className={`bi bi-box-arrow-right absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                            <input
                              type="number"
                              min="0"
                              value={item.issued_qty}
                              onChange={(e) => updateItem(index, "issued_qty", e.target.value)}
                              placeholder="0"
                              className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 font-semibold text-slate-700 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            {t.rate} <span className="text-blue-500">*</span>
                          </label>
                          <div className="relative">
                            <i className={`bi bi-currency-dollar absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateItem(index, "rate", e.target.value)}
                              placeholder="0.00"
                              className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 font-semibold text-slate-700 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-3">
                          <div className="text-xs text-slate-500">{t.total}</div>
                          <div className="text-lg font-bold text-slate-800">
                            {calculateLineTotal(item)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0 rounded-b-2xl ${
                  isUrdu ? "flex-row-reverse" : "justify-end"
                }`}
              >
                <button
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-600 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition bg-white"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSave}
                  className="bg-blue-700 text-white px-8 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition shadow flex items-center gap-2"
                >
                  <i className="bi bi-save"></i>
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}