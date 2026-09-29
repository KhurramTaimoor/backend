const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM departments ORDER BY department_name ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { department_name, head_of_dept, extension_no } = req.body;
  if (!department_name) return res.status(400).json({ error: 'Department name required hai' });
  db.query('INSERT INTO departments (department_name, head_of_dept, extension_no) VALUES (?, ?, ?)',
    [department_name, head_of_dept, extension_no], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Department save ho gaya!', id: result.insertId });
    });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM departments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Delete ho gaya!' });
  });
});

module.exports = router;
