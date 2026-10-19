// Shared cheque ledger projection. Cheque FACE VALUE is posted once on issuance_date.
// Clearing instalments belong to Cash Book only, avoiding double counting.
const db = require('../db');
const query = (sql, params = []) => new Promise((resolve,reject)=>
  db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const text = v => String(v ?? '').trim();
async function chequeEntries(accountType, accountId) {
  const rows = await query(`SELECT cv.id, cv.voucher_no, cv.issuance_date,
       DATE_FORMAT(cv.issuance_date,'%Y-%m-%d') AS entry_date,
       cv.cheque_direction, cv.payee_name, cv.total_amount
     FROM cheque_vouchers cv
     WHERE cv.account_type = ? AND cv.account_id = ?
     ORDER BY cv.issuance_date ASC, cv.id ASC`, [accountType, accountId]);
  return rows.map(row => ({
    id: `CHQ-${row.id}`, source_id: row.id, type:'cheque',
    date: text(row.entry_date), reference_no: text(row.voucher_no),
    description: `${row.cheque_direction === 'receive' ? 'Cheque Received' : 'Cheque Issued'} - ${text(row.payee_name)}`,
    debit: row.cheque_direction === 'receive' ? 0 : number(row.total_amount),
    credit: row.cheque_direction === 'receive' ? number(row.total_amount) : 0,
    sort_order: 5, quantity:0, items_count:0, items: []
  }));
}
module.exports = { chequeEntries };
