const {verify}=require("../lib/authToken");
const db=require("../db");
const {resolveFeature}=require("../lib/featureCatalog");
const query=(sql,args=[])=>new Promise((ok,fail)=>db.query(sql,args,(e,r)=>e?fail(e):ok(r)));

// A small set of master records is needed as lookups by invoice/production
// screens even when the user is not allowed to maintain those masters.
const READ_ONLY_LOOKUPS=new Set([
 "/api/products","/api/categories","/api/product-types","/api/units",
 "/api/customers","/api/suppliers","/api/employees",
 "/api/rates","/api/purchase-rates","/api/scoped-rate-lists",
 "/api/chart-of-accounts","/api/general-ledgers",
 "/api/departments","/api/areas","/api/salesmen","/api/retailers"
]);
const ADMIN_ONLY=new Set(["/api/transaction-history","/api/permissions"]);
function isWithin(path,prefix){return path===prefix||path.startsWith(prefix+"/");}
module.exports=async function featureAccess(req,res,next){
 try{
  if(req.method==="OPTIONS")return next();
  const header=String(req.headers.authorization||"");
  const token=header.startsWith("Bearer ")?verify(header.slice(7)):null;
  if(!token?.id)return res.status(401).json({success:false,message:"Please sign in to continue."});
  // A new query checks disabled accounts and permission changes immediately,
  // not just the claims from a previously issued token.
  const [user]=await query("SELECT id,role,status FROM app_users WHERE id=? LIMIT 1",[token.id]);
  if(!user||String(user.status).toLowerCase()!=="active")
    return res.status(401).json({success:false,message:"User account is inactive or has been removed."});
  const role=String(user.role||"").toLowerCase();
  if(role==="admin"){req.user={...token,role};return next();}
  const url=String(req.originalUrl||req.url||"").split("?")[0].replace(/\/+$/,"");
  if([...ADMIN_ONLY].some(p=>isWithin(url,p)))return res.status(403).json({success:false,message:"Administrator access required."});
  const feature=resolveFeature(url);
  const all=await query("SELECT feature_key,can_read,can_write,can_delete FROM user_feature_permissions WHERE app_user_id=?",[user.id]);
  const grants=all.filter(p=>p.can_read||p.can_write||p.can_delete);
  if(!grants.length)return res.status(403).json({success:false,message:"No permissions assigned to your account. Contact the administrator."});
  let permission=grants.find(p=>p.feature_key===feature);
  if(!permission&&req.method==="GET"&&[...READ_ONLY_LOOKUPS].some(p=>isWithin(url,p))){
    // Master lookups are only readable by authenticated users with a
    // legitimate granted module. Writing/Deleting still requires its grant.
    return next();
  }
  if(!permission)return res.status(403).json({success:false,message:"You do not have permission to use this module."});
  const allowed=req.method==="GET"||req.method==="HEAD"?permission.can_read:
   req.method==="DELETE"?permission.can_delete:permission.can_write;
  if(!allowed)return res.status(403).json({success:false,message:"This operation is not permitted for your account."});
  req.user={...token,role};
  next();
 }catch(e){console.error("Feature authorization error:",e);res.status(500).json({success:false,message:"Unable to verify user permissions. Run the database migration."});}
};
