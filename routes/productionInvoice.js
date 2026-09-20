const express = require('express');
const router = express.Router();
const db = require('../db');

const q = (sql, params=[]) => new Promise((resolve,reject)=>db.query(sql,params,(e,r)=>e?reject(e):resolve(r)));
const num = v => { const n=Number(v||0); return Number.isFinite(n)?n:0; };
const clean = v => String(v??'').trim();
const today = () => new Date().toISOString().slice(0,10);

async function ensureSchema(){
  await q(`CREATE TABLE IF NOT EXISTS production_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_no VARCHAR(100) NOT NULL UNIQUE,
    production_date DATE NOT NULL,
    product VARCHAR(255) NULL,
    product_id INT NULL,
    quantity_produced DECIMAL(14,3) NOT NULL DEFAULT 0,
    qty_produced DECIMAL(14,3) NOT NULL DEFAULT 0,
    warehouse VARCHAR(255) NULL,
    supervisor VARCHAR(255) NULL,
    assignee_type VARCHAR(30) NULL,
    assignee_id INT NULL,
    assignee_name VARCHAR(180) NULL,
    remarks TEXT NULL,
    total_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const cols = new Set((await q('SHOW COLUMNS FROM production_invoices')).map(r=>r.Field));
  const adds = [
    ['product',`ALTER TABLE production_invoices ADD COLUMN product VARCHAR(255) NULL AFTER production_date`],
    ['product_id',`ALTER TABLE production_invoices ADD COLUMN product_id INT NULL AFTER product`],
    ['quantity_produced',`ALTER TABLE production_invoices ADD COLUMN quantity_produced DECIMAL(14,3) NOT NULL DEFAULT 0`],
    ['qty_produced',`ALTER TABLE production_invoices ADD COLUMN qty_produced DECIMAL(14,3) NOT NULL DEFAULT 0`],
    ['warehouse',`ALTER TABLE production_invoices ADD COLUMN warehouse VARCHAR(255) NULL`],
    ['supervisor',`ALTER TABLE production_invoices ADD COLUMN supervisor VARCHAR(255) NULL`],
    ['assignee_type',`ALTER TABLE production_invoices ADD COLUMN assignee_type VARCHAR(30) NULL`],
    ['assignee_id',`ALTER TABLE production_invoices ADD COLUMN assignee_id INT NULL`],
    ['assignee_name',`ALTER TABLE production_invoices ADD COLUMN assignee_name VARCHAR(180) NULL`],
    ['remarks',`ALTER TABLE production_invoices ADD COLUMN remarks TEXT NULL`],
    ['total_qty',`ALTER TABLE production_invoices ADD COLUMN total_qty DECIMAL(14,3) NOT NULL DEFAULT 0`],
    ['total_amount',`ALTER TABLE production_invoices ADD COLUMN total_amount DECIMAL(14,2) NOT NULL DEFAULT 0`],
    ['status',`ALTER TABLE production_invoices ADD COLUMN status VARCHAR(50) NULL DEFAULT 'Pending'`],
    ['updated_at',`ALTER TABLE production_invoices ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`],
  ];
  for(const [c,sql] of adds) if(!cols.has(c)) await q(sql);

  await q(`CREATE TABLE IF NOT EXISTS production_invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production_invoice_id INT NOT NULL,
    product_id INT NULL,
    product_name VARCHAR(180) NULL,
    description VARCHAR(500) NULL,
    product_type_id INT NULL,
    type_name VARCHAR(180) NULL,
    category_id INT NULL,
    category_name VARCHAR(180) NULL,
    unit_id INT NULL,
    unit_name VARCHAR(120) NULL,
    quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    rate DECIMAL(14,2) NOT NULL DEFAULT 0,
    amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prod_item_invoice (production_invoice_id),
    INDEX idx_prod_item_product (product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.use(async(_req,res,next)=>{try{await ensureSchema();next();}catch(e){res.status(500).json({success:false,message:e.message});}});

async function setup(){
  let products=[];
  try { products = await q(`SELECT p.id,p.product_name,p.product_type_id,p.category_id,p.unit_id,
    COALESCE(pt.product_type_en,pt.type_name,'') type_name, COALESCE(c.category_name,'') category_name,
    COALESCE(u.unit_name,u.symbol,'') unit_name
    FROM products p LEFT JOIN product_types pt ON pt.id=p.product_type_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN units u ON u.id=p.unit_id ORDER BY p.product_name`); }
  catch { products = await q(`SELECT id,product_name,product_type_id,category_id,unit_id FROM products ORDER BY product_name`).catch(()=>[]); }

  const employees = await q(`SELECT e.id,e.full_name AS name,'employee' AS assignee_type,
    COALESCE((SELECT er.per_day_salary FROM employee_rates er WHERE er.employee_id=e.id ORDER BY er.salary_month DESC,er.id DESC LIMIT 1), e.basic_salary/30, 0) AS default_rate
    FROM employees e ORDER BY e.full_name`).catch(()=>[]);
  const contractors = await q(`SELECT c.id,COALESCE(c.contractor_name,c.full_name,c.name,CONCAT('Contractor ',c.id)) AS name,'contractor' AS assignee_type,
    COALESCE((SELECT cc.contract_rate FROM contractor_contracts cc WHERE cc.contractor_id=c.id ORDER BY cc.id DESC LIMIT 1),0) AS default_rate
    FROM contractors c ORDER BY name`).catch(async()=> q(`SELECT id,CONCAT('Contractor ',id) AS name,'contractor' AS assignee_type,0 AS default_rate FROM contractors ORDER BY id DESC`).catch(()=>[]));
  return {products,employees,contractors};
}

async function itemsFor(ids){
  if(!ids.length) return {};
  const rows=await q(`SELECT * FROM production_invoice_items WHERE production_invoice_id IN (?) ORDER BY production_invoice_id,id`,[ids]);
  return rows.reduce((m,r)=>{(m[r.production_invoice_id]??=[]).push(r);return m;},{});
}
async function one(id){
  const rows=await q(`SELECT * FROM production_invoices WHERE id=?`,[id]); if(!rows[0]) return null;
  const map=await itemsFor([Number(id)]); return {...rows[0],production_date:String(rows[0].production_date||'').slice(0,10),items:map[id]||map[Number(id)]||[]};
}
const normalizeItems = items => (Array.isArray(items)?items:[]).map((it,i)=>{
  const quantity=Math.max(num(it.quantity??it.qty),0), rate=Math.max(num(it.rate),0);
  return {product_id:it.product_id?Number(it.product_id):null,product_name:clean(it.product_name),description:clean(it.description),product_type_id:it.product_type_id?Number(it.product_type_id):null,type_name:clean(it.type_name),category_id:it.category_id?Number(it.category_id):null,category_name:clean(it.category_name),unit_id:it.unit_id?Number(it.unit_id):null,unit_name:clean(it.unit_name),quantity,rate,amount:Number((quantity*rate).toFixed(2)),sr:i+1};
}).filter(it=>it.product_id&&it.quantity>0);

router.get('/setup', async(_req,res)=>{try{res.json({success:true,data:await setup()});}catch(e){res.status(500).json({success:false,message:e.message});}});
router.get('/', async(_req,res)=>{try{const headers=await q(`SELECT * FROM production_invoices ORDER BY id DESC`);const map=await itemsFor(headers.map(x=>x.id));const data=headers.map(h=>({...h,production_date:String(h.production_date||'').slice(0,10),items:map[h.id]||[]}));res.json({success:true,data,records:data});}catch(e){res.status(500).json({success:false,message:e.message});}});
router.get('/:id',async(req,res)=>{try{const row=await one(req.params.id);if(!row)return res.status(404).json({success:false,message:'Production invoice not found.'});res.json({success:true,data:row});}catch(e){res.status(500).json({success:false,message:e.message});}});

async function saveItems(invoiceId,items){
  for(const it of items) await q(`INSERT INTO production_invoice_items (production_invoice_id,product_id,product_name,description,product_type_id,type_name,category_id,category_name,unit_id,unit_name,quantity,rate,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,[invoiceId,it.product_id,it.product_name,it.description||null,it.product_type_id,it.type_name||null,it.category_id,it.category_name||null,it.unit_id,it.unit_name||null,it.quantity,it.rate,it.amount]);
}

router.post('/',async(req,res)=>{try{
  const batch=clean(req.body.batch_no), date=clean(req.body.production_date)||today(), assigneeType=clean(req.body.assignee_type), assigneeId=Number(req.body.assignee_id)||null, assigneeName=clean(req.body.assignee_name), items=normalizeItems(req.body.items);
  if(!batch)return res.status(400).json({success:false,message:'Batch No required.'}); if(!items.length)return res.status(400).json({success:false,message:'At least one production product is required.'});
  const totalQty=items.reduce((s,x)=>s+x.quantity,0), totalAmount=items.reduce((s,x)=>s+x.amount,0), first=items[0];
  const result=await q(`INSERT INTO production_invoices (batch_no,production_date,product,product_id,quantity_produced,qty_produced,warehouse,supervisor,assignee_type,assignee_id,assignee_name,remarks,total_qty,total_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[batch,date,first.product_name,first.product_id,totalQty,totalQty,clean(req.body.warehouse)||null,assigneeName||clean(req.body.supervisor)||null,assigneeType||null,assigneeId,assigneeName||null,clean(req.body.remarks)||null,totalQty,totalAmount,clean(req.body.status)||'Pending']);
  await saveItems(result.insertId,items); res.status(201).json({success:true,message:'Production invoice saved.',data:await one(result.insertId)});
}catch(e){res.status(e.code==='ER_DUP_ENTRY'?409:500).json({success:false,message:e.code==='ER_DUP_ENTRY'?'Batch No already exists.':e.message});}});

router.put('/:id',async(req,res)=>{try{
  const existing=await one(req.params.id); if(!existing)return res.status(404).json({success:false,message:'Production invoice not found.'});
  const batch=clean(req.body.batch_no), date=clean(req.body.production_date)||today(), assigneeType=clean(req.body.assignee_type), assigneeId=Number(req.body.assignee_id)||null, assigneeName=clean(req.body.assignee_name), items=normalizeItems(req.body.items);
  if(!batch||!items.length)return res.status(400).json({success:false,message:'Batch No and at least one product are required.'});
  const totalQty=items.reduce((s,x)=>s+x.quantity,0),totalAmount=items.reduce((s,x)=>s+x.amount,0),first=items[0];
  await q(`UPDATE production_invoices SET batch_no=?,production_date=?,product=?,product_id=?,quantity_produced=?,qty_produced=?,warehouse=?,supervisor=?,assignee_type=?,assignee_id=?,assignee_name=?,remarks=?,total_qty=?,total_amount=?,status=? WHERE id=?`,[batch,date,first.product_name,first.product_id,totalQty,totalQty,clean(req.body.warehouse)||null,assigneeName||clean(req.body.supervisor)||null,assigneeType||null,assigneeId,assigneeName||null,clean(req.body.remarks)||null,totalQty,totalAmount,clean(req.body.status)||'Pending',req.params.id]);
  await q(`DELETE FROM production_invoice_items WHERE production_invoice_id=?`,[req.params.id]); await saveItems(req.params.id,items);res.json({success:true,message:'Production invoice updated.',data:await one(req.params.id)});
}catch(e){res.status(e.code==='ER_DUP_ENTRY'?409:500).json({success:false,message:e.code==='ER_DUP_ENTRY'?'Batch No already exists.':e.message});}});
router.delete('/:id',async(req,res)=>{try{await q(`DELETE FROM production_invoice_items WHERE production_invoice_id=?`,[req.params.id]);await q(`DELETE FROM production_invoices WHERE id=?`,[req.params.id]);res.json({success:true,message:'Deleted.'});}catch(e){res.status(500).json({success:false,message:e.message});}});

module.exports=router;
