const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query(`
    SELECT e.*, d.department_name 
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.full_name ASC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name required hai' });
  db.query('INSERT INTO employees (full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [full_name, father_name, cnic, phone, designation, department_id, joining_date, basic_salary], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Employee save ho gaya!', id: result.insertId });
    });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM employees WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Delete ho gaya!' });
  });
});

module.exports = router;
