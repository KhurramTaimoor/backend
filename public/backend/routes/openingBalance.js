const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const query = `
    SELECT ob.*, coa.account_title
    FROM opening_balances ob
    LEFT JOIN chart_of_accounts coa ON ob.account_id = coa.id
    ORDER BY ob.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { fiscal_year, account_id, debit, credit, entry_date } = req.body;
  if (!account_id) return res.status(400).json({ error: "Account zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    "INSERT INTO opening_balances (fiscal_year, account_id, debit, credit, entry_date) VALUES (?,?,?,?,?)",
    [fiscal_year||"", account_id, parseFloat(debit)||0, parseFloat(credit)||0, entry_date||today],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Opening balance save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { fiscal_year, account_id, debit, credit, entry_date } = req.body;
  if (!account_id) return res.status(400).json({ error: "Account zaroori hai!" });
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    "UPDATE opening_balances SET fiscal_year = ?, account_id = ?, debit = ?, credit = ?, entry_date = ? WHERE id = ?",
    [fiscal_year || "", account_id, parseFloat(debit) || 0, parseFloat(credit) || 0, entry_date || today, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Opening balance update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM opening_balances WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
