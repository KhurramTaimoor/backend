const express=require('express');
const router=express.Router();
const db=require('../db');
const q=(sql,p=[])=>new Promise((resolve,reject)=>db.query(sql,p,(e,r)=>e?reject(e):resolve(r)));
const clean=v=>String(v??'').trim();

router.get('/',async(req,res)=>{try{
  const from=clean(req.query.from_date),to=clean(req.query.to_date),product=clean(req.query.product).toLowerCase(),assignee=clean(req.query.assignee).toLowerCase(),status=clean(req.query.status).toLowerCase(),kind=clean(req.query.kind).toLowerCase();
  const prod=await q(`SELECT pi.id header_id,'Production' transaction_type,pi.batch_no reference_no,pi.production_date transaction_date,pi.assignee_type,pi.assignee_name,pi.warehouse,pi.status,pi.remarks,
    pii.id item_id,pii.product_id,pii.product_name,pii.description,pii.type_name,pii.category_name,pii.unit_name,pii.quantity,pii.rate,pii.amount
    FROM production_invoices pi LEFT JOIN production_invoice_items pii ON pii.production_invoice_id=pi.id ORDER BY pi.production_date DESC,pi.id DESC,pii.id`).catch(()=>[]);
  const ret=await q(`SELECT pr.id header_id,'Production Return' transaction_type,pr.return_no reference_no,pr.return_date transaction_date,pr.assignee_type,pr.assignee_name,pr.warehouse,'Returned' status,pr.reason remarks,
    pri.id item_id,pri.product_id,pri.product_name,pri.description,'' type_name,'' category_name,pri.unit_name,pri.quantity,pri.rate,pri.amount
    FROM production_returns pr LEFT JOIN production_return_items pri ON pri.production_return_id=pr.id ORDER BY pr.return_date DESC,pr.id DESC,pri.id`).catch(()=>[]);
  let rows=[...prod,...ret].map(r=>({...r,transaction_date:String(r.transaction_date||'').slice(0,10)}));
  rows=rows.filter(r=>{
    if(from&&r.transaction_date<from)return false;if(to&&r.transaction_date>to)return false;
    if(product&&![r.product_name,r.description,r.type_name,r.category_name].join(' ').toLowerCase().includes(product))return false;
    if(assignee&&!String(r.assignee_name||'').toLowerCase().includes(assignee))return false;
    if(status&&!String(r.status||'').toLowerCase().includes(status))return false;
    if(kind&&kind!=='all'&&String(r.transaction_type||'').toLowerCase()!==kind)return false;
    return true;
  });
  const summary={production_qty:0,return_qty:0,production_amount:0,return_amount:0,net_qty:0,net_amount:0};
  rows.forEach(r=>{const qty=Number(r.quantity||0),amt=Number(r.amount||0);if(r.transaction_type==='Production'){summary.production_qty+=qty;summary.production_amount+=amt}else{summary.return_qty+=qty;summary.return_amount+=amt}});summary.net_qty=summary.production_qty-summary.return_qty;summary.net_amount=summary.production_amount-summary.return_amount;
  res.json({success:true,data:rows,rows,summary});
}catch(e){res.status(500).json({success:false,message:e.message})}});
module.exports=router;
