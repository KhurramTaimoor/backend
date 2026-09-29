const express = require('express');
const router = express.Router();
const db = require('../db');

const query = (connection, sql, params = []) => new Promise((resolve, reject) => {
  connection.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

async function getConn() {
  if (typeof db.getConnection !== 'function') return { connection: db, release: () => {} };
  return new Promise((resolve, reject) => db.getConnection((err, connection) => err ? reject(err) : resolve({ connection, release: () => connection.release() })));
}
const begin = c => new Promise((resolve,reject)=> c.beginTransaction ? c.beginTransaction(e=>e?reject(e):resolve()) : resolve());
const commit = c => new Promise((resolve,reject)=> c.commit ? c.commit(e=>e?reject(e):resolve()) : resolve());
const rollback = c => new Promise(resolve=> c.rollback ? c.rollback(()=>resolve()) : resolve());

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const text = v => String(v ?? '').trim();
const id = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

async function ensureSchema(connection = db) {
  await query(connection, `CREATE TABLE IF NOT EXISTS bom (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_code VARCHAR(100) NULL,
    product_id INT NULL,
    product_name VARCHAR(180) NULL,
    product_category_id INT NULL,
    category_name VARCHAR(180) NULL,
    bom_type VARCHAR(80) NULL,
    batch_size DECIMAL(14,3) DEFAULT 0,
    output_qty DECIMAL(14,3) DEFAULT 1,
    output_unit_id INT NULL,
    output_unit_name VARCHAR(120) NULL,
    raw_material VARCHAR(255) NULL,
    qty DECIMAL(14,3) DEFAULT 0,
    rate DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    labor_cost DECIMAL(14,2) DEFAULT 0,
    notes TEXT NULL,
    material_total DECIMAL(14,2) DEFAULT 0,
    total_cost DECIMAL(14,2) DEFAULT 0,
    per_unit_cost DECIMAL(14,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const cols = new Set((await query(connection, 'SHOW COLUMNS FROM bom')).map(r => r.Field));
  const adds = {
    bom_code:'VARCHAR(100) NULL', product_id:'INT NULL', category_name:'VARCHAR(180) NULL', output_qty:'DECIMAL(14,3) DEFAULT 1',
    output_unit_id:'INT NULL', output_unit_name:'VARCHAR(120) NULL', notes:'TEXT NULL', material_total:'DECIMAL(14,2) DEFAULT 0',
    total_cost:'DECIMAL(14,2) DEFAULT 0', per_unit_cost:'DECIMAL(14,4) DEFAULT 0', updated_at:'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  };
  for (const [column, definition] of Object.entries(adds)) {
    if (!cols.has(column)) await query(connection, `ALTER TABLE bom ADD COLUMN \`${column}\` ${definition}`);
  }

  await query(connection, `CREATE TABLE IF NOT EXISTS bom_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    line_no INT NOT NULL DEFAULT 1,
    category_id INT NULL,
    category_name VARCHAR(180) NULL,
    product_id INT NULL,
    product_name VARCHAR(180) NULL,
    unit_id INT NULL,
    unit_name VARCHAR(120) NULL,
    qty DECIMAL(14,4) DEFAULT 0,
    required_qty DECIMAL(14,4) DEFAULT 0,
    wastage_percent DECIMAL(10,3) DEFAULT 0,
    effective_qty DECIMAL(14,4) DEFAULT 0,
    rate DECIMAL(14,2) DEFAULT 0,
    material_cost DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bom_items_bom(bom_id), INDEX idx_bom_items_product(product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function loadRows(connection = db, singleId = null) {
  const headers = await query(connection, `
    SELECT b.*, COALESCE(b.category_name, c.category_name) AS resolved_category_name,
           COALESCE(b.product_name, p.product_name) AS resolved_product_name
    FROM bom b
    LEFT JOIN categories c ON b.product_category_id = c.id
    LEFT JOIN products p ON b.product_id = p.id
    ${singleId ? 'WHERE b.id = ?' : ''}
    ORDER BY b.id DESC`, singleId ? [singleId] : []);
  if (!headers.length) return [];
  const ids = headers.map(x=>x.id);
  const items = await query(connection, `SELECT * FROM bom_items WHERE bom_id IN (?) ORDER BY bom_id, line_no, id`, [ids]);
  const grouped = {};
  items.forEach(item => { (grouped[item.bom_id] ||= []).push(item); });
  return headers.map(row => {
    let rowItems = grouped[row.id] || [];
    if (!rowItems.length && text(row.raw_material)) {
      rowItems = [{
        id:`legacy-${row.id}`, bom_id:row.id, category_id:null, category_name:'', product_id:null,
        product_name:row.raw_material, unit_id:null, unit_name:'', qty:n(row.qty), required_qty:n(row.qty),
        wastage_percent:0, effective_qty:n(row.qty), rate:n(row.rate), material_cost:n(row.total), total:n(row.total)
      }];
    }
    const materialTotal = rowItems.reduce((s,x)=>s+n(x.material_cost || x.total || n(x.effective_qty||x.qty)*n(x.rate)),0);
    const outputQty = n(row.output_qty || row.batch_size || 1) || 1;
    const totalCost = n(row.total_cost) || materialTotal + n(row.labor_cost);
    return {
      ...row,
      bom_code: row.bom_code || `BOM-${String(row.id).padStart(5,'0')}`,
      product_name: row.resolved_product_name || row.product_name || '',
      category_name: row.resolved_category_name || row.category_name || '',
      output_qty: outputQty,
      material_total: n(row.material_total) || materialTotal,
      total_cost: totalCost,
      total: totalCost,
      per_unit_cost: n(row.per_unit_cost) || (outputQty > 0 ? totalCost/outputQty : 0),
      items: rowItems,
    };
  });
}

router.use(async (_req,res,next)=>{ try { await ensureSchema(); next(); } catch(e){ console.error('BOM schema:',e); res.status(500).json({success:false,message:'BOM database setup failed',error:e.message}); } });

router.get('/', async (_req,res)=>{
  try { res.json({success:true,data:await loadRows()}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.get('/:id', async (req,res)=>{
  try { const rows=await loadRows(db,req.params.id); if(!rows.length) return res.status(404).json({success:false,message:'BOM not found'}); res.json({success:true,data:rows[0]}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

function normalize(body={}) {
  const items = Array.isArray(body.items) ? body.items.filter(x => id(x.product_id) && n(x.qty ?? x.required_qty) > 0) : [];
  const materialTotal = items.reduce((s,x)=>{
    const qty=n(x.qty ?? x.required_qty); const waste=n(x.wastage_percent); const eff=n(x.effective_qty) || qty + qty*waste/100;
    return s + (n(x.material_cost ?? x.total) || eff*n(x.rate));
  },0);
  const outputQty = n(body.output_qty ?? body.batch_size) || 1;
  const labor=n(body.labor_cost);
  const totalCost = n(body.total_cost) || materialTotal + labor;
  return {
    bom_code:text(body.bom_code), product_id:id(body.product_id), product_name:text(body.product_name), product_category_id:id(body.product_category_id),
    category_name:text(body.category_name), bom_type:text(body.bom_type)||'Assembly', batch_size:outputQty, output_qty:outputQty,
    output_unit_id:id(body.output_unit_id), output_unit_name:text(body.output_unit_name), labor_cost:labor, notes:text(body.notes),
    material_total:materialTotal, total_cost:totalCost, per_unit_cost:outputQty>0?totalCost/outputQty:0, items
  };
}

async function replaceItems(connection,bomId,items){
  await query(connection,'DELETE FROM bom_items WHERE bom_id=?',[bomId]);
  for(let i=0;i<items.length;i++){
    const x=items[i]; const qty=n(x.qty ?? x.required_qty); const waste=n(x.wastage_percent); const eff=n(x.effective_qty)||qty+qty*waste/100; const cost=n(x.material_cost??x.total)||eff*n(x.rate);
    await query(connection,`INSERT INTO bom_items (bom_id,line_no,category_id,category_name,product_id,product_name,unit_id,unit_name,qty,required_qty,wastage_percent,effective_qty,rate,material_cost,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      bomId,i+1,id(x.category_id),text(x.category_name),id(x.product_id),text(x.product_name),id(x.unit_id),text(x.unit_name),qty,qty,waste,eff,n(x.rate),cost,cost
    ]);
  }
}

router.post('/', async (req,res)=>{
  const {connection,release}=await getConn();
  try{
    await begin(connection); await ensureSchema(connection); const b=normalize(req.body);
    if(!b.product_id || !b.product_name) throw Object.assign(new Error('Product head is required'),{status:400});
    if(!b.items.length) throw Object.assign(new Error('At least one material is required'),{status:400});
    if(b.items.some(x=>Number(x.product_id)===Number(b.product_id))) throw Object.assign(new Error('Product head cannot be its own material'),{status:400});
    const code=b.bom_code || `BOM-${Date.now().toString().slice(-8)}`;
    const result=await query(connection,`INSERT INTO bom (bom_code,product_id,product_name,product_category_id,category_name,bom_type,batch_size,output_qty,output_unit_id,output_unit_name,labor_cost,notes,material_total,total_cost,per_unit_cost,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      code,b.product_id,b.product_name,b.product_category_id,b.category_name,b.bom_type,b.batch_size,b.output_qty,b.output_unit_id,b.output_unit_name,b.labor_cost,b.notes,b.material_total,b.total_cost,b.per_unit_cost,b.total_cost
    ]);
    await replaceItems(connection,result.insertId,b.items); await commit(connection);
    const rows=await loadRows(db,result.insertId); res.json({success:true,message:'BOM saved successfully',data:rows[0]});
  }catch(e){ await rollback(connection); res.status(e.status||500).json({success:false,message:e.message}); }finally{release();}
});

router.put('/:id', async (req,res)=>{
  const {connection,release}=await getConn();
  try{
    await begin(connection); await ensureSchema(connection); const b=normalize(req.body);
    if(!b.product_id || !b.product_name) throw Object.assign(new Error('Product head is required'),{status:400});
    if(!b.items.length) throw Object.assign(new Error('At least one material is required'),{status:400});
    if(b.items.some(x=>Number(x.product_id)===Number(b.product_id))) throw Object.assign(new Error('Product head cannot be its own material'),{status:400});
    await query(connection,`UPDATE bom SET bom_code=?,product_id=?,product_name=?,product_category_id=?,category_name=?,bom_type=?,batch_size=?,output_qty=?,output_unit_id=?,output_unit_name=?,labor_cost=?,notes=?,material_total=?,total_cost=?,per_unit_cost=?,total=? WHERE id=?`,[
      b.bom_code||`BOM-${String(req.params.id).padStart(5,'0')}`,b.product_id,b.product_name,b.product_category_id,b.category_name,b.bom_type,b.batch_size,b.output_qty,b.output_unit_id,b.output_unit_name,b.labor_cost,b.notes,b.material_total,b.total_cost,b.per_unit_cost,b.total_cost,req.params.id
    ]);
    await replaceItems(connection,req.params.id,b.items); await commit(connection);
    const rows=await loadRows(db,req.params.id); res.json({success:true,message:'BOM updated successfully',data:rows[0]});
  }catch(e){ await rollback(connection); res.status(e.status||500).json({success:false,message:e.message}); }finally{release();}
});

router.delete('/:id', async (req,res)=>{
  const {connection,release}=await getConn();
  try{ await begin(connection); await query(connection,'DELETE FROM bom_items WHERE bom_id=?',[req.params.id]); await query(connection,'DELETE FROM bom WHERE id=?',[req.params.id]); await commit(connection); res.json({success:true,message:'BOM deleted'}); }
  catch(e){ await rollback(connection); res.status(500).json({success:false,message:e.message}); }finally{release();}
});

module.exports=router;
