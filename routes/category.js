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
      `SELECT id, category_name, created_at FROM categories ORDER BY id DESC`
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { category_name = "" } = req.body;
    if (!category_name.trim())
      return res.status(400).json({ message: "Category name is required." });

    const result = await runQuery(
      `INSERT INTO categories (category_name) VALUES (?)`,
      [category_name.trim()]
    );
    const [record] = await runQuery(
      `SELECT id, category_name, created_at FROM categories WHERE id = ?`,
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
    const { category_name = "" } = req.body;
    if (!category_name.trim())
      return res.status(400).json({ message: "Category name is required." });

    await runQuery(
      `UPDATE categories SET category_name = ? WHERE id = ?`,
      [category_name.trim(), req.params.id]
    );
    const [record] = await runQuery(
      `SELECT id, category_name, created_at FROM categories WHERE id = ?`,
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
    await runQuery(`DELETE FROM categories WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;