const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = (statement, params = []) => new Promise((resolve, reject) => db.query(statement, params, (e, rows) => e ? reject(e) : resolve(rows)));
const cash = (v) => Math.round((Number(v) || 0) * 100) / 100;
const str = (v) => String(v == null ? "" : v).trim();
const dateValid = (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
const optionsOf = (v) => { try { const x = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(x) ? x : []; } catch { return []; } };
const label = (v) => str(v) || "—";
function bestValuationRate(rows, listName, productId, meta, item) {
  const candidates = rows.filter(r => String(r.product_id) === String(productId) && str(r.list_name || "Default Rate List") === listName);
  let choice = null, score = -Infinity;
  for (const row of candidates) for (const opt of optionsOf(row.price_options)) {
    // Evaluation in the existing customer rate-list editor is stored in wholesale_rate.
    const rate = Number(opt.wholesale_rate);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const dims = [
      [Number(opt.category_id) || 0, Number(item.category_id || meta.category_id) || 0],
      [Number(opt.product_type_id) || 0, Number(meta.product_type_id) || 0],
      [Number(opt.unit_id) || 0, Number(item.unit_id || meta.unit_id) || 0],
    ];
    let points = 0;
    for (const [o, actual] of dims) { if (o && actual && o === actual) points += 4; else if (o && actual && o !== actual) points -= 5; }
    if (points > score) { score = points; choice = rate; }
  }
  return choice;
}

router.get("/", async (req, res) => {
  try {
    const from = str(req.query.from_date), to = str(req.query.to_date);
    if (!dateValid(from) || !dateValid(to) || (from && to && from > to)) return res.status(400).json({ success:false, message:"Invalid date range." });
    const where = ["(si.party_type = 'customer' OR ((si.party_type IS NULL OR si.party_type = '') AND (si.customer_id IS NOT NULL OR si.customer_type = 'customer')))"];
    const params = [];
    if (from) { where.push("si.invoice_date >= ?"); params.push(from); }
    if (to) { where.push("si.invoice_date <= ?"); params.push(to); }
    const customerId = Number(req.query.customer_id) || 0;
    if (customerId) { where.push("COALESCE(si.customer_id,si.party_id) = ?"); params.push(customerId); }
    const invoices = await sql(
      "SELECT si.id,si.invoice_no,DATE_FORMAT(si.invoice_date,'%Y-%m-%d') AS invoice_date,"+
      "si.party_id,si.customer_id,si.party_name,si.customer_name_en,si.rate_list_name,si.invoice_total,si.discount,"+
      "si.previous_balance,si.delivery_charges FROM sales_invoices si WHERE "+where.join(" AND ")+" ORDER BY si.invoice_date DESC,si.id DESC", params
    );
    if (!invoices.length) return res.json({ success:true, data:[], records:[], summary:{sales_amount:0,comparable_sales:0,valuation_amount:0,difference:0,invoice_count:0,missing_items:0}, groups:{customer:[],product:[]} });
    const ids = invoices.map(x => x.id);
    const [items, rateRows, assignmentRows, productRows] = await Promise.all([
      sql("SELECT * FROM sales_invoice_items WHERE invoice_id IN (?) ORDER BY invoice_id,id",[ids]),
      sql("SELECT product_id,list_name,price_options FROM sales_rates"),
      sql("SELECT customer_id,list_name FROM sales_rate_list_customers"),
      sql("SELECT id,product_name,category_id,product_type_id,unit_id FROM products"),
    ]);
    const invoiceById = new Map(invoices.map(x => [Number(x.id), x]));
    const itemsByInvoice = new Map();
    for (const it of items) { const key = Number(it.invoice_id); if (!itemsByInvoice.has(key)) itemsByInvoice.set(key, []); itemsByInvoice.get(key).push(it); }
    const assignment = new Map(assignmentRows.map(x => [Number(x.customer_id),str(x.list_name)]));
    const products = new Map(productRows.map(x => [Number(x.id), x]));
    const globalLists = [...new Set(rateRows.map(x => str(x.list_name || "Default Rate List")))];
    const search = str(req.query.search).toLowerCase(), productId = Number(req.query.product_id) || 0;
    const records = [];
    for (const invoice of invoices) {
      const id = Number(invoice.id);
      const cid = Number(invoice.customer_id || invoice.party_id) || 0;
      const name = label(invoice.party_name || invoice.customer_name_en);
      const list = str(invoice.rate_list_name) || assignment.get(cid) || (globalLists.includes("Default Rate List") ? "Default Rate List" : globalLists.length === 1 ? globalLists[0] : "");
      const invoiceItems = itemsByInvoice.get(id) || [];
      const gross = invoiceItems.reduce((a, it) => a + (Number(it.amount) || (Number(it.qty || it.quantity) || 0) * (Number(it.rate) || 0)), 0);
      const discount = Number(invoice.discount) || 0;
      for (const it of invoiceItems) {
        const pid = Number(it.product_id) || 0, meta = products.get(pid) || {};
        if (productId && pid !== productId) continue;
        const productName = label(it.product_name || meta.product_name);
        if (search && ![name, productName, invoice.invoice_no].some(x => String(x).toLowerCase().includes(search))) continue;
        const qty = Number(it.qty || it.quantity || it.pieces_qty) || 0;
        const rawAmount = Number(it.amount) || qty * (Number(it.rate) || 0);
        const allocatedDiscount = gross > 0 ? discount * rawAmount / gross : 0;
        const saleAmount = cash(rawAmount - allocatedDiscount);
        const evaluationRate = list ? bestValuationRate(rateRows,list,pid,meta,it) : null;
        const missing = evaluationRate === null;
        const valuation = missing ? null : cash(qty * evaluationRate);
        records.push({
          invoice_id:id, invoice_no:invoice.invoice_no,invoice_date:invoice.invoice_date,customer_id:cid,customer_name:name,
          product_id:pid,product_name:productName,qty, sale_type:it.sale_type||"single",
          selling_rate:Number(it.rate)||0,invoice_amount:saleAmount, evaluation_rate:evaluationRate,
          valuation_amount:valuation,difference:missing?null:cash(saleAmount-valuation),
          rate_list_name:list,rate_missing:missing,
        });
      }
    }
    const summary = { sales_amount:0,comparable_sales:0,valuation_amount:0,difference:0,invoice_count:0,missing_items:0 };
    const groups = { customer:new Map(),product:new Map() };
    const uniqueInvoices = new Set();
    for (const r of records) {
      summary.sales_amount += r.invoice_amount;
      uniqueInvoices.add(r.invoice_id);
      if (r.rate_missing) summary.missing_items++;
      else { summary.comparable_sales += r.invoice_amount; summary.valuation_amount += r.valuation_amount; summary.difference += r.difference; }
      for (const [type,key,nm] of [["customer",r.customer_id||r.customer_name,r.customer_name],["product",r.product_id||r.product_name,r.product_name]]) {
        const map = groups[type];
        if (!map.has(key)) map.set(key,{key,name:nm,qty:0,sales_amount:0,valuation_amount:0,difference:0,missing_items:0,invoice_ids:new Set()});
        const g = map.get(key);g.invoice_ids.add(r.invoice_id);g.qty += r.qty;g.sales_amount += r.invoice_amount;
        if (r.rate_missing)g.missing_items++;else { g.valuation_amount += r.valuation_amount;g.difference += r.difference; }
      }
    }
    summary.invoice_count=uniqueInvoices.size;
    for (const key of ["sales_amount","comparable_sales","valuation_amount","difference"])summary[key]=cash(summary[key]);
    const resultGroups={};
    for (const type of ["customer","product"])resultGroups[type]=[...groups[type].values()].map(g=>({name:g.name,qty:g.qty,invoice_count:g.invoice_ids.size,sales_amount:cash(g.sales_amount),valuation_amount:cash(g.valuation_amount),difference:cash(g.difference),missing_items:g.missing_items})).sort((a,b)=>b.sales_amount-a.sales_amount);
    return res.json({success:true,data:records,records,summary,groups:resultGroups});
  } catch(e) { console.error("Valuation report:",e);return res.status(500).json({success:false,message:e.message||"Valuation report failed"}); }
});
module.exports=router;
