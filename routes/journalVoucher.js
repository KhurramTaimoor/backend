const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const query = `
    SELECT jv.id,
      jv.voucher_no,
      jv.account_dr_id,
      jv.account_cr_id,
      DATE_FORMAT(jv.voucher_date, '%d/%m/%Y') AS voucher_date,
      jv.amount,
      jv.narration,
      dr.account_title AS account_dr_name,
      cr.account_title AS account_cr_name
    FROM journal_vouchers jv
    LEFT JOIN chart_of_accounts dr ON jv.account_dr_id = dr.id
    LEFT JOIN chart_of_accounts cr ON jv.account_cr_id = cr.id
    ORDER BY jv.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { voucher_no, voucher_date, account_dr_id, account_cr_id, amount, narration } = req.body;
  if (!voucher_no || !account_dr_id || !account_cr_id) return res.status(400).json({ error: "Voucher no aur accounts zaroori hain!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    "INSERT INTO journal_vouchers (voucher_no, voucher_date, account_dr_id, account_cr_id, amount, narration) VALUES (?,?,?,?,?,?)",
    [voucher_no, voucher_date||today, account_dr_id, account_cr_id, parseFloat(amount)||0, narration||""],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Journal voucher save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { voucher_no, voucher_date, account_dr_id, account_cr_id, amount, narration } = req.body;
  if (!voucher_no || !account_dr_id || !account_cr_id) return res.status(400).json({ error: "Voucher no aur accounts zaroori hain!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    "UPDATE journal_vouchers SET voucher_no = ?, voucher_date = ?, account_dr_id = ?, account_cr_id = ?, amount = ?, narration = ? WHERE id = ?",
    [voucher_no, voucher_date || today, account_dr_id, account_cr_id, parseFloat(amount) || 0, narration || "", req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Journal voucher update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM journal_vouchers WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
