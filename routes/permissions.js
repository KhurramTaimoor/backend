const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../Middleware/authMiddleware');

const query = (sql, params=[]) => new Promise((resolve,reject)=>db.query(sql,params,(err,rows)=>err?reject(err):resolve(rows)));
const text = v => String(v ?? '').trim();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function ensureSchema(){
  await query(`CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NULL, user_id INT NULL, role_id INT NULL, role VARCHAR(50) NULL,
    access_level VARCHAR(50) NULL, module_access VARCHAR(255) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const cols=new Set((await query('SHOW COLUMNS FROM user_permissions')).map(r=>r.Field));
  const adds={employee_id:'INT NULL',user_id:'INT NULL',role_id:'INT NULL',role:'VARCHAR(50) NULL',access_level:'VARCHAR(50) NULL',module_access:'VARCHAR(255) NULL'};
  for(const [c,d] of Object.entries(adds)) if(!cols.has(c)) await query(`ALTER TABLE user_permissions ADD COLUMN \`${c}\` ${d}`);

  await query(`CREATE TABLE IF NOT EXISTS app_users (
    id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NULL, name VARCHAR(180) NOT NULL, username VARCHAR(120) NOT NULL UNIQUE,
    email VARCHAR(180) NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'employee',
    status VARCHAR(30) NOT NULL DEFAULT 'active', last_login_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_app_users_employee(employee_id), INDEX idx_app_users_role(role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
router.use(async(_req,res,next)=>{try{await ensureSchema();next();}catch(e){res.status(500).json({error:e.message});}});
router.use(authMiddleware);
router.use((req,res,next)=> String(req.user?.role || '').toLowerCase()==='admin' ? next() : res.status(403).json({error:'Admin access required'}));

router.get('/users', async (_req,res)=>{
  try{res.json(await query('SELECT id, full_name, phone FROM employees ORDER BY full_name ASC'));}
  catch(e){res.status(500).json({error:e.message});}
});

router.get('/', async (_req,res)=>{
  try{
    const rows=await query(`SELECT up.id, COALESCE(up.employee_id,up.user_id) AS employee_id, COALESCE(e.full_name,au.name,'Unknown User') AS user_name,
      COALESCE(up.role,au.role,CONCAT('Role-',up.role_id)) AS role, up.access_level, up.module_access,
      au.id AS app_user_id, au.username, au.email, au.status, au.last_login_at
      FROM user_permissions up
      LEFT JOIN employees e ON e.id=COALESCE(up.employee_id,up.user_id)
      LEFT JOIN app_users au ON au.employee_id=COALESCE(up.employee_id,up.user_id)
      ORDER BY up.id DESC`);
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message});}
});

async function employeeName(employeeId){
  const rows=await query('SELECT full_name FROM employees WHERE id=? LIMIT 1',[employeeId]);
  return text(rows[0]?.full_name) || `User ${employeeId}`;
}

async function saveLogin({employee_id,username,email,password,role,status}, editing=false){
  const existing=await query('SELECT * FROM app_users WHERE employee_id=? LIMIT 1',[employee_id]);
  const name=await employeeName(employee_id);
  if(existing.length){
    const u=existing[0];
    const nextUsername=text(username)||u.username;
    const nextEmail=text(email)||null;
    const nextStatus=text(status)||u.status||'active';
    const nextRole=text(role).toLowerCase()||u.role||'employee';
    if(password){
      await query('UPDATE app_users SET name=?,username=?,email=?,password_hash=?,role=?,status=? WHERE id=?',[name,nextUsername,nextEmail,hashPassword(password),nextRole,nextStatus,u.id]);
    }else{
      await query('UPDATE app_users SET name=?,username=?,email=?,role=?,status=? WHERE id=?',[name,nextUsername,nextEmail,nextRole,nextStatus,u.id]);
    }
    return u.id;
  }
  if(!text(username) || !password) throw Object.assign(new Error('New user ke liye username aur password required hain.'),{status:400});
  const result=await query('INSERT INTO app_users (employee_id,name,username,email,password_hash,role,status) VALUES (?,?,?,?,?,?,?)',[
    employee_id,name,text(username),text(email)||null,hashPassword(password),text(role).toLowerCase()||'employee',text(status)||'active'
  ]);
  return result.insertId;
}

router.post('/', async (req,res)=>{
  try{
    const {employee_id,role,access_level,module_access,username,email,password,status}=req.body;
    if(!employee_id||!role||!access_level||!text(module_access)) return res.status(400).json({error:'User, role, access level aur module access required hain.'});
    await saveLogin({employee_id,username,email,password,role,status});
    const result=await query('INSERT INTO user_permissions (employee_id,user_id,role,access_level,module_access) VALUES (?,?,?,?,?)',[employee_id,employee_id,role,access_level,text(module_access)]);
    res.json({message:'Permission aur login save ho gaye!',id:result.insertId});
  }catch(e){res.status(e.status||500).json({error:e.message});}
});

router.put('/:id', async (req,res)=>{
  try{
    const {employee_id,role,access_level,module_access,username,email,password,status}=req.body;
    if(!employee_id||!role||!access_level||!text(module_access)) return res.status(400).json({error:'User, role, access level aur module access required hain.'});
    await saveLogin({employee_id,username,email,password,role,status},true);
    await query('UPDATE user_permissions SET employee_id=?,user_id=?,role=?,access_level=?,module_access=? WHERE id=?',[employee_id,employee_id,role,access_level,text(module_access),req.params.id]);
    res.json({message:'Permission aur login update ho gaye!'});
  }catch(e){res.status(e.status||500).json({error:e.message});}
});

router.delete('/:id', async (req,res)=>{
  try{
    const rows=await query('SELECT COALESCE(employee_id,user_id) AS employee_id FROM user_permissions WHERE id=?',[req.params.id]);
    await query('DELETE FROM user_permissions WHERE id=?',[req.params.id]);
    if(rows[0]?.employee_id) await query('DELETE FROM app_users WHERE employee_id=?',[rows[0].employee_id]);
    res.json({message:'Permission aur user login deleted!'});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
