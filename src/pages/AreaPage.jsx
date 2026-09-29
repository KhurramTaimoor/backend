import React, { useState, useEffect } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────
// LANGUAGE STRINGS
// ─────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "Area Configuration",
    subtitle: "Manage your sales areas and regions",
    addBtn: "Add Area",
    searchPlaceholder: "Search by area, city or region code…",
    areaName: "Area Name",
    city: "City",
    regionCode: "Region Code",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    printSlip: "Print Slip",
    noRecords: "No areas found.",
    toggleLang: "اردو",
    status: "Status",
    active: "Active",
    actions: "Actions",
    loading: "Loading areas...",
    errorMsg: "Area Name is required.",
    successSave: "Area saved successfully!",
    deleteConfirm: "Are you sure you want to delete this area?",
    // slip
    slipTitle: "Area Configuration Slip",
    slipArea: "Area Name",
    slipCity: "City",
    slipRegion: "Region Code",
    slipDate: "Date",
    slipThank: "Registered Area — Keep this slip safe.",
  },
  ur: {
    title: "علاقہ کنفیگریشن",
    subtitle: "اپنے سیلز علاقوں اور خطوں کا انتظام کریں",
    addBtn: "علاقہ شامل کریں",
    searchPlaceholder: "علاقہ، شہر یا ریجن کوڈ سے تلاش کریں…",
    areaName: "علاقے کا نام",
    city: "شہر",
    regionCode: "ریجن کوڈ",
    save: "محفوظ کریں",
    cancel: "منسوخ",
    edit: "ترمیم",
    delete: "حذف",
    printSlip: "سلپ پرنٹ کریں",
    noRecords: "کوئی علاقہ نہیں ملا۔",
    toggleLang: "English",
    status: "حالت",
    active: "فعال",
    actions: "اقدامات",
    loading: "علاقوں کا ڈیٹا لوڈ ہو رہا ہے...",
    errorMsg: "علاقے کا نام درکار ہے۔",
    successSave: "علاقہ کامیابی سے محفوظ ہو گیا!",
    deleteConfirm: "کیا آپ واقعی اس علاقے کو حذف کرنا چاہتے ہیں؟",
    // slip
    slipTitle: "علاقہ کنفیگریشن سلپ",
    slipArea: "علاقے کا نام",
    slipCity: "شہر",
    slipRegion: "ریجن کوڈ",
    slipDate: "تاریخ",
    slipThank: "رجسٹرڈ علاقہ — یہ سلپ محفوظ رکھیں۔",
  },
};

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/areas`;

// ─────────────────────────────────────────────────────────────────
// PRINT SLIP
// ─────────────────────────────────────────────────────────────────
function printSlip(area, lang) {
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
        .header { background: #0e7490; color: #fff; padding: 24px; text-align: center; }
        .header img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid #cffafe; }
        .header h1 { font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: #cffafe; margin: 0; }
        .header h2 { font-size: 15px; color: #fff; font-weight: normal; margin: 5px 0 0 0; }
        .header p { font-size: 11px; margin-top: 5px; opacity: 0.7; color: #fff;}
        .badge-wrap { display: flex; justify-content: center; padding: 20px 28px 4px; }
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: #cffafe; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #0e7490; border: 3px solid #a5f3fc; }
        .body { padding: 16px 28px 28px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: bold; color: #0f172a; }
        .code-badge { display: inline-block; background: #cffafe; color: #0e7490; padding: 3px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; font-family: monospace; letter-spacing: 1px; }
        .footer { text-align: center; padding: 14px; background: #f8fafc; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="slip">
        <div class="header">
          <img src="https://ui-avatars.com/api/?name=Ali+Cage&background=cffafe&color=0e7490&rounded=true&bold=true" alt="Ali Cage Logo" />
          <h1>Ali Cage</h1>
          <h2>${t.slipTitle}</h2>
          <p>${new Date().toLocaleString(isUrdu ? "ur-PK" : "en-PK")}</p>
        </div>
        <div class="badge-wrap">
          <div class="avatar">🗺️</div>
        </div>
        <div class="body">
          <div class="row">
            <span class="label">${t.slipArea}</span>
            <span class="value">${area.area_name}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipCity}</span>
            <span class="value">${area.city || "—"}</span>
          </div>
          <div class="row">
            <span class="label">${t.slipRegion}</span>
            <span class="value"><span class="code-badge">${area.region_code || "—"}</span></span>
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

  const w = window.open("", "_blank", "width=520,height=720");
  w.document.write(html);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const AreaPage = () => {
  const [lang, setLang] = useState("en");
  const t = LANG[lang];
  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({ area_name: "", city: "", region_code: "" });

  // ── Fetch Data from API ──
  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setAreas(res.data);
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
    setForm({ area_name: "", city: "", region_code: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setForm({ 
      area_name: a.area_name, 
      city: a.city || "", 
      region_code: a.region_code || "" 
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  // ── Save Data to API ──
  const handleSave = async () => {
    if (!form.area_name.trim()) {
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
      fetchAreas();
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
      fetchAreas();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", "Error deleting record!");
    }
  };

  const filtered = areas.filter((a) =>
    [a.area_name, a.city, a.region_code].some((v) =>
      (v || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const formFields = [
    { key: "area_name",   label: t.areaName,   icon: "bi-map",         type: "text" },
    { key: "city",        label: t.city,       icon: "bi-geo-alt",     type: "text" },
    { key: "region_code", label: t.regionCode, icon: "bi-upc-scan",    type: "text" },
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
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 transition shadow">
            <i className="bi bi-pin-map-fill"></i>{t.addBtn}
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
            className={`w-full border border-slate-200 rounded-lg py-2.5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-sm ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
          />
        </div>

        {/* ── Modal Form ── */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir={dir}>
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                  <i className="bi bi-pin-map-fill text-cyan-600 text-lg"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? t.edit : t.addBtn}
                </h2>
              </div>

              <div className="space-y-4">
                {formFields.map(({ key, label, icon, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{label} {key === 'area_name' && '*'}</label>
                    <div className="relative">
                      <i className={`bi ${icon} absolute top-1/2 -translate-y-1/2 text-slate-400 ${isUrdu ? "right-3" : "left-3"}`}></i>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className={`w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${isUrdu ? "pr-9 pl-3 text-right" : "pl-9 pr-3"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={`flex gap-3 mt-6 pt-4 border-t border-slate-100 ${isUrdu ? "flex-row-reverse" : ""}`}>
                <button onClick={handleSave} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-cyan-700 transition shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2">
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
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.areaName}</th>
                  <th className={`px-5 py-3 ${isUrdu ? "text-right" : "text-left"}`}>{t.city}</th>
                  <th className="px-5 py-3 text-center">{t.regionCode}</th>
                  <th className="px-5 py-3 text-center">{t.status}</th>
                  <th className="px-5 py-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      <i className="bi bi-arrow-repeat animate-spin text-2xl"></i><p className="mt-2">{t.loading}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">{t.noRecords}</td>
                  </tr>
                ) : (
                  filtered.map((a, i) => (
                    <tr key={a.id} className="hover:bg-cyan-50 transition">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{i + 1}</td>

                      {/* Area Name with avatar */}
                      <td className="px-5 py-3.5">
                        <div className={`flex items-center gap-2.5 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                            <i className="bi bi-map text-cyan-600 text-sm"></i>
                          </div>
                          <span className="font-semibold text-slate-800">{a.area_name}</span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-slate-600 ${isUrdu ? "flex-row-reverse" : ""}`}>
                          <i className="bi bi-geo-alt text-slate-400 text-xs"></i>
                          {a.city || "—"}
                        </span>
                      </td>

                      {/* Region Code */}
                      <td className="px-5 py-3.5 text-center">
                        {a.region_code ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-cyan-50 text-cyan-700 font-mono tracking-widest border border-cyan-200">
                            <i className="bi bi-upc-scan text-xs"></i>
                            {a.region_code}
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
                          <button onClick={() => openEdit(a)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition">
                            <i className="bi bi-trash3"></i>
                          </button>
                          <button onClick={() => printSlip(a, lang)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition shadow-sm">
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

export default AreaPage;