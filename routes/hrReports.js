const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/summary", (req, res) => {
  const sql = `
    SELECT 
      e.id, e.full_name, e.father_name, e.cnic, e.phone,
      e.joining_date, e.basic_salary, e.status,
      d.department_name,
      er.rate_type, er.amount AS current_rate
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN employee_rates er ON er.id = (
      SELECT id FROM employee_rates
      WHERE employee_id = e.id
      ORDER BY effective_date DESC LIMIT 1
    )
    ORDER BY e.full_name ASC`;
  db.query(sql, (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
});

module.exports = router;
