const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'cagemaster-change-this-secret';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + 12 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  if (!token || !String(token).includes('.')) return null;
  const [body, signature] = String(token).split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (!signature || signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

module.exports = { sign, verify };
