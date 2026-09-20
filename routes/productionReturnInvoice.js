const express=require('express');
const router=express.Router();
const db=require('../db');
const q=(sql,p=[])=>new Promise((resolve,reject)=>db.query(sql,p,(e,r)=>e?reject(e):resolve(r)));
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const clean=v=>String(v??'').trim();
const today=()=>new Date().toISOString().slice(0,10);

async function ensureSchema(){
 await q(`CREATE TABLE IF NOT EXISTS production_returns (
  id INT AUTO_INCREMENT PRIMARY KEY, return_no VARCHAR(100) NOT NULL UNIQUE, return_date DATE NOT NULL,
  production_invoice_id INT NULL, batch_no VARCHAR(100) NULL, product VARCHAR(255) NULL, product_id INT NULL,
  quantity_returned DECIMAL(14,3) NOT NULL DEFAULT 0, warehouse VARCHAR(255) NULL, reason VARCHAR(500) NULL,
  assignee_type VARCHAR(30) NULL, assignee_id INT NULL, assignee_name VARCHAR(180) NULL,
  total_qty DECIMAL(14,3) NOT NULL DEFAULT 0,total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 const cols=new Set((await q('SHOW COLUMNS FROM production_returns')).map(r=>r.Field));
 const adds=[['production_invoice_id',`ALTER TABLE production_returns ADD COLUMN production_invoice_id INT NULL`],['product_id',`ALTER TABLE production_returns ADD COLUMN product_id INT NULL`],['assignee_type',`ALTER TABLE production_returns ADD COLUMN assignee_type VARCHAR(30) NULL`],['assignee_id',`ALTER TABLE production_returns ADD COLUMN assignee_id INT NULL`],['assignee_name',`ALTER TABLE production_returns ADD COLUMN assignee_name VARCHAR(180) NULL`],['total_qty',`ALTER TABLE production_returns ADD COLUMN total_qty DECIMAL(14,3) NOT NULL DEFAULT 0`],['total_amount',`ALTER TABLE production_returns ADD COLUMN total_amount DECIMAL(14,2) NOT NULL DEFAULT 0`],['updated_at',`ALTER TABLE production_returns ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`]];
 for(const [c,s] of adds) if(!cols.has(c)) await q(s);
 await q(`CREATE TABLE IF NOT EXISTS production_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,production_return_id INT NOT NULL,production_invoice_id INT NULL,production_item_id INT NULL,
  product_id INT NULL,product_name VARCHAR(180) NULL,description VARCHAR(500) NULL,unit_name VARCHAR(120) NULL,
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,rate DECIMAL(14,2) NOT NULL DEFAULT 0,amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX idx_prod_return_header(production_return_id),INDEX idx_prod_return_product(product_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.use(async(_req,res,next)=>{try{await ensureSchema();next()}catch(e){res.status(500).json({success:false,message:e.message})}});

async function itemMap(ids){if(!ids.length)return{};const rows=await q(`SELECT * FROM production_return_items WHERE production_return_id IN (?) ORDER BY production_return_id,id`,[ids]);return rows.reduce((m,r)=>{(m[r.production_return_id]??=[]).push(r);return m},{});}
async function one(id){const rows=await q(`SELECT * FROM production_returns WHERE id=?`,[id]);if(!rows[0])return null;const map=await itemMap([Number(id)]);return{...rows[0],return_date:String(rows[0].return_date||'').slice(0,10),items:map[id]||map[Number(id)]||[]};}
async function productionSetup(){
 const headers=await q(`SELECT * FROM production_invoices ORDER BY production_date DESC,id DESC`).catch(()=>[]);
 if(!headers.length)return[];
 const items=await q(`SELECT * FROM production_invoice_items WHERE production_invoice_id IN (?) ORDER BY production_invoice_id,id`,[headers.map(x=>x.id)]).catch(()=>[]);
 const returned=await q(`SELECT production_item_id,SUM(quantity) returned_qty FROM production_return_items GROUP BY production_item_id`).catch(()=>[]);
 const retMap=new Map(returned.map(r=>[String(r.production_item_id),num(r.returned_qty)]));
 const map=items.reduce((m,it)=>{const available=Math.max(num(it.quantity)-num(retMap.get(String(it.id))),0);(m[it.production_invoice_id]??=[]).push({...it,returned_qty:num(retMap.get(String(it.id))),available_qty:available});return m},{});
 return headers.map(h=>({...h,production_date:String(h.production_date||'').slice(0,10),items:map[h.id]||[]}));
}
router.get('/setup',async(_req,res)=>{try{res.json({success:true,data:await productionSetup()})}catch(e){res.status(500).json({success:false,message:e.message})}});
router.get('/',async(_req,res)=>{try{const rows=await q(`SELECT * FROM production_returns ORDER BY id DESC`);const map=await itemMap(rows.map(x=>x.id));const data=rows.map(r=>({...r,return_date:String(r.return_date||'').slice(0,10),items:map[r.id]||[]}));res.json({success:true,data,records:data})}catch(e){res.status(500).json({success:false,message:e.message})}});

async function normalizeAndValidate(body,excludeReturnId=null){
 const productionInvoiceId=Number(body.production_invoice_id)||null;
 const requested=(Array.isArray(body.items)?body.items:[]).map(it=>({production_item_id:Number(it.production_item_id)||null,product_id:Number(it.product_id)||null,product_name:clean(it.product_name),description:clean(it.description),unit_name:clean(it.unit_name),quantity:Math.max(num(it.quantity),0),rate:Math.max(num(it.rate),0)})).filter(it=>it.production_item_id&&it.quantity>0);
 if(!productionInvoiceId||!requested.length) throw Object.assign(new Error('Original production batch and at least one return item are required.'),{status:400});
 const orig=await q(`SELECT * FROM production_invoice_items WHERE production_invoice_id=?`,[productionInvoiceId]);
 const origMap=new Map(orig.map(x=>[String(x.id),x]));
 for(const it of requested){
  const src=origMap.get(String(it.production_item_id)); if(!src) throw Object.assign(new Error('Invalid production item selected.'),{status:400});
  const params=[it.production_item_id]; let sql=`SELECT COALESCE(SUM(quantity),0) qty FROM production_return_items WHERE production_item_id=?`;
  if(excludeReturnId){sql+=` AND production_return_id<>?`;params.push(excludeReturnId)}
  const prev=num((await q(sql,params))[0]?.qty); const available=Math.max(num(src.quantity)-prev,0);
  if(it.quantity>available+0.000001) throw Object.assign(new Error(`${src.product_name||'Product'} return qty exceeds available ${available}.`),{status:400});
  it.product_id=src.product_id;it.product_name=src.product_name;it.description=it.description||src.description;it.unit_name=src.unit_name;it.rate=num(src.rate);it.amount=Number((it.quantity*it.rate).toFixed(2));
 }
 return {productionInvoiceId,items:requested};
}
async function saveItems(returnId,productionInvoiceId,items){for(const it of items)await q(`INSERT INTO production_return_items (production_return_id,production_invoice_id,production_item_id,product_id,product_name,description,unit_name,quantity,rate,amount) VALUES (?,?,?,?,?,?,?,?,?,?)`,[returnId,productionInvoiceId,it.production_item_id,it.product_id,it.product_name,it.description||null,it.unit_name||null,it.quantity,it.rate,it.amount]);}

router.post('/',async(req,res)=>{try{
 const returnNo=clean(req.body.return_no);if(!returnNo)return res.status(400).json({success:false,message:'Return No required.'});
 const {productionInvoiceId,items}=await normalizeAndValidate(req.body);const headers=await q(`SELECT * FROM production_invoices WHERE id=?`,[productionInvoiceId]);if(!headers[0])return res.status(404).json({success:false,message:'Production batch not found.'});const h=headers[0],first=items[0];const tq=items.reduce((s,x)=>s+x.quantity,0),ta=items.reduce((s,x)=>s+x.amount,0);
 const r=await q(`INSERT INTO production_returns (return_no,return_date,production_invoice_id,batch_no,product,product_id,quantity_returned,warehouse,reason,assignee_type,assignee_id,assignee_name,total_qty,total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[returnNo,clean(req.body.return_date)||today(),productionInvoiceId,h.batch_no,first.product_name,first.product_id,tq,clean(req.body.warehouse)||h.warehouse||null,clean(req.body.reason)||null,h.assignee_type||null,h.assignee_id||null,h.assignee_name||h.supervisor||null,tq,ta]);await saveItems(r.insertId,productionInvoiceId,items);res.status(201).json({success:true,message:'Production return saved.',data:await one(r.insertId)});
}catch(e){res.status(e.status|| (e.code==='ER_DUP_ENTRY'?409:500)).json({success:false,message:e.code==='ER_DUP_ENTRY'?'Return No already exists.':e.message})}});
router.put('/:id',async(req,res)=>{try{
 const current=await one(req.params.id);if(!current)return res.status(404).json({success:false,message:'Production return not found.'});const returnNo=clean(req.body.return_no);const {productionInvoiceId,items}=await normalizeAndValidate(req.body,Number(req.params.id));const headers=await q(`SELECT * FROM production_invoices WHERE id=?`,[productionInvoiceId]);if(!headers[0])return res.status(404).json({success:false,message:'Production batch not found.'});const h=headers[0],first=items[0],tq=items.reduce((s,x)=>s+x.quantity,0),ta=items.reduce((s,x)=>s+x.amount,0);
 await q(`UPDATE production_returns SET return_no=?,return_date=?,production_invoice_id=?,batch_no=?,product=?,product_id=?,quantity_returned=?,warehouse=?,reason=?,assignee_type=?,assignee_id=?,assignee_name=?,total_qty=?,total_amount=? WHERE id=?`,[returnNo,clean(req.body.return_date)||today(),productionInvoiceId,h.batch_no,first.product_name,first.product_id,tq,clean(req.body.warehouse)||h.warehouse||null,clean(req.body.reason)||null,h.assignee_type||null,h.assignee_id||null,h.assignee_name||h.supervisor||null,tq,ta,req.params.id]);await q(`DELETE FROM production_return_items WHERE production_return_id=?`,[req.params.id]);await saveItems(req.params.id,productionInvoiceId,items);res.json({success:true,message:'Production return updated.',data:await one(req.params.id)});
}catch(e){res.status(e.status||500).json({success:false,message:e.message})}});
router.delete('/:id',async(req,res)=>{try{await q(`DELETE FROM production_return_items WHERE production_return_id=?`,[req.params.id]);await q(`DELETE FROM production_returns WHERE id=?`,[req.params.id]);res.json({success:true,message:'Deleted.'})}catch(e){res.status(500).json({success:false,message:e.message})}});
module.exports=router;
