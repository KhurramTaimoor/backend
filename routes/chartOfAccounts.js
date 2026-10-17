const express = require('express');
const router = express.Router();
const db = require('../db');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});
const trim = value => String(value ?? '').trim();
const idOf = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

// Keep using chart_of_accounts so Journal Vouchers, Cash Book and Opening
// Balances continue to reference the very same account IDs and balances.
let schemaPromise;
function schema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_code VARCHAR(80) NOT NULL DEFAULT '',
        account_title VARCHAR(180) NOT NULL,
        group_id INT NULL,
        opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      const existing = new Set((await query('SHOW COLUMNS FROM chart_of_accounts')).map(x => x.Field));
      for (const [name, definition] of Object.entries({
        phone: 'VARCHAR(50) NULL',
        address: 'VARCHAR(500) NULL',
        remarks: 'TEXT NULL',
      })) {
        if (!existing.has(name)) {
          await query(`ALTER TABLE chart_of_accounts ADD COLUMN \`${name}\` ${definition}`);
        }
      }
    })().catch(e => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}
router.use(async (_req, res, next) => {
  try { await schema(); next(); }
  catch (error) { res.status(500).json({ error: `Account setup failed: ${error.message}` }); }
});

function validate(body) {
  const title = trim(body.account_title);
  const code = trim(body.account_code);
  const groupId = idOf(body.group_id);
  const balance = Number(body.opening_balance ?? 0);
  if (!title) return { error: 'Account name is required.' };
  if (!groupId) return { error: 'Select a Chart of Accounts category.' };
  if (!Number.isFinite(balance)) return { error: 'Invalid opening balance.' };
  if (code.length > 80 || title.length > 180 || trim(body.phone).length > 50 || trim(body.address).length > 500) {
    return { error: 'One of the account fields is too long.' };
  }
  return {
    code, title, groupId, balance,
    phone: trim(body.phone), address: trim(body.address), remarks: trim(body.remarks),
  };
}
async function categoryExists(id) {
  const rows = await query('SELECT id FROM account_groups WHERE id=? LIMIT 1', [id]);
  return rows.length > 0;
}
async function codeInUse(code, excludeId = 0) {
  if (!code) return false;
  const rows = await query(
    'SELECT id FROM chart_of_accounts WHERE account_code=? AND id<>? LIMIT 1',
    [code, excludeId]
  );
  return rows.length > 0;
}

// Real General Account activity (not the customer-ledger report).
// JV lines supersede legacy two-account JV headers; the latter are used only
// when no JV lines exist. Cash/cheque entries remain linked to original IDs.
router.get('/transactions', async (_req, res) => {
  try {
    const rows = [];
    const optional = async (sql) => {
      try { rows.push(...await query(sql)); }
      catch (e) {
        if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      }
    };
    await optional(`SELECT CONCAT('JVL-', l.id) AS transaction_id, l.account_id,
      DATE_FORMAT(jv.voucher_date,'%Y-%m-%d') AS date,
      jv.voucher_no AS reference, COALESCE(NULLIF(l.description,''), jv.narration, '') AS description,
      l.debit, l.credit, 'Journal Voucher' AS status, jv.id AS voucher_id
      FROM journal_voucher_lines l JOIN journal_vouchers jv ON jv.id=l.journal_voucher_id
      WHERE l.account_type IS NULL OR LOWER(TRIM(l.account_type)) NOT IN ('customer','supplier','employee')`);
    await optional(`SELECT CONCAT('JV-', jv.id) AS transaction_id,
      jv.account_dr_id AS account_id, DATE_FORMAT(jv.voucher_date,'%Y-%m-%d') AS date,
      jv.voucher_no AS reference, jv.narration AS description,
      jv.amount AS debit, 0 AS credit, 'Journal Voucher' AS status, jv.id AS voucher_id
      FROM journal_vouchers jv
      WHERE jv.account_dr_id IS NOT NULL
        AND NOT EXISTS(SELECT 1 FROM journal_voucher_lines l WHERE l.journal_voucher_id=jv.id)
      UNION ALL
      SELECT CONCAT('JV-', jv.id, '-CR') AS transaction_id,
      jv.account_cr_id AS account_id, DATE_FORMAT(jv.voucher_date,'%Y-%m-%d') AS date,
      jv.voucher_no AS reference, jv.narration AS description,
      0 AS debit, jv.amount AS credit, 'Journal Voucher' AS status, jv.id AS voucher_id
      FROM journal_vouchers jv
      WHERE jv.account_cr_id IS NOT NULL
        AND NOT EXISTS(SELECT 1 FROM journal_voucher_lines l WHERE l.journal_voucher_id=jv.id)`);
    await optional(`SELECT CONCAT('CHQ-', cv.id) AS transaction_id,
      cv.account_id AS account_id, DATE_FORMAT(cv.issuance_date,'%Y-%m-%d') AS date,
      cv.voucher_no AS reference, CONCAT('Cheque issued to ', cv.payee_name) AS description,
      0 AS debit, cv.total_amount AS credit, 'Cheque Voucher' AS status, cv.id AS voucher_id
      FROM cheque_vouchers cv`);
    rows.sort((a,b) => String(a.date||'').localeCompare(String(b.date||'')) || String(a.transaction_id).localeCompare(String(b.transaction_id)));
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/', async (_req, res) => {
  try {
    const records = await query(`SELECT coa.*, ag.group_name, ag.type AS account_type
      FROM chart_of_accounts coa LEFT JOIN account_groups ag ON coa.group_id=ag.id
      ORDER BY coa.id DESC`);
    res.json(records);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const v = validate(req.body || {});
    if (v.error) return res.status(400).json({ error: v.error });
    if (!(await categoryExists(v.groupId))) return res.status(400).json({ error: 'Chart category not found.' });
    if (await codeInUse(v.code)) return res.status(409).json({ error: 'Account code already exists.' });
    const result = await query(`INSERT INTO chart_of_accounts
      (account_code, account_title, group_id, opening_balance, phone, address, remarks)
      VALUES (?,?,?,?,?,?,?)`,
      [v.code, v.title, v.groupId, v.balance, v.phone, v.address, v.remarks]);
    // Optional account code: when blank, create a stable code based on the new ID.
    let savedCode = v.code;
    if (!savedCode) {
      savedCode = `GA-${String(result.insertId).padStart(6, '0')}`;
      await query('UPDATE chart_of_accounts SET account_code=? WHERE id=?', [savedCode, result.insertId]);
    }
    res.status(201).json({ message: 'General account created.', id: result.insertId, account_code: savedCode });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid account ID.' });
    const v = validate(req.body || {});
    if (v.error) return res.status(400).json({ error: v.error });
    if (!(await categoryExists(v.groupId))) return res.status(400).json({ error: 'Chart category not found.' });
    if (await codeInUse(v.code, id)) return res.status(409).json({ error: 'Account code already exists.' });
    // Do not overwrite saved generated code if an edit submitted a blank code.
    const original = await query('SELECT account_code FROM chart_of_accounts WHERE id=? LIMIT 1', [id]);
    if (!original.length) return res.status(404).json({ error: 'Account not found.' });
    const code = v.code || original[0].account_code || `GA-${String(id).padStart(6, '0')}`;
    const result = await query(`UPDATE chart_of_accounts SET
      account_code=?, account_title=?, group_id=?, opening_balance=?, phone=?, address=?, remarks=? WHERE id=?`,
      [code, v.title, v.groupId, v.balance, v.phone, v.address, v.remarks, id]);
    res.json({ message: 'General account updated.', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid account ID.' });
    // Prevent deleting accounts used in journal vouchers, cash/cheques or opening balances.
    const references = [
      ['journal_voucher_lines', 'account_id'],
      ['journal_vouchers', 'account_dr_id'],
      ['journal_vouchers', 'account_cr_id'],
      ['opening_balances', 'account_id'],
      ['cheque_vouchers', 'account_id'],
    ];
    for (const [table, col] of references) {
      try {
        const extraFilter = table === 'journal_voucher_lines'
          ? " AND (account_type IS NULL OR LOWER(TRIM(account_type)) NOT IN ('customer','supplier','employee'))"
          : '';
        const found = await query(`SELECT 1 FROM \`${table}\` WHERE \`${col}\`=?${extraFilter} LIMIT 1`, [id]);
        if (found.length) return res.status(409).json({ error: 'Account has transactions. It cannot be deleted.' });
      } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      }
    }
    const result = await query('DELETE FROM chart_of_accounts WHERE id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Account not found.' });
    res.json({ message: 'General account deleted.' });
  } catch (error) {
    res.status(error.code === 'ER_ROW_IS_REFERENCED_2' ? 409 : 500).json({ error: error.code === 'ER_ROW_IS_REFERENCED_2' ? 'Account has transactions. It cannot be deleted.' : error.message });
  }
});
module.exports = router;
