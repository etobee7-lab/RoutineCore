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
        console.log("Checking all tables for user master with dates...");
        
        const [routines] = await pool.query("SELECT id, text, 'routine' as mode, days, startDate, endDate, activatedWeek FROM routines WHERE username = 'master' ORDER BY createdAt DESC LIMIT 5");
        const [schedules] = await pool.query("SELECT id, text, 'schedule' as mode, days, startDate, endDate, activatedWeek FROM schedules WHERE username = 'master' ORDER BY createdAt DESC LIMIT 5");
        
        console.log("Results:", JSON.stringify([...routines, ...schedules], null, 2));
    } catch (err) {
        console.error("Check Failed:", err);
    } finally {
        await pool.end();
    }
}

check();
