// db.js — hitaishihealthcare.com

const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'hitaishihealthcare',
  password: 'Health@2142',
  database: 'hitaishi_healthcare',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ DB connection error:', err);
    return;
  }
  console.log('✅ Hitaishi DB connected');
  connection.release();
});

module.exports = db;