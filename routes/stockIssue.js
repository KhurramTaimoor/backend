const express = require("express");
const router = express.Router();
const db = require("../db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

// GET all stock issues
router.get("/", async (req, res) => {
  try {
    const headers = await queryAsync(`
      SELECT
        si.id,
        si.issue_no,
        si.date,
        si.shipment_to
      FROM stock_issue si
      ORDER BY si.id DESC
    `);

    const items = await queryAsync(`
      SELECT
        sii.id,
        sii.stock_issue_id,
        sii.product_name,
        sii.category_name,
        sii.type_name,
        sii.issued_qty,
        sii.rate,
        sii.total
      FROM stock_issue_items sii
      ORDER BY sii.id ASC
    `);

    const data = headers.map((row) => ({
      ...row,
      items: items.filter((item) => item.stock_issue_id === row.id),
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single stock issue
router.get("/:id", async (req, res) => {
  try {
    const headers = await queryAsync(
      `
      SELECT
        id,
        issue_no,
        date,
        shipment_to
      FROM stock_issue
      WHERE id = ?
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!headers.length) {
      return res.status(404).json({ error: "Record not found" });
    }

    const items = await queryAsync(
      `
      SELECT
        id,
        stock_issue_id,
        product_name,
        category_name,
        type_name,
        issued_qty,
        rate,
        total
      FROM stock_issue_items
      WHERE stock_issue_id = ?
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

// POST new stock issue
router.post("/", async (req, res) => {
  const { issue_no, date, shipment_to, items } = req.body;

  if (!issue_no || !date || !shipment_to || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "Issue No, Date, Shipment To aur at least one product required hain",
    });
  }

  const validItems = items.filter((item) => item.product_name && item.issued_qty && item.rate);

  if (validItems.length === 0) {
    return res.status(400).json({
      error: "At least one valid product row required hai",
    });
  }

  try {
    const headerResult = await queryAsync(
      `
      INSERT INTO stock_issue
      (issue_no, date, shipment_to)
      VALUES (?, ?, ?)
      `,
      [issue_no, date, shipment_to]
    );

    const stockIssueId = headerResult.insertId;

    for (const item of validItems) {
      const qty = parseFloat(item.issued_qty) || 0;
      const itemRate = parseFloat(item.rate) || 0;
      const total = (qty * itemRate).toFixed(2);

      await queryAsync(
        `
        INSERT INTO stock_issue_items
        (
          stock_issue_id,
          product_name,
          category_name,
          type_name,
          issued_qty,
          rate,
          total
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          stockIssueId,
          item.product_name || null,
          item.category_name || null,
          item.type_name || null,
          qty,
          itemRate,
          total,
        ]
      );
    }

    const savedHeader = await queryAsync(
      `
      SELECT id, issue_no, date, shipment_to
      FROM stock_issue
      WHERE id = ?
      `,
      [stockIssueId]
    );

    const savedItems = await queryAsync(
      `
      SELECT
        id,
        stock_issue_id,
        product_name,
        category_name,
        type_name,
        issued_qty,
        rate,
        total
      FROM stock_issue_items
      WHERE stock_issue_id = ?
      ORDER BY id ASC
      `,
      [stockIssueId]
    );

    res.json({
      message: "Stock issue saved!",
      data: {
        ...savedHeader[0],
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE stock issue
router.put("/:id", async (req, res) => {
  const { issue_no, date, shipment_to, items } = req.body;

  if (!issue_no || !date || !shipment_to || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "Issue No, Date, Shipment To aur at least one product required hain",
    });
  }

  const validItems = items.filter((item) => item.product_name && item.issued_qty && item.rate);

  if (validItems.length === 0) {
    return res.status(400).json({
      error: "At least one valid product row required hai",
    });
  }

  try {
    const existing = await queryAsync(
      `SELECT id FROM stock_issue WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: "Record not found" });
    }

    await queryAsync(
      `
      UPDATE stock_issue
      SET issue_no = ?, date = ?, shipment_to = ?
      WHERE id = ?
      `,
      [issue_no, date, shipment_to, req.params.id]
    );

    await queryAsync(
      `DELETE FROM stock_issue_items WHERE stock_issue_id = ?`,
      [req.params.id]
    );

    for (const item of validItems) {
      const qty = parseFloat(item.issued_qty) || 0;
      const itemRate = parseFloat(item.rate) || 0;
      const total = (qty * itemRate).toFixed(2);

      await queryAsync(
        `
        INSERT INTO stock_issue_items
        (
          stock_issue_id,
          product_name,
          category_name,
          type_name,
          issued_qty,
          rate,
          total
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.params.id,
          item.product_name || null,
          item.category_name || null,
          item.type_name || null,
          qty,
          itemRate,
          total,
        ]
      );
    }

    const savedHeader = await queryAsync(
      `
      SELECT id, issue_no, date, shipment_to
      FROM stock_issue
      WHERE id = ?
      `,
      [req.params.id]
    );

    const savedItems = await queryAsync(
      `
      SELECT
        id,
        stock_issue_id,
        product_name,
        category_name,
        type_name,
        issued_qty,
        rate,
        total
      FROM stock_issue_items
      WHERE stock_issue_id = ?
      ORDER BY id ASC
      `,
      [req.params.id]
    );

    res.json({
      message: "Stock issue updated!",
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
router.delete("/:id", async (req, res) => {
  try {
    await queryAsync(
      `DELETE FROM stock_issue_items WHERE stock_issue_id = ?`,
      [req.params.id]
    );

    await queryAsync(
      `DELETE FROM stock_issue WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;