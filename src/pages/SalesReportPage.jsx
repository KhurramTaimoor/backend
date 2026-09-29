import React, { useMemo, useState } from "react";
import axios from "axios";
import { oneMonthRange } from "../utils/dateDefaults";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const API_BASE = `${API_ROOT}/api`;

const LANG = {
  en: {
    title: "Sales Report",
    subtitle: "Sales invoices and sales returns report",
    fromDate: "From Date",
    toDate: "To Date",
    nameSearch: "Search by Name",
    namePlaceholder: "Type customer/person name...",
    searchBtn: "Search Records",
    resetBtn: "Reset",
    totalInvoice: "Total Invoice",
    totalReturn: "Total Return",
    netSales: "Net Sales",
    records: "Records",
    type: "Type",
    referenceNo: "Reference No",
    name: "Name",
    date: "Date",
    invoiceAmount: "Invoice Amount",
    returnAmount: "Return Amount",
    netTotal: "Net Total",
    noRecords: "No records found.",
    toggleLang: "اردو",
    printBtn: "Print",
    pdfBtn: "Download PDF",
    reportHeader: "Sales Invoice & Return Report",
    printedOn: "Printed On",
    invoice: "Sales Invoice",
    return: "Sales Return",
    loading: "Loading...",
    details: "Details",
    summaryReport: "Summary",
    detailReport: "Details",
    shipment: "Shipment",
    invoiceDetails: "Invoice Details",
    returnDetails: "Sales Return Details",
    close: "Close",
    items: "Items",
    product: "Product",
    description: "Description",
    category: "Category",
    productType: "Product Type",
    unit: "Unit",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    discount: "Discount",
    grandTotal: "Grand Total",
    paidAmount: "Paid Amount",
    remaining: "Remaining",
    noItems: "No item details found.",
    clickHint: "Click any invoice or return row to view details.",
  },

  ur: {
    title: "سیلز رپورٹ",
    subtitle: "سیلز انوائس اور سیلز ریٹرن رپورٹ",
    fromDate: "شروع تاریخ",
    toDate: "ختم تاریخ",
    nameSearch: "نام سے تلاش کریں",
    namePlaceholder: "کسٹمر/شخص کا نام لکھیں...",
    searchBtn: "ریکارڈ تلاش کریں",
    resetBtn: "ری سیٹ",
    totalInvoice: "کل انوائس",
    totalReturn: "کل ریٹرن",
    netSales: "نیٹ سیلز",
    records: "ریکارڈز",
    type: "قسم",
    referenceNo: "ریفرنس نمبر",
    name: "نام",
    date: "تاریخ",
    invoiceAmount: "انوائس رقم",
    returnAmount: "ریٹرن رقم",
    netTotal: "نیٹ کل",
    noRecords: "کوئی ریکارڈ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "پرنٹ",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "سیلز انوائس اور ریٹرن رپورٹ",
    printedOn: "پرنٹ تاریخ",
    invoice: "سیلز انوائس",
    return: "سیلز ریٹرن",
    loading: "لوڈ ہو رہا ہے...",
    details: "تفصیل",
    summaryReport: "سمری",
    detailReport: "تفصیل",
    shipment: "شپمنٹ",
    invoiceDetails: "انوائس تفصیل",
    returnDetails: "سیلز ریٹرن تفصیل",
    close: "بند کریں",
    items: "آئٹمز",
    product: "پروڈکٹ",
    description: "تفصیل",
    category: "کیٹیگری",
    productType: "پروڈکٹ ٹائپ",
    unit: "یونٹ",
    qty: "مقدار",
    rate: "ریٹ",
    amount: "رقم",
    discount: "ڈسکاؤنٹ",
    grandTotal: "گرانڈ ٹوٹل",
    paidAmount: "ادا شدہ رقم",
    remaining: "باقی",
    noItems: "آئٹمز کی تفصیل موجود نہیں۔",
    clickHint: "انوائس یا ریٹرن کی row پر click کریں، details open ہو جائیں گی۔",
  },
};

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const raw = String(dateValue).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();

  return `${dd}/${mm}/${yy}`;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function unwrapObject(data) {
  if (!data) return {};
  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return data.data;
  }
  if (
    data.record &&
    typeof data.record === "object" &&
    !Array.isArray(data.record)
  ) {
    return data.record;
  }
  if (
    data.invoice &&
    typeof data.invoice === "object" &&
    !Array.isArray(data.invoice)
  ) {
    return data.invoice;
  }
  if (
    data.return &&
    typeof data.return === "object" &&
    !Array.isArray(data.return)
  ) {
    return data.return;
  }
  if (
    data.sales_return &&
    typeof data.sales_return === "object" &&
    !Array.isArray(data.sales_return)
  ) {
    return data.sales_return;
  }
  if (typeof data === "object" && !Array.isArray(data)) return data;
  return {};
}

function getPersonName(row) {
  return String(
    row.person_name ||
      row.party_name ||
      row.customer_name ||
      row.customer_name_en ||
      row.name ||
      row.buyer_name ||
      row.client_name ||
      "-"
  );
}

function getRefNo(row) {
  return String(
    row.reference_no ||
      row.invoice_no ||
      row.invoice_ref ||
      row.return_no ||
      row.return_ref ||
      row.id ||
      "-"
  );
}

function getEntryDate(row) {
  return (
    row.entry_date ||
    row.invoice_date ||
    row.return_date ||
    row.date ||
    row.created_at ||
    ""
  );
}

function getDetailItems(row) {
  let items =
    row.items ||
    row.invoice_items ||
    row.sales_invoice_items ||
    row.return_items ||
    row.sales_return_items ||
    row.products ||
    row.details ||
    [];

  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }

  if (items && !Array.isArray(items) && Array.isArray(items.data)) {
    items = items.data;
  }

  if (!Array.isArray(items)) return [];

  return items;
}

function getItemProductName(item) {
  return (
    item.product_name ||
    item.product_name_en ||
    item.product ||
    item.item_name ||
    item.name ||
    item.product_id ||
    "-"
  );
}

function getItemDescription(item) {
  return (
    item.product_description ||
    item.description ||
    item.details ||
    item.product_details ||
    "-"
  );
}

function getItemCategory(item) {
  return (
    item.category_name ||
    item.category ||
    item.category_id ||
    item.cat_name ||
    "-"
  );
}

function getItemType(item) {
  return (
    item.product_type ||
    item.product_type_en ||
    item.type_name ||
    item.type ||
    item.product_type_id ||
    "-"
  );
}

function getItemUnit(item) {
  return item.unit_name || item.unit || item.unit_id || "-";
}

function getItemQty(item) {
  return (
    item.qty ||
    item.quantity ||
    item.invoice_qty ||
    item.return_qty ||
    item.order_qty ||
    item.sale_qty ||
    0
  );
}

function getItemRate(item) {
  return item.rate || item.sale_rate || item.unit_price || item.price || 0;
}

function getItemAmount(item) {
  const direct =
    item.amount ||
    item.total_amount ||
    item.net_amount ||
    item.line_total ||
    item.total;

  if (direct !== undefined && direct !== null && direct !== "") {
    return toNum(direct);
  }

  return toNum(getItemQty(item)) * toNum(getItemRate(item));
}

function normalizeRecord(row) {
  const rawType = String(row.entry_type || row.type || "").toLowerCase();

  const isReturn =
    rawType === "return" ||
    rawType === "sales_return" ||
    row.return_no ||
    row.return_amount !== undefined;

  const type = isReturn ? "return" : "invoice";

  const rawAmount =
    type === "return"
      ? toNum(
          row.return_amount ||
            row.net_total ||
            row.gross_amount ||
            row.total_amount ||
            row.amount
        )
      : toNum(
          row.net_total ||
            row.grand_total ||
            row.invoice_total ||
            row.gross_amount ||
            row.total_amount ||
            row.amount
        );

  const amountAbs = Math.abs(rawAmount);

  return {
    id: row.id,
    entry_type: type,
    reference_no: getRefNo(row),
    person_name: getPersonName(row),
    shipment_to: row.shipment_to || row.ship_to || "-",
    entry_date: String(getEntryDate(row)).slice(0, 10),
    invoice_amount: type === "invoice" ? amountAbs : 0,
    return_amount: type === "return" ? amountAbs : 0,
    net_total: type === "return" ? -amountAbs : amountAbs,
    source_table: row.source_table || "",
    raw: row,
  };
}

function normalizeDetail(row, baseRecord) {
  const obj = unwrapObject(row);
  const record = obj || {};

  const type = baseRecord?.entry_type || normalizeRecord(record).entry_type;
  const amount =
    type === "return"
      ? Math.abs(
          toNum(
            record.return_amount ||
              record.net_total ||
              record.grand_total ||
              record.total_amount ||
              record.amount ||
              baseRecord?.return_amount
          )
        )
      : Math.abs(
          toNum(
            record.grand_total ||
              record.net_total ||
              record.invoice_total ||
              record.total_amount ||
              record.amount ||
              baseRecord?.invoice_amount
          )
        );

  return {
    id: record.id || baseRecord?.id,
    entry_type: type,
    reference_no: getRefNo(record) || baseRecord?.reference_no,
    person_name: getPersonName(record) || baseRecord?.person_name,
    entry_date:
      String(getEntryDate(record) || baseRecord?.entry_date || "").slice(
        0,
        10
      ) || "",
    invoice_amount: type === "invoice" ? amount : 0,
    return_amount: type === "return" ? amount : 0,
    net_total: type === "return" ? -amount : amount,
    previous_balance: toNum(record.previous_balance),
    discount: toNum(record.discount),
    delivery_charges: toNum(record.delivery_charges),
    paid_amount: toNum(record.paid_amount || record.payment_received),
    remaining_balance: toNum(record.remaining_balance),
    payment_method: record.payment_method || "-",
    payment_status: record.payment_status || record.status || "-",
    shipment_to: record.shipment_to || record.ship_to || "-",
    raw: record,
    items: getDetailItems(record),
  };
}

async function tryFetchDetail(entry) {
  const ref = encodeURIComponent(entry.reference_no || "");
  const id = encodeURIComponent(entry.id || "");

  const endpoints =
    entry.entry_type === "return"
      ? [
          id ? `${API_BASE}/sales-returns/${id}` : "",
          ref ? `${API_BASE}/sales-returns/by-number/${ref}` : "",
          ref ? `${API_BASE}/sales-returns?return_no=${ref}` : "",
        ]
      : [
          id ? `${API_BASE}/sales-invoices/${id}` : "",
          ref ? `${API_BASE}/sales-invoices/by-number/${ref}` : "",
          ref ? `${API_BASE}/sales-invoices?invoice_no=${ref}` : "",
        ];

  for (const endpoint of endpoints.filter(Boolean)) {
    try {
      const response = await axios.get(endpoint);
      const data = response.data;

      if (Array.isArray(data?.data)) {
        return data.data[0] || entry.raw || entry;
      }

      if (Array.isArray(data)) {
        return data[0] || entry.raw || entry;
      }

      return data;
    } catch {
      // next endpoint
    }
  }

  return entry.raw || entry;
}

export default function SalesReportPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState(() => ({
    ...oneMonthRange(),
    name: "",
  }));

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState("details");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailRecords, setDetailRecords] = useState([]);
  const [detailRecordsLoading, setDetailRecordsLoading] = useState(false);

  const typeLabel = (value) => {
    if (value === "invoice") return t.invoice;
    if (value === "return") return t.return;
    return value || "-";
  };

  const handleSearch = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.name.trim()) params.append("search", filters.name.trim());

      const url = `${API_BASE}/sales-report${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const res = await axios.get(url);

      const list = normalizeList(res.data)
        .map(normalizeRecord)
        .filter(
          (record) =>
            record.entry_type === "invoice" || record.entry_type === "return"
        )
        .filter((record) => {
          const query = filters.name.trim().toLowerCase();
          if (!query) return true;

          return String(record.person_name || "")
            .toLowerCase()
            .includes(query);
        })
        .filter((record) => {
          if (
            filters.from_date &&
            String(record.entry_date || "") < filters.from_date
          ) {
            return false;
          }

          if (
            filters.to_date &&
            String(record.entry_date || "") > filters.to_date
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          return (
            String(b.entry_date || "").localeCompare(
              String(a.entry_date || "")
            ) || Number(b.id || 0) - Number(a.id || 0)
          );
        });

      setRecords(list);
      setDetailRecords(list.map((record) => normalizeDetail(record.raw || record, record)));

      setDetailRecordsLoading(true);
      Promise.all(
        list.map(async (record) => {
          try {
            const detailData = await tryFetchDetail(record);
            return normalizeDetail(detailData, record);
          } catch {
            return normalizeDetail(record.raw || record, record);
          }
        })
      )
        .then((details) => setDetailRecords(details))
        .finally(() => setDetailRecordsLoading(false));
    } catch (error) {
      console.error("GET /sales-report failed:", error);
      setRecords([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleReset = () => {
    setFilters({
      ...oneMonthRange(),
      name: "",
    });

    setRecords([]);
    setDetailRecords([]);
    setDetailRecordsLoading(false);
    setSearched(false);
    setSelectedDetail(null);
    setDetailOpen(false);
  };

  const openDetails = async (record) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedDetail(normalizeDetail(record.raw || record, record));

    try {
      const detailData = await tryFetchDetail(record);
      setSelectedDetail(normalizeDetail(detailData, record));
    } catch {
      setSelectedDetail(normalizeDetail(record.raw || record, record));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDetailLoading(false);
    setSelectedDetail(null);
  };

  const summary = useMemo(() => {
    const totalInvoice = records.reduce(
      (sum, record) => sum + toNum(record.invoice_amount),
      0
    );

    const totalReturn = records.reduce(
      (sum, record) => sum + toNum(record.return_amount),
      0
    );

    const netSales = totalInvoice - totalReturn;

    return {
      totalInvoice,
      totalReturn,
      netSales,
    };
  }, [records]);

  const summaryRows = useMemo(() => {
    const map = new Map();
    records.forEach((record) => {
      const key = record.person_name || "Unassigned";
      const current = map.get(key) || { person_name: key, invoice_amount: 0, return_amount: 0, net_total: 0, count: 0 };
      current.invoice_amount += toNum(record.invoice_amount);
      current.return_amount += toNum(record.return_amount);
      current.net_total += toNum(record.net_total);
      current.count += 1;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => a.person_name.localeCompare(b.person_name));
  }, [records]);

  const generatePrintDocument = (isPdf = false) => {
    const font = isUrdu
      ? "'Noto Nastaliq Urdu','Noto Naskh Arabic','Jameel Noori Nastaleeq','Segoe UI',Arial,sans-serif"
      : "Arial,'Segoe UI',sans-serif";

    const rowsHtml = summaryRows.map((record, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td><strong>${record.person_name || "-"}</strong></td>
            <td class="center">${record.count}</td>
            <td class="num green">Rs ${fmt(record.invoice_amount)}</td>
            <td class="num red">Rs ${fmt(record.return_amount)}</td>
            <td class="num strong ${record.net_total < 0 ? "red" : "green"}">Rs ${fmt(record.net_total)}</td>
          </tr>`).join("");

    const detailsForPrint = detailRecords.length
      ? detailRecords
      : records.map((record) => normalizeDetail(record.raw || record, record));

    const detailsHtml = detailsForPrint.map((detail, index) => {
      const isReturn = detail.entry_type === "return";
      const items = Array.isArray(detail.items) ? detail.items : [];
      const itemRows = items.map((item, itemIndex) => `
        <tr>
          <td class="center">${itemIndex + 1}</td>
          <td><strong>${getItemProductName(item)}</strong></td>
          <td>${getItemDescription(item)}</td>
          <td>${getItemCategory(item)}</td>
          <td>${getItemType(item)}</td>
          <td>${getItemUnit(item)}</td>
          <td class="num">${fmt(getItemQty(item))}</td>
          <td class="num">Rs ${fmt(getItemRate(item))}</td>
          <td class="num">Rs ${fmt(getItemAmount(item))}</td>
        </tr>`).join("");

      return `
        <section class="detail-print">
          <div class="detail-head">
            <div><strong>#${index + 1} · ${typeLabel(detail.entry_type)} · ${detail.reference_no || "-"}</strong><div>${detail.person_name || "-"} · ${detail.shipment_to || "-"}</div></div>
            <div class="detail-right">${formatDate(detail.entry_date)}<br/><strong class="${toNum(detail.net_total) < 0 ? "red" : "green"}">Rs ${fmt(detail.net_total)}</strong></div>
          </div>
          <table>
            <thead><tr><th class="center">#</th><th>${t.product}</th><th>${t.description}</th><th>${t.category}</th><th>${t.productType}</th><th>${t.unit}</th><th class="num">${t.qty}</th><th class="num">${t.rate}</th><th class="num">${t.amount}</th></tr></thead>
            <tbody>${itemRows || `<tr><td colspan="9" class="center">${t.noItems}</td></tr>`}</tbody>
          </table>
          <div class="detail-totals">
            <span>${isReturn ? t.returnAmount : t.invoiceAmount}: <strong>Rs ${fmt(isReturn ? detail.return_amount : detail.invoice_amount)}</strong></span>
            <span>${t.discount}: <strong>Rs ${fmt(detail.discount)}</strong></span>
            <span>${t.netTotal}: <strong>Rs ${fmt(detail.net_total)}</strong></span>
          </div>
        </section>`;
    }).join("");

    const html = `
      <!doctype html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="UTF-8"/>
        <title>${t.title}</title>
        ${
          isUrdu
            ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">`
            : ""
        }
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:${font};background:#fff;color:#0f172a;padding:28px;line-height:${isUrdu ? "1.9" : "1.45"};unicode-bidi:plaintext}
          .wrap{max-width:1120px;margin:0 auto}
          .hint{background:#eff6ff;color:#1d4ed8;padding:12px;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:14px;text-align:center;font-size:13px}
          .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #111827;padding-bottom:16px;margin-bottom:18px}
          .brand{font-size:28px;font-weight:900;color:#111827}
          .subtitle{font-size:14px;color:#64748b;margin-top:5px}
          .meta{text-align:${
            isUrdu ? "left" : "right"
          };font-size:12px;color:#64748b;line-height:1.8}
          .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
          .box{border:1px solid #d1d5db;border-radius:12px;padding:12px;background:#f8fafc}
          .box small{display:block;color:#64748b;font-weight:800;text-transform:uppercase;font-size:10px;margin-bottom:6px}
          .box b{font-size:20px;font-family:monospace}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th{background:#111827;color:#fff;padding:10px;border:1px solid #111827;text-align:${
            isUrdu ? "right" : "left"
          }}
          td{padding:9px;border:1px solid #e5e7eb;color:#334155}
          tr:nth-child(even) td{background:#f8fafc}
          .center{text-align:center}
          .num{text-align:right;font-family:monospace}
          .strong{font-weight:900}
          .green{color:#16a34a}
          .red{color:#dc2626}
          .detail-print{border:1px solid #d1d5db;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid}
          .detail-head{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:12px}
          .detail-head div div{color:#64748b;margin-top:3px}.detail-right{text-align:${isUrdu ? "left" : "right"}}
          .detail-totals{display:flex;justify-content:flex-end;gap:18px;flex-wrap:wrap;padding:10px 12px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px}
          @media print{body{padding:0}.hint{display:none}.detail-print{break-inside:avoid}}
        </style>
      </head>
      <body>
        <div class="wrap">
          ${
            isPdf
              ? `<div class="hint">Print dialog mein “Save as PDF” select karein.</div>`
              : ""
          }

          <div class="header">
            <div>
              <div class="brand">Ali Cages</div>
              <div class="subtitle">${t.reportHeader}</div>
            </div>

            <div class="meta">
              <div>${t.printedOn}: ${new Date().toLocaleString(
      isUrdu ? "ur-PK" : "en-PK"
    )}</div>
              ${
                filters.from_date || filters.to_date
                  ? `<div>Period: ${formatDate(
                      filters.from_date
                    )} to ${formatDate(filters.to_date)}</div>`
                  : ""
              }
              ${filters.name ? `<div>${t.name}: ${filters.name}</div>` : ""}
            </div>
          </div>

          <div class="summary">
            <div class="box"><small>${
              t.totalInvoice
            }</small><b>Rs ${fmt(summary.totalInvoice)}</b></div>
            <div class="box"><small>${t.totalReturn}</small><b>Rs ${fmt(
      summary.totalReturn
    )}</b></div>
            <div class="box"><small>${t.netSales}</small><b>Rs ${fmt(
      summary.netSales
    )}</b></div>
          </div>

          ${reportMode === "summary" ? `
            <table>
              <thead><tr><th class="center">#</th><th>${t.name}</th><th class="center">${t.records}</th><th class="num">${t.invoiceAmount}</th><th class="num">${t.returnAmount}</th><th class="num">${t.netTotal}</th></tr></thead>
              <tbody>${summaryRows.length ? rowsHtml : `<tr><td colspan="6" class="center">${t.noRecords}</td></tr>`}</tbody>
            </table>` : (detailsHtml || `<div class="center">${t.noRecords}</div>`)}
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              ${!isPdf ? "window.onafterprint = () => window.close();" : ""}
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=850");

    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div dir={dir} className="sales-report-page">
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

      <style>{`
        * {
          box-sizing: border-box;
        }

        .sales-report-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 18px;
          color: #0f172a;
          font-family: ${
            isUrdu ? "'Noto Nastaliq Urdu', serif" : "Arial, sans-serif"
          };
        }

        .page-wrap {
          max-width: 1240px;
          margin: 0 auto;
        }

        .top-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
          margin-bottom: 14px;
        }

        .title {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
        }

        .subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .btn {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          border-radius: 10px;
          padding: 9px 14px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          transition: .15s;
        }

        .btn:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .btn-dark {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }

        .btn-dark:hover {
          background: #1f2937;
        }

        .btn:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none;
        }

        .filter-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 15px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
          margin-bottom: 14px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr auto auto;
          gap: 10px;
          align-items: end;
        }

        label {
          display: block;
          font-size: 11px;
          color: #475569;
          font-weight: 900;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: .4px;
        }

        .input {
          width: 100%;
          height: 39px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 10px;
          outline: none;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 650;
        }

        .input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, .08);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }

        .summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 15px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
        }

        .summary-card small {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .summary-card b {
          display: block;
          font-family: monospace;
          font-size: 24px;
          font-weight: 900;
        }

        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
        }

        .table-head {
          padding: 13px 15px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          background: #f8fafc;
        }

        .record-title {
          font-weight: 900;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .count-pill {
          background: #e2e8f0;
          color: #334155;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 12px;
          font-family: monospace;
        }

        .click-hint {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          padding: 0 15px 12px;
          background: #f8fafc;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 920px;
        }

        th {
          background: #111827;
          color: #fff;
          padding: 11px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .45px;
          text-align: ${isUrdu ? "right" : "left"};
          white-space: nowrap;
        }

        td {
          padding: 11px 10px;
          border-bottom: 1px solid #eef2f7;
          color: #334155;
          font-size: 13px;
          vertical-align: middle;
        }

        tr.clickable-row {
          cursor: pointer;
        }

        tr.clickable-row:hover td {
          background: #eff6ff;
        }

        .center {
          text-align: center;
        }

        .num {
          text-align: right;
          font-family: monospace;
          font-weight: 800;
        }

        .muted {
          color: #94a3b8;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 900;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
        }

        .tag-invoice {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .tag-return {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .green {
          color: #16a34a;
        }

        .red {
          color: #dc2626;
        }

        .detail-stack {
          display: grid;
          gap: 14px;
        }

        .detail-record-card {
          background: #fff;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
        }

        .detail-record-head {
          padding: 13px 15px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .detail-record-body {
          padding: 14px;
        }

        .details-loading-note {
          padding: 12px 14px;
          border-radius: 12px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .55);
          z-index: 80;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 18px;
          overflow-y: auto;
          backdrop-filter: blur(3px);
        }

        .detail-modal {
          width: min(1100px, 100%);
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 90px rgba(15, 23, 42, .30);
          border: 1px solid #e2e8f0;
        }

        .modal-header {
          background: #111827;
          color: white;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 900;
          margin: 0;
        }

        .modal-subtitle {
          color: rgba(255,255,255,.72);
          font-size: 12px;
          margin-top: 4px;
        }

        .close-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.08);
          color: white;
          cursor: pointer;
          font-size: 20px;
          font-weight: 900;
        }

        .modal-body {
          padding: 15px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .detail-box {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
          padding: 12px;
        }

        .detail-box small {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .detail-box b {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
          word-break: break-word;
        }

        .items-title {
          margin: 4px 0 10px;
          font-weight: 900;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .items-table {
          min-width: 900px;
        }

        .loading-box {
          padding: 28px;
          text-align: center;
          color: #64748b;
          font-weight: 800;
        }

        @media(max-width: 900px) {
          .filter-grid {
            grid-template-columns: 1fr 1fr;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width: 560px) {
          .sales-report-page {
            padding: 12px;
          }

          .top-card {
            align-items: stretch;
          }

          .top-card .btn {
            width: 100%;
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 23px;
          }

          .modal-bg {
            padding: 0;
          }

          .detail-modal {
            min-height: 100vh;
            border-radius: 0;
          }

          .modal-header {
            align-items: flex-start;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-wrap">
        <div className="top-card">
          <div>
            <h1 className="title">{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>

          <button
            className="btn"
            onClick={() => setLang(isUrdu ? "en" : "ur")}
          >
            <i className="bi bi-translate"></i>
            {t.toggleLang}
          </button>
        </div>

        <div className="filter-card">
          <div className="filter-grid">
            <div>
              <label>{t.fromDate}</label>

              <input
                type="date"
                className="input"
                value={filters.from_date}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    from_date: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>{t.toDate}</label>

              <input
                type="date"
                className="input"
                value={filters.to_date}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    to_date: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label>{t.nameSearch}</label>

              <input
                type="text"
                className="input"
                value={filters.name}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder={t.namePlaceholder}
              />
            </div>

            <button
              className="btn btn-dark"
              onClick={handleSearch}
              disabled={loading}
            >
              <i
                className={`bi ${
                  loading ? "bi-hourglass-split" : "bi-search"
                }`}
              ></i>
              {loading ? t.loading : t.searchBtn}
            </button>

            <button className="btn" onClick={handleReset} disabled={loading}>
              <i className="bi bi-arrow-counterclockwise"></i>
              {t.resetBtn}
            </button>
          </div>
        </div>

        {searched && (
          <>
            <div className="summary-grid">
              <div className="summary-card">
                <small>{t.totalInvoice}</small>
                <b className="green">Rs {fmt(summary.totalInvoice)}</b>
              </div>

              <div className="summary-card">
                <small>{t.totalReturn}</small>
                <b className="red">Rs {fmt(summary.totalReturn)}</b>
              </div>

              <div className="summary-card">
                <small>{t.netSales}</small>
                <b>Rs {fmt(summary.netSales)}</b>
              </div>
            </div>

            <div className="table-card">
              <div className="table-head">
                <div className="record-title">
                  <i className="bi bi-table"></i>
                  {t.records}
                  <span className="count-pill">{records.length}</span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button className={`btn ${reportMode === "summary" ? "btn-dark" : ""}`} onClick={() => setReportMode("summary")}>
                    <i className="bi bi-pie-chart"></i>{t.summaryReport}
                  </button>
                  <button className={`btn ${reportMode === "details" ? "btn-dark" : ""}`} onClick={() => setReportMode("details")}>
                    <i className="bi bi-list-ul"></i>{t.detailReport}
                  </button>
                </div>

                {records.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn"
                      onClick={() => generatePrintDocument(false)}
                    >
                      <i className="bi bi-printer"></i>
                      {t.printBtn}
                    </button>

                    <button
                      className="btn"
                      onClick={() => generatePrintDocument(true)}
                    >
                      <i className="bi bi-file-earmark-pdf"></i>
                      {t.pdfBtn}
                    </button>
                  </div>
                )}
              </div>

              {records.length > 0 && (
                <div className="click-hint">
                  <i className="bi bi-info-circle"></i> {t.clickHint}
                </div>
              )}

              <div className="table-wrap">
                {reportMode === "summary" ? (
                  <table>
                    <thead><tr><th className="center">#</th><th>{t.name}</th><th className="center">{t.records}</th><th className="num">{t.invoiceAmount}</th><th className="num">{t.returnAmount}</th><th className="num">{t.netTotal}</th></tr></thead>
                    <tbody>
                      {summaryRows.length === 0 ? (
                        <tr><td colSpan={6} className="center muted" style={{ padding: 42 }}>{t.noRecords}</td></tr>
                      ) : summaryRows.map((row, index) => (
                        <tr key={`summary-${row.person_name}-${index}`}>
                          <td className="center muted">{index + 1}</td><td><b>{row.person_name}</b></td><td className="center">{row.count}</td>
                          <td className="num green">Rs {fmt(row.invoice_amount)}</td><td className="num red">Rs {fmt(row.return_amount)}</td>
                          <td className={`num ${row.net_total < 0 ? "red" : "green"}`}>Rs {fmt(row.net_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="detail-stack" style={{ padding: 14 }}>
                    {detailRecordsLoading && records.length > 0 && (
                      <div className="details-loading-note">
                        <i className="bi bi-hourglass-split"></i> {t.loading} — loading complete invoice/return item details…
                      </div>
                    )}

                    {records.length === 0 ? (
                      <div className="center muted" style={{ padding: 42 }}>{t.noRecords}</div>
                    ) : (detailRecords.length ? detailRecords : records.map((row) => normalizeDetail(row.raw || row, row))).map((detail, index) => (
                      <SalesDetailCard
                        key={`${detail.entry_type}-${detail.id || detail.reference_no}-${index}`}
                        index={index}
                        detail={detail}
                        t={t}
                        typeLabel={typeLabel}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {detailOpen && (
        <SalesDetailModal
          t={t}
          isUrdu={isUrdu}
          detail={selectedDetail}
          loading={detailLoading}
          typeLabel={typeLabel}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}

function SalesDetailCard({ index, detail, t, typeLabel }) {
  const items = detail?.items || [];
  const isReturn = detail?.entry_type === "return";

  return (
    <section className="detail-record-card">
      <div className="detail-record-head">
        <div className="record-title">
          <span className="count-pill">{index + 1}</span>
          <span className={`tag ${isReturn ? "tag-return" : "tag-invoice"}`}>
            {typeLabel(detail?.entry_type)}
          </span>
          <b style={{ fontFamily: "monospace" }}>{detail?.reference_no || "-"}</b>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
          {formatDate(detail?.entry_date)}
        </div>
      </div>

      <div className="detail-record-body">
        <div className="detail-grid">
          <DetailBox label={t.name} value={detail?.person_name || "-"} />
          <DetailBox label={t.shipment} value={detail?.shipment_to || "-"} />
          <DetailBox
            label={isReturn ? t.returnAmount : t.invoiceAmount}
            value={`Rs ${fmt(isReturn ? detail?.return_amount : detail?.invoice_amount)}`}
            color={isReturn ? "#dc2626" : "#16a34a"}
          />
          <DetailBox
            label={t.netTotal}
            value={`Rs ${fmt(detail?.net_total)}`}
            color={toNum(detail?.net_total) < 0 ? "#dc2626" : "#16a34a"}
          />
        </div>

        <div className="items-title">
          <i className="bi bi-box-seam"></i>
          {t.items}
          <span className="count-pill">{items.length}</span>
        </div>

        <div className="table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th className="center" style={{ width: 50 }}>#</th>
                <th>{t.product}</th>
                <th>{t.description}</th>
                <th>{t.category}</th>
                <th>{t.productType}</th>
                <th>{t.unit}</th>
                <th className="num">{t.qty}</th>
                <th className="num">{t.rate}</th>
                <th className="num">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="center muted" style={{ padding: 28 }}>{t.noItems}</td></tr>
              ) : items.map((item, itemIndex) => (
                <tr key={itemIndex}>
                  <td className="center muted">{itemIndex + 1}</td>
                  <td><b>{getItemProductName(item)}</b></td>
                  <td>{getItemDescription(item)}</td>
                  <td>{getItemCategory(item)}</td>
                  <td>{getItemType(item)}</td>
                  <td>{getItemUnit(item)}</td>
                  <td className="num">{fmt(getItemQty(item))}</td>
                  <td className="num">Rs {fmt(getItemRate(item))}</td>
                  <td className="num">Rs {fmt(getItemAmount(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SalesDetailModal({
  t,
  isUrdu,
  detail,
  loading,
  typeLabel,
  onClose,
}) {
  const items = detail?.items || [];
  const isReturn = detail?.entry_type === "return";

  return (
    <div className="modal-bg" dir={isUrdu ? "rtl" : "ltr"}>
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isReturn ? t.returnDetails : t.invoiceDetails}
            </h2>

            <div className="modal-subtitle">
              {typeLabel(detail?.entry_type)} • {detail?.reference_no || "-"}
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-box">
              <i className="bi bi-hourglass-split"></i> {t.loading}
            </div>
          )}

          {!loading && detail && (
            <>
              <div className="detail-grid">
                <DetailBox label={t.type} value={typeLabel(detail.entry_type)} />
                <DetailBox
                  label={t.referenceNo}
                  value={detail.reference_no || "-"}
                />
                <DetailBox label={t.name} value={detail.person_name || "-"} />
                <DetailBox
                  label={t.date}
                  value={formatDate(detail.entry_date)}
                />

                <DetailBox
                  label={isReturn ? t.returnAmount : t.invoiceAmount}
                  value={`Rs ${fmt(
                    isReturn ? detail.return_amount : detail.invoice_amount
                  )}`}
                  color={isReturn ? "#dc2626" : "#16a34a"}
                />

                <DetailBox
                  label={t.discount}
                  value={`Rs ${fmt(detail.discount)}`}
                />

                <DetailBox
                  label={t.paidAmount}
                  value={`Rs ${fmt(detail.paid_amount)}`}
                />

                <DetailBox
                  label={t.remaining}
                  value={`Rs ${fmt(detail.remaining_balance)}`}
                />
              </div>

              <div className="items-title">
                <i className="bi bi-box-seam"></i>
                {t.items}
                <span className="count-pill">{items.length}</span>
              </div>

              <div className="table-wrap">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th className="center" style={{ width: 50 }}>
                        #
                      </th>
                      <th>{t.product}</th>
                      <th>{t.description}</th>
                      <th>{t.category}</th>
                      <th>{t.productType}</th>
                      <th>{t.unit}</th>
                      <th className="num">{t.qty}</th>
                      <th className="num">{t.rate}</th>
                      <th className="num">{t.amount}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="center muted"
                          style={{ padding: 36 }}
                        >
                          {t.noItems}
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index}>
                          <td className="center muted">{index + 1}</td>

                          <td>
                            <b>{getItemProductName(item)}</b>
                          </td>

                          <td>{getItemDescription(item)}</td>
                          <td>{getItemCategory(item)}</td>
                          <td>{getItemType(item)}</td>
                          <td>{getItemUnit(item)}</td>

                          <td className="num">{fmt(getItemQty(item))}</td>
                          <td className="num">Rs {fmt(getItemRate(item))}</td>
                          <td className="num">Rs {fmt(getItemAmount(item))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: isUrdu ? "flex-start" : "flex-end",
                  marginTop: 14,
                }}
              >
                <button className="btn btn-dark" onClick={onClose}>
                  {t.close}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value, color }) {
  return (
    <div className="detail-box">
      <small>{label}</small>
      <b style={{ color: color || "#0f172a" }}>{value}</b>
    </div>
  );
}
