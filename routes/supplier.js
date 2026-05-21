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

function cleanMoney(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

async function getSupplierById(id) {
  const rows = await runQuery(
    `SELECT 
       id, 
       supplier_name, 
       phone, 
       COALESCE(opening_balance, 0) AS opening_balance,
       created_at
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
      `SELECT 
         id, 
         supplier_name, 
         phone, 
         COALESCE(opening_balance, 0) AS opening_balance,
         created_at
       FROM suppliers
       ORDER BY id DESC`
    );

    res.json(results);
  } catch (err) {
    console.error("Get suppliers error:", err);
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
    console.error("Get supplier error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      supplier_name = "",
      phone = "",
      opening_balance = 0,
    } = req.body;

    if (!supplier_name.trim()) {
      return res.status(400).json({ message: "Supplier name is required." });
    }

    const result = await runQuery(
      `INSERT INTO suppliers 
        (supplier_name, phone, opening_balance)
       VALUES (?, ?, ?)`,
      [
        supplier_name.trim(),
        phone.trim(),
        cleanMoney(opening_balance),
      ]
    );

    const supplier = await getSupplierById(result.insertId);

    res.json({
      message: "Supplier saved!",
      data: supplier,
    });
  } catch (err) {
    console.error("Create supplier error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const {
      supplier_name = "",
      phone = "",
      opening_balance = 0,
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
       SET 
         supplier_name = ?, 
         phone = ?,
         opening_balance = ?
       WHERE id = ?`,
      [
        supplier_name.trim(),
        phone.trim(),
        cleanMoney(opening_balance),
        req.params.id,
      ]
    );

    const updated = await getSupplierById(req.params.id);

    res.json({
      message: "Supplier updated!",
      data: updated,
    });
  } catch (err) {
    console.error("Update supplier error:", err);
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
    console.error("Delete supplier error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
