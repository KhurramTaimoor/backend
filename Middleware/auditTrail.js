const db = require('../db');
const { verify } = require('../lib/authToken');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

let initialized = false;
async function ensureTransactionTable() {
  if (initialized) return;
  await query(`CREATE TABLE IF NOT EXISTS transaction_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_no VARCHAR(80) NOT NULL UNIQUE,
    account_name VARCHAR(180) NULL,
    entry_no VARCHAR(180) NULL,
    user_id INT NULL,
    user_name VARCHAR(180) NULL,
    user_role VARCHAR(50) NULL,
    action VARCHAR(40) NOT NULL,
    module_name VARCHAR(120) NULL,
    method VARCHAR(12) NULL,
    endpoint VARCHAR(255) NULL,
    status_code INT NULL,
    details LONGTEXT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tx_date(transaction_date), INDEX idx_tx_user(user_id), INDEX idx_tx_entry(entry_no)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  initialized = true;
}

const first = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
const clean = v => String(v ?? '').trim();

function getUser(req) {
  const authHeader = req.headers.authorization || '';
  const tokenUser = authHeader.startsWith('Bearer ') ? verify(authHeader.slice(7)) : null;
  return tokenUser || {
    id: req.headers['x-user-id'] || null,
    name: req.headers['x-user-name'] || 'Unknown User',
    role: req.headers['x-user-role'] || 'unknown',
  };
}

function auditTrail(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || req.originalUrl.startsWith('/api/auth') || req.originalUrl.startsWith('/api/transaction-history')) {
    return next();
  }

  const originalJson = res.json.bind(res);
  let responseBody = null;
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    try {
      await ensureTransactionTable();
      const body = req.body || {};
      const data = responseBody?.data || responseBody?.invoice || responseBody?.record || responseBody || {};
      const user = getUser(req);
      const now = new Date();
      const transactionNo = `TXN-${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const accountName = clean(first(
        data.party_name, data.customer_name, data.account_name, data.account_title, data.shop_name,
        body.account_name, body.account_title, body.party_name, body.customer_name, body.customer_name_en,
        body.supplier_name, body.employee_name, body.shop_name, body.owner_name
      )) || null;
      const entryNo = clean(first(
        data.entry_no, data.invoice_no, data.return_no, data.voucher_no, data.reference_no, data.bom_code,
        data.assembly_no, data.batch_no, data.order_no,
        body.entry_no, body.invoice_no, body.return_no, body.voucher_no, body.reference_no, body.bom_code,
        body.assembly_no, body.batch_no, body.order_no, data.id, req.params?.id
      )) || null;
      const moduleName = clean(req.originalUrl.split('?')[0].replace(/^\/api\//, '').split('/')[0] || 'system');
      const action = method === 'POST' ? 'Create' : method === 'DELETE' ? 'Delete' : 'Update';
      const details = JSON.stringify({ endpoint: req.originalUrl, action, entry_no: entryNo, account_name: accountName });
      await query(
        `INSERT INTO transaction_history
         (transaction_no, account_name, entry_no, user_id, user_name, user_role, action, module_name, method, endpoint, status_code, details, transaction_date, transaction_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
        [transactionNo, accountName, entryNo, Number(user?.id) || null, clean(user?.name) || 'Unknown User', clean(user?.role) || 'unknown', action, moduleName, method, req.originalUrl, res.statusCode, details]
      );
    } catch (error) {
      console.error('Audit trail write failed:', error.message);
    }
  });

  next();
}

auditTrail.ensureTransactionTable = ensureTransactionTable;
module.exports = auditTrail;
