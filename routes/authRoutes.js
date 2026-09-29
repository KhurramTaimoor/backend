const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { sign } = require('../lib/authToken');
const authMiddleware = require('../Middleware/authMiddleware');
const auditTrail = require('../Middleware/auditTrail');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, expected] = String(stored || '').split(':');
    if (!salt || !expected) return false;
    const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

async function ensureUsersTable() {
  await query(`CREATE TABLE IF NOT EXISTS app_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL,
    name VARCHAR(180) NOT NULL,
    username VARCHAR(120) NOT NULL UNIQUE,
    email VARCHAR(180) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_app_users_employee(employee_id), INDEX idx_app_users_role(role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const adminEmail = process.env.ADMIN_EMAIL || 'Alicage061@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Alicage123';
  const existing = await query('SELECT id FROM app_users WHERE LOWER(email)=LOWER(?) OR LOWER(username)=LOWER(?) LIMIT 1', [adminEmail, 'admin']);
  if (!existing.length) {
    await query(
      `INSERT INTO app_users (name, username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'admin', 'active')`,
      ['Admin', 'admin', adminEmail, hashPassword(adminPassword)]
    );
  }
}

router.post('/login', async (req, res) => {
  try {
    await ensureUsersTable();
    const identifier = String(req.body.identifier || req.body.email || req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required' });
    }

    const rows = await query(
      `SELECT id, employee_id, name, username, email, password_hash, role, status
       FROM app_users WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?) LIMIT 1`,
      [identifier, identifier]
    );
    const user = rows[0];
    if (!user || String(user.status).toLowerCase() !== 'active' || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password' });
    }

    await query('UPDATE app_users SET last_login_at=NOW() WHERE id=?', [user.id]);
    const safeUser = {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: String(user.role || 'employee').toLowerCase(),
    };
    const token = sign(safeUser);
    return res.json({ success: true, message: 'Login successful', token, user: safeUser });
  } catch (error) {
    console.error('Auth login:', error);
    return res.status(500).json({ success: false, message: 'Login service unavailable', error: error.message });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    await ensureUsersTable();

    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const currentPassword = String(req.body.current_password || req.body.currentPassword || '');
    const newPassword = String(req.body.new_password || req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password is too long' });
    }

    const rows = await query(
      `SELECT id, name, username, email, password_hash, role, status
       FROM app_users WHERE id=? LIMIT 1`,
      [Number(req.user.id)]
    );
    const admin = rows[0];

    if (!admin || String(admin.role || '').toLowerCase() !== 'admin' || String(admin.status || '').toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Active admin account not found' });
    }
    if (!verifyPassword(currentPassword, admin.password_hash)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    if (verifyPassword(newPassword, admin.password_hash)) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    await query('UPDATE app_users SET password_hash=?, updated_at=NOW() WHERE id=?', [hashPassword(newPassword), admin.id]);

    // Auth routes are excluded from the generic audit middleware so no password
    // payload can ever be recorded. Add only a safe, metadata-only audit row.
    try {
      await auditTrail.ensureTransactionTable();
      const now = new Date();
      const transactionNo = `TXN-${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      await query(
        `INSERT INTO transaction_history
         (transaction_no, account_name, entry_no, user_id, user_name, user_role, action, module_name, method, endpoint, status_code, details, transaction_date, transaction_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
        [
          transactionNo,
          'Admin Security',
          admin.username || admin.email || `ADMIN-${admin.id}`,
          admin.id,
          admin.name || admin.username || 'Admin',
          'admin',
          'Password Change',
          'Authentication',
          'POST',
          '/api/auth/change-password',
          200,
          JSON.stringify({ action: 'Password Change', account: admin.username || admin.email || null }),
        ]
      );
    } catch (auditError) {
      console.error('Admin password audit write failed:', auditError.message);
    }

    return res.json({ success: true, message: 'Admin password changed successfully' });
  } catch (error) {
    console.error('Admin change password:', error);
    return res.status(500).json({ success: false, message: 'Password change failed', error: error.message });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const { verify } = require('../lib/authToken');
  const user = authHeader.startsWith('Bearer ') ? verify(authHeader.slice(7)) : null;
  if (!user) return res.status(401).json({ success: false, message: 'Invalid session' });
  return res.json({ success: true, user });
});

router.ensureUsersTable = ensureUsersTable;
router.hashPassword = hashPassword;
module.exports = router;
