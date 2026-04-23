const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "u149171376_contact",
  password: process.env.DB_PASSWORD || "Brock...3",
  database: process.env.DB_NAME || "u149171376_cagemaster",
  port: Number(process.env.DB_PORT || 3306),
});

db.connect((err) => {
  if (err) {
    console.error("Database connect nahi hua:", err.message);
    return;
  }
  console.log("MySQL se connect ho gaya!");
});

module.exports = db;
