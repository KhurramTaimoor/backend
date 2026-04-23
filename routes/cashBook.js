const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.query("SELECT * FROM cash_book ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { entry_date, description, cash_in, cash_out } = req.body;
  const cin = parseFloat(cash_in)||0;
  const cout = parseFloat(cash_out)||0;
  db.query("SELECT COALESCE(SUM(cash_in - cash_out), 0) AS balance FROM cash_book", (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    const prevBalance = parseFloat(r[0].balance)||0;
    const newBalance = prevBalance + cin - cout;
    const today = new Date().toISOString().slice(0, 10);
    db.query(
      "INSERT INTO cash_book (entry_date, description, cash_in, cash_out, balance) VALUES (?,?,?,?,?)",
      [entry_date||today, description||"", cin, cout, newBalance],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "Cash book entry save ho gaya!", id: result.insertId });
      }
    );
  });
});

router.put("/:id", (req, res) => {
  const { entry_date, description, cash_in, cash_out } = req.body;
  const cin = parseFloat(cash_in) || 0;
  const cout = parseFloat(cash_out) || 0;
  const balance = cin - cout;
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    "UPDATE cash_book SET entry_date = ?, description = ?, cash_in = ?, cash_out = ?, balance = ? WHERE id = ?",
    [entry_date || today, description || "", cin, cout, balance, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Cash book entry updated!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM cash_book WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Entry delete ho gaya!" });
  });
});

module.exports = router;
