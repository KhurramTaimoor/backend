const express = require('express');
const router = express.Router();
const db = require('../db');
const { loadInventoryEvents, loadProducts, num, clean } = require('../lib/inventoryEvents');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const safeQuery = async (sql, params = []) => {
  try { return await query(sql, params); }
  catch (err) { if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) return []; throw err; }
};

const keyFor = (row) => row.product_id ? `id:${row.product_id}` : `name:${clean(row.product_name).toLowerCase()}`;

router.get('/', async (_req, res) => {
  try {
    const [products, movements] = await Promise.all([loadProducts(), loadInventoryEvents()]);
    const masters = new Map(products.map(p => [`id:${p.id}`, p]));
    const stock = new Map();

    for (const ev of movements) {
      const key = keyFor(ev);
      stock.set(key, (stock.get(key) || 0) + num(ev.qty_in) - num(ev.qty_out));
    }

    // Current sale-order structure used by the website stores item IDs in sale_order_items.
    // Product/type/category/unit names are resolved live from their master tables.
    let orderItems = await safeQuery(`
      SELECT soi.id, soi.order_id, soi.product_id, soi.product_type_id, soi.category_id, soi.unit_id,
             soi.order_qty,
             so.order_no, so.status,
             p.product_name,
             COALESCE(pt.product_type_en, pt.type_name, '') AS type_name,
             COALESCE(c.category_name, '') AS category_name,
             COALESCE(u.unit_name, u.symbol, '') AS unit_name
      FROM sale_order_items soi
      INNER JOIN sale_orders so ON so.id = soi.order_id
      LEFT JOIN products p ON p.id = soi.product_id
      LEFT JOIN product_types pt ON pt.id = COALESCE(soi.product_type_id, p.product_type_id)
      LEFT JOIN categories c ON c.id = COALESCE(soi.category_id, p.category_id)
      LEFT JOIN units u ON u.id = COALESCE(soi.unit_id, p.unit_id)
    `);

    // Some older databases use type_name instead of product_type_en only.
    if (!orderItems.length) {
      orderItems = await safeQuery(`
        SELECT soi.id, soi.order_id, soi.product_id, soi.product_type_id, soi.category_id, soi.unit_id,
               soi.order_qty, so.order_no, so.status, p.product_name,
               COALESCE(pt.type_name, '') AS type_name,
               COALESCE(c.category_name, '') AS category_name,
               COALESCE(u.unit_name, u.symbol, '') AS unit_name
        FROM sale_order_items soi
        INNER JOIN sale_orders so ON so.id = soi.order_id
        LEFT JOIN products p ON p.id = soi.product_id
        LEFT JOIN product_types pt ON pt.id = COALESCE(soi.product_type_id, p.product_type_id)
        LEFT JOIN categories c ON c.id = COALESCE(soi.category_id, p.category_id)
        LEFT JOIN units u ON u.id = COALESCE(soi.unit_id, p.unit_id)
      `);
    }

    const demand = new Map();
    for (const item of orderItems) {
      const status = clean(item.status).toLowerCase();
      if (["cancelled", "canceled", "completed", "complete", "delivered", "closed"].includes(status)) continue;
      const key = keyFor(item);
      const master = masters.get(key) || {};
      if (!demand.has(key)) demand.set(key, {
        product_id: item.product_id || master.id || null,
        product_name: clean(item.product_name || master.product_name) || '—',
        type_name: clean(item.type_name || master.type_name) || '—',
        category_name: clean(item.category_name || master.category_name) || '—',
        unit_name: clean(item.unit_name || master.unit_name) || '—',
        ordered_qty: 0,
        orderNos: new Set(),
      });
      const row = demand.get(key);
      row.ordered_qty += num(item.order_qty);
      if (item.order_no) row.orderNos.add(item.order_no);
    }

    const rows = [...demand.entries()].map(([key, d], idx) => {
      const available = num(stock.get(key));
      const shortage = Math.max(num(d.ordered_qty) - Math.max(available, 0), 0);
      return {
        id: idx + 1,
        product_id: d.product_id,
        product_name: d.product_name,
        category_name: d.category_name,
        type_name: d.type_name,
        unit_name: d.unit_name,
        sale_orders: [...d.orderNos].join(', ') || '—',
        ordered_qty: Number(num(d.ordered_qty).toFixed(3)),
        available_stock: Number(available.toFixed(3)),
        demand_qty: Number(shortage.toFixed(3)),
      };
    }).sort((a,b) => b.demand_qty - a.demand_qty || a.product_name.localeCompare(b.product_name));

    res.json({ success: true, data: rows, rows });
  } catch (err) {
    console.error('GET /api/stock-demand:', err);
    res.status(500).json({ success: false, message: err.message || 'Stock demand could not be loaded.' });
  }
});

module.exports = router;
