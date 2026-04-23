const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT e.*, d.department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.id DESC`;
  db.query(sql, (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
});

router.post("/", (req, res) => {
  const { full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary } = req.body;
  db.query(
    "INSERT INTO employees (full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary) VALUES (?,?,?,?,?,?,?,?)",
    [full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary],
    (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: r.insertId, message: "Saved" });
    }
  );
});

router.put("/:id", (req, res) => {
  const { full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary } = req.body;
  db.query(
    "UPDATE employees SET full_name = ?, father_name = ?, cnic = ?, phone = ?, designation = ?, department_id = ?, joining_date = ?, basic_salary = ? WHERE id = ?",
    [full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Updated" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM employees WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

module.exports = router;

