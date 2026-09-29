import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer, Download, Search, Filter, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { escapeHtml, openUnicodePrint, printableText } from '../utils/unicodePrint';

const LedgerPage = ({ title, entityName }) => {
  const { t, isRTL } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');

  // --- MOCK DATA (In real app, fetch from API) ---
  const initialData = [
    { id: 1, date: '2023-10-01', desc: 'Opening Balance', ref: '-', debit: 0, credit: 0, type: 'OPEN' },
    { id: 2, date: '2023-10-05', desc: 'Invoice #1001 - Sales', ref: 'INV-1001', debit: 50000, credit: 0, type: 'DR' },
    { id: 3, date: '2023-10-10', desc: 'Cash Received', ref: 'CRV-202', debit: 0, credit: 20000, type: 'CR' },
    { id: 4, date: '2023-10-12', desc: 'Goods Returned', ref: 'RET-005', debit: 0, credit: 5000, type: 'CR' },
    { id: 5, date: '2023-10-15', desc: 'Invoice #1005 - Sales', ref: 'INV-1005', debit: 75000, credit: 0, type: 'DR' },
  ];

  // --- LOGIC: Calculate Running Balance ---
  let runningBalance = 0;
  const ledgerData = initialData.map(row => {
    runningBalance = runningBalance + row.debit - row.credit;
    return { ...row, balance: runningBalance };
  });

  // --- FUNCTION: Print ---
  const handlePrint = () => {
    window.print();
  };

  // --- FUNCTION: Export PDF ---
  const handleDownloadPDF = () => {
    const rows = ledgerData.map((row) => `<tr>
      <td class="ltr-text">${escapeHtml(row.date)}</td>
      <td>${printableText(row.desc)}</td>
      <td class="ltr-text">${escapeHtml(row.ref)}</td>
      <td class="num">${escapeHtml(row.debit.toLocaleString())}</td>
      <td class="num">${escapeHtml(row.credit.toLocaleString())}</td>
      <td class="num">${escapeHtml(row.balance.toLocaleString())}</td>
    </tr>`).join('');

    openUnicodePrint({
      title,
      dir: isRTL ? 'rtl' : 'ltr',
      lang: isRTL ? 'ur' : 'en',
      pageSize: 'A4 landscape',
      bodyHtml: `<div class="pdf-hint">${isRTL ? 'پی ڈی ایف کے لیے Save as PDF منتخب کریں۔' : 'Choose Save as PDF in the print dialog.'}</div>
        <main class="ledger-report">
          <header><h1>${printableText(title)}</h1><div>${isRTL ? 'اکاؤنٹ' : 'Account'}: ${printableText(entityName || 'General')}<br/>${isRTL ? 'تیار کردہ' : 'Generated'}: ${escapeHtml(new Date().toLocaleDateString(isRTL ? 'ur-PK' : 'en-PK'))}</div></header>
          <table><thead><tr><th>Date</th><th>Description</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>
        </main>`,
      styles: `.ledger-report header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;background:#0C2134;color:#fff;padding:14px 16px;margin-bottom:14px}.ledger-report h1{font-size:20px;margin:0}.ledger-report header div{font-size:9px;line-height:1.7}.ledger-report table{width:100%;border-collapse:collapse;font-size:9px}.ledger-report th{background:#0B4E9B;color:#fff;padding:7px;text-align:${isRTL ? 'right' : 'left'}}.ledger-report td{border:1px solid #CBD5E1;padding:7px}.ledger-report .num{text-align:right}`
    });
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in print:max-w-none">
      
      {/* HEADER & CONTROLS (Hidden when printing) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">Account Ledger: <span className="font-semibold text-blue-600">{entityName || 'All'}</span></p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition">
            <Printer size={18} /> Print
          </button>
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-500/20 transition">
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      {/* FILTER BAR (Hidden when printing) */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex gap-4 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded border border-slate-300 focus:border-blue-500 outline-none text-sm" 
            placeholder="Search transaction..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input type="date" className="px-4 py-2 rounded border border-slate-300 text-sm outline-none" />
        <input type="date" className="px-4 py-2 rounded border border-slate-300 text-sm outline-none" />
        <button className="bg-slate-800 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
          <Filter size={16} /> Filter
        </button>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
        
        {/* Print-only Header */}
        <div className="hidden print:block p-8 pb-0 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Cage Master</h1>
          <p className="text-slate-500">Official Ledger Statement</p>
          <hr className="my-4"/>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-3 border-b border-slate-200">Date</th>
                <th className="px-6 py-3 border-b border-slate-200 w-1/3">Description</th>
                <th className="px-6 py-3 border-b border-slate-200">Ref</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right text-green-700">Debit</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right text-red-700">Credit</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right bg-slate-200">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerData.filter(r => r.desc.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{row.date}</td>
                  <td className="px-6 py-3 text-slate-800 font-medium">
                    <div className="flex items-center gap-2">
                      {row.type === 'DR' && <ArrowUpCircle size={14} className="text-green-500" />}
                      {row.type === 'CR' && <ArrowDownCircle size={14} className="text-red-500" />}
                      {row.desc}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{row.ref}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                  </td>
                  <td className={`px-6 py-3 text-right font-bold font-mono bg-slate-50/50 ${row.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {row.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
              <tr>
                <td colSpan="3" className="px-6 py-4 text-right uppercase">Closing Balance</td>
                <td className="px-6 py-4 text-right text-green-700">{ledgerData.reduce((a,b) => a + b.debit, 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-red-700">{ledgerData.reduce((a,b) => a + b.credit, 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right bg-slate-200">{runningBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LedgerPage;