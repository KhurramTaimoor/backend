const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../Middleware/authMiddleware");
const { GROUPS, keys:validKeys } = require("../lib/featureCatalog");
const q=(sql,params=[])=>new Promise((resolve,reject)=>db.query(sql,params,(e,r)=>e?reject(e):resolve(r)));
const str=v=>String(v==null?"":v).trim();
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function hashPassword(value,salt=crypto.randomBytes(16).toString("hex")){
  return salt+":"+crypto.scryptSync(String(value),salt,64).toString("hex");
}
let schemaPromise=null;
async function ensureSchema(){
 if(schemaPromise)return schemaPromise;
 schemaPromise=(async()=>{
  await q("CREATE TABLE IF NOT EXISTS app_users (id INT AUTO_INCREMENT PRIMARY KEY,employee_id INT NULL,name VARCHAR(180) NOT NULL,username VARCHAR(120) NOT NULL UNIQUE,email VARCHAR(180) NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,role VARCHAR(50) NOT NULL DEFAULT 'employee',status VARCHAR(30) NOT NULL DEFAULT 'active',last_login_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_app_users_employee(employee_id),INDEX idx_app_users_role(role)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await q("CREATE TABLE IF NOT EXISTS user_permissions (id INT AUTO_INCREMENT PRIMARY KEY,employee_id INT NULL,user_id INT NULL,role_id INT NULL,role VARCHAR(50) NULL,access_level VARCHAR(50) NULL,module_access VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  const cols=new Set((await q("SHOW COLUMNS FROM user_permissions")).map(c=>c.Field));
  const additions={employee_id:"INT NULL",user_id:"INT NULL",role:"VARCHAR(50) NULL",access_level:"VARCHAR(50) NULL",module_access:"VARCHAR(255) NULL"};
  for(const [name,type] of Object.entries(additions))if(!cols.has(name))await q("ALTER TABLE user_permissions ADD COLUMN "+name+" "+type);
  await q("CREATE TABLE IF NOT EXISTS user_feature_permissions (id BIGINT AUTO_INCREMENT PRIMARY KEY,app_user_id INT NOT NULL,feature_key VARCHAR(110) NOT NULL,can_read TINYINT(1) NOT NULL DEFAULT 0,can_write TINYINT(1) NOT NULL DEFAULT 0,can_delete TINYINT(1) NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY uq_user_feature(app_user_id,feature_key),KEY idx_user_feature_key(feature_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 })().catch(e=>{schemaPromise=null;throw e});
 return schemaPromise;
}
router.use(async(_req,res,next)=>{try{await ensureSchema();next()}catch(e){res.status(500).json({success:false,error:"Permission schema unavailable"})}});
router.use(authMiddleware);
router.use((req,res,next)=>String(req.user?.role||"").toLowerCase()==="admin"?next():res.status(403).json({success:false,error:"Admin access required"}));
router.get("/features",(_req,res)=>res.json({success:true,data:Object.entries(GROUPS).map(([group,items])=>({group,items:items.map(([key,label])=>({key:group+"."+key,label}))}))}));
router.get("/users",async(_req,res)=>{try{res.json(await q("SELECT id,full_name FROM employees ORDER BY full_name ASC"))}catch(e){res.status(500).json({error:e.message})}});
router.get("/",async(_req,res)=>{
 try{
  const users=await q("SELECT au.id AS app_user_id,au.employee_id,au.name AS user_name,au.username,au.email,au.role,au.status,au.last_login_at,up.id AS id,up.access_level,up.module_access FROM app_users au LEFT JOIN user_permissions up ON up.id=(SELECT MAX(sub.id) FROM user_permissions sub WHERE COALESCE(sub.employee_id,sub.user_id)=au.employee_id) WHERE au.employee_id IS NOT NULL ORDER BY au.id DESC");
  const grants=await q("SELECT app_user_id,feature_key,can_read,can_write,can_delete FROM user_feature_permissions WHERE can_read=1 OR can_write=1 OR can_delete=1");
  const map=new Map();
  grants.forEach(g=>{const id=Number(g.app_user_id);if(!map.has(id))map.set(id,[]);map.get(id).push({feature_key:g.feature_key,can_read:!!g.can_read,can_write:!!g.can_write,can_delete:!!g.can_delete})});
  res.json(users.map(u=>({...u,id:u.id||null,features:map.get(Number(u.app_user_id))||[]})));
 }catch(e){res.status(500).json({success:false,error:e.message})}
});
const permsFromBody=body=>{
 if(!Array.isArray(body.features))throw err("Please select individual module permissions.");
 const map=new Map();
 for(const x of body.features){
  const key=str(x.feature_key);
  if(!validKeys.has(key))throw err("Invalid module: "+key);
  const read=!!x.can_read,write=!!x.can_write,del=!!x.can_delete;
  if(read||write||del)map.set(key,{feature_key:key,can_read:read||write||del,can_write:write||del,can_delete:del});
 }
 if(!map.size)throw err("Select at least one module.");
 return [...map.values()];
};
async function save(req,res,editing=false){
 let connection=null;
 let inTransaction=false;
 try{
  connection=await new Promise((resolve,reject)=>db.getConnection((error,conn)=>error?reject(error):resolve(conn)));
  const qtx=(sql,params=[])=>new Promise((resolve,reject)=>connection.query(sql,params,(error,rows)=>error?reject(error):resolve(rows)));
  await new Promise((resolve,reject)=>connection.beginTransaction(error=>error?reject(error):resolve()));
  inTransaction=true;
  const employeeId=Number(req.body.employee_id);
  const [employee]=await qtx("SELECT id,full_name FROM employees WHERE id=? LIMIT 1",[employeeId]);
  if(!employee)throw err("Valid employee is required. Please Add Employee first.");
  const role=str(req.body.role).toLowerCase();
  if(!["admin","manager","employee"].includes(role))throw err("Select Admin, Manager or Employee.");
  const status=str(req.body.status).toLowerCase()||"active";
  if(!["active","inactive"].includes(status))throw err("Invalid login status.");
  const email=str(req.body.email).toLowerCase();
  if(email&&!validEmail(email))throw err("Enter a valid login email.");
  const existing=(await qtx("SELECT * FROM app_users WHERE employee_id=? LIMIT 1",[employeeId]))[0];
  if(editing){
   const [permission]=await qtx("SELECT id,COALESCE(employee_id,user_id) AS employee_id FROM user_permissions WHERE id=?",[req.params.id]);
   if(!permission)throw err("Permission record not found.",404);
   if(Number(permission.employee_id)!==employeeId)throw err("Changing the linked employee is not allowed. Create a new account.");
  }else if(existing){
    // An earlier failed save may have created app_users but not user_permissions.
    // Allow the administrator to finish that incomplete setup without deleting it.
    const existingPermission=await qtx("SELECT id FROM user_permissions WHERE COALESCE(employee_id,user_id)=? LIMIT 1",[employeeId]);
    if(existingPermission.length)throw err("Employee already has a login. Edit that account instead.",409);
  }
  const username=str(req.body.username).toLowerCase()||(existing?.username)||email;
  if(!username)throw err("Enter username or email.");
  if(username.length>120)throw err("Username is too long.");
  const password=String(req.body.password||"");
  if((!existing&&!password)||(password&&(password.length<8||password.length>128)))throw err("New password must be between 8 and 128 characters.");
  const features=permsFromBody(req.body);
  const conflicts=await qtx("SELECT id FROM app_users WHERE (LOWER(username)=? OR (email IS NOT NULL AND LOWER(email)=?)) AND employee_id<>? LIMIT 1",[username,email||"---",employeeId]);
  if(conflicts.length)throw err("Username or email is already used by another account.",409);
  let userId;
  if(existing){
   userId=existing.id;
   if(password)await qtx("UPDATE app_users SET name=?,username=?,email=?,password_hash=?,role=?,status=? WHERE id=?",[employee.full_name,username,email||null,hashPassword(password),role,status,userId]);
   else await qtx("UPDATE app_users SET name=?,username=?,email=?,role=?,status=? WHERE id=?",[employee.full_name,username,email||null,role,status,userId]);
  }else{
   const r=await qtx("INSERT INTO app_users(employee_id,name,username,email,password_hash,role,status) VALUES (?,?,?,?,?,?,?)",[employeeId,employee.full_name,username,email||null,hashPassword(password),role,status]);
   userId=r.insertId;
  }
  let permId=Number(req.params?.id)||0;
  const accessLevel=str(req.body.access_level)||"Custom";
  const summary=features.map(f=>f.feature_key).join(",");
  if(editing){
   await qtx("UPDATE user_permissions SET role=?,access_level=?,module_access=? WHERE id=?",[role,accessLevel,summary.slice(0,255),permId]);
  }else{
   const r=await qtx("INSERT INTO user_permissions(employee_id,user_id,role,access_level,module_access) VALUES (?,?,?,?,?)",[employeeId,employeeId,role,accessLevel,summary.slice(0,255)]);
   permId=r.insertId;
  }
  await qtx("DELETE FROM user_feature_permissions WHERE app_user_id=?",[userId]);
  for(const f of features)await qtx("INSERT INTO user_feature_permissions(app_user_id,feature_key,can_read,can_write,can_delete) VALUES(?,?,?,?,?)",[userId,f.feature_key,Number(f.can_read),Number(f.can_write),Number(f.can_delete)]);
  await new Promise((resolve,reject)=>connection.commit(error=>error?reject(error):resolve()));
  inTransaction=false;
  res.json({success:true,message:editing?"User login and module permissions updated.":"User login and module permissions created.",id:permId,app_user_id:userId});
 }catch(e){
  if(inTransaction&&connection)await new Promise(resolve=>connection.rollback(()=>resolve()));
  const status=e.code==="ER_DUP_ENTRY"?409:e.status||500;
  console.error("User account permission save error:",e.code||e.message);
  res.status(status).json({success:false,error:e.code==="ER_DUP_ENTRY"?"Username or email already exists.":status===500?"Could not save user account. Please check database migration.":e.message});
 }finally{if(connection)connection.release();}
}
router.post("/",(req,res)=>save(req,res,false));
router.put("/:id",(req,res)=>save(req,res,true));
router.delete("/:id",async(req,res)=>{
 try{
  const [up]=await q("SELECT COALESCE(employee_id,user_id) AS employee_id FROM user_permissions WHERE id=?",[req.params.id]);
  if(!up)throw err("User permission not found.",404);
  const [user]=await q("SELECT id FROM app_users WHERE employee_id=? LIMIT 1",[up.employee_id]);
  if(user){
   await q("UPDATE app_users SET status='inactive' WHERE id=?",[user.id]);
   await q("DELETE FROM user_feature_permissions WHERE app_user_id=?",[user.id]);
  }
  await q("DELETE FROM user_permissions WHERE id=?",[req.params.id]);
  res.json({success:true,message:"Access revoked; login disabled. Employee and audit history preserved."});
 }catch(e){res.status(e.status||500).json({success:false,error:e.message})}
});
module.exports=router;
