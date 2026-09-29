import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CONTRACTOR_API = `${API_ROOT}/api/contractors`;

const TEXT = {
  en: {
    title: "Contractor Management",
    subtitle:
      "Manage contractors and multiple work agreements based on day, hour, month or fixed contract",
    newContractor: "New Contractor",
    refresh: "Refresh",
    summary: "Summary",
    hideSummary: "Hide Summary",
    language: "اردو",
    search: "Search contractor, phone, CNIC, department or work...",
    totalContractors: "Total Contractors",
    activeContracts: "Active Contracts",
    completedContracts: "Completed Contracts",
    totalValue: "Total Contract Value",
    contractor: "Contractor",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    contracts: "Contracts",
    contractRateColumn: "Contract Rate",
    total: "Total Value",
    details: "View Details",
    name: "Contractor Name",
    phone: "Phone Number",
    cnic: "CNIC (Optional)",
    address: "Address (Optional)",
    addContractor: "Add Contractor",
    editContractor: "Edit Contractor",
    saveContractor: "Save Contractor",
    updateContractor: "Update Contractor",
    contractorDetails: "Contractor Details",
    initialContract: "Initial Contract Details",
    saveContractorWithContract: "Save Contractor & Contract",
    addContract: "Add Contract",
    editContract: "Edit Contract",
    department: "Department / Work Area",
    selectDepartment: "-- Select Department --",
    addDepartment: "Add Department",
    departmentName: "Department Name",
    workTitle: "Work Title",
    workDescription: "Work Description",
    paymentBasis: "Payment Basis",
    selectBasis: "-- Select Payment Basis --",
    perDay: "Per Day",
    perHour: "Per Hour",
    monthly: "Monthly",
    fixed: "Fixed Contract",
    contractRate: "Contract Rate",
    fixedAmount: "Contract Rate",
    duration: "Duration / Quantity",
    durationUnit: "Duration Unit",
    days: "Days",
    hours: "Hours",
    months: "Months",
    startDate: "Start Date",
    endDate: "End Date",
    contractStatus: "Contract Status",
    planned: "Planned",
    completed: "Completed",
    cancelled: "Cancelled",
    notes: "Notes",
    calculatedTotal: "Total Value",
    noContracts: "No contracts added for this contractor.",
    noRecords: "No contractors found.",
    loading: "Loading contractor data...",
    save: "Save",
    update: "Update",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    requiredContractor: "Contractor name and phone number are required.",
    requiredContract:
      "Department, work title, payment basis, rate and duration are required.",
    invalidAmount: "Rate and duration must be greater than zero.",
    loadError: "Contractor data could not be loaded.",
    saveError: "Record could not be saved.",
    deleteError: "Record could not be deleted.",
    contractorSaved: "Contractor saved successfully.",
    contractorUpdated: "Contractor updated successfully.",
    contractorDeleted: "Contractor deleted successfully.",
    contractSaved: "Contract saved successfully.",
    contractUpdated: "Contract updated successfully.",
    contractDeleted: "Contract deleted successfully.",
    departmentSaved: "Department added successfully.",
    deleteContractor:
      "Delete this contractor? Existing contracts must be deleted first.",
    deleteContract: "Delete this contract?",
  },
  ur: {
    title: "کنٹریکٹر مینجمنٹ",
    subtitle:
      "روزانہ، گھنٹہ، ماہانہ یا مکمل معاہدے کے حساب سے کنٹریکٹر اور متعدد کاموں کا انتظام کریں",
    newContractor: "نیا کنٹریکٹر",
    refresh: "ری فریش",
    summary: "سمری",
    hideSummary: "سمری بند کریں",
    language: "English",
    search: "کنٹریکٹر، فون، شناختی کارڈ، شعبہ یا کام سے تلاش کریں...",
    totalContractors: "کل کنٹریکٹر",
    activeContracts: "فعال معاہدے",
    completedContracts: "مکمل معاہدے",
    totalValue: "کل معاہدوں کی رقم",
    contractor: "کنٹریکٹر",
    status: "حالت",
    active: "فعال",
    inactive: "غیر فعال",
    contracts: "معاہدے",
    contractRateColumn: "کنٹریکٹ ریٹ",
    total: "کل ویلیو",
    details: "تفصیل دیکھیں",
    name: "کنٹریکٹر کا نام",
    phone: "فون نمبر",
    cnic: "شناختی کارڈ (اختیاری)",
    address: "پتہ (اختیاری)",
    addContractor: "کنٹریکٹر شامل کریں",
    editContractor: "کنٹریکٹر اپڈیٹ کریں",
    saveContractor: "کنٹریکٹر محفوظ کریں",
    updateContractor: "کنٹریکٹر اپڈیٹ کریں",
    contractorDetails: "کنٹریکٹر کی تفصیل",
    initialContract: "ابتدائی معاہدے کی تفصیل",
    saveContractorWithContract: "کنٹریکٹر اور معاہدہ محفوظ کریں",
    addContract: "معاہدہ شامل کریں",
    editContract: "معاہدہ اپڈیٹ کریں",
    department: "شعبہ / کام کی قسم",
    selectDepartment: "-- شعبہ منتخب کریں --",
    addDepartment: "شعبہ شامل کریں",
    departmentName: "شعبے کا نام",
    workTitle: "کام کا نام",
    workDescription: "کام کی تفصیل",
    paymentBasis: "ادائیگی کی بنیاد",
    selectBasis: "-- ادائیگی کی قسم منتخب کریں --",
    perDay: "روزانہ",
    perHour: "فی گھنٹہ",
    monthly: "ماہانہ",
    fixed: "مکمل معاہدہ",
    contractRate: "کنٹریکٹ ریٹ",
    fixedAmount: "کنٹریکٹ ریٹ",
    duration: "مدت / تعداد",
    durationUnit: "مدت کی اکائی",
    days: "دن",
    hours: "گھنٹے",
    months: "ماہ",
    startDate: "شروع ہونے کی تاریخ",
    endDate: "ختم ہونے کی تاریخ",
    contractStatus: "معاہدے کی حالت",
    planned: "منصوبہ",
    completed: "مکمل",
    cancelled: "منسوخ",
    notes: "نوٹس",
    calculatedTotal: "کل ویلیو",
    noContracts: "اس کنٹریکٹر کا کوئی معاہدہ موجود نہیں۔",
    noRecords: "کوئی کنٹریکٹر نہیں ملا۔",
    loading: "کنٹریکٹر کا ڈیٹا لوڈ ہو رہا ہے...",
    save: "محفوظ کریں",
    update: "اپڈیٹ کریں",
    saving: "محفوظ ہو رہا ہے...",
    cancel: "منسوخ",
    close: "بند کریں",
    edit: "ترمیم",
    delete: "حذف",
    requiredContractor: "کنٹریکٹر کا نام اور فون نمبر ضروری ہیں۔",
    requiredContract: "شعبہ، کام، ادائیگی کی قسم، ریٹ اور مدت ضروری ہیں۔",
    invalidAmount: "ریٹ اور مدت صفر سے زیادہ ہونی چاہیے۔",
    loadError: "کنٹریکٹر کا ڈیٹا لوڈ نہیں ہوا۔",
    saveError: "ریکارڈ محفوظ نہیں ہوا۔",
    deleteError: "ریکارڈ حذف نہیں ہوا۔",
    contractorSaved: "کنٹریکٹر کامیابی سے محفوظ ہو گیا۔",
    contractorUpdated: "کنٹریکٹر کامیابی سے اپڈیٹ ہو گیا۔",
    contractorDeleted: "کنٹریکٹر کامیابی سے حذف ہو گیا۔",
    contractSaved: "معاہدہ کامیابی سے محفوظ ہو گیا۔",
    contractUpdated: "معاہدہ کامیابی سے اپڈیٹ ہو گیا۔",
    contractDeleted: "معاہدہ کامیابی سے حذف ہو گیا۔",
    departmentSaved: "شعبہ کامیابی سے شامل ہو گیا۔",
    deleteContractor:
      "کنٹریکٹر حذف کریں؟ پہلے اس کے موجودہ معاہدے حذف کرنا ضروری ہیں۔",
    deleteContract: "یہ معاہدہ حذف کریں؟",
  },
};

const emptyContractor = () => ({
  contractor_name: "",
  cnic: "",
  phone: "",
  address: "",
  status: "Active",
});

const emptyContract = (contractorId = "") => ({
  contractor_id: contractorId,
  department_id: "",
  work_title: "",
  work_description: "",
  payment_basis: "",
  contract_rate: "",
  duration_value: "",
  duration_unit: "Days",
  start_date: "",
  end_date: "",
  status: "Planned",
  notes: "",
});

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) =>
  toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const durationUnitFor = (basis) => {
  if (basis === "Per Hour") return "Hours";
  if (basis === "Monthly") return "Months";
  return "Days";
};

const totalFor = (basis, rate, duration) =>
  basis === "Fixed Contract"
    ? toNumber(rate)
    : toNumber(rate) * toNumber(duration);

const contractStatusClass = (status) => {
  if (status === "Completed") return "green";
  if (status === "Cancelled") return "red";
  if (status === "Active") return "green";
  return "blue";
};

export default function ContractorPage() {
  const [lang, setLang] = useState("en");
  const t = TEXT[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [contractors, setContractors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const [contractorForm, setContractorForm] = useState(emptyContractor());

  /*
    A new contractor is saved together with the first contract.
    Existing contractors can still receive multiple additional contracts
    through the View Details modal.
  */
  const [initialContractForm, setInitialContractForm] =
    useState(emptyContract());

  const [editingContractorId, setEditingContractorId] = useState(null);
  const [showContractorModal, setShowContractorModal] = useState(false);

  const [selectedContractor, setSelectedContractor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [contractForm, setContractForm] = useState(emptyContract());
  const [editingContractId, setEditingContractId] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);

  const [departmentForm, setDepartmentForm] = useState({
    open: false,
    name: "",
    target: "contract",
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: "", text: "" });

  const notify = useCallback((type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast({ type: "", text: "" }), 3200);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(CONTRACTOR_API);
      const data = response.data?.data ?? response.data;
      setContractors(toList(data?.contractors));
      setDepartments(toList(data?.departments));
      setContracts(toList(data?.contracts));
    } catch (error) {
      console.error(error);
      setContractors([]);
      setDepartments([]);
      setContracts([]);
      notify(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.loadError
      );
    } finally {
      setLoading(false);
    }
  }, [notify, t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contractsFor = useCallback(
    (contractorId) =>
      contracts.filter(
        (contract) => String(contract.contractor_id) === String(contractorId)
      ),
    [contracts]
  );

  const summary = useMemo(
    () => ({
      contractors: contractors.length,
      active: contracts.filter((item) => item.status === "Active").length,
      completed: contracts.filter((item) => item.status === "Completed").length,
      value: contracts
        .filter((item) => item.status !== "Cancelled")
        .reduce((sum, item) => sum + toNumber(item.total_value), 0),
    }),
    [contractors, contracts]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contractors;

    return contractors.filter((contractor) => {
      const related = contractsFor(contractor.id);
      return [
        contractor.contractor_name,
        contractor.phone,
        contractor.cnic,
        contractor.address,
        contractor.status,
        ...related.flatMap((item) => [
          item.work_title,
          item.work_description,
          item.department_name,
          item.payment_basis,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [contractors, search, contractsFor]);

  const updateContractor = (field, value) =>
    setContractorForm((previous) => ({
      ...previous,
      [field]: value,
    }));

  const updateInitialContract = (field, value) =>
    setInitialContractForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "payment_basis"
        ? { duration_unit: durationUnitFor(value) }
        : {}),
    }));

  const updateContract = (field, value) =>
    setContractForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "payment_basis"
        ? { duration_unit: durationUnitFor(value) }
        : {}),
    }));

  const openNewContractor = () => {
    setEditingContractorId(null);
    setContractorForm(emptyContractor());
    setInitialContractForm(emptyContract());
    setShowContractorModal(true);
  };

  const openEditContractor = (contractor) => {
    setEditingContractorId(contractor.id);
    setContractorForm({
      contractor_name: contractor.contractor_name || "",
      cnic: contractor.cnic || "",
      phone: contractor.phone || "",
      address: contractor.address || "",
      status: contractor.status || "Active",
    });
    setShowDetails(false);
    setShowContractorModal(true);
  };

  const initialCalculatedTotal = useMemo(
    () =>
      totalFor(
        initialContractForm.payment_basis,
        initialContractForm.contract_rate,
        initialContractForm.duration_value
      ),
    [
      initialContractForm.payment_basis,
      initialContractForm.contract_rate,
      initialContractForm.duration_value,
    ]
  );

  const saveContractor = async () => {
    if (
      !contractorForm.contractor_name.trim() ||
      !contractorForm.phone.trim()
    ) {
      notify("error", t.requiredContractor);
      return;
    }

    /*
      While editing an existing contractor, only basic profile fields
      are updated. Its multiple contracts remain managed separately.
    */
    if (!editingContractorId) {
      const initialRate = toNumber(
        initialContractForm.contract_rate
      );

      const initialDuration = toNumber(
        initialContractForm.duration_value
      );

      if (
        !initialContractForm.department_id ||
        !initialContractForm.work_title.trim() ||
        !initialContractForm.payment_basis
      ) {
        notify("error", t.requiredContract);
        return;
      }

      if (initialRate <= 0 || initialDuration <= 0) {
        notify("error", t.invalidAmount);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        contractor_name:
          contractorForm.contractor_name.trim(),
        cnic: contractorForm.cnic.trim() || null,
        phone: contractorForm.phone.trim(),
        address:
          contractorForm.address.trim() || null,
        status: contractorForm.status,
      };

      if (editingContractorId) {
        await axios.put(
          `${CONTRACTOR_API}/${editingContractorId}`,
          payload
        );

        notify("success", t.contractorUpdated);
      } else {
        payload.initial_contract = {
          department_id: Number(
            initialContractForm.department_id
          ),
          work_title:
            initialContractForm.work_title.trim(),
          work_description:
            initialContractForm.work_description.trim() ||
            null,
          payment_basis:
            initialContractForm.payment_basis,
          contract_rate: toNumber(
            initialContractForm.contract_rate
          ),
          duration_value: toNumber(
            initialContractForm.duration_value
          ),
          duration_unit:
            initialContractForm.duration_unit,
          start_date:
            initialContractForm.start_date || null,
          end_date:
            initialContractForm.end_date || null,
          status: initialContractForm.status,
          notes:
            initialContractForm.notes.trim() || null,
        };

        await axios.post(CONTRACTOR_API, payload);
        notify("success", t.contractorSaved);
      }

      setShowContractorModal(false);
      setEditingContractorId(null);
      setContractorForm(emptyContractor());
      setInitialContractForm(emptyContract());

      await fetchData();
    } catch (error) {
      notify(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.saveError
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteContractor = async (id) => {
    if (!window.confirm(t.deleteContractor)) return;
    try {
      await axios.delete(`${CONTRACTOR_API}/${id}`);
      setShowDetails(false);
      setSelectedContractor(null);
      await fetchData();
      notify("success", t.contractorDeleted);
    } catch (error) {
      notify(
        "error",
        error?.response?.data?.message || t.deleteError
      );
    }
  };

  const openDetails = (contractor) => {
    setSelectedContractor(contractor);
    setShowDetails(true);
  };

  const openNewContract = (contractor) => {
    setEditingContractId(null);
    setContractForm(emptyContract(String(contractor.id)));
    setShowContractModal(true);
  };

  const openEditContract = (contract) => {
    setEditingContractId(contract.id);
    setContractForm({
      contractor_id: String(contract.contractor_id),
      department_id: String(contract.department_id || ""),
      work_title: contract.work_title || "",
      work_description: contract.work_description || "",
      payment_basis: contract.payment_basis || "",
      contract_rate: String(contract.contract_rate ?? ""),
      duration_value: String(contract.duration_value ?? ""),
      duration_unit:
        contract.duration_unit || durationUnitFor(contract.payment_basis),
      start_date: dateOnly(contract.start_date),
      end_date: dateOnly(contract.end_date),
      status: contract.status || "Planned",
      notes: contract.notes || "",
    });
    setShowContractModal(true);
  };

  const calculatedTotal = useMemo(
    () =>
      totalFor(
        contractForm.payment_basis,
        contractForm.contract_rate,
        contractForm.duration_value
      ),
    [
      contractForm.payment_basis,
      contractForm.contract_rate,
      contractForm.duration_value,
    ]
  );

  const saveContract = async () => {
    const rate = toNumber(contractForm.contract_rate);
    const duration = toNumber(contractForm.duration_value);

    if (
      !contractForm.contractor_id ||
      !contractForm.department_id ||
      !contractForm.work_title.trim() ||
      !contractForm.payment_basis
    ) {
      notify("error", t.requiredContract);
      return;
    }

    if (rate <= 0 || duration <= 0) {
      notify("error", t.invalidAmount);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        contractor_id: Number(contractForm.contractor_id),
        department_id: Number(contractForm.department_id),
        work_title: contractForm.work_title.trim(),
        work_description: contractForm.work_description.trim() || null,
        payment_basis: contractForm.payment_basis,
        contract_rate: rate,
        duration_value: duration,
        duration_unit: contractForm.duration_unit,
        start_date: contractForm.start_date || null,
        end_date: contractForm.end_date || null,
        status: contractForm.status,
        notes: contractForm.notes.trim() || null,
      };

      if (editingContractId) {
        await axios.put(
          `${CONTRACTOR_API}/contracts/${editingContractId}`,
          payload
        );
        notify("success", t.contractUpdated);
      } else {
        await axios.post(`${CONTRACTOR_API}/contracts`, payload);
        notify("success", t.contractSaved);
      }

      setShowContractModal(false);
      setEditingContractId(null);
      setContractForm(emptyContract());
      await fetchData();
    } catch (error) {
      notify(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.saveError
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteContract = async (id) => {
    if (!window.confirm(t.deleteContract)) return;
    try {
      await axios.delete(`${CONTRACTOR_API}/contracts/${id}`);
      await fetchData();
      notify("success", t.contractDeleted);
    } catch (error) {
      notify("error", error?.response?.data?.message || t.deleteError);
    }
  };

  const saveDepartment = async () => {
    const name = departmentForm.name.trim();
    if (!name) return;

    setSubmitting(true);
    try {
      const response = await axios.post(`${CONTRACTOR_API}/departments`, {
        department_name: name,
      });

      const createdId = response?.data?.id;
      await fetchData();

      if (createdId) {
        if (departmentForm.target === "initial") {
          updateInitialContract(
            "department_id",
            String(createdId)
          );
        } else {
          updateContract(
            "department_id",
            String(createdId)
          );
        }
      }

      setDepartmentForm({
        open: false,
        name: "",
        target: "contract",
      });

      notify("success", t.departmentSaved);
    } catch (error) {
      notify(
        "error",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          t.saveError
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContracts = selectedContractor
    ? contractsFor(selectedContractor.id)
    : [];

  return (
    <div className="contractor-page" dir={dir}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />

      <style>{`
        *{box-sizing:border-box}
        .contractor-page{min-height:100vh;padding:18px;background:linear-gradient(135deg,#EFF6FF,#f8fafc 55%,#f1f5f9);color:#0f172a;font-family:${
          isUrdu ? "Arial,sans-serif" : "Inter,Arial,sans-serif"
        }}
        .wrap{max-width:1240px;margin:auto}
        .top-card,.table-card,.summary-card,.modal{background:#fff;border:1px solid #D6E0EE;box-shadow:0 18px 45px rgba(15,23,42,.07)}
        .top-card{padding:24px 22px;border-radius:22px}.title{margin:0;font-size:30px;font-weight:950}.subtitle{margin:7px 0 0;color:#64748b;font-size:13px}
        .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.btn{border:1px solid transparent;border-radius:11px;padding:10px 14px;font-size:12px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}.btn:disabled{opacity:.55;cursor:not-allowed}.btn-white{background:#fff;border-color:#cbd5e1;color:#475569}.btn-primary{background:#0B4E9B;color:#fff}.btn-soft{background:#EFF6FF;border-color:#DBEAFE;color:#0A65BD}.btn-danger{background:#fee2e2;color:#991b1b}.btn-add{width:42px;height:42px;padding:0;background:#ecfdf5;border-color:#bbf7d0;color:#047857}
        .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.summary-card{padding:15px;border-radius:16px}.label{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:850}.value{margin-top:5px;font-size:20px;font-weight:950}
        .search{width:100%;max-width:540px;height:43px;margin:14px 0;border:1px solid #cbd5e1;border-radius:12px;padding:0 14px;font-size:13px;outline:none}.search:focus,.input:focus,.select:focus,.textarea:focus{border-color:#4A86F7;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
        .table-card{border-radius:18px;overflow:hidden}table{width:100%;table-layout:fixed;border-collapse:collapse}th{background:#0f172a;color:#fff;padding:14px 8px;font-size:9px;text-transform:uppercase}td{padding:14px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#475569}tbody tr:hover td{background:#f8faff}.person{display:flex;align-items:center;gap:10px;min-width:0}.avatar{width:38px;height:38px;border-radius:12px;background:#EFF6FF;color:#0B4E9B;display:flex;align-items:center;justify-content:center;font-weight:950;flex-shrink:0}.name{font-weight:900;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.phone{font-size:10px;color:#94a3b8;margin-top:3px}.pill{display:inline-flex;border:1px solid #D6E0EE;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:900}.green{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.red{background:#fef2f2;border-color:#fecaca;color:#b91c1c}.blue{background:#EFF6FF;border-color:#DBEAFE;color:#0A65BD}.empty{text-align:center!important;padding:45px!important;color:#94a3b8!important}
        .backdrop{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.64);backdrop-filter:blur(3px);padding:12px;display:flex;align-items:center;justify-content:center}.modal{width:100%;max-width:900px;max-height:calc(100vh - 24px);border-radius:18px;overflow:hidden;display:flex;flex-direction:column}.modal.large{max-width:1050px}.modal.small{max-width:460px}.modal-head,.modal-foot{padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}.modal-head{border-bottom:1px solid #e2e8f0}.modal-foot{border-top:1px solid #e2e8f0;justify-content:flex-end}.modal-body{padding:18px;overflow-y:auto;background:#f8fafc}.modal-title{margin:0;font-size:20px;font-weight:950}.close{width:36px;height:36px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.full{grid-column:1/-1}.section-divider{margin-top:4px;padding-top:16px;border-top:1px solid #D6E0EE}.section-caption{font-size:15px;font-weight:950;color:#0f172a}.field-label{display:block;margin-bottom:6px;font-size:11px;font-weight:850;color:#475569}.input,.select,.textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font-size:13px;outline:none}.input,.select{height:42px;padding:0 11px}.textarea{min-height:82px;padding:10px 11px;resize:vertical}.select-row{display:flex;gap:7px}.select-row .select{flex:1}.calc{grid-column:1/-1;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:14px;padding:14px}.calc .value{font-size:25px;color:#065f46}
        .info-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.info{background:#fff;border:1px solid #D6E0EE;border-radius:12px;padding:12px}.info-value{margin-top:5px;font-size:12px;font-weight:900;word-break:break-word}.section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 0 10px}.section-head h3{margin:0;font-size:17px}.contract-list{display:grid;gap:10px}.contract-card{background:#fff;border:1px solid #D6E0EE;border-radius:14px;padding:14px}.contract-top{display:flex;justify-content:space-between;gap:10px}.contract-title{font-size:14px;font-weight:950}.department{margin-top:4px;color:#0B4E9B;font-size:10px;font-weight:850}.contract-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px}.contract-stat{background:#f8fafc;border-radius:10px;padding:9px}.contract-actions{display:flex;gap:7px;margin-top:12px}
        .toast{position:fixed;z-index:170;bottom:22px;${
          isUrdu ? "left:22px" : "right:22px"
        };padding:12px 15px;border-radius:13px;color:#fff;font-size:12px;font-weight:850;box-shadow:0 20px 50px rgba(15,23,42,.25)}.toast-success{background:#059669}.toast-error{background:#dc2626}
        @media(max-width:900px){.summary-grid,.info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.contract-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:700px){.contractor-page{padding:10px}.title{font-size:25px}.actions .btn{flex:1}.summary-grid,.grid,.info-grid,.contract-grid{grid-template-columns:1fr}.full,.calc{grid-column:auto}th,td{padding:11px 4px}th{font-size:7px}.modal-foot{flex-direction:column-reverse}.modal-foot .btn{width:100%}}
      `}</style>

      {toast.text && (
        <div className={`toast toast-${toast.type}`}>{toast.text}</div>
      )}

      <div className="wrap">
        <section className="top-card">
          <h1 className="title">{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <div className="actions">
            <button
              className="btn btn-white"
              onClick={() => setLang((value) => (value === "en" ? "ur" : "en"))}
            >
              <i className="bi bi-translate" /> {t.language}
            </button>
            <button
              className="btn btn-soft"
              onClick={() => setShowSummary((value) => !value)}
            >
              <i className="bi bi-bar-chart-fill" />
              {showSummary ? t.hideSummary : t.summary}
            </button>
            <button className="btn btn-white" onClick={fetchData}>
              <i className="bi bi-arrow-clockwise" /> {t.refresh}
            </button>
            <button className="btn btn-primary" onClick={openNewContractor}>
              <i className="bi bi-person-plus-fill" /> {t.newContractor}
            </button>
          </div>
        </section>

        {showSummary && (
          <section className="summary-grid">
            {[
              [t.totalContractors, summary.contractors],
              [t.activeContracts, summary.active],
              [t.completedContracts, summary.completed],
              [t.totalValue, money(summary.value)],
            ].map(([label, value]) => (
              <article className="summary-card" key={label}>
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </article>
            ))}
          </section>
        )}

        <input
          className="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.search}
        />

        <section className="table-card">
          <table>
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.contractor}</th>
                <th>{t.status}</th>
                <th>{t.contracts}</th>
                <th>{t.contractRateColumn}</th>
                <th>{t.total}</th>
                <th>{t.details}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty">{t.loading}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="empty">{t.noRecords}</td></tr>
              ) : (
                filtered.map((contractor, index) => (
                  <tr key={contractor.id}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>
                      <div className="person">
                        <div className="avatar">
                          {(contractor.contractor_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="name">{contractor.contractor_name}</div>
                          <div className="phone">{contractor.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`pill ${contractor.status === "Active" ? "green" : "red"}`}>
                        {contractor.status === "Active" ? t.active : t.inactive}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {contractor.contracts_count || 0}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 900 }}>
                      {money(contractor.latest_contract_rate)}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 900 }}>
                      {money(contractor.total_value)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button className="btn btn-soft" onClick={() => openDetails(contractor)}>
                        <i className="bi bi-eye-fill" /> {t.details}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      {showContractorModal && (
        <div className="backdrop">
          <div
            className={`modal ${
              editingContractorId ? "" : "large"
            }`}
            dir={dir}
          >
            <div className="modal-head">
              <h2 className="modal-title">
                {editingContractorId ? t.editContractor : t.addContractor}
              </h2>
              <button className="close" onClick={() => setShowContractorModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid">
                <Field label={`${t.name} *`}>
                  <input
                    className="input"
                    value={contractorForm.contractor_name}
                    onChange={(event) => updateContractor("contractor_name", event.target.value)}
                  />
                </Field>
                <Field label={t.cnic}>
                  <input
                    className="input"
                    value={contractorForm.cnic}
                    onChange={(event) => updateContractor("cnic", event.target.value)}
                  />
                </Field>
                <Field label={`${t.phone} *`}>
                  <input
                    className="input"
                    value={contractorForm.phone}
                    onChange={(event) => updateContractor("phone", event.target.value)}
                  />
                </Field>
                <Field label={t.status}>
                  <select
                    className="select"
                    value={contractorForm.status}
                    onChange={(event) => updateContractor("status", event.target.value)}
                  >
                    <option value="Active">{t.active}</option>
                    <option value="Inactive">{t.inactive}</option>
                  </select>
                </Field>
                <Field label={t.address} className="full">
                  <textarea
                    className="textarea"
                    value={contractorForm.address}
                    onChange={(event) =>
                      updateContractor(
                        "address",
                        event.target.value
                      )
                    }
                  />
                </Field>

                {!editingContractorId && (
                  <>
                    <div className="full section-divider">
                      <div className="section-caption">
                        {t.initialContract}
                      </div>
                    </div>

                    <Field label={`${t.department} *`}>
                      <div className="select-row">
                        <select
                          className="select"
                          value={
                            initialContractForm.department_id
                          }
                          onChange={(event) =>
                            updateInitialContract(
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
                                key={department.id}
                                value={department.id}
                              >
                                {
                                  department.department_name
                                }
                              </option>
                            )
                          )}
                        </select>

                        <button
                          type="button"
                          className="btn btn-add"
                          title={t.addDepartment}
                          onClick={() =>
                            setDepartmentForm({
                              open: true,
                              name: "",
                              target: "initial",
                            })
                          }
                        >
                          <i className="bi bi-plus-lg" />
                        </button>
                      </div>
                    </Field>

                    <Field label={`${t.workTitle} *`}>
                      <input
                        className="input"
                        value={
                          initialContractForm.work_title
                        }
                        placeholder="Packing, Assembly, Painting..."
                        onChange={(event) =>
                          updateInitialContract(
                            "work_title",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label={`${t.paymentBasis} *`}>
                      <select
                        className="select"
                        value={
                          initialContractForm.payment_basis
                        }
                        onChange={(event) =>
                          updateInitialContract(
                            "payment_basis",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          {t.selectBasis}
                        </option>
                        <option value="Per Day">
                          {t.perDay}
                        </option>
                        <option value="Per Hour">
                          {t.perHour}
                        </option>
                        <option value="Monthly">
                          {t.monthly}
                        </option>
                        <option value="Fixed Contract">
                          {t.fixed}
                        </option>
                      </select>
                    </Field>

                    <Field label={`${t.contractRate} *`}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={
                          initialContractForm.contract_rate
                        }
                        onChange={(event) =>
                          updateInitialContract(
                            "contract_rate",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label={`${t.duration} *`}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={
                          initialContractForm.duration_value
                        }
                        onChange={(event) =>
                          updateInitialContract(
                            "duration_value",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label={t.durationUnit}>
                      {initialContractForm.payment_basis ===
                      "Fixed Contract" ? (
                        <select
                          className="select"
                          value={
                            initialContractForm.duration_unit
                          }
                          onChange={(event) =>
                            updateInitialContract(
                              "duration_unit",
                              event.target.value
                            )
                          }
                        >
                          <option value="Days">
                            {t.days}
                          </option>
                          <option value="Hours">
                            {t.hours}
                          </option>
                          <option value="Months">
                            {t.months}
                          </option>
                        </select>
                      ) : (
                        <input
                          className="input"
                          value={
                            initialContractForm.duration_unit
                          }
                          readOnly
                        />
                      )}
                    </Field>

                    <div className="calc">
                      <div className="label">
                        {t.calculatedTotal}
                      </div>
                      <div className="value">
                        {money(initialCalculatedTotal)}
                      </div>
                    </div>

                    <Field label={t.startDate}>
                      <input
                        type="date"
                        className="input"
                        value={
                          initialContractForm.start_date
                        }
                        onChange={(event) =>
                          updateInitialContract(
                            "start_date",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label={t.endDate}>
                      <input
                        type="date"
                        className="input"
                        value={initialContractForm.end_date}
                        onChange={(event) =>
                          updateInitialContract(
                            "end_date",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label={t.contractStatus}>
                      <select
                        className="select"
                        value={initialContractForm.status}
                        onChange={(event) =>
                          updateInitialContract(
                            "status",
                            event.target.value
                          )
                        }
                      >
                        <option value="Planned">
                          {t.planned}
                        </option>
                        <option value="Active">
                          {t.active}
                        </option>
                        <option value="Completed">
                          {t.completed}
                        </option>
                        <option value="Cancelled">
                          {t.cancelled}
                        </option>
                      </select>
                    </Field>

                    <Field
                      label={t.workDescription}
                      className="full"
                    >
                      <textarea
                        className="textarea"
                        value={
                          initialContractForm.work_description
                        }
                        onChange={(event) =>
                          updateInitialContract(
                            "work_description",
                            event.target.value
                          )
                        }
                      />
                    </Field>

                    <Field
                      label={t.notes}
                      className="full"
                    >
                      <textarea
                        className="textarea"
                        value={initialContractForm.notes}
                        onChange={(event) =>
                          updateInitialContract(
                            "notes",
                            event.target.value
                          )
                        }
                      />
                    </Field>
                  </>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-white" onClick={() => setShowContractorModal(false)}>
                {t.cancel}
              </button>
              <button className="btn btn-primary" disabled={submitting} onClick={saveContractor}>
                {submitting
                  ? t.saving
                  : editingContractorId
                  ? t.updateContractor
                  : t.saveContractorWithContract}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedContractor && (
        <div className="backdrop">
          <div className="modal large" dir={dir}>
            <div className="modal-head">
              <div>
                <h2 className="modal-title">{t.contractorDetails}</h2>
                <div className="subtitle">{selectedContractor.contractor_name}</div>
              </div>
              <button className="close" onClick={() => setShowDetails(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                {[
                  [t.name, selectedContractor.contractor_name],
                  [t.phone, selectedContractor.phone],
                  [t.cnic, selectedContractor.cnic || "-"],
                  [t.address, selectedContractor.address || "-"],
                  [t.status, selectedContractor.status],
                  [t.contracts, selectedContracts.length],
                  [
                    t.contractRateColumn,
                    money(selectedContractor.latest_contract_rate),
                  ],
                  [
                    t.total,
                    money(
                      selectedContracts.reduce(
                        (sum, contract) => sum + toNumber(contract.total_value),
                        0
                      )
                    ),
                  ],
                ].map(([label, value]) => (
                  <div className="info" key={label}>
                    <div className="label">{label}</div>
                    <div className="info-value">{value}</div>
                  </div>
                ))}
              </div>

              <div className="section-head">
                <h3>{t.contracts}</h3>
                <button className="btn btn-primary" onClick={() => openNewContract(selectedContractor)}>
                  <i className="bi bi-plus-lg" /> {t.addContract}
                </button>
              </div>

              {selectedContracts.length === 0 ? (
                <div className="empty">{t.noContracts}</div>
              ) : (
                <div className="contract-list">
                  {selectedContracts.map((contract) => (
                    <article className="contract-card" key={contract.id}>
                      <div className="contract-top">
                        <div>
                          <div className="contract-title">{contract.work_title}</div>
                          <div className="department">{contract.department_name || "-"}</div>
                        </div>
                        <span className={`pill ${contractStatusClass(contract.status)}`}>
                          {contract.status}
                        </span>
                      </div>

                      <div className="contract-grid">
                        {[
                          [t.paymentBasis, contract.payment_basis],
                          [
                            t.contractRate,
                            money(contract.contract_rate),
                          ],
                          [
                            t.calculatedTotal,
                            money(contract.total_value),
                          ],
                          [
                            t.duration,
                            `${contract.duration_value} ${contract.duration_unit}`,
                          ],
                          [
                            t.startDate,
                            dateOnly(contract.start_date) || "-",
                          ],
                        ].map(([label, value]) => (
                          <div className="contract-stat" key={label}>
                            <div className="label">{label}</div>
                            <div className="info-value">{value}</div>
                          </div>
                        ))}
                      </div>

                      {contract.work_description && (
                        <p className="subtitle" style={{ marginTop: 10 }}>
                          {contract.work_description}
                        </p>
                      )}

                      <div className="contract-actions">
                        <button className="btn btn-soft" onClick={() => openEditContract(contract)}>
                          <i className="bi bi-pencil-square" /> {t.edit}
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteContract(contract.id)}>
                          <i className="bi bi-trash3" /> {t.delete}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-white" onClick={() => setShowDetails(false)}>
                {t.close}
              </button>
              <button className="btn btn-soft" onClick={() => openEditContractor(selectedContractor)}>
                <i className="bi bi-pencil-square" /> {t.edit}
              </button>
              <button className="btn btn-danger" onClick={() => deleteContractor(selectedContractor.id)}>
                <i className="bi bi-trash3" /> {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="backdrop" style={{ zIndex: 125 }}>
          <div className="modal" dir={dir}>
            <div className="modal-head">
              <h2 className="modal-title">
                {editingContractId ? t.editContract : t.addContract}
              </h2>
              <button className="close" onClick={() => setShowContractModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid">
                <Field label={`${t.department} *`}>
                  <div className="select-row">
                    <select
                      className="select"
                      value={contractForm.department_id}
                      onChange={(event) => updateContract("department_id", event.target.value)}
                    >
                      <option value="">{t.selectDepartment}</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.department_name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-add"
                      title={t.addDepartment}
                      onClick={() =>
                        setDepartmentForm({
                          open: true,
                          name: "",
                          target: "contract",
                        })
                      }
                    >
                      <i className="bi bi-plus-lg" />
                    </button>
                  </div>
                </Field>

                <Field label={`${t.workTitle} *`}>
                  <input
                    className="input"
                    value={contractForm.work_title}
                    placeholder="Packing, Assembly, Painting..."
                    onChange={(event) => updateContract("work_title", event.target.value)}
                  />
                </Field>

                <Field label={`${t.paymentBasis} *`}>
                  <select
                    className="select"
                    value={contractForm.payment_basis}
                    onChange={(event) => updateContract("payment_basis", event.target.value)}
                  >
                    <option value="">{t.selectBasis}</option>
                    <option value="Per Day">{t.perDay}</option>
                    <option value="Per Hour">{t.perHour}</option>
                    <option value="Monthly">{t.monthly}</option>
                    <option value="Fixed Contract">{t.fixed}</option>
                  </select>
                </Field>

                <Field label={`${t.contractRate} *`}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={contractForm.contract_rate}
                    onChange={(event) => updateContract("contract_rate", event.target.value)}
                  />
                </Field>

                <Field label={`${t.duration} *`}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={contractForm.duration_value}
                    onChange={(event) => updateContract("duration_value", event.target.value)}
                  />
                </Field>

                <Field label={t.durationUnit}>
                  {contractForm.payment_basis === "Fixed Contract" ? (
                    <select
                      className="select"
                      value={contractForm.duration_unit}
                      onChange={(event) => updateContract("duration_unit", event.target.value)}
                    >
                      <option value="Days">{t.days}</option>
                      <option value="Hours">{t.hours}</option>
                      <option value="Months">{t.months}</option>
                    </select>
                  ) : (
                    <input className="input" value={contractForm.duration_unit} readOnly />
                  )}
                </Field>

                <Field label={t.startDate}>
                  <input
                    type="date"
                    className="input"
                    value={contractForm.start_date}
                    onChange={(event) => updateContract("start_date", event.target.value)}
                  />
                </Field>

                <Field label={t.endDate}>
                  <input
                    type="date"
                    className="input"
                    value={contractForm.end_date}
                    onChange={(event) => updateContract("end_date", event.target.value)}
                  />
                </Field>

                <Field label={t.contractStatus}>
                  <select
                    className="select"
                    value={contractForm.status}
                    onChange={(event) => updateContract("status", event.target.value)}
                  >
                    <option value="Planned">{t.planned}</option>
                    <option value="Active">{t.active}</option>
                    <option value="Completed">{t.completed}</option>
                    <option value="Cancelled">{t.cancelled}</option>
                  </select>
                </Field>

                <Field label={t.workDescription} className="full">
                  <textarea
                    className="textarea"
                    value={contractForm.work_description}
                    onChange={(event) => updateContract("work_description", event.target.value)}
                  />
                </Field>

                <Field label={t.notes} className="full">
                  <textarea
                    className="textarea"
                    value={contractForm.notes}
                    onChange={(event) => updateContract("notes", event.target.value)}
                  />
                </Field>

                <div className="calc">
                  <div className="label">{t.calculatedTotal}</div>
                  <div className="value">{money(calculatedTotal)}</div>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-white" onClick={() => setShowContractModal(false)}>
                {t.cancel}
              </button>
              <button className="btn btn-primary" disabled={submitting} onClick={saveContract}>
                {submitting
                  ? t.saving
                  : editingContractId
                  ? t.update
                  : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {departmentForm.open && (
        <div className="backdrop" style={{ zIndex: 145 }}>
          <div className="modal small" dir={dir}>
            <div className="modal-head">
              <h2 className="modal-title">{t.addDepartment}</h2>
              <button
                className="close"
                onClick={() => setDepartmentForm({
                    open: false,
                    name: "",
                    target: "contract",
                  })}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="modal-body">
              <Field label={`${t.departmentName} *`}>
                <input
                  autoFocus
                  className="input"
                  value={departmentForm.name}
                  onChange={(event) =>
                    setDepartmentForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveDepartment();
                  }}
                />
              </Field>
            </div>
            <div className="modal-foot">
              <button
                className="btn btn-white"
                onClick={() => setDepartmentForm({
                    open: false,
                    name: "",
                    target: "contract",
                  })}
              >
                {t.cancel}
              </button>
              <button className="btn btn-primary" disabled={submitting} onClick={saveDepartment}>
                {submitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
