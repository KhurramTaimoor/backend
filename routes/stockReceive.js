const express = require('express');
const router = express.Router();
const db = require('../db');

// helper: query wrapper
const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

// GET ALL
router.get('/', async (req, res) => {
  try {
    const headers = await queryAsync(
      `
      SELECT 
        sr.id,
        sr.grn_no,
        sr.receive_date,
        sr.supplier_name
      FROM stock_receive sr
      ORDER BY sr.id DESC
      `
    );

    const items = await queryAsync(
      `
      SELECT
        sri.id,
        sri.stock_receive_id,
        sri.product_name,
        sri.category_name,
        sri.unit_name,
        sri.type_name,
        sri.received_qty
      FROM stock_receive_items sri
      ORDER BY sri.id ASC
      `
    );

    const data = headers.map((row) => ({
      ...row,
      items: items.filter((item) => item.stock_receive_id === row.id),
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE
router.get('/:id', async (req, res) => {
  try {
    const headers = await queryAsync(
      `
      SELECT 
        id,
        grn_no,
        receive_date,
        supplier_name
      FROM stock_receive
      WHERE id = ?
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!headers.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const items = await queryAsync(
      `
      SELECT
        id,
        stock_receive_id,
        product_name,
        category_name,
        unit_name,
        type_name,
        received_qty
      FROM stock_receive_items
      WHERE stock_receive_id = ?
      ORDER BY id ASC
      `,
      [req.params.id]
    );

    res.json({
      ...headers[0],
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
router.post('/', async (req, res) => {
  const { grn_no, receive_date, supplier_name, items } = req.body;

  if (!grn_no || !supplier_name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'GRN No, Supplier aur at least one product required hain',
    });
  }

  const validItems = items.filter((item) => item.product_name);

  if (validItems.length === 0) {
    return res.status(400).json({
      error: 'At least one valid product required hai',
    });
  }

  try {
    const headerResult = await queryAsync(
      `
      INSERT INTO stock_receive
      (grn_no, receive_date, supplier_name)
      VALUES (?, ?, ?)
      `,
      [grn_no, receive_date || null, supplier_name]
    );

    const stockReceiveId = headerResult.insertId;

    for (const item of validItems) {
      await queryAsync(
        `
        INSERT INTO stock_receive_items
        (
          stock_receive_id,
          product_name,
          category_name,
          unit_name,
          type_name,
          received_qty
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          stockReceiveId,
          item.product_name || null,
          item.category_name || null,
          item.unit_name || null,
          item.type_name || null,
          item.received_qty !== '' && item.received_qty !== undefined
            ? item.received_qty
            : null,
        ]
      );
    }

    const savedHeader = await queryAsync(
      `
      SELECT id, grn_no, receive_date, supplier_name
      FROM stock_receive
      WHERE id = ?
      `,
      [stockReceiveId]
    );

    const savedItems = await queryAsync(
      `
      SELECT
        id,
        stock_receive_id,
        product_name,
        category_name,
        unit_name,
        type_name,
        received_qty
      FROM stock_receive_items
      WHERE stock_receive_id = ?
      ORDER BY id ASC
      `,
      [stockReceiveId]
    );

    res.json({
      message: 'Stock Receive save ho gaya!',
      data: {
        ...savedHeader[0],
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { grn_no, receive_date, supplier_name, items } = req.body;

  if (!grn_no || !supplier_name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'GRN No, Supplier aur at least one product required hain',
    });
  }

  const validItems = items.filter((item) => item.product_name);

  if (validItems.length === 0) {
    return res.status(400).json({
      error: 'At least one valid product required hai',
    });
  }

  try {
    const existing = await queryAsync(
      `SELECT id FROM stock_receive WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await queryAsync(
      `
      UPDATE stock_receive
      SET
        grn_no = ?,
        receive_date = ?,
        supplier_name = ?
      WHERE id = ?
      `,
      [grn_no, receive_date || null, supplier_name, req.params.id]
    );

    await queryAsync(
      `DELETE FROM stock_receive_items WHERE stock_receive_id = ?`,
      [req.params.id]
    );

    for (const item of validItems) {
      await queryAsync(
        `
        INSERT INTO stock_receive_items
        (
          stock_receive_id,
          product_name,
          category_name,
          unit_name,
          type_name,
          received_qty
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          req.params.id,
          item.product_name || null,
          item.category_name || null,
          item.unit_name || null,
          item.type_name || null,
          item.received_qty !== '' && item.received_qty !== undefined
            ? item.received_qty
            : null,
        ]
      );
    }

    const savedHeader = await queryAsync(
      `
      SELECT id, grn_no, receive_date, supplier_name
      FROM stock_receive
      WHERE id = ?
      `,
      [req.params.id]
    );

    const savedItems = await queryAsync(
      `
      SELECT
        id,
        stock_receive_id,
        product_name,
        category_name,
        unit_name,
        type_name,
        received_qty
      FROM stock_receive_items
      WHERE stock_receive_id = ?
      ORDER BY id ASC
      `,
      [req.params.id]
    );

    res.json({
      message: 'Stock Receive update ho gaya!',
      data: {
        ...savedHeader[0],
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await queryAsync(
      `DELETE FROM stock_receive_items WHERE stock_receive_id = ?`,
      [req.params.id]
    );

    await queryAsync(
      `DELETE FROM stock_receive WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Delete ho gaya!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;