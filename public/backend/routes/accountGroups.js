const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.query("SELECT * FROM account_groups ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { group_name, parent_group, type } = req.body;
  if (!group_name || !type) return res.status(400).json({ error: "Group name aur type zaroori hain!" });
  db.query(
    "INSERT INTO account_groups (group_name, parent_group, type) VALUES (?, ?, ?)",
    [group_name, parent_group||"", type],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Account group save ho gaya!", id: result.insertId });
    }
  );
});

router.put("/:id", (req, res) => {
  const { group_name, parent_group, type } = req.body;
  db.query(
    "UPDATE account_groups SET group_name=?, parent_group=?, type=? WHERE id=?",
    [group_name, parent_group||"", type, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Account group update ho gaya!" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM account_groups WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Account group delete ho gaya!" });
  });
});

module.exports = router;
