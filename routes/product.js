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
        created_at
      FROM products
      ORDER BY id DESC
      `
    );
    res.json(results);
  } catch (err) {
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
    } = req.body;

    if (!product_name.trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const cleanSaleUnit = String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";
    const cleanPiecesPerCarton = cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;
    const cleanPieceRate = Number(piece_rate || 0);

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
        (product_name, sale_unit, pieces_per_carton, piece_rate)
      VALUES (?, ?, ?, ?)
      `,
      [
        product_name.trim(),
        cleanSaleUnit,
        cleanPiecesPerCarton,
        cleanPieceRate,
      ]
    );

    const [record] = await runQuery(
      `
      SELECT
        id,
        product_name,
        sale_unit,
        pieces_per_carton,
        piece_rate,
        created_at
      FROM products
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.json({ message: "Saved!", data: record });
  } catch (err) {
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
    } = req.body;

    if (!product_name.trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const cleanSaleUnit = String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";
    const cleanPiecesPerCarton = cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;
    const cleanPieceRate = Number(piece_rate || 0);

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
        piece_rate = ?
      WHERE id = ?
      `,
      [
        product_name.trim(),
        cleanSaleUnit,
        cleanPiecesPerCarton,
        cleanPieceRate,
        req.params.id,
      ]
    );

    const [record] = await runQuery(
      `
      SELECT
        id,
        product_name,
        sale_unit,
        pieces_per_carton,
        piece_rate,
        created_at
      FROM products
      WHERE id = ?
      `,
      [req.params.id]
    );

    res.json({ message: "Updated!", data: record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM products WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;