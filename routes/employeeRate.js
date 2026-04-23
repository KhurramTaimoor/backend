const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query(`
    SELECT er.*, e.full_name 
    FROM employee_rates er
    LEFT JOIN employees e ON er.employee_id = e.id
    ORDER BY er.id ASC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { employee_id, rate_type, amount, effective_date } = req.body;
  if (!employee_id || !amount) return res.status(400).json({ error: 'Employee aur amount required hain' });
  db.query('INSERT INTO employee_rates (employee_id, rate_type, amount, effective_date) VALUES (?, ?, ?, ?)',
    [employee_id, rate_type, amount, effective_date], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Employee rate save ho gaya!', id: result.insertId });
    });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM employee_rates WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Delete ho gaya!' });
  });
});

module.exports = router;
