const express = require("express");
const router = express.Router();
const db = require("../db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// ─── helper: normalize nullable text ─────────────────────────────────────────
const cleanText = (value) => {
  const v = String(value || "").trim();
  return v || null;
};

// ─── helper: normalize products ──────────────────────────────────────────────
const normalizeProducts = (products) => {
  if (!Array.isArray(products)) return [];

  return products
    .map((item) => ({
      product_name: cleanText(item.product_name),
      unit_name: cleanText(item.unit_name),
      category_name: cleanText(item.category_name),
      type_name: cleanText(item.type_name),
      rate:
        item.rate === "" || item.rate === null || item.rate === undefined
          ? null
          : Number(item.rate),
      quantity:
        item.quantity === "" || item.quantity === null || item.quantity === undefined
          ? null
          : Number(item.quantity),
      effective_date: cleanText(item.effective_date),
    }))
    .filter((item) => item.product_name);
};

// ─── helper: insert multiple product rows ────────────────────────────────────
const insertRows = async (supplier_name, products) => {
  const inserted = [];

  for (const item of products) {
    const product_name = cleanText(item.product_name);
    const unit_name = cleanText(item.unit_name);
    const category_name = cleanText(item.category_name);
    const type_name = cleanText(item.type_name);
    const rate =
      item.rate === "" || item.rate === null || item.rate === undefined
        ? null
        : Number(item.rate);
    const quantity =
      item.quantity === "" || item.quantity === null || item.quantity === undefined
        ? null
        : Number(item.quantity);
    const effective_date = cleanText(item.effective_date);

    // sirf product mandatory hai
    if (!product_name) continue;

    const result = await queryAsync(
      `INSERT INTO purchase_rates
         (supplier_name, product_name, unit_name, category_name, type_name, rate, quantity, effective_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanText(supplier_name),
        product_name,
        unit_name,
        category_name,
        type_name,
        Number.isNaN(rate) ? null : rate,
        Number.isNaN(quantity) ? null : quantity,
        effective_date,
      ]
    );

    inserted.push({
      id: result.insertId,
      supplier_name: cleanText(supplier_name),
      product_name,
      unit_name,
      category_name,
      type_name,
      rate: Number.isNaN(rate) ? null : rate,
      quantity: Number.isNaN(quantity) ? null : quantity,
      effective_date: effective_date || null,
    });
  }

  return inserted;
};

// ─── GET /api/purchase-rates ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const rows = await queryAsync(
      `SELECT *
       FROM purchase_rates
       ORDER BY id DESC`
    );

    const grouped = {};

    for (const row of rows) {
      const key = row.supplier_name && String(row.supplier_name).trim()
        ? String(row.supplier_name).trim()
        : "__NO_SUPPLIER__";

      if (!grouped[key]) {
        grouped[key] = {
          id: row.id,
          supplier_name: row.supplier_name || null,
          products: [],
        };
      }

      grouped[key].products.push({
        id: row.id,
        product_name: row.product_name || "",
        unit_name: row.unit_name || "",
        category_name: row.category_name || "",
        type_name: row.type_name || "",
        rate:
          row.rate === null || row.rate === undefined ? null : Number(row.rate),
        quantity:
          row.quantity === null || row.quantity === undefined
            ? null
            : Number(row.quantity),
        effective_date: row.effective_date || null,
      });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/purchase-rates ────────────────────────────────────────────────
// Body: {
//   supplier_name,
//   products: [{ product_name, unit_name, category_name, type_name, rate, quantity, effective_date }]
// }
router.post("/", async (req, res) => {
  try {
    const { supplier_name = "", products = [] } = req.body;

    const validProducts = normalizeProducts(products);

    if (!validProducts.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam aik product zaroori hai!" });
    }

    const inserted = await insertRows(supplier_name, validProducts);

    if (!inserted.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam aik valid product row zaroori hai!" });
    }

    res.json({
      message: "Purchase rates save ho gaye!",
      data: {
        id: inserted[0].id,
        supplier_name: cleanText(supplier_name),
        products: inserted,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/purchase-rates/:supplier_name ──────────────────────────────────
// URL param purana supplier name ho sakta hai. Empty supplier walay case mein
// frontend ko better hai id-based update use kare, lekin abhi same pattern maintain kar rahe hain.
router.put("/:supplier_name", async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.supplier_name || "").trim();
    const { supplier_name = "", products = [] } = req.body;

    const validProducts = normalizeProducts(products);

    if (!validProducts.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam aik product zaroori hai!" });
    }

    await queryAsync(`DELETE FROM purchase_rates WHERE supplier_name = ?`, [oldName]);

    const updated = await insertRows(supplier_name, validProducts);

    if (!updated.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam aik valid product row zaroori hai!" });
    }

    res.json({
      message: "Purchase rates update ho gaye!",
      data: {
        id: updated[0].id,
        supplier_name: cleanText(supplier_name),
        products: updated,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/purchase-rates/:supplier_name ───────────────────────────────
router.delete("/:supplier_name", async (req, res) => {
  try {
    const supplier_name = decodeURIComponent(req.params.supplier_name || "").trim();

    await queryAsync(`DELETE FROM purchase_rates WHERE supplier_name = ?`, [
      supplier_name,
    ]);

    res.json({ message: "Purchase rates delete ho gaye!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;