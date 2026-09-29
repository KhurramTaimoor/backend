const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/employees", (req, res) => {
  db.query("SELECT id, full_name FROM employees ORDER BY full_name", (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
});

router.get("/", (req, res) => {
  const { employee_id } = req.query;
  if (!employee_id) return res.status(400).json({ error: "employee_id required" });

  const sql = `
    SELECT
      p.id, p.month, p.year, p.basic_salary, p.allowances,
      p.deductions, p.net_salary, p.status, p.created_at,
      e.full_name AS employee_name,
      d.department_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE p.employee_id = ?
    ORDER BY p.year DESC, p.month DESC`;

  db.query(sql, [employee_id], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    const total_paid = r.filter(x => x.status === "paid").reduce((s, x) => s + Number(x.net_salary), 0);
    const total_due  = r.filter(x => x.status !== "paid").reduce((s, x) => s + Number(x.net_salary), 0);
    res.json({
      employee: r[0] ? { name: r[0].employee_name, department: r[0].department_name } : {},
      records: r,
      total_paid,
      total_due
    });
  });
});

module.exports = router;
