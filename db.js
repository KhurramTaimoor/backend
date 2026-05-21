const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connect nahi hua:", err.message);
    return;
  }

  console.log("MySQL pool se connect ho gaya!");
  connection.release();
});

module.exports = db;
