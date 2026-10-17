const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const text = (v) => String(v ?? "").trim();
const idNumber = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const money = (v) => Math.round(Number(v) * 100) / 100;
const typeNames = new Set(["customer", "supplier", "employee", "general"]);
const cleanType = (v) => typeNames.has(text(v).toLowerCase()) ? text(v).toLowerCase() : "general";
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(text(s)) && !Number.isNaN(Date.parse(`${text(s)}T00:00:00Z`));
const today = () => new Date().toISOString().slice(0, 10);

async function ensureSchema() {
  await query(`CREATE TABLE IF NOT EXISTS journal_vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_no VARCHAR(100) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    account_dr_id INT NULL,
    account_cr_id INT NULL,
    amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    narration TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await query(`CREATE TABLE IF NOT EXISTS journal_voucher_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_voucher_id INT NOT NULL,
    line_no INT NOT NULL DEFAULT 1,
    account_type VARCHAR(100) NULL,
    account_id INT NOT NULL,
    description VARCHAR(500) NULL,
    debit DECIMAL(14,2) NOT NULL DEFAULT 0,
    credit DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_jv_line_voucher (journal_voucher_id),
    INDEX idx_jv_line_account (account_id),
    CONSTRAINT fk_jv_lines_header FOREIGN KEY (journal_voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  // A durable counter keeps JV numbers unique, including after deleting a voucher.
  await query(`CREATE TABLE IF NOT EXISTS journal_voucher_counters (
    counter_key VARCHAR(20) PRIMARY KEY,
    last_number BIGINT UNSIGNED NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.use(async (_req, res, next) => {
  try { await ensureSchema(); next(); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

// Each account type has its own ID namespace. Never join it to the wrong master table.
const accountSources = {
  customer: { table: "customers", label: "customer_name_en" },
  supplier: { table: "suppliers", label: "supplier_name" },
  employee: { table: "employees", label: "full_name" },
  general: { table: "chart_of_accounts", label: "account_title" },
};

router.get("/accounts", async (_req, res) => {
  try {
    const entries = await Promise.all(Object.entries(accountSources).map(async ([account_type, source]) => {
      const rows = await query(`SELECT id, ${source.label} AS account_title FROM ${source.table} ORDER BY ${source.label} ASC`);
      return rows.map(row => ({ id: row.id, account_type, account_title: row.account_title || "" }));
    }));
    res.json(entries.flat());
  } catch (error) { res.status(500).json({ error: error.message || "Accounts could not be loaded" }); }
});

// Preview shows the next expected number. The final number is reserved atomically on save.
const formatVoucherNo = (n) => `JV-${String(n).padStart(6, "0")}`;
const findLegacyMaxNumber = async (execute = query) => {
  const rows = await execute(`SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_no, 4) AS UNSIGNED)), 0) AS max_number
    FROM journal_vouchers WHERE voucher_no REGEXP '^JV-[0-9]+$'`);
  return Number(rows[0]?.max_number || 0);
};
const getPreviewVoucherNo = async () => {
  const [rows, legacyMax] = await Promise.all([
    query("SELECT last_number FROM journal_voucher_counters WHERE counter_key = 'JV'"),
    findLegacyMaxNumber(),
  ]);
  return formatVoucherNo(Math.max(Number(rows[0]?.last_number || 0), legacyMax) + 1);
};
async function reserveVoucherNo(execute) {
  await execute(`INSERT INTO journal_voucher_counters (counter_key, last_number)
    VALUES ('JV', 0) ON DUPLICATE KEY UPDATE last_number = last_number`);
  const rows = await execute("SELECT last_number FROM journal_voucher_counters WHERE counter_key = 'JV' FOR UPDATE");
  const legacyMax = await findLegacyMaxNumber(execute);
  const next = Math.max(Number(rows[0]?.last_number || 0), legacyMax) + 1;
  await execute("UPDATE journal_voucher_counters SET last_number = ? WHERE counter_key = 'JV'", [next]);
  return formatVoucherNo(next);
}
router.get("/next-number", async (_req, res) => {
  try { res.json({ voucher_no: await getPreviewVoucherNo() }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

async function selectVoucher(id = null, filters = {}) {
  const where = [];
  const params = [];
  if (id !== null) { where.push("jv.id = ?"); params.push(id); }
  if (filters.from_date) { where.push("jv.voucher_date >= ?"); params.push(filters.from_date); }
  if (filters.to_date) { where.push("jv.voucher_date <= ?"); params.push(filters.to_date); }
  const rows = await query(`
    SELECT jv.*, DATE_FORMAT(jv.voucher_date, '%Y-%m-%d') AS voucher_date,
      dr.account_title AS account_dr_name, cr.account_title AS account_cr_name
    FROM journal_vouchers jv
    LEFT JOIN chart_of_accounts dr ON dr.id = jv.account_dr_id
    LEFT JOIN chart_of_accounts cr ON cr.id = jv.account_cr_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY jv.voucher_date DESC, jv.id DESC
  `, params);
  if (!rows.length) return id !== null ? null : [];

  const voucherIds = rows.map(row => row.id);
  const lines = await query(`
    SELECT jvl.*,
      CASE WHEN LOWER(TRIM(jvl.account_type)) IN ('customer','supplier','employee','general')
        THEN LOWER(TRIM(jvl.account_type)) ELSE 'general' END AS account_type,
      COALESCE(c.customer_name_en, s.supplier_name, e.full_name, coa.account_title,
        CONCAT('Account #', jvl.account_id)) AS account_title,
      COALESCE(coa.account_code, '') AS account_code
    FROM journal_voucher_lines jvl
    LEFT JOIN customers c ON c.id = jvl.account_id AND LOWER(TRIM(jvl.account_type)) = 'customer'
    LEFT JOIN suppliers s ON s.id = jvl.account_id AND LOWER(TRIM(jvl.account_type)) = 'supplier'
    LEFT JOIN employees e ON e.id = jvl.account_id AND LOWER(TRIM(jvl.account_type)) = 'employee'
    LEFT JOIN chart_of_accounts coa ON coa.id = jvl.account_id
      AND (jvl.account_type IS NULL OR LOWER(TRIM(jvl.account_type)) NOT IN ('customer','supplier','employee'))
    WHERE jvl.journal_voucher_id IN (?)
    ORDER BY jvl.journal_voucher_id ASC, jvl.line_no ASC, jvl.id ASC
  `, [voucherIds]);
  const byVoucher = new Map();
  for (const line of lines) {
    if (!byVoucher.has(line.journal_voucher_id)) byVoucher.set(line.journal_voucher_id, []);
    byVoucher.get(line.journal_voucher_id).push(line);
  }
  const output = rows.map(row => {
    let voucherLines = byVoucher.get(row.id) || [];
    // Keep older two-account journal vouchers visible in the new report.
    if (!voucherLines.length && row.account_dr_id && row.account_cr_id) {
      voucherLines = [
        { line_no: 1, account_type: 'general', account_id: row.account_dr_id, account_title: row.account_dr_name || `#${row.account_dr_id}`, description: row.narration || '', debit: row.amount, credit: 0 },
        { line_no: 2, account_type: 'general', account_id: row.account_cr_id, account_title: row.account_cr_name || `#${row.account_cr_id}`, description: row.narration || '', debit: 0, credit: row.amount },
      ];
    }
    return { ...row, lines: voucherLines };
  });
  return id !== null ? output[0] : output;
}

async function checkDateFilters(req, res, next) {
  const { from_date, to_date } = req.query;
  if ((from_date && !isDate(from_date)) || (to_date && !isDate(to_date)) || (from_date && to_date && from_date > to_date)) {
    return res.status(400).json({ error: "Please select a valid date range." });
  }
  next();
}
router.get("/report", checkDateFilters, async (req, res) => {
  try {
    const rows = await selectVoucher(null, req.query);
    const summary = rows.reduce((acc, row) => {
      acc.count += 1;
      acc.debit += row.lines.reduce((s, line) => s + Number(line.debit || 0), 0);
      acc.credit += row.lines.reduce((s, line) => s + Number(line.credit || 0), 0);
      return acc;
    }, { count: 0, debit: 0, credit: 0 });
    res.json({ data: rows, summary, from_date: req.query.from_date || null, to_date: req.query.to_date || null });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get("/", checkDateFilters, async (req, res) => {
  try { res.json(await selectVoucher(null, req.query)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
router.get("/:id", async (req, res) => {
  try {
    const id = idNumber(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid voucher id" });
    const row = await selectVoucher(id);
    if (!row) return res.status(404).json({ error: "Voucher not found" });
    res.json(row);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

function validate(body) {
  const voucherNo = text(body.voucher_no);
  const date = text(body.voucher_date || today());
  if (!isDate(date)) return { error: "A valid voucher date is required." };
  // Support old clients that still post the original two-account voucher shape.
  const sourceLines = Array.isArray(body.lines) && body.lines.length
    ? body.lines
    : body.account_dr_id && body.account_cr_id && Number(body.amount) > 0
      ? [
          { account_type: 'general', account_id: body.account_dr_id, debit: body.amount, credit: 0, description: body.narration },
          { account_type: 'general', account_id: body.account_cr_id, debit: 0, credit: body.amount, description: body.narration },
        ]
      : [];
  if (sourceLines.length < 2) return { error: "At least 2 lines are required." };
  const lines = sourceLines.map((raw, index) => ({
    line_no: index + 1,
    account_type: !text(raw.account_type) ? 'general' : typeNames.has(text(raw.account_type).toLowerCase()) ? text(raw.account_type).toLowerCase() : null,
    account_id: idNumber(raw.account_id),
    description: text(raw.description).slice(0, 500),
    debit: money(raw.debit || 0),
    credit: money(raw.credit || 0),
  }));
  if (lines.some(line => !line.account_type || !line.account_id || !Number.isFinite(line.debit) || !Number.isFinite(line.credit) || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0))) {
    return { error: "Each line needs a valid account and either Debit or Credit amount." };
  }
  const debit = money(lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = money(lines.reduce((sum, line) => sum + line.credit, 0));
  if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit <= 0 || Math.abs(debit - credit) >= 0.01) {
    return { error: "Voucher must be balanced: total Debit equals total Credit." };
  }
  return { voucherNo, date, lines, debit, narration: text(body.narration) };
}
async function validateAccounts(lines) {
  for (const line of lines) {
    const source = accountSources[line.account_type];
    const match = await query(`SELECT id FROM ${source.table} WHERE id = ? LIMIT 1`, [line.account_id]);
    if (!match.length) return `${line.account_type} account #${line.account_id} was not found.`;
  }
  return null;
}
function transaction(callback) {
  return new Promise((resolve, reject) => {
    db.getConnection((error, connection) => {
      if (error) return reject(error);
      const execute = (sql, params = []) => new Promise((ok, fail) => {
        connection.query(sql, params, (err, result) => err ? fail(err) : ok(result));
      });
      connection.beginTransaction(async (beginError) => {
        if (beginError) { connection.release(); return reject(beginError); }
        try {
          const result = await callback(execute);
          connection.commit(commitError => {
            if (commitError) return connection.rollback(() => { connection.release(); reject(commitError); });
            connection.release(); resolve(result);
          });
        } catch (err) {
          connection.rollback(() => { connection.release(); reject(err); });
        }
      });
    });
  });
}
async function storeLines(execute, voucherId, lines) {
  for (const line of lines) {
    await execute(`INSERT INTO journal_voucher_lines
      (journal_voucher_id, line_no, account_type, account_id, description, debit, credit)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [voucherId, line.line_no, line.account_type, line.account_id, line.description || null, line.debit, line.credit]);
  }
}
function firstGeneral(lines, field) {
  return lines.find(line => line[field] > 0 && line.account_type === 'general')?.account_id || null;
}
router.post("/", async (req, res) => {
  try {
    const valid = validate(req.body);
    if (valid.error) return res.status(400).json({ error: valid.error });
    const invalid = await validateAccounts(valid.lines);
    if (invalid) return res.status(400).json({ error: invalid });
    const id = await transaction(async execute => {
      // Never trust the browser's preview: allocate the next number on this transaction.
      const voucherNo = await reserveVoucherNo(execute);
      const result = await execute(`INSERT INTO journal_vouchers
        (voucher_no, voucher_date, account_dr_id, account_cr_id, amount, narration)
        VALUES (?, ?, ?, ?, ?, ?)`, [voucherNo, valid.date, firstGeneral(valid.lines, 'debit'), firstGeneral(valid.lines, 'credit'), valid.debit, valid.narration]);
      await storeLines(execute, result.insertId, valid.lines);
      return result.insertId;
    });
    res.status(201).json({ message: "Journal voucher saved", data: await selectVoucher(id) });
  } catch (error) { res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: error.message }); }
});
router.put("/:id", async (req, res) => {
  try {
    const id = idNumber(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid voucher id" });
    const valid = validate(req.body);
    if (valid.error) return res.status(400).json({ error: valid.error });
    const invalid = await validateAccounts(valid.lines);
    if (invalid) return res.status(400).json({ error: invalid });
    await transaction(async execute => {
      const existing = await execute("SELECT id, voucher_no FROM journal_vouchers WHERE id = ? FOR UPDATE", [id]);
      if (!existing.length) { const err = new Error("Voucher not found"); err.status = 404; throw err; }
      // Preserve the original voucher number when editing, including legacy vouchers.
      await execute(`UPDATE journal_vouchers SET voucher_date = ?, account_dr_id = ?, account_cr_id = ?, amount = ?, narration = ? WHERE id = ?`,
        [valid.date, firstGeneral(valid.lines, 'debit'), firstGeneral(valid.lines, 'credit'), valid.debit, valid.narration, id]);
      await execute("DELETE FROM journal_voucher_lines WHERE journal_voucher_id = ?", [id]);
      await storeLines(execute, id, valid.lines);
    });
    res.json({ message: "Journal voucher updated", data: await selectVoucher(id) });
  } catch (error) { res.status(error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500)).json({ error: error.message }); }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = idNumber(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid voucher id" });
    await transaction(async execute => {
      await execute("DELETE FROM journal_voucher_lines WHERE journal_voucher_id = ?", [id]);
      await execute("DELETE FROM journal_vouchers WHERE id = ?", [id]);
    });
    res.json({ message: "Voucher deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
