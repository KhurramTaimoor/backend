const express=require("express");
const router=express.Router();
const db=require("../db");
const {q,ensureRateSchema,repriceExistingBoms}=require("../services/bomRateService");
const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
const positive=v=>Number.isInteger(Number(v))&&Number(v)>0?Number(v):null;
const clean=v=>String(v==null?"":v).trim();
const fault=(message,status=400)=>Object.assign(new Error(message),{status});
async function connection(){
 if(typeof db.getConnection!=="function")return {dbConn:db,release:()=>{}};
 return new Promise((resolve,reject)=>db.getConnection((e,c)=>e?reject(e):resolve({dbConn:c,release:()=>c.release()})));
}
const txStart=c=>new Promise((resolve,reject)=>c.beginTransaction?c.beginTransaction(e=>e?reject(e):resolve()):resolve());
const txCommit=c=>new Promise((resolve,reject)=>c.commit?c.commit(e=>e?reject(e):resolve()):resolve());
const txRollback=c=>new Promise(resolve=>c.rollback?c.rollback(()=>resolve()):resolve());
router.use(async(_req,res,next)=>{try{await ensureRateSchema();next();}catch(e){res.status(500).json({success:false,message:e.message});}});
const normalizeItems=raw=>{
 if(!Array.isArray(raw))throw fault("Enter a material rate list.");
 const map=new Map();
 for(const x of raw){
  const id=positive(x.product_id);
  const rate=Number(x.rate);
  if(!id || !Number.isFinite(rate)||rate<0)throw fault("Every rate item needs an existing product and a nonnegative rate.");
  if(map.has(id))throw fault("Duplicate products are not allowed in one rate version.");
  map.set(id,Number(rate.toFixed(4)));
 }
 if(!map.size)throw fault("Add at least one material product.");
 return [...map.entries()].map(([product_id,rate])=>({product_id,rate}));
};
async function checkProducts(c,items){
 const ids=items.map(x=>x.product_id);
 const rows=await q(c,"SELECT id FROM products WHERE id IN (?)",[ids]);
 if(rows.length!==ids.length)throw fault("One or more materials no longer exist.");
}
async function load(c,id){
 const [l]=await q(c,"SELECT * FROM bom_rate_lists WHERE id=?",[id]);
 if(!l)return null;
 const versions=await q(c,"SELECT v.id,v.version_no,v.variation_note,v.created_at FROM bom_rate_versions v WHERE v.list_id=? ORDER BY v.version_no DESC",[id]);
 const active=versions.find(v=>Number(v.id)===Number(l.active_version_id));
 const items=l.active_version_id?await q(c,"SELECT ri.product_id,ri.rate,p.product_name,p.category_id,p.product_type_id FROM bom_rate_items ri LEFT JOIN products p ON p.id=ri.product_id WHERE ri.version_id=? ORDER BY p.product_name,ri.id",[l.active_version_id]):[];
 const assigned=await q(c,"SELECT id,bom_code,product_name FROM bom WHERE rate_list_id=? ORDER BY id DESC",[id]).catch(e=>e.code==="ER_NO_SUCH_TABLE"?[]:Promise.reject(e));
 return {...l,active_version_no:active?.version_no||null,versions,items,assigned_boms:assigned,assigned_count:assigned.length};
}
async function insertVersion(c,listId,raw,note){
 const items=normalizeItems(raw);
 await checkProducts(c,items);
 const [last]=await q(c,"SELECT COALESCE(MAX(version_no),0) AS latest FROM bom_rate_versions WHERE list_id=? FOR UPDATE",[listId]);
 const versionNo=Number(last.latest)+1;
 const v=await q(c,"INSERT INTO bom_rate_versions(list_id,version_no,variation_note) VALUES(?,?,?)",[listId,versionNo,clean(note)]);
 for(const x of items)await q(c,"INSERT INTO bom_rate_items(version_id,product_id,rate) VALUES(?,?,?)",[v.insertId,x.product_id,x.rate]);
 await q(c,"UPDATE bom_rate_lists SET active_version_id=? WHERE id=?",[v.insertId,listId]);
 const tables=await q(c,"SHOW TABLES LIKE 'bom'");
 if(tables.length)await repriceExistingBoms(c,listId);
 return v.insertId;
}
router.get("/",async(_req,res)=>{
 try{
  const entries=await q(db,"SELECT * FROM bom_rate_lists ORDER BY updated_at DESC,id DESC");
  const data=await Promise.all(entries.map(x=>load(db,x.id)));
  res.json({success:true,data});
 }catch(e){res.status(500).json({success:false,message:e.message});}
});
router.get("/:id",async(req,res)=>{
 try{const row=await load(db,req.params.id);if(!row)return res.status(404).json({success:false,message:"Rate list not found."});res.json({success:true,data:row});}
 catch(e){res.status(500).json({success:false,message:e.message});}
});
router.post("/",async(req,res)=>{
 const {dbConn:c,release}=await connection();
 try{
  await txStart(c);
  const name=clean(req.body.list_name);
  if(!name)throw fault("Rate list name is required.");
  const created=await q(c,"INSERT INTO bom_rate_lists(list_name,notes) VALUES(?,?)",[name,clean(req.body.notes)]);
  await insertVersion(c,created.insertId,req.body.items,req.body.variation_note||"Initial rates");
  await txCommit(c);
  res.status(201).json({success:true,data:await load(db,created.insertId)});
 }catch(e){await txRollback(c);res.status(e.code==="ER_DUP_ENTRY"?409:e.status||500).json({success:false,message:e.code==="ER_DUP_ENTRY"?"Rate list name already exists.":e.message});}
 finally{release();}
});
router.put("/:id",async(req,res)=>{
 try{
  const name=clean(req.body.list_name);
  if(!name)return res.status(400).json({success:false,message:"Rate list name is required."});
  const result=await q(db,"UPDATE bom_rate_lists SET list_name=?,notes=? WHERE id=?",[name,clean(req.body.notes),req.params.id]);
  if(!result.affectedRows)return res.status(404).json({success:false,message:"List not found."});
  res.json({success:true,data:await load(db,req.params.id)});
 }catch(e){res.status(e.code==="ER_DUP_ENTRY"?409:500).json({success:false,message:e.message});}
});
router.post("/:id/versions",async(req,res)=>{
 const {dbConn:c,release}=await connection();
 try{
  await txStart(c);
  const [list]=await q(c,"SELECT id FROM bom_rate_lists WHERE id=? FOR UPDATE",[req.params.id]);
  if(!list)throw fault("Rate list not found.",404);
  await insertVersion(c,list.id,req.body.items,req.body.variation_note);
  await txCommit(c);
  res.json({success:true,message:"New rate version activated and all assigned BOMs updated.",data:await load(db,list.id)});
 }catch(e){await txRollback(c);res.status(e.status||500).json({success:false,message:e.message});}finally{release();}
});
router.post("/:id/activate",async(req,res)=>{
 const {dbConn:c,release}=await connection();
 try{
  await txStart(c);
  const [list]=await q(c,"SELECT id FROM bom_rate_lists WHERE id=? FOR UPDATE",[req.params.id]);
  if(!list)throw fault("Rate list not found.",404);
  const [v]=await q(c,"SELECT id FROM bom_rate_versions WHERE id=? AND list_id=?",[req.body.version_id,list.id]);
  if(!v)throw fault("Version does not belong to this rate list.");
  await q(c,"UPDATE bom_rate_lists SET active_version_id=? WHERE id=?",[v.id,list.id]);
  const tables=await q(c,"SHOW TABLES LIKE 'bom'");
  if(tables.length)await repriceExistingBoms(c,list.id);
  await txCommit(c);
  res.json({success:true,message:"Version activated and assigned BOMs recalculated.",data:await load(db,list.id)});
 }catch(e){await txRollback(c);res.status(e.status||500).json({success:false,message:e.message});}finally{release();}
});
module.exports=router;
