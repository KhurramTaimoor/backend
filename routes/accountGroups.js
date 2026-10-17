const express = require('express');
const router = express.Router();
const db = require('../db');
const query = (sql, params=[]) => new Promise((resolve,reject) => db.query(sql,params,(e,r)=>e?reject(e):resolve(r)));
const clean = x => String(x ?? '').trim();
const idOf = x => Number.isSafeInteger(Number(x)) && Number(x)>0 ? Number(x) : null;

let ready;
function ensureSchema() {
  if (!ready) ready = query(`CREATE TABLE IF NOT EXISTS account_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(180) NOT NULL,
    parent_group VARCHAR(180) NULL,
    type VARCHAR(80) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e => {ready=null; throw e;});
  return ready;
}
router.use(async (_req,res,next) => {try{await ensureSchema();next();}catch(e){res.status(500).json({error:e.message});}});

const valid = body => {
  const group_name = clean(body?.group_name);
  const parent_group = clean(body?.parent_group);
  const type = clean(body?.type);
  if (!group_name || !type) return {error:'Category name and account type are required.'};
  if (group_name.length>180 || parent_group.length>180 || type.length>80) return {error:'Category details are too long.'};
  if (group_name.toLowerCase() === parent_group.toLowerCase()) return {error:'A category cannot be its own parent.'};
  return {group_name,parent_group,type};
};

router.get('/', async (_req,res) => {
  try {
    // Preserve old API fields for Journal, Cash Book and General Account screens.
    const rows = await query(`SELECT ag.*,
      (SELECT COUNT(*) FROM chart_of_accounts coa WHERE coa.group_id=ag.id) AS accounts_count
      FROM account_groups ag ORDER BY ag.id DESC`).catch(async e => {
        if (e.code === 'ER_NO_SUCH_TABLE') return query('SELECT ag.*,0 AS accounts_count FROM account_groups ag ORDER BY ag.id DESC');
        throw e;
      });
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});
router.post('/', async (req,res) => {
  try {
    const v=valid(req.body);
    if(v.error)return res.status(400).json({error:v.error});
    const r=await query('INSERT INTO account_groups (group_name,parent_group,type) VALUES (?,?,?)',[v.group_name,v.parent_group,v.type]);
    res.status(201).json({message:'Chart of Accounts category created.',id:r.insertId});
  } catch(e){res.status(500).json({error:e.message});}
});
router.put('/:id', async(req,res)=>{
  try {
    const id=idOf(req.params.id); if(!id)return res.status(400).json({error:'Invalid category ID.'});
    const v=valid(req.body);if(v.error)return res.status(400).json({error:v.error});
    const old=await query('SELECT group_name FROM account_groups WHERE id=? LIMIT 1',[id]);
    if(!old.length)return res.status(404).json({error:'Category not found.'});
    await query('UPDATE account_groups SET group_name=?,parent_group=?,type=? WHERE id=?',[v.group_name,v.parent_group,v.type,id]);
    // Keep any subcategory parent-name references consistent.
    if(old[0].group_name !== v.group_name) {
      await query('UPDATE account_groups SET parent_group=? WHERE parent_group=?',[v.group_name,old[0].group_name]);
    }
    res.json({message:'Chart of Accounts category updated.'});
  }catch(e){res.status(500).json({error:e.message});}
});
router.delete('/:id',async(req,res)=>{
  try {
    const id=idOf(req.params.id);if(!id)return res.status(400).json({error:'Invalid category ID.'});
    const rows=await query('SELECT group_name FROM account_groups WHERE id=?',[id]);
    if(!rows.length)return res.status(404).json({error:'Category not found.'});
    try {
      const use=await query('SELECT 1 FROM chart_of_accounts WHERE group_id=? LIMIT 1',[id]);
      if(use.length)return res.status(409).json({error:'Category has linked accounts. Move them before deleting it.'});
    }catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
    const children=await query('SELECT 1 FROM account_groups WHERE parent_group=? LIMIT 1',[rows[0].group_name]);
    if(children.length)return res.status(409).json({error:'Category has subcategories. Move them first.'});
    await query('DELETE FROM account_groups WHERE id=?',[id]);
    res.json({message:'Chart of Accounts category deleted.'});
  }catch(e){res.status(500).json({error:e.message});}
});
module.exports=router;
