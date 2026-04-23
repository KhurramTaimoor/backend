const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Number(toNumber(value).toFixed(2));
}

async function getProductById(productId) {
  const rows = await runQuery(
    `
    SELECT
      id,
      product_name,
      sale_unit,
      pieces_per_carton,
      piece_rate
    FROM products
    WHERE id = ?
    `,
    [productId]
  );
  return rows[0] || null;
}

function calculateItemValues(product, item) {
  const saleUnit = String(product.sale_unit || "single").toLowerCase();
  const pieceRate = round2(product.piece_rate || 0);
  const piecesPerCarton = toNumber(product.pieces_per_carton || 0);

  let saleType = String(item.sale_type || "single").toLowerCase();
  let cartonQty = 0;
  let piecesQty = 0;
  let qty = 0;
  let amount = 0;

  if (saleUnit === "carton") {
    if (saleType === "carton") {
      cartonQty = toNumber(item.carton_qty || 0);
      piecesQty = cartonQty * piecesPerCarton;
      qty = cartonQty;
      amount = piecesQty * pieceRate;
    } else {
      saleType = "pieces";
      piecesQty = toNumber(item.pieces_qty || 0);
      cartonQty = 0;
      qty = piecesQty;
      amount = piecesQty * pieceRate;
    }
  } else {
    saleType = "single";
    qty = toNumber(item.qty || 0);
    piecesQty = qty;
    cartonQty = 0;
    amount = qty * pieceRate;
  }

  return {
    sale_type: saleType,
    carton_qty: round2(cartonQty),
    pieces_qty: round2(piecesQty),
    qty: round2(qty),
    pieces_per_carton: piecesPerCarton,
    rate: pieceRate,
    amount: round2(amount),
  };
}

async function getInvoiceById(id) {
  const [invoices, items] = await Promise.all([
    runQuery(
      `
      SELECT
        si.id,
        si.invoice_no,
        si.customer_id,
        c.customer_name_en AS customer_name,
        DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS invoice_date,
        si.shipment_to,
        si.previous_balance,
        si.discount,
        si.invoice_total,
        si.grand_total
      FROM sales_invoices si
      LEFT JOIN customers c ON c.id = si.customer_id
      WHERE si.id = ?
      `,
      [id]
    ),
    runQuery(
      `
      SELECT
        sii.id,
        sii.invoice_id,
        sii.sr,
        sii.category_id,
        sii.category_name,
        sii.product_id,
        COALESCE(sii.product_name, p.product_name, '') AS product_name,
        sii.unit_id,
        sii.unit_name,
        COALESCE(sii.sale_type, 'single') AS sale_type,
        COALESCE(sii.carton_qty, 0) AS carton_qty,
        COALESCE(sii.pieces_qty, 0) AS pieces_qty,
        COALESCE(sii.pieces_per_carton, p.pieces_per_carton, 0) AS pieces_per_carton,
        sii.qty,
        sii.rate,
        sii.amount,
        COALESCE(p.sale_unit, 'single') AS product_sale_unit
      FROM sales_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id
      WHERE sii.invoice_id = ?
      ORDER BY sii.sr ASC, sii.id ASC
      `,
      [id]
    ),
  ]);

  if (!invoices[0]) return null;
  return { ...invoices[0], items };
}

// GET ALL
router.get("/", async (req, res) => {
  try {
    const invoices = await runQuery(
      `
      SELECT
        si.id,
        si.invoice_no,
        si.customer_id,
        c.customer_name_en AS customer_name,
        DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS invoice_date,
        si.shipment_to,
        si.previous_balance,
        si.discount,
        si.invoice_total,
        si.grand_total,
        COUNT(sii.id) AS items_count
      FROM sales_invoices si
      LEFT JOIN customers c ON c.id = si.customer_id
      LEFT JOIN sales_invoice_items sii ON sii.invoice_id = si.id
      GROUP BY
        si.id,
        si.invoice_no,
        si.customer_id,
        c.customer_name_en,
        si.invoice_date,
        si.shipment_to,
        si.previous_balance,
        si.discount,
        si.invoice_total,
        si.grand_total
      ORDER BY si.id DESC
      `
    );

    res.json(invoices);
  } catch (err) {
    console.error("GET /sales-invoices:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET INVOICE ITEMS
router.get("/:id/items", async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const items = await runQuery(
      `
      SELECT
        sii.id AS invoice_item_id,
        sii.invoice_id,
        sii.sr,
        sii.category_id,
        sii.category_name,
        sii.product_id,
        COALESCE(sii.product_name, p.product_name, '') AS product_name,
        sii.unit_id,
        sii.unit_name,
        COALESCE(sii.sale_type, 'single') AS sale_type,
        COALESCE(sii.carton_qty, 0) AS carton_qty,
        COALESCE(sii.pieces_qty, 0) AS pieces_qty,
        COALESCE(sii.pieces_per_carton, p.pieces_per_carton, 0) AS pieces_per_carton,
        sii.qty,
        sii.rate,
        sii.amount,
        DATE_FORMAT(si.invoice_date, '%Y-%m-%d') AS invoice_date,
        COALESCE(SUM(sr.return_qty), 0) AS returned_qty
      FROM sales_invoice_items sii
      INNER JOIN sales_invoices si ON si.id = sii.invoice_id
      LEFT JOIN products p ON p.id = sii.product_id
      LEFT JOIN sales_returns sr ON sr.invoice_item_id = sii.id
      WHERE sii.invoice_id = ?
      GROUP BY
        sii.id,
        sii.invoice_id,
        sii.sr,
        sii.category_id,
        sii.category_name,
        sii.product_id,
        sii.product_name,
        p.product_name,
        sii.unit_id,
        sii.unit_name,
        sii.sale_type,
        sii.carton_qty,
        sii.pieces_qty,
        sii.pieces_per_carton,
        p.pieces_per_carton,
        sii.qty,
        sii.rate,
        sii.amount,
        si.invoice_date
      ORDER BY sii.sr ASC, sii.id ASC
      `,
      [invoiceId]
    );

    const mapped = items.map((item) => {
      const qty = toNumber(item.qty);
      const returnedQty = toNumber(item.returned_qty);

      return {
        ...item,
        qty,
        carton_qty: toNumber(item.carton_qty),
        pieces_qty: toNumber(item.pieces_qty),
        pieces_per_carton: toNumber(item.pieces_per_carton),
        rate: toNumber(item.rate),
        amount: toNumber(item.amount),
        returned_qty: returnedQty,
        available_qty: Math.max(0, qty - returnedQty),
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(`GET /sales-invoices/${req.params.id}/items:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    res.json({ data: invoice });
  } catch (err) {
    console.error(`GET /sales-invoices/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const {
      invoice_no,
      customer_id = null,
      invoice_date = null,
      shipment_to = "",
      previous_balance = 0,
      discount = 0,
      items = [],
    } = req.body;

    if (!invoice_no?.trim()) {
      return res.status(400).json({ message: "Invoice No zaroori hai." });
    }

    if (!customer_id) {
      return res.status(400).json({ message: "Customer select karna zaroori hai." });
    }

    const rawItems = Array.isArray(items) ? items : [];
    const inputItems = rawItems.filter((i) => Number(i.product_id) > 0);

    if (!inputItems.length) {
      return res.status(400).json({ message: "Kam az kam ek valid item zaroori hai." });
    }

    const preparedItems = [];

    for (let idx = 0; idx < inputItems.length; idx++) {
      const item = inputItems[idx];
      const product = await getProductById(Number(item.product_id));

      if (!product) {
        return res.status(400).json({
          message: `Product ID ${item.product_id} nahi mila.`,
        });
      }

      const calc = calculateItemValues(product, item);

      if (calc.qty <= 0 && calc.pieces_qty <= 0 && calc.carton_qty <= 0) {
        return res.status(400).json({
          message: `${product.product_name} ke liye quantity zaroori hai.`,
        });
      }

      preparedItems.push({
        sr: Number(item.sr) || idx + 1,
        category_id: Number(item.category_id) || null,
        category_name: item.category_name || "",
        product_id: Number(product.id),
        product_name: product.product_name || "",
        unit_id: Number(item.unit_id) || null,
        unit_name: item.unit_name || "",
        sale_type: calc.sale_type,
        carton_qty: calc.carton_qty,
        pieces_qty: calc.pieces_qty,
        pieces_per_carton: calc.pieces_per_carton,
        qty: calc.qty,
        rate: calc.rate,
        amount: calc.amount,
      });
    }

    const invoiceTotal = round2(
      preparedItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
    );
    const cleanPreviousBalance = round2(previous_balance || 0);
    const cleanDiscount = round2(discount || 0);
    const grandTotal = round2(invoiceTotal + cleanPreviousBalance - cleanDiscount);

    const result = await runQuery(
      `
      INSERT INTO sales_invoices
      (
        invoice_no,
        customer_id,
        invoice_date,
        shipment_to,
        previous_balance,
        discount,
        invoice_total,
        grand_total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoice_no.trim(),
        Number(customer_id),
        invoice_date || null,
        shipment_to || "",
        cleanPreviousBalance,
        cleanDiscount,
        invoiceTotal,
        grandTotal,
      ]
    );

    const invoiceId = result.insertId;

    await Promise.all(
      preparedItems.map((item) =>
        runQuery(
          `
          INSERT INTO sales_invoice_items
          (
            invoice_id,
            sr,
            category_id,
            category_name,
            product_id,
            product_name,
            unit_id,
            unit_name,
            sale_type,
            carton_qty,
            pieces_qty,
            pieces_per_carton,
            qty,
            rate,
            amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            invoiceId,
            item.sr,
            item.category_id,
            item.category_name,
            item.product_id,
            item.product_name,
            item.unit_id,
            item.unit_name,
            item.sale_type,
            item.carton_qty,
            item.pieces_qty,
            item.pieces_per_carton,
            item.qty,
            item.rate,
            item.amount,
          ]
        )
      )
    );

    const invoice = await getInvoiceById(invoiceId);
    res.json({ message: "Invoice save ho gayi!", data: invoice });
  } catch (err) {
    console.error("POST /sales-invoices:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const {
      invoice_no,
      customer_id = null,
      invoice_date = null,
      shipment_to = "",
      previous_balance = 0,
      discount = 0,
      items = [],
    } = req.body;

    if (!invoice_no?.trim()) {
      return res.status(400).json({ message: "Invoice No zaroori hai." });
    }

    if (!customer_id) {
      return res.status(400).json({ message: "Customer select karna zaroori hai." });
    }

    const rawItems = Array.isArray(items) ? items : [];
    const inputItems = rawItems.filter((i) => Number(i.product_id) > 0);

    if (!inputItems.length) {
      return res.status(400).json({ message: "Kam az kam ek valid item zaroori hai." });
    }

    const preparedItems = [];

    for (let idx = 0; idx < inputItems.length; idx++) {
      const item = inputItems[idx];
      const product = await getProductById(Number(item.product_id));

      if (!product) {
        return res.status(400).json({
          message: `Product ID ${item.product_id} nahi mila.`,
        });
      }

      const calc = calculateItemValues(product, item);

      if (calc.qty <= 0 && calc.pieces_qty <= 0 && calc.carton_qty <= 0) {
        return res.status(400).json({
          message: `${product.product_name} ke liye quantity zaroori hai.`,
        });
      }

      preparedItems.push({
        sr: Number(item.sr) || idx + 1,
        category_id: Number(item.category_id) || null,
        category_name: item.category_name || "",
        product_id: Number(product.id),
        product_name: product.product_name || "",
        unit_id: Number(item.unit_id) || null,
        unit_name: item.unit_name || "",
        sale_type: calc.sale_type,
        carton_qty: calc.carton_qty,
        pieces_qty: calc.pieces_qty,
        pieces_per_carton: calc.pieces_per_carton,
        qty: calc.qty,
        rate: calc.rate,
        amount: calc.amount,
      });
    }

    const invoiceTotal = round2(
      preparedItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
    );
    const cleanPreviousBalance = round2(previous_balance || 0);
    const cleanDiscount = round2(discount || 0);
    const grandTotal = round2(invoiceTotal + cleanPreviousBalance - cleanDiscount);

    await runQuery(
      `
      UPDATE sales_invoices
      SET
        invoice_no = ?,
        customer_id = ?,
        invoice_date = ?,
        shipment_to = ?,
        previous_balance = ?,
        discount = ?,
        invoice_total = ?,
        grand_total = ?
      WHERE id = ?
      `,
      [
        invoice_no.trim(),
        Number(customer_id),
        invoice_date || null,
        shipment_to || "",
        cleanPreviousBalance,
        cleanDiscount,
        invoiceTotal,
        grandTotal,
        req.params.id,
      ]
    );

    await runQuery(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [
      req.params.id,
    ]);

    await Promise.all(
      preparedItems.map((item) =>
        runQuery(
          `
          INSERT INTO sales_invoice_items
          (
            invoice_id,
            sr,
            category_id,
            category_name,
            product_id,
            product_name,
            unit_id,
            unit_name,
            sale_type,
            carton_qty,
            pieces_qty,
            pieces_per_carton,
            qty,
            rate,
            amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            req.params.id,
            item.sr,
            item.category_id,
            item.category_name,
            item.product_id,
            item.product_name,
            item.unit_id,
            item.unit_name,
            item.sale_type,
            item.carton_qty,
            item.pieces_qty,
            item.pieces_per_carton,
            item.qty,
            item.rate,
            item.amount,
          ]
        )
      )
    );

    const invoice = await getInvoiceById(req.params.id);
    res.json({ message: "Invoice update ho gayi!", data: invoice });
  } catch (err) {
    console.error(`PUT /sales-invoices/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM sales_invoices WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    console.error(`DELETE /sales-invoices/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;