const express = require("express");
const router = express.Router();
const db = require("../db");

// ── GET ALL SALESMEN ──
router.get("/", (req, res) => {
  db.query("SELECT * FROM salesmen ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ── CREATE NEW SALESMAN ──
router.post("/", (req, res) => {
  console.log("👉 FRONTEND SE YEH DATA AAYA (CREATE SALESMAN):", req.body);

  const { salesman_name, phone, cnic, assigned_area, commission } = req.body;
  
  // Agar salary/commission khali ho toh usko 0 kar do taake error na aaye
  const finalSalary = commission ? Number(commission) : 0; 

  db.query(
    "INSERT INTO salesmen (salesman_name, phone, cnic, assigned_area, commission) VALUES (?,?,?,?,?)",
    [salesman_name, phone, cnic, assigned_area, finalSalary],
    (err, result) => {
      if (err) {
        console.log("❌ DB ERROR:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Salesman saved!", id: result.insertId });
    }
  );
});

// ── UPDATE SALESMAN ──
router.put("/:id", (req, res) => {
  console.log("👉 FRONTEND SE YEH DATA AAYA (UPDATE SALESMAN):", req.body);

  const { salesman_name, phone, cnic, assigned_area, commission } = req.body;
  
  const finalSalary = commission ? Number(commission) : 0;

  db.query(
    "UPDATE salesmen SET salesman_name = ?, phone = ?, cnic = ?, assigned_area = ?, commission = ? WHERE id = ?",
    [salesman_name, phone, cnic, assigned_area, finalSalary, req.params.id],
    (err) => {
      if (err) {
        console.log("❌ DB ERROR:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Salesman updated!" });
    }
  );
});

// ── DELETE SALESMAN ──
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM salesmen WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;