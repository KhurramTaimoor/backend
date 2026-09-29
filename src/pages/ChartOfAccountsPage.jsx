import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const API_BASE = `${API_ROOT}/api`;

const LANG = {
  en: {
    title: "General Accounts",
    subtitle: "Manage chart of accounts, opening balances and account transactions",
    addBtn: "New Account",
    searchPlaceholder: "Search by code, account title or group...",
    accountCode: "Account Code",
    accountTitle: "Account Title",
    group: "Group",
    selectGroup: "-- Select Group --",
    openingBalance: "Opening Balance",
    currentBalance: "Current Balance",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    noRecords: "No accounts found.",
    toggleLang: "اردو",
    printBtn: "Print List",
    pdfBtn: "Download PDF",
    reportHeader: "General Accounts List",
    printedOn: "Printed On",
    successSave: "Account saved successfully!",
    successUpdate: "Account updated successfully!",
    successDelete: "Account deleted successfully!",
    errorMsg: "Please fill all required fields (Code, Title, Group).",
    deleteConfirm: "Are you sure you want to delete this account?",
    loadError: "Unable to load account data.",
    transactionLoadError: "Unable to load ledger transactions.",
    transactions: "Transactions",
    transactionDetails: "Account Transactions",
    transactionId: "Transaction ID",
    date: "Date",
    dueDate: "Due Date",
    reference: "Reference",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    amount: "Amount",
    balance: "Balance",
    status: "Status",
    noTransactions: "No transactions found for this account.",
    totalTransactions: "Total Transactions",
    totalDebit: "Total Debit",
    totalCredit: "Total Credit",
    close: "Close",
    refresh: "Refresh",
    loading: "Loading...",
  },

  ur: {
    title: "جنرل اکاؤنٹس",
    subtitle: "چارٹ آف اکاؤنٹس، ابتدائی بیلنس اور اکاؤنٹ ٹرانزیکشنز کا انتظام کریں",
    addBtn: "نیا اکاؤنٹ",
    searchPlaceholder: "کوڈ، اکاؤنٹ ٹائٹل یا گروپ سے تلاش کریں...",
    accountCode: "اکاؤنٹ کوڈ",
    accountTitle: "اکاؤنٹ ٹائٹل",
    group: "گروپ",
    selectGroup: "-- گروپ منتخب کریں --",
    openingBalance: "ابتدائی بیلنس",
    currentBalance: "موجودہ بیلنس",
    save: "محفوظ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",
    noRecords: "کوئی اکاؤنٹ نہیں ملا۔",
    toggleLang: "English",
    printBtn: "فہرست پرنٹ کریں",
    pdfBtn: "پی ڈی ایف ڈاؤنلوڈ",
    reportHeader: "جنرل اکاؤنٹس کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
    successSave: "اکاؤنٹ کامیابی سے محفوظ ہو گیا!",
    successUpdate: "اکاؤنٹ کامیابی سے اپڈیٹ ہو گیا!",
    successDelete: "اکاؤنٹ کامیابی سے حذف ہو گیا!",
    errorMsg: "براہ کرم تمام لازمی خانے پُر کریں (کوڈ، ٹائٹل، گروپ)۔",
    deleteConfirm: "کیا آپ واقعی یہ اکاؤنٹ حذف کرنا چاہتے ہیں؟",
    loadError: "اکاؤنٹس کا ڈیٹا لوڈ نہیں ہو سکا۔",
    transactionLoadError: "لیجر ٹرانزیکشنز لوڈ نہیں ہو سکیں۔",
    transactions: "ٹرانزیکشنز",
    transactionDetails: "اکاؤنٹ ٹرانزیکشنز",
    transactionId: "ٹرانزیکشن آئی ڈی",
    date: "تاریخ",
    dueDate: "آخری تاریخ",
    reference: "ریفرنس",
    description: "تفصیل",
    debit: "ڈیبٹ",
    credit: "کریڈٹ",
    amount: "رقم",
    balance: "بیلنس",
    status: "حالت",
    noTransactions: "اس اکاؤنٹ کی کوئی ٹرانزیکشن نہیں ملی۔",
    totalTransactions: "کل ٹرانزیکشنز",
    totalDebit: "کل ڈیبٹ",
    totalCredit: "کل کریڈٹ",
    close: "بند کریں",
    refresh: "ریفریش",
    loading: "لوڈ ہو رہا ہے...",
  },
};

const emptyForm = {
  account_code: "",
  account_title: "",
  group_id: "",
  opening_balance: "",
};

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return `₨ ${numberValue(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatBalance(value) {
  const amount = numberValue(value);
  if (amount > 0) return `${formatMoney(amount)} Dr`;
  if (amount < 0) return `${formatMoney(Math.abs(amount))} Cr`;
  return "₨ 0";
}

function formatDate(value) {
  if (!value) return "-";

  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB");
}

function normalizeTransaction(row, index) {
  const debit = numberValue(row?.debit);
  const credit = numberValue(row?.credit);

  return {
    ...row,
    transaction_id:
      row?.transaction_id ??
      row?.voucher_id ??
      row?.id ??
      row?.entry_id ??
      row?.journal_id ??
      row?.ref ??
      row?.reference_no ??
      index + 1,

    date:
      row?.transaction_date ??
      row?.date ??
      row?.voucher_date ??
      row?.invoice_date ??
      row?.return_date ??
      row?.created_at ??
      "",

    due_date:
      row?.due_date ??
      row?.payment_due_date ??
      row?.invoice_due_date ??
      row?.expiry_date ??
      "",

    reference:
      row?.reference ??
      row?.reference_no ??
      row?.ref ??
      row?.voucher_no ??
      row?.invoice_no ??
      row?.return_no ??
      "-",

    description:
      row?.description ??
      row?.desc ??
      row?.narration ??
      row?.remarks ??
      row?.memo ??
      "-",

    debit,
    credit,

    amount:
      row?.amount !== undefined
        ? numberValue(row.amount)
        : row?.total_amount !== undefined
        ? numberValue(row.total_amount)
        : debit > 0
        ? debit
        : credit,

    balance:
      row?.balance ??
      row?.running_balance ??
      row?.closing_balance ??
      null,

    status:
      row?.status ??
      row?.payment_status ??
      row?.transaction_status ??
      "-",

    account_id:
      row?.account_id ??
      row?.chart_account_id ??
      row?.chart_of_account_id ??
      row?.coa_id ??
      "",

    account_code:
      row?.account_code ??
      row?.code ??
      "",

    account_title:
      row?.account_title ??
      row?.account_name ??
      row?.ledger_name ??
      "",
  };
}

function transactionBelongsToAccount(transaction, account) {
  const accountId = String(account?.id ?? "");
  const accountCode = String(account?.account_code ?? "").trim().toLowerCase();
  const accountTitle = String(account?.account_title ?? "").trim().toLowerCase();

  const txAccountId = String(transaction?.account_id ?? "");
  const txAccountCode = String(transaction?.account_code ?? "").trim().toLowerCase();
  const txAccountTitle = String(transaction?.account_title ?? "").trim().toLowerCase();

  if (accountId && txAccountId && accountId === txAccountId) return true;
  if (accountCode && txAccountCode && accountCode === txAccountCode) return true;
  if (accountTitle && txAccountTitle && accountTitle === txAccountTitle) return true;

  return false;
}

export default function ChartOfAccountsPage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [records, setRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ledgerRows, setLedgerRows] = useState([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [form, setForm] = useState(emptyForm);

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3200);
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);

      const [accountResponse, groupResponse] =
        await Promise.all([
          axios.get(`${API_BASE}/chart-of-accounts`),
          axios.get(`${API_BASE}/account-groups`),
        ]);

      setRecords(normalizeArray(accountResponse.data));
      setGroups(normalizeArray(groupResponse.data));
    } catch (error) {
      console.error("General accounts load error:", error);
      setRecords([]);
      setGroups([]);
      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.loadError
      );
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError]);

  const loadLedgerRows = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/ledger`);
      const rows = normalizeArray(response.data).map(normalizeTransaction);
      setLedgerRows(rows);
      return rows;
    } catch (error) {
      console.error("General account ledger load error:", error);
      setLedgerRows([]);
      return [];
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadLedgerRows();
  }, [loadAccounts, loadLedgerRows]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);

    setForm({
      account_code: record.account_code || "",
      account_title: record.account_title || "",
      group_id: String(record.group_id || ""),
      opening_balance:
        record.opening_balance !== undefined &&
        record.opening_balance !== null
          ? String(record.opening_balance)
          : "",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (
      !form.account_code.trim() ||
      !form.account_title.trim() ||
      !form.group_id
    ) {
      showToast("error", t.errorMsg);
      return;
    }

    const payload = {
      account_code: form.account_code.trim(),
      account_title: form.account_title.trim(),
      group_id: Number(form.group_id),
      opening_balance: numberValue(form.opening_balance),
    };

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(
          `${API_BASE}/chart-of-accounts/${editingId}`,
          payload
        );
        showToast("success", t.successUpdate);
      } else {
        await axios.post(
          `${API_BASE}/chart-of-accounts`,
          payload
        );
        showToast("success", t.successSave);
      }

      closeForm();
      await loadAccounts();
      await loadLedgerRows();
    } catch (error) {
      console.error("Account save error:", error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.errorMsg
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(`${API_BASE}/chart-of-accounts/${id}`);
      await loadAccounts();
      await loadLedgerRows();
      showToast("success", t.successDelete);
    } catch (error) {
      console.error("Account delete error:", error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Delete failed."
      );
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records;

    return records.filter((record) =>
      [
        record.account_code,
        record.account_title,
        record.group_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [records, search]);

  const accountTransactionMap = useMemo(() => {
    const map = new Map();

    records.forEach((account) => {
      const rows = ledgerRows.filter((transaction) =>
        transactionBelongsToAccount(transaction, account)
      );

      map.set(String(account.id), rows);
    });

    return map;
  }, [records, ledgerRows]);

  const getAccountTransactions = (account) =>
    accountTransactionMap.get(String(account.id)) || [];

  const getCurrentBalance = (account) => {
    const rows = getAccountTransactions(account);

    if (!rows.length) {
      return numberValue(account.opening_balance);
    }

    const latestWithBalance = [...rows]
      .reverse()
      .find(
        (row) =>
          row.balance !== undefined &&
          row.balance !== null &&
          row.balance !== ""
      );

    if (latestWithBalance) {
      return numberValue(latestWithBalance.balance);
    }

    return rows.reduce(
      (balance, row) =>
        balance +
        numberValue(row.debit) -
        numberValue(row.credit),
      numberValue(account.opening_balance)
    );
  };

  const openTransactions = async (account) => {
    setSelectedAccount(account);
    setShowTransactions(true);

    if (ledgerRows.length === 0) {
      try {
        setTransactionLoading(true);
        await loadLedgerRows();
      } finally {
        setTransactionLoading(false);
      }
    }
  };

  const closeTransactions = () => {
    setShowTransactions(false);
    setSelectedAccount(null);
  };

  const selectedTransactions = useMemo(() => {
    if (!selectedAccount) return [];

    return ledgerRows.filter((transaction) =>
      transactionBelongsToAccount(
        transaction,
        selectedAccount
      )
    );
  }, [ledgerRows, selectedAccount]);

  const transactionSummary = useMemo(() => {
    return {
      count: selectedTransactions.length,

      debit: selectedTransactions.reduce(
        (sum, row) => sum + numberValue(row.debit),
        0
      ),

      credit: selectedTransactions.reduce(
        (sum, row) => sum + numberValue(row.credit),
        0
      ),
    };
  }, [selectedTransactions]);

  const generatePrintDocument = (isPdf = false) => {
    const rowsHtml = filtered
      .map(
        (record, index) => `
          <tr>
            <td style="text-align:center">${index + 1}</td>
            <td><strong>${record.account_code || "-"}</strong></td>
            <td>${record.account_title || "-"}</td>
            <td>${record.group_name || "-"}</td>
            <td style="text-align:right">${formatBalance(
              record.opening_balance
            )}</td>
            <td style="text-align:right">${formatBalance(
              getCurrentBalance(record)
            )}</td>
            <td style="text-align:center">${
              getAccountTransactions(record).length
            }</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=850"
    );

    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <title>${t.reportHeader}</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:${isUrdu ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};direction:${dir};line-height:${isUrdu ? "1.9" : "1.45"};color:#0f172a;padding:20px}
          .sheet{max-width:1100px;margin:auto;border:1px solid #D6E0EE}
          .header{background:#0f172a;color:#fff;padding:18px;display:flex;justify-content:space-between}
          h1{margin:0;font-size:22px}
          .sub{margin-top:4px;color:#cbd5e1;font-size:11px}
          .hint{padding:10px;background:#EFF6FF;color:#285DB8;text-align:center}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#0f172a;color:#fff;padding:9px 7px;border:1px solid #334155}
          td{padding:8px 7px;border:1px solid #e2e8f0}
          tbody tr:nth-child(even){background:#f8fafc}
          @media print{
            @page{size:A4 landscape;margin:8mm}
            body{padding:0}
            .hint{display:none}
          }
        </style>
      </head>
      <body>
        ${
          isPdf
            ? `<div class="hint">Select <strong>Save as PDF</strong> in the print destination.</div>`
            : ""
        }

        <div class="sheet">
          <div class="header">
            <div>
              <h1>Ali Cage</h1>
              <div class="sub">${t.reportHeader}</div>
            </div>
            <div>${t.printedOn}: ${new Date().toLocaleString(
      isUrdu ? "ur-PK" : "en-PK"
    )}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${t.accountCode}</th>
                <th>${t.accountTitle}</th>
                <th>${t.group}</th>
                <th>${t.openingBalance}</th>
                <th>${t.currentBalance}</th>
                <th>${t.transactions}</th>
              </tr>
            </thead>
            <tbody>
              ${
                rowsHtml ||
                `<tr><td colspan="7" style="text-align:center">${t.noRecords}</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-3 pb-16 sm:p-4"
      style={{
        fontFamily: isUrdu
          ? "'Noto Nastaliq Urdu', serif"
          : "Inter, Helvetica, Arial, sans-serif",
      }}
    >
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      {isUrdu && (
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      )}

      {message.text && (
        <div
          className={`fixed bottom-5 z-[120] max-w-sm rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-2xl ${
            isUrdu ? "left-5" : "right-5"
          } ${
            message.type === "error"
              ? "bg-rose-600"
              : "bg-emerald-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mx-auto w-full max-w-[1220px]">
        {/* HEADER */}
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-950 sm:text-2xl">
                {t.title}
              </h1>

              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                {t.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setLang((previous) =>
                    previous === "en" ? "ur" : "en"
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
              >
                <i className="bi bi-translate" />
                {t.toggleLang}
              </button>

              <button
                type="button"
                onClick={loadAccounts}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
              >
                <i className="bi bi-arrow-clockwise" />
                {t.refresh}
              </button>

              <button
                type="button"
                onClick={openAdd}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-extrabold text-white transition hover:bg-indigo-700"
              >
                <i className="bi bi-plus-lg" />
                {t.addBtn}
              </button>
            </div>
          </div>
        </section>

        {/* SEARCH + PRINT */}
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <i
                className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                  isUrdu ? "right-3" : "left-3"
                }`}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={t.searchPlaceholder}
                className={`h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${
                  isUrdu
                    ? "pl-3 pr-9 text-right"
                    : "pl-9 pr-3"
                }`}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  generatePrintDocument(false)
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
              >
                <i className="bi bi-printer" />
                {t.printBtn}
              </button>

              <button
                type="button"
                onClick={() =>
                  generatePrintDocument(true)
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
              >
                <i className="bi bi-file-earmark-pdf" />
                {t.pdfBtn}
              </button>
            </div>
          </div>
        </section>

        {/* DESKTOP TABLE */}
        <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-2 py-2.5 text-center text-[9px] font-black uppercase">
                  #
                </th>

                <th className="px-2 py-2.5 text-left text-[9px] font-black uppercase">
                  {t.accountCode}
                </th>

                <th className="px-2 py-2.5 text-left text-[9px] font-black uppercase">
                  {t.accountTitle}
                </th>

                <th className="px-2 py-2.5 text-left text-[9px] font-black uppercase">
                  {t.group}
                </th>

                <th className="px-2 py-2.5 text-right text-[9px] font-black uppercase">
                  {t.openingBalance}
                </th>

                <th className="px-2 py-2.5 text-right text-[9px] font-black uppercase">
                  {t.currentBalance}
                </th>

                <th className="px-2 py-2.5 text-center text-[9px] font-black uppercase">
                  {t.transactions}
                </th>

                <th className="px-2 py-2.5 text-center text-[9px] font-black uppercase">
                  {t.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <i className="bi bi-arrow-repeat animate-spin" />{" "}
                    {t.loading}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => {
                  const transactionCount =
                    getAccountTransactions(record).length;

                  return (
                    <tr
                      key={record.id}
                      className="transition hover:bg-indigo-50/40"
                    >
                      <td className="px-2 py-2.5 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-2 py-2.5">
                        <span className="inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-mono text-[10px] font-black text-indigo-700">
                          {record.account_code || "-"}
                        </span>
                      </td>

                      <td className="px-2 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <i className="bi bi-wallet2" />
                          </div>

                          <div className="truncate font-black text-slate-950">
                            {record.account_title || "-"}
                          </div>
                        </div>
                      </td>

                      <td className="px-2 py-2.5">
                        <span className="inline-flex max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                          {record.group_name || "-"}
                        </span>
                      </td>

                      <td className="px-2 py-2.5 text-right font-mono text-[10px] font-black text-slate-700">
                        {formatBalance(
                          record.opening_balance
                        )}
                      </td>

                      <td className="px-2 py-2.5 text-right font-mono text-[10px] font-black text-indigo-700">
                        {formatBalance(
                          getCurrentBalance(record)
                        )}
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            openTransactions(record)
                          }
                          className="inline-flex min-w-[78px] items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-[9px] font-extrabold text-white transition hover:bg-indigo-700"
                        >
                          <i className="bi bi-receipt" />
                          {transactionCount}
                        </button>
                      </td>

                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(record)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                            title={t.edit}
                          >
                            <i className="bi bi-pencil-square" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(record.id)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                            title={t.delete}
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* MOBILE / TABLET */}
        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden">
          {loading ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              {t.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              {t.noRecords}
            </div>
          ) : (
            filtered.map((record, index) => {
              const transactionCount =
                getAccountTransactions(record).length;

              return (
                <article
                  key={record.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-black text-slate-500">
                          #{index + 1}
                        </span>

                        <span className="rounded-md bg-indigo-50 px-1.5 py-1 font-mono text-[9px] font-black text-indigo-700">
                          {record.account_code || "-"}
                        </span>
                      </div>

                      <h3 className="truncate text-sm font-black text-slate-950">
                        {record.account_title || "-"}
                      </h3>

                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {record.group_name || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openTransactions(record)
                      }
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[9px] font-extrabold text-white"
                    >
                      <i className="bi bi-receipt" />
                      {transactionCount}
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <BalanceCard
                      label={t.openingBalance}
                      value={formatBalance(
                        record.opening_balance
                      )}
                    />

                    <BalanceCard
                      label={t.currentBalance}
                      value={formatBalance(
                        getCurrentBalance(record)
                      )}
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      className="h-8 rounded-lg bg-emerald-50 text-[10px] font-extrabold text-emerald-700"
                    >
                      {t.edit}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(record.id)
                      }
                      className="h-8 rounded-lg bg-rose-50 text-[10px] font-extrabold text-rose-600"
                    >
                      {t.delete}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {/* ACCOUNT FORM */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            dir={dir}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <i className="bi bi-journal-richtext" />
                </div>

                <h2 className="text-base font-black text-slate-950">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <FormField
                label={`${t.accountCode} *`}
              >
                <input
                  value={form.account_code}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      account_code: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </FormField>

              <FormField
                label={`${t.accountTitle} *`}
              >
                <input
                  value={form.account_title}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      account_title: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </FormField>

              <FormField label={`${t.group} *`}>
                <select
                  value={form.group_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      group_id: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">
                    {t.selectGroup}
                  </option>

                  {groups.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.group_name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t.openingBalance}>
                <input
                  type="number"
                  value={form.opening_balance}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      opening_balance:
                        event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="h-9 rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-xs font-extrabold text-indigo-700"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-extrabold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <i
                  className={`bi ${
                    submitting
                      ? "bi-arrow-repeat animate-spin"
                      : "bi-save"
                  }`}
                />
                {submitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS MODAL */}
      {showTransactions && selectedAccount && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTransactions();
            }
          }}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            dir={dir}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950">
                  {t.transactionDetails}
                </h2>

                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {selectedAccount.account_code} ·{" "}
                  {selectedAccount.account_title}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setTransactionLoading(true);

                    try {
                      await loadLedgerRows();
                    } catch {
                      showToast(
                        "error",
                        t.transactionLoadError
                      );
                    } finally {
                      setTransactionLoading(false);
                    }
                  }}
                  disabled={transactionLoading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-extrabold text-indigo-700"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      transactionLoading
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  {t.refresh}
                </button>

                <button
                  type="button"
                  onClick={closeTransactions}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"
                  title={t.close}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            {/* transaction summary */}
            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3 sm:grid-cols-4">
              <TransactionSummary
                label={t.totalTransactions}
                value={transactionSummary.count}
              />

              <TransactionSummary
                label={t.totalDebit}
                value={formatMoney(
                  transactionSummary.debit
                )}
                valueClass="text-emerald-700"
              />

              <TransactionSummary
                label={t.totalCredit}
                value={formatMoney(
                  transactionSummary.credit
                )}
                valueClass="text-rose-700"
              />

              <TransactionSummary
                label={t.currentBalance}
                value={formatBalance(
                  getCurrentBalance(selectedAccount)
                )}
                valueClass="text-indigo-700"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {transactionLoading ? (
                <div className="p-10 text-center text-sm font-bold text-slate-400">
                  {t.loading}
                </div>
              ) : selectedTransactions.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <i className="bi bi-receipt" />
                  </div>

                  <p className="text-xs font-bold text-slate-500">
                    {t.noTransactions}
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block">
                    <table className="w-full table-fixed text-[10px]">
                      <colgroup>
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "9%" }} />
                      </colgroup>

                      <thead className="sticky top-0 bg-slate-900 text-white">
                        <tr>
                          <TransactionHead>
                            {t.transactionId}
                          </TransactionHead>

                          <TransactionHead>
                            {t.date}
                          </TransactionHead>

                          <TransactionHead>
                            {t.dueDate}
                          </TransactionHead>

                          <TransactionHead>
                            {t.reference}
                          </TransactionHead>

                          <TransactionHead>
                            {t.description}
                          </TransactionHead>

                          <TransactionHead align="right">
                            {t.debit}
                          </TransactionHead>

                          <TransactionHead align="right">
                            {t.credit}
                          </TransactionHead>

                          <TransactionHead align="right">
                            {t.amount}
                          </TransactionHead>

                          <TransactionHead align="right">
                            {t.balance}
                          </TransactionHead>

                          <TransactionHead align="center">
                            {t.status}
                          </TransactionHead>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {selectedTransactions.map(
                          (transaction, index) => (
                            <tr
                              key={`${transaction.transaction_id}-${index}`}
                              className="hover:bg-indigo-50/40"
                            >
                              <TransactionCell>
                                <span className="font-mono font-black text-indigo-700">
                                  {transaction.transaction_id}
                                </span>
                              </TransactionCell>

                              <TransactionCell>
                                {formatDate(
                                  transaction.date
                                )}
                              </TransactionCell>

                              <TransactionCell>
                                {formatDate(
                                  transaction.due_date
                                )}
                              </TransactionCell>

                              <TransactionCell>
                                {transaction.reference}
                              </TransactionCell>

                              <TransactionCell>
                                <div className="truncate">
                                  {transaction.description}
                                </div>
                              </TransactionCell>

                              <TransactionCell align="right">
                                <span className="font-mono font-black text-emerald-700">
                                  {transaction.debit > 0
                                    ? formatMoney(
                                        transaction.debit
                                      )
                                    : "-"}
                                </span>
                              </TransactionCell>

                              <TransactionCell align="right">
                                <span className="font-mono font-black text-rose-700">
                                  {transaction.credit > 0
                                    ? formatMoney(
                                        transaction.credit
                                      )
                                    : "-"}
                                </span>
                              </TransactionCell>

                              <TransactionCell align="right">
                                <span className="font-mono font-black text-slate-800">
                                  {formatMoney(
                                    transaction.amount
                                  )}
                                </span>
                              </TransactionCell>

                              <TransactionCell align="right">
                                <span className="font-mono font-black text-indigo-700">
                                  {transaction.balance !==
                                    null
                                    ? formatBalance(
                                        transaction.balance
                                      )
                                    : "-"}
                                </span>
                              </TransactionCell>

                              <TransactionCell align="center">
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[8px] font-extrabold text-slate-600">
                                  {transaction.status || "-"}
                                </span>
                              </TransactionCell>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:hidden">
                    {selectedTransactions.map(
                      (transaction, index) => (
                        <article
                          key={`${transaction.transaction_id}-${index}`}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono text-[10px] font-black text-indigo-700">
                                #
                                {
                                  transaction.transaction_id
                                }
                              </p>

                              <p className="mt-1 text-xs font-black text-slate-950">
                                {transaction.reference}
                              </p>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-600">
                              {transaction.status}
                            </span>
                          </div>

                          <p className="mt-2 text-[10px] text-slate-500">
                            {transaction.description}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <SmallInfo
                              label={t.date}
                              value={formatDate(
                                transaction.date
                              )}
                            />

                            <SmallInfo
                              label={t.dueDate}
                              value={formatDate(
                                transaction.due_date
                              )}
                            />

                            <SmallInfo
                              label={t.amount}
                              value={formatMoney(
                                transaction.amount
                              )}
                            />

                            <SmallInfo
                              label={t.balance}
                              value={
                                transaction.balance !==
                                null
                                  ? formatBalance(
                                      transaction.balance
                                    )
                                  : "-"
                              }
                            />
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={closeTransactions}
                className="h-8 rounded-lg bg-indigo-600 px-4 text-[10px] font-extrabold text-white"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceCard({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[8px] font-extrabold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-mono text-[10px] font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-extrabold text-slate-500">
        {label}
      </label>

      {children}
    </div>
  );
}

function TransactionSummary({
  label,
  value,
  valueClass = "text-slate-950",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[8px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 font-mono text-xs font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function TransactionHead({
  children,
  align = "left",
}) {
  return (
    <th
      className="px-2 py-2.5 text-[8px] font-black uppercase tracking-wide"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function TransactionCell({
  children,
  align = "left",
}) {
  return (
    <td
      className="overflow-hidden px-2 py-2.5 align-middle text-slate-600"
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}

function SmallInfo({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[8px] font-extrabold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-mono text-[9px] font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
