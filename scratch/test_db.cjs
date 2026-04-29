const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo_db'
};

async function test() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log("Testing DB connection...");
        const [rows] = await pool.query("SELECT 1");
        console.log("DB Connection Success!");

        const testTodo = {
            id: Date.now(),
            text: "테스트 일정",
            time: "09:00",
            completed: 0,
            isFailed: 0,
            days: "월",
            excludeHolidays: 0,
            username: "master",
            createdAt: Date.now(),
            lastNotifiedDate: null,
            startDate: "2026-04-27",
            endDate: "2026-04-27",
            activatedWeek: "2026-04-27"
        };

        console.log("Testing INSERT into schedules...");
        const query = `INSERT INTO schedules (id, text, time, completed, isFailed, days, excludeHolidays, username, createdAt, lastNotifiedDate, startDate, endDate, activatedWeek) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [testTodo.id, testTodo.text, testTodo.time, testTodo.completed, testTodo.isFailed, testTodo.days, testTodo.excludeHolidays, testTodo.username, testTodo.createdAt, testTodo.lastNotifiedDate, testTodo.startDate, testTodo.endDate, testTodo.activatedWeek];
        
        await pool.query(query, values);
        console.log("INSERT Success!");

        // Cleanup
        await pool.query("DELETE FROM schedules WHERE id = ?", [testTodo.id]);
        console.log("Cleanup Success!");

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        await pool.end();
    }
}

test();
