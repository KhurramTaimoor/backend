const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../Middleware/authMiddleware');
const auditTrail = require('../Middleware/auditTrail');

const query = (sql, params = []) => new Promise((resolve, reject) => db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

router.use(authMiddleware);
router.use((req, res, next) => {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    await auditTrail.ensureTransactionTable();
    const where = [];
    const params = [];
    if (req.query.from_date) { where.push('transaction_date >= ?'); params.push(String(req.query.from_date).slice(0,10)); }
    if (req.query.to_date) { where.push('transaction_date <= ?'); params.push(String(req.query.to_date).slice(0,10)); }
    if (req.query.search) {
      const q = `%${String(req.query.search).trim()}%`;
      where.push('(transaction_no LIKE ? OR account_name LIKE ? OR entry_no LIKE ? OR user_name LIKE ? OR module_name LIKE ? OR action LIKE ?)');
      params.push(q,q,q,q,q,q);
    }
    const rows = await query(
      `SELECT id, transaction_no, account_name, entry_no, user_id, user_name, user_role, action, module_name, method,
              endpoint, status_code, transaction_date, transaction_time, created_at
       FROM transaction_history ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY id DESC LIMIT 2000`, params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
