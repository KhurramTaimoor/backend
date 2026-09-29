import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Save, Trash2, Plus, Search, Edit } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { tUi, tValue } from "../utils/uiI18n";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api`;

const ROLE_OPTIONS = ["Admin", "Manager", "Employee"];
const ACCESS_OPTIONS = ["Read", "Read/Write", "Read/Write/Delete"];

const PermissionsPage = () => {
  const outlet = useOutletContext() || {};
  const isRTL = !!outlet.isRTL;
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    role: "",
    access_level: "",
    module_access: "",
    username: "",
    email: "",
    password: "",
    status: "active",
  });

  const fetchAll = async () => {
    const [usersRes, recordsRes] = await Promise.all([
      axios.get(`${API_BASE}/permissions/users`),
      axios.get(`${API_BASE}/permissions`),
    ]);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
  };

  useEffect(() => {
    fetchAll().catch((err) => setMessage(err?.response?.data?.error || "Load failed"));
  }, []);

  const handleSave = async () => {
    if (!form.employee_id || !form.role || !form.access_level || !form.module_access.trim()) {
      setMessage(tUi("User, role, access level aur module access required hain.", isRTL));
      return;
    }
    if (!editId && (!form.username.trim() || !form.password)) {
      setMessage(tUi("New user ke liye username aur password required hain.", isRTL));
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API_BASE}/permissions/${editId}`, form);
        setMessage(tUi("User Permissions", isRTL) + " updated!");
      } else {
        await axios.post(`${API_BASE}/permissions`, form);
        setMessage(tUi("Permission saved!", isRTL));
      }
      setForm({ employee_id: "", role: "", access_level: "", module_access: "", username: "", email: "", password: "", status: "active" });
      setEditId(null);
      fetchAll();
    } catch (error) {
      setMessage(error?.response?.data?.error || "Save failed");
    }
  };

  const handleEdit = (row) => {
    setForm({
      employee_id: String(row.employee_id || ""),
      role: row.role || "",
      access_level: row.access_level || "",
      module_access: row.module_access || "",
      username: row.username || "",
      email: row.email || "",
      password: "",
      status: row.status || "active",
    });
    setEditId(row.id);
    setMessage(tUi("Edit mode enabled", isRTL));
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm({ employee_id: "", role: "", access_level: "", module_access: "", username: "", email: "", password: "", status: "active" });
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm(tUi("Delete karna chahte ho?", isRTL))) return;
    try {
      await axios.delete(`${API_BASE}/permissions/${id}`);
      fetchAll();
    } catch (error) {
      setMessage(error?.response?.data?.error || "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return records.filter((r) =>
      [r.user_name, r.role, r.access_level, r.module_access]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(s))
    );
  }, [records, search]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-blue-400" /> {tUi("User Permissions", isRTL)}
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
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Select User", isRTL)}</label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">{tUi("Select User", isRTL)}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {tValue(u.full_name, isRTL)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Role", isRTL)}</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">{tUi("Select Role", isRTL)}</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {tValue(role, isRTL)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                {tUi("Access Level (Read/Write/Delete)", isRTL)}
              </label>
              <select
                value={form.access_level}
                onChange={(e) => setForm({ ...form, access_level: e.target.value })}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm"
              >
                <option value="">{tUi("Select Access Level", isRTL)}</option>
                {ACCESS_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {tValue(level, isRTL)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Module Access", isRTL)}</label>
              <input
                type="text"
                value={form.module_access}
                onChange={(e) => setForm({ ...form, module_access: e.target.value })}
                placeholder={tUi("e.g. Inventory, Sales, HR", isRTL)}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Login Username", isRTL)}</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={tUi("e.g. ali.sales", isRTL)} className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Login Email (optional)", isRTL)}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com" className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi(editId ? "New Password (leave blank to keep old)" : "Login Password", isRTL)}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{tUi("Login Status", isRTL)}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm">
                <option value="active">{tUi("Active", isRTL)}</option>
                <option value="inactive">{tUi("Inactive", isRTL)}</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            {editId && (
              <button
                onClick={handleCancelEdit}
                className="mr-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded shadow flex items-center gap-2 font-medium text-sm"
              >
                {tUi("Cancel", isRTL)}
              </button>
            )}
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded shadow-lg flex items-center gap-2 font-medium text-sm"
            >
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
                <th className="px-4 py-3 text-left">{tUi("Select User", isRTL)}</th>
                <th className="px-4 py-3 text-left">{tUi("Role", isRTL)}</th>
                <th className="px-4 py-3 text-left">{tUi("Access Level", isRTL)}</th>
                <th className="px-4 py-3 text-left">{tUi("Module Access", isRTL)}</th>
                <th className="px-4 py-3 text-left">{tUi("Username", isRTL)}</th>
                <th className="px-4 py-3 text-left">{tUi("Status", isRTL)}</th>
                <th className="px-4 py-3 text-center">{tUi("Actions", isRTL)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, i) => (
                <tr key={row.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">{tValue(row.user_name, isRTL)}</td>
                  <td className="px-4 py-3">{tValue(row.role, isRTL)}</td>
                  <td className="px-4 py-3">{tValue(row.access_level, isRTL)}</td>
                  <td className="px-4 py-3">{tValue(row.module_access, isRTL)}</td>
                  <td className="px-4 py-3"><b>{row.username || "—"}</b>{row.email && <div className="text-[11px] text-slate-400">{row.email}</div>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === "inactive" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{row.status || "active"}</span></td>
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
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400 text-sm">
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

export default PermissionsPage;
