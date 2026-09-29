import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Search, Edit, Trash2, FileText, Plus, Printer, Download, ChevronDown, X, Check } from 'lucide-react';
import { escapeHtml, openUnicodePrint, printableText } from '../utils/unicodePrint';

// ─── Default dropdown options ─────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  'product type': [
    { label: 'Raw Material (RMS)',  code: 'RMS' },
    { label: 'Fitting (FTM)',       code: 'FTM' },
    { label: 'Paint (PNT)',         code: 'PNT' },
    { label: 'Packing (Pkg)',       code: 'Pkg' },
    { label: 'Finish Good (FMS)',   code: 'FMS' },
  ],
  'unit': [
    { label: 'Kilogram (kg)',  code: 'kg'  },
    { label: 'Gram (g)',       code: 'g'   },
    { label: 'Piece (pcs)',    code: 'pcs' },
    { label: 'Meter (m)',      code: 'm'   },
    { label: 'Liter (ltr)',    code: 'ltr' },
    { label: 'Box',            code: 'box' },
    { label: 'Dozen',          code: 'dz'  },
    { label: 'Set',            code: 'set' },
  ],
  'category': [
    { label: 'Raw Material',  code: 'RM' },
    { label: 'Spare Parts',   code: 'SP' },
    { label: 'Consumable',    code: 'CS' },
    { label: 'Finished Item', code: 'FI' },
    { label: 'Packaging',     code: 'PK' },
  ],
  'symbol (e.g., kg, pcs)': [
    { label: 'kg',  code: 'kg'  },
    { label: 'g',   code: 'g'   },
    { label: 'pcs', code: 'pcs' },
    { label: 'm',   code: 'm'   },
    { label: 'ltr', code: 'ltr' },
    { label: 'box', code: 'box' },
    { label: 'dz',  code: 'dz'  },
  ],
  'short code (e.g. rms, ftm, pnt, pkg, fms)': [
    { label: 'RMS', code: 'RMS' },
    { label: 'FTM', code: 'FTM' },
    { label: 'PNT', code: 'PNT' },
    { label: 'Pkg', code: 'Pkg' },
    { label: 'FMS', code: 'FMS' },
  ],
  'status': [
    { label: 'Pending',   code: 'PND' },
    { label: 'Confirmed', code: 'CNF' },
    { label: 'Delivered', code: 'DLV' },
    { label: 'Cancelled', code: 'CXL' },
  ],
  'type (asset/liability)': [
    { label: 'Asset',     code: 'AST' },
    { label: 'Liability', code: 'LIB' },
    { label: 'Equity',    code: 'EQT' },
    { label: 'Revenue',   code: 'REV' },
    { label: 'Expense',   code: 'EXP' },
  ],
  'access level (read/write/delete)': [
    { label: 'Read Only',    code: 'R'   },
    { label: 'Read & Write', code: 'RW'  },
    { label: 'Full Access',  code: 'RWD' },
  ],
  'role': [
    { label: 'Admin',    code: 'ADM' },
    { label: 'Manager',  code: 'MGR' },
    { label: 'Employee', code: 'EMP' },
  ],
  'rate type': [
    { label: 'Per Hour', code: 'HR'  },
    { label: 'Per Day',  code: 'DAY' },
    { label: 'Per Unit', code: 'UNT' },
    { label: 'Monthly',  code: 'MON' },
  ],
  'report type (salary/attendance)': [
    { label: 'Salary Report',     code: 'SAL' },
    { label: 'Attendance Report', code: 'ATT' },
    { label: 'Leave Report',      code: 'LVE' },
  ],
  'decimal places': [
    { label: '0 — No decimal',  code: '0' },
    { label: '2 — e.g. 1.25',  code: '2' },
    { label: '3 — e.g. 1.250', code: '3' },
  ],
  'warehouse': [
    { label: 'Main Warehouse', code: 'MW' },
    { label: 'Store A',        code: 'SA' },
    { label: 'Store B',        code: 'SB' },
  ],
  'department': [
    { label: 'Production', code: 'PRD' },
    { label: 'Sales',      code: 'SLS' },
    { label: 'Accounts',   code: 'ACC' },
    { label: 'HR',         code: 'HR'  },
    { label: 'Admin',      code: 'ADM' },
  ],
};

// ─── Detect dropdown field ────────────────────────────────────────────────────
const getDropdownKey = (field) => {
  const f = field.toLowerCase().trim();
  for (const key of Object.keys(DEFAULT_OPTIONS)) {
    if (f === key || f === key.split(' ')[0] || f.startsWith(key) || f.includes(key)) {
      return key;
    }
  }
  return null;
};

// ─── Detect PKR field ─────────────────────────────────────────────────────────
const isPKRField = (field) => {
  const f = field.toLowerCase();
  return (
    f.includes('pkr')      || f.includes('rate')    || f.includes('amount') ||
    f.includes('salary')   || f.includes('balance') || f.includes('price')  ||
    f.includes('cost')     || f.includes('debit')   || f.includes('credit') ||
    f.includes('cash in')  || f.includes('cash out')|| f.includes('total')  ||
    f.includes('limit')    || f.includes('commission')
  );
};

// ─── Smart Dropdown ───────────────────────────────────────────────────────────
const SmartDropdown = ({ field, placeholder }) => {
  const dropdownKey = getDropdownKey(field);
  const [options, setOptions]     = useState(DEFAULT_OPTIONS[dropdownKey] || []);
  const [selected, setSelected]   = useState(null);
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [newItem, setNewItem]     = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newItem.trim()) return;
    const entry = {
      label: newItem.trim(),
      code: newItem.trim().toUpperCase().replace(/\s+/g, '').slice(0, 6),
    };
    setOptions(prev => [...prev, entry]);
    setSelected(entry);
    setNewItem('');
    setAddingNew(false);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded border text-sm transition-all
          ${open
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-white'
          }
          ${selected ? 'text-slate-800' : 'text-slate-400'}`}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                {selected.code}
              </span>
              {selected.label}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selected && (
            <span
              onClick={(e) => { e.stopPropagation(); setSelected(null); }}
              className="text-slate-300 hover:text-red-400 transition cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-400 bg-white"
                placeholder="Search options..."
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelected(opt); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors
                    ${selected?.code === opt.code ? 'bg-blue-50' : ''}`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono min-w-[36px] text-center
                    ${selected?.code === opt.code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {opt.code}
                  </span>
                  <span className={`flex-1 ${selected?.code === opt.code ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                  {selected?.code === opt.code && <Check size={13} className="text-blue-600 shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-5 text-xs text-slate-400 text-center">
                No results for "<span className="font-medium text-slate-600">{search}</span>"
              </div>
            )}
          </div>

          {/* Add New */}
          <div className="border-t border-slate-100 p-2 bg-slate-50">
            {addingNew ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setAddingNew(false); setNewItem(''); }
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                  placeholder="Type new option name..."
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Check size={12} /> Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingNew(false); setNewItem(''); }}
                  className="px-2.5 py-1.5 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingNew(true)}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-100 rounded transition font-semibold"
              >
                <Plus size={12} /> Add New Option
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PKR Input ────────────────────────────────────────────────────────────────
const PKRInput = () => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 select-none pointer-events-none">
      PKR
    </span>
    <input
      type="number"
      min="0"
      step="0.01"
      className="w-full pl-12 pr-4 py-2.5 rounded border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition text-sm text-slate-700 bg-slate-50 focus:bg-white font-mono"
      placeholder="0.00"
    />
  </div>
);

// ─── Main GenericPage ─────────────────────────────────────────────────────────
const GenericPage = ({ title, inputs = [], isReport = false }) => {
  const { t, isRTL } = useOutletContext();

  const handlePrint = () => window.print();

  const handlePDF = () => {
    const headers = inputs.map((field) => `<th>${printableText(field)}</th>`).join('');
    const values = inputs
      .map((field) => `<td>${printableText(isPKRField(field) ? 'PKR 0.00' : 'Sample Data')}</td>`)
      .join('');
    openUnicodePrint({
      title,
      dir: isRTL ? 'rtl' : 'ltr',
      lang: isRTL ? 'ur' : 'en',
      pageSize: 'A4 landscape',
      bodyHtml: `<div class="pdf-hint">${isRTL ? 'پی ڈی ایف کے لیے Save as PDF منتخب کریں۔' : 'Choose Save as PDF in the print dialog.'}</div><main class="generic-report"><h1>${printableText(title)}</h1><table><thead><tr>${headers}</tr></thead><tbody><tr>${values}</tr></tbody></table></main>`,
      styles: `.generic-report h1{font-size:20px;color:#13263A;margin:0 0 14px}.generic-report table{width:100%;border-collapse:collapse;font-size:10px}.generic-report th{background:#0C2134;color:#fff;padding:8px;text-align:${isRTL ? 'right' : 'left'}}.generic-report td{border:1px solid #CBD5E1;padding:8px}`
    });
  };

  const renderField = (field, idx) => {
    if (getDropdownKey(field)) {
      return <SmartDropdown key={idx} field={field} placeholder={`Select ${field}`} />;
    }
    if (isPKRField(field)) {
      return <PKRInput key={idx} />;
    }
    return (
      <input
        key={idx}
        type={field.toLowerCase().includes('date') ? 'date' : 'text'}
        className="w-full px-4 py-2.5 rounded border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm text-slate-700 bg-slate-50 focus:bg-white"
        placeholder={field}
      />
    );
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto print:w-full print:max-w-none">

      {/* ── FORM ── */}
      {!isReport && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-visible print:hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center text-white rounded-t-lg">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Plus size={18} className="text-blue-400" /> {title}
            </h1>
            <span className="text-xs text-slate-400 bg-white/10 px-2 py-1 rounded">
              {isRTL ? 'نیا ریکارڈ' : 'New Entry'}
            </span>
          </div>
          <div className="p-6">
            <div className={`grid gap-5 md:grid-cols-${inputs.length > 3 ? '4' : '3'} sm:grid-cols-2`}>
              {inputs.map((field, idx) => (
                <div key={idx} className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">
                    {field}
                  </label>
                  {renderField(field, idx)}
                </div>
              ))}
            </div>
            <div className={`mt-6 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded shadow-lg shadow-blue-500/20 transition flex items-center gap-2 font-medium text-sm">
                <Save size={16} /> {t.save || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE ── */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            {isReport && <FileText size={20} className="text-blue-600" />}
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
              {isReport ? title : (t.records || 'Records')}
            </h3>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className={`absolute top-2.5 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} size={14} />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-300 text-xs focus:outline-none focus:border-blue-500 transition-all"
                placeholder={t.search || 'Search...'}
              />
            </div>
            <div className="flex gap-1 border-l border-slate-300 pl-3">
              <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded" title="Print">
                <Printer size={18} />
              </button>
              <button onClick={handlePDF} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="PDF">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-6 text-center">
          <h2 className="text-2xl font-bold">Cage Master</h2>
          <p className="text-sm text-slate-500">{title} Report</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-xs">
              <tr>
                {inputs.map((f, i) => (
                  <th key={i} className={`px-6 py-3 border-b border-slate-200 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    {f}
                  </th>
                ))}
                {!isReport && (
                  <th className="px-6 py-3 border-b border-slate-200 text-center print:hidden">
                    {t.actions || 'Action'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr className="hover:bg-blue-50 transition-colors group">
                {inputs.map((col, j) => (
                  <td key={j} className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {j === 0
                      ? <span className="font-medium text-slate-900">Sample Data</span>
                      : isPKRField(col)
                        ? <span className="font-mono text-emerald-700 font-semibold text-xs">PKR 0.00</span>
                        : getDropdownKey(col)
                          ? <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">—</span>
                          : <span className="text-slate-400 text-xs">—</span>
                    }
                  </td>
                ))}
                {!isReport && (
                  <td className="px-6 py-3 text-center print:hidden">
                    <div className="flex justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button className="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition"><Edit size={14} /></button>
                      <button className="text-red-500 hover:bg-red-100 p-1.5 rounded transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GenericPage;