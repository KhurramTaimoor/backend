const express = require('express');
const router = express.Router();
const { loadProducts, loadInventoryEvents, num, clean } = require('../lib/inventoryEvents');

router.get('/products', async (_req, res) => {
  try {
    const products = await loadProducts();
    res.json({ success: true, data: products, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:product_id', async (req, res) => {
  try {
    const productId = String(req.params.product_id || '');
    const from = clean(req.query.from_date);
    const to = clean(req.query.to_date);
    const products = await loadProducts();
    const product = products.find((p) => String(p.id) === productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const all = await loadInventoryEvents();
    const productName = clean(product.product_name).toLowerCase();
    const productEvents = all.filter((e) =>
      String(e.product_id || '') === productId || (!e.product_id && clean(e.product_name).toLowerCase() === productName)
    );

    productEvents.sort((a, b) => {
      const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
      return dateCmp || String(a.id).localeCompare(String(b.id));
    });

    let openingBalance = 0;
    const periodEvents = [];
    for (const ev of productEvents) {
      const signed = num(ev.qty_in) - num(ev.qty_out);
      if (from && ev.date && ev.date < from) {
        openingBalance += signed;
        continue;
      }
      if (to && ev.date && ev.date > to) continue;
      periodEvents.push(ev);
    }

    let running = openingBalance;
    const rows = periodEvents.map((ev, idx) => {
      running += num(ev.qty_in) - num(ev.qty_out);
      return {
        id: ev.id || idx + 1,
        date: ev.date,
        source: ev.source,
        reference: ev.reference || '—',
        party: ev.party || '—',
        description: ev.description || '',
        qty_in: Number(num(ev.qty_in).toFixed(3)),
        qty_out: Number(num(ev.qty_out).toFixed(3)),
        balance: Number(running.toFixed(3)),
      };
    });

    const totalIn = rows.reduce((s, r) => s + num(r.qty_in), 0);
    const totalOut = rows.reduce((s, r) => s + num(r.qty_out), 0);

    res.json({
      success: true,
      product,
      opening_balance: Number(openingBalance.toFixed(3)),
      total_in: Number(totalIn.toFixed(3)),
      total_out: Number(totalOut.toFixed(3)),
      closing_balance: Number((openingBalance + totalIn - totalOut).toFixed(3)),
      data: rows,
      rows,
      from_date: from || null,
      to_date: to || null,
    });
  } catch (err) {
    console.error('GET /api/product-ledger/:product_id:', err);
    res.status(500).json({ success: false, message: err.message || 'Product ledger could not be loaded.' });
  }
});

module.exports = router;
