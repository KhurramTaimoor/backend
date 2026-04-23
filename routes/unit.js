const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM units ORDER BY unit_name ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { unit_name, symbol, decimal_places } = req.body;
  if (!unit_name || !symbol) {
    return res.status(400).json({ error: 'Unit name aur symbol required hain' });
  }
  const sql = 'INSERT INTO units (unit_name, symbol, decimal_places) VALUES (?, ?, ?)';
  db.query(sql, [unit_name, symbol, decimal_places || 2], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '? Unit save ho gayi!', id: result.insertId });
  });
});

router.put('/:id', (req, res) => {
  const { unit_name, symbol, decimal_places } = req.body;
  if (!unit_name || !symbol) {
    return res.status(400).json({ error: 'Unit name aur symbol required hain' });
  }
  const sql = 'UPDATE units SET unit_name = ?, symbol = ?, decimal_places = ? WHERE id = ?';
  db.query(sql, [unit_name, symbol, decimal_places || 2, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Unit update ho gayi!' });
  });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM units WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '? Delete ho gayi!' });
  });
});

module.exports = router;
