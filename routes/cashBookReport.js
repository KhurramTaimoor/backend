const express = require("express");
const router = express.Router();
const db = require("../db");
const query = (statement, params = []) =>
  new Promise((resolve, reject) => db.query(statement, params, (error, rows) => error ? reject(error) : resolve(rows)));
const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
// Voucher items already mirror cash into cash_book: use cash_book once for totals.
router.get("/", async (req, res) => {
  try {
    const from = String(req.query.from_date || "").trim();
    const to = String(req.query.to_date || "").trim();
    const valid = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !valid.test(from)) || (to && !valid.test(to)) || (from && to && from > to))
      return res.status(400).json({ success:false, message:"Invalid date range." });
    let openingBalance = 0;
    if (from) {
      const prior = await query(
        "SELECT COALESCE(SUM(COALESCE(cash_in,0)-COALESCE(cash_out,0)),0) AS opening_balance FROM cash_book WHERE entry_date < ?",
        [from]
      );
      openingBalance = round(prior[0]?.opening_balance);
    }
    const conditions = ["1=1"], params = [];
    if (from) { conditions.push("cb.entry_date >= ?"); params.push(from); }
    if (to) { conditions.push("cb.entry_date <= ?"); params.push(to); }
    const statement = [
      "SELECT cb.id, DATE_FORMAT(cb.entry_date,'%Y-%m-%d') AS entry_date,",
      "COALESCE(cbvi.description, cb.description, '') AS description,",
      "cbvi.account_type, cbvi.account_id,",
      "COALESCE(NULLIF(TRIM(cbvi.account_name_snapshot),''),",
      "NULLIF(TRIM(c.customer_name_en),''), NULLIF(TRIM(s.supplier_name),''),",
      "NULLIF(TRIM(e.full_name),''), NULLIF(TRIM(coa.account_title),''),'') AS account_name,",
      "cbv.voucher_no, COALESCE(cb.cash_in,0) AS cash_in, COALESCE(cb.cash_out,0) AS cash_out",
      "FROM cash_book cb",
      "LEFT JOIN cash_book_voucher_items cbvi ON cbvi.legacy_cash_book_id=cb.id",
      "LEFT JOIN cash_book_vouchers cbv ON cbv.id=cbvi.voucher_id",
      "LEFT JOIN customers c ON cbvi.account_type='customer' AND c.id=cbvi.account_id",
      "LEFT JOIN suppliers s ON cbvi.account_type='supplier' AND s.id=cbvi.account_id",
      "LEFT JOIN employees e ON cbvi.account_type='employee' AND e.id=cbvi.account_id",
      "LEFT JOIN chart_of_accounts coa ON cbvi.account_type='general_ledger' AND coa.id=cbvi.account_id",
      "WHERE " + conditions.join(" AND "),
      "ORDER BY cb.entry_date ASC,cb.id ASC"
    ].join(" ");
    const rows = await query(statement, params);
    let balance = openingBalance, cashIn = 0, cashOut = 0;
    const data = rows.map(row => {
      const incoming = round(row.cash_in), outgoing = round(row.cash_out);
      cashIn = round(cashIn + incoming);
      cashOut = round(cashOut + outgoing);
      balance = round(balance + incoming - outgoing);
      return {
        id:row.id,entry_date:row.entry_date,voucher_no:row.voucher_no||"",
        account_type:row.account_type||"",account_name:row.account_name||"",
        description:row.description||"",cash_in:incoming,cash_out:outgoing,balance
      };
    });
    const summary = {
      opening_balance:openingBalance,cash_in:cashIn,cash_out:cashOut,
      net_movement:round(cashIn-cashOut),closing_balance:balance,entry_count:data.length
    };
    return res.json({success:true,data,records:data,summary,
      opening_balance:summary.opening_balance,closing_balance:summary.closing_balance});
  } catch(error) {
    console.error("Cash Book Report:", error);
    return res.status(500).json({success:false,message:error.message||"Cash Book Report failed."});
  }
});
module.exports = router;
