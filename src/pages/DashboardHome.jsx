import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Request failed");
  }

  return res.json();
}

async function translateText(text) {
  if (!text || !String(text).trim()) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      String(text).trim()
    )}&langpair=en|ur`;

    const res = await fetch(url);
    if (!res.ok) return text;

    const data = await res.json();
    const translated = data?.responseData?.translatedText;

    if (
      !translated ||
      translated.toLowerCase() === String(text).trim().toLowerCase()
    ) {
      return text;
    }

    return translated;
  } catch {
    return text;
  }
}

const LANG = {
  en: {
    title: "Dashboard Overview",
    subtitle: "Business summary and today transactions",
    summaryBtn: "View Summary",
    summaryTitle: "Dashboard Summary",
    summarySubtitle: "Overview of sales, purchases, pending orders and stock",
    toggleLang: "اردو",
    translating: "Translating to Urdu…",

    totalSales: "Total Sales",
    totalPurchase: "Total Purchase",
    pendingOrders: "Pending Orders",
    lowStock: "Low Stock",

    customers: "Customers",
    suppliers: "Suppliers",
    employees: "Employees",
    generalAccounts: "General Accounts",
    ledgerSummary: "Ledger Summary",
    open: "Open",

    todayTransactions: "Today Transactions",
    refresh: "Refresh",
    id: "ID",
    type: "Type",
    party: "Customer / Supplier",
    date: "Date",
    amount: "Amount",
    status: "Status",

    noTransactions: "No transactions found today",
    loading: "Loading dashboard data...",
    items: "items",

    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    all: "All",

    sale: "Sale",
    saleReturn: "Sale Return",
    purchase: "Purchase",
    purchaseReturn: "Purchase Return",

    completed: "Completed",
    returned: "Returned",
    pending: "Pending",
    chequeSchedule: "Upcoming Cheque Clearances",
    chequeSubtitle: "Nearest pending clearance dates are shown first",
    chequeVoucher: "Cheque Voucher",
    viewAll: "View All",
    noCheques: "No cheque vouchers found",
    issuance: "Issued",
    clearance: "Clearance",
    remaining: "Remaining",
    cleared: "Cleared",
    partial: "Partially Paid",
  },

  ur: {
    title: "ڈیش بورڈ کا جائزہ",
    subtitle: "کاروباری خلاصہ اور آج کا لین دین",
    summaryBtn: "سمری دیکھیں",
    summaryTitle: "ڈیش بورڈ سمری",
    summarySubtitle: "فروخت، خریداری، زیر التواء آرڈرز اور اسٹاک کا خلاصہ",
    toggleLang: "English",
    translating: "اردو میں ترجمہ ہو رہا ہے…",

    totalSales: "کل فروخت",
    totalPurchase: "کل خریداری",
    pendingOrders: "زیر التواء آرڈرز",
    lowStock: "کم اسٹاک",

    customers: "گاہک",
    suppliers: "سپلائرز",
    employees: "ملازمین",
    generalAccounts: "جنرل اکاؤنٹس",
    ledgerSummary: "تمام لیجرز",
    open: "کھولیں",

    todayTransactions: "آج کا لین دین",
    refresh: "ریفریش",
    id: "نمبر",
    type: "قسم",
    party: "گاہک / سپلائر",
    date: "تاریخ",
    amount: "رقم",
    status: "حالت",

    noTransactions: "آج کوئی لین دین موجود نہیں",
    loading: "ڈیش بورڈ کا ڈیٹا لوڈ ہو رہا ہے...",
    items: "اشیاء",

    today: "آج",
    week: "اس ہفتے",
    month: "اس مہینے",
    year: "اس سال",
    all: "تمام",

    sale: "فروخت",
    saleReturn: "فروخت واپسی",
    purchase: "خریداری",
    purchaseReturn: "خریداری واپسی",

    completed: "مکمل",
    returned: "واپس",
    pending: "زیر التواء",
    chequeSchedule: "آنے والے چیک کلیئرنس",
    chequeSubtitle: "قریب ترین زیر التواء کلیئرنس تاریخیں پہلے دکھائی گئی ہیں",
    chequeVoucher: "چیک واؤچر",
    viewAll: "تمام دیکھیں",
    noCheques: "کوئی چیک واؤچر موجود نہیں",
    issuance: "جاری ہونے کی تاریخ",
    clearance: "کلیئرنس",
    remaining: "بقایا",
    cleared: "کلیئر",
    partial: "جزوی ادائیگی",
  },
};

const DashboardHome = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [showSummary, setShowSummary] = useState(false);
  const [salesFilter, setSalesFilter] = useState("today");
  const [purchaseFilter, setPurchaseFilter] = useState("today");

  const [salesInvoices, setSalesInvoices] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [saleOrders, setSaleOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [chequeVouchers, setChequeVouchers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [urduCache, setUrduCache] = useState({});

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        salesInvoicesData,
        salesReturnsData,
        purchaseInvoicesData,
        purchaseReturnsData,
        saleOrdersData,
        productsData,
        chequeVouchersData,
      ] = await Promise.all([
        apiFetch("/api/sales-invoices"),
        apiFetch("/api/sales-returns"),
        apiFetch("/api/purchase-invoices"),
        apiFetch("/api/purchase-returns"),
        apiFetch("/api/sale-orders"),
        apiFetch("/api/products"),
        apiFetch("/api/cheque-vouchers/dashboard?limit=6").catch(() => ({
          data: [],
        })),
      ]);

      setSalesInvoices(normalizeArray(salesInvoicesData));
      setSalesReturns(normalizeArray(salesReturnsData));
      setPurchaseInvoices(normalizeArray(purchaseInvoicesData));
      setPurchaseReturns(normalizeArray(purchaseReturnsData));
      setSaleOrders(normalizeArray(saleOrdersData));
      setProducts(normalizeArray(productsData));
      setChequeVouchers(normalizeArray(chequeVouchersData));
    } catch (err) {
      console.error("Dashboard data error:", err);
      setSalesInvoices([]);
      setSalesReturns([]);
      setPurchaseInvoices([]);
      setPurchaseReturns([]);
      setSaleOrders([]);
      setProducts([]);
      setChequeVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLangToggle = async () => {
    const newLang = lang === "en" ? "ur" : "en";
    setLang(newLang);

    if (newLang !== "ur") return;

    const itemsToTranslate = [];

    salesInvoices.forEach((item) => {
      const text = getSalesParty(item);
      const key = getCacheKey("sale", item.id || item.invoice_no, text);
      if (text && !urduCache[key]) itemsToTranslate.push({ key, text });
    });

    salesReturns.forEach((item) => {
      const text = getSalesReturnParty(item);
      const key = getCacheKey("sale-return", item.id || item.return_no, text);
      if (text && !urduCache[key]) itemsToTranslate.push({ key, text });
    });

    purchaseInvoices.forEach((item) => {
      const text = getPurchaseParty(item);
      const key = getCacheKey("purchase", item.id || item.invoice_no, text);
      if (text && !urduCache[key]) itemsToTranslate.push({ key, text });
    });

    purchaseReturns.forEach((item) => {
      const text = getPurchaseReturnParty(item);
      const key = getCacheKey(
        "purchase-return",
        item.id || item.invoice_no,
        text
      );
      if (text && !urduCache[key]) itemsToTranslate.push({ key, text });
    });

    if (itemsToTranslate.length === 0) return;

    setTranslating(true);

    try {
      const results = await Promise.all(
        itemsToTranslate.map(async ({ key, text }) => {
          const translated = await translateText(text);
          return { key, translated };
        })
      );

      setUrduCache((prev) => {
        const next = { ...prev };
        results.forEach(({ key, translated }) => {
          next[key] = translated;
        });
        return next;
      });
    } catch (err) {
      console.error("Dashboard translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const getTranslatedText = (kind, id, text) => {
    if (!isUrdu) return text || "-";
    const key = getCacheKey(kind, id, text);
    return urduCache[key] || text || "-";
  };

  const summary = useMemo(() => {
    const salesTotal = sumByDateRange(
      salesInvoices,
      salesFilter,
      "invoice_date",
      ["grand_total", "invoice_total", "total_amount", "amount"]
    );

    const salesReturnTotal = sumByDateRange(
      salesReturns,
      salesFilter,
      "return_date",
      ["return_amount", "total_amount", "amount"]
    );

    const purchaseTotal = sumByDateRange(
      purchaseInvoices,
      purchaseFilter,
      "invoice_date",
      ["total_amount", "grand_total", "invoice_total", "amount"]
    );

    const purchaseReturnTotal = sumByDateRange(
      purchaseReturns,
      purchaseFilter,
      "return_date",
      ["total_amount", "return_amount", "amount"]
    );

    const pendingOrders = saleOrders.filter((order) => {
      const status = String(
        order.status ||
          order.order_status ||
          order.sale_order_status ||
          order.payment_status ||
          ""
      ).toLowerCase();

      return (
        status.includes("pending") ||
        status.includes("process") ||
        status.includes("unpaid") ||
        status.includes("زیر")
      );
    });

    const lowStockItems = products.filter((product) => {
      const currentStock = Number(
        product.current_stock ??
          product.stock ??
          product.quantity ??
          product.available_stock ??
          product.balance_qty ??
          product.qty ??
          0
      );

      const lowLimit = Number(
        product.low_stock_limit ??
          product.min_stock ??
          product.reorder_level ??
          product.alert_quantity ??
          product.minimum_stock ??
          5
      );

      return currentStock <= lowLimit;
    });

    return {
      totalSales: salesTotal - salesReturnTotal,
      totalPurchase: purchaseTotal - purchaseReturnTotal,
      pendingOrders: pendingOrders.length,
      lowStock: lowStockItems.length,
    };
  }, [
    salesInvoices,
    salesReturns,
    purchaseInvoices,
    purchaseReturns,
    saleOrders,
    products,
    salesFilter,
    purchaseFilter,
  ]);

  const todayTransactions = useMemo(() => {
    const sales = salesInvoices
      .filter((item) => isToday(item.invoice_date))
      .map((item) => {
        const party = getSalesParty(item);

        return {
          id: item.invoice_no || item.id || "-",
          typeKey: "Sale",
          type: t.sale,
          party: getTranslatedText("sale", item.id || item.invoice_no, party),
          date: item.invoice_date,
          amount: getFirstAmount(item, [
            "grand_total",
            "invoice_total",
            "total_amount",
            "amount",
          ]),
          status: item.status || t.completed,
        };
      });

    const saleReturnList = salesReturns
      .filter((item) => isToday(item.return_date))
      .map((item) => {
        const party = getSalesReturnParty(item);

        return {
          id: item.return_no || item.id || "-",
          typeKey: "Sale Return",
          type: t.saleReturn,
          party: getTranslatedText(
            "sale-return",
            item.id || item.return_no,
            party
          ),
          date: item.return_date,
          amount: getFirstAmount(item, [
            "return_amount",
            "total_amount",
            "amount",
          ]),
          status: t.returned,
        };
      });

    const purchases = purchaseInvoices
      .filter((item) => isToday(item.invoice_date))
      .map((item) => {
        const party = getPurchaseParty(item);

        return {
          id: item.invoice_no || item.id || "-",
          typeKey: "Purchase",
          type: t.purchase,
          party: getTranslatedText(
            "purchase",
            item.id || item.invoice_no,
            party
          ),
          date: item.invoice_date,
          amount: getFirstAmount(item, [
            "total_amount",
            "grand_total",
            "invoice_total",
            "amount",
          ]),
          status: item.status || t.pending,
        };
      });

    const purchaseReturnList = purchaseReturns
      .filter((item) => isToday(item.return_date))
      .map((item) => {
        const party = getPurchaseReturnParty(item);

        return {
          id: item.invoice_no || item.id || "-",
          typeKey: "Purchase Return",
          type: t.purchaseReturn,
          party: getTranslatedText(
            "purchase-return",
            item.id || item.invoice_no,
            party
          ),
          date: item.return_date,
          amount: getFirstAmount(item, [
            "total_amount",
            "return_amount",
            "amount",
          ]),
          status: t.returned,
        };
      });

    return [
      ...sales,
      ...saleReturnList,
      ...purchases,
      ...purchaseReturnList,
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [
    salesInvoices,
    salesReturns,
    purchaseInvoices,
    purchaseReturns,
    t,
    isUrdu,
    urduCache,
  ]);

  return (
    <div
      dir={dir}
      style={{
        fontFamily: isUrdu
          ? "'Noto Nastaliq Urdu', serif"
          : "Helvetica, 'Helvetica Neue', Arial, sans-serif",
      }}
      className="min-h-screen bg-[#F4F7FB] px-3 py-4 pb-20 text-slate-900 sm:px-5 lg:px-6"
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {translating && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl bg-slate-800 text-white text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-arrow-repeat animate-spin"></i>
          {t.translating}
        </div>
      )}

      <div className="mx-auto max-w-[1500px]">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm mb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#13263A]">
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{t.subtitle}</p>
            </div>

            <div
              className={`flex gap-2 flex-wrap ${
                isUrdu ? "flex-row-reverse" : ""
              }`}
            >
              <button
                onClick={handleLangToggle}
                disabled={translating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-50 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <i
                  className={`bi ${
                    translating
                      ? "bi-arrow-repeat animate-spin"
                      : "bi-translate"
                  }`}
                ></i>
                {t.toggleLang}
              </button>

              <button
                onClick={() => setShowSummary((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
                  showSummary
                    ? "bg-[#4A86F7] text-white hover:bg-blue-600"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                <i className="bi bi-bar-chart-line-fill"></i>
                {t.summaryBtn}
                <i
                  className={`bi bi-chevron-${
                    showSummary ? "up" : "down"
                  } text-xs`}
                ></i>
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="mt-5 pt-5 border-t border-sky-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {t.summaryTitle}
                </h3>
                <p className="text-sm text-slate-500">{t.summarySubtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DropdownSummaryCard
                  title={t.totalSales}
                  value={
                    loading ? t.loading : formatCurrency(summary.totalSales)
                  }
                  icon="bi-currency-rupee"
                  selected={salesFilter}
                  onChange={setSalesFilter}
                  t={t}
                />

                <DropdownSummaryCard
                  title={t.totalPurchase}
                  value={
                    loading ? t.loading : formatCurrency(summary.totalPurchase)
                  }
                  icon="bi-cart-check"
                  selected={purchaseFilter}
                  onChange={setPurchaseFilter}
                  t={t}
                />

                <SummaryCard
                  title={t.pendingOrders}
                  value={loading ? t.loading : summary.pendingOrders}
                  icon="bi-hourglass-split"
                />

                <SummaryCard
                  title={t.lowStock}
                  value={loading ? t.loading : `${summary.lowStock} ${t.items}`}
                  icon="bi-box-seam"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
          <ShortcutCard
            title={t.customers}
            to="/app/sales/customer"
            icon="bi-people-fill"
            openText={t.open}
          />

          <ShortcutCard
            title={t.suppliers}
            to="/app/purchase/supplier"
            icon="bi-truck"
            openText={t.open}
          />

          <ShortcutCard
            title={t.employees}
            to="/app/hr/employee"
            icon="bi-person-badge-fill"
            openText={t.open}
          />

          <ShortcutCard
            title={t.generalAccounts}
            to="/app/accounts/chart"
            icon="bi-diagram-3-fill"
            openText={t.open}
          />

          <ShortcutCard
            title={t.ledgerSummary}
            to="/app/accounts/ledger-summary"
            icon="bi-journals"
            openText={t.open}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5">
          <div className="px-6 py-5 border-b border-sky-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-extrabold text-slate-800">
                {t.chequeSchedule}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{t.chequeSubtitle}</p>
            </div>
            <Link
              to="/app/accounts/cheques"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-100 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-200"
            >
              {t.viewAll}
              <i className={`bi bi-arrow-${isUrdu ? "left" : "right"}`}></i>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-sky-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.chequeVoucher}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.party}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.issuance}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.clearance}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-left" : "text-right"}`}>{t.remaining}</th>
                  <th className="px-5 py-3 text-center">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">{t.loading}</td></tr>
                ) : chequeVouchers.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">{t.noCheques}</td></tr>
                ) : (
                  chequeVouchers.map((voucher) => {
                    const status = String(voucher.status || "pending").toLowerCase();
                    const statusLabel = status === "cleared" ? t.cleared : status === "partial" ? t.partial : t.remaining;
                    const statusClass = status === "cleared" ? "bg-emerald-100 text-emerald-700" : status === "partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
                    return (
                      <tr key={voucher.id} className="hover:bg-sky-50/50">
                        <td className="px-5 py-4 font-extrabold text-slate-900">
                          <Link to="/app/accounts/cheques" className="hover:text-sky-700">{voucher.voucher_no}</Link>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{voucher.payee_name || "—"}</td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">{formatDate(voucher.issuance_date)}</td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-slate-700">{formatDate(voucher.clearance_date)}</div>
                          <div className={`mt-1 text-[11px] font-bold ${getChequeDueClass(voucher.clearance_date, status)}`}>
                            {getChequeDueText(voucher.clearance_date, status)}
                          </div>
                        </td>
                        <td className={`px-5 py-4 font-mono font-bold text-rose-700 ${isUrdu ? "text-left" : "text-right"}`}>
                          {formatCurrency(voucher.remaining_amount)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-sky-100 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-extrabold text-slate-800">
                  {t.todayTransactions}
                </h2>
              </div>

              <button
                type="button"
                onClick={loadDashboardData}
                className="text-sm text-sky-700 font-semibold hover:underline"
              >
                {t.refresh}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="bg-sky-50 text-slate-600 text-xs font-bold border-b border-sky-100">
                  <th
                    className={`px-5 py-4 ${
                      isUrdu ? "text-right" : "text-left"
                    }`}
                  >
                    {t.id}
                  </th>
                  <th
                    className={`px-5 py-4 ${
                      isUrdu ? "text-right" : "text-left"
                    }`}
                  >
                    {t.type}
                  </th>
                  <th
                    className={`px-5 py-4 ${
                      isUrdu ? "text-right" : "text-left"
                    }`}
                  >
                    {t.party}
                  </th>
                  <th
                    className={`px-5 py-4 ${
                      isUrdu ? "text-right" : "text-left"
                    }`}
                  >
                    {t.date}
                  </th>
                  <th
                    className={`px-5 py-4 ${
                      isUrdu ? "text-left" : "text-right"
                    }`}
                  >
                    {t.amount}
                  </th>
                  <th className="px-5 py-4 text-center">{t.status}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-sky-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                      <p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : todayTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                        <i className="bi bi-inbox text-xl"></i>
                      </div>
                      <p className="font-semibold">{t.noTransactions}</p>
                    </td>
                  </tr>
                ) : (
                  todayTransactions.map((transaction, index) => (
                    <TransactionRow
                      key={`${transaction.typeKey}-${transaction.id}-${index}`}
                      transaction={transaction}
                      isUrdu={isUrdu}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShortcutCard = ({ title, to, icon, openText }) => (
  <Link
    to={to}
    className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:bg-blue-50/50 hover:shadow-md transition"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#4A86F7] flex items-center justify-center">
        <i className={`${icon} text-base`}></i>
      </div>

      <div>
        <div className="font-bold text-slate-950 text-xs">{title}</div>
        <div className="text-[11px] text-[#4A86F7] mt-0.5 font-semibold">
          {openText}
        </div>
      </div>
    </div>

    <i className="bi bi-arrow-right text-slate-400 text-sm"></i>
  </Link>
);

const DropdownSummaryCard = ({ title, value, icon, selected, onChange, t }) => (
  <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shadow-sm">
        <i className={`${icon} text-lg`}></i>
      </div>

      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-sky-100 rounded-xl px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-100"
      >
        <option value="today">{t.today}</option>
        <option value="week">{t.week}</option>
        <option value="month">{t.month}</option>
        <option value="year">{t.year}</option>
        <option value="all">{t.all}</option>
      </select>
    </div>

    <p className="text-xs text-slate-500 mb-2">{title}</p>
    <p className="text-2xl font-extrabold text-slate-950">{value}</p>
  </div>
);

const SummaryCard = ({ title, value, icon }) => (
  <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4">
    <div className="w-10 h-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shadow-sm mb-3">
      <i className={`${icon} text-lg`}></i>
    </div>

    <p className="text-xs text-slate-500 mb-2">{title}</p>
    <p className="text-2xl font-extrabold text-slate-950">{value}</p>
  </div>
);

const TransactionRow = ({ transaction, isUrdu }) => {
  const typeClass = getTypeClass(transaction.typeKey);
  const statusClass = getStatusClass(transaction.status);

  return (
    <tr className="hover:bg-sky-50/60 transition">
      <td className="px-5 py-4 font-bold text-slate-950">
        {transaction.id}
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${typeClass}`}
        >
          {transaction.type}
        </span>
      </td>

      <td className="px-5 py-4 font-semibold text-slate-950">
        {transaction.party}
      </td>

      <td className="px-5 py-4 font-mono text-xs text-slate-700">
        {formatDate(transaction.date)}
      </td>

      <td
        className={`px-5 py-4 font-mono font-bold text-slate-950 ${
          isUrdu ? "text-left" : "text-right"
        }`}
      >
        {formatCurrency(transaction.amount)}
      </td>

      <td className="px-5 py-4 text-center">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}
        >
          {transaction.status}
        </span>
      </td>
    </tr>
  );
};

function getSalesParty(item) {
  return item.customer_name || item.customer || item.customer_name_en || "-";
}

function getSalesReturnParty(item) {
  return item.product_name || item.invoice_ref || "-";
}

function getPurchaseParty(item) {
  return item.supplier_name || item.supplier || "-";
}

function getPurchaseReturnParty(item) {
  return item.supplier_name || item.invoice_no || "-";
}

function getCacheKey(kind, id, text) {
  return `${kind}:${id || "no-id"}:${String(text || "").trim()}`;
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getFirstAmount(item, fields = []) {
  for (const field of fields) {
    if (
      item?.[field] !== undefined &&
      item?.[field] !== null &&
      item?.[field] !== ""
    ) {
      return Number(item[field]) || 0;
    }
  }

  return 0;
}

function sumByDateRange(items, range, dateField, amountFields) {
  return items
    .filter((item) => isInRange(item?.[dateField], range))
    .reduce((sum, item) => sum + getFirstAmount(item, amountFields), 0);
}

function isInRange(dateValue, range) {
  if (range === "all") return true;
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (range === "today") {
    return itemDate.getTime() === startToday.getTime();
  }

  if (range === "week") {
    const startOfWeek = new Date(startToday);
    startOfWeek.setDate(startToday.getDate() - startToday.getDay());
    return itemDate >= startOfWeek && itemDate <= startToday;
  }

  if (range === "month") {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth()
    );
  }

  if (range === "year") {
    return itemDate.getFullYear() === now.getFullYear();
  }

  return true;
}

function isToday(dateValue) {
  return isInRange(dateValue, "today");
}

function formatCurrency(value) {
  return `₨ ${Number(value || 0).toLocaleString("en-PK")}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB");
}

function getTypeClass(type) {
  if (type === "Sale") return "bg-sky-100 text-sky-700";
  if (type === "Sale Return") return "bg-rose-100 text-rose-700";
  if (type === "Purchase") return "bg-emerald-100 text-emerald-700";
  if (type === "Purchase Return") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function getStatusClass(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("complete") || s.includes("paid") || s.includes("مکمل")) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (s.includes("return") || s.includes("واپس")) {
    return "bg-amber-100 text-amber-700";
  }

  if (s.includes("pending") || s.includes("process") || s.includes("زیر")) {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getChequeDays(clearanceDate) {
  if (!clearanceDate) return null;
  const due = new Date(`${String(clearanceDate).slice(0, 10)}T00:00:00`);
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - current) / 86400000);
}

function getChequeDueText(clearanceDate, status) {
  if (status === "cleared") return "";
  const days = getChequeDays(clearanceDate);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

function getChequeDueClass(clearanceDate, status) {
  if (status === "cleared") return "text-emerald-700";
  const days = getChequeDays(clearanceDate);
  if (days === null) return "text-slate-400";
  if (days < 0) return "text-rose-700";
  if (days === 0) return "text-amber-700";
  return "text-sky-700";
}

export default DashboardHome;
