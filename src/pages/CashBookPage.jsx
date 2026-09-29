import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  Edit3,
  Languages,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
)
  .replace(/\/$/, "")
  .replace(/\/api$/i, "");

const API_BASE = `${API_ROOT}/api/cash-book`;

const ACCOUNT_TYPES = [
  {
    value: "customer",
    en: "Customer",
    ur: "کسٹمر",
  },
  {
    value: "general_ledger",
    en: "General Ledger",
    ur: "جنرل لیجر",
  },
  {
    value: "supplier",
    en: "Supplier",
    ur: "سپلائر",
  },
  {
    value: "employee",
    en: "Employee",
    ur: "ملازم",
  },
];

const LANG = {
  en: {
    title: "Cash Book",
    subtitle: "Create and manage cash receive and payment vouchers",
    toggleLang: "اردو",
    addAccount: "Add Account",
    newVoucher: "New Voucher",
    viewSummary: "View Summary",
    hideSummary: "Hide Summary",
    refresh: "Refresh",
    searchPlaceholder:
      "Search voucher no, account, description or date...",
    totalVouchers: "Total Vouchers",
    totalReceive: "Total Receive",
    totalPaid: "Total Paid",
    netBalance: "Net Balance",
    voucherNo: "Voucher No",
    date: "Date",
    notes: "Voucher Notes",
    accountEntries: "Account Entries",
    addRow: "+ Add Row",
    accountType: "Account Type",
    account: "Account",
    description: "Description",
    receive: "Receive",
    paid: "Paid",
    total: "Total",
    grandTotal: "Grand Total",
    save: "Save",
    update: "Update",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    print: "Print",
    delete: "Delete",
    actions: "Actions",
    loading: "Loading...",
    noRecords: "No vouchers found.",
    select: "Select",
    enter: "Enter",
    optional: "Optional",
    deleteConfirm: "Delete this voucher?",
    accountModalTitle: "Add General Ledger Account",
    accountCode: "Account Code",
    accountTitle: "Account Title",
    accountGroup: "Account Group",
    openingBalance: "Opening Balance",
    autoCode: "Leave blank for automatic code",
    saveAccount: "Save Account",
  },

  ur: {
    title: "کیش بک",
    subtitle: "کیش وصولی اور ادائیگی کے واؤچرز بنائیں اور منظم کریں",
    toggleLang: "English",
    addAccount: "اکاؤنٹ شامل کریں",
    newVoucher: "نیا واؤچر",
    viewSummary: "سمری دیکھیں",
    hideSummary: "سمری بند کریں",
    refresh: "ری فریش",
    searchPlaceholder:
      "واؤچر نمبر، اکاؤنٹ، تفصیل یا تاریخ تلاش کریں...",
    totalVouchers: "کل واؤچرز",
    totalReceive: "کل وصولی",
    totalPaid: "کل ادائیگی",
    netBalance: "نیٹ بیلنس",
    voucherNo: "واؤچر نمبر",
    date: "تاریخ",
    notes: "واؤچر نوٹس",
    accountEntries: "اکاؤنٹ اندراجات",
    addRow: "+ لائن شامل کریں",
    accountType: "اکاؤنٹ کی قسم",
    account: "اکاؤنٹ",
    description: "تفصیل",
    receive: "وصولی",
    paid: "ادائیگی",
    total: "ٹوٹل",
    grandTotal: "مجموعی رقم",
    save: "محفوظ کریں",
    update: "اپڈیٹ",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    print: "پرنٹ",
    delete: "حذف",
    actions: "اقدامات",
    loading: "لوڈ ہو رہا ہے...",
    noRecords: "کوئی واؤچر نہیں ملا۔",
    select: "منتخب کریں",
    enter: "درج کریں",
    optional: "اختیاری",
    deleteConfirm: "کیا یہ واؤچر حذف کرنا ہے؟",
    accountModalTitle: "جنرل لیجر اکاؤنٹ شامل کریں",
    accountCode: "اکاؤنٹ کوڈ",
    accountTitle: "اکاؤنٹ ٹائٹل",
    accountGroup: "اکاؤنٹ گروپ",
    openingBalance: "ابتدائی بیلنس",
    autoCode: "خالی چھوڑیں تو کوڈ خود بنے گا",
    saveAccount: "اکاؤنٹ محفوظ کریں",
  },
};

const today = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyRow = () => ({
  local_id: `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`,

  account_type: "customer",
  account_id: "",
  description: "",
  receive: "",
  paid: "",
});

const defaultRows = (count = 6) =>
  Array.from(
    {
      length: count,
    },
    () => emptyRow()
  );

const emptyVoucher = () => ({
  voucher_no: "",
  voucher_date: today(),
  notes: "",
});

const toNum = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const money = (value) =>
  toNum(value).toLocaleString(
    "en-PK",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );

const getList = (
  payload,
  key
) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(payload?.data)
  ) {
    return payload.data;
  }

  if (
    Array.isArray(payload?.[key])
  ) {
    return payload[key];
  }

  if (
    Array.isArray(payload?.rows)
  ) {
    return payload.rows;
  }

  if (
    Array.isArray(payload?.result)
  ) {
    return payload.result;
  }

  return [];
};

const getError = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong.";

const getAccountName = (row) =>
  row?.display_name ||
  row?.account_title ||
  row?.customer_name_en ||
  row?.customer_name ||
  row?.supplier_name ||
  row?.full_name ||
  row?.name ||
  "-";

const formatDate = (value) => {
  const raw = String(
    value || ""
  ).slice(0, 10);

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  return match
    ? `${match[3]}/${match[2]}/${match[1]}`
    : raw || "-";
};

export default function CashBookPage() {
  const [lang, setLang] =
    useState("en");

  const t = LANG[lang];

  const isUrdu =
    lang === "ur";

  const dir =
    isUrdu ? "rtl" : "ltr";

  const toastTimer =
    useRef(null);

  const [
    showSummary,
    setShowSummary,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    showAccountModal,
    setShowAccountModal,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    accountTargetRow,
    setAccountTargetRow,
  ] = useState(null);

  const [voucher, setVoucher] =
    useState(emptyVoucher());

  const [rows, setRows] =
    useState(defaultRows());

  const [records, setRecords] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [lookups, setLookups] =
    useState({
      customer: [],
      general_ledger: [],
      supplier: [],
      employee: [],
      groups: [],
    });

  const [
    accountForm,
    setAccountForm,
  ] = useState({
    account_code: "",
    account_title: "",
    group_id: "",
    opening_balance: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    accountSaving,
    setAccountSaving,
  ] = useState(false);

  const [message, setMessage] =
    useState({
      type: "",
      text: "",
    });

  const toast = useCallback(
    (type, text) => {
      setMessage({
        type,
        text,
      });

      window.clearTimeout(
        toastTimer.current
      );

      toastTimer.current =
        window.setTimeout(() => {
          setMessage({
            type: "",
            text: "",
          });
        }, 2800);
    },
    []
  );

  useEffect(
    () => () => {
      window.clearTimeout(
        toastTimer.current
      );
    },
    []
  );

  const fetchLookups =
    useCallback(async () => {
      const response =
        await axios.get(
          `${API_BASE}/lookups`
        );

      const data =
        response.data?.data ||
        response.data ||
        {};

      setLookups({
        customer: getList(
          data.customers,
          "customers"
        ),

        general_ledger: getList(
          data.general_ledgers,
          "general_ledgers"
        ),

        supplier: getList(
          data.suppliers,
          "suppliers"
        ),

        employee: getList(
          data.employees,
          "employees"
        ),

        groups: getList(
          data.groups,
          "groups"
        ),
      });
    }, []);

  const fetchRecords =
    useCallback(async () => {
      const response =
        await axios.get(
          `${API_BASE}/vouchers`
        );

      setRecords(
        getList(
          response.data,
          "vouchers"
        )
      );
    }, []);

  const fetchNextNumber =
    useCallback(async () => {
      const response =
        await axios.get(
          `${API_BASE}/next-number`
        );

      const number =
        response.data?.voucher_no ||
        response.data?.data
          ?.voucher_no ||
        "";

      setVoucher(
        (current) => ({
          ...current,

          voucher_no:
            number,
        })
      );
    }, []);

  const loadPage =
    useCallback(async () => {
      setLoading(true);

      try {
        await Promise.all([
          fetchLookups(),
          fetchRecords(),
        ]);
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      } finally {
        setLoading(false);
      }
    }, [
      fetchLookups,
      fetchRecords,
      toast,
    ]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const optionsFor = (type) =>
    lookups[type] || [];

  const totals = useMemo(
    () => ({
      receive: rows.reduce(
        (sum, row) =>
          sum +
          toNum(row.receive),
        0
      ),

      paid: rows.reduce(
        (sum, row) =>
          sum +
          toNum(row.paid),
        0
      ),
    }),
    [rows]
  );

  const summary = useMemo(
    () => {
      const receive =
        records.reduce(
          (sum, row) =>
            sum +
            toNum(
              row.total_receive
            ),
          0
        );

      const paid =
        records.reduce(
          (sum, row) =>
            sum +
            toNum(
              row.total_paid
            ),
          0
        );

      return {
        totalVouchers:
          records.length,

        totalReceive:
          receive,

        totalPaid:
          paid,

        netBalance:
          receive - paid,
      };
    },
    [records]
  );

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return records;
      }

      return records.filter(
        (record) =>
          [
            record.voucher_no,
            record.voucher_date,
            record.notes,
            record.account_names,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      records,
      search,
    ]);

  const resetVoucher = () => {
    setEditingId(null);

    setVoucher(
      emptyVoucher()
    );

    setRows(
      defaultRows()
    );
  };

  const openAdd = async () => {
    resetVoucher();

    setShowForm(true);

    try {
      await fetchNextNumber();
    } catch (error) {
      toast(
        "error",
        getError(error)
      );
    }
  };

  const openEdit =
    async (id) => {
      try {
        const response =
          await axios.get(
            `${API_BASE}/vouchers/${id}`
          );

        const record =
          response.data?.data ||
          response.data?.voucher ||
          response.data;

        setEditingId(
          record.id
        );

        setVoucher({
          voucher_no:
            record.voucher_no ||
            "",

          voucher_date:
            String(
              record.voucher_date ||
                ""
            ).slice(0, 10) ||
            today(),

          notes:
            record.notes || "",
        });

        const loadedRows =
          (
            record.items || []
          ).map((item) => ({
            local_id: `${item.id}-${Math.random()
              .toString(16)
              .slice(2)}`,

            account_type:
              item.account_type ||
              "customer",

            account_id:
              String(
                item.account_id ||
                  ""
              ),

            description:
              item.description ||
              "",

            receive:
              toNum(
                item.receive
              ) > 0
                ? String(
                    item.receive
                  )
                : "",

            paid:
              toNum(
                item.paid
              ) > 0
                ? String(
                    item.paid
                  )
                : "",
          }));

        setRows(
          loadedRows.length
            ? loadedRows
            : defaultRows()
        );

        setShowForm(true);
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      }
    };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);

    resetVoucher();
  };

  const updateRow = (
    localId,
    field,
    value
  ) => {
    setRows((current) =>
      current.map((row) => {
        if (
          row.local_id !==
          localId
        ) {
          return row;
        }

        const next = {
          ...row,
          [field]: value,
        };

        if (
          field ===
          "account_type"
        ) {
          next.account_id = "";
          next.description = "";
        }

        if (
          field ===
          "account_id"
        ) {
          const selected =
            optionsFor(
              row.account_type
            ).find(
              (item) =>
                String(item.id) ===
                String(value)
            );

          if (
            selected &&
            !row.description.trim()
          ) {
            next.description =
              getAccountName(
                selected
              );
          }
        }

        if (
          field === "receive" &&
          toNum(value) > 0
        ) {
          next.paid = "";
        }

        if (
          field === "paid" &&
          toNum(value) > 0
        ) {
          next.receive = "";
        }

        return next;
      })
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      emptyRow(),
    ]);
  };

  const removeRow = (
    localId
  ) => {
    setRows((current) => {
      const next =
        current.filter(
          (row) =>
            row.local_id !==
            localId
        );

      return next.length
        ? next
        : [emptyRow()];
    });
  };

  const prepareItems = () =>
    rows
      .map((row) => ({
        account_type:
          row.account_type,

        account_id:
          row.account_id,

        description:
          row.description.trim(),

        receive:
          toNum(row.receive),

        paid:
          toNum(row.paid),
      }))
      .filter(
        (row) =>
          row.account_id ||
          row.description ||
          row.receive > 0 ||
          row.paid > 0
      );

  const validateVoucher = () => {
    if (
      !voucher.voucher_no.trim()
    ) {
      return "Voucher number is required.";
    }

    if (
      !voucher.voucher_date
    ) {
      return "Date is required.";
    }

    const items =
      prepareItems();

    if (!items.length) {
      return "Add at least one valid account row.";
    }

    for (
      const [
        index,
        item,
      ] of items.entries()
    ) {
      if (
        !item.account_type ||
        !item.account_id
      ) {
        return `Select account type and account in row ${
          index + 1
        }.`;
      }

      if (
        item.receive <= 0 &&
        item.paid <= 0
      ) {
        return `Enter Receive or Paid amount in row ${
          index + 1
        }.`;
      }

      if (
        item.receive > 0 &&
        item.paid > 0
      ) {
        return `Receive and Paid cannot both be entered in row ${
          index + 1
        }.`;
      }
    }

    return "";
  };

  const saveVoucher =
    async () => {
      const validation =
        validateVoucher();

      if (validation) {
        toast(
          "error",
          validation
        );

        return;
      }

      setSaving(true);

      try {
        const payload = {
          ...voucher,

          items:
            prepareItems(),
        };

        if (editingId) {
          await axios.put(
            `${API_BASE}/vouchers/${editingId}`,
            payload
          );

          toast(
            "success",
            "Voucher updated successfully."
          );
        } else {
          await axios.post(
            `${API_BASE}/vouchers`,
            payload
          );

          toast(
            "success",
            "Voucher saved successfully."
          );
        }

        setShowForm(false);

        resetVoucher();

        await fetchRecords();
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      } finally {
        setSaving(false);
      }
    };

  const deleteVoucher =
    async (id) => {
      if (
        !window.confirm(
          t.deleteConfirm
        )
      ) {
        return;
      }

      try {
        await axios.delete(
          `${API_BASE}/vouchers/${id}`
        );

        toast(
          "success",
          "Voucher deleted successfully."
        );

        await fetchRecords();
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      }
    };

  const openAccountModal = (
    rowId = null
  ) => {
    setAccountTargetRow(
      rowId
    );

    setAccountForm({
      account_code: "",
      account_title: "",
      group_id: "",
      opening_balance: "",
    });

    setShowAccountModal(true);
  };

  const closeAccountModal =
    () => {
      if (accountSaving) {
        return;
      }

      setShowAccountModal(false);

      setAccountTargetRow(null);
    };

  const saveAccount =
    async () => {
      if (
        !accountForm.account_title.trim()
      ) {
        toast(
          "error",
          "Account title is required."
        );

        return;
      }

      setAccountSaving(true);

      try {
        const response =
          await axios.post(
            `${API_BASE}/accounts`,
            accountForm
          );

        const account =
          response.data?.data ||
          response.data?.account ||
          response.data;

        setLookups(
          (current) => ({
            ...current,

            general_ledger: [
              account,

              ...current.general_ledger.filter(
                (row) =>
                  String(row.id) !==
                  String(
                    account.id
                  )
              ),
            ],
          })
        );

        if (
          accountTargetRow
        ) {
          setRows((current) =>
            current.map((row) =>
              row.local_id ===
              accountTargetRow
                ? {
                    ...row,

                    account_type:
                      "general_ledger",

                    account_id:
                      String(
                        account.id
                      ),

                    description:
                      row.description ||
                      getAccountName(
                        account
                      ),
                  }
                : row
            )
          );
        }

        setShowAccountModal(false);

        setAccountTargetRow(null);

        toast(
          "success",
          "Account added and dropdown refreshed."
        );
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      } finally {
        setAccountSaving(false);
      }
    };

  const printVoucher =
    async (id) => {
      try {
        const response =
          await axios.get(
            `${API_BASE}/vouchers/${id}`
          );

        const record =
          response.data?.data ||
          response.data?.voucher ||
          response.data;

        const rowsHtml =
          (
            record.items || []
          )
            .map(
              (
                item,
                index
              ) => `
                <tr>
                  <td>
                    ${index + 1}
                  </td>

                  <td>
                    ${
                      item.account_type_label ||
                      item.account_type
                    }
                  </td>

                  <td>
                    ${
                      item.account_name ||
                      "-"
                    }
                  </td>

                  <td>
                    ${
                      item.description ||
                      "-"
                    }
                  </td>

                  <td>
                    ${
                      toNum(
                        item.receive
                      ) > 0
                        ? money(
                            item.receive
                          )
                        : "-"
                    }
                  </td>

                  <td>
                    ${
                      toNum(
                        item.paid
                      ) > 0
                        ? money(
                            item.paid
                          )
                        : "-"
                    }
                  </td>
                </tr>
              `
            )
            .join("");

        const popup =
          window.open(
            "",
            "_blank",
            "width=1100,height=800"
          );

        if (!popup) {
          throw new Error(
            "Please allow pop-ups for printing."
          );
        }

        popup.document.write(`
          <!doctype html>

          <html>
            <head>
              <title>
                ${record.voucher_no}
              </title>

              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 28px;
                  color: #172033;
                }

                h1 {
                  text-align: center;
                }

                .meta {
                  display: flex;
                  justify-content: space-between;
                  margin: 24px 0;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                }

                th,
                td {
                  border: 1px solid #d5dae3;
                  padding: 10px;
                  text-align: left;
                }

                th {
                  background: #111827;
                  color: white;
                }

                .totals {
                  display: flex;
                  justify-content: flex-end;
                  gap: 30px;
                  margin-top: 18px;
                  font-weight: bold;
                }
              </style>
            </head>

            <body>
              <h1>
                Cash Book Voucher
              </h1>

              <div class="meta">
                <strong>
                  Voucher No:
                  ${record.voucher_no}
                </strong>

                <strong>
                  Date:
                  ${formatDate(
                    record.voucher_date
                  )}
                </strong>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>
                      Account Type
                    </th>
                    <th>
                      Account
                    </th>
                    <th>
                      Description
                    </th>
                    <th>
                      Receive
                    </th>
                    <th>
                      Paid
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div class="totals">
                <span>
                  Total Receive:
                  Rs ${money(
                    record.total_receive
                  )}
                </span>

                <span>
                  Total Paid:
                  Rs ${money(
                    record.total_paid
                  )}
                </span>
              </div>

              <script>
                window.onload = () =>
                  setTimeout(
                    () => window.print(),
                    300
                  );
              </script>
            </body>
          </html>
        `);

        popup.document.close();
      } catch (error) {
        toast(
          "error",
          getError(error)
        );
      }
    };

  return (
    <div
      dir={dir}
      className="invoice-page"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        .invoice-page {
          min-height: 100vh;
          padding: 18px;
          overflow-x: hidden;
          color: #0f172a;
          background:
            linear-gradient(
              135deg,
              #f8fafc,
              #EFF6FF
            );
          font-family:
            ${
              isUrdu
                ? "'Noto Nastaliq Urdu', serif"
                : "Arial, sans-serif"
            };
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform:
              translateY(-12px)
              scale(.985);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes pop {
          from {
            opacity: 0;
            transform:
              translateY(10px)
              scale(.97);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        .page-wrap {
          width: 100%;
          max-width: 1220px;
          margin: 0 auto;
        }

        .form-page-wrap {
          width: 100%;
          max-width: 1220px;
          margin: 0 auto;
          animation:
            fadeSlide
            .22s ease-out both;
        }

        .top-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 20px 22px;
          border: 1px solid #D6E0EE;
          border-radius: 22px;
          background:
            rgba(
              255,
              255,
              255,
              .94
            );
          box-shadow:
            0 18px 48px
            rgba(
              15,
              23,
              42,
              .08
            );
        }

        .title {
          margin: 0;
          font-size: 30px;
          font-weight: 950;
          letter-spacing: -.8px;
        }

        .subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #0f172a;
          font-weight: 800;
          cursor: pointer;
          transition: .12s;
        }

        .btn:hover {
          background: #f8fafc;
        }

        .btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .btn-primary,
        .btn-soft {
          border:
            1px solid #cbd5e1;
          background: white;
          color: #0f172a;
        }

        .btn-active {
          border:
            1px solid #94a3b8;
          background: #f8fafc;
          color: #0f172a;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 10px;
          margin: 14px 0;
          animation:
            fadeSlide
            .24s ease-out both;
        }

        .summary-card {
          padding: 14px;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 8px 22px
            rgba(
              15,
              23,
              42,
              .05
            );
          animation:
            pop
            .22s ease-out both;
        }

        .summary-card small {
          display: block;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .summary-card b {
          display: block;
          margin-top: 7px;
          font-family: monospace;
          font-size: 18px;
          font-weight: 950;
        }

        .toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin: 14px 0 12px;
        }

        .search-wrap {
          position: relative;
          width:
            min(430px, 100%);
        }

        .search-icon {
          position: absolute;
          top: 12px;
          left: 13px;
          color: #94a3b8;
        }

        .search {
          width: 100%;
          height: 40px;
          padding: 0 13px 0 38px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          outline: none;
          background: white;
          font-size: 13px;
        }

        .search:focus {
          border-color: #0B4E9B;
          box-shadow:
            0 0 0 3px
            rgba(
              79,
              70,
              229,
              .10
            );
        }

        .card {
          overflow: hidden;
          border: 1px solid #D6E0EE;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 8px 24px
            rgba(
              15,
              23,
              42,
              .05
            );
        }

        .table-wrap {
          overflow-x: auto;
        }

        table.list {
          width: 100%;
          min-width: 850px;
          table-layout: fixed;
          border-collapse: collapse;
        }

        table.list th {
          padding: 12px 9px;
          background: #111827;
          color:
            rgba(
              255,
              255,
              255,
              .78
            );
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        table.list td {
          padding: 12px 9px;
          border-bottom:
            1px solid #eef2f7;
          font-size: 13px;
        }

        table.list tr:hover td {
          background: #f8fafc;
        }

        .toast {
          position: fixed;
          ${
            isUrdu
              ? "left"
              : "right"
          }: 18px;
          bottom: 18px;
          z-index: 120;
          padding: 12px 16px;
          border-radius: 14px;
          color: white;
          font-weight: 900;
          box-shadow:
            0 20px 50px
            rgba(
              15,
              23,
              42,
              .25
            );
        }

        .fullPageInputBox {
          width: 100%;
          max-width: 100%;
          min-height:
            calc(100vh - 36px);
          overflow: hidden;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          background: #f8fafc;
          box-shadow:
            0 30px 90px
            rgba(
              15,
              23,
              42,
              .18
            );
        }

        .inputModalTitle {
          height: 54px;
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          padding: 0 18px;
          background:
            linear-gradient(
              135deg,
              #0f172a,
              #1e293b
            );
          color: white;
          font-size: 17px;
          font-weight: 900;
        }

        .cancelTopBtn {
          height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              .25
            );
          border-radius: 10px;
          background:
            rgba(
              255,
              255,
              255,
              .08
            );
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .inputModalBody {
          overflow-x: hidden;
          padding: 14px;
          background: #f3f6fb;
        }

        .formTopLine {
          display: grid;
          grid-template-columns:
            180px
            180px
            minmax(260px, 1fr);
          align-items: end;
          gap: 10px;
          margin-bottom: 10px;
        }

        .basicLabel {
          display: block;
          margin-bottom: 5px;
          color: #334155;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .35px;
        }

        .basicInput,
        .basicSelect,
        .productInput {
          width: 100%;
          height: 34px;
          padding: 5px 9px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          outline: none;
          background: white;
          color: #0f172a;
          font-size: 13px;
          font-weight: 650;
        }

        .basicInput:focus,
        .basicSelect:focus,
        .productInput:focus {
          border-color: #0B4E9B;
          box-shadow:
            0 0 0 3px
            rgba(
              79,
              70,
              229,
              .10
            );
        }

        .sectionHead {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          margin-top: 12px;
          padding: 0 12px;
          border: 1px solid #cbd5e1;
          border-radius:
            14px 14px 0 0;
          background:
            linear-gradient(
              135deg,
              #EFF6FF,
              #f8fafc
            );
          color: #0f172a;
          font-weight: 950;
        }

        .basicBtn {
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 5px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #0f172a;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .basicBtn:hover {
          background: #f8fafc;
        }

        .basicBtn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .paymentPanel {
          overflow: auto;
          padding: 8px;
          border: 1px solid #cbd5e1;
          border-top: none;
          border-radius:
            0 0 14px 14px;
          background: white;
        }

        .basicProductTable {
          width: 100%;
          min-width: 1000px;
          table-layout: fixed;
          border-collapse: collapse;
          background: white;
        }

        .basicProductTable th,
        .basicProductTable td {
          padding: 5px;
          border: 1px solid #D6E0EE;
          font-size: 12px;
        }

        .basicProductTable th {
          background: #e2e8f0;
          color: #334155;
          text-align: center;
          font-weight: 900;
        }

        .accountSelectWrap {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 5px;
        }

        .miniAdd {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: white;
          color: #0f172a;
          cursor: pointer;
        }

        .receiveInput {
          color: #047857;
          text-align: right;
          font-weight: 900;
        }

        .paidInput {
          color: #dc2626;
          text-align: right;
          font-weight: 900;
        }

        .rowDelete {
          width: 24px;
          height: 26px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
          color: #0f172a;
          font-weight: 900;
          cursor: pointer;
        }

        .finalTotalBar {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
        }

        .totalBox {
          padding: 10px 12px;
          border: 1px solid #D6E0EE;
          border-radius: 14px;
          background: #f8fafc;
        }

        .totalBox label {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .totalBox b {
          display: block;
          text-align:
            ${
              isUrdu
                ? "left"
                : "right"
            };
          font-family: monospace;
          font-size: 18px;
        }

        .grandBox {
          border-color: #DBEAFE;
          background: #EFF6FF;
          color: #285DB8;
        }

        .modalFooterBasic {
          position: sticky;
          bottom: 0;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 0 0;
          background:
            linear-gradient(
              180deg,
              rgba(
                248,
                250,
                252,
                0
              ),
              #eef2f7 35%
            );
        }

        .accountModalBack {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: auto;
          padding: 12px;
          background:
            rgba(
              15,
              23,
              42,
              .45
            );
          backdrop-filter: blur(6px);
        }

        .accountModalBox {
          width:
            min(680px, 100%);
          overflow: hidden;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          background: #f8fafc;
          box-shadow:
            0 30px 90px
            rgba(
              15,
              23,
              42,
              .28
            );
          animation:
            fadeSlide
            .22s ease-out both;
        }

        .accountModalHead {
          height: 54px;
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          padding: 0 18px;
          background:
            linear-gradient(
              135deg,
              #0f172a,
              #1e293b
            );
          color: white;
        }

        .accountGrid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 10px;
        }

        .full {
          grid-column: 1 / -1;
        }

        @media (
          max-width: 900px
        ) {
          .summary-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .formTopLine {
            grid-template-columns:
              1fr 1fr;
          }

          .finalTotalBar {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .invoice-page {
            padding: 10px;
          }

          .summary-grid,
          .formTopLine,
          .accountGrid {
            grid-template-columns:
              1fr;
          }

          .title {
            font-size: 24px;
          }

          .full {
            grid-column: auto;
          }

          .inputModalBody {
            padding: 10px;
          }

          .fullPageInputBox {
            min-height:
              calc(100vh - 20px);
          }
        }
      `}</style>

      {message.text && (
        <div
          className="toast"
          style={{
            background:
              message.type ===
              "error"
                ? "#dc2626"
                : "#16a34a",
          }}
        >
          {message.text}
        </div>
      )}

      {!showForm && (
        <div className="page-wrap">
          <div className="top-card">
            <div>
              <h1 className="title">
                {t.title}
              </h1>

              <p className="subtitle">
                {t.subtitle}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",

                flexDirection:
                  isUrdu
                    ? "row-reverse"
                    : "row",
              }}
            >
              <button
                className="btn btn-soft"
                onClick={() =>
                  setLang(
                    isUrdu
                      ? "en"
                      : "ur"
                  )
                }
              >
                <Languages
                  size={15}
                />

                {t.toggleLang}
              </button>

              <button
                className={`btn ${
                  showSummary
                    ? "btn-active"
                    : "btn-soft"
                }`}
                onClick={() =>
                  setShowSummary(
                    (value) =>
                      !value
                  )
                }
              >
                {showSummary
                  ? t.hideSummary
                  : t.viewSummary}
              </button>

              <button
                className="btn btn-soft"
                onClick={loadPage}
              >
                <RefreshCw
                  size={15}
                />

                {loading
                  ? t.loading
                  : t.refresh}
              </button>

              <button
                className="btn btn-soft"
                onClick={() =>
                  openAccountModal()
                }
              >
                <UserPlus
                  size={15}
                />

                {t.addAccount}
              </button>

              <button
                className="btn btn-primary"
                onClick={openAdd}
              >
                <Plus size={15} />

                {t.newVoucher}
              </button>
            </div>
          </div>

          {showSummary && (
            <div className="summary-grid">
              {[
                [
                  t.totalVouchers,
                  summary.totalVouchers,
                ],

                [
                  t.totalReceive,

                  `Rs ${money(
                    summary.totalReceive
                  )}`,
                ],

                [
                  t.totalPaid,

                  `Rs ${money(
                    summary.totalPaid
                  )}`,
                ],

                [
                  t.netBalance,

                  `Rs ${money(
                    summary.netBalance
                  )}`,
                ],
              ].map(
                (
                  [
                    label,
                    value,
                  ],

                  index
                ) => (
                  <div
                    className="summary-card"
                    key={label}
                    style={{
                      animationDelay: `${
                        index * 30
                      }ms`,
                    }}
                  >
                    <small>
                      {label}
                    </small>

                    <b>{value}</b>
                  </div>
                )
              )}
            </div>
          )}

          <div className="toolbar">
            <div className="search-wrap">
              <Search
                size={16}
                className="search-icon"
              />

              <input
                className="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder={
                  t.searchPlaceholder
                }
              />
            </div>
          </div>

          <div className="card table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th
                    style={{
                      width: 45,
                    }}
                  >
                    #
                  </th>

                  <th
                    style={{
                      width: 150,
                    }}
                  >
                    {t.voucherNo}
                  </th>

                  <th
                    style={{
                      width: 145,
                    }}
                  >
                    {t.date}
                  </th>

                  <th
                    style={{
                      width: 140,

                      textAlign:
                        "right",
                    }}
                  >
                    {t.totalReceive}
                  </th>

                  <th
                    style={{
                      width: 140,

                      textAlign:
                        "right",
                    }}
                  >
                    {t.totalPaid}
                  </th>

                  <th
                    style={{
                      width: 80,
                    }}
                  >
                    Lines
                  </th>

                  <th
                    style={{
                      width: 220,
                    }}
                  >
                    {t.actions}
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign:
                          "center",

                        padding: 44,

                        color:
                          "#94a3b8",
                      }}
                    >
                      {t.loading}
                    </td>
                  </tr>
                ) : filteredRecords.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign:
                          "center",

                        padding: 44,

                        color:
                          "#94a3b8",
                      }}
                    >
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(
                    (
                      record,
                      index
                    ) => (
                      <tr
                        key={
                          record.id
                        }
                        onClick={() =>
                          openEdit(
                            record.id
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        <td
                          style={{
                            textAlign:
                              "center",

                            color:
                              "#94a3b8",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            fontFamily:
                              "monospace",

                            fontWeight:
                              900,
                          }}
                        >
                          {
                            record.voucher_no
                          }
                        </td>

                        <td
                          style={{
                            textAlign:
                              "center",

                            fontWeight:
                              800,
                          }}
                        >
                          {formatDate(
                            record.voucher_date
                          )}
                        </td>

                        <td
                          style={{
                            textAlign:
                              "right",

                            fontFamily:
                              "monospace",

                            fontWeight:
                              900,

                            color:
                              "#047857",
                          }}
                        >
                          {money(
                            record.total_receive
                          )}
                        </td>

                        <td
                          style={{
                            textAlign:
                              "right",

                            fontFamily:
                              "monospace",

                            fontWeight:
                              900,

                            color:
                              "#dc2626",
                          }}
                        >
                          {money(
                            record.total_paid
                          )}
                        </td>

                        <td
                          style={{
                            textAlign:
                              "center",
                          }}
                        >
                          {record.items_count ||
                            0}
                        </td>

                        <td>
                          <div
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "center",

                              gap: 6,

                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              className="btn btn-soft"
                              style={{
                                padding:
                                  "6px 10px",
                              }}
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openEdit(
                                  record.id
                                );
                              }}
                            >
                              <Edit3
                                size={
                                  14
                                }
                              />

                              {t.edit}
                            </button>

                            <button
                              className="btn btn-soft"
                              style={{
                                padding:
                                  "6px 10px",
                              }}
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                printVoucher(
                                  record.id
                                );
                              }}
                            >
                              <Printer
                                size={
                                  14
                                }
                              />

                              {t.print}
                            </button>

                            <button
                              className="btn btn-soft"
                              style={{
                                padding:
                                  "6px 10px",
                              }}
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                deleteVoucher(
                                  record.id
                                );
                              }}
                            >
                              <Trash2
                                size={
                                  14
                                }
                              />

                              {t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="page-wrap form-page-wrap">
          <div className="fullPageInputBox">
            <div className="inputModalTitle">
              <span>
                {editingId
                  ? t.update
                  : t.newVoucher}
              </span>

              <button
                className="cancelTopBtn"
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                ← {t.cancel}
              </button>
            </div>

            <div className="inputModalBody">
              <div className="formTopLine">
                <div>
                  <label className="basicLabel">
                    {t.voucherNo}
                  </label>

                  <input
                    className="basicInput"
                    style={{
                      fontFamily:
                        "monospace",

                      fontWeight:
                        900,
                    }}
                    value={
                      voucher.voucher_no
                    }
                    onChange={(
                      event
                    ) =>
                      setVoucher(
                        (current) => ({
                          ...current,

                          voucher_no:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label className="basicLabel">
                    {t.date}
                  </label>

                  <input
                    type="date"
                    className="basicInput"
                    value={
                      voucher.voucher_date
                    }
                    onChange={(
                      event
                    ) =>
                      setVoucher(
                        (current) => ({
                          ...current,

                          voucher_date:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label className="basicLabel">
                    {t.notes}
                  </label>

                  <input
                    className="basicInput"
                    value={
                      voucher.notes
                    }
                    placeholder={
                      t.optional
                    }
                    onChange={(
                      event
                    ) =>
                      setVoucher(
                        (current) => ({
                          ...current,

                          notes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div className="sectionHead">
                <span>
                  {t.accountEntries}
                </span>

                <button
                  className="basicBtn"
                  type="button"
                  onClick={addRow}
                >
                  {t.addRow}
                </button>
              </div>

              <div className="paymentPanel">
                <table className="basicProductTable">
                  <thead>
                    <tr>
                      <th
                        style={{
                          width: 38,
                        }}
                      >
                        #
                      </th>

                      <th
                        style={{
                          width: 170,
                        }}
                      >
                        {t.accountType}
                      </th>

                      <th
                        style={{
                          width: 240,
                        }}
                      >
                        {t.account}
                      </th>

                      <th>
                        {t.description}
                      </th>

                      <th
                        style={{
                          width: 130,
                        }}
                      >
                        {t.receive}
                      </th>

                      <th
                        style={{
                          width: 130,
                        }}
                      >
                        {t.paid}
                      </th>

                      <th
                        style={{
                          width: 42,
                        }}
                      />
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(
                      (
                        row,
                        index
                      ) => (
                        <tr
                          key={
                            row.local_id
                          }
                        >
                          <td
                            style={{
                              textAlign:
                                "center",

                              fontWeight:
                                900,
                            }}
                          >
                            {index + 1}
                          </td>

                          <td>
                            <select
                              className="productInput"
                              value={
                                row.account_type
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  row.local_id,

                                  "account_type",

                                  event
                                    .target
                                    .value
                                )
                              }
                            >
                              {ACCOUNT_TYPES.map(
                                (
                                  type
                                ) => (
                                  <option
                                    key={
                                      type.value
                                    }
                                    value={
                                      type.value
                                    }
                                  >
                                    {isUrdu
                                      ? type.ur
                                      : type.en}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td>
                            <div className="accountSelectWrap">
                              <select
                                className="productInput"
                                value={
                                  row.account_id
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    row.local_id,

                                    "account_id",

                                    event
                                      .target
                                      .value
                                  )
                                }
                              >
                                <option value="">
                                  {t.select}
                                </option>

                                {optionsFor(
                                  row.account_type
                                ).map(
                                  (
                                    account
                                  ) => (
                                    <option
                                      key={
                                        account.id
                                      }
                                      value={
                                        account.id
                                      }
                                    >
                                      {getAccountName(
                                        account
                                      )}
                                    </option>
                                  )
                                )}
                              </select>

                              {row.account_type ===
                                "general_ledger" && (
                                <button
                                  className="miniAdd"
                                  type="button"
                                  onClick={() =>
                                    openAccountModal(
                                      row.local_id
                                    )
                                  }
                                >
                                  <Plus
                                    size={
                                      14
                                    }
                                  />
                                </button>
                              )}
                            </div>
                          </td>

                          <td>
                            <input
                              className="productInput"
                              value={
                                row.description
                              }
                              placeholder={
                                t.enter
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  row.local_id,

                                  "description",

                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="productInput receiveInput"
                              value={
                                row.receive
                              }
                              placeholder={
                                t.enter
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  row.local_id,

                                  "receive",

                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="productInput paidInput"
                              value={
                                row.paid
                              }
                              placeholder={
                                t.enter
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  row.local_id,

                                  "paid",

                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </td>

                          <td
                            style={{
                              textAlign:
                                "center",
                            }}
                          >
                            <button
                              className="rowDelete"
                              type="button"
                              onClick={() =>
                                removeRow(
                                  row.local_id
                                )
                              }
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="sectionHead">
                <span>
                  {t.total}
                </span>
              </div>

              <div className="paymentPanel">
                <div className="finalTotalBar">
                  <div className="totalBox">
                    <label>
                      {t.totalReceive}
                    </label>

                    <b
                      style={{
                        color:
                          "#047857",
                      }}
                    >
                      Rs{" "}
                      {money(
                        totals.receive
                      )}
                    </b>
                  </div>

                  <div className="totalBox">
                    <label>
                      {t.totalPaid}
                    </label>

                    <b
                      style={{
                        color:
                          "#dc2626",
                      }}
                    >
                      Rs{" "}
                      {money(
                        totals.paid
                      )}
                    </b>
                  </div>

                  <div className="totalBox grandBox">
                    <label>
                      {t.grandTotal}
                    </label>

                    <b>
                      Rs{" "}
                      {money(
                        totals.receive -
                          totals.paid
                      )}
                    </b>
                  </div>
                </div>
              </div>

              <div className="modalFooterBasic">
                <button
                  className="basicBtn"
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                >
                  {t.cancel}
                </button>

                <button
                  className="basicBtn"
                  type="button"
                  disabled={saving}
                  onClick={
                    saveVoucher
                  }
                >
                  {saving ? (
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Save
                      size={15}
                    />
                  )}

                  {saving
                    ? t.saving
                    : editingId
                    ? t.update
                    : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          className="accountModalBack"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAccountModal();
            }
          }}
        >
          <div
            className="accountModalBox"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="accountModalHead">
              <strong>
                {
                  t.accountModalTitle
                }
              </strong>

              <button
                type="button"
                className="cancelTopBtn"
                onClick={
                  closeAccountModal
                }
              >
                <X size={17} />
              </button>
            </div>

            <div className="inputModalBody">
              <div className="accountGrid">
                <div>
                  <label className="basicLabel">
                    {
                      t.accountCode
                    }
                  </label>

                  <input
                    className="basicInput"
                    value={
                      accountForm.account_code
                    }
                    placeholder={
                      t.autoCode
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountForm(
                        (current) => ({
                          ...current,

                          account_code:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label className="basicLabel">
                    {
                      t.accountGroup
                    }
                  </label>

                  <select
                    className="basicSelect"
                    value={
                      accountForm.group_id
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountForm(
                        (current) => ({
                          ...current,

                          group_id:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      {t.optional}
                    </option>

                    {lookups.groups.map(
                      (
                        group
                      ) => (
                        <option
                          key={
                            group.id
                          }
                          value={
                            group.id
                          }
                        >
                          {
                            group.group_name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="full">
                  <label className="basicLabel">
                    {t.accountTitle} *
                  </label>

                  <input
                    autoFocus
                    className="basicInput"
                    value={
                      accountForm.account_title
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountForm(
                        (current) => ({
                          ...current,

                          account_title:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div className="full">
                  <label className="basicLabel">
                    {
                      t.openingBalance
                    }
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    className="basicInput"
                    value={
                      accountForm.opening_balance
                    }
                    onChange={(
                      event
                    ) =>
                      setAccountForm(
                        (current) => ({
                          ...current,

                          opening_balance:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div className="modalFooterBasic">
                <button
                  className="basicBtn"
                  type="button"
                  disabled={
                    accountSaving
                  }
                  onClick={
                    closeAccountModal
                  }
                >
                  {t.cancel}
                </button>

                <button
                  className="basicBtn"
                  type="button"
                  disabled={
                    accountSaving
                  }
                  onClick={
                    saveAccount
                  }
                >
                  {accountSaving ? (
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus
                      size={15}
                    />
                  )}

                  {accountSaving
                    ? t.saving
                    : t.saveAccount}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
