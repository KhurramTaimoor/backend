const express = require("express");
const router = express.Router();
const db = require("../db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const cleanText = (value) => {
  const v = String(value || "").trim();
  return v || null;
};

const getOrCreateProductId = async (productName) => {
  if (!productName || !productName.trim()) return null;

  const cleanName = productName.trim();

  const rows = await queryAsync(
    `SELECT id FROM products WHERE product_name = ? LIMIT 1`,
    [cleanName]
  );

  if (rows.length > 0) return rows[0].id;

  const result = await queryAsync(
    `INSERT INTO products (product_name) VALUES (?)`,
    [cleanName]
  );

  return result.insertId;
};

const normalizeReturnRow = (row) => ({
  id: row.id,
  invoice_id: row.invoice_id || "",
  invoice_no: row.invoice_no || "",
  supplier_name: row.supplier_name || "",
  return_date: row.return_date || "",
  reason: row.reason || "",
  total_amount: Number(row.total_amount) || 0,
  debit: Number(row.debit) || 0,
  credit: Number(row.credit) || 0,
});

const normalizeItemRow = (item) => ({
  id: item.id,
  return_id: item.return_id,
  product_id: item.product_id,
  product_name: item.product_name || "",
  unit_name: item.unit_name || "",
  category_name: item.category_name || "",
  type_name: item.type_name || "",
  quantity: Number(item.quantity) || 0,
  rate: Number(item.rate) || 0,
  amount: Number(item.amount) || 0,
});

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const product_name = cleanText(item.product_name);
      const unit_name = cleanText(item.unit_name);
      const category_name = cleanText(item.category_name);
      const type_name = cleanText(item.type_name);

      const quantity =
        item.quantity === "" || item.quantity === null || item.quantity === undefined
          ? 0
          : Number(item.quantity) || 0;

      const rate =
        item.rate === "" || item.rate === null || item.rate === undefined
          ? 0
          : Number(item.rate) || 0;

      const amountRaw =
        item.amount === "" || item.amount === null || item.amount === undefined
          ? quantity * rate
          : Number(item.amount);

      const amount = Number.isNaN(amountRaw) ? quantity * rate : amountRaw;

      return {
        product_name,
        unit_name,
        category_name,
        type_name,
        quantity,
        rate,
        amount,
      };
    })
    .filter((item) => item.product_name || item.quantity > 0 || item.rate > 0 || item.amount > 0);
};

const getReturnItems = async (returnId) => {
  const itemRows = await queryAsync(
    `
    SELECT
      pri.id,
      pri.return_id,
      pri.product_id,
      p.product_name,
      pri.unit_name,
      pri.category_name,
      pri.type_name,
      pri.quantity,
      pri.rate,
      pri.amount
    FROM purchase_return_items pri
    LEFT JOIN products p ON pri.product_id = p.id
    WHERE pri.return_id = ?
    ORDER BY pri.id ASC
    `,
    [returnId]
  );

  return itemRows.map(normalizeItemRow);
};

// GET all purchase returns with items
router.get("/", async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT
        pr.id,
        pr.invoice_id,
        DATE_FORMAT(pr.return_date, '%Y-%m-%d') AS return_date,
        pr.reason,
        pr.total_amount,
        pr.debit,
        pr.credit,
        pi.invoice_no,
        pi.supplier_name
      FROM purchase_returns pr
      LEFT JOIN purchase_invoices pi ON pr.invoice_id = pi.id
      ORDER BY pr.id DESC
    `);

    const data = await Promise.all(
      rows.map(async (row) => {
        const items = await getReturnItems(row.id);
        return {
          ...normalizeReturnRow(row),
          items,
        };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single purchase return with items
router.get("/:id", async (req, res) => {
  try {
    const returnId = Number(req.params.id);

    const rows = await queryAsync(
      `
      SELECT
        pr.id,
        pr.invoice_id,
        DATE_FORMAT(pr.return_date, '%Y-%m-%d') AS return_date,
        pr.reason,
        pr.total_amount,
        pr.debit,
        pr.credit,
        pi.invoice_no,
        pi.supplier_name
      FROM purchase_returns pr
      LEFT JOIN purchase_invoices pi ON pr.invoice_id = pi.id
      WHERE pr.id = ?
      LIMIT 1
      `,
      [returnId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Purchase return nahi mila!" });
    }

    const items = await getReturnItems(returnId);

    res.json({
      ...normalizeReturnRow(rows[0]),
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create purchase return
router.post("/", async (req, res) => {
  try {
    const {
      invoice_id,
      return_date,
      reason,
      total_amount,
      debit,
      credit,
      items,
    } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "Purchase invoice zaroori hai!" });
    }

    const invoiceRows = await queryAsync(
      `SELECT id, invoice_no, supplier_name FROM purchase_invoices WHERE id = ? LIMIT 1`,
      [invoice_id]
    );

    if (!invoiceRows.length) {
      return res.status(404).json({ error: "Related purchase invoice nahi mili!" });
    }

    const cleanedItems = normalizeItems(items);

    if (!cleanedItems.length) {
      return res.status(400).json({ error: "Kam az kam aik valid item zaroori hai!" });
    }

    const hasInvalid = cleanedItems.some(
      (item) => !item.product_name || item.quantity <= 0
    );

    if (hasInvalid) {
      return res.status(400).json({
        error: "Har item mein product_name aur quantity > 0 zaroori hai!",
      });
    }

    const calculatedTotal = cleanedItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    const finalTotal =
      total_amount === "" || total_amount === null || total_amount === undefined
        ? Number(calculatedTotal.toFixed(2))
        : Number(total_amount) || Number(calculatedTotal.toFixed(2));

    const finalDebit =
      debit === "" || debit === null || debit === undefined
        ? 0
        : Number(debit) || 0;

    const finalCredit =
      credit === "" || credit === null || credit === undefined
        ? finalTotal
        : Number(credit) || finalTotal;

    const finalDate =
      formatDate(return_date) || new Date().toISOString().slice(0, 10);

    const result = await queryAsync(
      `
      INSERT INTO purchase_returns
      (invoice_id, return_date, reason, total_amount, debit, credit)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        Number(invoice_id),
        finalDate,
        cleanText(reason) || "",
        finalTotal,
        finalDebit,
        finalCredit,
      ]
    );

    const returnId = result.insertId;
    const savedItems = [];

    for (const item of cleanedItems) {
      const product_id = await getOrCreateProductId(item.product_name);

      const itemResult = await queryAsync(
        `
        INSERT INTO purchase_return_items
        (return_id, product_id, unit_name, category_name, type_name, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          returnId,
          product_id,
          item.unit_name,
          item.category_name,
          item.type_name,
          item.quantity,
          item.rate,
          Number((item.amount || 0).toFixed(2)),
        ]
      );

      savedItems.push({
        id: itemResult.insertId,
        return_id: returnId,
        product_id,
        product_name: item.product_name || "",
        unit_name: item.unit_name || "",
        category_name: item.category_name || "",
        type_name: item.type_name || "",
        quantity: item.quantity,
        rate: item.rate,
        amount: Number((item.amount || 0).toFixed(2)),
      });
    }

    res.json({
      message: "Purchase return save ho gaya!",
      data: {
        id: returnId,
        invoice_id: Number(invoice_id),
        invoice_no: invoiceRows[0].invoice_no || "",
        supplier_name: invoiceRows[0].supplier_name || "",
        return_date: finalDate,
        reason: cleanText(reason) || "",
        total_amount: finalTotal,
        debit: finalDebit,
        credit: finalCredit,
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update purchase return
router.put("/:id", async (req, res) => {
  try {
    const returnId = Number(req.params.id);
    const {
      invoice_id,
      return_date,
      reason,
      total_amount,
      debit,
      credit,
      items,
    } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: "Purchase invoice zaroori hai!" });
    }

    const existingRows = await queryAsync(
      `SELECT id FROM purchase_returns WHERE id = ? LIMIT 1`,
      [returnId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Purchase return nahi mila!" });
    }

    const invoiceRows = await queryAsync(
      `SELECT id, invoice_no, supplier_name FROM purchase_invoices WHERE id = ? LIMIT 1`,
      [invoice_id]
    );

    if (!invoiceRows.length) {
      return res.status(404).json({ error: "Related purchase invoice nahi mili!" });
    }

    const cleanedItems = normalizeItems(items);

    if (!cleanedItems.length) {
      return res.status(400).json({ error: "Kam az kam aik valid item zaroori hai!" });
    }

    const hasInvalid = cleanedItems.some(
      (item) => !item.product_name || item.quantity <= 0
    );

    if (hasInvalid) {
      return res.status(400).json({
        error: "Har item mein product_name aur quantity > 0 zaroori hai!",
      });
    }

    const calculatedTotal = cleanedItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    const finalTotal =
      total_amount === "" || total_amount === null || total_amount === undefined
        ? Number(calculatedTotal.toFixed(2))
        : Number(total_amount) || Number(calculatedTotal.toFixed(2));

    const finalDebit =
      debit === "" || debit === null || debit === undefined
        ? 0
        : Number(debit) || 0;

    const finalCredit =
      credit === "" || credit === null || credit === undefined
        ? finalTotal
        : Number(credit) || finalTotal;

    const finalDate =
      formatDate(return_date) || new Date().toISOString().slice(0, 10);

    await queryAsync(
      `
      UPDATE purchase_returns
      SET invoice_id = ?, return_date = ?, reason = ?, total_amount = ?, debit = ?, credit = ?
      WHERE id = ?
      `,
      [
        Number(invoice_id),
        finalDate,
        cleanText(reason) || "",
        finalTotal,
        finalDebit,
        finalCredit,
        returnId,
      ]
    );

    await queryAsync(`DELETE FROM purchase_return_items WHERE return_id = ?`, [
      returnId,
    ]);

    const savedItems = [];

    for (const item of cleanedItems) {
      const product_id = await getOrCreateProductId(item.product_name);

      const itemResult = await queryAsync(
        `
        INSERT INTO purchase_return_items
        (return_id, product_id, unit_name, category_name, type_name, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          returnId,
          product_id,
          item.unit_name,
          item.category_name,
          item.type_name,
          item.quantity,
          item.rate,
          Number((item.amount || 0).toFixed(2)),
        ]
      );

      savedItems.push({
        id: itemResult.insertId,
        return_id: returnId,
        product_id,
        product_name: item.product_name || "",
        unit_name: item.unit_name || "",
        category_name: item.category_name || "",
        type_name: item.type_name || "",
        quantity: item.quantity,
        rate: item.rate,
        amount: Number((item.amount || 0).toFixed(2)),
      });
    }

    res.json({
      message: "Purchase return update ho gaya!",
      data: {
        id: returnId,
        invoice_id: Number(invoice_id),
        invoice_no: invoiceRows[0].invoice_no || "",
        supplier_name: invoiceRows[0].supplier_name || "",
        return_date: finalDate,
        reason: cleanText(reason) || "",
        total_amount: finalTotal,
        debit: finalDebit,
        credit: finalCredit,
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE purchase return
router.delete("/:id", async (req, res) => {
  try {
    const returnId = Number(req.params.id);

    await queryAsync(`DELETE FROM purchase_return_items WHERE return_id = ?`, [returnId]);
    await queryAsync(`DELETE FROM purchase_returns WHERE id = ?`, [returnId]);

    res.json({ message: "Purchase return delete ho gaya!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;0