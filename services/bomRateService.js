const db = require("../db");
const q = (connection, sql, params=[]) => new Promise((resolve,reject) => connection.query(sql,params,(err,rows)=>err?reject(err):resolve(rows)));
let schemaReady=false, schemaPromise=null;
async function ensureRateSchema() {
 if(schemaReady) return;
 if(schemaPromise) return schemaPromise;
 schemaPromise=(async()=>{
  await q(db,"CREATE TABLE IF NOT EXISTS bom_rate_lists (id INT AUTO_INCREMENT PRIMARY KEY,list_name VARCHAR(180) NOT NULL UNIQUE,notes TEXT NULL,active_version_id INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await q(db,"CREATE TABLE IF NOT EXISTS bom_rate_versions (id INT AUTO_INCREMENT PRIMARY KEY,list_id INT NOT NULL,version_no INT NOT NULL,variation_note VARCHAR(500) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uniq_bom_rate_version(list_id,version_no),KEY idx_bom_rate_version_list(list_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await q(db,"CREATE TABLE IF NOT EXISTS bom_rate_items (id INT AUTO_INCREMENT PRIMARY KEY,version_id INT NOT NULL,product_id INT NOT NULL,rate DECIMAL(16,4) NOT NULL DEFAULT 0,UNIQUE KEY uniq_bom_version_product(version_id,product_id),KEY idx_bom_rate_product(product_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  for(const [table,definitions] of Object.entries({
    bom:{rate_list_id:"INT NULL",expense_cost:"DECIMAL(14,2) NOT NULL DEFAULT 0",product_type_id:"INT NULL"},
    bom_items:{extra_charges:"DECIMAL(14,2) NOT NULL DEFAULT 0",product_type_id:"INT NULL",type_name:"VARCHAR(180) NULL"}
  })){
    const exists=await q(db,"SHOW TABLES LIKE ?",[table]);
    if(!exists.length)continue;
    const cols=new Set((await q(db,"SHOW COLUMNS FROM "+table)).map(x=>x.Field));
    for(const [name,definition] of Object.entries(definitions))
      if(!cols.has(name))await q(db,"ALTER TABLE "+table+" ADD COLUMN "+name+" "+definition);
  }
  schemaReady=true;
 })().finally(()=>{schemaPromise=null;});
 return schemaPromise;
}
async function activeRates(connection,listId){
 if(!Number(listId))return new Map();
 const rows=await q(connection,"SELECT ri.product_id,ri.rate FROM bom_rate_lists rl JOIN bom_rate_items ri ON ri.version_id=rl.active_version_id WHERE rl.id=?",[Number(listId)]);
 return new Map(rows.map(row=>[Number(row.product_id),Number(row.rate)]));
}
async function repriceExistingBoms(connection,listId){
 const id=Number(listId);
 const updateItems=[
 "UPDATE bom_items bi JOIN bom b ON b.id=bi.bom_id",
 "JOIN bom_rate_lists rl ON rl.id=b.rate_list_id",
 "JOIN bom_rate_items ri ON ri.version_id=rl.active_version_id AND ri.product_id=bi.product_id",
 "SET bi.rate=ri.rate,",
 "bi.material_cost=ROUND(COALESCE(bi.effective_qty,bi.qty,0)*ri.rate+COALESCE(bi.extra_charges,0),2),",
 "bi.total=ROUND(COALESCE(bi.effective_qty,bi.qty,0)*ri.rate+COALESCE(bi.extra_charges,0),2)",
 "WHERE b.rate_list_id=?"
 ].join(" ");
 await q(connection,updateItems,[id]);
 const updateHeaders=[
 "UPDATE bom b",
 "LEFT JOIN (SELECT bom_id,SUM(material_cost) AS material_total FROM bom_items GROUP BY bom_id) sums ON sums.bom_id=b.id",
 "SET b.material_total=ROUND(COALESCE(sums.material_total,0),2),",
 "b.total_cost=ROUND(COALESCE(sums.material_total,0)+COALESCE(b.labor_cost,0)+COALESCE(b.expense_cost,0),2),",
 "b.total=ROUND(COALESCE(sums.material_total,0)+COALESCE(b.labor_cost,0)+COALESCE(b.expense_cost,0),2),",
 "b.per_unit_cost=ROUND((COALESCE(sums.material_total,0)+COALESCE(b.labor_cost,0)+COALESCE(b.expense_cost,0))/GREATEST(COALESCE(NULLIF(b.output_qty,0),b.batch_size,1),0.0001),4)",
 "WHERE b.rate_list_id=?"
 ].join(" ");
 await q(connection,updateHeaders,[id]);
}
module.exports={q,ensureRateSchema,activeRates,repriceExistingBoms};
