const mysql = require('mysql2');

const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',           // XAMPP default blank
  database : 'cagemaster'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connect nahi hua:', err.message);
    return;
  }
  console.log('✅ MySQL se connect ho gaya!');
});

module.exports = db;
