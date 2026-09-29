const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { sign } = require('../lib/authToken');

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
