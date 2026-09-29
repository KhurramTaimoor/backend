import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const SALARY_API = `${API_ROOT}/api/employee-rates`;
const EMPLOYEES_API = `${API_ROOT}/api/employees`;

const LANG = {
  en: {
    title: "Employee Salary",
    subtitle:
      "Calculate employee salary, attendance adjustments and advance balance",
    newSalary: "New Salary",
    refresh: "Refresh",
    print: "Print",
    pdf: "PDF",
    toggleLang: "اردو",

    searchPlaceholder: "Search employee, month or status...",
    allMonths: "All Months",
    allStatuses: "All Statuses",

    employee: "Employee",
    selectEmployee: "Select Employee",
    salaryMonth: "Salary Month",
    status: "Status",
    paid: "Paid",
    pending: "Pending",
    notes: "Notes",
    notesPlaceholder: "Optional payroll note...",

    salary: "Salary",
    basicSalary: "Basic Salary",
    perDaySalary: "Per Day Salary",

    extraDay: "Extra Day",
    extraDays: "Extra Days",
    extraDayAmount: "Extra Day Amount",

    absent: "Absent",
    absentDays: "Absent Days",
    absentAmount: "Absent Deduction",

    timeDeduction: "Time Deduction",
    timeDeductionHours: "Time Deduction Hours",
    timeDeductionRate: "Deduction Rate / Hour",
    timeDeductionAmount: "Time Deduction Amount",

    overtime: "Overtime",
    overtimeHours: "Overtime Hours",
    overtimeRate: "Overtime Rate / Hour",
    overtimeAmount: "Overtime Amount",

    calculation: "Salary Calculation",
    calculatedAmount: "Calculated Amount",
    hisaabAmount: "Hisaab Amount",
    advance: "Advance",
    previousAdvance: "Previous Advance",
    totalAdvance: "Total Advance",
    remainingBalance: "Remaining Balance",
    baqayaHisaab: "Baqaya Hisaab",

    inputValue: "Input",
    calculatedValue: "Calculated Amount",
    hours: "Hours",
    days: "Days",

    save: "Save Salary",
    update: "Update Salary",
    saving: "Saving...",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",

    loading: "Loading salary records...",
    noRecords: "No salary records found.",
    noEmployees: "No employees found from backend.",
    loadError: "Could not load salary data from backend.",
    saveError: "Salary could not be saved. Check backend.",
    deleteError: "Salary record could not be deleted.",
    requiredError: "Employee, month and salary are required.",
    successSave: "Salary saved successfully.",
    successUpdate: "Salary updated successfully.",
    successDelete: "Salary deleted successfully.",
    deleteConfirm: "Delete this salary record?",

    totalPayroll: "Total Calculated Salary",
    totalAdvanceCard: "Total Advance",
    totalBalance: "Total Remaining Balance",
    totalRecords: "Salary Records",

    employeeInformation: "Employee Information",
    attendanceCalculation: "Attendance & Time Calculation",
    advanceCalculation: "Advance & Final Balance",
    automaticCalculation: "Automatically calculated",

    formulaOne:
      "Calculated Amount = Salary + Extra Day Amount + Overtime Amount − Absent Amount − Time Deduction Amount",
    formulaTwo:
      "Remaining Balance = Calculated Amount − Advance − Previous Advance",

    reportTitle: "Employee Salary Report",
    printedOn: "Printed On",
  },

  ur: {
    title: "ملازم کی تنخواہ",
    subtitle:
      "ملازم کی تنخواہ، حاضری، کٹوتی اور ایڈوانس کا حساب کریں",
    newSalary: "نئی تنخواہ",
    refresh: "ری فریش",
    print: "پرنٹ",
    pdf: "پی ڈی ایف",
    toggleLang: "English",

    searchPlaceholder: "ملازم، مہینہ یا حالت تلاش کریں...",
    allMonths: "تمام مہینے",
    allStatuses: "تمام حالتیں",

    employee: "ملازم",
    selectEmployee: "ملازم منتخب کریں",
    salaryMonth: "تنخواہ کا مہینہ",
    status: "حالت",
    paid: "ادا شدہ",
    pending: "زیر التواء",
    notes: "نوٹس",
    notesPlaceholder: "اختیاری تنخواہ نوٹ...",

    salary: "تنخواہ",
    basicSalary: "بنیادی تنخواہ",
    perDaySalary: "فی دن تنخواہ",

    extraDay: "اضافی دن",
    extraDays: "اضافی دن",
    extraDayAmount: "اضافی دن کی رقم",

    absent: "غیر حاضر",
    absentDays: "غیر حاضر دن",
    absentAmount: "غیر حاضری کی کٹوتی",

    timeDeduction: "ٹائم کٹوتی",
    timeDeductionHours: "ٹائم کٹوتی کے گھنٹے",
    timeDeductionRate: "فی گھنٹہ کٹوتی ریٹ",
    timeDeductionAmount: "ٹائم کٹوتی کی رقم",

    overtime: "اوور ٹائم",
    overtimeHours: "اوور ٹائم گھنٹے",
    overtimeRate: "فی گھنٹہ اوور ٹائم ریٹ",
    overtimeAmount: "اوور ٹائم رقم",

    calculation: "تنخواہ کا حساب",
    calculatedAmount: "حساب رقم",
    hisaabAmount: "حساب رقم",
    advance: "ایڈوانس",
    previousAdvance: "سابقہ ایڈوانس",
    totalAdvance: "کل ایڈوانس",
    remainingBalance: "بقایا حساب",
    baqayaHisaab: "بقایا حساب",

    inputValue: "ان پٹ",
    calculatedValue: "حساب شدہ رقم",
    hours: "گھنٹے",
    days: "دن",

    save: "تنخواہ محفوظ کریں",
    update: "تنخواہ اپڈیٹ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    actions: "اقدامات",

    loading: "تنخواہ ریکارڈ لوڈ ہو رہے ہیں...",
    noRecords: "تنخواہ کا کوئی ریکارڈ نہیں ملا۔",
    noEmployees: "بیک اینڈ سے کوئی ملازم نہیں ملا۔",
    loadError: "بیک اینڈ سے تنخواہ کا ڈیٹا لوڈ نہیں ہوا۔",
    saveError: "تنخواہ محفوظ نہیں ہوئی، بیک اینڈ چیک کریں۔",
    deleteError: "تنخواہ ریکارڈ حذف نہیں ہوا۔",
    requiredError: "ملازم، مہینہ اور تنخواہ ضروری ہیں۔",
    successSave: "تنخواہ کامیابی سے محفوظ ہو گئی۔",
    successUpdate: "تنخواہ کامیابی سے اپڈیٹ ہو گئی۔",
    successDelete: "تنخواہ کامیابی سے حذف ہو گئی۔",
    deleteConfirm: "کیا یہ تنخواہ ریکارڈ حذف کرنا ہے؟",

    totalPayroll: "کل حساب شدہ تنخواہ",
    totalAdvanceCard: "کل ایڈوانس",
    totalBalance: "کل بقایا حساب",
    totalRecords: "تنخواہ ریکارڈ",

    employeeInformation: "ملازم کی معلومات",
    attendanceCalculation: "حاضری اور وقت کا حساب",
    advanceCalculation: "ایڈوانس اور آخری بقایا",
    automaticCalculation: "خودکار حساب",

    formulaOne:
      "حساب رقم = تنخواہ + اضافی دن کی رقم + اوور ٹائم رقم − غیر حاضری کی رقم − ٹائم کٹوتی کی رقم",
    formulaTwo:
      "بقایا حساب = حساب رقم − ایڈوانس − سابقہ ایڈوانس",

    reportTitle: "ملازم کی تنخواہ رپورٹ",
    printedOn: "پرنٹ کی تاریخ",
  },
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

const emptyForm = () => ({
  employee_id: "",
  salary_month: currentMonth(),
  basic_salary: "",
  extra_days: "0",
  absent_days: "0",
  time_deduction_hours: "0",
  time_deduction_rate: "",
  overtime_hours: "0",
  overtime_rate: "",
  advance: "0",
  previous_advance: "0",
  status: "Pending",
  notes: "",
});

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.employees)) return value.employees;
  if (Array.isArray(value?.salaries)) return value.salaries;
  return [];
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const money = (value) =>
  toNumber(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getEmployeeId = (employee) =>
  employee?.id ??
  employee?.employee_id ??
  employee?.EmployeeID ??
  employee?.value ??
  "";

const getEmployeeName = (employee) =>
  employee?.full_name ??
  employee?.employee_name ??
  employee?.name ??
  employee?.name_en ??
  employee?.title ??
  "";

const getEmployeeBasicSalary = (employee) =>
  toNumber(
    employee?.basic_salary ??
      employee?.salary ??
      employee?.monthly_salary ??
      employee?.current_salary
  );

const getEmployeePreviousAdvance = (employee) =>
  toNumber(
    employee?.previous_advance ??
      employee?.outstanding_advance ??
      employee?.advance_balance ??
      employee?.remaining_advance
  );

const getRecordEmployeeName = (record, employees) => {
  if (record?.employee_name) return record.employee_name;

  const employee = employees.find(
    (item) =>
      String(getEmployeeId(item)) === String(record?.employee_id)
  );

  return getEmployeeName(employee) || "-";
};

const normalizeStatus = (status) =>
  String(status || "Pending").toLowerCase() === "paid"
    ? "Paid"
    : "Pending";

const buildCalculations = (form) => {
  const salary = toNumber(form.basic_salary);
  const perDaySalary = salary / 30;

  const extraDays = toNumber(form.extra_days);
  const absentDays = toNumber(form.absent_days);

  const timeDeductionHours = toNumber(form.time_deduction_hours);
  const timeDeductionRate = toNumber(form.time_deduction_rate);

  const overtimeHours = toNumber(form.overtime_hours);
  const overtimeRate = toNumber(form.overtime_rate);

  const advance = toNumber(form.advance);
  const previousAdvance = toNumber(form.previous_advance);

  const extraDayAmount = extraDays * perDaySalary;
  const absentAmount = absentDays * perDaySalary;
  const timeDeductionAmount =
    timeDeductionHours * timeDeductionRate;
  const overtimeAmount = overtimeHours * overtimeRate;

  const calculatedAmount =
    salary +
    extraDayAmount +
    overtimeAmount -
    absentAmount -
    timeDeductionAmount;

  const totalAdvance = advance + previousAdvance;
  const remainingBalance = calculatedAmount - totalAdvance;

  return {
    salary,
    perDaySalary,
    extraDays,
    extraDayAmount,
    absentDays,
    absentAmount,
    timeDeductionHours,
    timeDeductionRate,
    timeDeductionAmount,
    overtimeHours,
    overtimeRate,
    overtimeAmount,
    advance,
    previousAdvance,
    totalAdvance,
    calculatedAmount,
    remainingBalance,
  };
};

export default function EmployeeRatePage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const calculations = useMemo(
    () => buildCalculations(form),
    [form]
  );

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3200);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [salaryResponse, employeeResponse] = await Promise.all([
        axios.get(SALARY_API),
        axios.get(EMPLOYEES_API),
      ]);

      setRecords(getList(salaryResponse.data));
      setEmployees(getList(employeeResponse.data));
    } catch (error) {
      console.error("Employee salary load error:", error);
      setRecords([]);
      setEmployees([]);
      showToast("error", t.loadError);
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(
      (item) =>
        String(getEmployeeId(item)) === String(employeeId)
    );

    const salary = getEmployeeBasicSalary(employee);
    const perDay = salary / 30;

    setForm((previous) => ({
      ...previous,
      employee_id: employeeId,
      basic_salary: salary ? String(salary) : "",
      overtime_rate: salary
        ? (perDay / 8).toFixed(2)
        : "",
      time_deduction_rate: salary
        ? (perDay / 10).toFixed(2)
        : "",
      previous_advance: String(
        getEmployeePreviousAdvance(employee)
      ),
    }));
  };

  const handleSalaryChange = (salaryValue) => {
    const salary = toNumber(salaryValue);
    const perDay = salary / 30;

    setForm((previous) => ({
      ...previous,
      basic_salary: salaryValue,
      overtime_rate: salary
        ? (perDay / 8).toFixed(2)
        : "",
      time_deduction_rate: salary
        ? (perDay / 10).toFixed(2)
        : "",
    }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (record) => {
    const salary = toNumber(record.basic_salary);
    const perDay = salary / 30;

    setEditingId(record.id);

    setForm({
      employee_id: String(record.employee_id ?? ""),
      salary_month: record.salary_month || currentMonth(),
      basic_salary: String(record.basic_salary ?? ""),
      extra_days: String(record.extra_days ?? 0),
      absent_days: String(
        record.absent_days ?? record.absent ?? 0
      ),
      time_deduction_hours: String(
        record.time_deduction_hours ??
          record.time_deduction ??
          0
      ),
      time_deduction_rate: String(
        record.time_deduction_rate ??
          (salary ? perDay / 10 : "")
      ),
      overtime_hours: String(record.overtime_hours ?? 0),
      overtime_rate: String(
        record.overtime_rate ??
          (salary ? perDay / 8 : "")
      ),
      advance: String(
        record.advance ??
          record.current_advance ??
          0
      ),
      previous_advance: String(
        record.previous_advance ?? 0
      ),
      status: normalizeStatus(record.status),
      notes: record.notes || "",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const buildPayload = () => ({
    employee_id: Number(form.employee_id),
    salary_month: form.salary_month,

    basic_salary: calculations.salary,
    per_day_salary: calculations.perDaySalary,

    extra_days: calculations.extraDays,
    extra_day_amount: calculations.extraDayAmount,

    absent_days: calculations.absentDays,
    absent_amount: calculations.absentAmount,

    time_deduction_hours:
      calculations.timeDeductionHours,
    time_deduction_rate:
      calculations.timeDeductionRate,
    time_deduction_amount:
      calculations.timeDeductionAmount,

    overtime_hours: calculations.overtimeHours,
    overtime_rate: calculations.overtimeRate,
    overtime_amount: calculations.overtimeAmount,

    calculated_amount: calculations.calculatedAmount,

    advance: calculations.advance,
    previous_advance: calculations.previousAdvance,
    total_advance: calculations.totalAdvance,

    remaining_balance: calculations.remainingBalance,

    status: form.status,
    notes: form.notes.trim(),
  });

  const handleSave = async () => {
    if (
      !form.employee_id ||
      !form.salary_month ||
      calculations.salary <= 0
    ) {
      showToast("error", t.requiredError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildPayload();

      if (editingId) {
        await axios.put(
          `${SALARY_API}/${editingId}`,
          payload
        );
        showToast("success", t.successUpdate);
      } else {
        await axios.post(SALARY_API, payload);
        showToast("success", t.successSave);
      }

      await fetchData();
      closeForm();
    } catch (error) {
      console.error("Employee salary save error:", error);
      showToast(
        "error",
        error?.response?.data?.message || t.saveError
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(`${SALARY_API}/${recordId}`);
      await fetchData();
      showToast("success", t.successDelete);
    } catch (error) {
      console.error("Employee salary delete error:", error);
      showToast(
        "error",
        error?.response?.data?.message || t.deleteError
      );
    }
  };

  const availableMonths = useMemo(
    () =>
      [
        ...new Set(
          records
            .map((record) => record.salary_month)
            .filter(Boolean)
        ),
      ]
        .sort()
        .reverse(),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const employeeName = getRecordEmployeeName(
        record,
        employees
      );
      const status = normalizeStatus(record.status);

      const matchesSearch =
        !query ||
        [
          employeeName,
          record.salary_month,
          status,
          record.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesMonth =
        !monthFilter ||
        record.salary_month === monthFilter;

      const matchesStatus =
        !statusFilter ||
        status === statusFilter;

      return (
        matchesSearch &&
        matchesMonth &&
        matchesStatus
      );
    });
  }, [
    records,
    employees,
    search,
    monthFilter,
    statusFilter,
  ]);

  const totals = useMemo(
    () =>
      filteredRecords.reduce(
        (result, record) => {
          result.calculated += toNumber(
            record.calculated_amount ??
              record.hisaab_amount
          );

          result.advance +=
            toNumber(
              record.advance ??
                record.current_advance
            ) +
            toNumber(record.previous_advance);

          result.balance += toNumber(
            record.remaining_balance ??
              record.baqaya_hisaab
          );

          return result;
        },
        {
          calculated: 0,
          advance: 0,
          balance: 0,
        }
      ),
    [filteredRecords]
  );

  const printReport = (saveAsPdf = false) => {
    const rows = filteredRecords
      .map((record, index) => {
        const employeeName = getRecordEmployeeName(
          record,
          employees
        );

        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td><strong>${employeeName}</strong></td>
            <td class="center">${record.salary_month || "-"}</td>
            <td class="money">PKR ${money(record.basic_salary)}</td>
            <td class="center">
              ${money(record.extra_days)} ${t.days}
              <small>PKR ${money(record.extra_day_amount)}</small>
            </td>
            <td class="center">
              ${money(record.absent_days)} ${t.days}
              <small>PKR ${money(
                record.absent_amount ??
                  record.absent_deduction
              )}</small>
            </td>
            <td class="center">
              ${money(
                record.time_deduction_hours
              )} ${t.hours}
              <small>PKR ${money(
                record.time_deduction_amount
              )}</small>
            </td>
            <td class="center">
              ${money(record.overtime_hours)} ${t.hours}
              <small>PKR ${money(record.overtime_amount)}</small>
            </td>
            <td class="money strong">PKR ${money(
              record.calculated_amount ??
                record.hisaab_amount
            )}</td>
            <td class="money">PKR ${money(
              record.advance ??
                record.current_advance
            )}</td>
            <td class="money">PKR ${money(
              record.previous_advance
            )}</td>
            <td class="money strong">PKR ${money(
              record.remaining_balance ??
                record.baqaya_hisaab
            )}</td>
            <td class="center">${normalizeStatus(
              record.status
            )}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=1500,height=900"
    );

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
        <head>
          <meta charset="UTF-8" />
          <title>${t.reportTitle}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              color: #0f172a;
              background: white;
              font-family: Arial, sans-serif;
            }
            .header {
              padding: 18px 20px;
              background: #0f172a;
              color: white;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            h1 { margin: 0; font-size: 24px; }
            .subtitle {
              margin-top: 5px;
              color: #cbd5e1;
              font-size: 12px;
            }
            .meta { font-size: 11px; }
            .pdf-message {
              padding: 10px;
              margin-bottom: 12px;
              background: #ecfeff;
              border: 1px solid #a5f3fc;
              color: #155e75;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            th {
              padding: 8px 5px;
              color: white;
              background: #0e7490;
              border: 1px solid #155e75;
              white-space: nowrap;
            }
            td {
              padding: 7px 5px;
              border: 1px solid #cbd5e1;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .center { text-align: center; }
            .money {
              text-align: right;
              white-space: nowrap;
            }
            .strong {
              color: #0e7490;
              font-weight: bold;
            }
            small {
              display: block;
              margin-top: 3px;
              color: #64748b;
            }
            @media print {
              @page {
                size: A4 landscape;
                margin: 7mm;
              }
              body { padding: 0; }
              .pdf-message { display: none; }
            }
          </style>
        </head>

        <body>
          ${
            saveAsPdf
              ? `<div class="pdf-message">Select <strong>Save as PDF</strong> in print destination.</div>`
              : ""
          }

          <div class="header">
            <div>
              <h1>Ali Cage</h1>
              <div class="subtitle">${t.reportTitle}</div>
            </div>
            <div class="meta">
              ${t.printedOn}: ${new Date().toLocaleString(
      isUrdu ? "ur-PK" : "en-PK"
    )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${t.employee}</th>
                <th>${t.salaryMonth}</th>
                <th>${t.salary}</th>
                <th>${t.extraDay}</th>
                <th>${t.absent}</th>
                <th>${t.timeDeduction}</th>
                <th>${t.overtime}</th>
                <th>${t.calculatedAmount}</th>
                <th>${t.advance}</th>
                <th>${t.previousAdvance}</th>
                <th>${t.remainingBalance}</th>
                <th>${t.status}</th>
              </tr>
            </thead>

            <tbody>
              ${
                rows ||
                `<tr><td colspan="13" class="center">${t.noRecords}</td></tr>`
              }
            </tbody>
          </table>

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

  const getTableValue = (record, keys) => {
    for (const key of keys) {
      if (
        record?.[key] !== undefined &&
        record?.[key] !== null &&
        record?.[key] !== ""
      ) {
        return record[key];
      }
    }

    return 0;
  };

  const calculationInputCards = [
    {
      key: "extra",
      title: t.extraDay,
      icon: "bi-calendar-plus",
      accent: "emerald",
      quantityLabel: t.extraDays,
      quantityField: "extra_days",
      quantityValue: form.extra_days,
      unit: t.days,
      amount: calculations.extraDayAmount,
      rateLabel: null,
      rateField: null,
      rateValue: null,
    },
    {
      key: "absent",
      title: t.absent,
      icon: "bi-calendar-x",
      accent: "red",
      quantityLabel: t.absentDays,
      quantityField: "absent_days",
      quantityValue: form.absent_days,
      unit: t.days,
      amount: calculations.absentAmount,
      rateLabel: null,
      rateField: null,
      rateValue: null,
    },
    {
      key: "deduction",
      title: t.timeDeduction,
      icon: "bi-clock-history",
      accent: "amber",
      quantityLabel: t.timeDeductionHours,
      quantityField: "time_deduction_hours",
      quantityValue: form.time_deduction_hours,
      unit: t.hours,
      amount: calculations.timeDeductionAmount,
      rateLabel: t.timeDeductionRate,
      rateField: "time_deduction_rate",
      rateValue: form.time_deduction_rate,
    },
    {
      key: "overtime",
      title: t.overtime,
      icon: "bi-clock-fill",
      accent: "cyan",
      quantityLabel: t.overtimeHours,
      quantityField: "overtime_hours",
      quantityValue: form.overtime_hours,
      unit: t.hours,
      amount: calculations.overtimeAmount,
      rateLabel: t.overtimeRate,
      rateField: "overtime_rate",
      rateValue: form.overtime_rate,
    },
  ];

  const accentClasses = {
    emerald: {
      header: "bg-emerald-50 border-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      input:
        "border-emerald-200 focus:ring-emerald-500",
      amount: "text-emerald-700",
    },
    red: {
      header: "bg-red-50 border-red-200",
      icon: "bg-red-100 text-red-700",
      input: "border-red-200 focus:ring-red-500",
      amount: "text-red-700",
    },
    amber: {
      header: "bg-amber-50 border-amber-200",
      icon: "bg-amber-100 text-amber-700",
      input:
        "border-amber-200 focus:ring-amber-500",
      amount: "text-amber-700",
    },
    cyan: {
      header: "bg-cyan-50 border-cyan-200",
      icon: "bg-cyan-100 text-cyan-700",
      input: "border-cyan-200 focus:ring-cyan-500",
      amount: "text-cyan-700",
    },
  };

  return (
    <div
      dir={dir}
      className={`min-h-full w-full ${
        isUrdu
          ? "[font-family:'Noto_Nastaliq_Urdu',serif]"
          : "font-sans"
      }`}
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
          className={`fixed bottom-6 z-[80] max-w-md rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${
            isUrdu ? "left-6" : "right-6"
          } ${
            message.type === "error"
              ? "bg-red-600"
              : "bg-emerald-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <i
              className={`bi ${
                message.type === "error"
                  ? "bi-exclamation-triangle"
                  : "bi-check-circle"
              }`}
            />
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
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
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              <i className="bi bi-translate" />
              {t.toggleLang}
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-cyan-800"
            >
              <i className="bi bi-plus-lg" />
              {t.newSalary}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <i className="bi bi-cash-stack text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.totalPayroll}
                </p>
                <p className="truncate text-xl font-bold text-slate-800">
                  PKR {money(totals.calculated)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <i className="bi bi-wallet2 text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.totalAdvanceCard}
                </p>
                <p className="truncate text-xl font-bold text-slate-800">
                  PKR {money(totals.advance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  totals.balance < 0
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <i className="bi bi-calculator text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.totalBalance}
                </p>
                <p
                  className={`truncate text-xl font-bold ${
                    totals.balance < 0
                      ? "text-red-600"
                      : "text-emerald-700"
                  }`}
                >
                  PKR {money(totals.balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <i className="bi bi-receipt text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.totalRecords}
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {filteredRecords.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[260px] flex-1 flex-wrap gap-2">
              <div className="relative min-w-[240px] flex-1">
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
                  className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 ${
                    isUrdu
                      ? "pl-3 pr-9 text-right"
                      : "pl-9 pr-3"
                  }`}
                />
              </div>

              <select
                value={monthFilter}
                onChange={(event) =>
                  setMonthFilter(event.target.value)
                }
                className="min-w-[145px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                <option value="">{t.allMonths}</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="min-w-[145px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                <option value="">{t.allStatuses}</option>
                <option value="Paid">{t.paid}</option>
                <option value="Pending">{t.pending}</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchData}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <i className="bi bi-arrow-clockwise text-cyan-700" />
                {t.refresh}
              </button>

              <button
                type="button"
                disabled={!filteredRecords.length}
                onClick={() => printReport(false)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="bi bi-printer text-cyan-700" />
                {t.print}
              </button>

              <button
                type="button"
                disabled={!filteredRecords.length}
                onClick={() => printReport(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="bi bi-file-earmark-pdf text-red-600" />
                {t.pdf}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1550px] text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-900 text-xs font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-3 text-center">
                    #
                  </th>
                  <th
                    className={`px-3 py-3 ${
                      isUrdu ? "text-right" : "text-left"
                    }`}
                  >
                    {t.employee}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.salaryMonth}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t.salary}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.extraDay}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.absent}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.timeDeduction}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.overtime}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t.calculatedAmount}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t.advance}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t.previousAdvance}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t.remainingBalance}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.status}
                  </th>
                  <th className="px-3 py-3 text-center">
                    {t.actions}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-6 py-14 text-center text-slate-400"
                    >
                      <i className="bi bi-arrow-repeat mr-2" />
                      {t.loading}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-6 py-14 text-center text-slate-400"
                    >
                      <i className="bi bi-inbox mr-2" />
                      {t.noRecords}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => {
                    const employeeName =
                      getRecordEmployeeName(
                        record,
                        employees
                      );

                    const status = normalizeStatus(
                      record.status
                    );

                    const remainingBalance = toNumber(
                      getTableValue(record, [
                        "remaining_balance",
                        "baqaya_hisaab",
                      ])
                    );

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-cyan-50/50"
                      >
                        <td className="px-3 py-3 text-center font-mono text-xs text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-700">
                              {employeeName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="font-bold text-slate-800">
                                {employeeName}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-xs">
                          {record.salary_month || "-"}
                        </td>

                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-700">
                          PKR {money(record.basic_salary)}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <p className="font-bold text-emerald-700">
                            {money(record.extra_days)}{" "}
                            {t.days}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PKR{" "}
                            {money(record.extra_day_amount)}
                          </p>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <p className="font-bold text-red-600">
                            {money(record.absent_days)}{" "}
                            {t.days}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PKR{" "}
                            {money(
                              getTableValue(record, [
                                "absent_amount",
                                "absent_deduction",
                              ])
                            )}
                          </p>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <p className="font-bold text-amber-700">
                            {money(
                              record.time_deduction_hours
                            )}{" "}
                            {t.hours}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PKR{" "}
                            {money(
                              record.time_deduction_amount
                            )}
                          </p>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <p className="font-bold text-cyan-700">
                            {money(record.overtime_hours)}{" "}
                            {t.hours}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PKR{" "}
                            {money(record.overtime_amount)}
                          </p>
                        </td>

                        <td className="bg-cyan-50/60 px-3 py-3 text-right font-mono font-bold text-cyan-800">
                          PKR{" "}
                          {money(
                            getTableValue(record, [
                              "calculated_amount",
                              "hisaab_amount",
                            ])
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-mono text-amber-700">
                          PKR{" "}
                          {money(
                            getTableValue(record, [
                              "advance",
                              "current_advance",
                            ])
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-mono text-violet-700">
                          PKR{" "}
                          {money(record.previous_advance)}
                        </td>

                        <td
                          className={`px-3 py-3 text-right font-mono font-bold ${
                            remainingBalance < 0
                              ? "bg-red-50 text-red-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          PKR {money(remainingBalance)}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              status === "Paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {status === "Paid"
                              ? t.paid
                              : t.pending}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title={t.edit}
                              onClick={() =>
                                openEdit(record)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 transition hover:bg-cyan-200"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>

                            <button
                              type="button"
                              title={t.delete}
                              onClick={() =>
                                handleDelete(record.id)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
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
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            dir={dir}
            className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <i className="bi bi-cash-stack text-xl" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingId
                      ? t.update
                      : t.newSalary}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.formulaOne}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="overflow-y-auto bg-slate-50 p-3 sm:p-5">
              <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <i className="bi bi-person-badge text-cyan-700" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {t.employeeInformation}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.employee} *
                    </label>

                    <select
                      value={form.employee_id}
                      onChange={(event) =>
                        handleEmployeeChange(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    >
                      <option value="">
                        {t.selectEmployee}
                      </option>

                      {employees.map((employee) => (
                        <option
                          key={getEmployeeId(employee)}
                          value={getEmployeeId(employee)}
                        >
                          {getEmployeeName(employee)}
                        </option>
                      ))}
                    </select>

                    {!loading && employees.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        {t.noEmployees}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.salaryMonth} *
                    </label>

                    <input
                      type="month"
                      value={form.salary_month}
                      onChange={(event) =>
                        updateField(
                          "salary_month",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.status}
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    >
                      <option value="Pending">
                        {t.pending}
                      </option>
                      <option value="Paid">{t.paid}</option>
                    </select>
                  </div>

                  <div className="md:col-span-1 xl:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.basicSalary} *
                    </label>

                    <div className="relative">
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 ${
                          isUrdu ? "right-3" : "left-3"
                        }`}
                      >
                        PKR
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.basic_salary}
                        onChange={(event) =>
                          handleSalaryChange(
                            event.target.value
                          )
                        }
                        placeholder="0"
                        className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 ${
                          isUrdu
                            ? "pl-3 pr-14"
                            : "pl-14 pr-3"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-1 xl:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.perDaySalary}
                    </label>

                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-cyan-800">
                      PKR{" "}
                      {money(calculations.perDaySalary)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <i className="bi bi-calendar2-check text-cyan-700" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {t.attendanceCalculation}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {calculationInputCards.map((card) => {
                    const accent =
                      accentClasses[card.accent];

                    return (
                      <article
                        key={card.key}
                        className={`overflow-hidden rounded-xl border ${accent.header}`}
                      >
                        <div className="flex items-center justify-between border-b border-current/10 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent.icon}`}
                            >
                              <i
                                className={`bi ${card.icon}`}
                              />
                            </div>

                            <h4 className="text-sm font-bold text-slate-800">
                              {card.title}
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-3 bg-white p-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                              {card.quantityLabel}
                            </label>

                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={card.quantityValue}
                                onChange={(event) =>
                                  updateField(
                                    card.quantityField,
                                    event.target.value
                                  )
                                }
                                className={`w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 ${accent.input}`}
                              />

                              <span
                                className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 ${
                                  isUrdu
                                    ? "left-3"
                                    : "right-3"
                                }`}
                              >
                                {card.unit}
                              </span>
                            </div>
                          </div>

                          {card.rateField && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                {card.rateLabel}
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={card.rateValue}
                                onChange={(event) =>
                                  updateField(
                                    card.rateField,
                                    event.target.value
                                  )
                                }
                                className={`w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 ${accent.input}`}
                              />
                            </div>
                          )}

                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {t.calculatedValue}
                            </p>
                            <p
                              className={`mt-1 text-lg font-bold ${accent.amount}`}
                            >
                              PKR {money(card.amount)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <i className="bi bi-calculator text-cyan-700" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {t.advanceCalculation}
                  </h3>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.advance}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.advance}
                      onChange={(event) =>
                        updateField(
                          "advance",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {t.previousAdvance}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.previous_advance}
                      onChange={(event) =>
                        updateField(
                          "previous_advance",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 overflow-hidden rounded-xl border-2 border-slate-800 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    {
                      label: t.salary,
                      value: calculations.salary,
                      className:
                        "bg-slate-100 text-slate-800",
                    },
                    {
                      label: t.calculatedAmount,
                      value: calculations.calculatedAmount,
                      className:
                        "bg-cyan-50 text-cyan-800",
                    },
                    {
                      label: t.advance,
                      value: calculations.advance,
                      className:
                        "bg-amber-50 text-amber-800",
                    },
                    {
                      label: t.remainingBalance,
                      value: calculations.remainingBalance,
                      className:
                        calculations.remainingBalance < 0
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700",
                    },
                    {
                      label: t.previousAdvance,
                      value: calculations.previousAdvance,
                      className:
                        "bg-violet-50 text-violet-800",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`border-b border-slate-300 p-3 text-center sm:border-r xl:border-b-0 ${item.className}`}
                    >
                      <p className="text-xs font-bold">
                        {item.label}
                      </p>
                      <p className="mt-2 text-xl font-bold">
                        {money(item.value)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-6 text-cyan-900">
                    <i className="bi bi-calculator mr-2" />
                    {t.formulaOne}
                  </div>

                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-6 text-violet-900">
                    <i className="bi bi-wallet2 mr-2" />
                    {t.formulaTwo}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    {t.notes}
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField(
                        "notes",
                        event.target.value
                      )
                    }
                    placeholder={t.notesPlaceholder}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
              </section>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={submitting}
                onClick={closeForm}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSave}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i
                  className={`bi ${
                    submitting
                      ? "bi-arrow-repeat"
                      : "bi-check2-circle"
                  }`}
                />
                {submitting
                  ? t.saving
                  : editingId
                  ? t.update
                  : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
