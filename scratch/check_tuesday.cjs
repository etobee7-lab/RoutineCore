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
        console.log("Checking all items for user master...");
        const query = `
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'routine' as scheduleMode, username, createdAt, lastNotifiedDate, NULL as activatedWeek, startDate, endDate FROM routines WHERE username = 'master'
            UNION ALL
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'schedule' as scheduleMode, username, createdAt, lastNotifiedDate, activatedWeek, startDate, endDate FROM schedules WHERE username = 'master'
            UNION ALL
            SELECT id, text, time, completed, days, false as excludeHolidays, false as isFailed, 'memo' as scheduleMode, username, createdAt, NULL as lastNotifiedDate, activatedWeek, startDate, endDate FROM memos WHERE username = 'master'
        `;
        const [rows] = await pool.query(query);
        console.log("Total items found:", rows.length);
        
        const tuesdayItems = rows.filter(r => r.days && r.days.includes('화'));
        console.log("Tuesday items:", JSON.stringify(tuesdayItems.map(x=>({text:x.text, days:x.days, mode:x.scheduleMode})), null, 2));

    } catch (err) {
        console.error("Check Failed:", err);
    } finally {
        await pool.end();
    }
}

check();
