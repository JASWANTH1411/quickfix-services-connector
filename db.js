const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'quickfix_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL Database:', process.env.DB_NAME || 'quickfix_db');
    connection.release();
  } catch (error) {
    console.warn('⚠️ MySQL Connection Warning:', error.message);
    console.warn('💡 Tip: Ensure MySQL server is running and database "quickfix_db" is created using quickfix.sql');
  }
})();

module.exports = pool;
