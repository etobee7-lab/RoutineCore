const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo_db'
};

async function check() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log("Checking schedules for user master...");
        const [rows] = await pool.query("SELECT * FROM schedules WHERE username = 'master' ORDER BY createdAt DESC LIMIT 5");
        console.log("Recent schedules:", JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error("Check Failed:", err);
    } finally {
        await pool.end();
    }
}

check();
