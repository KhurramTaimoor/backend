const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.query("SELECT * FROM departments ORDER BY id", (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(r);
  });
});

router.post("/", (req, res) => {
  const { department_name, head_of_dept, extension_no } = req.body;
  db.query(
    "INSERT INTO departments (department_name, head_of_dept, extension_no) VALUES (?,?,?)",
    [department_name, head_of_dept, extension_no],
    (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: r.insertId, message: "Saved" });
    }
  );
});

router.put("/:id", (req, res) => {
  const { department_name, head_of_dept, extension_no } = req.body;
  db.query(
    "UPDATE departments SET department_name=?, head_of_dept=?, extension_no=? WHERE id=?",
    [department_name, head_of_dept, extension_no, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Updated" });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM departments WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
