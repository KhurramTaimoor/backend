const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

const cleanMoney = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
};
const cleanText = (value) => String(value ?? "").trim();

async function tableExists(name) {
  const rows = await runQuery("SHOW TABLES LIKE ?", [name]);
  return rows.length > 0;
}

async function getColumns(name) {
  const rows = await runQuery(`SHOW COLUMNS FROM \`${name}\``);
  return new Set(rows.map((row) => row.Field));
}

async function ensureSupplierSchema() {
  await runQuery(`CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(180) NOT NULL,
    phone VARCHAR(80) NULL,
    address VARCHAR(500) NULL,
    opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
    opening_debit DECIMAL(14,2) NOT NULL DEFAULT 0,
    opening_credit DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_name (supplier_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const cols = await getColumns("suppliers");
  const additions = [
    ["address", "ALTER TABLE suppliers ADD COLUMN address VARCHAR(500) NULL AFTER phone"],
    ["opening_balance", "ALTER TABLE suppliers ADD COLUMN opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0"],
    ["opening_debit", "ALTER TABLE suppliers ADD COLUMN opening_debit DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER opening_balance"],
    ["opening_credit", "ALTER TABLE suppliers ADD COLUMN opening_credit DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER opening_debit"],
    ["created_at", "ALTER TABLE suppliers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
  ];
  for (const [column, sql] of additions) {
    if (!cols.has(column)) await runQuery(sql);
  }
}

router.use(async (req, res, next) => {
  try {
    await ensureSupplierSchema();
    next();
  } catch (error) {
    console.error("Supplier schema error:", error.message);
    res.status(500).json({ message: "Supplier database schema ready nahi ho saka.", error: error.message });
  }
});

async function calculateClosingBalance(supplier) {
  let balance = cleanMoney(
    supplier.opening_balance !== null && supplier.opening_balance !== undefined
      ? supplier.opening_balance
      : cleanMoney(supplier.opening_debit) - cleanMoney(supplier.opening_credit)
  );

  if (await tableExists("purchase_invoices")) {
    const cols = await getColumns("purchase_invoices");
    const debitExpr = cols.has("debit") ? "COALESCE(debit, total_amount, 0)" : "COALESCE(total_amount, 0)";
    const creditExpr = cols.has("credit") ? "COALESCE(credit, 0)" : "0";
    const where = cols.has("supplier_id")
      ? "(supplier_id = ? OR LOWER(TRIM(supplier_name)) = LOWER(TRIM(?)))"
      : "LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))";
    const params = cols.has("supplier_id") ? [supplier.id, supplier.supplier_name] : [supplier.supplier_name];
    const rows = await runQuery(`SELECT COALESCE(SUM(${debitExpr} - ${creditExpr}),0) AS amount FROM purchase_invoices WHERE ${where}`, params);
    balance += cleanMoney(rows[0]?.amount);
  }

  if (await tableExists("purchase_returns")) {
    const cols = await getColumns("purchase_returns");
    const amountExpr = cols.has("total_amount") ? "COALESCE(total_amount,0)" : cols.has("return_amount") ? "COALESCE(return_amount,0)" : "0";
    const where = cols.has("supplier_id")
      ? "(supplier_id = ? OR LOWER(TRIM(supplier_name)) = LOWER(TRIM(?)))"
      : cols.has("supplier_name")
      ? "LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))"
      : null;
    if (where) {
      const params = cols.has("supplier_id") ? [supplier.id, supplier.supplier_name] : [supplier.supplier_name];
      const rows = await runQuery(`SELECT COALESCE(SUM(${amountExpr}),0) AS amount FROM purchase_returns WHERE ${where}`, params);
      balance -= cleanMoney(rows[0]?.amount);
    }
  }

  if (await tableExists("supplier_ledger")) {
    const cols = await getColumns("supplier_ledger");
    if (cols.has("supplier_id")) {
      const debit = cols.has("debit") ? "COALESCE(debit,0)" : "0";
      const credit = cols.has("credit") ? "COALESCE(credit,0)" : "0";
      const rows = await runQuery(`SELECT COALESCE(SUM(${debit} - ${credit}),0) AS amount FROM supplier_ledger WHERE supplier_id = ?`, [supplier.id]);
      balance += cleanMoney(rows[0]?.amount);
    }
  }

  return cleanMoney(balance);
}

async function enrichSupplier(supplier) {
  if (!supplier) return null;
  const openingDebit = cleanMoney(supplier.opening_debit || (Number(supplier.opening_balance) > 0 ? supplier.opening_balance : 0));
  const openingCredit = cleanMoney(supplier.opening_credit || (Number(supplier.opening_balance) < 0 ? Math.abs(Number(supplier.opening_balance)) : 0));
  const openingBalance = cleanMoney(openingDebit - openingCredit);
  const normalized = { ...supplier, opening_debit: openingDebit, opening_credit: openingCredit, opening_balance: openingBalance };
  return { ...normalized, closing_balance: await calculateClosingBalance(normalized) };
}

async function getSupplierById(id) {
  const rows = await runQuery(`SELECT id, supplier_name, phone, address, COALESCE(opening_balance,0) AS opening_balance,
    COALESCE(opening_debit,0) AS opening_debit, COALESCE(opening_credit,0) AS opening_credit, created_at
    FROM suppliers WHERE id = ?`, [id]);
  return rows[0] ? enrichSupplier(rows[0]) : null;
}

router.get("/", async (req, res) => {
  try {
    const rows = await runQuery(`SELECT id, supplier_name, phone, address, COALESCE(opening_balance,0) AS opening_balance,
      COALESCE(opening_debit,0) AS opening_debit, COALESCE(opening_credit,0) AS opening_credit, created_at
      FROM suppliers ORDER BY id DESC`);
    res.json(await Promise.all(rows.map(enrichSupplier)));
  } catch (err) {
    console.error("Get suppliers error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supplier = await getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found." });
    res.json({ data: supplier });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supplierName = cleanText(req.body.supplier_name);
    if (!supplierName) return res.status(400).json({ message: "Supplier name is required." });
    const openingDebit = cleanMoney(req.body.opening_debit ?? (Number(req.body.opening_balance) > 0 ? req.body.opening_balance : 0));
    const openingCredit = cleanMoney(req.body.opening_credit ?? (Number(req.body.opening_balance) < 0 ? Math.abs(Number(req.body.opening_balance)) : 0));
    const openingBalance = cleanMoney(openingDebit - openingCredit);
    const result = await runQuery(`INSERT INTO suppliers (supplier_name, phone, address, opening_balance, opening_debit, opening_credit)
      VALUES (?, ?, ?, ?, ?, ?)`, [supplierName, cleanText(req.body.phone), cleanText(req.body.address), openingBalance, openingDebit, openingCredit]);
    res.status(201).json({ message: "Supplier saved!", data: await getSupplierById(result.insertId) });
  } catch (err) {
    console.error("Create supplier error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await getSupplierById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Supplier not found." });
    const supplierName = cleanText(req.body.supplier_name);
    if (!supplierName) return res.status(400).json({ message: "Supplier name is required." });
    const openingDebit = cleanMoney(req.body.opening_debit ?? (Number(req.body.opening_balance) > 0 ? req.body.opening_balance : 0));
    const openingCredit = cleanMoney(req.body.opening_credit ?? (Number(req.body.opening_balance) < 0 ? Math.abs(Number(req.body.opening_balance)) : 0));
    const openingBalance = cleanMoney(openingDebit - openingCredit);
    await runQuery(`UPDATE suppliers SET supplier_name=?, phone=?, address=?, opening_balance=?, opening_debit=?, opening_credit=? WHERE id=?`,
      [supplierName, cleanText(req.body.phone), cleanText(req.body.address), openingBalance, openingDebit, openingCredit, req.params.id]);
    res.json({ message: "Supplier updated!", data: await getSupplierById(req.params.id) });
  } catch (err) {
    console.error("Update supplier error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const existing = await getSupplierById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Supplier not found." });
    await runQuery("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
