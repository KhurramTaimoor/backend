import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const RETURNS_API = `${API_ROOT}/api/sales-returns`;
const INVOICES_API = `${API_ROOT}/api/sales-invoices`;
const CUSTOMERS_API = `${API_ROOT}/api/customers`;
const EMPLOYEES_API = `${API_ROOT}/api/employees`;
const SUPPLIERS_API = `${API_ROOT}/api/suppliers`;
const GENERAL_LEDGERS_API = `${API_ROOT}/api/general-ledgers`;
const CATEGORIES_API = `${API_ROOT}/api/categories`;
const PRODUCTS_API = `${API_ROOT}/api/products`;
const UNITS_API = `${API_ROOT}/api/units`;

const LANG = {
  en: {
    title: "Sales Return",
    subtitle: "Create manual returns or return products against sales invoice",
    newReturn: "New Return",
    viewSummary: "View Summary",
    hideSummary: "Hide Summary",
    refresh: "Refresh",
    toggleLang: "اردو",
    searchPlaceholder: "Search return no, invoice, name, product, date or reason...",
    todayFilter: "Today",
    selectDate: "Select Date",
    showingDate: "Showing Date",
    all: "All",
    manualReturn: "Manual Sales Return",
    autoReturn: "Automatic Sales Return",
    mode: "Return Mode",
    customerType: "Customer Type",
    name: "Name",
    returnNo: "Return No",
    invoiceNo: "Invoice No",
    invoiceRef: "Invoice Ref",
    saleDate: "Sale Date",
    returnDate: "Return Date",
    date: "Date",
    reference: "Reference",
    reason: "Reason",
    products: "Products",
    invoiceProducts: "Invoice Products",
    selectInvoice: "Select Invoice",
    invoiceList: "Sales Invoices",
    showDetails: "Show Details",
    selectedInvoice: "Selected Invoice",
    addRow: "+ Add Row",
    productType: "Product Type",
    category: "Category",
    product: "Product",
    manualProductName: "Manual Product Name",
    desc: "Desc",
    unit: "Unit",
    soldQty: "Sold Qty",
    alreadyReturned: "Already Returned",
    availableQty: "Available Qty",
    returnQty: "Return Qty",
    rate: "Rate",
    returnAmount: "Return Amount",
    debit: "Debit",
    credit: "Credit",
    totalQty: "Total Quantity",
    totalReturns: "Total Returns",
    totalItems: "Total Items",
    totalAmount: "Total Amount",
    totalDebit: "Total Debit",
    totalCredit: "Total Credit",
    save: "Save",
    update: "Update",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    print: "Print",
    actions: "Actions",
    loading: "Loading...",
    noRecords: "No returns found.",
    noInvoices: "No invoices found.",
    select: "Select",
    selectName: "Select Name",
    selectProduct: "Select Product",
    customer: "Customer",
    employee: "Employee",
    supplier: "Supplier",
    generalLedger: "General Ledger",
    requiredReturn: "Return No is required.",
    requiredPartyType: "Customer Type is required.",
    requiredParty: "Please select a name.",
    requiredInvoice: "Please select sales invoice.",
    requiredItem: "Add at least one valid return product row.",
    qtyInvalid: "Return qty must be greater than 0.",
    qtyExceeded: "Return qty exceeds available qty.",
    saved: "Sales return saved.",
    updated: "Sales return updated.",
    deleted: "Sales return deleted.",
    saveError: "Save failed. Check backend.",
    loadError: "Data load failed.",
    printError: "Print failed.",
    editError: "Could not load return details.",
    deleteConfirm: "Delete this return?",
    createMode: "Create Mode",
    editMode: "Edit Mode",
  },
  ur: {
    title: "سیلز ریٹرن",
    subtitle: "مینوئل ریٹرن بنائیں یا سیلز انوائس کے خلاف پروڈکٹ ریٹرن کریں",
    newReturn: "نیا ریٹرن",
    viewSummary: "سمری دیکھیں",
    hideSummary: "سمری بند کریں",
    refresh: "ری فریش",
    toggleLang: "English",
    searchPlaceholder: "ریٹرن نمبر، انوائس، نام، پروڈکٹ، تاریخ یا وجہ تلاش کریں...",
    todayFilter: "آج",
    selectDate: "تاریخ منتخب کریں",
    showingDate: "دکھائی جانے والی تاریخ",
    all: "سب",
    manualReturn: "مینوئل سیلز ریٹرن",
    autoReturn: "آٹومیٹک سیلز ریٹرن",
    mode: "ریٹرن موڈ",
    customerType: "کسٹمر ٹائپ",
    name: "نام",
    returnNo: "ریٹرن نمبر",
    invoiceNo: "انوائس نمبر",
    invoiceRef: "انوائس حوالہ",
    saleDate: "سیل تاریخ",
    returnDate: "ریٹرن تاریخ",
    date: "تاریخ",
    reference: "ریفرنس",
    reason: "وجہ",
    products: "پروڈکٹس",
    invoiceProducts: "انوائس پروڈکٹس",
    selectInvoice: "انوائس منتخب کریں",
    invoiceList: "سیلز انوائسز",
    showDetails: "تفصیل دیکھیں",
    selectedInvoice: "منتخب انوائس",
    addRow: "+ لائن شامل کریں",
    productType: "پروڈکٹ ٹائپ",
    category: "کیٹیگری",
    product: "پروڈکٹ",
    manualProductName: "مینوئل پروڈکٹ نام",
    desc: "تفصیل",
    unit: "یونٹ",
    soldQty: "فروخت مقدار",
    alreadyReturned: "پہلے واپس",
    availableQty: "دستیاب مقدار",
    returnQty: "ریٹرن مقدار",
    rate: "ریٹ",
    returnAmount: "ریٹرن رقم",
    debit: "ڈیبٹ",
    credit: "کریڈٹ",
    totalQty: "کل مقدار",
    totalReturns: "کل ریٹرنز",
    totalItems: "کل آئٹمز",
    totalAmount: "کل رقم",
    totalDebit: "کل ڈیبٹ",
    totalCredit: "کل کریڈٹ",
    save: "محفوظ کریں",
    update: "اپڈیٹ",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    close: "بند کریں",
    edit: "ترمیم",
    delete: "حذف",
    print: "پرنٹ",
    actions: "اقدامات",
    loading: "لوڈ ہو رہا ہے...",
    noRecords: "کوئی ریٹرن نہیں ملا۔",
    noInvoices: "کوئی انوائس نہیں ملی۔",
    select: "منتخب کریں",
    selectName: "نام منتخب کریں",
    selectProduct: "پروڈکٹ منتخب کریں",
    customer: "کسٹمر",
    employee: "ملازم",
    supplier: "سپلائر",
    generalLedger: "جنرل لیجر",
    requiredReturn: "ریٹرن نمبر ضروری ہے۔",
    requiredPartyType: "کسٹمر ٹائپ ضروری ہے۔",
    requiredParty: "نام منتخب کریں۔",
    requiredInvoice: "سیلز انوائس منتخب کریں۔",
    requiredItem: "کم از کم ایک درست ریٹرن پروڈکٹ لائن شامل کریں۔",
    qtyInvalid: "ریٹرن مقدار 0 سے زیادہ ہونی چاہیے۔",
    qtyExceeded: "ریٹرن مقدار دستیاب مقدار سے زیادہ ہے۔",
    saved: "سیلز ریٹرن محفوظ ہو گیا۔",
    updated: "سیلز ریٹرن اپڈیٹ ہو گیا۔",
    deleted: "سیلز ریٹرن حذف ہو گیا۔",
    saveError: "محفوظ نہیں ہوا، بیک اینڈ چیک کریں۔",
    loadError: "ڈیٹا لوڈ نہیں ہوا۔",
    printError: "پرنٹ نہیں ہو سکا۔",
    editError: "ریٹرن تفصیل لوڈ نہیں ہوئی۔",
    deleteConfirm: "کیا یہ ریٹرن حذف کرنا ہے؟",
    createMode: "نیا موڈ",
    editMode: "ترمیم موڈ",
  },
};

const PARTY_TYPES = [
  { value: "customer", labelKey: "customer" },
  { value: "employee", labelKey: "employee" },
  { value: "supplier", labelKey: "supplier" },
  { value: "general_ledger", labelKey: "generalLedger" },
];

const today = () => new Date().toISOString().slice(0, 10);

const getList = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.result)) return d.result;
  if (Array.isArray(d?.returns)) return d.returns;
  if (Array.isArray(d?.invoices)) return d.invoices;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.products)) return d.products;
  return [];
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v) =>
  Number(v || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getRecordId = (o) =>
  o?.id ??
  o?.value ??
  o?.ID ??
  o?.Id ??
  o?.customer_id ??
  o?.CustomerID ??
  o?.employee_id ??
  o?.EmployeeID ??
  o?.supplier_id ??
  o?.SupplierID ??
  o?.general_ledger_id ??
  o?.ledger_id ??
  o?.account_id ??
  o?.category_id ??
  o?.CategoryID ??
  o?.unit_id ??
  o?.UnitID ??
  o?.product_id ??
  o?.ProductID ??
  "";

const pickText = (o, keys) => {
  for (const key of keys) {
    if (o?.[key] !== undefined && o?.[key] !== null && String(o[key]).trim()) return String(o[key]).trim();
  }
  const id = getRecordId(o);
  return id ? `#${id}` : "";
};

const getCustomerName = (o) => pickText(o, ["customer_name", "customer_name_en", "name", "name_en", "title"]);
const getEmployeeName = (o) => pickText(o, ["employee_name", "employee_name_en", "full_name", "name", "name_en", "title"]);
const getSupplierName = (o) => pickText(o, ["supplier_name", "supplier_name_en", "vendor_name", "name", "name_en", "title"]);
const getLedgerName = (o) => pickText(o, ["ledger_name", "ledger_name_en", "account_name", "account_title", "name", "name_en", "title"]);
const getCategoryName = (o) => pickText(o, ["category_name", "category_name_en", "CategoryName", "name", "name_en", "title"]);
const getProductName = (o) => pickText(o, ["product_name", "product_name_en", "ProductName", "item_name", "ItemName", "name", "name_en", "title"]);
const getUnitName = (o) => pickText(o, ["unit_name", "unit_name_en", "UnitName", "name", "name_en", "symbol", "title"]);
const getProductDesc = (o) => pickText(o, ["product_description", "ProductDescription", "description", "Description", "details", "remarks"]);
const getTypeName = (o) => pickText(o, ["product_type_en", "product_type", "product_type_name", "type_name", "type", "name", "name_en", "title"]);

const getPreviousBalance = (row) => {
  if (!row) return 0;
  const keys = [
    "previous_balance",
    "previousBalance",
    "prev_balance",
    "prevBalance",
    "opening_balance",
    "openingBalance",
    "balance",
    "current_balance",
    "currentBalance",
    "closing_balance",
    "ledger_balance",
    "account_balance",
    "old_balance",
    "remaining_balance",
    "due_balance",
    "payable",
    "receivable",
  ];
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return toNum(row[key]);
  }
  const debit = toNum(row.debit || row.total_debit || row.debit_amount || row.dr || row.total_dr);
  const credit = toNum(row.credit || row.total_credit || row.credit_amount || row.cr || row.total_cr);
  if (debit || credit) return debit - credit;
  return 0;
};

const makePartyOption = (row, nameGetter) => ({
  id: String(getRecordId(row)),
  name: nameGetter(row),
  previous_balance: getPreviousBalance(row),
});

const getCategoryId = (o) => o?.id ?? o?.value ?? o?.category_id ?? o?.categoryId ?? o?.CategoryID ?? o?.cat_id ?? o?.CatID ?? "";
const getProductId = (o) => o?.id ?? o?.value ?? o?.product_id ?? o?.productId ?? o?.ProductID ?? o?.item_id ?? o?.ItemID ?? "";
const getUnitId = (o) => o?.id ?? o?.value ?? o?.unit_id ?? o?.unitId ?? o?.UnitID ?? "";
const sameId = (a, b) => String(a ?? "") !== "" && String(a ?? "") === String(b ?? "");

const getProductCatId = (p) =>
  p?.category_id ?? p?.categoryId ?? p?.CategoryID ?? p?.cat_id ?? p?.CatID ?? p?.product_category_id ?? p?.category?.id ?? "";
const getProductUnitId = (p) => p?.unit_id ?? p?.unitId ?? p?.UnitID ?? p?.unit?.id ?? "";
const getProductPieceRate = (p) =>
  p?.piece_rate ?? p?.pieceRate ?? p?.PieceRate ?? p?.sale_rate ?? p?.saleRate ?? p?.SaleRate ?? p?.rate ?? p?.Rate ?? p?.price ?? p?.Price ?? p?.sale_price ?? 0;
const getProductSaleUnit = (p) => String(p?.sale_unit || p?.saleUnit || p?.SaleUnit || "single").toLowerCase();
const getProductPcsCtn = (p) => Number(p?.pieces_per_carton ?? p?.piecesPerCarton ?? p?.PiecesPerCarton ?? 0);
const getProductTypeId = (p) => p?.product_type_id ?? p?.productTypeId ?? p?.ProductTypeID ?? p?.type_id ?? p?.typeId ?? p?.TypeID ?? "";
const getProductTypeName = (p) => pickText(p, ["product_type", "product_type_name", "type_name", "type", "sale_unit", "SaleUnit"], "FMS");

function makeMap(list, getter) {
  const map = {};
  list.forEach((row) => {
    const id = String(getRecordId(row));
    if (id) map[id] = getter(row);
  });
  return map;
}

function formatFullDate(dateValue) {
  if (!dateValue) return "-";
  const raw = String(dateValue).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDisplayDate(value) {
  const v = String(value || "").trim();
  const slash = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return "";
}

function DateTextInput({ value, onChange, className = "", style = {}, readOnly = false, ...props }) {
  return (
    <input
      {...props}
      type="date"
      className={className}
      style={style}
      value={String(value || "").slice(0, 10)}
      readOnly={readOnly}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      onClick={(e) => {
        if (!readOnly && typeof e.currentTarget.showPicker === "function") {
          try { e.currentTarget.showPicker(); } catch { /* browser fallback */ }
        }
      }}
    />
  );
}
function useLookup(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(url);
      setData(getList(res.data));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

const emptyManualItem = () => ({
  category_id: "",
  product_id: "",
  product_name: "",
  product_description: "",
  product_type_id: "",
  product_type: "FMS",
  unit_id: "",
  unit_name: "",
  sold_qty: "",
  already_returned_qty: "0",
  available_qty: "",
  return_qty: "",
  rate: "0",
  return_amount: "0",
  debit: "0",
  credit: "0",
});

const defaultReturnItems = (count = 5) => Array.from({ length: count }, () => emptyManualItem());

const emptyForm = () => ({
  return_no: "",
  return_date: today(),
  sale_order_date: today(),
  invoice_id: "",
  invoice_ref: "",
  reference_no: "",
  party_type: "customer",
  party_id: "",
  party_name: "",
  reason: "",
});

const getInvPartyType = (inv) =>
  inv?.customer_type ||
  inv?.party_type ||
  (inv?.customer_id ? "customer" : inv?.employee_id ? "employee" : inv?.supplier_id ? "supplier" : inv?.general_ledger_id ? "general_ledger" : "customer");

const getInvPartyId = (inv) => {
  const type = getInvPartyType(inv);
  if (inv?.party_id) return inv.party_id;
  if (type === "employee") return inv?.employee_id || "";
  if (type === "supplier") return inv?.supplier_id || "";
  if (type === "general_ledger") return inv?.general_ledger_id || inv?.ledger_id || inv?.account_id || "";
  return inv?.customer_id || "";
};

const getInvoiceNo = (inv) => inv?.invoice_no || inv?.sales_invoice_no || inv?.bill_no || inv?.id || "";
const getInvoiceDate = (inv) => String(inv?.invoice_date || inv?.date || inv?.created_at || "").slice(0, 10);
const getInvoiceTotal = (inv) => toNum(inv?.invoice_total || inv?.total_amount || inv?.net_total || inv?.amount);
const getGrandTotal = (inv) => toNum(inv?.grand_total || inv?.invoice_total || inv?.total_amount || inv?.net_total || inv?.amount);

function genReturnNo(list) {
  let max = 0;
  list.forEach((ret) => {
    const m1 = String(ret.return_no || "").match(/^sales-return(\d+)$/i);
    const m2 = String(ret.return_no || "").match(/^SR[- ]?(\d+)$/i);
    const m = m1 || m2;
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `sales-return${String(max + 1).padStart(2, "0")}`;
}

function getReturnPartyName(ret) {
  return ret?.party_name || ret?.customer_name || ret?.employee_name || ret?.supplier_name || ret?.general_ledger_name || ret?.name || "";
}

function printReturn(ret, t, isUrdu) {
  const html = `<!doctype html><html dir="${isUrdu ? "rtl" : "ltr"}"><head><meta charset="UTF-8"/><title>${ret.return_no || "Sales Return"}</title><style>
  body{font-family:${isUrdu ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};direction:${isUrdu ? "rtl" : "ltr"};line-height:${isUrdu ? "1.9" : "1.4"};margin:0;background:#f8fafc;color:#111827}.page{padding:22px}.sheet{background:#fff;border:1px solid #d1d5db;border-radius:18px;overflow:hidden}.head{background:#111827;color:#fff;padding:18px 22px;display:flex;justify-content:space-between}.head h1{margin:0;font-size:24px}.body{padding:16px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}.box{border:1px solid #d1d5db;border-radius:10px;padding:9px}.box small{display:block;color:#64748b;margin-bottom:5px;font-size:11px}.box b{font-size:14px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;color:#111827}th,td{border:1px solid #d1d5db;padding:8px;font-size:12px}.num{text-align:right;font-family:monospace}.strong{font-weight:900}@media print{body{background:white}.page{padding:0}.sheet{border:none;border-radius:0}}
  </style></head><body><div class="page"><div class="sheet"><div class="head"><div><h1>Ali Cages</h1><div>${t.title}</div></div><div>${t.returnNo}: <b>${ret.return_no || "-"}</b><br/>${t.returnDate}: ${formatFullDate(ret.return_date)}</div></div><div class="body">
  <div class="grid"><div class="box"><small>${t.returnNo}</small><b>${ret.return_no || "-"}</b></div><div class="box"><small>${t.invoiceRef}</small><b>${ret.invoice_ref || "-"}</b></div><div class="box"><small>${t.name}</small><b>${getReturnPartyName(ret) || "-"}</b></div><div class="box"><small>${t.returnDate}</small><b>${formatFullDate(ret.return_date)}</b></div><div class="box"><small>${t.saleDate}</small><b>${formatFullDate(ret.sale_order_date)}</b></div></div>
  <table><thead><tr><th>#</th><th>${t.product}</th><th>${t.returnQty}</th><th>${t.rate}</th><th>${t.returnAmount}</th><th>${t.reason}</th></tr></thead><tbody><tr><td>1</td><td>${ret.product_name || "-"}</td><td class="num">${money(ret.return_qty)}</td><td class="num">${money(ret.rate)}</td><td class="num strong">${money(ret.return_amount)}</td><td>${ret.reason || "-"}</td></tr></tbody></table>
  </div></div></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function SalesReturnPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const { data: customers, loading: cuLoading } = useLookup(CUSTOMERS_API);
  const { data: employees, loading: emLoading } = useLookup(EMPLOYEES_API);
  const { data: suppliers, loading: suLoading } = useLookup(SUPPLIERS_API);
  const { data: generalLedgers, loading: glLoading } = useLookup(GENERAL_LEDGERS_API);
  const { data: categories, loading: catLoading } = useLookup(CATEGORIES_API);
  const { data: products, loading: prodLoading } = useLookup(PRODUCTS_API);
  const { data: units, loading: unLoading } = useLookup(UNITS_API);

  const [returns, setReturns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingRet, setLoadingRet] = useState(true);
  const [loadingInv, setLoadingInv] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [returnMode, setReturnMode] = useState("manual");
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState(defaultReturnItems(5));
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [search, setSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [showAll, setShowAll] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const mastersLoading = cuLoading || emLoading || suLoading || glLoading || catLoading || prodLoading || unLoading;

  const customerMap = useMemo(() => makeMap(customers, getCustomerName), [customers]);
  const employeeMap = useMemo(() => makeMap(employees, getEmployeeName), [employees]);
  const supplierMap = useMemo(() => makeMap(suppliers, getSupplierName), [suppliers]);
  const ledgerMap = useMemo(() => makeMap(generalLedgers, getLedgerName), [generalLedgers]);
  const categoryMap = useMemo(() => makeMap(categories, getCategoryName), [categories]);
  const productMap = useMemo(() => makeMap(products, getProductName), [products]);
  const unitMap = useMemo(() => makeMap(units, getUnitName), [units]);

  const partyOptions = useMemo(() => {
    if (form.party_type === "employee") return employees.map((x) => makePartyOption(x, getEmployeeName));
    if (form.party_type === "supplier") return suppliers.map((x) => makePartyOption(x, getSupplierName));
    if (form.party_type === "general_ledger") return generalLedgers.map((x) => makePartyOption(x, getLedgerName));
    return customers.map((x) => makePartyOption(x, getCustomerName));
  }, [form.party_type, customers, employees, suppliers, generalLedgers]);

  const toast = useCallback((type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 2800);
  }, []);

  const getInvoicePartyName = useCallback(
    (inv) => {
      const type = getInvPartyType(inv);
      const id = String(getInvPartyId(inv));
      const fallback = inv.party_name || inv.customer_name || inv.employee_name || inv.supplier_name || inv.general_ledger_name || "";
      if (type === "employee") return employeeMap[id] || fallback;
      if (type === "supplier") return supplierMap[id] || fallback;
      if (type === "general_ledger") return ledgerMap[id] || fallback;
      return customerMap[id] || fallback;
    },
    [customerMap, employeeMap, supplierMap, ledgerMap]
  );

  const fetchReturns = useCallback(async () => {
    setLoadingRet(true);
    try {
      const res = await axios.get(RETURNS_API);
      setReturns(getList(res.data));
    } catch {
      toast("error", t.loadError);
    } finally {
      setLoadingRet(false);
    }
  }, [t.loadError, toast]);

  const fetchInvoices = useCallback(async () => {
    setLoadingInv(true);
    try {
      const res = await axios.get(INVOICES_API);
      setInvoices(getList(res.data));
    } catch {
      setInvoices([]);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
    fetchInvoices();
  }, [fetchReturns, fetchInvoices]);

  const totalReturnAmount = useMemo(() => items.reduce((sum, row) => sum + toNum(row.return_amount), 0), [items]);
  const totalQty = useMemo(() => items.reduce((sum, row) => sum + toNum(row.return_qty), 0), [items]);
  const totalDebit = useMemo(() => items.reduce((sum, row) => sum + toNum(row.debit), 0), [items]);
  const totalCredit = useMemo(() => items.reduce((sum, row) => sum + toNum(row.credit), 0), [items]);

  const summary = useMemo(() => {
    return returns.reduce(
      (acc, ret) => {
        acc.totalReturns += 1;
        acc.totalItems += 1;
        acc.totalQty += toNum(ret.return_qty);
        acc.totalAmount += toNum(ret.return_amount);
        acc.totalDebit += toNum(ret.debit);
        acc.totalCredit += toNum(ret.credit || ret.return_amount);
        return acc;
      },
      { totalReturns: 0, totalItems: 0, totalQty: 0, totalAmount: 0, totalDebit: 0, totalCredit: 0 }
    );
  }, [returns]);

  const filteredReturns = useMemo(() => {
    let list = returns;
    if (!showAll) {
      const dateValue = selectedDate || today();
      list = list.filter((ret) => String(ret.return_date || ret.created_at || "").slice(0, 10) === dateValue);
    }
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((ret) =>
      [ret.return_no, ret.invoice_ref, ret.invoice_no, getReturnPartyName(ret), ret.product_name, ret.return_date, ret.reason]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [returns, search, selectedDate, showAll]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [getInvoiceNo(inv), inv.reference_no, getInvoicePartyName(inv), inv.invoice_date, inv.shipment_to]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [invoices, invoiceSearch, getInvoicePartyName]);

  const makeAutoRow = useCallback(
    (row) => {
      const soldQty = toNum(row.sold_qty ?? row.qty ?? row.quantity ?? row.pieces_qty ?? row.carton_qty);
      const alreadyReturned = toNum(row.already_returned_qty ?? row.returned_qty);
      const available = toNum(row.available_qty, Math.max(0, soldQty - alreadyReturned));
      const rate = toNum(row.rate);
      return {
        selected: false,
        invoice_item_id: row.invoice_item_id || row.id || row.item_id || "",
        category_id: row.category_id || "",
        category_name: row.category_name || categoryMap[String(row.category_id)] || "",
        product_id: row.product_id || "",
        product_name: row.product_name || productMap[String(row.product_id)] || "",
        product_description: row.product_description || row.description || "",
        product_type_id: row.product_type_id || "",
        product_type: row.product_type || row.product_type_name || "FMS",
        unit_id: row.unit_id || "",
        unit_name: row.unit_name || unitMap[String(row.unit_id)] || "",
        sold_qty: soldQty,
        already_returned_qty: alreadyReturned,
        available_qty: available,
        return_qty: "",
        rate,
        return_amount: "0",
        debit: "0",
        credit: "0",
      };
    },
    [categoryMap, productMap, unitMap]
  );

  const openAdd = () => {
    setEditingId(null);
    setReturnMode("manual");
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setInvoiceSearch("");
    setForm({ ...emptyForm(), return_no: genReturnNo(returns), party_type: "customer" });
    setItems(defaultReturnItems(5));
    setShowForm(true);
  };

  const openEdit = (ret) => {
    setEditingId(ret.id);
    setReturnMode("manual");
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setForm({
      return_no: ret.return_no || "",
      return_date: String(ret.return_date || today()).slice(0, 10),
      sale_order_date: String(ret.sale_order_date || ret.invoice_date || today()).slice(0, 10),
      invoice_id: ret.invoice_id || "",
      invoice_ref: ret.invoice_ref || ret.invoice_no || "",
      reference_no: ret.reference_no || "",
      party_type: ret.party_type || ret.customer_type || "customer",
      party_id: String(ret.party_id || ret.customer_id || ""),
      party_name: getReturnPartyName(ret),
      reason: ret.reason || "",
    });
    setItems([
      {
        category_id: String(ret.category_id || ""),
        category_name: ret.category_name || "",
        product_id: String(ret.product_id || ""),
        product_name: ret.product_name || "",
        product_description: ret.product_description || ret.description || "",
        product_type_id: String(ret.product_type_id || ""),
        product_type: ret.product_type || "FMS",
        unit_id: String(ret.unit_id || ""),
        unit_name: ret.unit_name || "",
        sold_qty: String(ret.sold_qty || ""),
        already_returned_qty: String(ret.already_returned_qty || "0"),
        available_qty: String(ret.available_qty || ret.sold_qty || ""),
        return_qty: String(ret.return_qty || ""),
        rate: String(ret.rate || "0"),
        return_amount: String(ret.return_amount || "0"),
        debit: String(ret.debit || "0"),
        credit: String(ret.credit || ret.return_amount || "0"),
      },
    ]);
    setShowForm(true);
  };

  const handleModeChange = (mode) => {
    setReturnMode(mode);
    setSelectedInvoice(null);
    setInvoiceItems([]);
    setInvoiceSearch("");
    setItems(defaultReturnItems(5));
    setForm((prev) => ({
      ...prev,
      invoice_id: "",
      invoice_ref: "",
      sale_order_date: mode === "manual" ? prev.sale_order_date || today() : "",
      party_type: prev.party_type || "customer",
    }));
  };

  const handlePartyTypeChange = (value) => {
    setForm((prev) => ({ ...prev, party_type: value || "customer", party_id: "", party_name: "" }));
  };

  const handlePartyChange = (value) => {
    const selected = partyOptions.find((x) => String(x.id) === String(value));
    setForm((prev) => ({ ...prev, party_id: value, party_name: selected?.name || "" }));
  };

  const handleProductChange = (index, productId) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const prod = products.find((p) => sameId(getProductId(p), productId));
        const categoryId = getProductCatId(prod || {}) || row.category_id || "";
        const unitId = getProductUnitId(prod || {}) || row.unit_id || "";
        const rate = toNum(getProductPieceRate(prod || {}) || row.rate);
        const qty = toNum(row.return_qty);
        const amount = qty * rate;
        return {
          ...row,
          product_id: productId,
          product_name: getProductName(prod || {}) || row.product_name || "",
          product_description: getProductDesc(prod || {}) || row.product_description || "",
          product_type_id: String(getProductTypeId(prod || {}) || row.product_type_id || ""),
          product_type: getProductTypeName(prod || {}) || row.product_type || "FMS",
          category_id: String(categoryId || ""),
          category_name: categoryMap[String(categoryId)] || row.category_name || "",
          unit_id: String(unitId || ""),
          unit_name: unitMap[String(unitId)] || row.unit_name || "",
          rate: String(rate || 0),
          return_amount: String(amount.toFixed(2)),
          credit: String(amount.toFixed(2)),
        };
      })
    );
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        let next = { ...row, [field]: value };

        if (field === "category_id") {
          next.category_name = categoryMap[String(value)] || next.category_name || "";
          return next;
        }

        if (field === "product_id") return next;

        const qty = toNum(next.return_qty);
        const rate = toNum(next.rate);
        const amount = qty * rate;
        next.return_amount = String(amount.toFixed(2));
        if (field === "return_qty" || field === "rate") {
          next.credit = String(amount.toFixed(2));
        }
        return next;
      })
    );
  };

  const handleAutoItemChange = (index, field, value) => {
    setInvoiceItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: field === "selected" ? value : value };
        const qty = toNum(next.return_qty);
        const rate = toNum(next.rate);
        const amount = qty * rate;
        next.return_amount = String(amount.toFixed(2));
        next.credit = String(amount.toFixed(2));
        return next;
      })
    );
  };

  const addRow = () => setItems((prev) => [...prev, emptyManualItem()]);
  const removeRow = (index) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const loadInvoiceDetails = async (invoice) => {
    if (!invoice?.id) return;
    try {
      let inv = invoice;
      let list = Array.isArray(invoice.items) ? invoice.items : [];

      try {
        const detailRes = await axios.get(`${INVOICES_API}/${invoice.id}`);
        inv = detailRes.data?.data || detailRes.data?.invoice || detailRes.data || invoice;
        list = getList(inv.items || detailRes.data?.items || detailRes.data?.data?.items);
      } catch {}

      if (!list.length) {
        try {
          const itemRes = await axios.get(`${INVOICES_API}/${invoice.id}/items`);
          list = getList(itemRes.data);
        } catch {}
      }

      const partyType = getInvPartyType(inv);
      const partyId = String(getInvPartyId(inv) || "");
      const partyName = getInvoicePartyName(inv);

      setSelectedInvoice(inv);
      setForm((prev) => ({
        ...prev,
        invoice_id: inv.id,
        invoice_ref: getInvoiceNo(inv),
        sale_order_date: getInvoiceDate(inv),
        party_type: partyType || "customer",
        party_id: partyId,
        party_name: partyName,
        reference_no: inv.reference_no || prev.reference_no || "",
      }));
      setInvoiceItems(list.map(makeAutoRow));
    } catch {
      toast("error", t.loadError);
    }
  };

  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find((x) => String(x.id) === String(invoiceId));
    if (inv) loadInvoiceDetails(inv);
  };

  const makePayloads = () => {
    if (!String(form.return_no || "").trim()) throw new Error(t.requiredReturn);

    const base = {
      return_no: form.return_no.trim(),
      return_date: form.return_date || today(),
      sale_order_date: form.sale_order_date || null,
      invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
      invoice_ref: form.invoice_ref || "",
      invoice_no: form.invoice_ref || "",
      reference_no: form.reference_no || "",
      party_type: form.party_type || "customer",
      customer_type: form.party_type || "customer",
      party_id: form.party_id ? Number(form.party_id) : null,
      party_name: form.party_name || partyOptions.find((p) => String(p.id) === String(form.party_id))?.name || "",
      customer_id: (form.party_type || "customer") === "customer" && form.party_id ? Number(form.party_id) : null,
      employee_id: form.party_type === "employee" && form.party_id ? Number(form.party_id) : null,
      supplier_id: form.party_type === "supplier" && form.party_id ? Number(form.party_id) : null,
      general_ledger_id: form.party_type === "general_ledger" && form.party_id ? Number(form.party_id) : null,
      customer_name: form.party_name || partyOptions.find((p) => String(p.id) === String(form.party_id))?.name || "",
      reason: form.reason || "",
    };

    if (returnMode === "auto") {
      if (!form.invoice_id) throw new Error(t.requiredInvoice);
      const selectedRows = invoiceItems.filter((row) => row.selected && toNum(row.return_qty) > 0);
      if (!selectedRows.length) throw new Error(t.requiredItem);

      selectedRows.forEach((row) => {
        if (toNum(row.return_qty) <= 0) throw new Error(t.qtyInvalid);
        if (toNum(row.available_qty) > 0 && toNum(row.return_qty) > toNum(row.available_qty)) throw new Error(t.qtyExceeded);
      });

      return selectedRows.map((row, idx) => ({
        ...base,
        return_no: selectedRows.length > 1 ? `${base.return_no}-${idx + 1}` : base.return_no,
        invoice_item_id: row.invoice_item_id ? Number(row.invoice_item_id) : null,
        category_id: row.category_id ? Number(row.category_id) : null,
        category_name: row.category_name || "",
        product_id: row.product_id ? Number(row.product_id) : null,
        product_name: row.product_name || "",
        product_description: row.product_description || "",
        description: row.product_description || "",
        product_type_id: row.product_type_id ? Number(row.product_type_id) : null,
        product_type: row.product_type || "FMS",
        unit_id: row.unit_id ? Number(row.unit_id) : null,
        unit_name: row.unit_name || "",
        sold_qty: toNum(row.sold_qty),
        already_returned_qty: toNum(row.already_returned_qty),
        available_qty: toNum(row.available_qty),
        return_qty: toNum(row.return_qty),
        rate: toNum(row.rate),
        return_amount: toNum(row.return_amount),
        debit: toNum(row.debit),
        credit: toNum(row.credit || row.return_amount),
      }));
    }

    if (!form.party_type) throw new Error(t.requiredPartyType);
    if (!form.party_id) throw new Error(t.requiredParty);

    const rows = items.filter((row) => (row.product_id || row.product_name) && toNum(row.return_qty) > 0);
    if (!rows.length) throw new Error(t.requiredItem);

    return rows.map((row, idx) => ({
      ...base,
      return_no: rows.length > 1 ? `${base.return_no}-${idx + 1}` : base.return_no,
      category_id: row.category_id ? Number(row.category_id) : null,
      category_name: row.category_name || categoryMap[String(row.category_id)] || "",
      product_id: row.product_id ? Number(row.product_id) : null,
      product_name: row.product_name || productMap[String(row.product_id)] || "",
      product_description: row.product_description || "",
      description: row.product_description || "",
      product_type_id: row.product_type_id ? Number(row.product_type_id) : null,
      product_type: row.product_type || "FMS",
      unit_id: row.unit_id ? Number(row.unit_id) : null,
      unit_name: row.unit_name || unitMap[String(row.unit_id)] || "",
      sold_qty: toNum(row.sold_qty || row.return_qty),
      already_returned_qty: toNum(row.already_returned_qty),
      available_qty: toNum(row.available_qty || row.return_qty),
      return_qty: toNum(row.return_qty),
      rate: toNum(row.rate),
      return_amount: toNum(row.return_amount),
      debit: toNum(row.debit),
      credit: toNum(row.credit || row.return_amount),
    }));
  };

  const handleSave = async () => {
    let payloads;
    try {
      payloads = makePayloads();
    } catch (err) {
      toast("error", err.message);
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await axios.put(`${RETURNS_API}/${editingId}`, payloads[0]);
        toast("success", t.updated);
      } else {
        for (const payload of payloads) {
          await axios.post(RETURNS_API, payload);
        }
        toast("success", t.saved);
      }
      setShowForm(false);
      setEditingId(null);
      setSelectedInvoice(null);
      setInvoiceItems([]);
      setForm(emptyForm());
      setItems(defaultReturnItems(5));
      fetchReturns();
      fetchInvoices();
    } catch {
      toast("error", t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${RETURNS_API}/${id}`);
      toast("success", t.deleted);
      fetchReturns();
      fetchInvoices();
    } catch {
      toast("error", t.loadError);
    }
  };

  const totalBoxes = [
    [t.totalQty, money(totalQty)],
    [t.totalAmount, money(totalReturnAmount)],
    [t.totalDebit, money(totalDebit)],
    [t.totalCredit, money(totalCredit)],
  ];

  const buttonStyle = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  };

  return (
    <div dir={dir} className="invoice-page">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        *{box-sizing:border-box}
        .invoice-page{min-height:100vh;background:linear-gradient(135deg,#f8fafc,#EFF6FF);padding:18px;color:#0f172a;font-family:${isUrdu ? "'Noto Nastaliq Urdu', serif" : "Arial, sans-serif"};overflow-x:hidden}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .page-wrap{max-width:1220px;width:100%;margin:0 auto}.form-page-wrap{max-width:1220px;width:100%;margin:0 auto;animation:fadeSlide .22s ease-out both}.fullPageInputBox{width:100%!important;max-width:100%!important;min-height:calc(100vh - 36px);box-shadow:0 18px 48px rgba(15,23,42,.08)!important}.top-card{background:rgba(255,255,255,.94);border:1px solid #D6E0EE;border-radius:22px;padding:20px 22px;box-shadow:0 18px 48px rgba(15,23,42,.08);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.title{margin:0;font-size:30px;font-weight:950;letter-spacing:-.8px}.subtitle{margin:5px 0 0;color:#64748b;font-size:13px}.btn{border:1px solid #cbd5e1;border-radius:10px;padding:9px 13px;font-weight:850;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:.15s;background:white;color:#0f172a}.btn:hover{background:#f8fafc}.btn-primary{background:#111827;color:white;border-color:#111827}.btn-soft{background:white;color:#334155;border:1px solid #cbd5e1}.btn-active{background:#f1f5f9;color:#111827;border:1px solid #cbd5e1}.btn-green,.btn-red,.btn-yellow{background:white!important;color:#0f172a!important;border:1px solid #cbd5e1!important;box-shadow:none!important}.summary-grid{animation:fadeSlide .24s ease-out both;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0}.summary-card{background:white;border:1px solid #D6E0EE;border-radius:18px;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.05);animation:pop .22s ease-out both}.summary-card small{display:block;color:#64748b;font-size:10.5px;font-weight:950;text-transform:uppercase;letter-spacing:.5px}.summary-card b{display:block;margin-top:7px;font-size:18px;font-weight:950;font-family:monospace}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.search{width:min(430px,100%);height:40px;border:1px solid #cbd5e1;border-radius:14px;padding:0 13px;font-size:13px;outline:none;background:white}.filter{height:36px;border:1px solid #cbd5e1;border-radius:12px;background:white;padding:0 10px;font-weight:800;color:#475569;cursor:pointer}.filter.active{background:#111827;color:white;border-color:#111827}.card{background:white;border:1px solid #D6E0EE;border-radius:18px;box-shadow:0 8px 24px rgba(15,23,42,.05);overflow:hidden}.table-wrap{overflow-x:auto}table.list{width:100%;border-collapse:collapse;table-layout:fixed}table.list th{background:#111827;color:rgba(255,255,255,.78);font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:12px 9px}table.list td{padding:12px 9px;border-bottom:1px solid #eef2f7;font-size:13px}table.list tr:hover td{background:#f8fafc}.toast{position:fixed;${isUrdu ? "left" : "right"}:18px;bottom:18px;z-index:120;color:white;padding:12px 16px;border-radius:14px;font-weight:900;box-shadow:0 20px 50px rgba(15,23,42,.25)}
        .inputModalBox{width:min(1060px,100%);background:#f8fafc;border:1px solid #cbd5e1;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.10);overflow:hidden}.inputModalTitle{height:54px;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:17px;font-weight:900}.closeBtn{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:white;width:34px;height:32px;border-radius:10px;cursor:pointer}.inputModalBody{padding:14px}.form-box{background:transparent;border:none;border-radius:0;padding:0;box-shadow:none;margin-bottom:0}.formTopLine{display:grid;grid-template-columns:160px 210px 140px 120px 170px 1fr;gap:10px;align-items:end;margin-bottom:10px}.basicLabel{font-size:11px;color:#334155;margin-bottom:5px;display:block;font-weight:900;text-transform:uppercase;letter-spacing:.35px}.basicInput,.basicSelect,.productInput{width:100%;height:34px;border:1px solid #cbd5e1;background:white;color:#0f172a;padding:5px 9px;font-size:13px;border-radius:10px;outline:none;font-weight:650}.basicInput[readonly]{background:#f1f5f9}.basicInput:focus,.basicSelect:focus,.productInput:focus,.search:focus{border-color:#111827;box-shadow:0 0 0 3px rgba(15,23,42,.08)}.sectionHead{height:38px;background:linear-gradient(135deg,#EFF6FF,#f8fafc);border:1px solid #cbd5e1;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between;padding:0 12px;margin-top:12px;font-weight:950;color:#0f172a}.basicBtn{height:32px;border:1px solid #cbd5e1;background:white;color:#0f172a;padding:5px 12px;font-size:12px;cursor:pointer;border-radius:10px;font-weight:850}.basicBtn:hover{background:#f8fafc}.basicBtnGreen,.basicBtnRed{background:white;border-color:#cbd5e1;color:#0f172a}.basicProductTable{width:100%;border-collapse:collapse;background:white;min-width:1420px}.basicProductTable th,.basicProductTable td{border:1px solid #D6E0EE;padding:5px;font-size:12px}.basicProductTable th{background:#e2e8f0;text-align:center;color:#334155;font-weight:900}.paymentPanel{border:1px solid #cbd5e1;border-top:none;padding:12px;background:white;border-radius:0 0 14px 14px;overflow:auto}.finalTotalBar{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.totalBox{border:1px solid #D6E0EE;background:#f8fafc;border-radius:14px;padding:10px 12px}.totalBox label{display:block;font-size:11px;color:#64748b;margin-bottom:6px;font-weight:900}.totalBox b{display:block;text-align:${isUrdu ? "left" : "right"};font-family:monospace;font-size:18px}.grandBox{background:#EFF6FF;border-color:#DBEAFE;color:#285DB8}.modalFooterBasic{padding:12px 0 0;display:flex;justify-content:flex-end;gap:8px}.radioPanel{border:1px solid #cbd5e1;background:#fff;border-radius:14px;padding:10px 12px;display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px}.radioItem{display:inline-flex;align-items:center;gap:7px;font-weight:900;font-size:13px;color:#0f172a;cursor:pointer}.clickRow{cursor:pointer}.selectedInvoiceRow td{background:#EFF6FF!important}
        @media(max-width:1120px){.summary-grid{grid-template-columns:repeat(2,1fr)}.formTopLine{grid-template-columns:repeat(3,minmax(0,1fr))}.finalTotalBar{grid-template-columns:repeat(2,1fr)}table.list{min-width:900px}}
        @media(max-width:780px){.summary-grid,.formTopLine,.finalTotalBar{grid-template-columns:1fr}.inputModalBody{padding:10px!important}.basicProductTable{min-width:1240px!important}.title{font-size:24px}}
      `}</style>

      {msg.text && <div className="toast" style={{ background: msg.type === "error" ? "#dc2626" : "#16a34a" }}>{msg.text}</div>}

      {!showForm && (
        <div className="page-wrap">
          <div className="top-card">
            <div>
              <h1 className="title">{t.title}</h1>
              <p className="subtitle">{t.subtitle}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: isUrdu ? "row-reverse" : "row" }}>
              <button className="btn btn-soft" onClick={() => setLang(isUrdu ? "en" : "ur")}>{t.toggleLang}</button>
              <button className={`btn ${showSummary ? "btn-active" : "btn-soft"}`} onClick={() => setShowSummary((v) => !v)}>{showSummary ? t.hideSummary : t.viewSummary}</button>
              <button className="btn btn-soft" onClick={fetchReturns}>{loadingRet ? t.loading : t.refresh}</button>
              <button className="btn btn-primary" onClick={openAdd}>+ {t.newReturn}</button>
            </div>
          </div>

          {showSummary && (
            <div className="summary-grid">
              {[
                [t.totalReturns, summary.totalReturns],
                [t.totalItems, summary.totalItems],
                [t.totalQty, money(summary.totalQty)],
                [t.totalAmount, money(summary.totalAmount)],
                [t.totalCredit, money(summary.totalCredit)],
              ].map(([label, value], idx) => (
                <div className="summary-card" key={label} style={{ animationDelay: `${idx * 30}ms` }}>
                  <small>{label}</small>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          )}

          <div className="toolbar">
            <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
            <button className={`filter ${showAll ? "active" : ""}`} onClick={() => setShowAll(true)}>{t.all}</button>
            <button className={`filter ${!showAll && selectedDate === today() ? "active" : ""}`} onClick={() => { setShowAll(false); setSelectedDate(today()); }}>{t.todayFilter}</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #cbd5e1", borderRadius: 12, padding: "0 10px", height: 36, fontWeight: 850, color: "#475569", fontSize: 12 }}>
              <span>{t.selectDate}</span>
              <DateTextInput value={selectedDate} onChange={(v) => { setShowAll(false); setSelectedDate(v || today()); }} style={{ border: "none", outline: "none", fontWeight: 850, color: "#0f172a", background: "transparent", width: 100 }} />
            </label>
            {!showAll && (
              <span style={{ height: 36, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 12, background: "#EFF6FF", color: "#285DB8", fontWeight: 900, border: "1px solid #DBEAFE", fontSize: 12 }}>
                {t.showingDate}: {formatFullDate(selectedDate)}
              </span>
            )}
          </div>

          <div className="card table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th style={{ width: 145, textAlign: isUrdu ? "right" : "left" }}>{t.returnNo}</th>
                  <th style={{ width: 145, textAlign: isUrdu ? "right" : "left" }}>{t.invoiceRef}</th>
                  <th style={{ textAlign: isUrdu ? "right" : "left" }}>{t.name}</th>
                  <th style={{ width: 140 }}>{t.returnDate}</th>
                  <th style={{ width: 140 }}>{t.saleDate}</th>
                  <th style={{ width: 115, textAlign: "right" }}>{t.returnQty}</th>
                  <th style={{ width: 125, textAlign: "right" }}>{t.returnAmount}</th>
                  <th style={{ width: 170 }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loadingRet ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 44, color: "#94a3b8" }}>{t.loading}</td></tr>
                ) : filteredReturns.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 44, color: "#94a3b8" }}>{t.noRecords}</td></tr>
                ) : filteredReturns.map((ret, idx) => (
                  <tr key={ret.id || idx} className="clickRow" onClick={() => openEdit(ret)}>
                    <td style={{ textAlign: "center", color: "#94a3b8", fontFamily: "monospace" }}>{idx + 1}</td>
                    <td><b style={{ fontFamily: "monospace" }}>{ret.return_no}</b><div style={{ fontSize: 11, color: "#94a3b8" }}>{ret.product_name || "-"}</div></td>
                    <td><b style={{ fontFamily: "monospace" }}>{ret.invoice_ref || "-"}</b></td>
                    <td><b>{getReturnPartyName(ret) || "-"}</b><div style={{ fontSize: 11, color: "#64748b" }}>{ret.party_type || ret.customer_type || "customer"}</div></td>
                    <td style={{ textAlign: "center", fontSize: 12, fontWeight: 800 }}>{formatFullDate(ret.return_date)}</td>
                    <td style={{ textAlign: "center", fontSize: 12, fontWeight: 800 }}>{formatFullDate(ret.sale_order_date)}</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>{money(ret.return_qty)}</td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#1d4ed8" }}>{money(ret.return_amount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                        <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); openEdit(ret); }}>{t.edit}</button>
                        <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); printReturn(ret, t, isUrdu); }}>{t.print}</button>
                        <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); handleDelete(ret.id); }}>{t.delete}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-page-wrap">
          <div className="inputModalBox fullPageInputBox">
            <div className="inputModalTitle">
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.10)", borderRadius: 999, padding: "3px 9px", fontSize: 9.5, fontWeight: 900, marginBottom: 3 }}>
                  {editingId ? t.editMode : t.createMode}
                </span>
                <div>{editingId ? t.edit : t.newReturn}</div>
              </div>
              <button className="closeBtn" onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="inputModalBody">
              <div className="radioPanel">
                <span style={{ fontWeight: 950, color: "#334155", fontSize: 12, textTransform: "uppercase" }}>{t.mode}</span>
                <label className="radioItem">
                  <input type="radio" checked={returnMode === "manual"} onChange={() => handleModeChange("manual")} disabled={!!editingId} />
                  {t.manualReturn}
                </label>
                <label className="radioItem">
                  <input type="radio" checked={returnMode === "auto"} onChange={() => handleModeChange("auto")} disabled={!!editingId} />
                  {t.autoReturn}
                </label>
              </div>

              <div className="form-box">
                <div className="formTopLine">
                  <div>
                    <label className="basicLabel">{t.returnNo}</label>
                    <input className="basicInput" value={form.return_no} onChange={(e) => setForm((p) => ({ ...p, return_no: e.target.value }))} />
                  </div>
                  <div>
                    <label className="basicLabel">{t.customerType}</label>
                    <select className="basicSelect" value={form.party_type} onChange={(e) => handlePartyTypeChange(e.target.value)} disabled={returnMode === "auto" && !!selectedInvoice}>
                      {PARTY_TYPES.map((p) => <option key={p.value} value={p.value}>{t[p.labelKey]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="basicLabel">{t.name}</label>
                    <select className="basicSelect" value={form.party_id} onChange={(e) => handlePartyChange(e.target.value)} disabled={returnMode === "auto" && !!selectedInvoice}>
                      <option value="">{returnMode === "auto" && selectedInvoice ? form.party_name || "-" : t.selectName}</option>
                      {partyOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="basicLabel">{t.returnDate}</label>
                    <DateTextInput className="basicInput" value={form.return_date} onChange={(v) => setForm((p) => ({ ...p, return_date: v }))} />
                  </div>
                  <div>
                    <label className="basicLabel">{t.saleDate}</label>
                    <DateTextInput className="basicInput" value={form.sale_order_date} onChange={(v) => setForm((p) => ({ ...p, sale_order_date: v }))} readOnly={returnMode === "auto"} />
                  </div>
                  <div>
                    <label className="basicLabel">{t.reason}</label>
                    <input className="basicInput" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
                  </div>
                </div>
              </div>

              {returnMode === "auto" && (
                <>
                  <div className="sectionHead">
                    <span>{t.invoiceList}</span>
                    <input className="search" style={{ height: 30, width: 260 }} value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder={t.searchPlaceholder} />
                  </div>
                  <div className="paymentPanel" style={{ padding: 0 }}>
                    <table className="list" style={{ minWidth: 850 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 45 }}>#</th>
                          <th style={{ width: 150, textAlign: isUrdu ? "right" : "left" }}>{t.invoiceNo}</th>
                          <th style={{ textAlign: isUrdu ? "right" : "left" }}>{t.name}</th>
                          <th style={{ width: 150 }}>{t.date}</th>
                          <th style={{ width: 130, textAlign: "right" }}>{t.returnAmount}</th>
                          <th style={{ width: 120 }}>{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInv ? (
                          <tr><td colSpan={6} style={{ textAlign: "center", padding: 25 }}>{t.loading}</td></tr>
                        ) : filteredInvoices.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: "center", padding: 25 }}>{t.noInvoices}</td></tr>
                        ) : filteredInvoices.map((inv, idx) => (
                          <tr key={inv.id || idx} className={`clickRow ${String(selectedInvoice?.id) === String(inv.id) ? "selectedInvoiceRow" : ""}`} onClick={() => loadInvoiceDetails(inv)}>
                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td><b style={{ fontFamily: "monospace" }}>{getInvoiceNo(inv)}</b></td>
                            <td><b>{getInvoicePartyName(inv) || "-"}</b></td>
                            <td style={{ textAlign: "center" }}>{formatFullDate(getInvoiceDate(inv))}</td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>{money(getGrandTotal(inv))}</td>
                            <td style={{ textAlign: "center" }}><button style={buttonStyle} onClick={(e) => { e.stopPropagation(); loadInvoiceDetails(inv); }}>{t.showDetails}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedInvoice && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginTop: 12 }}>
                      <div className="totalBox"><label>{t.invoiceNo}</label><b>{getInvoiceNo(selectedInvoice)}</b></div>
                      <div className="totalBox"><label>{t.name}</label><b>{form.party_name || getInvoicePartyName(selectedInvoice) || "-"}</b></div>
                      <div className="totalBox"><label>{t.saleDate}</label><b>{formatFullDate(form.sale_order_date)}</b></div>
                      <div className="totalBox"><label>{t.returnAmount}</label><b>{money(getInvoiceTotal(selectedInvoice))}</b></div>
                      <div className="totalBox grandBox"><label>{t.totalAmount}</label><b>{money(getGrandTotal(selectedInvoice))}</b></div>
                    </div>
                  )}
                </>
              )}

              <div className="sectionHead">
                <span>{returnMode === "auto" ? t.invoiceProducts : t.products}</span>
                {returnMode === "manual" && <button className="basicBtn" onClick={addRow}>{t.addRow}</button>}
              </div>

              <div className="paymentPanel">
                <table className="basicProductTable">
                  <thead>
                    <tr>
                      <th style={{ width: 35 }}>#</th>
                      {returnMode === "auto" && <th style={{ width: 70 }}>{t.select}</th>}
                      <th style={{ width: 175 }}>{t.product}</th>
                      <th style={{ width: 230 }}>{t.desc}</th>
                      <th style={{ width: 130 }}>{t.productType}</th>
                      <th style={{ width: 145 }}>{t.category}</th>
                      <th style={{ width: 115 }}>{t.unit}</th>
                      <th style={{ width: 95 }}>{t.soldQty}</th>
                      <th style={{ width: 110 }}>{t.alreadyReturned}</th>
                      <th style={{ width: 105 }}>{t.availableQty}</th>
                      <th style={{ width: 100 }}>{t.returnQty}</th>
                      <th style={{ width: 90 }}>{t.rate}</th>
                      <th style={{ width: 120 }}>{t.returnAmount}</th>
                      <th style={{ width: 90 }}>{t.debit}</th>
                      <th style={{ width: 90 }}>{t.credit}</th>
                      {returnMode === "manual" && <th style={{ width: 42 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(returnMode === "auto" ? invoiceItems : items).map((row, idx) => {
                      const productOptions = !row.category_id
                        ? products
                        : products.filter((p) => sameId(getProductCatId(p), row.category_id));
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: "center", fontWeight: 900 }}>{idx + 1}</td>
                          {returnMode === "auto" && (
                            <td style={{ textAlign: "center" }}>
                              <input type="checkbox" checked={!!row.selected} onChange={(e) => handleAutoItemChange(idx, "selected", e.target.checked)} />
                            </td>
                          )}
                          <td>
                            {returnMode === "auto" ? (
                              <input className="productInput" value={row.product_name || productMap[String(row.product_id)] || ""} readOnly />
                            ) : (
                              <select className="productInput" value={row.product_id} onChange={(e) => handleProductChange(idx, e.target.value)}>
                                <option value="">{t.selectProduct}</option>
                                {productOptions.length ? productOptions.map((p) => <option key={getProductId(p)} value={getProductId(p)}>{getProductName(p)}</option>) : products.map((p) => <option key={getProductId(p)} value={getProductId(p)}>{getProductName(p)}</option>)}
                              </select>
                            )}
                          </td>
                          <td>
                            <input
                              className="productInput"
                              value={row.product_description || row.description || ""}
                              onChange={(e) => returnMode === "auto" ? handleAutoItemChange(idx, "product_description", e.target.value) : handleItemChange(idx, "product_description", e.target.value)}
                              readOnly={returnMode === "auto"}
                            />
                          </td>
                          <td>
                            <input
                              className="productInput"
                              value={row.product_type || getTypeName(row) || "FMS"}
                              onChange={(e) => handleItemChange(idx, "product_type", e.target.value)}
                              readOnly={returnMode === "auto"}
                            />
                          </td>
                          <td>
                            {returnMode === "auto" ? (
                              <input className="productInput" value={row.category_name || categoryMap[String(row.category_id)] || ""} readOnly />
                            ) : (
                              <select className="productInput" value={row.category_id} onChange={(e) => handleItemChange(idx, "category_id", e.target.value)}>
                                <option value="">{t.select}</option>
                                {categories.map((c) => <option key={getCategoryId(c)} value={getCategoryId(c)}>{getCategoryName(c)}</option>)}
                              </select>
                            )}
                          </td>
                          <td>
                            {returnMode === "auto" ? (
                              <input className="productInput" value={row.unit_name || unitMap[String(row.unit_id)] || ""} readOnly />
                            ) : (
                              <select className="productInput" value={row.unit_id} onChange={(e) => handleItemChange(idx, "unit_id", e.target.value)}>
                                <option value="">{t.select}</option>
                                {units.map((u) => <option key={getUnitId(u)} value={getUnitId(u)}>{getUnitName(u)}</option>)}
                              </select>
                            )}
                          </td>
                          <td><input className="productInput" value={row.sold_qty || ""} onChange={(e) => handleItemChange(idx, "sold_qty", e.target.value)} readOnly={returnMode === "auto"} /></td>
                          <td><input className="productInput" value={row.already_returned_qty || "0"} onChange={(e) => handleItemChange(idx, "already_returned_qty", e.target.value)} readOnly={returnMode === "auto"} /></td>
                          <td><input className="productInput" value={row.available_qty || ""} onChange={(e) => handleItemChange(idx, "available_qty", e.target.value)} readOnly={returnMode === "auto"} /></td>
                          <td><input className="productInput" type="number" value={row.return_qty || ""} onChange={(e) => returnMode === "auto" ? handleAutoItemChange(idx, "return_qty", e.target.value) : handleItemChange(idx, "return_qty", e.target.value)} /></td>
                          <td><input className="productInput" type="number" value={row.rate || "0"} onChange={(e) => returnMode === "auto" ? handleAutoItemChange(idx, "rate", e.target.value) : handleItemChange(idx, "rate", e.target.value)} /></td>
                          <td><input className="productInput" value={money(row.return_amount)} readOnly /></td>
                          <td><input className="productInput" type="number" value={row.debit || "0"} onChange={(e) => returnMode === "auto" ? handleAutoItemChange(idx, "debit", e.target.value) : handleItemChange(idx, "debit", e.target.value)} /></td>
                          <td><input className="productInput" type="number" value={row.credit || "0"} onChange={(e) => returnMode === "auto" ? handleAutoItemChange(idx, "credit", e.target.value) : handleItemChange(idx, "credit", e.target.value)} /></td>
                          {returnMode === "manual" && (
                            <td style={{ textAlign: "center" }}><button type="button" className="basicBtn basicBtnRed" style={{ width: 22, padding: 0 }} onClick={() => removeRow(idx)}>×</button></td>
                          )}
                        </tr>
                      );
                    })}
                    {returnMode === "auto" && !invoiceItems.length && (
                      <tr><td colSpan={15} style={{ textAlign: "center", padding: 25, color: "#94a3b8" }}>{selectedInvoice ? t.requiredItem : t.requiredInvoice}</td></tr>
                    )}
                  </tbody>
                </table>

                <div className="finalTotalBar">
                  {totalBoxes.map(([label, value]) => (
                    <div className={`totalBox ${label === t.totalAmount ? "grandBox" : ""}`} key={label}>
                      <label>{label}</label>
                      <b>{value}</b>
                    </div>
                  ))}
                </div>

                <div className="modalFooterBasic">
                  <button className="btn btn-soft" onClick={() => setShowForm(false)} disabled={saving}>{t.cancel}</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving || mastersLoading}>{saving ? t.saving : editingId ? t.update : t.save}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
