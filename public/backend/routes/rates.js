const express = require("express");
const router = express.Router();
const db = require("../db");

function parseRow(row) {
  return {
    ...row,
    price_options:
      typeof row.price_options === "string"
        ? JSON.parse(row.price_options)
        : row.price_options || [],
  };
}

function cleanOptions(arr) {
  return (arr || [])
    .map((p) => ({
      category_id: Number(p.category_id) || 0,
      product_type_id: Number(p.product_type_id) || 0,
      unit_id: Number(p.unit_id) || 0,
      retail_rate: parseFloat(p.retail_rate) || 0,
      wholesale_rate: parseFloat(p.wholesale_rate) || 0,
      distributor_rate: parseFloat(p.distributor_rate) || 0,
    }))
    .filter(
      (p) =>
        p.category_id > 0 ||
        p.product_type_id > 0 ||
        p.unit_id > 0 ||
        p.retail_rate > 0 ||
        p.wholesale_rate > 0 ||
        p.distributor_rate > 0
    );
}

// GET ALL
router.get("/", (req, res) => {
  const sql = `
    SELECT
      id,
      product_id,
      price_options,
      created_at
    FROM sales_rates
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results.map(parseRow));
  });
});

// GET ONE
router.get("/:id", (req, res) => {
  const sql = `
    SELECT
      id,
      product_id,
      price_options,
      created_at
    FROM sales_rates
    WHERE id = ?
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!results.length) {
      return res.status(404).json({ message: "Rate nahi mila!" });
    }
    res.json(parseRow(results[0]));
  });
});

// CREATE
router.post("/", (req, res) => {
  const { product_id, price_options } = req.body;

  if (!product_id) {
    return res.status(400).json({ message: "Product select karna zaroori hai!" });
  }

  if (!Array.isArray(price_options) || price_options.length === 0) {
    return res
      .status(400)
      .json({ message: "Kam az kam ek price option zaroori hai!" });
  }

  const cleaned = cleanOptions(price_options);

  if (!cleaned.length) {
    return res.status(400).json({ message: "Valid price option provide karo!" });
  }

  const hasMissingCategory = cleaned.some((p) => !p.category_id);
  if (hasMissingCategory) {
    return res.status(400).json({ message: "Har row mein category select karna zaroori hai!" });
  }

  const hasMissingType = cleaned.some((p) => !p.product_type_id);
  if (hasMissingType) {
    return res.status(400).json({ message: "Har row mein product type select karna zaroori hai!" });
  }

  db.query(
    `INSERT INTO sales_rates (product_id, price_options)
     VALUES (?, ?)`,
    [Number(product_id), JSON.stringify(cleaned)],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });

      db.query(
        `SELECT
          id,
          product_id,
          price_options,
          created_at
         FROM sales_rates
         WHERE id = ?`,
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json({ message: err2.message });

          res.status(201).json({
            message: "Rate save ho gaya!",
            data: parseRow(rows[0]),
          });
        }
      );
    }
  );
});

// UPDATE
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { product_id, price_options } = req.body;

  if (!product_id) {
    return res.status(400).json({ message: "Product select karna zaroori hai!" });
  }

  if (!Array.isArray(price_options) || price_options.length === 0) {
    return res
      .status(400)
      .json({ message: "Kam az kam ek price option zaroori hai!" });
  }

  const cleaned = cleanOptions(price_options);

  if (!cleaned.length) {
    return res.status(400).json({ message: "Valid price option provide karo!" });
  }

  const hasMissingCategory = cleaned.some((p) => !p.category_id);
  if (hasMissingCategory) {
    return res.status(400).json({ message: "Har row mein category select karna zaroori hai!" });
  }

  const hasMissingType = cleaned.some((p) => !p.product_type_id);
  if (hasMissingType) {
    return res.status(400).json({ message: "Har row mein product type select karna zaroori hai!" });
  }

  db.query(
    `UPDATE sales_rates
     SET product_id = ?, price_options = ?
     WHERE id = ?`,
    [Number(product_id), JSON.stringify(cleaned), id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Rate nahi mila update ke liye!" });
      }

      db.query(
        `SELECT
          id,
          product_id,
          price_options,
          created_at
         FROM sales_rates
         WHERE id = ?`,
        [id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ message: err2.message });

          res.json({
            message: "Rate update ho gaya!",
            data: parseRow(rows[0]),
          });
        }
      );
    }
  );
});

// DELETE
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM sales_rates WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rate nahi mila delete ke liye!" });
    }

    res.json({ message: "Rate delete ho gaya!" });
  });
});

module.exports = router;