import React, { useState, useEffect } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Retailer Management",
    subtitle: "Manage your retail network",
    addBtn: "Add Retailer",
    searchPlaceholder: "Search by shop, owner, city or zone…",
    shopName: "Shop Name",
    ownerName: "Owner Name",
    contact: "Contact",
    city: "City",
    zone: "Zone",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    printSlip: "Print Slip",
    noRecords: "No retailers found.",
    toggleLang: "اردو",
    status: "Status",
    active: "Active",
    actions: "Actions",
    loading: "Loading retailers...",
    errorMsg: "Shop Name and Owner Name are required.",
    successSave: "Retailer saved successfully!",
    deleteConfirm: "Are you sure you want to delete this retailer?",
    // slip
    slipTitle: "Retailer Profile Slip",
    slipShop: "Shop Name",
    slipOwner: "Owner Name",
    slipContact: "Contact",
    slipCity: "City",
    slipZone: "Zone",
    slipDate: "Date",
    slipThank: "Registered Retailer — Keep this slip safe.",
  },
  ur: {
    title: "ریٹیلر کا انتظام",
    subtitle: "اپنے ریٹیل نیٹ ورک کا ریکارڈ رکھیں",
    addBtn: "ریٹیلر شامل کریں",
    searchPlaceholder: "دکان، مالک، شہر یا زون سے تلاش کریں…",
    shopName: "دکان کا نام",
    ownerName: "مالک کا نام",
    contact: "رابطہ",
    city: "شہر",
    zone: "زون",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    printSlip: "سلپ پرنٹ کریں",
    noRecords: "کوئی ریٹیلر نہیں ملا۔",
    toggleLang: "English",
    status: "حالت",
    active: "فعال",
    actions: "اقدامات",
    loading: "ریٹیلرز کا ڈیٹا لوڈ ہو رہا ہے...",
    errorMsg: "دکان اور مالک کا نام درکار ہے۔",
    successSave: "ریٹیلر کا ریکارڈ محفوظ ہو گیا!",
    deleteConfirm: "کیا آپ واقعی اس ریٹیلر کو حذف کرنا چاہتے ہیں؟",
    // slip
    slipTitle: "ریٹیلر پروفائل سلپ",
    slipShop: "دکان کا نام",
    slipOwner: "مالک کا نام",
    slipContact: "رابطہ",
    slipCity: "شہر",
    slipZone: "زون",
    slipDate: "تاریخ",
    slipThank: "رجسٹرڈ ریٹیلر — یہ سلپ محفوظ رکھیں۔",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/retailers`;

// ─────────────────────────────────────────────────────────────────
// PRINT SLIP
// ─────────────────────────────────────────────────────────────────
function printSlip(retailer, lang) {
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const font = isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif";

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      <meta charset="UTF-8"/>
      <title>${t.slipTitle}</title>
      ${isUrdu ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">` : ""}
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${font}; background: #fff; color: #0f172a; padding: 40px; }
        .slip { max-width: 440px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 14px; overflow: hidden; }
        .header { background: #7c3aed; color: #fff; padding: 24px; text-align: center; }
        .header img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid #c4b5fd; }
        .header h1 { font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: #c4b5fd; margin: 0; }
        .header h2 { font-size: 15px; color: #fff; font-weight: normal; margin: 5px 0 0 0; }
        .header p { font-size: 11px; margin-top: 5px; opacity: 0.7; color: #fff;}
        .badge-wrap { display: flex; justify-content: center; padding: 20px 28px 4px; }
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #7c3aed; border: 3px solid #c4b5fd; }
        .body { padding: 16px 28px 28px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: bold; color: #0f172a; }
        .zone-badge { display: inline-block; background: #ede9fe; color: #7c3aed; padding: 3px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; }
        .footer { text-align: center; padding: 14px; background: #f8fafc; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="slip">
        <div class="header">
          <img src="https://ui-avatars.com/api/?name=Ali+Cage&background=c4b5fd&color=0f172a&rounded=true&bold=true" alt="Ali Cage Logo" />
          <h1>Ali Cage</h1>
          <h2>${t.slipTitle}</h2>
          <p>${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</p>
        </div>
        <div class="badge-wrap">
          <div class="avatar">🏪</div>
        </div>
        <div class="body">
          <div class="row">
            <span class="label">${t.slipShop}</span>
            <span class="value">${retailer.shop_name}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipOwner}</span>
            <span class="value">${retailer.owner_name || "—"}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipContact}</span>
            <span class="value" style="font-family: monospace;">${retailer.contact || "—"}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipCity}</span>
            <span class="value">${retailer.city || "—"}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipZone}</span>
            <span class="value"><span class="zone-badge">${retailer.zone || "—"}</span></span>
          </div>
          <div class="row">
            <span class="label">${t.slipDate}</span>
            <span class="value">${new Date().toLocaleDateString(isUrdu ? "ur-PK" : "en-PK")}</span>
          </div>
        </div>
        <div class="footer">${t.slipThank}</div>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 300); }</script>
    </body>
    </html>
  `;

  const w = window.open("", "_blank", "width=520,height=760");
  w.document.write(html);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const RetailerPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({ shop_name: "", owner_name: "", contact: "", city: "", zone: "" });

  // ── Fetch Data from API ──
  useEffect(() => {
    fetchRetailers();
  }, []);

  const fetchRetailers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setRetailers(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("error", "Server connection error!");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const openAdd = () => {
    setForm({ shop_name: "", owner_name: "", contact: "", city: "", zone: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({ 
      shop_name: r.shop_name, 
      owner_name: r.owner_name || "", 
      contact: r.contact || "", 
      city: r.city || "", 
      zone: r.zone || "" 
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  // ── Save Data to API ──
  const handleSave = async () => {
    if (!form.shop_name.trim() || !form.owner_name.trim()) {
      showToast("error", t.errorMsg);
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/${editingId}`, form);
        showToast("success", t.successSave);
      } else {
        await axios.post(API_BASE, form);
        showToast("success", t.successSave);
      }
      fetchRetailers();
      setShowForm(false);
    } catch (err) {
      console.error("Save error:", err);
      showToast("error", "Error saving record! Check Node.js console.");
    }
  };

  // ── Delete Data from API ──
  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await axios.delete(`${API_BASE}/${id}`);
      fetchRetailers();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", "Error deleting record!");
    }
  };

  const filtered = retailers.filter((r) =>
    [r.shop_name, r.owner_name, r.city, r.zone].some((v) =>
      (v || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const formFields = [
    { key: "shop_name",  label: t.shopName,  icon: "bi-shop",      type: "text" },
    { key: "owner_name", label: t.ownerName, icon: "bi-person",    type: "text" },
    { key: "contact",    label: t.contact,   icon: "bi-telephone", type: "text" },
    { key: "city",       label: t.city,      icon: "bi-geo-alt",   type: "text" },
    { key: "zone",       label: t.zone,      icon: "bi-hexagon",   type: "text" },
  ];

  return (
    <div dir={dir} style={{ fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Georgia', serif" }} className="min-h-screen bg-slate-50 p-6 pb-20">
      
      {/* CDN Links */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" />
      {isUrdu && <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet" />}

      {/* Floating Toast Message */}
      {message.text && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <i className={`bi ${message.type === 'error' ? 'bi-exclamation-triangle' : 'bi-check-circle'}`}></i>
          {message.text}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setLang(lang === "en" ? "ur" : "en")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition">
            <i className="bi bi-translate"></i>{t.toggleLang}
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition shadow">
            <i className="bi bi-shop"></i>{t.addBtn}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* ── Search ── */}
        <div className="relative mb-6 max-w-sm">
          <i className={`bi bi-search absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
          />
        </div>

        {/* ── Modal Form ── */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir={dir}>
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <i className="bi bi-shop text-violet-600 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <div className="space-y-4">
                {formFields.map(({ key, label, icon, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{label} {(key === 'shop_name' || key === 'owner_name') && '*'}</label>
                    <div className="relative">
                      <i className={`bi ${icon} absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"} ${type === 'number' ? 'font-mono' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={`flex gap-3 mt-6 pt-4 border-t border-slate-100 ${isUrdu ? "flex-row-reverse" : ""}`}>
                <button onClick={handleSave} className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-700 transition shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2">
                  <i className="bi bi-save"></i> {t.save}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition bg-white">
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"} w-12`}>#</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.shopName}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.ownerName}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.contact}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.city}</th>
                  <th className="px-5 py-3 text-center">{t.zone}</th>
                  <th className="px-5 py-3 text-center">{t.status}</th>
                  <th className="px-5 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-violet-50 transition">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>

                      {/* Shop Name with avatar */}
                      <td className="px-5 py-3.5">
                        <div className={`flex items-center gap-2.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <i className="bi bi-shop text-violet-500 text-sm"></i>
                          </div>
                          <span className="font-semibold text-slate-800">{r.shop_name}</span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-slate-700 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-person text-slate-400 text-xs"></i>
                          {r.owner_name || "—"}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-slate-600 font-mono text-xs ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-telephone text-slate-400"></i>
                          {r.contact || "—"}
                        </span>
                      </td>

                      {/* City */}
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-slate-600 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-geo-alt text-slate-400 text-xs"></i>
                          {r.city || "—"}
                        </span>
                      </td>

                      {/* Zone */}
                      <td className="px-5 py-3.5 text-center">
                        {r.zone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-600">
                            <i className="bi bi-hexagon text-xs"></i>
                            {r.zone}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          {t.active}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className={`flex items-center justify-center gap-1.5 flex-wrap ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <button onClick={() => openEdit(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition">
                            <i className="bi bi-trash3"></i>
                          </button>
                          <button onClick={() => printSlip(r, lang)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition shadow-sm">
                            <i className="bi bi-printer"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
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

export default RetailerPage;