const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const query = `
    SELECT coa.*, ag.group_name 
    FROM chart_of_accounts coa
    LEFT JOIN account_groups ag ON coa.group_id = ag.id
    ORDER BY coa.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { account_code, account_title, group_id, opening_balance } = req.body;
  if (!account_title) return res.status(400).json({ error: "Account title zaroori hai!" });
  db.query(
    "INSERT INTO chart_of_accounts (account_code, account_title, group_id, opening_balance) VALUES (?, ?, ?, ?)",
    [account_code||"", account_title, group_id||null, parseFloat(opening_balance)||0],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Account save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { account_code, account_title, group_id, opening_balance } = req.body;
  db.query(
    "UPDATE chart_of_accounts SET account_code=?, account_title=?, group_id=?, opening_balance=? WHERE id=?",
    [account_code||"", account_title, group_id||null, parseFloat(opening_balance)||0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Account update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM chart_of_accounts WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Account delete ho gaya!" });
  });
});

module.exports = router;
