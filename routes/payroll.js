const express = require('express');
const router = express.Router();
const db = require('../db');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;

async function ensureStatusTable() {
  await query(`CREATE TABLE IF NOT EXISTS payroll_period_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    status ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_employee_period (employee_id, from_date, to_date),
    INDEX idx_period_dates (from_date, to_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function validateRange(req) {
  const from = String(req.query.from_date || req.body?.from_date || '');
  const to = String(req.query.to_date || req.body?.to_date || '');
  if (!validDate(from) || !validDate(to) || from > to) {
    const error = new Error('Select a valid From Date and To Date.');
    error.status = 400;
    throw error;
  }
  if ((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000 > 366) {
    const error = new Error('Select a period of up to 366 days.');
    error.status = 400;
    throw error;
  }
  return { from, to };
}

// Cash Book uses one header per voucher and separate account-specific rows.
// Legacy cash_book records mirror these rows, so they MUST NOT be summed again.
async function wagesByEmployee(from, to) {
  const records = await query(`
    SELECT pi.assignee_id AS employee_id, ROUND(COALESCE(SUM(pii.amount),0),2) AS wages
    FROM production_invoices pi
    JOIN production_invoice_items pii ON pii.production_invoice_id = pi.id
    WHERE pi.assignee_type = 'employee'
      AND pi.production_date >= ? AND pi.production_date <= ?
      AND COALESCE(pi.status,'Pending') <> 'Cancelled'
    GROUP BY pi.assignee_id`, [from, to]);
  return new Map(records.map(row => [Number(row.employee_id), amount(row.wages)]));
}

async function cashByEmployee(from, to) {
  const records = await query(`
    SELECT cbvi.account_id AS employee_id,
           ROUND(COALESCE(SUM(CASE WHEN LOWER(COALESCE(cbvi.description,'')) LIKE '%advance%' OR COALESCE(cbvi.description,'') LIKE '%ایڈوانس%' THEN cbvi.paid ELSE 0 END),0),2) AS paid,
           ROUND(COALESCE(SUM(cbvi.receive),0),2) AS received
    FROM cash_book_voucher_items cbvi
    JOIN cash_book_vouchers cbv ON cbv.id = cbvi.voucher_id
    WHERE cbvi.account_type = 'employee'
      AND cbv.voucher_date >= ? AND cbv.voucher_date <= ?
    GROUP BY cbvi.account_id`, [from, to]);
  return new Map(records.map(row => [Number(row.employee_id), {paid: amount(row.paid), received: amount(row.received)}]));
}

// Cheques are ledger movements on issue/receipt date. Linked clearing slips
// also appear in Cash Book, so omit those linked slips from B/F to prevent duplication.
async function priorChequeMovement(from) {
  try {
    const records = await query(`
      SELECT account_id AS employee_id,
             ROUND(SUM(CASE WHEN cheque_direction = 'receive' THEN total_amount ELSE -total_amount END),2) AS adjustment
      FROM cheque_vouchers
      WHERE account_type = 'employee' AND issuance_date < ?
      GROUP BY account_id`, [from]);
    return new Map(records.map(row => [Number(row.employee_id), amount(row.adjustment)]));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') return new Map();
    throw error;
  }
}

async function priorUnlinkedCash(from) {
  const end = new Date(new Date(`${from}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0,10);
  try {
    const records = await query(`
      SELECT cbvi.account_id AS employee_id,
             ROUND(SUM(cbvi.paid),2) AS paid, ROUND(SUM(cbvi.receive),2) AS received
      FROM cash_book_voucher_items cbvi
      JOIN cash_book_vouchers cbv ON cbv.id = cbvi.voucher_id
      LEFT JOIN cheque_cashbook_links cbl ON cbl.cash_book_item_id = cbvi.id
      WHERE cbvi.account_type = 'employee'
        AND cbv.voucher_date >= '1900-01-01' AND cbv.voucher_date <= ?
        AND cbl.cash_book_item_id IS NULL
      GROUP BY cbvi.account_id`, [end]);
    return new Map(records.map(row => [Number(row.employee_id), {paid:amount(row.paid),received:amount(row.received)}]));
  } catch(error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') return cashByEmployee('1900-01-01', end);
    throw error;
  }
}

async function journalBefore(from) {
  try {
    const rows = await query(`
      SELECT jvl.account_id AS employee_id,
             ROUND(COALESCE(SUM(jvl.credit - jvl.debit),0),2) AS adjustment
      FROM journal_voucher_lines jvl
      JOIN journal_vouchers jv ON jv.id = jvl.journal_voucher_id
      WHERE LOWER(TRIM(jvl.account_type)) = 'employee' AND jv.voucher_date < ?
      GROUP BY jvl.account_id`, [from]);
    return new Map(rows.map(row => [Number(row.employee_id), amount(row.adjustment)]));
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return new Map();
    throw error;
  }
}

router.get('/', async (req, res) => {
  try {
    const {from, to} = validateRange(req);
    await ensureStatusTable();
    const employees = await query(`
      SELECT id, full_name, employee_type
      FROM employees WHERE LOWER(TRIM(employee_type)) = 'contractor'
      ORDER BY full_name ASC`);
    const [periodWages, priorWages, periodCash, priorCash, priorJournal, priorCheques, statuses] = await Promise.all([
      wagesByEmployee(from, to),
      wagesByEmployee('1900-01-01', new Date(new Date(`${from}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0,10)),
      cashByEmployee(from, to),
      priorUnlinkedCash(from),
      journalBefore(from),
      priorChequeMovement(from),
      query(`SELECT employee_id, status FROM payroll_period_status WHERE from_date=? AND to_date=?`, [from,to]),
    ]);
    const statusMap = new Map(statuses.map(row=>[Number(row.employee_id),row.status]));
    const rows = employees.map(employee => {
      const id=Number(employee.id);
      const wages=periodWages.get(id)||0;
      const cash=periodCash.get(id)||{paid:0,received:0};
      const advance=cash.paid;
      const remaining=amount(wages - advance);
      const beforeCash=priorCash.get(id)||{paid:0,received:0};
      const previous=amount((priorWages.get(id)||0) - beforeCash.paid + beforeCash.received + (priorJournal.get(id)||0) + (priorCheques.get(id)||0));
      const total=amount(remaining + previous);
      return {employee_id:id, contractor_name:employee.full_name, wages_amount:wages, advance, remaining_balance:remaining, previous_balance:previous, total_balance:total, status:statusMap.get(id)||'Unpaid'};
    });
    const summary = {
      total_wages:amount(rows.reduce((n,r)=>n+r.wages_amount,0)),
      total_advance:amount(rows.reduce((n,r)=>n+r.advance,0)),
      period_remaining:amount(rows.reduce((n,r)=>n+r.remaining_balance,0)),
      paid_count:rows.filter(r=>r.status==='Paid').length,
      unpaid_count:rows.filter(r=>r.status!=='Paid').length,
    };
    res.json({success:true, from_date:from,to_date:to, summary, data:rows,
      note:'Advance is employee-account Paid cashbook lines explicitly marked Advance/ایڈوانس during the selected period. Previous Balance uses earlier production wages, cash, employee JV and cheque ledger movements; mirrored legacy cash and linked cheque cash rows are excluded.'});
  } catch(error) {
    res.status(error.status||500).json({success:false,message:error.message});
  }
});

router.put('/status', async(req,res)=>{
  try {
    const {from,to}=validateRange(req);
    await ensureStatusTable();
    const id=Number(req.body.employee_id);
    const status=req.body.status;
    if (!Number.isInteger(id) || id<1 || !['Paid','Unpaid'].includes(status)) return res.status(400).json({success:false,message:'Valid employee and Paid/Unpaid status required.'});
    const employee=await query("SELECT id FROM employees WHERE id=? AND LOWER(TRIM(employee_type))='contractor'",[id]);
    if (!employee.length) return res.status(404).json({success:false,message:'Contractor employee not found.'});
    await query(`INSERT INTO payroll_period_status (employee_id,from_date,to_date,status)
      VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)`,[id,from,to,status]);
    res.json({success:true,status});
  }catch(error){res.status(error.status||500).json({success:false,message:error.message});}
});
module.exports=router;
