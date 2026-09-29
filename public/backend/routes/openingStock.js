const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query(`
    SELECT os.*, p.product_name, pt.type_name, c.category_name 
    FROM opening_stock os
    LEFT JOIN products p ON os.product_id = p.id
    LEFT JOIN product_types pt ON os.product_type_id = pt.id
    LEFT JOIN categories c ON os.category_id = c.id
    ORDER BY os.id ASC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { product_id, product_type_id, category_id, warehouse, quantity, rate, total_value, stock_date } = req.body;
  if (!product_id || !quantity || !rate || !stock_date) {
    return res.status(400).json({ error: 'Sab required fields bharein' });
  }
  const sql = 'INSERT INTO opening_stock (product_id, product_type_id, category_id, warehouse, quantity, rate, total_value, stock_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [product_id, product_type_id, category_id, warehouse, quantity, rate, total_value, stock_date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Opening Stock save ho gaya!', id: result.insertId });
  });
});

router.put('/:id', (req, res) => {
  const { product_id, product_type_id, category_id, warehouse, quantity, rate, total_value, stock_date } = req.body;
  if (!product_id || !quantity || !rate || !stock_date) {
    return res.status(400).json({ error: 'Sab required fields bharein' });
  }
  const sql = 'UPDATE opening_stock SET product_id = ?, product_type_id = ?, category_id = ?, warehouse = ?, quantity = ?, rate = ?, total_value = ?, stock_date = ? WHERE id = ?';
  db.query(sql, [product_id, product_type_id, category_id, warehouse, quantity, rate, total_value, stock_date, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Opening Stock update ho gaya!' });
  });
});

router.delete('/:id', (req, res) => {
  db.query('DELETE FROM opening_stock WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Delete ho gaya!' });
  });
});

module.exports = router;
