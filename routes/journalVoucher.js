const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const clean = (v) => String(v ?? "").trim();
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const positiveId = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
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
}

router.use(async (req, res, next) => {
  try { await ensureSchema(); next(); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

const selectVoucher = async (id = null) => {
  const rows = await query(`SELECT jv.*, DATE_FORMAT(jv.voucher_date,'%Y-%m-%d') AS voucher_date,
    dr.account_title AS account_dr_name, cr.account_title AS account_cr_name
    FROM journal_vouchers jv
    LEFT JOIN chart_of_accounts dr ON dr.id=jv.account_dr_id
    LEFT JOIN chart_of_accounts cr ON cr.id=jv.account_cr_id
    ${id ? "WHERE jv.id=?" : ""} ORDER BY jv.id DESC`, id ? [id] : []);
  if (!rows.length) return id ? null : [];
  const ids = rows.map(r => r.id);
  const lines = await query(`SELECT jvl.*, coa.account_code, coa.account_title,
    COALESCE(jvl.account_type, ag.type, ag.group_name, '') AS account_type
    FROM journal_voucher_lines jvl
    LEFT JOIN chart_of_accounts coa ON coa.id=jvl.account_id
    LEFT JOIN account_groups ag ON ag.id=coa.group_id
    WHERE jvl.journal_voucher_id IN (?) ORDER BY jvl.journal_voucher_id, jvl.line_no, jvl.id`, [ids]);
  const map = {};
  lines.forEach(line => { (map[line.journal_voucher_id] ||= []).push(line); });
  const result = rows.map(r => ({ ...r, lines: map[r.id] || [] }));
  return id ? result[0] : result;
};

const normalizeLines = (body) => {
  if (Array.isArray(body.lines) && body.lines.length) {
    return body.lines.map((line, i) => ({
      line_no: i + 1,
      account_type: clean(line.account_type),
      account_id: positiveId(line.account_id),
      description: clean(line.description),
      debit: Math.max(num(line.debit), 0),
      credit: Math.max(num(line.credit), 0),
    })).filter(line => line.account_id && (line.debit > 0 || line.credit > 0));
  }
  const amount = Math.max(num(body.amount), 0);
  return [
    { line_no: 1, account_type: "", account_id: positiveId(body.account_dr_id), description: clean(body.narration), debit: amount, credit: 0 },
    { line_no: 2, account_type: "", account_id: positiveId(body.account_cr_id), description: clean(body.narration), debit: 0, credit: amount },
  ].filter(line => line.account_id && (line.debit || line.credit));
};

const validate = (body) => {
  const voucherNo = clean(body.voucher_no);
  const lines = normalizeLines(body);
  if (!voucherNo) return { error: "Voucher no zaroori hai!" };
  if (lines.length < 2) return { error: "Kam az kam 2 journal lines zaroori hain." };
  if (lines.some(line => line.debit > 0 && line.credit > 0)) return { error: "Aik line par debit aur credit dono nahi ho sakte." };
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(debit - credit) > 0.009) return { error: `Debit (${debit.toFixed(2)}) aur Credit (${credit.toFixed(2)}) equal honay chahiye.` };
  return { voucherNo, lines, debit, credit };
};

router.get("/", async (req, res) => {
  try { res.json(await selectVoucher()); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const row = await selectVoucher(Number(req.params.id));
    if (!row) return res.status(404).json({ error: "Voucher not found." });
    res.json(row);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

async function saveLines(voucherId, lines) {
  for (const line of lines) {
    await query(`INSERT INTO journal_voucher_lines
      (journal_voucher_id,line_no,account_type,account_id,description,debit,credit)
      VALUES (?,?,?,?,?,?,?)`, [voucherId,line.line_no,line.account_type||null,line.account_id,line.description||null,line.debit,line.credit]);
  }
}

router.post("/", async (req, res) => {
  try {
    const valid = validate(req.body);
    if (valid.error) return res.status(400).json({ error: valid.error });
    const firstDr = valid.lines.find(l => l.debit > 0);
    const firstCr = valid.lines.find(l => l.credit > 0);
    const result = await query(`INSERT INTO journal_vouchers
      (voucher_no,voucher_date,account_dr_id,account_cr_id,amount,narration) VALUES (?,?,?,?,?,?)`,
      [valid.voucherNo, clean(req.body.voucher_date)||today(), firstDr?.account_id||null, firstCr?.account_id||null, valid.debit, clean(req.body.narration)]);
    await saveLines(result.insertId, valid.lines);
    res.status(201).json({ message: "Journal voucher save ho gaya!", data: await selectVoucher(result.insertId) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const valid = validate(req.body);
    if (valid.error) return res.status(400).json({ error: valid.error });
    const firstDr = valid.lines.find(l => l.debit > 0);
    const firstCr = valid.lines.find(l => l.credit > 0);
    await query(`UPDATE journal_vouchers SET voucher_no=?,voucher_date=?,account_dr_id=?,account_cr_id=?,amount=?,narration=? WHERE id=?`,
      [valid.voucherNo, clean(req.body.voucher_date)||today(), firstDr?.account_id||null, firstCr?.account_id||null, valid.debit, clean(req.body.narration), id]);
    await query("DELETE FROM journal_voucher_lines WHERE journal_voucher_id=?", [id]);
    await saveLines(id, valid.lines);
    res.json({ message: "Journal voucher update ho gaya!", data: await selectVoucher(id) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await query("DELETE FROM journal_voucher_lines WHERE journal_voucher_id=?", [req.params.id]);
    await query("DELETE FROM journal_vouchers WHERE id=?", [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
