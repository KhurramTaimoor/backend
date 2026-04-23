const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT er.*, e.full_name AS employee_name 
    FROM employee_rates er
    LEFT JOIN employees e ON er.employee_id = e.id
    ORDER BY er.id DESC`;
  db.query(sql, (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
});

router.post("/", (req, res) => {
  const { employee_id, rate_type, amount, effective_date } = req.body;
  db.query(
    "INSERT INTO employee_rates (employee_id, rate_type, amount, effective_date) VALUES (?,?,?,?)",
    [employee_id, rate_type, amount, effective_date],
    (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: r.insertId, message: "Saved" });
    }
  );
});

router.put("/:id", (req, res) => {
  const { employee_id, rate_type, amount, effective_date } = req.body;
  db.query(
    "UPDATE employee_rates SET employee_id = ?, rate_type = ?, amount = ?, effective_date = ? WHERE id = ?",
    [employee_id, rate_type, amount, effective_date, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Updated" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM employee_rates WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
