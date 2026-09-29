const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.query("SELECT * FROM retailers ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { shop_name, owner_name, contact, city, zone } = req.body;
  db.query(
    "INSERT INTO retailers (shop_name, owner_name, contact, city, zone) VALUES (?,?,?,?,?)",
    [shop_name, owner_name, contact, city, zone],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Retailer saved!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { shop_name, owner_name, contact, city, zone } = req.body;
  db.query(
    "UPDATE retailers SET shop_name = ?, owner_name = ?, contact = ?, city = ?, zone = ? WHERE id = ?",
    [shop_name, owner_name, contact, city, zone, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Retailer updated!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM retailers WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
