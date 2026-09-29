import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const RAW_API = import.meta.env.VITE_API_BASE_URL || "https://apii.alibirdcageofficial.store";
const CLEAN_API = RAW_API.replace(/\/$/, "");
const API_BASE = CLEAN_API.endsWith("/api") ? CLEAN_API : `${CLEAN_API}/api`;

const LANG = {
  en: {
    title: "Bill of Materials (BOM)",
    subtitle: "Select one product head and define all materials used in its assembly",
    add: "Create BOM", refresh: "Refresh", toggle: "اردو", search: "Search BOM...",
    code: "BOM Code", head: "Product Head", headCategory: "Head Category", outputQty: "Assembly Qty", outputUnit: "Output Unit",
    materials: "Materials Used", matCategory: "Material Category", material: "Material Product", unit: "Unit",
    qty: "Required Qty", wastage: "Wastage %", effective: "Effective Qty", rate: "Rate", cost: "Material Cost",
    addMaterial: "Add Material", addRow: "Add Row", newMaterial: "New Material", materialName: "Material Name", selectUnit: "-- Select Unit --", saveMaterial: "Save Material", materialSaved: "Material saved and selected.", materialRequiredFields: "Material name, category and unit are required.", labor: "Labor Cost", notes: "Notes", totalMaterials: "Materials", materialTotal: "Material Total",
    totalCost: "Total BOM Cost", unitCost: "Cost / Output Unit", save: "Save BOM", saving: "Saving...", cancel: "Cancel",
    edit: "Edit", delete: "Delete", details: "Details", actions: "Actions", noRecords: "No BOM records found.",
    loading: "Loading...", selectHead: "-- Select Product Head --", selectCategory: "-- Select Category --",
    selectMaterial: "-- Select Material --", close: "Close", saved: "BOM saved successfully.", updated: "BOM updated successfully.",
    deleted: "BOM deleted successfully.", loadError: "Failed to load BOM data.", saveError: "Failed to save BOM.",
    deleteError: "Failed to delete BOM.", confirmDelete: "Are you sure you want to delete this BOM?",
    needHead: "Select a product head.", needQty: "Assembly quantity must be greater than zero.",
    needMaterial: "Complete at least one material row with category, product and quantity.", duplicate: "Same material cannot be added twice.",
    self: "Product head cannot be used as its own material.", categoryHelp: "Select category first; material list will only show products from that category.",
  },
  ur: {
    title: "بل آف مٹیریلز (BOM)",
    subtitle: "ایک پروڈکٹ ہیڈ منتخب کریں اور اسمبلی میں استعمال ہونے والا تمام میٹریل مقرر کریں",
    add: "نیا BOM", refresh: "ریفریش", toggle: "English", search: "BOM تلاش کریں...",
    code: "BOM کوڈ", head: "پروڈکٹ ہیڈ", headCategory: "ہیڈ کیٹیگری", outputQty: "اسمبلی مقدار", outputUnit: "آؤٹ پٹ یونٹ",
    materials: "استعمال ہونے والا میٹریل", matCategory: "میٹریل کیٹیگری", material: "میٹریل پروڈکٹ", unit: "یونٹ",
    qty: "مطلوبہ مقدار", wastage: "ویسٹج %", effective: "مؤثر مقدار", rate: "ریٹ", cost: "میٹریل لاگت",
    addMaterial: "میٹریل شامل کریں", addRow: "نئی رو", newMaterial: "نیا میٹریل", materialName: "میٹریل نام", selectUnit: "-- یونٹ منتخب کریں --", saveMaterial: "میٹریل محفوظ کریں", materialSaved: "میٹریل محفوظ ہو گیا اور منتخب ہو گیا۔", materialRequiredFields: "میٹریل نام، کیٹیگری اور یونٹ ضروری ہیں۔", labor: "لیبر لاگت", notes: "نوٹس", totalMaterials: "میٹریلز", materialTotal: "میٹریل ٹوٹل",
    totalCost: "کل BOM لاگت", unitCost: "فی یونٹ لاگت", save: "BOM محفوظ کریں", saving: "محفوظ ہو رہا ہے...", cancel: "منسوخ",
    edit: "ترمیم", delete: "حذف", details: "تفصیل", actions: "عمل", noRecords: "کوئی BOM ریکارڈ نہیں ملا۔",
    loading: "لوڈ ہو رہا ہے...", selectHead: "-- پروڈکٹ ہیڈ منتخب کریں --", selectCategory: "-- کیٹیگری منتخب کریں --",
    selectMaterial: "-- میٹریل منتخب کریں --", close: "بند کریں", saved: "BOM محفوظ ہو گیا۔", updated: "BOM اپڈیٹ ہو گیا۔",
    deleted: "BOM حذف ہو گیا۔", loadError: "BOM ڈیٹا لوڈ نہیں ہو سکا۔", saveError: "BOM محفوظ نہیں ہو سکا۔",
    deleteError: "BOM حذف نہیں ہو سکا۔", confirmDelete: "کیا آپ واقعی یہ BOM حذف کرنا چاہتے ہیں؟",
    needHead: "پروڈکٹ ہیڈ منتخب کریں۔", needQty: "اسمبلی مقدار صفر سے زیادہ ہونی چاہیے۔",
    needMaterial: "کم از کم ایک مکمل میٹریل رو شامل کریں۔", duplicate: "ایک ہی میٹریل دو بار شامل نہیں ہو سکتا۔",
    self: "پروڈکٹ ہیڈ کو میٹریل کے طور پر استعمال نہیں کیا جا سکتا۔", categoryHelp: "پہلے کیٹیگری منتخب کریں؛ صرف اسی کیٹیگری کے پروڈکٹس نظر آئیں گے۔",
  },
};

const list = (x) => Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : Array.isArray(x?.rows) ? x.rows : Array.isArray(x?.items) ? x.items : [];
const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const money = (v) => `₨ ${n(v).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const productName = (p) => p?.product_name || p?.name || "";
const categoryName = (c) => c?.category_name || c?.name || "";
const unitName = (u) => u?.unit_name || u?.name || u?.symbol || "";
const productCategoryId = (p) => p?.category_id ?? p?.product_category_id ?? "";
const productUnitId = (p) => p?.unit_id ?? "";
const active = (p) => !["0", "false", "inactive", "disabled"].includes(String(p?.is_active ?? p?.active ?? "1").toLowerCase());

const newRow = () => ({ key: `${Date.now()}-${Math.random()}`, category_id: "", product_id: "", qty: "", wastage_percent: "0", rate: "" });
const blankForm = () => ({ bom_code: `BOM-${Date.now().toString().slice(-6)}`, product_id: "", output_qty: "1", labor_cost: "", notes: "", items: [newRow()] });

function normalizeBom(r) {
  const items = list(r?.items).length ? list(r.items) : list(r?.materials).length ? list(r.materials) : r?.raw_material ? [{ raw_material: r.raw_material, qty: r.qty, rate: r.rate }] : [];
  return {
    ...r,
    product_id: r?.product_id ?? r?.head_product_id ?? r?.finished_product_id ?? "",
    product_name: r?.product_name ?? r?.head_product_name ?? r?.finished_product_name ?? "",
    category_name: r?.category_name ?? r?.product_category_name ?? "",
    output_qty: r?.output_qty ?? r?.batch_size ?? 1,
    items: items.map((x, i) => ({
      ...x, key: x?.id || `saved-${r?.id}-${i}`,
      category_id: x?.category_id ?? x?.material_category_id ?? "",
      product_id: x?.product_id ?? x?.material_product_id ?? "",
      product_name: x?.product_name ?? x?.material_name ?? x?.raw_material ?? "",
      qty: x?.qty ?? x?.quantity ?? x?.required_qty ?? "",
      wastage_percent: x?.wastage_percent ?? x?.wastage ?? 0,
      rate: x?.rate ?? x?.unit_rate ?? 0,
    })),
  };
}

export default function BOMPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const rtl = lang === "ur";
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTargetKey, setMaterialTargetKey] = useState(null);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    product_name: "",
    category_id: "",
    unit_id: "",
  });

  const toast = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [b, p, c, u] = await Promise.all([
        axios.get(`${API_BASE}/bom`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/units`),
      ]);
      setRecords(list(b.data).map(normalizeBom));
      setProducts(list(p.data));
      setCategories(list(c.data));
      setUnits(list(u.data));
    } catch (e) {
      toast("error", e?.response?.data?.error || e?.response?.data?.message || t.loadError);
    } finally { setLoading(false); }
  }, [t.loadError, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const categoryMap = useMemo(() => new Map(categories.map(c => [String(c.id), categoryName(c)])), [categories]);
  const unitMap = useMemo(() => new Map(units.map(u => [String(u.id), unitName(u)])), [units]);
  const productMap = useMemo(() => new Map(products.map(p => [String(p.id), p])), [products]);
  const usableProducts = useMemo(() => products.filter(active), [products]);
  const head = productMap.get(String(form.product_id));
  const headCategory = head?.category_name || categoryMap.get(String(productCategoryId(head))) || "-";
  const headUnit = head?.unit_name || unitMap.get(String(productUnitId(head))) || "-";

  const rows = useMemo(() => form.items.map(x => {
    const p = productMap.get(String(x.product_id));
    const qty = n(x.qty), waste = n(x.wastage_percent), effective = qty + qty * waste / 100, rate = n(x.rate);
    return { ...x, product: p, product_name: productName(p) || x.product_name || "-", unit_name: p?.unit_name || unitMap.get(String(productUnitId(p))) || "-", category_name: p?.category_name || categoryMap.get(String(x.category_id)) || "-", effective, cost: effective * rate };
  }), [form.items, productMap, unitMap, categoryMap]);

  const materialTotal = rows.reduce((s, x) => s + x.cost, 0);
  const totalCost = materialTotal + n(form.labor_cost);
  const perUnit = n(form.output_qty) > 0 ? totalCost / n(form.output_qty) : 0;

  const openAdd = () => { setEditingId(null); setForm(blankForm()); setShowForm(true); };
  const closeForm = () => { if (!saving) { setShowForm(false); setEditingId(null); } };

  const openEdit = (r) => {
    const b = normalizeBom(r);
    let headId = b.product_id;
    if (!headId && b.product_name) headId = products.find(p => productName(p).toLowerCase() === String(b.product_name).toLowerCase())?.id || "";
    setEditingId(b.id);
    setForm({
      bom_code: b.bom_code || `BOM-${b.id}`,
      product_id: headId || "",
      output_qty: String(b.output_qty || 1),
      labor_cost: String(b.labor_cost || ""),
      notes: b.notes || "",
      items: b.items.length ? b.items.map(x => ({ key: x.key || `${Date.now()}-${Math.random()}`, category_id: String(x.category_id || ""), product_id: String(x.product_id || ""), qty: String(x.qty ?? ""), wastage_percent: String(x.wastage_percent ?? 0), rate: String(x.rate ?? "") })) : [newRow()],
    });
    setShowForm(true);
  };

  const changeRow = (key, field, value) => setForm(f => ({ ...f, items: f.items.map(x => x.key !== key ? x : field === "category_id" ? { ...x, category_id: value, product_id: "" } : { ...x, [field]: value }) }));
  const addRow = () => setForm(f => ({ ...f, items: [...f.items, newRow()] }));
  const removeRow = (key) => setForm(f => f.items.length === 1 ? f : ({ ...f, items: f.items.filter(x => x.key !== key) }));
  const optionsFor = (row) => !row.category_id ? [] : usableProducts.filter(p => String(productCategoryId(p)) === String(row.category_id) && String(p.id) !== String(form.product_id));

  const openNewMaterial = (row) => {
    setMaterialTargetKey(row.key);
    setMaterialForm({
      product_name: "",
      category_id: row.category_id ? String(row.category_id) : "",
      unit_id: "",
    });
    setShowMaterialForm(true);
  };

  const closeNewMaterial = () => {
    if (materialSaving) return;
    setShowMaterialForm(false);
    setMaterialTargetKey(null);
    setMaterialForm({
      product_name: "",
      category_id: "",
      unit_id: "",
    });
  };

  const saveNewMaterial = async () => {
    const name = materialForm.product_name.trim();

    if (!name || !materialForm.category_id || !materialForm.unit_id) {
      toast("error", t.materialRequiredFields);
      return;
    }

    const categoryLabel =
      categoryMap.get(String(materialForm.category_id)) || "";
    const unitLabel =
      unitMap.get(String(materialForm.unit_id)) || "";

    const productPayload = {
      product_name: name,
      description: [
        name,
        categoryLabel ? `Category: ${categoryLabel}` : "",
        unitLabel ? `Unit: ${unitLabel}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      product_type_id: null,
      category_id: Number(materialForm.category_id),
      unit_id: Number(materialForm.unit_id),
      master_packing_unit_id: null,
      master_packing_pieces: 0,
      is_active: 1,
      sale_unit: "single",
      pieces_per_carton: 0,
      piece_rate: 0,
    };

    try {
      setMaterialSaving(true);

      const createdResponse = await axios.post(
        `${API_BASE}/products`,
        productPayload
      );

      // Reload Product Master so this material remains available
      // in future BOM dropdowns as well.
      const freshResponse = await axios.get(`${API_BASE}/products`);
      const freshProducts = list(freshResponse.data);
      setProducts(freshProducts);

      const responseProduct =
        createdResponse?.data?.data ||
        createdResponse?.data?.product ||
        createdResponse?.data ||
        {};

      const responseId = responseProduct?.id;

      let createdProduct = responseId
        ? freshProducts.find(
            (p) => String(p.id) === String(responseId)
          )
        : null;

      if (!createdProduct) {
        const matches = freshProducts.filter(
          (p) =>
            productName(p).trim().toLowerCase() ===
              name.toLowerCase() &&
            String(productCategoryId(p)) ===
              String(materialForm.category_id)
        );

        createdProduct =
          matches.length > 0
            ? matches[matches.length - 1]
            : null;
      }

      if (!createdProduct) {
        throw new Error(
          "Material was saved but could not be found after refresh."
        );
      }

      // Automatically select the newly created material in the row
      // from which the + button was opened.
      setForm((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          item.key !== materialTargetKey
            ? item
            : {
                ...item,
                category_id: String(materialForm.category_id),
                product_id: String(createdProduct.id),
              }
        ),
      }));

      toast("success", t.materialSaved);
      closeNewMaterial();
    } catch (error) {
      console.error(
        "NEW MATERIAL SAVE ERROR:",
        error?.response?.data || error
      );

      toast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          t.saveError
      );
    } finally {
      setMaterialSaving(false);
    }
  };

  const validate = () => {
    if (!form.product_id) return toast("error", t.needHead), false;
    if (n(form.output_qty) <= 0) return toast("error", t.needQty), false;
    if (!form.items.length || form.items.some(x => !x.category_id || !x.product_id || n(x.qty) <= 0)) return toast("error", t.needMaterial), false;
    if (form.items.some(x => String(x.product_id) === String(form.product_id))) return toast("error", t.self), false;
    const ids = form.items.map(x => String(x.product_id));
    if (new Set(ids).size !== ids.length) return toast("error", t.duplicate), false;
    return true;
  };

  const payload = () => ({
    bom_code: form.bom_code,
    product_id: Number(form.product_id),
    product_name: productName(head),
    product_category_id: productCategoryId(head) ? Number(productCategoryId(head)) : null,
    category_name: headCategory,
    output_qty: n(form.output_qty), batch_size: n(form.output_qty), bom_type: "Assembly",
    output_unit_id: productUnitId(head) ? Number(productUnitId(head)) : null,
    output_unit_name: headUnit,
    labor_cost: n(form.labor_cost), notes: form.notes.trim(), material_total: Number(materialTotal.toFixed(2)), total_cost: Number(totalCost.toFixed(2)), per_unit_cost: Number(perUnit.toFixed(4)),
    items: rows.map(x => ({ category_id: Number(x.category_id), category_name: x.category_name, product_id: Number(x.product_id), product_name: x.product_name, unit_id: productUnitId(x.product) ? Number(productUnitId(x.product)) : null, unit_name: x.unit_name, qty: n(x.qty), required_qty: n(x.qty), wastage_percent: n(x.wastage_percent), effective_qty: Number(x.effective.toFixed(4)), rate: n(x.rate), material_cost: Number(x.cost.toFixed(2)), total: Number(x.cost.toFixed(2)) })),
  });

  const saveBom = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const data = payload();
      if (editingId) { await axios.put(`${API_BASE}/bom/${editingId}`, data); toast("success", t.updated); }
      else { await axios.post(`${API_BASE}/bom`, data); toast("success", t.saved); }
      setShowForm(false); setEditingId(null); await loadData();
    } catch (e) {
      console.error("BOM save:", e?.response?.data || e);
      toast("error", e?.response?.data?.error || e?.response?.data?.message || t.saveError);
    } finally { setSaving(false); }
  };

  const deleteBom = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try { await axios.delete(`${API_BASE}/bom/${id}`); toast("success", t.deleted); await loadData(); }
    catch (e) { toast("error", e?.response?.data?.error || e?.response?.data?.message || t.deleteError); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => [r.bom_code, r.product_name, r.category_name, ...(r.items || []).map(x => x.product_name || x.raw_material)].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [records, search]);

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-3 pb-16 sm:p-4" style={{ fontFamily: rtl ? "'Noto Nastaliq Urdu', serif" : "Inter, Arial, sans-serif" }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      {message.text && <div className={`fixed bottom-5 z-[150] rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-2xl ${rtl ? "left-5" : "right-5"} ${message.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>{message.text}</div>}

      {!showForm && <main className="mx-auto max-w-[1220px]">
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-black text-slate-950 sm:text-2xl">{t.title}</h1><p className="mt-0.5 text-[11px] text-slate-500">{t.subtitle}</p></div>
            <div className="flex gap-2"><TopButton onClick={() => setLang(x => x === "en" ? "ur" : "en")} soft icon="bi-translate">{t.toggle}</TopButton><TopButton onClick={loadData} soft icon="bi-arrow-clockwise">{t.refresh}</TopButton><TopButton onClick={openAdd} icon="bi-plus-lg">{t.add}</TopButton></div>
          </div>
        </section>

        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="relative max-w-lg"><i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${rtl ? "right-3" : "left-3"}`} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} className={`h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${rtl ? "pr-9 pl-3" : "pl-9 pr-3"}`} /></div></section>

        <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <table className="w-full table-fixed text-xs"><colgroup><col style={{width:"5%"}}/><col style={{width:"14%"}}/><col style={{width:"25%"}}/><col style={{width:"18%"}}/><col style={{width:"10%"}}/><col style={{width:"9%"}}/><col style={{width:"10%"}}/><col style={{width:"9%"}}/></colgroup>
            <thead className="bg-slate-900 text-white"><tr><Th c>#</Th><Th>{t.code}</Th><Th>{t.head}</Th><Th>{t.headCategory}</Th><Th c>{t.outputQty}</Th><Th c>{t.totalMaterials}</Th><Th r>{t.totalCost}</Th><Th c>{t.actions}</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="py-10 text-center text-slate-400">{t.loading}</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-slate-400">{t.noRecords}</td></tr> : filtered.map((b,i) => <tr key={b.id} className="hover:bg-indigo-50/40"><Td c muted>{i+1}</Td><Td><span className="rounded-md bg-indigo-50 px-2 py-1 font-mono text-[9px] font-black text-indigo-700">{b.bom_code || `BOM-${b.id}`}</span></Td><Td><b className="text-slate-950">{b.product_name || "-"}</b></Td><Td>{b.category_name || "-"}</Td><Td c>{b.output_qty || 1}</Td><Td c><button onClick={() => setSelected(b)} className="rounded-lg bg-indigo-600 px-2 py-1.5 text-[9px] font-black text-white"><i className="bi bi-list-check mr-1"/>{b.items?.length || 0}</button></Td><Td r><b className="font-mono text-indigo-700">{money(b.total_cost ?? b.total ?? 0)}</b></Td><Td c><div className="flex justify-center gap-1"><IconButton green icon="bi-pencil-square" onClick={() => openEdit(b)}/><IconButton red icon="bi-trash3" onClick={() => deleteBom(b.id)}/></div></Td></tr>)}
            </tbody>
          </table>
        </section>

        <section className="grid gap-2 sm:grid-cols-2 lg:hidden">{filtered.map((b,i) => <article key={b.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex justify-between gap-2"><div><div className="text-[9px] font-black text-indigo-700">{b.bom_code || `BOM-${b.id}`}</div><h3 className="mt-1 text-sm font-black text-slate-950">{b.product_name}</h3><p className="text-[10px] text-slate-500">{b.category_name || "-"}</p></div><button onClick={() => setSelected(b)} className="h-8 rounded-lg bg-indigo-600 px-2 text-[9px] font-black text-white">{b.items?.length || 0} {t.totalMaterials}</button></div><div className="mt-2 grid grid-cols-2 gap-1.5"><Info label={t.outputQty} value={b.output_qty || 1}/><Info label={t.totalCost} value={money(b.total_cost ?? 0)}/></div><div className="mt-2 grid grid-cols-2 gap-1.5"><button onClick={() => openEdit(b)} className="h-8 rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-700">{t.edit}</button><button onClick={() => deleteBom(b.id)} className="h-8 rounded-lg bg-rose-50 text-[10px] font-black text-rose-600">{t.delete}</button></div></article>)}</section>
      </main>}

      {showForm && (
        <div className="bom-form-page-wrap">
          <div className="bom-inputModalBox bom-fullPageInputBox">
            <div className="bom-inputModalTitle">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                  <i className="bi bi-diagram-3-fill" />
                </span>

                <div className="min-w-0">
                  <div className="truncate">
                    {editingId ? t.edit : t.add}
                  </div>

                  <div className="mt-0.5 truncate text-[9px] font-bold text-slate-300">
                    {t.categoryHelp}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="bom-closeBtn"
                onClick={closeForm}
                disabled={saving}
              >
                ← {t.cancel}
              </button>
            </div>

            <div className="bom-inputModalBody">
              {/* SAME SALES-INVOICE STYLE TOP LINE */}
              <div className="bom-form-box">
                <div className="bom-formTopLine">
                  <Field label={t.code}>
                    <input
                      className="bom-basicInput font-mono"
                      value={form.bom_code}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          bom_code: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label={t.head}>
                    <select
                      className="bom-basicSelect"
                      value={form.product_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          product_id: e.target.value,
                          items: f.items.map((x) =>
                            String(x.product_id) === String(e.target.value)
                              ? { ...x, product_id: "" }
                              : x
                          ),
                        }))
                      }
                    >
                      <option value="">{t.selectHead}</option>

                      {usableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {productName(p)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t.headCategory}>
                    <input
                      className="bom-basicInput"
                      value={headCategory}
                      readOnly
                    />
                  </Field>

                  <Field label={t.outputQty}>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      className="bom-basicInput"
                      value={form.output_qty}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          output_qty: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label={t.outputUnit}>
                    <input
                      className="bom-basicInput"
                      value={headUnit}
                      readOnly
                    />
                  </Field>

                  <Field label={t.labor}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="bom-basicInput"
                      value={form.labor_cost}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          labor_cost: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* MATERIAL SECTION — SAME SALES-INVOICE SECTION HEAD/TABLE */}
              <div className="bom-sectionHead">
                <div className="min-w-0">
                  <div className="truncate">{t.materials}</div>
                  <div className="mt-0.5 truncate text-[8px] font-bold text-slate-500">
                    {t.categoryHelp}
                  </div>
                </div>

                <button
                  type="button"
                  className="bom-basicBtn"
                  onClick={addRow}
                >
                  <i className="bi bi-plus-lg" />
                  {t.addRow}
                </button>
              </div>

              <div className="bom-paymentPanel">
                <div className="overflow-x-auto">
                  <table className="bom-basicProductTable">
                    <colgroup>
                      <col style={{ width: "3%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "24%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "5%" }} />
                    </colgroup>

                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t.matCategory}</th>
                        <th>{t.material}</th>
                        <th>{t.unit}</th>
                        <th>{t.qty}</th>
                        <th>{t.wastage}</th>
                        <th>{t.effective}</th>
                        <th>{t.rate}</th>
                        <th>{t.cost}</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((x, i) => (
                        <tr key={x.key}>
                          <td className="text-center font-black text-slate-400">
                            {i + 1}
                          </td>

                          <td>
                            <select
                              className="bom-productInput"
                              value={x.category_id}
                              onChange={(e) =>
                                changeRow(
                                  x.key,
                                  "category_id",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">{t.selectCategory}</option>

                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {categoryName(c)}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <div className="bom-materialSelectWrap">
                              <select
                                className="bom-productInput"
                                disabled={!x.category_id}
                                value={x.product_id}
                                onChange={(e) =>
                                  changeRow(
                                    x.key,
                                    "product_id",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">{t.selectMaterial}</option>

                                {optionsFor(x).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {productName(p)}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                className="bom-newMaterialBtn"
                                onClick={() => openNewMaterial(x)}
                                title={t.newMaterial}
                              >
                                <i className="bi bi-plus-lg" />
                              </button>
                            </div>
                          </td>

                          <td>
                            <input
                              className="bom-productInput bom-readonlyInput"
                              value={x.unit_name || "-"}
                              readOnly
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="bom-productInput"
                              value={x.qty}
                              onChange={(e) =>
                                changeRow(x.key, "qty", e.target.value)
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="bom-productInput"
                              value={x.wastage_percent}
                              onChange={(e) =>
                                changeRow(
                                  x.key,
                                  "wastage_percent",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="bom-productInput bom-readonlyInput font-mono"
                              value={x.effective.toLocaleString("en-PK", {
                                maximumFractionDigits: 4,
                              })}
                              readOnly
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="bom-productInput"
                              value={x.rate}
                              onChange={(e) =>
                                changeRow(x.key, "rate", e.target.value)
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="bom-productInput bom-readonlyInput font-mono"
                              value={money(x.cost)}
                              readOnly
                            />
                          </td>

                          <td className="text-center">
                            <button
                              type="button"
                              disabled={form.items.length === 1}
                              onClick={() => removeRow(x.key)}
                              className="bom-rowDeleteBtn"
                              title={t.delete}
                            >
                              <i className="bi bi-trash3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NOTES */}
              <div className="bom-sectionHead">
                <span>{t.notes}</span>
              </div>

              <div className="bom-paymentPanel">
                <textarea
                  rows={3}
                  className="bom-basicTextarea"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>

              {/* SALES-INVOICE STYLE TOTAL BOXES */}
              <div className="bom-finalTotalBar">
                <TotalBox
                  label={t.totalMaterials}
                  value={rows.length}
                />

                <TotalBox
                  label={t.materialTotal}
                  value={money(materialTotal)}
                />

                <TotalBox
                  label={t.labor}
                  value={money(form.labor_cost)}
                />

                <TotalBox
                  label={t.totalCost}
                  value={money(totalCost)}
                />

                <TotalBox
                  label={t.outputQty}
                  value={`${form.output_qty || 0} ${headUnit || ""}`}
                />

                <TotalBox
                  label={t.unitCost}
                  value={money(perUnit)}
                  grand
                />
              </div>

              {/* SALES-INVOICE STYLE FOOTER */}
              <div className="bom-modalFooterBasic">
                <button
                  type="button"
                  className="bom-basicBtn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  {t.cancel}
                </button>

                <button
                  type="button"
                  className="bom-saveBtn"
                  disabled={saving}
                  onClick={saveBom}
                >
                  <i
                    className={`bi ${
                      saving ? "bi-arrow-repeat bom-spin" : "bi-save"
                    }`}
                  />
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3" onMouseDown={e => e.target===e.currentTarget && setSelected(null)}><div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><div><h2 className="font-black text-slate-950">{t.details}</h2><p className="text-[10px] text-slate-500">{selected.bom_code} · {selected.product_name}</p></div><button onClick={() => setSelected(null)} className="h-8 w-8 rounded-lg bg-indigo-600 text-white"><i className="bi bi-x-lg"/></button></div><div className="max-h-[75vh] overflow-auto p-3"><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Info label={t.head} value={selected.product_name}/><Info label={t.headCategory} value={selected.category_name || "-"}/><Info label={t.outputQty} value={selected.output_qty || 1}/><Info accent label={t.totalMaterials} value={selected.items?.length || 0}/></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-[10px]"><thead className="bg-slate-900 text-white"><tr><Th c>#</Th><Th>{t.matCategory}</Th><Th>{t.material}</Th><Th>{t.unit}</Th><Th r>{t.qty}</Th><Th r>{t.wastage}</Th><Th r>{t.rate}</Th><Th r>{t.cost}</Th></tr></thead><tbody>{(selected.items||[]).map((x,i) => <tr key={x.id||x.key||i} className="border-b border-slate-100"><Td c>{i+1}</Td><Td>{x.category_name || categoryMap.get(String(x.category_id)) || "-"}</Td><Td><b>{x.product_name || x.raw_material || "-"}</b></Td><Td>{x.unit_name || "-"}</Td><Td r>{x.qty || x.required_qty || 0}</Td><Td r>{x.wastage_percent || 0}%</Td><Td r>{money(x.rate)}</Td><Td r>{money(x.material_cost ?? x.total ?? n(x.qty)*n(x.rate))}</Td></tr>)}</tbody></table></div></div></div></div>}

      {showMaterialForm && (
        <div
          className="bom-miniModalBack"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeNewMaterial();
            }
          }}
        >
          <div className="bom-miniModal" dir={rtl ? "rtl" : "ltr"}>
            <div className="bom-miniModalTitle">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <i className="bi bi-box-seam-fill" />
                </span>
                <span>{t.newMaterial}</span>
              </div>

              <button
                type="button"
                className="bom-miniCloseBtn"
                onClick={closeNewMaterial}
                disabled={materialSaving}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="bom-miniModalBody">
              <div className="bom-miniGrid">
                <Field label={t.materialName}>
                  <input
                    autoFocus
                    className="bom-basicInput"
                    value={materialForm.product_name}
                    onChange={(e) =>
                      setMaterialForm((f) => ({
                        ...f,
                        product_name: e.target.value,
                      }))
                    }
                    placeholder={t.materialName}
                  />
                </Field>

                <Field label={t.matCategory}>
                  <select
                    className="bom-basicSelect"
                    value={materialForm.category_id}
                    onChange={(e) =>
                      setMaterialForm((f) => ({
                        ...f,
                        category_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">{t.selectCategory}</option>

                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {categoryName(c)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t.unit}>
                  <select
                    className="bom-basicSelect"
                    value={materialForm.unit_id}
                    onChange={(e) =>
                      setMaterialForm((f) => ({
                        ...f,
                        unit_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">{t.selectUnit}</option>

                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {unitName(u)}
                        {u.symbol ? ` (${u.symbol})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="bom-miniHint">
                <i className="bi bi-info-circle" />
                <span>
                  {t.categoryHelp}
                </span>
              </div>
            </div>

            <div className="bom-miniFooter">
              <button
                type="button"
                className="bom-basicBtn"
                onClick={closeNewMaterial}
                disabled={materialSaving}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="bom-saveBtn"
                onClick={saveNewMaterial}
                disabled={materialSaving}
              >
                <i
                  className={`bi ${
                    materialSaving
                      ? "bi-arrow-repeat bom-spin"
                      : "bi-plus-circle"
                  }`}
                />
                {materialSaving ? t.saving : t.saveMaterial}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }

        @keyframes bomFadeSlide {
          from { opacity: 0; transform: translateY(-12px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes bomSpin {
          to { transform: rotate(360deg); }
        }

        .bom-spin {
          animation: bomSpin .8s linear infinite;
        }

        .bom-form-page-wrap {
          max-width: 1220px;
          width: 100%;
          margin: 0 auto;
          animation: bomFadeSlide .22s ease-out both;
        }

        .bom-fullPageInputBox {
          width: 100% !important;
          max-width: 100% !important;
          min-height: calc(100vh - 24px);
          box-shadow: 0 14px 38px rgba(15,23,42,.07) !important;
        }

        .bom-inputModalBox {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          overflow: hidden;
        }

        .bom-inputModalTitle {
          min-height: 46px;
          background: linear-gradient(135deg,#0f172a,#1e293b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 14px;
          font-size: 15px;
          font-weight: 900;
        }

        .bom-closeBtn {
          min-width: 80px;
          height: 29px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.08);
          color: white;
          border-radius: 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .bom-closeBtn:hover {
          background: rgba(255,255,255,.14);
        }

        .bom-inputModalBody {
          padding: 9px;
          background: #f3f6fb;
        }

        .bom-form-box {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
        }

        .bom-formTopLine {
          display: grid;
          grid-template-columns:
            125px minmax(220px,1.5fr) 145px 105px 105px 125px;
          gap: 6px;
          align-items: end;
          margin-bottom: 6px;
        }

        .basicLabel {
          display: block;
          margin-bottom: 3px;
          color: #334155;
          font-size: 8.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .35px;
        }

        .bom-basicInput,
        .bom-basicSelect,
        .bom-productInput,
        .bom-basicTextarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          border-radius: 10px;
          outline: none;
          font-weight: 650;
          transition: .16s;
        }

        .bom-basicInput,
        .bom-basicSelect,
        .bom-productInput {
          height: 30px;
          padding: 3px 7px;
          font-size: 9.5px;
        }

        .bom-basicTextarea {
          min-height: 50px;
          padding: 6px 8px;
          resize: vertical;
          font-size: 9.5px;
        }

        .bom-basicInput[readonly],
        .bom-readonlyInput {
          background: #f1f5f9 !important;
          color: #475569;
        }

        .bom-productInput:disabled,
        .bom-basicSelect:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .bom-basicInput:focus,
        .bom-basicSelect:focus,
        .bom-productInput:focus,
        .bom-basicTextarea:focus {
          border-color: #0B4E9B;
          box-shadow: 0 0 0 3px rgba(79,70,229,.10);
        }

        .bom-sectionHead {
          min-height: 32px;
          background: linear-gradient(135deg,#EFF6FF,#f8fafc);
          border: 1px solid #cbd5e1;
          border-radius: 14px 14px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 4px 9px;
          margin-top: 7px;
          font-size: 10px;
          font-weight: 950;
          color: #0f172a;
          box-shadow: 0 10px 24px rgba(15,23,42,.045);
        }

        .bom-paymentPanel {
          border: 1px solid #cbd5e1;
          border-top: none;
          padding: 5px;
          background: white;
          border-radius: 0 0 14px 14px;
          overflow: auto;
          box-shadow: 0 12px 28px rgba(15,23,42,.045);
        }

        .bom-basicBtn {
          min-height: 28px;
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          padding: 4px 9px;
          font-size: 9px;
          cursor: pointer;
          border-radius: 10px;
          font-weight: 850;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .bom-basicBtn:hover {
          background: #f8fafc;
        }

        .bom-saveBtn {
          min-height: 29px;
          border: 1px solid #0B4E9B;
          background: #0B4E9B;
          color: white;
          padding: 4px 11px;
          font-size: 9px;
          cursor: pointer;
          border-radius: 10px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .bom-saveBtn:hover {
          background: #0A65BD;
          border-color: #0A65BD;
        }

        .bom-saveBtn:disabled,
        .bom-basicBtn:disabled,
        .bom-closeBtn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .bom-basicProductTable {
          width: 100%;
          min-width: 0;
          border-collapse: collapse;
          background: white;
          table-layout: fixed;
        }

        .bom-basicProductTable th,
        .bom-basicProductTable td {
          border: 1px solid #D6E0EE;
          padding: 3px;
          font-size: 9px;
          vertical-align: middle;
          overflow: hidden;
        }

        .bom-basicProductTable th {
          background: #e2e8f0;
          text-align: center;
          color: #334155;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .bom-rowDeleteBtn {
          width: 26px;
          height: 26px;
          border: 1px solid #fecdd3;
          background: #fff1f2;
          color: #e11d48;
          border-radius: 9px;
          cursor: pointer;
        }

        .bom-rowDeleteBtn:disabled {
          opacity: .3;
          cursor: not-allowed;
        }

        .bom-finalTotalBar {
          margin-top: 7px;
          display: grid;
          grid-template-columns: repeat(6,1fr);
          gap: 6px;
        }

        .bom-totalBox {
          border: 1px solid #D6E0EE;
          background: #f8fafc;
          border-radius: 10px;
          padding: 7px 8px;
          min-width: 0;
        }

        .bom-totalBox label {
          display: block;
          color: #64748b;
          font-size: 8px;
          margin-bottom: 3px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .bom-totalBox b {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: monospace;
          font-size: 12px;
          color: #0f172a;
        }

        .bom-grandBox {
          background: #EFF6FF;
          border-color: #DBEAFE;
        }

        .bom-grandBox b {
          color: #285DB8;
        }

        .bom-modalFooterBasic {
          padding: 7px 0 0;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          position: sticky;
          bottom: 0;
          background:
            linear-gradient(180deg,rgba(243,246,251,0),#f3f6fb 35%);
        }


        .bom-materialSelectWrap {
          display: grid;
          grid-template-columns: minmax(0,1fr) 27px;
          gap: 3px;
          align-items: center;
        }

        .bom-newMaterialBtn {
          width: 27px;
          height: 27px;
          border: 1px solid #DBEAFE;
          border-radius: 8px;
          background: #EFF6FF;
          color: #0B4E9B;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 11px;
          font-weight: 950;
          transition: .14s ease;
        }

        .bom-newMaterialBtn:hover {
          background: #0B4E9B;
          border-color: #0B4E9B;
          color: white;
        }

        .bom-miniModalBack {
          position: fixed;
          inset: 0;
          z-index: 220;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: rgba(15,23,42,.58);
          backdrop-filter: blur(5px);
        }

        .bom-miniModal {
          width: min(520px, 100%);
          overflow: hidden;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: #f8fafc;
          box-shadow: 0 28px 80px rgba(15,23,42,.28);
          animation: bomFadeSlide .18s ease-out both;
        }

        .bom-miniModalTitle {
          min-height: 44px;
          padding: 7px 12px;
          background: linear-gradient(135deg,#0f172a,#1e293b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 900;
        }

        .bom-miniCloseBtn {
          width: 29px;
          height: 29px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 9px;
          background: rgba(255,255,255,.08);
          color: white;
          cursor: pointer;
        }

        .bom-miniModalBody {
          padding: 10px;
        }

        .bom-miniGrid {
          display: grid;
          grid-template-columns: 1.35fr 1fr 1fr;
          gap: 7px;
          align-items: end;
        }

        .bom-miniHint {
          margin-top: 7px;
          display: flex;
          align-items: flex-start;
          gap: 5px;
          border: 1px solid #DBEAFE;
          border-radius: 9px;
          background: #EFF6FF;
          padding: 6px 8px;
          color: #475569;
          font-size: 8.5px;
          font-weight: 700;
          line-height: 1.35;
        }

        .bom-miniFooter {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          border-top: 1px solid #D6E0EE;
          background: white;
          padding: 8px 10px;
        }

        @media(max-width: 1120px) {
          .bom-formTopLine {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }

          .bom-finalTotalBar {
            grid-template-columns: repeat(3,1fr);
          }
        }

        @media(max-width: 780px) {
          .bom-form-page-wrap {
            max-width: 100%;
          }

          .bom-fullPageInputBox {
            min-height: calc(100vh - 24px);
            border-radius: 14px;
          }

          .bom-inputModalTitle {
            min-height: 54px;
            padding: 10px 12px;
            font-size: 14px;
          }

          .bom-inputModalBody {
            padding: 10px;
          }

          .bom-formTopLine {
            grid-template-columns: 1fr;
          }

          .bom-finalTotalBar {
            grid-template-columns: 1fr;
          }

          .bom-basicProductTable {
            min-width: 980px;
          }

          .bom-modalFooterBasic {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .bom-miniGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function TopButton({children,onClick,soft=false,icon}) { return <button type="button" onClick={onClick} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-black ${soft ? "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}><i className={`bi ${icon}`}/>{children}</button>; }
function Field({label,children,span=""}) { return <div className={span}><label className="basicLabel">{label}</label>{children}</div>; }
function Read({children,small=false}) { return <div className={`flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 px-2 font-bold text-slate-600 ${small ? "text-[9px]" : "text-[10px]"}`}>{children || "-"}</div>; }
function Info({label,value,accent=false}) { return <div className={`rounded-lg border p-2 ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}><div className="text-[8px] font-black uppercase text-slate-500">{label}</div><div className={`mt-1 text-[10px] font-black ${accent ? "text-indigo-700" : "text-slate-950"}`}>{value}</div></div>; }
function TotalBox({label,value,grand=false}) { return <div className={`bom-totalBox ${grand ? "bom-grandBox" : ""}`}><label>{label}</label><b>{value}</b></div>; }
function IconButton({icon,onClick,green,red}) { return <button type="button" onClick={onClick} className={`flex h-7 w-7 items-center justify-center rounded-lg ${green ? "bg-emerald-50 text-emerald-700" : red ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-700"}`}><i className={`bi ${icon}`}/></button>; }
function Th({children,c=false,r=false}) { return <th className={`px-2 py-2.5 text-[8px] font-black uppercase ${c ? "text-center" : r ? "text-right" : "text-left"}`}>{children}</th>; }
function Td({children,c=false,r=false,muted=false}) { return <td className={`px-2 py-2.5 text-[10px] ${c ? "text-center" : r ? "text-right" : "text-left"} ${muted ? "text-slate-400" : "text-slate-600"}`}>{children}</td>; }
