const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const { from_date, to_date } = req.query;
  let query = "SELECT * FROM cash_book WHERE 1=1";
  const params = [];
  if (from_date) { query += " AND entry_date >= ?"; params.push(from_date); }
  if (to_date) { query += " AND entry_date <= ?"; params.push(to_date); }
  query += " ORDER BY entry_date ASC";
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
