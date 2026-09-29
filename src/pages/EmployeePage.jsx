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

/*
  Only one API base is used by this page.

  GET    /api/employees
  POST   /api/employees
  PUT    /api/employees/:id
  DELETE /api/employees/:id
  POST   /api/employees/departments
  POST   /api/employees/designations
*/
const EMPLOYEE_API = `${API_ROOT}/api/employees`;

const LANG = {
  en: {
    title: "Employee Registration",
    subtitle:
      "Manage salaried and contractor employees, departments and designations",
    newEmployee: "New Employee",
    viewSummary: "View Summary",
    hideSummary: "Hide Summary",
    printList: "Print List",
    downloadPdf: "Download PDF",
    refresh: "Refresh",
    toggleLang: "اردو",

    searchPlaceholder:
      "Search by employee, CNIC, phone, type, department or designation...",

    employee: "Employee",
    employeeName: "Employee Name",
    cnic: "CNIC",
    cnicOptional: "CNIC (Optional)",
    phone: "Phone Number",
    employeeType: "Employee Type",
    salaried: "Salaried",
    contractor: "Contractor",
    department: "Department",
    designation: "Designation",
    joiningDate: "Joining Date",
    viewDetails: "View Details",
    ledger: "Ledger",
    call: "Call",
    noPhone: "Phone number not available.",

    selectType: "-- Select Type --",
    selectDepartment: "-- Select Department --",
    selectDesignation: "-- Select Designation --",
    addDepartment: "Add Department",
    addDesignation: "Add Designation",
    departmentName: "Department Name",
    designationName: "Designation Name",

    totalEmployees: "Total Employees",
    salariedEmployees: "Salaried Employees",
    contractorEmployees: "Contractors",

    detailsTitle: "Employee Details",
    addEmployeeTitle: "New Employee",
    editEmployeeTitle: "Edit Employee",
    formSubtitle:
      "Enter employee identity, employment type and job information",

    save: "Save",
    saveEmployee: "Save Employee",
    updateEmployee: "Update Employee",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",

    loading: "Loading employees...",
    noRecords: "No employees found.",
    noDepartments: "No departments found.",
    noDesignations: "No designations found.",

    loadError: "Employee data could not be loaded from backend.",
    requiredError:
      "Employee name, phone, type, department and designation are required.",
    masterRequired: "Name is required.",
    saveError: "Employee could not be saved.",
    masterSaveError: "New option could not be saved.",
    deleteError: "Employee could not be deleted.",

    saved: "Employee saved successfully.",
    updated: "Employee updated successfully.",
    deleted: "Employee deleted successfully.",
    departmentSaved: "Department added successfully.",
    designationSaved: "Designation added successfully.",

    duplicateCnic: "An employee with this CNIC already exists.",
    duplicatePhone: "An employee with this phone number already exists.",
    duplicateMaster: "This option already exists.",
    deleteConfirm:
      "Are you sure you want to delete this employee?",

    reportTitle: "Employee List",
    printedOn: "Printed On",
  },

  ur: {
    title: "ملازمین کی رجسٹریشن",
    subtitle:
      "تنخواہ دار اور کنٹریکٹر ملازمین، محکموں اور عہدوں کا انتظام کریں",
    newEmployee: "نیا ملازم",
    viewSummary: "سمری دیکھیں",
    hideSummary: "سمری بند کریں",
    printList: "فہرست پرنٹ کریں",
    downloadPdf: "پی ڈی ایف ڈاؤنلوڈ",
    refresh: "ری فریش",
    toggleLang: "English",

    searchPlaceholder:
      "ملازم، شناختی کارڈ، فون، قسم، محکمہ یا عہدے سے تلاش کریں...",

    employee: "ملازم",
    employeeName: "ملازم کا نام",
    cnic: "شناختی کارڈ",
    cnicOptional: "شناختی کارڈ (اختیاری)",
    phone: "فون نمبر",
    employeeType: "ملازم کی قسم",
    salaried: "تنخواہ دار",
    contractor: "کنٹریکٹر",
    department: "محکمہ",
    designation: "عہدہ",
    joiningDate: "تاریخ شمولیت",
    viewDetails: "تفصیل دیکھیں",
    ledger: "لیجر",
    call: "کال",
    noPhone: "فون نمبر موجود نہیں ہے۔",

    selectType: "-- قسم منتخب کریں --",
    selectDepartment: "-- محکمہ منتخب کریں --",
    selectDesignation: "-- عہدہ منتخب کریں --",
    addDepartment: "محکمہ شامل کریں",
    addDesignation: "عہدہ شامل کریں",
    departmentName: "محکمے کا نام",
    designationName: "عہدے کا نام",

    totalEmployees: "کل ملازمین",
    salariedEmployees: "تنخواہ دار ملازمین",
    contractorEmployees: "کنٹریکٹر",

    detailsTitle: "ملازم کی مکمل تفصیل",
    addEmployeeTitle: "نیا ملازم",
    editEmployeeTitle: "ملازم میں ترمیم",
    formSubtitle:
      "ملازم کی شناخت، ملازمت کی قسم اور جاب کی معلومات درج کریں",

    save: "محفوظ کریں",
    saveEmployee: "ملازم محفوظ کریں",
    updateEmployee: "ملازم اپڈیٹ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    close: "بند کریں",
    edit: "ترمیم",
    delete: "حذف",

    loading: "ملازمین لوڈ ہو رہے ہیں...",
    noRecords: "کوئی ملازم نہیں ملا۔",
    noDepartments: "کوئی محکمہ نہیں ملا۔",
    noDesignations: "کوئی عہدہ نہیں ملا۔",

    loadError: "بیک اینڈ سے ملازمین کا ڈیٹا لوڈ نہیں ہوا۔",
    requiredError:
      "ملازم کا نام، فون، قسم، محکمہ اور عہدہ ضروری ہیں۔",
    masterRequired: "نام درج کرنا ضروری ہے۔",
    saveError: "ملازم محفوظ نہیں ہوا۔",
    masterSaveError: "نیا آپشن محفوظ نہیں ہوا۔",
    deleteError: "ملازم حذف نہیں ہوا۔",

    saved: "ملازم کامیابی سے محفوظ ہو گیا۔",
    updated: "ملازم کامیابی سے اپڈیٹ ہو گیا۔",
    deleted: "ملازم کامیابی سے حذف ہو گیا۔",
    departmentSaved: "محکمہ کامیابی سے شامل ہو گیا۔",
    designationSaved: "عہدہ کامیابی سے شامل ہو گیا۔",

    duplicateCnic:
      "اس شناختی کارڈ کے ساتھ ملازم پہلے سے موجود ہے۔",
    duplicatePhone:
      "اس فون نمبر کے ساتھ ملازم پہلے سے موجود ہے۔",
    duplicateMaster: "یہ آپشن پہلے سے موجود ہے۔",
    deleteConfirm:
      "کیا آپ واقعی اس ملازم کو حذف کرنا چاہتے ہیں؟",

    reportTitle: "ملازمین کی فہرست",
    printedOn: "پرنٹ کی تاریخ",
  },
};

const emptyForm = () => ({
  full_name: "",
  cnic: "",
  phone: "",
  employee_type: "",
  department_id: "",
  designation_id: "",
  joining_date: "",
});

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.result)) return value.result;
  return [];
};

const getEmployeeId = (record) =>
  record?.id ?? record?.employee_id ?? "";

const getDepartmentId = (record) =>
  record?.id ?? record?.department_id ?? "";

const getDepartmentName = (record) =>
  record?.department_name ??
  record?.name ??
  record?.name_en ??
  "";

const getDesignationId = (record) =>
  record?.id ?? record?.designation_id ?? "";

const getDesignationName = (record) =>
  record?.designation_name ??
  record?.designation ??
  record?.name ??
  "";

const normalizeDate = (value) =>
  value ? String(value).slice(0, 10) : "";

const normalizeType = (value) =>
  String(value || "").toLowerCase() === "contractor"
    ? "Contractor"
    : "Salaried";

export default function EmployeePage() {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [detailRecord, setDetailRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [masterModal, setMasterModal] = useState({
    open: false,
    type: "",
    name: "",
  });
  const [masterSubmitting, setMasterSubmitting] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const departmentMap = useMemo(() => {
    const map = {};

    departments.forEach((department) => {
      map[String(getDepartmentId(department))] =
        getDepartmentName(department);
    });

    return map;
  }, [departments]);

  const designationMap = useMemo(() => {
    const map = {};

    designations.forEach((designation) => {
      map[String(getDesignationId(designation))] =
        getDesignationName(designation);
    });

    return map;
  }, [designations]);

  const employeeDepartment = useCallback(
    (record) =>
      record?.department_name ||
      departmentMap[String(record?.department_id)] ||
      "-",
    [departmentMap]
  );

  const employeeDesignation = useCallback(
    (record) =>
      record?.designation_name ||
      record?.designation ||
      designationMap[String(record?.designation_id)] ||
      "-",
    [designationMap]
  );

  const showToast = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 3200);
  }, []);

  const applyResponseData = useCallback((responseData) => {
    const data = responseData?.data ?? responseData;

    setEmployees(getList(data?.employees));
    setDepartments(getList(data?.departments));
    setDesignations(getList(data?.designations));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get(EMPLOYEE_API);
      applyResponseData(response.data);
    } catch (error) {
      console.error("Employee load error:", error);

      setEmployees([]);
      setDepartments([]);
      setDesignations([]);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.loadError
      );
    } finally {
      setLoading(false);
    }
  }, [applyResponseData, showToast, t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (record) => {
    setEditingId(getEmployeeId(record));

    setForm({
      full_name: record?.full_name || "",
      cnic: record?.cnic || "",
      phone: record?.phone || "",
      employee_type: normalizeType(
        record?.employee_type
      ),
      department_id: String(
        record?.department_id || ""
      ),
      designation_id: String(
        record?.designation_id || ""
      ),
      joining_date: normalizeDate(
        record?.joining_date
      ),
    });

    setShowDetails(false);
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const payload = () => ({
    full_name: form.full_name.trim(),
    cnic: form.cnic.trim() || null,
    phone: form.phone.trim(),
    employee_type: form.employee_type,
    department_id: Number(form.department_id),
    designation_id: Number(form.designation_id),
    joining_date: form.joining_date || null,
  });

  const handleSave = async () => {
    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.employee_type ||
      !form.department_id ||
      !form.designation_id
    ) {
      showToast("error", t.requiredError);
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await axios.put(
          `${EMPLOYEE_API}/${editingId}`,
          payload()
        );
        showToast("success", t.updated);
      } else {
        await axios.post(EMPLOYEE_API, payload());
        showToast("success", t.saved);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await fetchData();
    } catch (error) {
      console.error("Employee save error:", error);

      const code =
        error?.response?.data?.code || "";

      let text =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t.saveError;

      if (code === "DUPLICATE_CNIC") {
        text = t.duplicateCnic;
      } else if (code === "DUPLICATE_PHONE") {
        text = t.duplicatePhone;
      }

      showToast("error", text);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await axios.delete(
        `${EMPLOYEE_API}/${recordId}`
      );

      setShowDetails(false);
      setDetailRecord(null);
      await fetchData();
      showToast("success", t.deleted);
    } catch (error) {
      console.error("Employee delete error:", error);

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.deleteError
      );
    }
  };

  const openDetails = (record) => {
    setDetailRecord(record);
    setShowDetails(true);
  };

  const handleCall = (record) => {
    const phone = String(record?.phone || "").trim();

    if (!phone) {
      showToast("error", t.noPhone);
      return;
    }

    const dialNumber = phone.replace(/(?!^\+)\D/g, "");
    window.location.href = `tel:${dialNumber}`;
  };

  const openLedger = (record) => {
    const employeeId = getEmployeeId(record);

    // Frontend route for employee ledger.
    // Change this path here if your app uses a different employee-ledger page.
    window.location.href = `/employees/${employeeId}/ledger`;
  };

  const openMasterModal = (type) => {
    setMasterModal({
      open: true,
      type,
      name: "",
    });
  };

  const closeMasterModal = () => {
    if (masterSubmitting) return;

    setMasterModal({
      open: false,
      type: "",
      name: "",
    });
  };

  const handleMasterSave = async () => {
    const name = masterModal.name.trim();

    if (!name) {
      showToast("error", t.masterRequired);
      return;
    }

    setMasterSubmitting(true);

    try {
      const endpoint =
        masterModal.type === "department"
          ? "departments"
          : "designations";

      const requestBody =
        masterModal.type === "department"
          ? { department_name: name }
          : { designation_name: name };

      const response = await axios.post(
        `${EMPLOYEE_API}/${endpoint}`,
        requestBody
      );

      const createdId =
        response?.data?.id ??
        response?.data?.data?.id;

      await fetchData();

      if (createdId) {
        updateField(
          masterModal.type === "department"
            ? "department_id"
            : "designation_id",
          String(createdId)
        );
      }

      showToast(
        "success",
        masterModal.type === "department"
          ? t.departmentSaved
          : t.designationSaved
      );

      setMasterModal({
        open: false,
        type: "",
        name: "",
      });
    } catch (error) {
      console.error("Master save error:", error);

      let text =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t.masterSaveError;

      if (
        error?.response?.status === 409 ||
        error?.response?.data?.code ===
          "ER_DUP_ENTRY"
      ) {
        text = t.duplicateMaster;
      }

      showToast("error", text);
    } finally {
      setMasterSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter((record) =>
      [
        record?.full_name,
        record?.cnic,
        record?.phone,
        record?.employee_type,
        employeeDepartment(record),
        employeeDesignation(record),
        normalizeDate(record?.joining_date),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [
    employees,
    search,
    employeeDepartment,
    employeeDesignation,
  ]);

  const summary = useMemo(
    () => ({
      total: employees.length,
      salaried: employees.filter(
        (record) =>
          normalizeType(record?.employee_type) ===
          "Salaried"
      ).length,
      contractors: employees.filter(
        (record) =>
          normalizeType(record?.employee_type) ===
          "Contractor"
      ).length,
    }),
    [employees]
  );

  const detailItems = detailRecord
    ? [
        [t.employeeName, detailRecord.full_name || "-"],
        [t.cnic, detailRecord.cnic || "-"],
        [t.phone, detailRecord.phone || "-"],
        [
          t.employeeType,
          normalizeType(detailRecord.employee_type) ===
          "Contractor"
            ? t.contractor
            : t.salaried,
        ],
        [
          t.department,
          employeeDepartment(detailRecord),
        ],
        [
          t.designation,
          employeeDesignation(detailRecord),
        ],
        [
          t.joiningDate,
          normalizeDate(detailRecord.joining_date) ||
            "-",
        ],
      ]
    : [];

  const printDocument = (saveAsPdf = false) => {
    const rows = filtered
      .map(
        (record, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td><strong>${record.full_name || "-"}</strong></td>
            <td>${record.cnic || "-"}</td>
            <td>${record.phone || "-"}</td>
            <td>${normalizeType(record.employee_type)}</td>
            <td>${employeeDepartment(record)}</td>
            <td>${employeeDesignation(record)}</td>
            <td class="center">${normalizeDate(
              record.joining_date
            ) || "-"}</td>
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
        <title>${t.reportTitle}</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:${isUrdu ? "\"Noto Nastaliq Urdu\",\"Noto Naskh Arabic\",\"Jameel Noori Nastaleeq\",\"Segoe UI\",Arial,sans-serif" : "Arial,\"Segoe UI\",sans-serif"};direction:${dir};line-height:${isUrdu ? "1.9" : "1.45"};color:#0f172a;padding:20px}
          .sheet{max-width:1200px;margin:auto;border:1px solid #D6E0EE}
          .header{background:#0f172a;color:#fff;padding:20px;display:flex;justify-content:space-between}
          h1{margin:0;font-size:24px}
          .sub{margin-top:4px;color:#cbd5e1;font-size:12px}
          .hint{padding:10px;background:#EFF6FF;color:#285DB8;text-align:center}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#0f172a;color:#fff;padding:10px 8px;border:1px solid #334155}
          td{padding:9px 8px;border:1px solid #e2e8f0}
          tbody tr:nth-child(even){background:#f8fafc}
          .center{text-align:center}
          @media print{
            @page{size:A4 landscape;margin:8mm}
            body{padding:0}
            .hint{display:none}
          }
        </style>
      </head>
      <body>
        ${
          saveAsPdf
            ? `<div class="hint">Select <strong>Save as PDF</strong> in print destination.</div>`
            : ""
        }

        <div class="sheet">
          <div class="header">
            <div>
              <h1>Ali Cage</h1>
              <div class="sub">${t.reportTitle}</div>
            </div>
            <div>
              ${t.printedOn}: ${new Date().toLocaleString(
      isUrdu ? "ur-PK" : "en-US"
    )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${t.employeeName}</th>
                <th>${t.cnic}</th>
                <th>${t.phone}</th>
                <th>${t.employeeType}</th>
                <th>${t.department}</th>
                <th>${t.designation}</th>
                <th>${t.joiningDate}</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr><td colspan="8" class="center">${t.noRecords}</td></tr>`
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
    <div className="employee-page" dir={dir}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        *{box-sizing:border-box}

        .employee-page{
          min-height:100vh;
          padding:12px;
          color:#0f172a;
          background:linear-gradient(135deg,#EFF6FF 0%,#f8fafc 48%,#f1f5f9 100%);
          font-family:${
            isUrdu
              ? "'Noto Nastaliq Urdu',Arial,sans-serif"
              : "Inter,Helvetica,Arial,sans-serif"
          };
        }

        .page-wrap{
          width:100%;
          max-width:1360px;
          margin:0 auto;
        }

        .top-card{
          padding:18px 18px 15px;
          background:rgba(255,255,255,.95);
          border:1px solid #D6E0EE;
          border-radius:22px;
          box-shadow:0 18px 50px rgba(15,23,42,.08);
        }

        .page-title{
          margin:0;
          font-size:26px;
          font-weight:950;
          letter-spacing:-.8px;
        }

        .page-subtitle{
          margin:7px 0 0;
          color:#64748b;
          font-size:13px;
        }

        .actions{
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:12px;
        }

        .btn{
          border:1px solid transparent;
          border-radius:10px;
          padding:8px 11px;
          font-size:11px;
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          transition:.15s ease;
          white-space:nowrap;
        }

        .btn:hover{transform:translateY(-1px)}
        .btn:disabled{
          opacity:.55;
          cursor:not-allowed;
          transform:none;
        }

        .btn-white{
          background:#fff;
          color:#475569;
          border-color:#cbd5e1;
        }

        .btn-summary{
          background:#EFF6FF;
          color:#0A65BD;
          border-color:#DBEAFE;
        }

        .btn-dark{
          background:#0f172a;
          color:#fff;
        }

        .btn-primary{
          background:#0B4E9B;
          color:#fff;
          box-shadow:0 12px 24px rgba(79,70,229,.25);
        }

        .btn-danger{
          background:#fee2e2;
          color:#991b1b;
        }

        .btn-add{
          width:42px;
          height:42px;
          padding:0;
          flex:0 0 auto;
          background:#ecfdf5;
          color:#047857;
          border-color:#bbf7d0;
        }

        .summary-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
          margin-top:14px;
        }

        .summary-card{
          background:#fff;
          border:1px solid #D6E0EE;
          border-radius:16px;
          padding:15px;
          box-shadow:0 8px 24px rgba(15,23,42,.05);
        }

        .summary-label{
          color:#64748b;
          font-size:10px;
          font-weight:850;
          text-transform:uppercase;
          letter-spacing:.4px;
        }

        .summary-value{
          margin-top:6px;
          color:#0f172a;
          font-size:21px;
          font-weight:950;
        }

        .search-row{margin:14px 0}

        .search-box{
          position:relative;
          width:100%;
          max-width:520px;
        }

        .search-icon{
          position:absolute;
          top:50%;
          transform:translateY(-50%);
          color:#94a3b8;
          ${isUrdu ? "right:14px" : "left:14px"};
        }

        .search-input{
          width:100%;
          height:43px;
          border:1px solid #cbd5e1;
          border-radius:12px;
          background:#fff;
          color:#334155;
          font-size:13px;
          outline:none;
          ${
            isUrdu
              ? "padding:0 42px 0 13px"
              : "padding:0 13px 0 42px"
          };
        }

        .search-input:focus,
        .field-input:focus,
        .field-select:focus{
          border-color:#4A86F7;
          box-shadow:0 0 0 3px rgba(99,102,241,.12);
        }

        .table-card{
          overflow:hidden;
          width:100%;
          background:#fff;
          border:1px solid #D6E0EE;
          border-radius:18px;
          box-shadow:0 18px 45px rgba(15,23,42,.07);
        }

        .employee-table{
          width:100%;
          min-width:0;
          table-layout:fixed;
          border-collapse:collapse;
        }

        .employee-table th{
          padding:10px 5px;
          background:#0f172a;
          color:#fff;
          font-size:8px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.4px;
        }

        .employee-table td{
          padding:9px 5px;
          border-bottom:1px solid #e5e7eb;
          color:#475569;
          font-size:11px;
          vertical-align:middle;
        }

        .employee-table tbody tr:last-child td{
          border-bottom:0;
        }

        .employee-table tbody tr:hover td{
          background:#f8faff;
        }

        .employee-cell{
          display:flex;
          align-items:center;
          gap:7px;
          min-width:0;
        }

        .avatar{
          width:32px;
          height:32px;
          border-radius:10px;
          flex-shrink:0;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#EFF6FF;
          color:#0B4E9B;
          font-weight:950;
        }

        .employee-copy{min-width:0}

        .employee-name{
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#0f172a;
          font-weight:900;
        }

        .employee-phone{
          margin-top:3px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#94a3b8;
          font-size:10px;
        }

        .pill{
          display:inline-flex;
          max-width:100%;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          border:1px solid #e2e8f0;
          border-radius:999px;
          padding:4px 7px;
          background:#f1f5f9;
          color:#334155;
          font-size:8px;
          font-weight:900;
        }

        .type-salaried{
          border-color:#bbf7d0;
          background:#ecfdf5;
          color:#047857;
        }

        .type-contractor{
          border-color:#fed7aa;
          background:#fff7ed;
          color:#c2410c;
        }

        .department-pill{
          border-color:#DBEAFE;
          background:#EFF6FF;
          color:#0A65BD;
        }

        .view-btn{
          border:1px solid #DBEAFE;
          border-radius:9px;
          background:#EFF6FF;
          color:#0A65BD;
          padding:6px 8px;
          font-size:9px;
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:5px;
        }

        .ledger-btn{
          border:0;
          border-radius:9px;
          background:#0B4E9B;
          color:#fff;
          min-width:76px;
          padding:6px 8px;
          font-size:9px;
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:4px;
          white-space:nowrap;
        }

        .ledger-btn:hover{background:#0A65BD}

        .call-btn{
          border:0;
          border-radius:9px;
          background:#16a34a;
          color:#fff;
          min-width:66px;
          padding:6px 8px;
          font-size:9px;
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:4px;
          white-space:nowrap;
        }

        .call-btn:hover{background:#15803d}

        .call-btn:disabled{
          background:#e2e8f0;
          color:#94a3b8;
          cursor:not-allowed;
        }

        .employee-table th,
        .employee-table td{
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .employee-table td:last-child{
          overflow:visible;
        }

        .empty{
          padding:50px 20px!important;
          text-align:center!important;
          color:#94a3b8!important;
        }

        .toast{
          position:fixed;
          bottom:22px;
          ${isUrdu ? "left:22px" : "right:22px"};
          z-index:150;
          max-width:430px;
          border-radius:14px;
          padding:12px 15px;
          color:#fff;
          font-size:12px;
          font-weight:850;
          box-shadow:0 20px 50px rgba(15,23,42,.25);
        }

        .toast-success{background:#059669}
        .toast-error{background:#dc2626}

        .modal-backdrop{
          position:fixed;
          inset:0;
          z-index:100;
          padding:12px;
          background:rgba(15,23,42,.62);
          backdrop-filter:blur(3px);
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .modal{
          width:100%;
          max-width:880px;
          max-height:calc(100vh - 24px);
          overflow:hidden;
          background:#fff;
          border-radius:18px;
          box-shadow:0 30px 90px rgba(15,23,42,.3);
          display:flex;
          flex-direction:column;
        }

        .details-modal{max-width:760px}
        .master-modal{max-width:450px}

        .modal-header{
          padding:17px 19px;
          border-bottom:1px solid #e2e8f0;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .modal-title{
          margin:0;
          font-size:20px;
          font-weight:950;
        }

        .modal-subtitle{
          margin-top:4px;
          color:#64748b;
          font-size:11px;
        }

        .close-btn{
          width:36px;
          height:36px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          background:#fff;
          color:#475569;
          cursor:pointer;
        }

        .modal-body{
          padding:18px;
          overflow-y:auto;
          background:#f8fafc;
        }

        .form-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:12px;
        }

        .field-label{
          display:block;
          margin-bottom:6px;
          color:#475569;
          font-size:11px;
          font-weight:850;
        }

        .field-input,
        .field-select{
          width:100%;
          height:42px;
          border:1px solid #cbd5e1;
          border-radius:10px;
          background:#fff;
          color:#0f172a;
          padding:0 11px;
          font-size:13px;
          outline:none;
        }

        .select-add-row{
          display:flex;
          align-items:center;
          gap:7px;
        }

        .select-add-row .field-select{
          flex:1;
          min-width:0;
        }

        .modal-footer{
          padding:14px 18px;
          border-top:1px solid #e2e8f0;
          background:#fff;
          display:flex;
          justify-content:flex-end;
          gap:8px;
        }

        .details-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }

        .detail-card{
          border:1px solid #D6E0EE;
          border-radius:12px;
          padding:12px;
          background:#fff;
        }

        .detail-label{
          color:#94a3b8;
          font-size:9px;
          font-weight:850;
          text-transform:uppercase;
          letter-spacing:.35px;
        }

        .detail-value{
          margin-top:6px;
          color:#0f172a;
          font-size:13px;
          font-weight:900;
          word-break:break-word;
        }

        @media(max-width:720px){
          .employee-page{padding:10px}
          .top-card{padding:19px 15px}
          .page-title{font-size:25px}
          .actions .btn{flex:1}

          .summary-grid,
          .form-grid,
          .details-grid{
            grid-template-columns:1fr;
          }

          .employee-table th,
          .employee-table td{
            padding:12px 4px;
          }

          .employee-table th{font-size:6px}
          .employee-phone{display:none}
          .view-btn span,
          .ledger-btn span,
          .call-btn span{display:none}
          .ledger-btn,
          .call-btn,
          .view-btn{
            min-width:30px;
            width:30px;
            height:30px;
            padding:0;
          }

          .modal-footer{
            flex-direction:column-reverse;
          }

          .modal-footer .btn{width:100%}
        }
      `}</style>

      {message.text && (
        <div
          className={`toast ${
            message.type === "error"
              ? "toast-error"
              : "toast-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="page-wrap">
        <section className="top-card">
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">
            {t.subtitle}
          </p>

          <div className="actions">
            <button
              type="button"
              className="btn btn-white"
              onClick={() =>
                setLang((previous) =>
                  previous === "en" ? "ur" : "en"
                )
              }
            >
              <i className="bi bi-translate" />
              {t.toggleLang}
            </button>

            <button
              type="button"
              className="btn btn-summary"
              onClick={() =>
                setShowSummary((previous) => !previous)
              }
            >
              <i className="bi bi-bar-chart-fill" />
              {showSummary
                ? t.hideSummary
                : t.viewSummary}
            </button>

            <button
              type="button"
              className="btn btn-dark"
              disabled={!filtered.length}
              onClick={() => printDocument(false)}
            >
              <i className="bi bi-printer" />
              {t.printList}
            </button>

            <button
              type="button"
              className="btn btn-white"
              disabled={!filtered.length}
              onClick={() => printDocument(true)}
            >
              <i className="bi bi-file-earmark-pdf" />
              {t.downloadPdf}
            </button>

            <button
              type="button"
              className="btn btn-white"
              onClick={fetchData}
            >
              <i className="bi bi-arrow-clockwise" />
              {t.refresh}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={openAdd}
            >
              <i className="bi bi-person-plus-fill" />
              {t.newEmployee}
            </button>
          </div>
        </section>

        {showSummary && (
          <section className="summary-grid">
            <article className="summary-card">
              <div className="summary-label">
                {t.totalEmployees}
              </div>
              <div className="summary-value">
                {summary.total}
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-label">
                {t.salariedEmployees}
              </div>
              <div className="summary-value">
                {summary.salaried}
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-label">
                {t.contractorEmployees}
              </div>
              <div className="summary-value">
                {summary.contractors}
              </div>
            </article>
          </section>
        )}

        <div className="search-row">
          <div className="search-box">
            <i className="bi bi-search search-icon" />

            <input
              className="search-input"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t.searchPlaceholder}
            />
          </div>
        </div>

        <section className="table-card">
          <table className="employee-table">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "23%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
            </colgroup>

            <thead>
              <tr>
                <th style={{ textAlign: "center" }}>
                  #
                </th>
                <th
                  style={{
                    textAlign: isUrdu
                      ? "right"
                      : "left",
                  }}
                >
                  {t.employee}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.employeeType}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.department}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.designation}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.ledger}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.call}
                </th>
                <th style={{ textAlign: "center" }}>
                  {t.viewDetails}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty">
                    <i className="bi bi-arrow-repeat" />{" "}
                    {t.loading}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty">
                    <i className="bi bi-inbox" />{" "}
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => {
                  const type = normalizeType(
                    record.employee_type
                  );

                  return (
                    <tr key={getEmployeeId(record)}>
                      <td
                        style={{
                          textAlign: "center",
                          color: "#94a3b8",
                        }}
                      >
                        {index + 1}
                      </td>

                      <td>
                        <div className="employee-cell">
                          <div className="avatar">
                            {(record.full_name || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="employee-copy">
                            <div className="employee-name">
                              {record.full_name || "-"}
                            </div>
                            <div className="employee-phone">
                              {record.phone || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        style={{ textAlign: "center" }}
                      >
                        <span
                          className={`pill ${
                            type === "Contractor"
                              ? "type-contractor"
                              : "type-salaried"
                          }`}
                        >
                          {type === "Contractor"
                            ? t.contractor
                            : t.salaried}
                        </span>
                      </td>

                      <td
                        style={{ textAlign: "center" }}
                      >
                        <span className="pill department-pill">
                          {employeeDepartment(record)}
                        </span>
                      </td>

                      <td
                        style={{ textAlign: "center" }}
                      >
                        <span className="pill">
                          {employeeDesignation(record)}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="ledger-btn"
                          onClick={() => openLedger(record)}
                          title={t.ledger}
                        >
                          <i className="bi bi-journal-text" />
                          <span>{t.ledger}</span>
                        </button>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="call-btn"
                          onClick={() => handleCall(record)}
                          disabled={!record?.phone}
                          title={record?.phone ? t.call : t.noPhone}
                        >
                          <i className="bi bi-telephone-fill" />
                          <span>{t.call}</span>
                        </button>
                      </td>

                      <td
                        style={{ textAlign: "center" }}
                      >
                        <button
                          type="button"
                          className="view-btn"
                          onClick={() =>
                            openDetails(record)
                          }
                        >
                          <i className="bi bi-eye-fill" />
                          <span>
                            {t.viewDetails}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="modal" dir={dir}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingId
                    ? t.editEmployeeTitle
                    : t.addEmployeeTitle}
                </h2>
                <div className="modal-subtitle">
                  {t.formSubtitle}
                </div>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={closeForm}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <label className="field-label">
                    {t.employeeName} *
                  </label>

                  <input
                    className="field-input"
                    value={form.full_name}
                    onChange={(event) =>
                      updateField(
                        "full_name",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t.cnicOptional}
                  </label>

                  <input
                    className="field-input"
                    value={form.cnic}
                    placeholder="XXXXX-XXXXXXX-X"
                    onChange={(event) =>
                      updateField(
                        "cnic",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t.phone} *
                  </label>

                  <input
                    className="field-input"
                    value={form.phone}
                    placeholder="03XX-XXXXXXX"
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="field-label">
                    {t.employeeType} *
                  </label>

                  <select
                    className="field-select"
                    value={form.employee_type}
                    onChange={(event) =>
                      updateField(
                        "employee_type",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      {t.selectType}
                    </option>
                    <option value="Salaried">
                      {t.salaried}
                    </option>
                    <option value="Contractor">
                      {t.contractor}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="field-label">
                    {t.department} *
                  </label>

                  <div className="select-add-row">
                    <select
                      className="field-select"
                      value={form.department_id}
                      onChange={(event) =>
                        updateField(
                          "department_id",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {t.selectDepartment}
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={getDepartmentId(
                              department
                            )}
                            value={getDepartmentId(
                              department
                            )}
                          >
                            {getDepartmentName(
                              department
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      className="btn btn-add"
                      title={t.addDepartment}
                      onClick={() =>
                        openMasterModal(
                          "department"
                        )
                      }
                    >
                      <i className="bi bi-plus-lg" />
                    </button>
                  </div>

                  {!loading &&
                    departments.length === 0 && (
                      <div
                        style={{
                          marginTop: 5,
                          color: "#dc2626",
                          fontSize: 10,
                        }}
                      >
                        {t.noDepartments}
                      </div>
                    )}
                </div>

                <div>
                  <label className="field-label">
                    {t.designation} *
                  </label>

                  <div className="select-add-row">
                    <select
                      className="field-select"
                      value={form.designation_id}
                      onChange={(event) =>
                        updateField(
                          "designation_id",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {t.selectDesignation}
                      </option>

                      {designations.map(
                        (designation) => (
                          <option
                            key={getDesignationId(
                              designation
                            )}
                            value={getDesignationId(
                              designation
                            )}
                          >
                            {getDesignationName(
                              designation
                            )}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      className="btn btn-add"
                      title={t.addDesignation}
                      onClick={() =>
                        openMasterModal(
                          "designation"
                        )
                      }
                    >
                      <i className="bi bi-plus-lg" />
                    </button>
                  </div>

                  {!loading &&
                    designations.length === 0 && (
                      <div
                        style={{
                          marginTop: 5,
                          color: "#dc2626",
                          fontSize: 10,
                        }}
                      >
                        {t.noDesignations}
                      </div>
                    )}
                </div>

                <div>
                  <label className="field-label">
                    {t.joiningDate}
                  </label>

                  <input
                    type="date"
                    className="field-input"
                    value={form.joining_date}
                    onChange={(event) =>
                      updateField(
                        "joining_date",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-white"
                disabled={submitting}
                onClick={closeForm}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSave}
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
                  ? t.updateEmployee
                  : t.saveEmployee}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && detailRecord && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowDetails(false);
            }
          }}
        >
          <div
            className="modal details-modal"
            dir={dir}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {t.detailsTitle}
                </h2>
                <div className="modal-subtitle">
                  {detailRecord.full_name || "-"}
                </div>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() =>
                  setShowDetails(false)
                }
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                {detailItems.map(([label, value]) => (
                  <div
                    className="detail-card"
                    key={label}
                  >
                    <div className="detail-label">
                      {label}
                    </div>
                    <div className="detail-value">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-white"
                onClick={() =>
                  setShowDetails(false)
                }
              >
                {t.close}
              </button>

              <button
                type="button"
                className="btn btn-summary"
                onClick={() =>
                  openEdit(detailRecord)
                }
              >
                <i className="bi bi-pencil-square" />
                {t.edit}
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() =>
                  handleDelete(
                    getEmployeeId(detailRecord)
                  )
                }
              >
                <i className="bi bi-trash3" />
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {masterModal.open && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 130 }}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeMasterModal();
            }
          }}
        >
          <div
            className="modal master-modal"
            dir={dir}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {masterModal.type ===
                  "department"
                    ? t.addDepartment
                    : t.addDesignation}
                </h2>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={closeMasterModal}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="modal-body">
              <label className="field-label">
                {masterModal.type ===
                "department"
                  ? t.departmentName
                  : t.designationName}{" "}
                *
              </label>

              <input
                autoFocus
                className="field-input"
                value={masterModal.name}
                onChange={(event) =>
                  setMasterModal((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleMasterSave();
                  }
                }}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-white"
                disabled={masterSubmitting}
                onClick={closeMasterModal}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={masterSubmitting}
                onClick={handleMasterSave}
              >
                <i
                  className={`bi ${
                    masterSubmitting
                      ? "bi-arrow-repeat"
                      : "bi-check2-circle"
                  }`}
                />

                {masterSubmitting
                  ? t.saving
                  : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
