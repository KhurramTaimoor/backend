const express = require('express');
const router = express.Router();
const db = require('../db');
const {ensureRateSchema,activeRates}=require('../services/bomRateService');

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
    expense_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    rate_list_id INT NULL,
    product_type_id INT NULL,
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
    total_cost:'DECIMAL(14,2) DEFAULT 0', per_unit_cost:'DECIMAL(14,4) DEFAULT 0', updated_at:'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    expense_cost:'DECIMAL(14,2) NOT NULL DEFAULT 0',rate_list_id:'INT NULL',product_type_id:'INT NULL'
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
    product_type_id INT NULL,
    type_name VARCHAR(180) NULL,
    extra_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
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
  const itemCols=new Set((await query(connection,'SHOW COLUMNS FROM bom_items')).map(x=>x.Field));
  for(const [col,definition] of Object.entries({extra_charges:'DECIMAL(14,2) NOT NULL DEFAULT 0',product_type_id:'INT NULL',type_name:'VARCHAR(180) NULL'})){
    if(!itemCols.has(col))await query(connection,'ALTER TABLE bom_items ADD COLUMN '+col+' '+definition);
  }
  await ensureRateSchema();
}

async function loadRows(connection = db, singleId = null) {
  const headers = await query(connection, `
    SELECT b.*, COALESCE(b.category_name, c.category_name) AS resolved_category_name,
           COALESCE(b.product_name, p.product_name) AS resolved_product_name,
           COALESCE(pt.product_type_en,pt.type_name,'') AS resolved_type_name
    FROM bom b
    LEFT JOIN categories c ON b.product_category_id = c.id
    LEFT JOIN products p ON b.product_id = p.id
    LEFT JOIN product_types pt ON pt.id = COALESCE(b.product_type_id,p.product_type_id)
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
    const materialTotal = rowItems.reduce((sum,x)=>sum+n(x.material_cost ?? x.total ?? (n(x.effective_qty||x.qty)*n(x.rate)+n(x.extra_charges))),0);
    const outputQty = n(row.output_qty || row.batch_size || 1) || 1;
    const totalCost = materialTotal + n(row.labor_cost) + n(row.expense_cost);
    return {
      ...row,
      bom_code: row.bom_code || `BOM-${String(row.id).padStart(5,'0')}`,
      product_name: row.resolved_product_name || row.product_name || '',
      category_name: row.resolved_category_name || row.category_name || '',
      type_name: row.resolved_type_name || '',
      expense_cost:n(row.expense_cost),
      rate_list_id:row.rate_list_id||null,
      output_qty: outputQty,
      material_total:materialTotal,
      total_cost: totalCost,
      total: totalCost,
      per_unit_cost:outputQty > 0 ? totalCost/outputQty : 0,
      items: rowItems,
    };
  });
}

router.use(async (_req,res,next)=>{ try { await ensureSchema(); next(); } catch(e){ console.error('BOM schema:',e); res.status(500).json({success:false,message:'BOM database setup failed',error:e.message}); } });

router.get('/', async (_req,res)=>{
  try { res.json({success:true,data:await loadRows()}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.get('/next-code',async(_req,res)=>{try{const [r]=await query(db,"SELECT AUTO_INCREMENT AS next_id FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bom'");res.json({success:true,bom_code:'BOM-'+String(r?.next_id||1).padStart(6,'0'),preview_only:true});}catch(e){res.status(500).json({success:false,message:e.message});}});

router.get('/:id', async (req,res)=>{
  try { const rows=await loadRows(db,req.params.id); if(!rows.length) return res.status(404).json({success:false,message:'BOM not found'}); res.json({success:true,data:rows[0]}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

function normalize(body={}) {
  const items=(Array.isArray(body.items)?body.items:[]).filter(x=>id(x.product_id)&&n(x.qty??x.required_qty)>0);
  const outputQty=n(body.output_qty??body.batch_size)||1;
  return {
    bom_code:text(body.bom_code),product_id:id(body.product_id),product_name:text(body.product_name),
    product_category_id:id(body.product_category_id),product_type_id:id(body.product_type_id),
    category_name:text(body.category_name),bom_type:text(body.bom_type)||'Assembly',
    batch_size:outputQty,output_qty:outputQty,output_unit_id:id(body.output_unit_id),
    output_unit_name:text(body.output_unit_name),labor_cost:Math.max(0,n(body.labor_cost)),
    expense_cost:Math.max(0,n(body.expense_cost)),rate_list_id:id(body.rate_list_id),
    notes:text(body.notes),items
  };
}
async function applyListAndCalculate(connection,b){
  if(b.rate_list_id){
    const [exists]=await query(connection,'SELECT id FROM bom_rate_lists WHERE id=?',[b.rate_list_id]);
    if(!exists)throw Object.assign(new Error('Selected BOM Rate List not found.'),{status:400});
    const rates=await activeRates(connection,b.rate_list_id);
    b.items=b.items.map(it=>rates.has(Number(it.product_id))?{...it,rate:rates.get(Number(it.product_id))}:it);
  }
  b.items=b.items.map(it=>{
    const qty=n(it.qty??it.required_qty),waste=n(it.wastage_percent);
    const eff=qty+qty*waste/100,rate=n(it.rate),extra=Math.max(0,n(it.extra_charges));
    if(qty<=0||rate<0)throw Object.assign(new Error('Invalid material quantity or rate.'),{status:400});
    return {...it,qty,required_qty:qty,effective_qty:eff,rate,extra_charges:extra,material_cost:Number((eff*rate+extra).toFixed(2))};
  });
  b.material_total=Number(b.items.reduce((sum,it)=>sum+it.material_cost,0).toFixed(2));
  b.total_cost=Number((b.material_total+b.labor_cost+b.expense_cost).toFixed(2));
  b.per_unit_cost=Number((b.total_cost/b.output_qty).toFixed(4));
  return b;
}
async function replaceItems(connection,bomId,items){
  await query(connection,'DELETE FROM bom_items WHERE bom_id=?',[bomId]);
  for(let i=0;i<items.length;i++){
    const x=items[i];
    await query(connection,'INSERT INTO bom_items (bom_id,line_no,category_id,category_name,product_id,product_name,product_type_id,type_name,unit_id,unit_name,qty,required_qty,wastage_percent,effective_qty,rate,extra_charges,material_cost,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[
      bomId,i+1,id(x.category_id),text(x.category_name),id(x.product_id),text(x.product_name),
      id(x.product_type_id),text(x.type_name),id(x.unit_id),text(x.unit_name),
      x.qty,x.qty,n(x.wastage_percent),x.effective_qty,x.rate,x.extra_charges,x.material_cost,x.material_cost
    ]);
  }
}
router.post('/', async (req,res)=>{
  const {connection,release}=await getConn();
  try{
    await begin(connection); await ensureSchema(connection); const b=await applyListAndCalculate(connection,normalize(req.body));
    if(!b.product_id || !b.product_name) throw Object.assign(new Error('Product head is required'),{status:400});
    if(!b.items.length) throw Object.assign(new Error('At least one material is required'),{status:400});
    if(b.items.some(x=>Number(x.product_id)===Number(b.product_id))) throw Object.assign(new Error('Product head cannot be its own material'),{status:400});
    // Real auto-increment ID is collision-safe; never accept a client-generated serial.
    const code=null;
    const result=await query(connection,`INSERT INTO bom (bom_code,product_id,product_name,product_category_id,product_type_id,category_name,bom_type,batch_size,output_qty,output_unit_id,output_unit_name,labor_cost,expense_cost,rate_list_id,notes,material_total,total_cost,per_unit_cost,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      code,b.product_id,b.product_name,b.product_category_id,b.product_type_id,b.category_name,b.bom_type,b.batch_size,b.output_qty,b.output_unit_id,b.output_unit_name,b.labor_cost,b.expense_cost,b.rate_list_id,b.notes,b.material_total,b.total_cost,b.per_unit_cost,b.total_cost
    ]);
    await query(connection,'UPDATE bom SET bom_code=? WHERE id=?',['BOM-'+String(result.insertId).padStart(6,'0'),result.insertId]);
    await replaceItems(connection,result.insertId,b.items); await commit(connection);
    const rows=await loadRows(db,result.insertId); res.json({success:true,message:'BOM saved successfully',data:rows[0]});
  }catch(e){ await rollback(connection); res.status(e.status||500).json({success:false,message:e.message}); }finally{release();}
});

router.put('/:id', async (req,res)=>{
  const {connection,release}=await getConn();
  try{
    await begin(connection); await ensureSchema(connection); const b=await applyListAndCalculate(connection,normalize(req.body));
    if(!b.product_id || !b.product_name) throw Object.assign(new Error('Product head is required'),{status:400});
    if(!b.items.length) throw Object.assign(new Error('At least one material is required'),{status:400});
    if(b.items.some(x=>Number(x.product_id)===Number(b.product_id))) throw Object.assign(new Error('Product head cannot be its own material'),{status:400});
    await query(connection,`UPDATE bom SET bom_code=?,product_id=?,product_name=?,product_category_id=?,product_type_id=?,category_name=?,bom_type=?,batch_size=?,output_qty=?,output_unit_id=?,output_unit_name=?,labor_cost=?,expense_cost=?,rate_list_id=?,notes=?,material_total=?,total_cost=?,per_unit_cost=?,total=? WHERE id=?`,[
      b.bom_code||`BOM-${String(req.params.id).padStart(5,'0')}`,b.product_id,b.product_name,b.product_category_id,b.product_type_id,b.category_name,b.bom_type,b.batch_size,b.output_qty,b.output_unit_id,b.output_unit_name,b.labor_cost,b.expense_cost,b.rate_list_id,b.notes,b.material_total,b.total_cost,b.per_unit_cost,b.total_cost,req.params.id
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
