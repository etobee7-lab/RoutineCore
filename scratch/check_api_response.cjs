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
        console.log("Checking API-like result for user master...");
        const query = `
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'routine' as scheduleMode, username, createdAt, lastNotifiedDate, NULL as activatedWeek, startDate, endDate FROM routines WHERE username = 'master'
            UNION ALL
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'schedule' as scheduleMode, username, createdAt, lastNotifiedDate, activatedWeek, startDate, endDate FROM schedules WHERE username = 'master'
        `;
        const [rows] = await pool.query(query);
        console.log("Total items:", rows.length);
        const schedule1 = rows.find(r => r.text === '일정 신승세무법인 SW설치');
        console.log("Found schedule1:", JSON.stringify(schedule1, null, 2));
    } catch (err) {
        console.error("Check Failed:", err);
    } finally {
        await pool.end();
    }
}

check();
