const express = require('express');
const router = express.Router();
const db = require('../db');

const query = (sql, params = []) => new Promise((resolve, reject) => db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

async function ensureTable() {
  await query(`CREATE TABLE IF NOT EXISTS account_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(180) NOT NULL,
    owner_name VARCHAR(180) NULL,
    phone_1 VARCHAR(80) NULL,
    phone_2 VARCHAR(80) NULL,
    area VARCHAR(180) NULL,
    address VARCHAR(500) NULL,
    profile_type VARCHAR(100) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_profile_shop(shop_name), INDEX idx_profile_area(area), INDEX idx_profile_status(status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

router.use(async (_req,res,next)=>{ try{ await ensureTable(); next(); }catch(e){ res.status(500).json({success:false,message:e.message}); } });

router.get('/', async (req,res)=>{
  try {
    const rows = await query('SELECT * FROM account_profiles ORDER BY id DESC');
    res.json({success:true,data:rows});
  } catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.post('/', async (req,res)=>{
  try {
    const b=req.body||{};
    if(!String(b.shop_name||'').trim()) return res.status(400).json({success:false,message:'Shop name is required'});
    const result=await query(`INSERT INTO account_profiles (shop_name,owner_name,phone_1,phone_2,area,address,profile_type,status,remarks) VALUES (?,?,?,?,?,?,?,?,?)`,[
      String(b.shop_name).trim(), b.owner_name||null, b.phone_1||null, b.phone_2||null, b.area||null, b.address||null, b.profile_type||null, b.status||'active', b.remarks||null
    ]);
    const rows=await query('SELECT * FROM account_profiles WHERE id=?',[result.insertId]);
    res.json({success:true,data:rows[0],message:'Profile saved'});
  } catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.put('/:id', async (req,res)=>{
  try {
    const b=req.body||{};
    if(!String(b.shop_name||'').trim()) return res.status(400).json({success:false,message:'Shop name is required'});
    await query(`UPDATE account_profiles SET shop_name=?,owner_name=?,phone_1=?,phone_2=?,area=?,address=?,profile_type=?,status=?,remarks=? WHERE id=?`,[
      String(b.shop_name).trim(), b.owner_name||null, b.phone_1||null, b.phone_2||null, b.area||null, b.address||null, b.profile_type||null, b.status||'active', b.remarks||null, req.params.id
    ]);
    const rows=await query('SELECT * FROM account_profiles WHERE id=?',[req.params.id]);
    res.json({success:true,data:rows[0],message:'Profile updated'});
  } catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.delete('/:id', async (req,res)=>{
  try { await query('DELETE FROM account_profiles WHERE id=?',[req.params.id]); res.json({success:true,message:'Profile deleted'}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

module.exports=router;
