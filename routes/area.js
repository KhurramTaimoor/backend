const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.query("SELECT * FROM areas ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { area_name, city, region_code } = req.body;
  db.query(
    "INSERT INTO areas (area_name, city, region_code) VALUES (?,?,?)",
    [area_name, city, region_code],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Area saved!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { area_name, city, region_code } = req.body;
  db.query(
    "UPDATE areas SET area_name = ?, city = ?, region_code = ? WHERE id = ?",
    [area_name, city, region_code, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Area updated!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM areas WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
