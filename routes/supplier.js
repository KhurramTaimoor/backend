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

async function getSupplierById(id) {
  const rows = await runQuery(
    `SELECT id, supplier_name, phone, created_at
     FROM suppliers
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
}

// ── GET ALL ───────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const results = await runQuery(
      `SELECT id, supplier_name, phone, created_at
       FROM suppliers
       ORDER BY id DESC`
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const supplier = await getSupplierById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    res.json({ data: supplier });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      supplier_name = "",
      phone = "",
    } = req.body;

    if (!supplier_name.trim()) {
      return res.status(400).json({ message: "Supplier name is required." });
    }

    const result = await runQuery(
      `INSERT INTO suppliers (supplier_name, phone)
       VALUES (?, ?)`,
      [
        supplier_name.trim(),
        phone.trim(),
      ]
    );

    const supplier = await getSupplierById(result.insertId);

    res.json({
      message: "Supplier saved!",
      data: supplier,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const {
      supplier_name = "",
      phone = "",
    } = req.body;

    if (!supplier_name.trim()) {
      return res.status(400).json({ message: "Supplier name is required." });
    }

    const existing = await getSupplierById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    await runQuery(
      `UPDATE suppliers
       SET supplier_name = ?, phone = ?
       WHERE id = ?`,
      [
        supplier_name.trim(),
        phone.trim(),
        req.params.id,
      ]
    );

    const updated = await getSupplierById(req.params.id);

    res.json({
      message: "Supplier updated!",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getSupplierById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found." });
    }

    await runQuery(`DELETE FROM suppliers WHERE id = ?`, [req.params.id]);

    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;