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
          ? null
          : Number(item.quantity);

      const rate =
        item.rate === "" || item.rate === null || item.rate === undefined
          ? null
          : Number(item.rate);

      let amount =
        item.amount === "" || item.amount === null || item.amount === undefined
          ? null
          : Number(item.amount);

      if (amount === null) {
        const q = Number.isNaN(quantity) ? 0 : quantity || 0;
        const r = Number.isNaN(rate) ? 0 : rate || 0;
        amount = q * r;
      }

      return {
        product_name,
        unit_name,
        category_name,
        type_name,
        quantity: Number.isNaN(quantity) ? null : quantity,
        rate: Number.isNaN(rate) ? null : rate,
        amount: Number.isNaN(amount) ? null : amount,
      };
    })
    .filter(
      (item) =>
        item.product_name ||
        item.unit_name ||
        item.category_name ||
        item.type_name ||
        item.quantity !== null ||
        item.rate !== null ||
        item.amount !== null
    );
};

const getInvoiceItems = async (invoiceId) => {
  const itemRows = await queryAsync(
    `
    SELECT 
      pii.id,
      pii.invoice_id,
      pii.product_id,
      p.product_name,
      pii.unit_name,
      pii.category_name,
      pii.type_name,
      pii.quantity,
      pii.rate,
      pii.amount
    FROM purchase_invoice_items pii
    LEFT JOIN products p ON pii.product_id = p.id
    WHERE pii.invoice_id = ?
    ORDER BY pii.id ASC
    `,
    [invoiceId]
  );

  return itemRows.map((item) => ({
    id: item.id,
    invoice_id: item.invoice_id,
    product_id: item.product_id,
    product_name: item.product_name || "",
    unit_name: item.unit_name || "",
    category_name: item.category_name || "",
    type_name: item.type_name || "",
    quantity: item.quantity === null || item.quantity === undefined ? null : Number(item.quantity),
    rate: item.rate === null || item.rate === undefined ? null : Number(item.rate),
    amount: item.amount === null || item.amount === undefined ? null : Number(item.amount),
  }));
};

// GET all purchase invoices with items
router.get("/", async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT 
        pi.id,
        pi.invoice_no,
        pi.supplier_name,
        DATE_FORMAT(pi.invoice_date, '%Y-%m-%d') AS invoice_date,
        pi.total_amount,
        pi.debit,
        pi.credit,
        pi.status
      FROM purchase_invoices pi
      ORDER BY pi.id DESC
    `);

    const data = await Promise.all(
      rows.map(async (row) => {
        const items = await getInvoiceItems(row.id);

        return {
          id: row.id,
          invoice_no: row.invoice_no || "",
          supplier_name: row.supplier_name || "",
          invoice_date: row.invoice_date || "",
          total_amount: Number(row.total_amount) || 0,
          debit: Number(row.debit) || 0,
          credit: Number(row.credit) || 0,
          status: row.status || "pending",
          items,
        };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single invoice with items
router.get("/:id", async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);

    const invoiceRows = await queryAsync(
      `
      SELECT 
        pi.id,
        pi.invoice_no,
        pi.supplier_name,
        DATE_FORMAT(pi.invoice_date, '%Y-%m-%d') AS invoice_date,
        pi.total_amount,
        pi.debit,
        pi.credit,
        pi.status
      FROM purchase_invoices pi
      WHERE pi.id = ?
      LIMIT 1
      `,
      [invoiceId]
    );

    if (!invoiceRows.length) {
      return res.status(404).json({ message: "Invoice nahi mila!" });
    }

    const invoice = invoiceRows[0];
    const items = await getInvoiceItems(invoiceId);

    res.json({
      id: invoice.id,
      invoice_no: invoice.invoice_no || "",
      supplier_name: invoice.supplier_name || "",
      invoice_date: invoice.invoice_date || "",
      total_amount: Number(invoice.total_amount) || 0,
      debit: Number(invoice.debit) || 0,
      credit: Number(invoice.credit) || 0,
      status: invoice.status || "pending",
      items,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create invoice
router.post("/", async (req, res) => {
  try {
    const {
      invoice_no,
      supplier_name,
      invoice_date,
      total_amount,
      debit,
      credit,
      status,
      items,
    } = req.body;

    const cleanedItems = normalizeItems(items);

    const calculatedTotal = cleanedItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    const finalTotal =
      total_amount === "" || total_amount === null || total_amount === undefined
        ? Number(calculatedTotal.toFixed(2))
        : Number(total_amount) || 0;

    const finalDebit =
      debit === "" || debit === null || debit === undefined
        ? finalTotal
        : Number(debit) || 0;

    const finalCredit =
      credit === "" || credit === null || credit === undefined
        ? 0
        : Number(credit) || 0;

    const finalDate = formatDate(invoice_date);
    const finalInvoiceNo = cleanText(invoice_no);
    const finalSupplier = cleanText(supplier_name);

    const invoiceResult = await queryAsync(
      `
      INSERT INTO purchase_invoices
      (invoice_no, supplier_name, invoice_date, total_amount, debit, credit, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalInvoiceNo,
        finalSupplier,
        finalDate,
        finalTotal,
        finalDebit,
        finalCredit,
        status || "pending",
      ]
    );

    const invoiceId = invoiceResult.insertId;
    const savedItems = [];

    for (const item of cleanedItems) {
      const product_id = await getOrCreateProductId(item.product_name);

      const itemResult = await queryAsync(
        `
        INSERT INTO purchase_invoice_items
        (invoice_id, product_id, unit_name, category_name, type_name, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          invoiceId,
          product_id,
          item.unit_name,
          item.category_name,
          item.type_name,
          item.quantity,
          item.rate,
          item.amount === null ? null : Number(item.amount.toFixed(2)),
        ]
      );

      savedItems.push({
        id: itemResult.insertId,
        invoice_id: invoiceId,
        product_id,
        product_name: item.product_name || "",
        unit_name: item.unit_name || "",
        category_name: item.category_name || "",
        type_name: item.type_name || "",
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount === null ? null : Number(item.amount.toFixed(2)),
      });
    }

    res.json({
      message: "Purchase invoice save ho gaya!",
      data: {
        id: invoiceId,
        invoice_no: finalInvoiceNo || "",
        supplier_name: finalSupplier || "",
        invoice_date: finalDate || "",
        total_amount: finalTotal,
        debit: finalDebit,
        credit: finalCredit,
        status: status || "pending",
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update invoice
router.put("/:id", async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);

    const {
      invoice_no,
      supplier_name,
      invoice_date,
      total_amount,
      debit,
      credit,
      status,
      items,
    } = req.body;

    const existing = await queryAsync(
      `SELECT id FROM purchase_invoices WHERE id = ? LIMIT 1`,
      [invoiceId]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Invoice nahi mila!" });
    }

    const cleanedItems = normalizeItems(items);

    const calculatedTotal = cleanedItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );

    const finalTotal =
      total_amount === "" || total_amount === null || total_amount === undefined
        ? Number(calculatedTotal.toFixed(2))
        : Number(total_amount) || 0;

    const finalDebit =
      debit === "" || debit === null || debit === undefined
        ? finalTotal
        : Number(debit) || 0;

    const finalCredit =
      credit === "" || credit === null || credit === undefined
        ? 0
        : Number(credit) || 0;

    const finalDate = formatDate(invoice_date);
    const finalInvoiceNo = cleanText(invoice_no);
    const finalSupplier = cleanText(supplier_name);

    await queryAsync(
      `
      UPDATE purchase_invoices
      SET invoice_no = ?, supplier_name = ?, invoice_date = ?, total_amount = ?, debit = ?, credit = ?, status = ?
      WHERE id = ?
      `,
      [
        finalInvoiceNo,
        finalSupplier,
        finalDate,
        finalTotal,
        finalDebit,
        finalCredit,
        status || "pending",
        invoiceId,
      ]
    );

    await queryAsync(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [
      invoiceId,
    ]);

    const savedItems = [];

    for (const item of cleanedItems) {
      const product_id = await getOrCreateProductId(item.product_name);

      const itemResult = await queryAsync(
        `
        INSERT INTO purchase_invoice_items
        (invoice_id, product_id, unit_name, category_name, type_name, quantity, rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          invoiceId,
          product_id,
          item.unit_name,
          item.category_name,
          item.type_name,
          item.quantity,
          item.rate,
          item.amount === null ? null : Number(item.amount.toFixed(2)),
        ]
      );

      savedItems.push({
        id: itemResult.insertId,
        invoice_id: invoiceId,
        product_id,
        product_name: item.product_name || "",
        unit_name: item.unit_name || "",
        category_name: item.category_name || "",
        type_name: item.type_name || "",
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount === null ? null : Number(item.amount.toFixed(2)),
      });
    }

    res.json({
      message: "Purchase invoice update ho gaya!",
      data: {
        id: invoiceId,
        invoice_no: finalInvoiceNo || "",
        supplier_name: finalSupplier || "",
        invoice_date: finalDate || "",
        total_amount: finalTotal,
        debit: finalDebit,
        credit: finalCredit,
        status: status || "pending",
        items: savedItems,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE invoice
router.delete("/:id", async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);

    await queryAsync(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`, [
      invoiceId,
    ]);
    await queryAsync(`DELETE FROM purchase_invoices WHERE id = ?`, [invoiceId]);

    res.json({ message: "Invoice delete ho gaya!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;