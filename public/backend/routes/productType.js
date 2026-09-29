const express = require("express");
const router  = express.Router();
const db      = require("../db");

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
      `SELECT id, product_type_en, created_at FROM product_types ORDER BY id DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { product_type_en = "" } = req.body;
    if (!product_type_en.trim())
      return res.status(400).json({ message: "Product type name is required." });

    const result = await runQuery(
      `INSERT INTO product_types (product_type_en) VALUES (?)`,
      [product_type_en.trim()]
    );
    const [record] = await runQuery(
      `SELECT id, product_type_en, created_at FROM product_types WHERE id = ?`,
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
    const { product_type_en = "" } = req.body;
    if (!product_type_en.trim())
      return res.status(400).json({ message: "Product type name is required." });

    await runQuery(
      `UPDATE product_types SET product_type_en = ? WHERE id = ?`,
      [product_type_en.trim(), req.params.id]
    );
    const [record] = await runQuery(
      `SELECT id, product_type_en, created_at FROM product_types WHERE id = ?`,
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
    await runQuery(`DELETE FROM product_types WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;