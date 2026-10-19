const express = require('express');
const router = express.Router();
const db = require('../db');
const q = (sql, params = []) => new Promise((resolve, reject) => db.query(sql, params, (err, result) => err ? reject(err) : resolve(result)));
const validScope = value => ['supplier', 'production'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : null;
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = value => String(value ?? '').trim();
let ready = false;
let initializing = null;
async function ensureSchema() {
  if (ready) return;
  if (!initializing) initializing = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS scoped_rate_lists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      scope ENUM('supplier','production') NOT NULL,
      list_name VARCHAR(180) NOT NULL,
      items_json LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_scope_list (scope,list_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS scoped_rate_assignments (
      scope ENUM('supplier','production') NOT NULL,
      entity_id INT NOT NULL,
      list_id INT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (scope,entity_id),
      INDEX idx_scope_assigned_list (list_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    ready = true;
  })().finally(() => { initializing = null; });
  return initializing;
}
router.use(async (_req, res, next) => { try { await ensureSchema(); next(); } catch (err) { res.status(500).json({ success:false, message:`Rate lists schema could not initialize: ${err.message}` }); } });
const parse = value => { try { const x = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(x) ? x : []; } catch { return []; } };
const shapeItems = items => (Array.isArray(items) ? items : []).map(row => ({
  product_id: Math.trunc(number(row.product_id)), category_id: Math.trunc(number(row.category_id)),
  product_type_id: Math.trunc(number(row.product_type_id)), unit_id: Math.trunc(number(row.unit_id)),
  // Supplier and production lists do NOT have a Single Rate.
  retail_rate: Math.max(0, number(row.retail_rate ?? row.rate)),
  wholesale_rate: Math.max(0, number(row.wholesale_rate ?? row.evaluation_rate)),
})).filter(row => row.product_id > 0);
const error = (res, err) => res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ success:false, message:err.code === 'ER_DUP_ENTRY' ? 'A rate list with this name already exists for this type.' : err.message });
async function loadList(id, scope) {
  const rows = await q('SELECT * FROM scoped_rate_lists WHERE id = ? AND scope = ? LIMIT 1', [id, scope]);
  if (!rows.length) return null;
  const row = rows[0];
  const members = await q(scope === 'supplier'
    ? `SELECT a.entity_id AS id, s.supplier_name AS name FROM scoped_rate_assignments a JOIN suppliers s ON s.id=a.entity_id WHERE a.list_id=? AND a.scope='supplier' ORDER BY s.supplier_name`
    : `SELECT a.entity_id AS id, e.full_name AS name FROM scoped_rate_assignments a JOIN employees e ON e.id=a.entity_id WHERE a.list_id=? AND a.scope='production' ORDER BY e.full_name`, [id]);
  return { ...row, items: parse(row.items_json), assigned: members, assigned_ids: members.map(m => Number(m.id)), items_json:undefined };
}
router.get('/entities', async (req,res) => {
  const scope = validScope(req.query.scope);
  if (!scope) return res.status(400).json({ success:false, message:'Choose Supplier or Production.' });
  try { const rows = await q(scope === 'supplier' ? 'SELECT id,supplier_name AS name FROM suppliers ORDER BY supplier_name' : 'SELECT id,full_name AS name,employee_type FROM employees ORDER BY full_name'); res.json({success:true,data:rows}); } catch(err) { error(res,err); }
});
router.get('/assigned', async (req,res) => {
  const scope=validScope(req.query.scope), entityId=Math.trunc(number(req.query.entity_id));
  if (!scope || entityId <= 0) return res.status(400).json({success:false,message:'Valid type and account required.'});
  try {
    const rows=await q(`SELECT rl.* FROM scoped_rate_assignments a JOIN scoped_rate_lists rl ON rl.id=a.list_id AND rl.scope=a.scope WHERE a.scope=? AND a.entity_id=? LIMIT 1`,[scope,entityId]);
    const record=rows[0];
    res.json({success:true,data:record?{id:record.id,scope:record.scope,list_name:record.list_name,items:parse(record.items_json)}:null});
  } catch(err){error(res,err);}
});
router.get('/', async(req,res)=>{
  const scope=validScope(req.query.scope);
  if (!scope) return res.status(400).json({success:false,message:'Choose Supplier or Production.'});
  try { const rows=await q('SELECT id,scope,list_name,updated_at,items_json FROM scoped_rate_lists WHERE scope=? ORDER BY updated_at DESC,id DESC',[scope]);
    const data=await Promise.all(rows.map(async x => ({...(await loadList(x.id,scope)),product_count:parse(x.items_json).length})));
    res.json({success:true,data});
  } catch(err){error(res,err);}
});
router.get('/:id', async(req,res)=>{
  const scope=validScope(req.query.scope);
  if(!scope)return res.status(400).json({success:false,message:'Type required.'});
  try{const data=await loadList(req.params.id,scope);if(!data)return res.status(404).json({success:false,message:'List not found.'});res.json({success:true,data});}catch(err){error(res,err);}
});
async function normalize(req,res) {
  const scope=validScope(req.body?.scope); const listName=text(req.body?.list_name);
  const items=shapeItems(req.body?.items);
  if(!scope||!listName||!items.length){res.status(400).json({success:false,message:'List type, name and at least one product are required.'});return null;}
  const ids=[...new Set(items.map(x=>x.product_id))];
  const matches=await q('SELECT id FROM products WHERE id IN (?)',[ids]);
  if(matches.length!==ids.length){res.status(400).json({success:false,message:'One or more selected products no longer exist.'});return null;}
  return {scope,listName,items};
}
router.post('/',async(req,res)=>{try{const v=await normalize(req,res);if(!v)return;const result=await q('INSERT INTO scoped_rate_lists(scope,list_name,items_json) VALUES(?,?,?)',[v.scope,v.listName,JSON.stringify(v.items)]);res.status(201).json({success:true,data:await loadList(result.insertId,v.scope)});}catch(err){error(res,err);}});
router.put('/:id',async(req,res)=>{try{const v=await normalize(req,res);if(!v)return;const found=await loadList(req.params.id,v.scope);if(!found)return res.status(404).json({success:false,message:'List not found.'});await q('UPDATE scoped_rate_lists SET list_name=?,items_json=? WHERE id=? AND scope=?',[v.listName,JSON.stringify(v.items),req.params.id,v.scope]);res.json({success:true,data:await loadList(req.params.id,v.scope)});}catch(err){error(res,err);}});
router.put('/:id/assign',async(req,res)=>{const scope=validScope(req.body?.scope);if(!scope)return res.status(400).json({success:false,message:'Choose type.'});
  try{
    const target=await loadList(req.params.id,scope);if(!target)return res.status(404).json({success:false,message:'Rate list not found.'});
    const ids=[...new Set((Array.isArray(req.body?.entity_ids)?req.body.entity_ids:[]).map(x=>Math.trunc(number(x))).filter(x=>x>0))];
    if(ids.length){const matches=await q(`SELECT id FROM ${scope==='supplier'?'suppliers':'employees'} WHERE id IN (?)`,[ids]);if(matches.length!==ids.length)return res.status(400).json({success:false,message:'An assigned account no longer exists.'});}
    // Type-specific assignment: one active list per account, but many accounts per list.
    await q('DELETE FROM scoped_rate_assignments WHERE list_id=? AND scope=?',[req.params.id,scope]);
    for(const id of ids)await q('INSERT INTO scoped_rate_assignments(scope,entity_id,list_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE list_id=VALUES(list_id)',[scope,id,req.params.id]);
    res.json({success:true,data:await loadList(req.params.id,scope)});
  }catch(err){error(res,err);}
});
router.delete('/:id',async(req,res)=>{const scope=validScope(req.query.scope);if(!scope)return res.status(400).json({success:false,message:'Choose type.'});try{await q('DELETE FROM scoped_rate_assignments WHERE scope=? AND list_id=?',[scope,req.params.id]);const r=await q('DELETE FROM scoped_rate_lists WHERE id=? AND scope=?',[req.params.id,scope]);res.json({success:!!r.affectedRows});}catch(err){error(res,err);}});
module.exports=router;
