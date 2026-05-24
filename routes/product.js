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

function cleanIsActive(value) {
  if (value === undefined || value === null || value === "") return 1;

  if (typeof value === "boolean") return value ? 1 : 0;

  const text = String(value).trim().toLowerCase();

  if (["0", "false", "inactive", "in-active", "disabled", "no"].includes(text)) {
    return 0;
  }

  return 1;
}

async function getProductById(id) {
  const rows = await runQuery(
    `
    SELECT
      id,
      product_name,
      sale_unit,
      pieces_per_carton,
      piece_rate,
      COALESCE(is_active, 1) AS is_active,
      created_at
    FROM products
    WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

// GET ALL
router.get("/", async (req, res) => {
  try {
    const results = await runQuery(
      `
      SELECT
        id,
        product_name,
        sale_unit,
        pieces_per_carton,
        piece_rate,
        COALESCE(is_active, 1) AS is_active,
        created_at
      FROM products
      ORDER BY id DESC
      `
    );

    res.json(results);
  } catch (err) {
    console.error("GET /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const {
      product_name = "",
      sale_unit = "single",
      pieces_per_carton = 0,
      piece_rate = 0,
      is_active = 1,
    } = req.body;

    if (!product_name.trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const cleanSaleUnit =
      String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";

    const cleanPiecesPerCarton =
      cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;

    const cleanPieceRate = Number(piece_rate || 0);
    const cleanActive = cleanIsActive(is_active);

    if (cleanSaleUnit === "carton" && cleanPiecesPerCarton <= 0) {
      return res.status(400).json({
        message: "Pieces per carton must be greater than 0 for carton products.",
      });
    }

    if (cleanPieceRate < 0) {
      return res.status(400).json({
        message: "Piece rate cannot be negative.",
      });
    }

    const result = await runQuery(
      `
      INSERT INTO products
        (product_name, sale_unit, pieces_per_carton, piece_rate, is_active)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        product_name.trim(),
        cleanSaleUnit,
        cleanPiecesPerCarton,
        cleanPieceRate,
        cleanActive,
      ]
    );

    const record = await getProductById(result.insertId);

    res.json({ message: "Saved!", data: record });
  } catch (err) {
    console.error("POST /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const {
      product_name = "",
      sale_unit = "single",
      pieces_per_carton = 0,
      piece_rate = 0,
      is_active = 1,
    } = req.body;

    if (!product_name.trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const existing = await getProductById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    const cleanSaleUnit =
      String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";

    const cleanPiecesPerCarton =
      cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;

    const cleanPieceRate = Number(piece_rate || 0);
    const cleanActive = cleanIsActive(is_active);

    if (cleanSaleUnit === "carton" && cleanPiecesPerCarton <= 0) {
      return res.status(400).json({
        message: "Pieces per carton must be greater than 0 for carton products.",
      });
    }

    if (cleanPieceRate < 0) {
      return res.status(400).json({
        message: "Piece rate cannot be negative.",
      });
    }

    await runQuery(
      `
      UPDATE products
      SET
        product_name = ?,
        sale_unit = ?,
        pieces_per_carton = ?,
        piece_rate = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        product_name.trim(),
        cleanSaleUnit,
        cleanPiecesPerCarton,
        cleanPieceRate,
        cleanActive,
        req.params.id,
      ]
    );

    const record = await getProductById(req.params.id);

    res.json({ message: "Updated!", data: record });
  } catch (err) {
    console.error("PUT /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getProductById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    await runQuery(`DELETE FROM products WHERE id = ?`, [req.params.id]);

    res.json({ message: "Deleted!" });
  } catch (err) {
    console.error("DELETE /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
