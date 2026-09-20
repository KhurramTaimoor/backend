const express = require('express');
const router = express.Router();
const { loadProducts, loadInventoryEvents, productKey, num, clean } = require('../lib/inventoryEvents');

const inRange = (date, from, to) => {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

router.get('/', async (req, res) => {
  try {
    const from = clean(req.query.from_date);
    const to = clean(req.query.to_date);
    const typeFilter = clean(req.query.type).toLowerCase();
    const categoryFilter = clean(req.query.category).toLowerCase();
    const productFilter = clean(req.query.product).toLowerCase();

    const [products, events] = await Promise.all([loadProducts(), loadInventoryEvents()]);
    const buckets = new Map();

    const ensure = (seed) => {
      const key = productKey(seed);
      if (!buckets.has(key)) {
        buckets.set(key, {
          product_id: seed.product_id || seed.id || null,
          product_name: clean(seed.product_name) || '—',
          type_name: clean(seed.type_name) || '—',
          category_name: clean(seed.category_name) || '—',
          unit_name: clean(seed.unit_name) || '—',
          opening_qty: 0,
          received_qty: 0,
          issued_qty: 0,
          balance_qty: 0,
          transaction_count: 0,
          first_movement_date: '',
          last_movement_date: '',
        });
      }
      return buckets.get(key);
    };

    products.forEach((p) => ensure({ ...p, product_id: p.id }));

    for (const ev of events) {
      const row = ensure(ev);
      if (row.type_name === '—' && ev.type_name) row.type_name = ev.type_name;
      if (row.category_name === '—' && ev.category_name) row.category_name = ev.category_name;
      if (row.unit_name === '—' && ev.unit_name) row.unit_name = ev.unit_name;

      const signed = num(ev.qty_in) - num(ev.qty_out);

      // With a date range, opening is every movement before the selected start date.
      // Without a range, only explicit Opening Stock is reported as opening.
      if (from) {
        if (ev.date && ev.date < from) row.opening_qty += signed;
      } else if (ev.source === 'Opening Stock') {
        row.opening_qty += signed;
      }

      const periodMatch = from || to
        ? inRange(ev.date, from, to)
        : ev.source !== 'Opening Stock';

      if (periodMatch) {
        row.received_qty += num(ev.qty_in);
        row.issued_qty += num(ev.qty_out);
        row.transaction_count += 1;
        if (ev.date) {
          if (!row.first_movement_date || ev.date < row.first_movement_date) row.first_movement_date = ev.date;
          if (!row.last_movement_date || ev.date > row.last_movement_date) row.last_movement_date = ev.date;
        }
      }
    }

    let rows = [...buckets.values()].map((row) => ({
      ...row,
      opening_qty: Number(row.opening_qty.toFixed(3)),
      received_qty: Number(row.received_qty.toFixed(3)),
      issued_qty: Number(row.issued_qty.toFixed(3)),
      balance_qty: Number((row.opening_qty + row.received_qty - row.issued_qty).toFixed(3)),
    }));

    rows = rows.filter((row) => {
      if (productFilter && !row.product_name.toLowerCase().includes(productFilter)) return false;
      if (typeFilter && !row.type_name.toLowerCase().includes(typeFilter)) return false;
      if (categoryFilter && !row.category_name.toLowerCase().includes(categoryFilter)) return false;
      return true;
    });

    rows.sort((a, b) => a.product_name.localeCompare(b.product_name));
    res.json({ success: true, data: rows, rows, from_date: from || null, to_date: to || null });
  } catch (err) {
    console.error('GET /api/inventory-report:', err);
    res.status(500).json({ success: false, message: err.message || 'Inventory report could not be loaded.' });
  }
});

module.exports = router;
