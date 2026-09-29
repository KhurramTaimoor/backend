import React, { useEffect, useState } from "react";
import { Save, Trash2, Plus, Search, Edit } from "lucide-react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { tLabel, tUi, tValue } from "../utils/uiI18n";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const computeAutoValue = (formula, form, precision = 2) => {
  if (!formula) return null;
  if (formula.type === "subtract") {
    const left = parseFloat(form[formula.left]) || 0;
    const right = parseFloat(form[formula.right]) || 0;
    return (Math.max(left - right, 0)).toFixed(precision);
  }
  if (formula.type === "multiply") {
    const left = parseFloat(form[formula.left]) || 0;
    const right = parseFloat(form[formula.right]) || 0;
    return (left * right).toFixed(precision);
  }
  return null;
};

const normalizeInputValue = (value, type) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (type === "date") {
    if (str.includes("T")) return str.slice(0, 10);
    const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dmY.test(str)) {
      const [, dd, mm, yyyy] = str.match(dmY);
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return str;
};

const SalesCrudPageWithDropdown = ({ title, endpoint, fields, displayFields, requiredField, searchFields, autoCalc }) => {
  const outlet = useOutletContext() || {};
  const isRTL = !!outlet.isRTL;
  const initialForm = fields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {});
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [dropdownData, setDropdownData] = useState({});

  const tableFields = displayFields || fields;

  useEffect(() => {
    fetchAll();
    fields.forEach(async (f) => {
      if (f.type === "dropdown" && f.endpoint) {
        const r = await axios.get(`${API_BASE}/${f.endpoint}`);
        setDropdownData((prev) => ({ ...prev, [f.name]: r.data }));
      }
    });
  }, []);

  const fetchAll = async () => {
    const r = await axios.get(`${API_BASE}/${endpoint}`);
    setRecords(Array.isArray(r.data) ? r.data : []);
  };

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    if (autoCalc?.target && autoCalc?.formula) {
      const val = computeAutoValue(autoCalc.formula, updated, autoCalc.precision || 2);
      if (val !== null) updated[autoCalc.target] = val;
    }
    setForm(updated);
  };

  const handleSave = async () => {
    try {
      if (requiredField && !form[requiredField]) {
        setMessage(`${tUi(requiredField.replaceAll("_", " "), isRTL)} required!`);
        return;
      }
      if (editId) {
        await axios.put(`${API_BASE}/${endpoint}/${editId}`, form);
        setMessage(`${tUi(title, isRTL)} updated!`);
      } else {
        await axios.post(`${API_BASE}/${endpoint}`, form);
        setMessage(`${tUi(title, isRTL)} saved!`);
      }
      setForm(initialForm);
      setEditId(null);
      fetchAll();
    } catch (error) {
      setMessage(error?.response?.data?.error || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(tUi("Delete karna chahte ho?", isRTL))) return;
    await axios.delete(`${API_BASE}/${endpoint}/${id}`);
    fetchAll();
  };

  const handleEdit = (row) => {
    const next = fields.reduce((acc, f) => {
      acc[f.name] = normalizeInputValue(row[f.name], f.type);
      return acc;
    }, {});
    setForm(next);
    setEditId(row.id);
    setMessage(tUi("Edit mode enabled", isRTL));
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm(initialForm);
    setMessage("");
  };

  const filtered = records.filter((row) =>
    (searchFields || fields.map((f) => f.name)).some((key) =>
      String(row[key] || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-blue-400" /> {tUi(title, isRTL)}
          </h1>
          <span className="text-xs text-slate-400 bg-white/10 px-2 py-1 rounded">{tUi("New Entry", isRTL)}</span>
        </div>
        <div className="p-6">
          {message && (
            <div className="mb-4 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded">
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  {tLabel(f.label, isRTL)}{f.readOnly ? ` - ${tUi("Auto", isRTL)}` : ""}
                </label>
                {f.type === "dropdown" ? (
                  <select
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm"
                  >
                    <option value="">{`-- ${tUi("Select", isRTL)} ${tLabel(f.label, isRTL)} --`}</option>
                    {(dropdownData[f.name] || []).map((item) => (
                      <option key={item[f.valueKey]} value={item[f.valueKey]}>
                        {tValue(item[f.labelKey], isRTL)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type || "text"}
                    value={form[f.name]}
                    onChange={handleChange}
                    readOnly={!!f.readOnly}
                    className={`w-full px-3 py-2.5 rounded border outline-none text-sm ${
                      f.readOnly
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold cursor-not-allowed"
                        : "border-slate-300 focus:border-blue-500"
                    }`}
                    placeholder={tLabel(f.placeholder || f.label, isRTL)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            {editId && (
              <button onClick={handleCancelEdit} className="mr-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded shadow flex items-center gap-2 font-medium text-sm">
                {tUi("Cancel", isRTL)}
              </button>
            )}
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded shadow-lg flex items-center gap-2 font-medium text-sm">
              <Save size={16} /> {editId ? tUi("Update", isRTL) : tUi("Save", isRTL)}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700 text-sm uppercase">
            {tUi("Records", isRTL)} <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{filtered.length}</span>
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
              placeholder={tUi("Search...", isRTL)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                {tableFields.map((f) => (
                  <th key={f.name} className="px-4 py-3 text-left">{tLabel(f.label, isRTL)}</th>
                ))}
                <th className="px-4 py-3 text-center">{tUi("Actions", isRTL)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, i) => (
                <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  {tableFields.map((f) => (
                    <td key={f.name} className="px-4 py-3 text-slate-700">{tValue(row[f.name], isRTL)}</td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(row)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded transition mr-1">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={tableFields.length + 2} className="px-6 py-8 text-center text-slate-400 text-sm">
                    {tUi("Koi record nahi mila", isRTL)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesCrudPageWithDropdown;
