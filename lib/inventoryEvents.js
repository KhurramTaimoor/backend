const db = require('../db');

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const safeQuery = async (sql, params = []) => {
  try { return await query(sql, params); } catch (err) {
    // Missing optional/legacy tables/columns should not take the whole report down.
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(err.code)) return [];
    throw err;
  }
};

const clean = (value) => String(value ?? '').trim();
const num = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};
const iso = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const productKey = (event) => {
  if (event.product_id) return `id:${event.product_id}`;
  return `name:${clean(event.product_name).toLowerCase()}|${clean(event.category_name).toLowerCase()}|${clean(event.type_name).toLowerCase()}`;
};

const event = (row, source, direction, qtyField, overrides = {}) => ({
  id: `${source}:${row.id ?? Math.random()}`,
  source,
  direction,
  date: iso(overrides.date ?? row.event_date ?? row.date ?? row.stock_date ?? row.receive_date ?? row.invoice_date ?? row.return_date ?? row.production_date ?? row.assembly_date),
  reference: clean(overrides.reference ?? row.reference ?? row.ref ?? row.invoice_no ?? row.return_no ?? row.grn_no ?? row.issue_no ?? row.batch_no ?? row.assembly_no),
  party: clean(overrides.party ?? row.party ?? row.party_name ?? row.customer_name ?? row.supplier_name ?? row.shipment_to ?? row.warehouse),
  description: clean(overrides.description ?? row.description ?? row.product_description ?? row.reason ?? ''),
  product_id: row.product_id || overrides.product_id || null,
  product_name: clean(overrides.product_name ?? row.product_name ?? row.product ?? row.manual_product_name),
  type_name: clean(overrides.type_name ?? row.type_name ?? row.product_type ?? row.product_type_name),
  category_name: clean(overrides.category_name ?? row.category_name ?? row.category),
  unit_name: clean(overrides.unit_name ?? row.unit_name ?? row.unit),
  qty_in: direction === 'in' ? Math.abs(num(row[qtyField])) : 0,
  qty_out: direction === 'out' ? Math.abs(num(row[qtyField])) : 0,
});

async function loadProducts() {
  const rows = await safeQuery(`
    SELECT p.id, p.product_name,
           COALESCE(pt.product_type_en, pt.type_name, '') AS type_name,
           COALESCE(c.category_name, '') AS category_name,
           COALESCE(u.unit_name, u.symbol, '') AS unit_name
    FROM products p
    LEFT JOIN product_types pt ON pt.id = p.product_type_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    ORDER BY p.product_name
  `);
  if (rows.length) return rows;
  return safeQuery(`SELECT id, product_name FROM products ORDER BY product_name`);
}

async function loadInventoryEvents() {
  const events = [];

  const opening = await safeQuery(`
    SELECT os.id, os.product_id, os.stock_date AS event_date, os.quantity,
           os.warehouse AS party, p.product_name,
           COALESCE(pt.product_type_en, pt.type_name, '') AS type_name,
           COALESCE(c.category_name, '') AS category_name,
           COALESCE(u.unit_name, u.symbol, '') AS unit_name
    FROM opening_stock os
    LEFT JOIN products p ON p.id=os.product_id
    LEFT JOIN product_types pt ON pt.id=COALESCE(os.product_type_id,p.product_type_id)
    LEFT JOIN categories c ON c.id=COALESCE(os.category_id,p.category_id)
    LEFT JOIN units u ON u.id=p.unit_id
  `);
  opening.forEach((r) => events.push(event(r, 'Opening Stock', 'in', 'quantity', { reference: 'OPENING' })));

  const receive = await safeQuery(`
    SELECT sri.id, sr.receive_date AS event_date, sr.grn_no AS reference, sr.supplier_name AS party,
           sri.product_name, sri.category_name, sri.type_name, sri.unit_name, sri.received_qty
    FROM stock_receive_items sri
    INNER JOIN stock_receive sr ON sr.id=sri.stock_receive_id
  `);
  receive.forEach((r) => events.push(event(r, 'Stock Receive', 'in', 'received_qty')));

  const issue = await safeQuery(`
    SELECT sii.id, si.date AS event_date, si.issue_no AS reference, si.shipment_to AS party,
           sii.product_name, sii.category_name, sii.type_name, sii.issued_qty
    FROM stock_issue_items sii
    INNER JOIN stock_issue si ON si.id=sii.stock_issue_id
  `);
  issue.forEach((r) => events.push(event(r, 'Stock Issue', 'out', 'issued_qty')));

  const purchase = await safeQuery(`
    SELECT pii.id, pii.product_id, pi.invoice_date AS event_date, pi.invoice_no AS reference,
           COALESCE(pi.supplier_name, s.supplier_name, '') AS party,
           p.product_name, pii.category_name, pii.type_name, pii.unit_name, pii.quantity
    FROM purchase_invoice_items pii
    INNER JOIN purchase_invoices pi ON pi.id=pii.invoice_id
    LEFT JOIN products p ON p.id=pii.product_id
    LEFT JOIN suppliers s ON s.id=pi.supplier_id
  `);
  purchase.forEach((r) => events.push(event(r, 'Purchase Invoice', 'in', 'quantity')));

  const purchaseReturns = await safeQuery(`
    SELECT pri.id, pri.product_id, pr.return_date AS event_date,
           COALESCE(pr.return_no, CONCAT('PR-', pr.id)) AS reference,
           COALESCE(pi.supplier_name, '') AS party,
           p.product_name, pri.category_name, pri.type_name, pri.unit_name, pri.quantity
    FROM purchase_return_items pri
    INNER JOIN purchase_returns pr ON pr.id=pri.return_id
    LEFT JOIN purchase_invoices pi ON pi.id=pr.invoice_id
    LEFT JOIN products p ON p.id=pri.product_id
  `);
  purchaseReturns.forEach((r) => events.push(event(r, 'Purchase Return', 'out', 'quantity')));

  const sales = await safeQuery(`
    SELECT sii.id, sii.product_id, si.invoice_date AS event_date, si.invoice_no AS reference,
           COALESCE(si.party_name, si.customer_name, si.customer_name_en, '') AS party,
           p.product_name, sii.product_description AS description,
           sii.qty, sii.quantity, sii.pieces_qty,
           c.category_name, COALESCE(u.unit_name,u.symbol,'') AS unit_name,
           COALESCE(pt.product_type_en, pt.type_name, '') AS type_name
    FROM sales_invoice_items sii
    INNER JOIN sales_invoices si ON si.id=sii.invoice_id
    LEFT JOIN products p ON p.id=sii.product_id
    LEFT JOIN categories c ON c.id=sii.category_id
    LEFT JOIN units u ON u.id=sii.unit_id
    LEFT JOIN product_types pt ON pt.id=p.product_type_id
  `);
  sales.forEach((r) => {
    r.stock_qty = num(r.pieces_qty) || num(r.quantity) || num(r.qty);
    events.push(event(r, 'Sales Invoice', 'out', 'stock_qty'));
  });

  const salesReturns = await safeQuery(`
    SELECT sr.id, sr.product_id, sr.return_date AS event_date, sr.return_no AS reference,
           COALESCE(sr.party_name, sr.customer_name, '') AS party,
           COALESCE(sr.product_name, sr.manual_product_name, p.product_name, '') AS product_name,
           sr.product_type AS type_name, sr.category_name, sr.unit_name,
           sr.product_description AS description, sr.return_qty
    FROM sales_returns sr
    LEFT JOIN products p ON p.id=sr.product_id
  `);
  salesReturns.forEach((r) => events.push(event(r, 'Sales Return', 'in', 'return_qty')));

  // Finished production increases finished-goods stock. New item-table schema is preferred.
  const productionItems = await safeQuery(`
    SELECT pii.id, pii.product_id, pi.production_date AS event_date, pi.batch_no AS reference,
           COALESCE(pi.assignee_name, pi.supervisor, '') AS party,
           COALESCE(p.product_name, pii.product_name, '') AS product_name,
           COALESCE(pt.product_type_en, pt.type_name, '') AS type_name,
           COALESCE(c.category_name, '') AS category_name,
           COALESCE(u.unit_name,u.symbol,'') AS unit_name,
           pii.quantity AS qty
    FROM production_invoice_items pii
    INNER JOIN production_invoices pi ON pi.id=pii.production_invoice_id
    LEFT JOIN products p ON p.id=pii.product_id
    LEFT JOIN product_types pt ON pt.id=p.product_type_id
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN units u ON u.id=p.unit_id
  `);
  productionItems.forEach((r) => events.push(event(r, 'Production', 'in', 'qty')));

  // Legacy production rows (only when no item rows exist for the batch/product).
  if (!productionItems.length) {
    const productionLegacy = await safeQuery(`
      SELECT pi.id, pi.product_id, pi.production_date AS event_date, pi.batch_no AS reference,
             pi.supervisor AS party, COALESCE(p.product_name,pi.product,'') AS product_name,
             COALESCE(pt.product_type_en,pt.type_name,'') AS type_name,
             COALESCE(c.category_name,'') AS category_name,
             COALESCE(u.unit_name,u.symbol,'') AS unit_name,
             COALESCE(pi.quantity_produced,pi.qty_produced,0) AS qty
      FROM production_invoices pi
      LEFT JOIN products p ON p.id=pi.product_id
      LEFT JOIN product_types pt ON pt.id=p.product_type_id
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN units u ON u.id=p.unit_id
    `);
    productionLegacy.forEach((r) => events.push(event(r, 'Production', 'in', 'qty')));
  }

  const productionReturnItems = await safeQuery(`
    SELECT pri.id, pri.product_id, pr.return_date AS event_date, pr.return_no AS reference,
           COALESCE(pr.assignee_name,pr.warehouse,'') AS party,
           COALESCE(p.product_name,pri.product_name,'') AS product_name,
           COALESCE(pt.product_type_en,pt.type_name,'') AS type_name,
           COALESCE(c.category_name,'') AS category_name,
           COALESCE(u.unit_name,pri.unit_name,u.symbol,'') AS unit_name,
           COALESCE(pri.description,pr.reason,'') AS description, pri.quantity AS qty
    FROM production_return_items pri
    INNER JOIN production_returns pr ON pr.id=pri.production_return_id
    LEFT JOIN products p ON p.id=pri.product_id
    LEFT JOIN product_types pt ON pt.id=p.product_type_id
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN units u ON u.id=p.unit_id
  `);
  if (productionReturnItems.length) {
    productionReturnItems.forEach((r) => events.push(event(r, 'Production Return', 'out', 'qty')));
  } else {
    const productionReturns = await safeQuery(`
      SELECT pr.id, pr.product_id, pr.return_date AS event_date, pr.return_no AS reference,
             pr.warehouse AS party, COALESCE(p.product_name,pr.product,'') AS product_name,
             COALESCE(pt.product_type_en,pt.type_name,'') AS type_name,
             COALESCE(c.category_name,'') AS category_name,
             COALESCE(u.unit_name,u.symbol,'') AS unit_name,
             pr.reason AS description, pr.quantity_returned AS qty
      FROM production_returns pr
      LEFT JOIN products p ON p.id=pr.product_id
      LEFT JOIN product_types pt ON pt.id=p.product_type_id
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN units u ON u.id=p.unit_id
    `);
    productionReturns.forEach((r) => events.push(event(r, 'Production Return', 'out', 'qty')));
  }

  // Assembly: consume raw/semi-finished components and create the assembled output.
  const assemblyOutputs = await safeQuery(`
    SELECT a.id,a.product_id,a.assembly_date AS event_date,a.assembly_no AS reference,a.warehouse AS party,
           COALESCE(p.product_name,a.product_name,'') AS product_name,
           COALESCE(pt.product_type_en,pt.type_name,'') AS type_name,COALESCE(c.category_name,'') AS category_name,
           COALESCE(u.unit_name,u.symbol,'') AS unit_name,a.remarks AS description,a.qty_assembled AS qty
    FROM assembly a LEFT JOIN products p ON p.id=a.product_id
    LEFT JOIN product_types pt ON pt.id=p.product_type_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN units u ON u.id=p.unit_id
  `);
  assemblyOutputs.forEach((r) => events.push(event(r,'Assembly Output','in','qty')));

  const assemblyInputs = await safeQuery(`
    SELECT ai.id,ai.product_id,a.assembly_date AS event_date,a.assembly_no AS reference,a.warehouse AS party,
           COALESCE(p.product_name,ai.product_name,'') AS product_name,
           COALESCE(ai.type_name,pt.product_type_en,pt.type_name,'') AS type_name,COALESCE(ai.category_name,c.category_name,'') AS category_name,
           COALESCE(ai.unit_name,u.unit_name,u.symbol,'') AS unit_name,ai.remarks AS description,ai.qty_used AS qty
    FROM assembly_items ai INNER JOIN assembly a ON a.id=ai.assembly_id LEFT JOIN products p ON p.id=ai.product_id
    LEFT JOIN product_types pt ON pt.id=p.product_type_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN units u ON u.id=p.unit_id
  `);
  assemblyInputs.forEach((r) => events.push(event(r,'Assembly Input','out','qty')));

  return events.filter((e) => e.product_name && (e.qty_in || e.qty_out));
}

module.exports = { loadProducts, loadInventoryEvents, productKey, num, iso, clean };
