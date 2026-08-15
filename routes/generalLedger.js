const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const { from_date, to_date, account_id } = req.query;
  const id = parseInt(account_id) || 0;
  let journalWhere = "WHERE (jv.account_dr_id = ? OR jv.account_cr_id = ?)";
  let chequeWhere = "WHERE cv.account_id = ?";
  const journalParams = [id, id, id, id];
  const chequeParams = [id];

  if (from_date) {
    journalWhere += " AND DATE(jv.voucher_date) >= DATE(?)";
    chequeWhere += " AND DATE(cv.issuance_date) >= DATE(?)";
    journalParams.push(from_date);
    chequeParams.push(from_date);
  }
  if (to_date) {
    journalWhere += " AND DATE(jv.voucher_date) <= DATE(?)";
    chequeWhere += " AND DATE(cv.issuance_date) <= DATE(?)";
    journalParams.push(to_date);
    chequeParams.push(to_date);
  }

  const params = [...journalParams, ...chequeParams];

  const query = `
    SELECT * FROM (
      SELECT
        jv.voucher_date AS sort_date,
        DATE_FORMAT(jv.voucher_date, '%d/%m/%Y') AS date,
        jv.narration AS description,
        jv.voucher_no AS ref,
        CASE WHEN jv.account_dr_id = ? THEN jv.amount ELSE 0 END AS debit,
        CASE WHEN jv.account_cr_id = ? THEN jv.amount ELSE 0 END AS credit,
        'Journal Voucher' AS voucher_type
      FROM journal_vouchers jv
      ${journalWhere}

      UNION ALL

      SELECT
        cv.issuance_date AS sort_date,
        DATE_FORMAT(cv.issuance_date, '%d/%m/%Y') AS date,
        CONCAT('Cheque issued to ', cv.payee_name) AS description,
        cv.voucher_no AS ref,
        0 AS debit,
        cv.total_amount AS credit,
        'Cheque Voucher' AS voucher_type
      FROM cheque_vouchers cv
      ${chequeWhere}
    ) ledger_rows
    ORDER BY sort_date ASC, ref ASC
  `;
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
